const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');

/**
 * Cliente para integração com a API da djob.com.br
 * Gerencia autenticação, envio de produtos e tratamento de erros
 */
class ApiClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://api.djob.com.br/wp-json/api/v1';
    this.username = config.username || process.env.DJOB_USERNAME;
    this.password = config.password || process.env.DJOB_PASSWORD;
    
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Configuração do axios
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ScrapingProducts/1.0.0'
      }
    });
    
    // Interceptor para adicionar token automaticamente
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken && this.isTokenValid()) {
          // Para JWT, sempre usar Bearer token
          config.headers.Authorization = `Bearer ${this.accessToken}`;
          logger.debug(`🔑 Adicionando token JWT: ${this.accessToken.substring(0, 20)}...`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Interceptor para tratamento de erros
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.accessToken) {
          logger.warn('Token expirado, tentando renovar...');
          await this.authenticate();
          // Retry da requisição original
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
          return this.client(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verifica se o token ainda é válido
   */
  isTokenValid() {
    return this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry;
  }

  /**
   * Autentica na API e obtém token de acesso
   */
  async authenticate() {
    try {
      logger.info('🔐 Autenticando na API...');
      
      if (!this.username || !this.password) {
        throw new Error('Credenciais não configuradas. Configure DJOB_USERNAME e DJOB_PASSWORD no .env');
      }

      const response = await this.client.post('/usuario/login', {
        user_email: this.username,
        user_pass: this.password
      });

      if (response.data && response.data.status === 'success') {
        // A API personalizada não retorna token diretamente, mas instrui para usar o endpoint JWT
        // Vamos obter o token JWT via endpoint padrão do WordPress
        logger.info('🔍 Obtendo token JWT via endpoint WordPress...');
        
        try {
          logger.info(`🔍 Chamando endpoint JWT: /wp-json/jwt-auth/v1/token`);
          logger.info(`👤 Username: ${response.data.usuario?.user_login || 'AdminDjob'}`);
          
          // O endpoint JWT está na raiz do WordPress, não na API personalizada
          const jwtUrl = this.baseURL.replace('/api/v1', '') + '/jwt-auth/v1/token';
          logger.info(`🔍 Chamando endpoint JWT: ${jwtUrl}`);
          
          const jwtResponse = await this.client.post(jwtUrl, {
            username: response.data.usuario?.user_login || 'AdminDjob',
            password: this.password
          });
          
          if (jwtResponse.data && jwtResponse.data.token) {
            this.accessToken = jwtResponse.data.token;
            logger.success('✅ Token JWT obtido com sucesso');
            logger.info(`🔑 Token JWT: ${this.accessToken.substring(0, 20)}...`);
            logger.info(`👤 Usuário: ${jwtResponse.data.user_display_name || response.data.usuario?.display_name || 'N/A'}`);
          } else {
            throw new Error('Token JWT não encontrado na resposta');
          }
        } catch (jwtError) {
          logger.error('❌ Erro ao obter token JWT:', jwtError.message);
          throw new Error(`Falha ao obter token JWT: ${jwtError.message}`);
        }
        
        // Token JWT expira em 24 horas (padrão WordPress)
        this.tokenExpiry = new Date(Date.now() + 86400000);
        logger.info(`⏰ Token expira em: ${this.tokenExpiry.toLocaleString('pt-BR')}`);
        
        return true;
      } else {
        throw new Error('Resposta de autenticação inválida');
      }
      
    } catch (error) {
      logger.error('❌ Erro na autenticação:', error.message);
      throw new Error(`Falha na autenticação: ${error.message}`);
    }
  }

  /**
   * Envia um produto para a API
   */
  async createProduct(product) {
    try {
      logger.info(`📤 Enviando produto: ${product.nome} (${product.referencia})`);
      
      // Verifica se está autenticado
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      // Prepara dados do produto
      const formData = new FormData();
      
      // Campos obrigatórios
      formData.append('referencia', product.referencia);
      formData.append('nome', product.nome);
      formData.append('descricao', product.descricao || '');
      formData.append('preco', product.preco || 0);
      formData.append('categorias', Array.isArray(product.categorias) ? product.categorias.join(',') : '');
      
      // Campos opcionais
      if (product.cores && product.cores.length > 0) {
        const coresData = product.cores.map(cor => ({
          nome: cor.nome || '',
          codigo: cor.codigo || cor.codigoNumerico || '',
          tipo: cor.tipo || 'texto'
        }));
        formData.append('cores', JSON.stringify(coresData));
      }
      
              if (product.imagens && product.imagens.length > 0) {
          try {
            // Baixa a primeira imagem e converte para arquivo
            const imageUrl = product.imagens[0];
            logger.info(`🖼️ Baixando imagem: ${imageUrl}`);
            
            // Usa axios para download da imagem
            const imageResponse = await this.client.get(imageUrl, {
              responseType: 'arraybuffer',
              timeout: 30000
            });
            
            if (imageResponse.status === 200) {
              // Salva a imagem temporariamente
              const fs = require('fs');
              const path = require('path');
              const tempDir = path.join(process.cwd(), 'temp');
              
              // Cria diretório temporário se não existir
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              
              const tempImagePath = path.join(tempDir, `produto_${product.referencia}.jpg`);
              fs.writeFileSync(tempImagePath, imageResponse.data);
              
              // Anexa o arquivo ao FormData
              formData.append('imagem_produto', fs.createReadStream(tempImagePath));
              logger.info(`✅ Imagem anexada: ${tempImagePath}`);
              
              // Remove o arquivo temporário após anexar
              setTimeout(() => {
                try {
                  fs.unlinkSync(tempImagePath);
                  logger.info(`🧹 Arquivo temporário removido: ${tempImagePath}`);
                } catch (cleanupError) {
                  logger.warn(`⚠️ Erro ao remover arquivo temporário: ${cleanupError.message}`);
                }
              }, 1000);
              
            } else {
              logger.warn(`⚠️ Não foi possível baixar imagem: ${imageUrl} (Status: ${imageResponse.status})`);
              // Cria uma imagem placeholder se necessário
              const placeholder = await this.createPlaceholderImage(product.referencia);
              if (placeholder) {
                formData.append('imagem_produto', placeholder);
              }
            }
          } catch (imageError) {
            logger.warn(`⚠️ Erro ao processar imagem: ${imageError.message}`);
            // Cria uma imagem placeholder em caso de erro
            const placeholder = await this.createPlaceholderImage(product.referencia);
            if (placeholder) {
              formData.append('imagem_produto', placeholder);
            }
          }
        } else {
          // Cria uma imagem placeholder se não houver imagens
          const placeholder = await this.createPlaceholderImage(product.referencia);
          if (placeholder) {
            formData.append('imagem_produto', placeholder);
          }
        }

      // Envia para a API
      const response = await this.client.post('/produto', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.accessToken}`
        },
        timeout: 60000 // 60 segundos para upload de imagens
      });

      logger.success(`✅ Produto enviado com sucesso: ${product.nome}`);
      return {
        success: true,
        productId: response.data?.id,
        message: 'Produto criado com sucesso',
        data: response.data
      };
      
    } catch (error) {
      logger.error(`❌ Erro ao enviar produto ${product.nome}:`, error.message);
      
      // Tratamento específico de erros
      if (error.response?.status === 400) {
        return {
          success: false,
          error: 'Dados inválidos',
          details: error.response.data,
          product: product.nome
        };
      } else if (error.response?.status === 409) {
        return {
          success: false,
          error: 'Produto já existe',
          details: error.response.data,
          product: product.nome
        };
      } else if (error.response?.status === 500) {
        return {
          success: false,
          error: 'Erro interno do servidor',
          details: error.response.data,
          product: product.nome
        };
      }
      
      return {
        success: false,
        error: 'Erro de comunicação',
        details: error.message,
        product: product.nome
      };
    }
  }

  /**
   * Envia múltiplos produtos em lote
   */
  async createProductsBatch(products, options = {}) {
    const {
      batchSize = 10,
      delayBetweenBatches = 2000,
      continueOnError = true,
      progressCallback = null
    } = options;

    logger.info(`📦 Iniciando envio em lote de ${products.length} produtos`);
    
    const results = {
      total: products.length,
      success: 0,
      errors: 0,
      details: []
    };

    // Divide em lotes
    const batches = [];
    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }

    logger.info(`📊 Processando em ${batches.length} lotes de ${batchSize} produtos`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`🔄 Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} produtos)`);

      // Processa produtos do lote em paralelo
      const batchPromises = batch.map(async (product) => {
        try {
          const result = await this.createProduct(product);
          return { product, result };
        } catch (error) {
          return { 
            product, 
            result: { 
              success: false, 
              error: 'Erro inesperado', 
              details: error.message 
            } 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Processa resultados do lote
      for (const { product, result } of batchResults) {
        if (result.success) {
          results.success++;
          results.details.push({
            status: 'success',
            product: product.nome,
            referencia: product.referencia,
            data: result.data
          });
        } else {
          results.errors++;
          results.details.push({
            status: 'error',
            product: product.nome,
            referencia: product.referencia,
            error: result.error,
            details: result.details
          });

          if (!continueOnError) {
            logger.error(`❌ Parando processamento devido a erro em: ${product.nome}`);
            break;
          }
        }
      }

      // Callback de progresso
      if (progressCallback) {
        const progress = {
          current: (batchIndex + 1) * batchSize,
          total: products.length,
          percentage: Math.round(((batchIndex + 1) * batchSize / products.length) * 100),
          batch: batchIndex + 1,
          totalBatches: batches.length
        };
        progressCallback(progress);
      }

      // Delay entre lotes (exceto o último)
      if (batchIndex < batches.length - 1) {
        logger.info(`⏳ Aguardando ${delayBetweenBatches}ms antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    logger.info(`📊 Envio em lote concluído: ${results.success} sucessos, ${results.errors} erros`);
    return results;
  }

  /**
   * Cria uma imagem placeholder para produtos sem imagem
   */
  async createPlaceholderImage(referencia) {
    try {
      const { createCanvas } = require('canvas');
      const fs = require('fs');
      const path = require('path');
      
      // Cria um canvas simples com texto
      const canvas = createCanvas(300, 300);
      const ctx = canvas.getContext('2d');
      
      // Fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 300);
      
      // Borda
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 280, 280);
      
      // Texto
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PRODUTO', 150, 120);
      ctx.fillText(referencia, 150, 160);
      ctx.fillText('SEM IMAGEM', 150, 200);
      
      // Converte para buffer
      const buffer = canvas.toBuffer('image/png');
      
      // Salva a imagem temporariamente
      const tempDir = path.join(process.cwd(), 'temp');
      
      // Cria diretório temporário se não existir
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempImagePath = path.join(tempDir, `placeholder_${referencia}.png`);
      fs.writeFileSync(tempImagePath, buffer);
      
      // Retorna o stream de leitura
      const readStream = fs.createReadStream(tempImagePath);
      
      // Remove o arquivo temporário após um delay
      setTimeout(() => {
        try {
          fs.unlinkSync(tempImagePath);
          logger.info(`🧹 Placeholder temporário removido: ${tempImagePath}`);
        } catch (cleanupError) {
          logger.warn(`⚠️ Erro ao remover placeholder temporário: ${cleanupError.message}`);
        }
      }, 1000);
      
      return readStream;
      
    } catch (error) {
      logger.warn(`⚠️ Erro ao criar imagem placeholder: ${error.message}`);
      return null;
    }
  }

  /**
   * Verifica se um produto já existe na API
   */
  async checkProductExists(referencia) {
    try {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      const response = await this.client.get('/produtos', {
        params: {
          search: referencia,
          per_page: 1
        }
      });

      const products = response.data?.produtos || [];
      const exists = products.some(product => product.referencia === referencia);
      
      if (exists) {
        logger.info(`🔍 Produto ${referencia} já existe na API`);
      } else {
        logger.info(`🔍 Produto ${referencia} não encontrado na API`);
      }
      
      return exists;
      
    } catch (error) {
      logger.warn(`⚠️ Erro ao verificar existência do produto ${referencia}:`, error.message);
      return false; // Assume que não existe em caso de erro
    }
  }

  /**
   * Obtém estatísticas da API
   */
  async getStatistics(type = 'geral', periodo = '30dias') {
    try {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      const response = await this.client.get('/estatisticas', {
        params: { tipo: type, periodo: periodo }
      });

      logger.info(`📊 Estatísticas obtidas: ${type} - ${periodo}`);
      return response.data;
      
    } catch (error) {
      logger.error('❌ Erro ao obter estatísticas:', error.message);
      throw error;
    }
  }

  /**
   * Testa a conectividade com a API
   */
  async testConnection() {
    try {
      logger.info('🔍 Testando conectividade com a API...');
      
      // Tenta autenticar
      await this.authenticate();
      
      // Verifica se o token JWT foi obtido
      if (!this.accessToken) {
        throw new Error('Token JWT não foi obtido durante autenticação');
      }
      
      // Tenta obter estatísticas básicas
      const stats = await this.getStatistics('geral', '7dias');
      
      logger.success('✅ Conexão com a API estabelecida com sucesso');
      logger.info(`🔑 Token JWT válido: ${this.accessToken.substring(0, 20)}...`);
      logger.info(`⏰ Expira em: ${this.tokenExpiry.toLocaleString('pt-BR')}`);
      
      return {
        success: true,
        message: 'Conexão estabelecida com JWT',
        token: this.accessToken.substring(0, 20) + '...',
        expires: this.tokenExpiry.toISOString(),
        stats: stats
      };
      
    } catch (error) {
      logger.error('❌ Falha na conexão com a API:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Limpa recursos e fecha conexões
   */
  async cleanup() {
    try {
      this.accessToken = null;
      this.tokenExpiry = null;
      logger.info('🧹 Recursos da API limpos');
    } catch (error) {
      logger.error('Erro durante limpeza da API:', error);
    }
  }
}

module.exports = ApiClient;

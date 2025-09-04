const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');

// Carrega variáveis de ambiente
require('dotenv').config();

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
    
    // User-Agents rotativos para evitar detecção do Mod_Security
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    this.currentUserAgentIndex = 0;
    
    // Configuração do axios
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.userAgents[0],
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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
   * Baseado na documentação: INTEGRACAO-SCRAPING-API.md
   */
  async authenticate() {
    try {
      logger.info('🔐 Autenticando na API WordPress...');
      
      if (!this.username || !this.password) {
        throw new Error('Credenciais não configuradas. Configure DJOB_USERNAME e DJOB_PASSWORD no .env');
      }

      // 1. Primeiro, faz login na API personalizada para validar credenciais
      logger.info('🔍 Validando credenciais na API personalizada...');
      const response = await this.client.post('/usuario/login', {
        user_email: this.username,
        user_pass: this.password
      });

      if (response.data && response.data.status === 'success') {
        logger.success('✅ Credenciais validadas com sucesso');
        
        // 2. Agora obtém o token JWT via endpoint WordPress padrão
        logger.info('🔍 Obtendo token JWT via endpoint WordPress...');
        
        try {
          // O endpoint JWT está na raiz do WordPress
          const jwtUrl = this.baseURL.replace('/api/v1', '') + '/jwt-auth/v1/token';
          logger.info(`🔍 Chamando endpoint JWT: ${jwtUrl}`);
          
          const jwtResponse = await this.client.post(jwtUrl, {
            username: this.username, // Usa o email como username
            password: this.password
          });
          
          if (jwtResponse.data && jwtResponse.data.token) {
            this.accessToken = jwtResponse.data.token;
            logger.success('✅ Token JWT obtido com sucesso');
            logger.info(`🔑 Token JWT: ${this.accessToken.substring(0, 20)}...`);
            logger.info(`👤 Usuário: ${jwtResponse.data.user_display_name || 'N/A'}`);
            
            // Token JWT expira em 24 horas (padrão WordPress)
            this.tokenExpiry = new Date(Date.now() + 86400000);
            logger.info(`⏰ Token expira em: ${this.tokenExpiry.toLocaleString('pt-BR')}`);
            
            return true;
          } else {
            throw new Error('Token JWT não encontrado na resposta');
          }
        } catch (jwtError) {
          logger.error('❌ Erro ao obter token JWT:', jwtError.message);
          throw new Error(`Falha ao obter token JWT: ${jwtError.message}`);
        }
      } else {
        throw new Error('Resposta de autenticação inválida');
      }
      
    } catch (error) {
      logger.error('❌ Erro na autenticação:', error.message);
      throw new Error(`Falha na autenticação: ${error.message}`);
    }
  }

  /**
   * Envia um produto para a API WordPress
   * Baseado na documentação: INTEGRACAO-SCRAPING-API.md
   */
  async createProduct(product) {
    try {
      logger.info(`📤 Processando produto: ${product.nome} (${product.referencia})`);
      
      // Verifica se está autenticado
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      // Verifica se o produto já existe
      logger.info(`🔍 Verificando se produto já existe: ${product.referencia}`);
      const existsCheck = await this.checkProductExists(product.referencia);
      
      if (existsCheck.exists) {
        logger.info(`🔄 Produto já existe, atualizando: ${product.nome} (ID: ${existsCheck.productId})`);
        return await this.updateProduct(existsCheck.productId, product);
      } else {
        logger.info(`➕ Produto não existe, criando novo: ${product.nome}`);
      }

      // Prepara dados do produto no formato da API WordPress
      const formData = new FormData();
      
      // ✅ Campos obrigatórios conforme documentação
      formData.append('nome', product.nome);
      formData.append('referencia', product.referencia);
      formData.append('descricao', product.descricao || '');
      
      // ✅ Campos opcionais
      if (product.preco) {
        formData.append('preco', product.preco);
      }
      
      if (product.informacoes_adicionais) {
        formData.append('informacoes_adicionais', product.informacoes_adicionais);
      }

      // ✅ Categorias (array)
      if (product.categorias && Array.isArray(product.categorias)) {
        product.categorias.forEach((categoria, index) => {
          formData.append(`categorias[${index}]`, categoria);
        });
      }
      
      // ✅ Cores (array de objetos) - processamento correto
      if (product.cores && Array.isArray(product.cores) && product.cores.length > 0) {
        const coresProcessadas = await this.processarCores(product.cores);
        coresProcessadas.forEach((cor, index) => {
          formData.append(`cores[${index}][nome]`, cor.nome || '');
          formData.append(`cores[${index}][tipo]`, cor.tipo || 'codigo');
          
          if (cor.tipo === 'codigo') {
            if (cor.codigo) formData.append(`cores[${index}][codigo]`, cor.codigo);
            if (cor.codigoNumerico) formData.append(`cores[${index}][codigoNumerico]`, cor.codigoNumerico);
          } else if (cor.tipo === 'imagem' && cor.imagem) {
            // Para cores com imagem, anexa o arquivo
            const fs = require('fs');
            formData.append(`cores[${index}][imagem]`, fs.createReadStream(cor.imagem));
          }
        });
      }
      
      // ✅ Imagens do produto (array) - OBRIGATÓRIO
      if (!product.imagens || product.imagens.length === 0) {
        logger.warn(`⚠️ Produto ${product.nome} (${product.referencia}) não possui imagens - PULANDO`);
        return {
          success: false,
          error: 'Produto sem imagens',
          details: 'Produto não possui imagens válidas',
          product: product.nome,
          action: 'skipped_no_images'
        };
      }
      
      // Processa todas as imagens do produto
      const imagesToProcess = product.imagens;
      
      logger.info(`🖼️ Processando ${imagesToProcess.length} imagens do produto`);
      
      // Processa TODAS as imagens do produto
      let imagesProcessed = 0;
      
      for (let index = 0; index < imagesToProcess.length; index++) {
        const imagem = imagesToProcess[index];
        
        if (typeof imagem === 'string' && imagem.startsWith('http')) {
          try {
            logger.info(`🖼️ Baixando imagem ${index + 1}/${imagesToProcess.length}: ${imagem}`);
            
            const imageResponse = await this.client.get(imagem, {
              responseType: 'arraybuffer',
              timeout: 30000
            });
            
            if (imageResponse.status === 200) {
              const fs = require('fs');
              const path = require('path');
              const tempDir = path.join(process.cwd(), 'temp');
              
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              
              const tempImagePath = path.join(tempDir, `produto_${product.referencia}_${index}.jpg`);
              fs.writeFileSync(tempImagePath, imageResponse.data);
              
              formData.append(`imagens[${imagesProcessed}]`, fs.createReadStream(tempImagePath));
              logger.info(`✅ Imagem ${imagesProcessed + 1} anexada: ${tempImagePath}`);
              imagesProcessed++;
              
              // Delay entre imagens para evitar sobrecarga
              if (index < imagesToProcess.length - 1) {
                const delay = Math.random() * 1000 + 500;
                logger.info(`⏳ Aguardando ${Math.round(delay)}ms antes da próxima imagem...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              
              setTimeout(() => {
                try {
                  fs.unlinkSync(tempImagePath);
                  logger.info(`🧹 Arquivo temporário removido: ${tempImagePath}`);
                } catch (cleanupError) {
                  logger.warn(`⚠️ Erro ao remover arquivo temporário: ${cleanupError.message}`);
                }
              }, 10000); // Aumentado para 10 segundos
              
            } else {
              logger.warn(`⚠️ Não foi possível baixar imagem ${index + 1}: ${imagem} (Status: ${imageResponse.status})`);
            }
          } catch (imageError) {
            logger.warn(`⚠️ Erro ao baixar imagem ${index + 1}: ${imageError.message}`);
          }
        } else if (typeof imagem === 'string') {
          formData.append(`imagens[${imagesProcessed}]`, fs.createReadStream(imagem));
          logger.info(`✅ Imagem local ${imagesProcessed + 1} anexada: ${imagem}`);
          imagesProcessed++;
        }
      }
      
      // Verifica se pelo menos uma imagem foi processada
      if (imagesProcessed === 0) {
        logger.warn(`⚠️ Nenhuma imagem válida processada para ${product.nome} - PULANDO`);
        return {
          success: false,
          error: 'Nenhuma imagem válida',
          details: 'Todas as imagens falharam no processamento',
          product: product.nome,
          action: 'skipped_invalid_images'
        };
      }
      
      logger.info(`✅ ${imagesProcessed} imagem(ns) processada(s) com sucesso`);

      // Log do FormData antes do envio
      logger.info(`📤 Enviando FormData com ${Object.keys(formData._streams || {}).length} campos`);

      // Envia para a API
      const response = await this.client.post('/produto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json, */*'
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
      
      // Log detalhado do erro
      if (error.response) {
        logger.error(`❌ Status HTTP: ${error.response.status}`);
        logger.error(`❌ Headers:`, error.response.headers);
        logger.error(`❌ Dados da resposta:`, error.response.data);
        
        // Log direto do erro completo
        console.log('🔍 ERRO COMPLETO:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // Log do FormData que foi enviado
        logger.error(`❌ FormData enviado:`, {
          referencia: product.referencia,
          nome: product.nome,
          descricao: product.descricao,
          preco: product.preco,
          cores: product.cores?.length || 0,
          imagens: product.imagens?.length || 0,
          categorias: product.categorias?.length || 0
        });
      } else if (error.request) {
        logger.error(`❌ Erro de rede:`, error.request);
      } else {
        logger.error(`❌ Erro geral:`, error.stack);
      }
      
      // ✅ Tratamento específico de erros conforme documentação
      if (error.response?.status === 400) {
        const erro = error.response.data;
        if (erro.code === 'campo_obrigatorio') {
          return {
            success: false,
            error: 'Campo obrigatório',
            details: erro.message,
            product: product.nome
          };
        } else if (erro.code === 'imagem_obrigatoria') {
          return {
            success: false,
            error: 'Imagem obrigatória',
            details: erro.message,
            product: product.nome
          };
        } else if (erro.code === 'cores_obrigatorias') {
          return {
            success: false,
            error: 'Cores obrigatórias',
            details: erro.message,
            product: product.nome
          };
        } else {
        return {
          success: false,
          error: 'Dados inválidos',
          details: error.response.data,
            product: product.nome
          };
        }
      } else if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Token inválido ou expirado',
          details: 'Refazer login',
          product: product.nome
        };
      } else if (error.response?.status === 409) {
        return {
          success: false,
          error: 'Referência já existe',
          details: error.response.data.message,
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
/**
 * Envia múltiplos produtos em lote com delays ajustados para evitar Mod_Security
   */
  async createProductsBatch(products, options = {}) {
    const {
      batchSize = 2, // REDUZIDO para 2 produtos por lote (Mod_Security)
      delayBetweenBatches = 15000, // AUMENTADO para 15 segundos
      delayBetweenProducts = 5000, // AUMENTADO para 5 segundos entre produtos
      maxRetries = 3, // AUMENTADO para 3 retries
      continueOnError = true,
      progressCallback = null
    } = options;

    logger.info(`📦 Iniciando envio em lote de ${products.length} produtos`);
  logger.info(`⚙️  Configuração: ${batchSize} produtos/lote, ${delayBetweenProducts}ms entre produtos, ${delayBetweenBatches}ms entre lotes`);
    
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
      const batchStartTime = Date.now();
      
      logger.info(`\n🔄 LOTE ${batchIndex + 1}/${batches.length} - ${batch.length} produtos`);
      logger.info(`⏰ Iniciando processamento do lote...`);

      // Processa produtos do lote SEQUENCIALMENTE com delay
      const batchResults = [];
      for (let productIndex = 0; productIndex < batch.length; productIndex++) {
          const product = batch[productIndex];
          const productNumber = (batchIndex * batchSize) + productIndex + 1;
          
          logger.info(`\n📦 Produto ${productNumber}/${products.length}: ${product.nome}`);
          logger.info(`🔗 Referência: ${product.referencia}`);

          try {
              // Função com retry incorporado
              const result = await this.createProductWithRetry(product, maxRetries);
              batchResults.push({ product, result });
              
        if (result.success) {
          results.success++;
          results.details.push({
            status: 'success',
            product: product.nome,
            referencia: product.referencia,
                      productId: result.productId,
                      timestamp: new Date().toISOString()
          });
                  logger.success(`✅ Sucesso: ${product.nome}`);
        } else {
          results.errors++;
          results.details.push({
            status: 'error',
            product: product.nome,
            referencia: product.referencia,
            error: result.error,
                      details: result.details,
                      timestamp: new Date().toISOString()
                  });
                  logger.error(`❌ Erro: ${result.error} - ${product.nome}`);
                  
                  if (!continueOnError) {
                      logger.error(`🛑 Parando processamento devido a erro em: ${product.nome}`);
                      break;
                  }
              }

          } catch (error) {
              results.errors++;
              results.details.push({
                  status: 'error',
                  product: product.nome,
                  referencia: product.referencia,
                  error: 'Erro inesperado',
                  details: error.message,
                  timestamp: new Date().toISOString()
              });
              logger.error(`❌ Erro inesperado em ${product.nome}:`, error.message);

          if (!continueOnError) {
                  logger.error(`🛑 Parando processamento devido a erro inesperado`);
            break;
          }
        }

          // Delay entre produtos (exceto o último produto do último lote)
          if (productIndex < batch.length - 1 || batchIndex < batches.length - 1) {
              // Adiciona jitter aleatório para evitar padrões detectáveis
              const jitter = Math.random() * 2000; // 0-2s de aleatoriedade
              const totalDelay = delayBetweenProducts + jitter;
              
              logger.info(`⏳ Aguardando ${Math.round(totalDelay)}ms antes do próximo produto...`);
              await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
      }

      // Callback de progresso
      if (progressCallback) {
        const progress = {
              current: Math.min((batchIndex + 1) * batchSize, products.length),
          total: products.length,
          percentage: Math.round(((batchIndex + 1) * batchSize / products.length) * 100),
          batch: batchIndex + 1,
              totalBatches: batches.length,
              success: results.success,
              errors: results.errors
        };
        progressCallback(progress);
      }

      // Delay entre lotes (exceto o último lote)
      if (batchIndex < batches.length - 1) {
          const batchTime = Date.now() - batchStartTime;
          logger.info(`⏰ Tempo do lote: ${batchTime}ms`);
          logger.info(`📊 Progresso: ${results.success} sucessos, ${results.errors} erros`);
        logger.info(`⏳ Aguardando ${delayBetweenBatches}ms antes do próximo lote...`);
          
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`\n🎯 Envio em lote concluído em ${totalTime}s`);
  logger.info(`📊 Resultado final: ${results.success} sucessos, ${results.errors} erros`);
  
  // Estatísticas de performance
  if (results.success > 0) {
      const avgTimePerProduct = (totalTime / results.success).toFixed(2);
      logger.info(`⏱️  Tempo médio por produto: ${avgTimePerProduct}s`);
  }

    return results;
  }

  /**
* Função auxiliar para retry com backoff exponencial
*/
async createProductWithRetry(product, maxRetries = 2) {
  let lastError;
  let lastResponse;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
          const result = await this.createProduct(product);
          return result;
          
      } catch (error) {
          lastError = error;
          lastResponse = error.response;
          
          // Log específico para Mod_Security
          if (error.response?.status === 406) {
              logger.warn(`🛑 Mod_Security bloqueou (tentativa ${attempt}/${maxRetries})`);
              
              // Backoff exponencial com jitter: 8s, 16s, 32s...
              const baseDelay = Math.pow(2, attempt) * 8000;
              const jitter = Math.random() * 2000; // 0-2s de aleatoriedade
              const delayMs = baseDelay + jitter;
              
              logger.info(`⏳ Aguardando ${Math.round(delayMs)}ms antes de retry...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              
              // Rotaciona User-Agent para evitar detecção
              this.rotateUserAgent();
              
          } else if (error.response?.status === 429) {
              // Rate limiting
              logger.warn(`⚠️ Rate limit atingido (tentativa ${attempt}/${maxRetries})`);
              const delayMs = 10000; // 10 segundos para rate limit
              await new Promise(resolve => setTimeout(resolve, delayMs));
              
          } else {
              // Outros erros não são retried
              throw error;
          }
      }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  logger.error(`💥 Todas as ${maxRetries} tentativas falharam para: ${product.nome}`);
  
  return {
      success: false,
      error: 'Falha após múltiplas tentativas',
      details: lastResponse?.data || lastError?.message,
      product: product.nome
  };
}

/**
* Método adicional para controle de rate limiting global
*/
async withRateLimit(fn, context = 'api-call') {
  const now = Date.now();
  const minInterval = 1000; // 1 segundo mínimo entre requests
  
  if (now - this.lastRequestTime < minInterval) {
      const waitTime = minInterval - (now - this.lastRequestTime);
      logger.debug(`⏰ Rate limiting: aguardando ${waitTime}ms para ${context}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  this.lastRequestTime = Date.now();
  return fn();
}

  /**
   * Verifica se um produto já existe no banco de dados pela referência
   * Usa o endpoint correto: /produto/{referencia}
   */
  async checkProductExists(referencia) {
    try {
      logger.info(`🔍 Verificando se produto existe: ${referencia}`);
      
      // URL completa para debug
      const fullUrl = `${this.baseURL}/produto/${referencia}`;
      logger.info(`🔗 URL completa: ${fullUrl}`);
      
      const response = await this.client.get(`/produto/${referencia}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      logger.info(`📊 Resposta recebida:`, {
        status: response.status,
        data: response.data ? { id: response.data.id, nome: response.data.nome } : null
      });
      
      if (response.data && response.data.id) {
        logger.info(`✅ Produto encontrado: ${referencia} (ID: ${response.data.id})`);
        return {
          exists: true,
          productId: response.data.id,
          data: response.data
        };
      } else {
        logger.debug(`❌ Produto não encontrado: ${referencia}`);
        return { exists: false };
      }
      
    } catch (error) {
      logger.info(`❌ Erro na busca:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 404) {
        logger.debug(`❌ Produto não encontrado (404): ${referencia}`);
        return { exists: false };
      } else {
        logger.warn(`⚠️ Erro ao verificar produto ${referencia}:`, error.message);
        return { exists: false, error: error.message };
      }
    }
  }

  /**
   * Atualiza um produto existente
   */
  async updateProduct(productId, product) {
    try {
      logger.info(`🔄 Atualizando produto existente: ${product.nome} (ID: ${productId})`);
      
      // Prepara FormData para atualização
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Campos básicos
      formData.append('nome', product.nome);
      formData.append('referencia', product.referencia);
      formData.append('descricao', product.descricao || '');
      formData.append('preco', product.preco?.toString() || '0');
      
      // Categorias
      if (product.categorias && Array.isArray(product.categorias)) {
        product.categorias.forEach((categoria, index) => {
          formData.append(`categorias[${index}]`, categoria);
        });
      }
      
      // Cores processadas
      const coresProcessadas = await this.processarCores(product.cores || []);
      coresProcessadas.forEach((cor, index) => {
        formData.append(`cores[${index}][nome]`, cor.nome);
        formData.append(`cores[${index}][tipo]`, cor.tipo);
        formData.append(`cores[${index}][codigo]`, cor.codigo || '');
        formData.append(`cores[${index}][codigoNumerico]`, cor.codigoNumerico || '');
      });
      
      // Imagens (apenas se houver)
      if (product.imagens && product.imagens.length > 0) {
        for (let index = 0; index < product.imagens.length; index++) {
          const imagem = product.imagens[index];
          
          if (typeof imagem === 'string' && imagem.startsWith('http')) {
            try {
              const imageResponse = await this.client.get(imagem, {
                responseType: 'arraybuffer',
                timeout: 30000
              });
              
              if (imageResponse.status === 200) {
      const fs = require('fs');
      const path = require('path');
                const tempDir = path.join(process.cwd(), 'temp');
                
                if (!fs.existsSync(tempDir)) {
                  fs.mkdirSync(tempDir, { recursive: true });
                }
                
                const tempImagePath = path.join(tempDir, `update_${product.referencia}_${index}.jpg`);
                fs.writeFileSync(tempImagePath, imageResponse.data);
                
                formData.append(`imagens[${index}]`, fs.createReadStream(tempImagePath));
                logger.info(`✅ Imagem ${index + 1} anexada para atualização: ${tempImagePath}`);
                
                // Remove arquivo temporário após delay
                setTimeout(() => {
                  try {
                    fs.unlinkSync(tempImagePath);
                    logger.debug(`🧹 Arquivo temporário removido: ${tempImagePath}`);
                  } catch (cleanupError) {
                    logger.warn(`⚠️ Erro ao remover arquivo temporário: ${cleanupError.message}`);
                  }
                }, 30000);
              }
            } catch (imageError) {
              logger.warn(`⚠️ Erro ao baixar imagem ${index + 1}: ${imageError.message}`);
            }
          }
        }
      }
      
      // Envia atualização
      const response = await this.client.put(`/produto/${productId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json, */*',
          ...formData.getHeaders()
        },
        timeout: 60000
      });
      
      logger.success(`✅ Produto atualizado com sucesso: ${product.nome} (ID: ${productId})`);
      
      return {
        success: true,
        productId: productId,
        data: response.data,
        action: 'updated'
      };
      
    } catch (error) {
      logger.error(`❌ Erro ao atualizar produto ${product.nome}:`, error.message);
      
      if (error.response) {
        logger.error(`❌ Status HTTP: ${error.response.status}`);
        logger.error(`❌ Dados da resposta:`, error.response.data);
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data || error.message,
        product: product.nome,
        action: 'update_failed'
      };
    }
  }

  /**
   * Rotaciona o User-Agent para evitar detecção do Mod_Security
   */
  rotateUserAgent() {
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    const newUserAgent = this.userAgents[this.currentUserAgentIndex];
    
    this.client.defaults.headers['User-Agent'] = newUserAgent;
    logger.debug(`🔄 User-Agent rotacionado para: ${newUserAgent.substring(0, 50)}...`);
  }

  /**
   * Processa as cores do produto
   */
  async processarCores(cores) {
    const fs = require('fs');
    const coresProcessadas = [];
    
    for (const cor of cores) {
      if (typeof cor === 'string') {
        // Se for string simples, converte para objeto
        coresProcessadas.push({
          nome: cor,
          tipo: 'codigo',
          codigo: '',
          codigoNumerico: ''
        });
      } else if (typeof cor === 'object' && cor.nome) {
        if (cor.tipo === 'imagem' && cor.imagem) {
          // Upload da imagem da cor
          try {
            const tempImagePath = await this.downloadImage(cor.imagem, `cor_${cor.nome}`);
            coresProcessadas.push({
              nome: cor.nome,
              tipo: 'imagem',
              imagem: tempImagePath
            });
          } catch (error) {
            logger.warn(`⚠️ Erro ao baixar imagem da cor ${cor.nome}: ${error.message}`);
            // Fallback para código se a imagem falhar
            coresProcessadas.push({
              nome: cor.nome,
              tipo: 'codigo',
              codigo: cor.codigo || '',
              codigoNumerico: cor.codigoNumerico || ''
            });
          }
        } else if (cor.tipo === 'codigo' || cor.tipo === 'hex') {
          // Converte 'hex' para 'codigo' pois a API espera 'codigo'
          coresProcessadas.push({
            nome: cor.nome,
            tipo: 'codigo',
            codigo: cor.codigo || '',
            codigoNumerico: cor.codigoNumerico || ''
          });
        } else {
          // Tipo não reconhecido, usa como código
          coresProcessadas.push({
            nome: cor.nome,
            tipo: 'codigo',
            codigo: cor.codigo || '',
            codigoNumerico: cor.codigoNumerico || ''
          });
        }
      }
    }
    
    return coresProcessadas;
  }

  /**
   * Baixa uma imagem e retorna o caminho temporário
   */
  async downloadImage(imageUrl, prefix = 'image') {
    const fs = require('fs');
    const path = require('path');
      const tempDir = path.join(process.cwd(), 'temp');
      
      // Cria diretório temporário se não existir
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
    const tempImagePath = path.join(tempDir, `${prefix}_${Date.now()}.jpg`);
    
    try {
      const imageResponse = await this.client.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      if (imageResponse.status === 200) {
        fs.writeFileSync(tempImagePath, imageResponse.data);
      
      // Remove o arquivo temporário após um delay
      setTimeout(() => {
        try {
          fs.unlinkSync(tempImagePath);
            logger.info(`🧹 Arquivo temporário removido: ${tempImagePath}`);
        } catch (cleanupError) {
            logger.warn(`⚠️ Erro ao remover arquivo temporário: ${cleanupError.message}`);
        }
      }, 1000);
      
        return tempImagePath;
      } else {
        throw new Error(`HTTP ${imageResponse.status}`);
      }
    } catch (error) {
      throw new Error(`Erro ao baixar imagem: ${error.message}`);
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

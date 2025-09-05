/**
 * 🧪 Teste de Integração com API WordPress
 * 
 * Este arquivo testa a integração completa entre o scraping e a API WordPress
 * Baseado na documentação: INTEGRACAO-SCRAPING-API.md
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const ApiClient = require('../utils/apiClient');
const config = require('../config/api');
const logger = require('../utils/logger');

class TesteIntegracaoAPI {
  constructor() {
    this.apiClient = new ApiClient(config);
    this.resultados = [];
  }

  /**
   * 🧪 Executar todos os testes
   */
  async executarTodosTestes() {
    console.log('🧪 Iniciando testes de integração com API WordPress...\n');
    
    try {
      // Teste 1: Conectividade
      await this.testarConectividade();
      
      // Teste 2: Autenticação
      await this.testarAutenticacao();
      
      // Teste 3: Criação de produto simples
      await this.testarCriacaoProdutoSimples();
      
      // Teste 4: Criação de produto complexo
      await this.testarCriacaoProdutoComplexo();
      
      // Teste 5: Tratamento de erros
      await this.testarTratamentoErros();
      
      this.exibirResumoTestes();
      
    } catch (error) {
      logger.error('💥 Erro nos testes:', error.message);
    }
  }

  /**
   * 🔍 Teste de conectividade
   */
  async testarConectividade() {
    console.log('🔍 Testando conectividade com a API...');
    
    try {
      const resultado = await this.apiClient.testConnection();
      
      if (resultado.success) {
        this.adicionarResultado('Conectividade', true, 'Conexão estabelecida com sucesso');
        logger.info(`🔑 Token: ${resultado.token}`);
        logger.info(`⏰ Expira: ${resultado.expires}`);
      } else {
        this.adicionarResultado('Conectividade', false, resultado.error);
      }
    } catch (error) {
      this.adicionarResultado('Conectividade', false, error.message);
    }
  }

  /**
   * 🔐 Teste de autenticação
   */
  async testarAutenticacao() {
    console.log('🔐 Testando autenticação...');
    
    try {
      await this.apiClient.authenticate();
      
      if (this.apiClient.accessToken) {
        this.adicionarResultado('Autenticação', true, 'Token JWT obtido com sucesso');
      } else {
        this.adicionarResultado('Autenticação', false, 'Token não foi obtido');
      }
    } catch (error) {
      this.adicionarResultado('Autenticação', false, error.message);
    }
  }

  /**
   * 📦 Teste de criação de produto simples
   */
  async testarCriacaoProdutoSimples() {
    console.log('📦 Testando criação de produto simples...');
    
    try {
      const produtoTeste = {
        nome: `Produto Teste ${Date.now()}`,
        referencia: `TEST-${Date.now()}`,
        descricao: "Produto criado para teste de integração com API WordPress",
        preco: 99.99,
        imagens: [], // Sem imagens por enquanto
        cores: [
          {
            nome: "Azul Teste",
            tipo: "codigo",
            codigo: "#0000FF"
          }
        ],
        categorias: ["Teste", "Integração"],
        informacoes_adicionais: "Produto de teste"
      };
      
      const resultado = await this.apiClient.createProduct(produtoTeste);
      
      if (resultado.success) {
        this.adicionarResultado('Criação Produto Simples', true, `Produto criado com ID: ${resultado.productId}`);
      } else {
        this.adicionarResultado('Criação Produto Simples', false, resultado.error);
      }
    } catch (error) {
      this.adicionarResultado('Criação Produto Simples', false, error.message);
    }
  }

  /**
   * 🎨 Teste de criação de produto complexo
   */
  async testarCriacaoProdutoComplexo() {
    console.log('🎨 Testando criação de produto complexo...');
    
    try {
      const produtoComplexo = {
        nome: `Produto Complexo ${Date.now()}`,
        referencia: `COMPLEX-${Date.now()}`,
        descricao: "Produto complexo com cores híbridas e categorias para teste completo da API WordPress",
        preco: 299.99,
        imagens: [], // Sem imagens por enquanto
        cores: [
          {
            nome: "Azul Marinho",
            tipo: "codigo",
            codigo: "#000080"
          },
          {
            nome: "Verde Neon",
            tipo: "codigo",
            codigo: "#00FF00",
            codigoNumerico: "65280"
          }
        ],
        categorias: ["Eletrônicos", "Teste", "Complexo"],
        informacoes_adicionais: "Produto complexo para teste completo da integração"
      };
      
      const resultado = await this.apiClient.createProduct(produtoComplexo);
      
      if (resultado.success) {
        this.adicionarResultado('Criação Produto Complexo', true, `Produto criado com ID: ${resultado.productId}`);
    } else {
        this.adicionarResultado('Criação Produto Complexo', false, resultado.error);
      }
    } catch (error) {
      this.adicionarResultado('Criação Produto Complexo', false, error.message);
    }
  }

  /**
   * 🚨 Teste de tratamento de erros
   */
  async testarTratamentoErros() {
    console.log('🚨 Testando tratamento de erros...');
    
    try {
      // Teste com referência duplicada
      const produtoDuplicado = {
        nome: "Produto Duplicado",
        referencia: "DUPLICADO-001", // Mesma referência
        descricao: "Produto com referência duplicada para teste de erro",
        imagens: [], // Sem imagens por enquanto
        cores: [{ nome: "Azul", tipo: "codigo", codigo: "#0000FF" }],
        categorias: ["Teste"]
      };
      
      // Primeira criação (deve funcionar)
      await this.apiClient.createProduct(produtoDuplicado);
      
      // Segunda criação (deve falhar)
      const resultado = await this.apiClient.createProduct(produtoDuplicado);
      
      if (!resultado.success && resultado.error.includes('já existe')) {
        this.adicionarResultado('Tratamento Erros', true, 'Erro de duplicação detectado corretamente');
      } else {
        this.adicionarResultado('Tratamento Erros', false, 'Deveria ter detectado referência duplicada');
      }
    } catch (error) {
      if (error.message.includes('já existe') || error.response?.status === 409) {
        this.adicionarResultado('Tratamento Erros', true, 'Erro de duplicação detectado corretamente');
      } else {
        this.adicionarResultado('Tratamento Erros', false, error.message);
      }
    }
  }

  /**
   * 🖼️ Criar imagem de teste
   */
  criarImagemTeste() {
    const fs = require('fs');
    const path = require('path');
    
    // Criar diretório de imagens se não existir
    const dirImagens = './imagens-teste';
    if (!fs.existsSync(dirImagens)) {
      fs.mkdirSync(dirImagens, { recursive: true });
    }
    
    // Criar um arquivo de imagem simples (1x1 pixel PNG)
    const imagemPath = path.join(dirImagens, `teste-${Date.now()}.png`);
    const imagemBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ]);
    
    fs.writeFileSync(imagemPath, imagemBuffer);
    return imagemPath;
  }

  /**
   * 📊 Adicionar resultado do teste
   */
  adicionarResultado(nome, sucesso, mensagem) {
    this.resultados.push({
      nome,
      sucesso,
      mensagem,
      timestamp: new Date().toISOString()
    });
    
    const status = sucesso ? '✅' : '❌';
    console.log(`${status} ${nome}: ${mensagem}\n`);
  }

  /**
   * 📋 Exibir resumo dos testes
   */
  exibirResumoTestes() {
    console.log('📊 RESUMO DOS TESTES DE INTEGRAÇÃO');
    console.log('===================================');
    
    const sucessos = this.resultados.filter(r => r.sucesso).length;
    const falhas = this.resultados.filter(r => !r.sucesso).length;
    const total = this.resultados.length;
    
    console.log(`Total de testes: ${total}`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Falhas: ${falhas}`);
    console.log(`📈 Taxa de sucesso: ${((sucessos / total) * 100).toFixed(1)}%\n`);
    
    if (falhas > 0) {
      console.log('❌ TESTES QUE FALHARAM:');
      this.resultados
        .filter(r => !r.sucesso)
        .forEach(r => console.log(`  - ${r.nome}: ${r.mensagem}`));
    }
    
    console.log('\n🎯 Próximos passos:');
    if (sucessos === total) {
      console.log('  ✅ Todos os testes passaram! A integração está funcionando perfeitamente.');
      console.log('  🚀 Você pode começar a usar a integração em produção.');
      console.log('  📦 Execute: npm start para fazer scraping com upload automático para API');
    } else {
      console.log('  🔧 Corrija os testes que falharam antes de usar em produção.');
      console.log('  📚 Verifique as credenciais no arquivo .env');
      console.log('  🌐 Confirme se a API WordPress está rodando em http://localhost:8000');
    }
  }
}

// Executar testes se o arquivo for executado diretamente
if (require.main === module) {
  const teste = new TesteIntegracaoAPI();
  teste.executarTodosTestes().catch(console.error);
}

module.exports = TesteIntegracaoAPI;
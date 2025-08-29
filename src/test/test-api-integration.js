#!/usr/bin/env node

require('dotenv').config();
const logger = require('../utils/logger');
const ApiClient = require('../utils/apiClient');
const SyncManager = require('../utils/syncManager');
const apiConfig = require('../config/api');

/**
 * Teste de integração com a API da djob.com.br
 */
class ApiIntegrationTest {
  constructor() {
    this.apiClient = new ApiClient(apiConfig);
    this.syncManager = new SyncManager({
      ...apiConfig.sync,
      api: apiConfig
    });
  }

  /**
   * Executa todos os testes
   */
  async runAllTests() {
    try {
      logger.title('🧪 TESTE DE INTEGRAÇÃO COM A API');
      
      // Teste 1: Conexão com a API
      await this.testConnection();
      
      // Teste 2: Autenticação
      await this.testAuthentication();
      
      // Teste 3: Verificação de produtos
      await this.testProductCheck();
      
      // Teste 4: Estatísticas
      await this.testStatistics();
      
      // Teste 5: Sincronização
      await this.testSyncManager();
      
      logger.success('✅ Todos os testes passaram com sucesso!');
      
    } catch (error) {
      logger.error('❌ Teste falhou:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Teste 1: Conexão com a API
   */
  async testConnection() {
    logger.info('🔍 Teste 1: Testando conexão com a API...');
    
    const result = await this.apiClient.testConnection();
    
    if (!result.success) {
      throw new Error(`Falha na conexão: ${result.error}`);
    }
    
    logger.success('✅ Conexão estabelecida com sucesso');
    logger.info(`📊 Estatísticas disponíveis: ${Object.keys(result.stats || {}).length} campos`);
  }

  /**
   * Teste 2: Autenticação
   */
  async testAuthentication() {
    logger.info('🔐 Teste 2: Testando autenticação...');
    
    const result = await this.apiClient.authenticate();
    
    if (!result) {
      throw new Error('Falha na autenticação');
    }
    
    logger.success('✅ Autenticação realizada com sucesso');
    logger.info(`🔑 Token obtido: ${this.apiClient.accessToken ? 'SIM' : 'NÃO'}`);
  }

  /**
   * Teste 3: Verificação de produtos
   */
  async testProductCheck() {
    logger.info('🔍 Teste 3: Testando verificação de produtos...');
    
    // Testa com uma referência fictícia
    const testReference = 'TEST-' + Date.now();
    const exists = await this.apiClient.checkProductExists(testReference);
    
    logger.info(`🔍 Produto de teste ${testReference}: ${exists ? 'EXISTE' : 'NÃO EXISTE'}`);
    logger.success('✅ Verificação de produtos funcionando');
  }

  /**
   * Teste 4: Estatísticas
   */
  async testStatistics() {
    logger.info('📊 Teste 4: Testando obtenção de estatísticas...');
    
    const stats = await this.apiClient.getStatistics('geral', '7dias');
    
    if (stats) {
      logger.success('✅ Estatísticas obtidas com sucesso');
      logger.info(`📈 Dados disponíveis: ${Object.keys(stats).length} campos`);
    } else {
      throw new Error('Falha ao obter estatísticas');
    }
  }

  /**
   * Teste 5: Gerenciador de sincronização
   */
  async testSyncManager() {
    logger.info('🔄 Teste 5: Testando gerenciador de sincronização...');
    
    await this.syncManager.initialize();
    
    // Exibe estatísticas iniciais
    this.syncManager.showStats();
    
    logger.success('✅ Gerenciador de sincronização funcionando');
  }

  /**
   * Teste de envio de produto (opcional)
   */
  async testProductCreation() {
    logger.info('📤 Teste 6: Testando criação de produto (MODO TESTE)...');
    
    // Só executa se estiver em modo de teste
    if (!apiConfig.development.testMode) {
      logger.warn('⚠️ Modo de teste desabilitado, pulando criação de produto');
      return;
    }
    
    const testProduct = {
      referencia: 'TEST-' + Date.now(),
      nome: 'Produto de Teste - API Integration',
      descricao: 'Produto criado durante teste de integração',
      preco: 99.99,
      categorias: ['Teste', 'Integração'],
      cores: [
        {
          nome: 'Azul',
          codigo: '#0000FF',
          tipo: 'hex'
        }
      ],
      imagens: ['https://via.placeholder.com/300x300/0000FF/FFFFFF?text=Teste']
    };
    
    const result = await this.apiClient.createProduct(testProduct);
    
    if (result.success) {
      logger.success('✅ Produto de teste criado com sucesso');
      logger.info(`🆔 ID do produto: ${result.productId}`);
    } else {
      logger.warn(`⚠️ Produto de teste não foi criado: ${result.error}`);
    }
  }

  /**
   * Limpa recursos
   */
  async cleanup() {
    try {
      await this.apiClient.cleanup();
      await this.syncManager.cleanup();
      logger.info('🧹 Recursos limpos');
    } catch (error) {
      logger.error('Erro durante limpeza:', error);
    }
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    const test = new ApiIntegrationTest();
    await test.runAllTests();
    
    logger.separator();
    logger.success('🎉 Teste de integração concluído com sucesso!');
    logger.info('💡 A API está funcionando corretamente e pronta para uso');
    
  } catch (error) {
    logger.error('💥 Teste de integração falhou:', error.message);
    process.exit(1);
  }
}

// Executa se for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = ApiIntegrationTest;

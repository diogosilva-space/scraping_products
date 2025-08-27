#!/usr/bin/env node

require('dotenv').config();
const logger = require('../utils/logger');
const BrowserManager = require('../utils/browser');

/**
 * Script de teste para verificar o funcionamento básico
 */
async function testBasicFunctionality() {
  let browserManager = null;
  
  try {
    logger.title('🧪 TESTE BÁSICO DO SISTEMA');
    
    // Teste 1: Inicialização do navegador
    logger.info('Teste 1: Inicializando navegador...');
    browserManager = new BrowserManager();
    await browserManager.initialize();
    logger.success('✅ Navegador inicializado com sucesso');
    
    // Teste 2: Navegação para um site
    logger.info('Teste 2: Testando navegação...');
    await browserManager.navigateTo('https://www.google.com');
    logger.success('✅ Navegação funcionando');
    
    // Teste 3: Execução de JavaScript
    logger.info('Teste 3: Testando execução de JavaScript...');
    const title = await browserManager.evaluate(() => document.title);
    logger.success(`✅ JavaScript funcionando. Título: ${title}`);
    
    // Teste 4: Screenshot
    logger.info('Teste 4: Testando screenshot...');
    const screenshotPath = await browserManager.takeScreenshot({
      path: 'test-screenshot.png'
    });
    logger.success(`✅ Screenshot salvo: ${screenshotPath}`);
    
    logger.success('🎉 Todos os testes básicos passaram!');
    
  } catch (error) {
    logger.error('❌ Teste falhou:', error);
    throw error;
  } finally {
    if (browserManager) {
      await browserManager.close();
    }
  }
}

/**
 * Teste de configurações
 */
async function testConfigurations() {
  try {
    logger.title('⚙️ TESTE DE CONFIGURAÇÕES');
    
    // Teste das configurações dos sites
    const spotgiftsConfig = require('../config/spotgifts');
    const xbzbrindesConfig = require('../config/xbzbrindes');
    
    logger.info('Verificando configuração do Spot Gifts...');
    if (spotgiftsConfig.name && spotgiftsConfig.baseUrl) {
      logger.success('✅ Configuração do Spot Gifts válida');
    } else {
      throw new Error('Configuração do Spot Gifts inválida');
    }
    
    logger.info('Verificando configuração do XBZ Brindes...');
    if (xbzbrindesConfig.name && xbzbrindesConfig.baseUrl) {
      logger.success('✅ Configuração do XBZ Brindes válida');
    } else {
      throw new Error('Configuração do XBZ Brindes inválida');
    }
    
    logger.success('🎉 Todas as configurações estão válidas!');
    
  } catch (error) {
    logger.error('❌ Teste de configurações falhou:', error);
    throw error;
  }
}

/**
 * Teste de utilitários
 */
async function testUtilities() {
  try {
    logger.title('🔧 TESTE DE UTILITÁRIOS');
    
    // Teste do logger
    logger.info('Testando sistema de logging...');
    logger.success('Log de sucesso funcionando');
    logger.warn('Log de aviso funcionando');
    logger.error('Log de erro funcionando');
    logger.debug('Log de debug funcionando');
    
    // Teste de progresso
    logger.info('Testando barra de progresso...');
    for (let i = 0; i <= 100; i += 10) {
      logger.progress(i, 100, 'Teste de progresso');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    logger.newLine();
    
    logger.success('🎉 Todos os utilitários estão funcionando!');
    
  } catch (error) {
    logger.error('❌ Teste de utilitários falhou:', error);
    throw error;
  }
}

/**
 * Função principal de teste
 */
async function runTests() {
  try {
    logger.title('🚀 INICIANDO TESTES DO SISTEMA');
    
    await testConfigurations();
    await testUtilities();
    await testBasicFunctionality();
    
    logger.title('🎉 TODOS OS TESTES PASSARAM!');
    logger.info('O sistema está funcionando corretamente.');
    logger.info('Você pode agora executar: npm start');
    
  } catch (error) {
    logger.error('❌ ALGUNS TESTES FALHARAM:', error);
    process.exit(1);
  }
}

// Executa os testes se for chamado diretamente
if (require.main === module) {
  runTests();
}

module.exports = {
  testBasicFunctionality,
  testConfigurations,
  testUtilities,
  runTests
};

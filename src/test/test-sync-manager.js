/**
 * 🧪 Teste específico do SyncManager
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const SyncManager = require('../utils/syncManager');
const config = require('../config/api');
const logger = require('../utils/logger');

async function testarSyncManager() {
  console.log('🧪 Testando SyncManager...\n');
  
  try {
    const syncManager = new SyncManager({
      enabled: true,
      syncAfterScraping: true,
      batchSize: 10,
      batchDelay: 2000,
      continueOnError: true,
      api: config
    });
    
    await syncManager.initialize();
    
    // Cria produtos de teste
    const produtos = [
      {
        nome: `Produto Teste 1 ${Date.now()}`,
        referencia: `TEST-1-${Date.now()}`,
        descricao: "Produto de teste 1",
        preco: 99.99,
        imagens: ["https://www.spotgifts.com.br/fotos/opcionais/127_95942891861fd2ed30cc0a.png"],
        cores: [{ nome: "Azul", tipo: "codigo", codigo: "#0000FF" }],
        categorias: ["Teste"],
        informacoes_adicionais: "Produto de teste 1"
      },
      {
        nome: `Produto Teste 2 ${Date.now()}`,
        referencia: `TEST-2-${Date.now()}`,
        descricao: "Produto de teste 2",
        preco: 199.99,
        imagens: ["https://www.spotgifts.com.br/fotos/opcionais/137_20406894755f298de1114fd.png"],
        cores: [{ nome: "Vermelho", tipo: "codigo", codigo: "#FF0000" }],
        categorias: ["Teste"],
        informacoes_adicionais: "Produto de teste 2"
      }
    ];
    
    console.log(`📤 Enviando ${produtos.length} produtos via SyncManager...`);
    
    const resultado = await syncManager.syncAfterScraping(produtos, 'Teste');
    
    console.log('✅ SyncManager testado com sucesso!');
    console.log('📊 Resultado:', resultado);
    
    await syncManager.cleanup();
    
  } catch (error) {
    console.error('💥 Erro no teste do SyncManager:', error.message);
    console.error('💥 Stack completo:', error.stack);
  }
}

// Executar teste
testarSyncManager().catch(console.error);

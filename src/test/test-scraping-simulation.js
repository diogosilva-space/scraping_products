/**
 * 🧪 Teste que simula exatamente o que acontece durante o scraping
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const SyncManager = require('../utils/syncManager');
const config = require('../config/api');
const logger = require('../utils/logger');

async function testarSimulacaoScraping() {
  console.log('🧪 Testando simulação do scraping real...\n');
  
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
    
    // Simula produtos exatamente como vêm do scraping real
    const produtosScraping = [
      {
        nome: "GILDED. Squeeze dobrável em PE com bico de sistema \"push-pull\" e acabamento metalizado 460 mL",
        referencia: "SP-94690",
        descricao: "Squeeze dobrável em PE com bico de sistema push-pull e acabamento metalizado 460 mL",
        preco: 12.55,
        imagens: [
          "https://www.spotgifts.com.br/fotos/produtos/94690_103_1.jpg",
          "https://www.spotgifts.com.br/fotos/produtos/94690_104_1.jpg",
          "https://www.spotgifts.com.br/fotos/produtos/94690_105_1.jpg"
        ],
        cores: [
          {
            nome: "Preto",
            tipo: "hex",
            codigo: "#000000",
            codigoNumerico: "103"
          },
          {
            nome: "Azul",
            tipo: "hex", 
            codigo: "#1F3C75",
            codigoNumerico: "104"
          },
          {
            nome: "Vermelho",
            tipo: "hex",
            codigo: "#DD2A34", 
            codigoNumerico: "105"
          }
        ],
        categorias: ["Squeezes", "Promocionais"],
        informacoes_adicionais: "Produto extraído do Spot Gifts",
        url_produto: "https://www.spotgifts.com.br/pt/catalogo/squeezes/94690/",
        site_origem: "Spot Gifts"
      },
      {
        nome: "DECNOP. Squeeze dobrável em PE com bico de sistema \"push-pull\" e acabamento mate 460 mL",
        referencia: "SP-94689",
        descricao: "Squeeze dobrável em PE com bico de sistema push-pull e acabamento mate 460 mL",
        preco: 11.99,
        imagens: [
          "https://www.spotgifts.com.br/fotos/produtos/94689_106_1.jpg",
          "https://www.spotgifts.com.br/fotos/produtos/94689_103_1.jpg"
        ],
        cores: [
          {
            nome: "Branco",
            tipo: "hex",
            codigo: "#FFFFFF",
            codigoNumerico: "106"
          },
          {
            nome: "Preto",
            tipo: "hex",
            codigo: "#000000",
            codigoNumerico: "103"
          }
        ],
        categorias: ["Squeezes", "Promocionais"],
        informacoes_adicionais: "Produto extraído do Spot Gifts",
        url_produto: "https://www.spotgifts.com.br/pt/catalogo/squeezes/94689/",
        site_origem: "Spot Gifts"
      }
    ];
    
    console.log(`📤 Enviando ${produtosScraping.length} produtos simulando scraping real...`);
    
    const resultado = await syncManager.syncAfterScraping(produtosScraping, 'Spot Gifts');
    
    console.log('✅ Simulação do scraping testada!');
    console.log('📊 Resultado:', resultado);
    
    await syncManager.cleanup();
    
  } catch (error) {
    console.error('💥 Erro na simulação do scraping:', error.message);
    console.error('💥 Stack completo:', error.stack);
  }
}

// Executar teste
testarSimulacaoScraping().catch(console.error);

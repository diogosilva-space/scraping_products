/**
 * 🧪 Teste com produto simples para isolar o problema
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const ApiClient = require('../utils/apiClient');
const config = require('../config/api');
const logger = require('../utils/logger');

async function testarProdutoSimples() {
  console.log('🧪 Testando produto simples...\n');
  
  const apiClient = new ApiClient(config);
  
  try {
    // Produto simples sem imagens
    const produtoSimples = {
      nome: `Produto Simples ${Date.now()}`,
      referencia: `SIMPLE-${Date.now()}`,
      descricao: "Produto simples para teste",
      preco: 99.99,
      imagens: [],
      cores: [
        {
          nome: "Azul",
          tipo: "codigo",
          codigo: "#0000FF"
        }
      ],
      categorias: ["Teste"],
      informacoes_adicionais: "Produto simples"
    };
    
    console.log('📤 Enviando produto simples...');
    const resultado = await apiClient.createProduct(produtoSimples);
    
    if (resultado.success) {
      console.log('✅ Produto simples criado com sucesso!');
      console.log(`📋 ID do produto: ${resultado.productId}`);
    } else {
      console.log('❌ Erro ao criar produto simples:', resultado.error);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
    console.error('💥 Stack completo:', error.stack);
  }
}

// Executar teste
testarProdutoSimples().catch(console.error);

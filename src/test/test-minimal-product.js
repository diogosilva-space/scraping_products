/**
 * 🧪 Teste de produto mínimo para descobrir o formato correto da API
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const ApiClient = require('../utils/apiClient');
const config = require('../config/api');
const logger = require('../utils/logger');

async function testarProdutoMinimo() {
  console.log('🧪 Testando produto mínimo...\n');
  
  try {
    const apiClient = new ApiClient(config);
    
    // Produto com apenas campos obrigatórios
    const produtoMinimo = {
      nome: "Produto Mínimo Teste",
      referencia: "MIN-TEST-" + Date.now(),
      descricao: "Descrição do produto mínimo",
      preco: 10.50,
      cores: "Azul", // String simples
      categorias: ["Teste"],
      imagens: []
    };
    
    console.log('📤 Enviando produto mínimo...');
    console.log('📋 Dados do produto:', JSON.stringify(produtoMinimo, null, 2));
    
    const resultado = await apiClient.createProduct(produtoMinimo);
    
    console.log('📋 Resultado completo:', JSON.stringify(resultado, null, 2));
    
    if (resultado.success) {
      console.log('✅ Produto mínimo criado com sucesso!');
      console.log('📋 ID do produto:', resultado.productId);
    } else {
      console.log('❌ Erro ao criar produto mínimo:', resultado.error);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
    console.error('💥 Stack:', error.stack);
  }
}

// Executar teste
testarProdutoMinimo().catch(console.error);

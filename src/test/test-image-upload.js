/**
 * 🖼️ Teste específico para upload de imagens
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const ApiClient = require('../utils/apiClient');
const config = require('../config/api');
const logger = require('../utils/logger');

async function testarUploadImagem() {
  console.log('🖼️ Testando upload de imagem real...\n');
  
  const apiClient = new ApiClient(config);
  
  try {
    // Produto com imagem real do Spot Gifts
    const produtoComImagem = {
      nome: `Produto com Imagem Real ${Date.now()}`,
      referencia: `IMG-${Date.now()}`,
      descricao: "Produto para testar upload de imagem real do Spot Gifts",
      preco: 99.99,
      imagens: [
        "https://www.spotgifts.com.br/fotos/opcionais/127_95942891861fd2ed30cc0a.png" // Imagem real do Spot Gifts que sabemos que existe
      ],
      cores: [
        {
          nome: "Azul Teste",
          tipo: "codigo",
          codigo: "#0000FF"
        }
      ],
      categorias: ["Teste", "Imagem"],
      informacoes_adicionais: "Teste de upload de imagem real"
    };
    
    console.log('📤 Enviando produto com imagem real...');
    const resultado = await apiClient.createProduct(produtoComImagem);
    
    if (resultado.success) {
      console.log('✅ Produto com imagem criado com sucesso!');
      console.log(`📋 ID do produto: ${resultado.productId}`);
      console.log('🎉 Upload de imagem funcionando perfeitamente!');
    } else {
      console.log('❌ Erro ao criar produto:', resultado.error);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
  }
}

// Executar teste
testarUploadImagem().catch(console.error);

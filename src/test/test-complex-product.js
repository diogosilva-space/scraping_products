/**
 * 🧪 Teste com produto complexo para reproduzir o erro
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const ApiClient = require('../utils/apiClient');
const config = require('../config/api');
const logger = require('../utils/logger');

async function testarProdutoComplexo() {
  console.log('🧪 Testando produto complexo com múltiplas imagens...\n');
  
  const apiClient = new ApiClient(config);
  
  try {
    // Produto complexo similar ao que está falhando
    const produtoComplexo = {
      nome: `Produto Complexo Teste ${Date.now()}`,
      referencia: `COMPLEX-TEST-${Date.now()}`,
      descricao: "Produto complexo para testar upload com múltiplas imagens e cores",
      preco: 299.99,
      imagens: [
        "https://www.spotgifts.com.br/fotos/opcionais/127_95942891861fd2ed30cc0a.png",
        "https://www.spotgifts.com.br/fotos/opcionais/137_20406894755f298de1114fd.png"
      ],
      cores: [
        {
          nome: "Azul Marinho",
          tipo: "codigo",
          codigo: "#000080"
        },
        {
          nome: "Vermelho Metálico",
          tipo: "imagem",
          imagem: "https://www.spotgifts.com.br/fotos/opcionais/127_95942891861fd2ed30cc0a.png"
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
    
    console.log('📤 Enviando produto complexo...');
    const resultado = await apiClient.createProduct(produtoComplexo);
    
    if (resultado.success) {
      console.log('✅ Produto complexo criado com sucesso!');
      console.log(`📋 ID do produto: ${resultado.productId}`);
      console.log('🎉 Upload de produto complexo funcionando!');
    } else {
      console.log('❌ Erro ao criar produto complexo:', resultado.error);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
    console.error('💥 Stack completo:', error.stack);
  }
}

// Executar teste
testarProdutoComplexo().catch(console.error);

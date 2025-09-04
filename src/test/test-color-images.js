/**
 * 🧪 Teste de produto com cores que têm imagens
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const ApiClient = require('../utils/apiClient');
const config = require('../config/api');
const logger = require('../utils/logger');

async function testarProdutoComCoresImagens() {
  console.log('🧪 Testando produto com cores que têm imagens...\n');
  
  const apiClient = new ApiClient(config);
  
  try {
    // Produto com cores que têm imagens
    const produtoComCoresImagens = {
      nome: `Produto Cores Imagens ${Date.now()}`,
      referencia: `CORES-IMG-${Date.now()}`,
      descricao: "Produto com cores que têm imagens",
      preco: 25.99,
      imagens: [],
      cores: [
        {
          nome: "Azul",
          tipo: "imagem",
          imagem: "https://www.spotgifts.com.br/fotos/opcionais/127_95942891861fd2ed30cc0a.png"
        },
        {
          nome: "Vermelho",
          tipo: "codigo",
          codigo: "#FF0000",
          codigoNumerico: "001"
        },
        {
          nome: "Verde",
          tipo: "hex",
          codigo: "#00FF00",
          codigoNumerico: "002"
        }
      ],
      categorias: ["Teste"],
      informacoes_adicionais: "Produto com cores mistas"
    };
    
    console.log('📤 Enviando produto com cores que têm imagens...');
    console.log('📋 Dados do produto:', JSON.stringify(produtoComCoresImagens, null, 2));
    
    const resultado = await apiClient.createProduct(produtoComCoresImagens);
    
    console.log('📋 Resultado completo:', JSON.stringify(resultado, null, 2));
    
    if (resultado.success) {
      console.log('✅ Produto com cores que têm imagens criado com sucesso!');
      console.log(`📋 ID do produto: ${resultado.productId}`);
    } else {
      console.log('❌ Erro ao criar produto com cores que têm imagens:', resultado.error);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
    console.error('💥 Stack completo:', error.stack);
  }
}

// Executar teste
testarProdutoComCoresImagens().catch(console.error);

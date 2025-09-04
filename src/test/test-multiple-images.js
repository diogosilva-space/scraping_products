const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

// Carrega variáveis de ambiente
require('dotenv').config();

async function testMultipleImages() {
  console.log('🧪 Testando envio de múltiplas imagens...\n');
  
  const apiClient = new ApiClient(config);
  
  try {
    // Produto de teste com múltiplas imagens
    const testProduct = {
      nome: 'Teste Múltiplas Imagens - ' + Date.now(),
      referencia: 'TEST-MULTIPLE-IMAGES-' + Date.now(),
      descricao: 'Produto para testar envio de múltiplas imagens',
      preco: 99.99,
      categorias: ['Teste'],
      cores: [
        {
          nome: 'Azul',
          tipo: 'codigo',
          codigo: '#0000FF'
        }
      ],
      imagens: [
        'https://picsum.photos/300/300?random=1',
        'https://picsum.photos/300/300?random=2'
      ]
    };
    
    console.log('📦 Produto de teste:', testProduct.nome);
    console.log('🔗 Referência:', testProduct.referencia);
    console.log('🖼️ Imagens:', testProduct.imagens.length);
    
    // Testa criação do produto
    console.log('\n🔄 Criando produto com múltiplas imagens...');
    const result = await apiClient.createProduct(testProduct);
    
    if (result.success) {
      console.log('✅ Produto criado com sucesso!');
      console.log('📊 Ação:', result.action || 'created');
      console.log('🆔 ID:', result.productId);
      console.log('🖼️ Imagens processadas:', testProduct.imagens.length);
    } else {
      console.log('❌ Erro ao criar produto:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executa o teste
testMultipleImages().catch(console.error);
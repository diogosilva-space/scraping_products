const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

async function testAllImages() {
  console.log('🧪 Testando envio de TODAS as imagens...\n');

  const apiClient = new ApiClient(config);
  
  // Produto com muitas imagens
  const product = {
    nome: 'Teste Todas as Imagens - ' + Date.now(),
    referencia: 'TEST-ALL-IMAGES-' + Date.now(),
    descricao: 'Produto de teste com múltiplas imagens para verificar se todas são enviadas',
    preco: 25.99,
    cores: [
      {
        nome: "Azul",
        tipo: "codigo",
        codigo: "#0000FF"
      },
      {
        nome: "Vermelho", 
        tipo: "codigo",
        codigo: "#FF0000"
      }
    ],
    categorias: ['Teste', 'Múltiplas Imagens'],
    imagens: [
      'https://picsum.photos/300/300?random=1',
      'https://picsum.photos/300/300?random=2', 
      'https://picsum.photos/300/300?random=3',
      'https://picsum.photos/300/300?random=4',
      'https://picsum.photos/300/300?random=5',
      'https://picsum.photos/300/300?random=6',
      'https://picsum.photos/300/300?random=7',
      'https://picsum.photos/300/300?random=8'
    ]
  };

  console.log(`📦 Produto de teste: ${product.nome}`);
  console.log(`🔗 Referência: ${product.referencia}`);
  console.log(`🖼️ Imagens: ${product.imagens.length}\n`);

  try {
    console.log('🔄 Criando produto com TODAS as imagens...');
    const result = await apiClient.createProduct(product);
    
    if (result.success) {
      console.log('✅ Produto criado com sucesso!');
      console.log(`📊 Ação: ${result.action}`);
      console.log(`🆔 ID: ${result.productId}`);
      console.log(`🖼️ Imagens processadas: ${product.imagens.length}`);
    } else {
      console.log('❌ Erro ao criar produto:');
      console.log(`   Erro: ${result.error}`);
      console.log(`   Detalhes: ${result.details}`);
    }
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testAllImages();

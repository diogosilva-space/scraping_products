const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

async function testBatchImages() {
  console.log('🧪 Testando estratégia de lotes de imagens...\n');

  const apiClient = new ApiClient(config);
  
  // Produto com muitas imagens para testar a estratégia
  const product = {
    nome: 'Teste Lotes de Imagens - ' + Date.now(),
    referencia: 'TEST-BATCH-IMAGES-' + Date.now(),
    descricao: 'Produto de teste com muitas imagens para verificar a estratégia de lotes',
    preco: 35.99,
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
      },
      {
        nome: "Verde",
        tipo: "codigo", 
        codigo: "#00FF00"
      }
    ],
    categorias: ['Teste', 'Lotes de Imagens'],
    imagens: [
      'https://picsum.photos/300/300?random=1',
      'https://picsum.photos/300/300?random=2', 
      'https://picsum.photos/300/300?random=3',
      'https://picsum.photos/300/300?random=4',
      'https://picsum.photos/300/300?random=5',
      'https://picsum.photos/300/300?random=6',
      'https://picsum.photos/300/300?random=7',
      'https://picsum.photos/300/300?random=8',
      'https://picsum.photos/300/300?random=9',
      'https://picsum.photos/300/300?random=10'
    ]
  };

  console.log(`📦 Produto de teste: ${product.nome}`);
  console.log(`🔗 Referência: ${product.referencia}`);
  console.log(`🖼️ Total de imagens: ${product.imagens.length}\n`);

  try {
    console.log('🔄 Criando produto com estratégia de lotes...');
    const result = await apiClient.createProduct(product);
    
    if (result.success) {
      console.log('✅ Produto criado com sucesso!');
      console.log(`📊 Ação: ${result.action || 'created'}`);
      console.log(`🆔 ID: ${result.productId}`);
      console.log(`🖼️ Total de imagens: ${result.totalImages}`);
      console.log(`🖼️ Imagens iniciais: ${result.initialImages}`);
      console.log(`🖼️ Imagens restantes: ${result.remainingImages}`);
    } else {
      console.log('❌ Erro ao criar produto:');
      console.log(`   Erro: ${result.error}`);
      console.log(`   Detalhes: ${result.details}`);
    }
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testBatchImages();


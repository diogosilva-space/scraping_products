const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

async function testOptimizedImages() {
  console.log('🧪 Testando estratégia otimizada de imagens...\n');

  const apiClient = new ApiClient(config);
  
  // Produto com muitas imagens para testar a nova estratégia
  const product = {
    nome: 'Teste Estratégia Otimizada - ' + Date.now(),
    referencia: 'TEST-OPTIMIZED-' + Date.now(),
    descricao: 'Produto de teste com muitas imagens para verificar a estratégia otimizada',
    preco: 45.99,
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
    categorias: ['Teste', 'Estratégia Otimizada'],
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
      'https://picsum.photos/300/300?random=10',
      'https://picsum.photos/300/300?random=11',
      'https://picsum.photos/300/300?random=12',
      'https://picsum.photos/300/300?random=13',
      'https://picsum.photos/300/300?random=14',
      'https://picsum.photos/300/300?random=15',
      'https://picsum.photos/300/300?random=16',
      'https://picsum.photos/300/300?random=17',
      'https://picsum.photos/300/300?random=18',
      'https://picsum.photos/300/300?random=19',
      'https://picsum.photos/300/300?random=20'
    ]
  };

  console.log(`📦 Produto de teste: ${product.nome}`);
  console.log(`🔗 Referência: ${product.referencia}`);
  console.log(`🖼️ Total de imagens: ${product.imagens.length}`);
  console.log(`📊 Estratégia: 5 imagens iniciais + lotes de 3 imagens\n`);

  try {
    console.log('🔄 Criando produto com estratégia otimizada...');
    const result = await apiClient.createProduct(product);
    
    if (result.success) {
      console.log('✅ Produto criado com sucesso!');
      console.log(`📊 Ação: ${result.action || 'created'}`);
      console.log(`🆔 ID: ${result.productId}`);
      console.log(`🖼️ Total de imagens: ${result.totalImages}`);
      console.log(`🖼️ Imagens iniciais: ${result.initialImages}`);
      console.log(`🖼️ Imagens restantes: ${result.remainingImages}`);
      
      // Calcular lotes necessários
      const lotesNecessarios = Math.ceil(result.remainingImages / 3);
      console.log(`📦 Lotes necessários para imagens restantes: ${lotesNecessarios}`);
    } else {
      console.log('❌ Erro ao criar produto:');
      console.log(`   Erro: ${result.error}`);
      console.log(`   Detalhes: ${result.details}`);
    }
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testOptimizedImages();




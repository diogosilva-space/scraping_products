const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

async function testColorImages() {
  console.log('🧪 Testando processamento de imagens das cores...\n');

  const apiClient = new ApiClient(config);
  
  // Produto com cores que têm imagens
  const product = {
    nome: 'Teste Imagens das Cores - ' + Date.now(),
    referencia: 'TEST-COLOR-IMAGES-' + Date.now(),
    descricao: 'Produto de teste com cores que têm imagens',
    preco: 35.99,
    cores: [
      {
        nome: "Azul",
        tipo: "imagem",
        imagem: "https://picsum.photos/100/100?random=1"
      },
      {
        nome: "Vermelho", 
        tipo: "imagem",
        imagem: "https://picsum.photos/100/100?random=2"
      },
      {
        nome: "Verde",
        tipo: "codigo", 
        codigo: "#00FF00"
      }
    ],
    categorias: ['Teste', 'Imagens das Cores'],
    imagens: [
      'https://picsum.photos/300/300?random=10',
      'https://picsum.photos/300/300?random=11'
    ]
  };

  console.log(`📦 Produto de teste: ${product.nome}`);
  console.log(`🔗 Referência: ${product.referencia}`);
  console.log(`🎨 Cores: ${product.cores.length}`);
  console.log(`🖼️ Imagens do produto: ${product.imagens.length}`);
  console.log(`🖼️ Imagens das cores: ${product.cores.filter(c => c.tipo === 'imagem').length}\n`);

  try {
    console.log('🔄 Criando produto com imagens das cores...');
    const result = await apiClient.createProduct(product);
    
    if (result.success) {
      console.log('✅ Produto criado com sucesso!');
      console.log(`📊 Ação: ${result.action || 'created'}`);
      console.log(`🆔 ID: ${result.productId}`);
      console.log(`🖼️ Total de imagens processadas: ${result.totalImages}`);
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

testColorImages();


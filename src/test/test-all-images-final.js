const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

async function testAllImagesFinal() {
  console.log('🧪 Testando envio de TODAS as imagens na criação inicial...\n');

  const apiClient = new ApiClient(config);
  
  // Produto com 20 imagens para testar
  const product = {
    nome: 'Teste Todas as Imagens - ' + Date.now(),
    referencia: 'TEST-ALL-FINAL-' + Date.now(),
    descricao: 'Produto de teste com 20 imagens para verificar se TODAS são enviadas na criação',
    preco: 55.99,
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
    categorias: ['Teste', 'Todas as Imagens'],
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
  console.log(`📊 Estratégia: TODAS as imagens em lotes de 5 na criação inicial\n`);

  try {
    console.log('🔄 Criando produto com TODAS as imagens...');
    const result = await apiClient.createProduct(product);
    
    if (result.success) {
      console.log('✅ Produto criado com sucesso!');
      console.log(`📊 Ação: ${result.action || 'created'}`);
      console.log(`🆔 ID: ${result.productId}`);
      console.log(`🖼️ Total de imagens processadas: ${result.totalImages}`);
      console.log(`📦 Lotes processados: ${result.batchesProcessed}`);
      
      // Verificar se todas as imagens foram processadas
      if (result.totalImages === product.imagens.length) {
        console.log('🎉 SUCESSO: TODAS as imagens foram processadas!');
      } else {
        console.log(`⚠️ ATENÇÃO: Apenas ${result.totalImages}/${product.imagens.length} imagens foram processadas`);
      }
    } else {
      console.log('❌ Erro ao criar produto:');
      console.log(`   Erro: ${result.error}`);
      console.log(`   Detalhes: ${result.details}`);
    }
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testAllImagesFinal();




const ApiClient = require('../utils/apiClient');
const logger = require('../utils/logger');
const Product = require('../models/Product');

async function testUpdateDebug() {
  logger.info('🧪 Testando UPDATE com debug detalhado - SP-94690');
  const apiClient = new ApiClient();

  const productRef = `SP-94690-TEST-COLORS`;
  const productData = {
    nome: 'Squeeze dobrável em PE com bico de sistema "push-pull" e acabamento metalizado 460 mL',
    referencia: productRef,
    descricao: 'Squeeze dobrável em PE com bico de sistema "push-pull" e acabamento metalizado. Contém uma tampa transparente e um mosquetão para fácil transporte. Capacidade até 460 mL. Certificação EU Food Grade. 110 x 218 x 64 mm',
    preco: 3.12,
    categorias: ['Garrafas'],
    cores: [
      {
        nome: 'Cromado satinado',
        tipo: 'imagem',
        imagem: 'https://www.spotgifts.com.br/fotos/opcionais/127_95942891861fd2ed30cc0a.png',
        codigoNumerico: '127'
      },
      {
        nome: 'Dourado satinado',
        tipo: 'imagem',
        imagem: 'https://www.spotgifts.com.br/fotos/opcionais/137_20406894755f298de1114fd.png',
        codigoNumerico: '137'
      }
    ],
    imagens: [
      'https://www.spotgifts.com.br/fotos/produtos/94690_137-logo_1.jpg',
      'https://www.spotgifts.com.br/fotos/produtos/94690_127_1.jpg'
    ]
  };

  const product = new Product(productData);

  logger.info(`📦 Produto de teste: ${product.nome}`);
  logger.info(`🔗 Referência: ${product.referencia}`);
  logger.info(`🎨 Cores: ${product.cores.length}`);
  product.cores.forEach((cor, index) => {
    logger.info(`  Cor ${index + 1}: ${cor.nome} (${cor.tipo})`);
    if (cor.tipo === 'imagem') {
      logger.info(`    Imagem: ${cor.imagem}`);
    }
  });

  // Primeiro, verificar se o produto existe
  logger.info('\n🔍 Verificando se produto existe...');
  const exists = await apiClient.checkProductExists(product.referencia);
  
  if (exists.exists) {
    logger.info(`✅ Produto encontrado - ID: ${exists.productId}`);
    logger.info('\n📋 Estado atual das cores:');
    exists.data.cores.forEach((cor, index) => {
      logger.info(`  Cor ${index + 1}: ${cor.nome}`);
      logger.info(`    Tipo: ${cor.tipo}`);
      logger.info(`    Imagem: ${cor.imagem || 'NENHUMA'}`);
    });
    
    // Agora tentar criar (mesmo que já exista) para testar imagens das cores
    logger.info('\n🔄 Criando produto com imagens das cores (mesmo que já exista)...');
    const result = await apiClient.createProduct(product);
    
    if (result.success) {
      logger.success('✅ Produto atualizado com sucesso!');
      
      // Verificar novamente após update
      logger.info('\n🔍 Verificando produto após update...');
      const updated = await apiClient.checkProductExists(product.referencia);
      
      if (updated.exists) {
        logger.info('\n📋 Estado das cores após update:');
        updated.data.cores.forEach((cor, index) => {
          logger.info(`  Cor ${index + 1}: ${cor.nome}`);
          logger.info(`    Tipo: ${cor.tipo}`);
          logger.info(`    Imagem: ${cor.imagem || 'NENHUMA'}`);
        });
      }
    } else {
      logger.error('❌ Erro ao atualizar produto:', result.error);
    }
  } else {
    logger.error('❌ Produto não encontrado para teste de update');
  }
}

testUpdateDebug().catch(error => {
  logger.error('❌ Erro durante o teste de update:', error);
});

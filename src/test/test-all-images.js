/**
 * Teste para verificar envio de TODAS as imagens do produto
 */

const APIClient = require('../utils/apiClient');
const Product = require('../models/Product');

async function testAllImages() {
  console.log('\n🧪 Testando envio de TODAS as imagens do produto\n');
  
  // Cria um produto de teste com MUITAS imagens (8 imagens)
  const testProduct = new Product({
    nome: 'Teste Envio Completo de Imagens',
    referencia: `TEST-ALL-IMAGES-${Date.now()}`,
    descricao: 'Produto de teste para verificar envio de todas as imagens',
    preco: 25.00,
    categorias: ['Teste'],
    cores: [
      {
        nome: 'Natural',
        tipo: 'codigo',
        codigo: '#F5F5DC',
        codigoNumerico: '160'
      }
    ],
    imagens: [
      'https://www.spotgifts.com.br/fotos/produtos/93640_160-b_1.jpg',
      'https://www.spotgifts.com.br/fotos/produtos/93640_160-a_1.jpg',
      'https://www.spotgifts.com.br/fotos/produtos/93640_160-b_2.jpg',
      'https://www.spotgifts.com.br/fotos/produtos/93640_160-a_2.jpg',
      'https://www.spotgifts.com.br/fotos/produtos/93640_160-b_3.jpg',
      'https://www.spotgifts.com.br/fotos/produtos/93640_160-a_3.jpg',
      'https://www.spotgifts.com.br/fotos/produtos/93640_160-b_4.jpg',
      'https://www.spotgifts.com.br/fotos/produtos/93640_160-a_4.jpg'
    ]
  });
  
  console.log('📦 Produto de teste:', testProduct.nome);
  console.log('🔗 Referência:', testProduct.referencia);
  console.log('🖼️ Total de imagens:', testProduct.imagens.length);
  console.log('');
  
  // Lista todas as imagens
  testProduct.imagens.forEach((img, idx) => {
    console.log(`  Imagem ${idx + 1}: ${img}`);
  });
  
  console.log('\n🔄 Criando produto com TODAS as imagens...\n');
  
  const apiClient = new APIClient();
  const result = await apiClient.createProduct(testProduct);
  
  console.log('\n✅ Resultado do envio:');
  console.log('📊 Sucesso:', result.success);
  console.log('🆔 ID:', result.productId);
  console.log('📸 Total de imagens enviadas:', result.totalImages);
  
  if (result.success) {
    console.log('\n🔍 Verificando produto na API...');
    
    const checkResult = await apiClient.checkProductExists(testProduct.referencia);
    
    if (checkResult.exists) {
      console.log('✅ Produto encontrado na API!');
      console.log('🆔 ID:', checkResult.productId);
      console.log('📸 Imagens no produto:', checkResult.product?.imagens?.length || 0);
      
      // Verificar quantas imagens realmente foram salvas
      if (checkResult.product?.imagens) {
        console.log('\n📋 Imagens salvas na API:');
        checkResult.product.imagens.forEach((img, idx) => {
          console.log(`  ${idx + 1}. ${img}`);
        });
        
        const expectedImages = testProduct.imagens.length;
        const actualImages = checkResult.product.imagens.length;
        
        if (actualImages === expectedImages) {
          console.log(`\n🎉 SUCESSO: Todas as ${expectedImages} imagens foram enviadas!`);
        } else {
          console.log(`\n❌ PROBLEMA: Esperado ${expectedImages} imagens, mas apenas ${actualImages} foram salvas!`);
        }
      }
    } else {
      console.log('❌ Produto não encontrado na API!');
    }
  } else {
    console.log('❌ Erro ao criar produto:', result.error);
  }
}

// Executa o teste
testAllImages().catch(console.error);

const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

// Carrega variáveis de ambiente
require('dotenv').config();

async function testDuplicateCheck() {
  console.log('🧪 Testando sistema de verificação de duplicatas...\n');
  
  const apiClient = new ApiClient(config);
  
  try {
    console.log('✅ Cliente configurado\n');
    
    // Produto de teste
    const testProduct = {
      nome: 'Teste Duplicata - ' + Date.now(),
      referencia: 'TEST-DUPLICATE-' + Date.now(),
      descricao: 'Produto para testar verificação de duplicatas',
      preco: 25.99,
      categorias: ['Teste'],
      cores: [
        {
          nome: 'Azul',
          tipo: 'codigo',
          codigo: '#0000FF'
        }
      ],
      imagens: ['https://picsum.photos/300/300?random=1']
    };
    
    console.log('📦 Produto de teste:', testProduct.nome);
    console.log('🔗 Referência:', testProduct.referencia);
    
    // Teste 1: Criar produto pela primeira vez
    console.log('\n🔄 Teste 1: Criando produto pela primeira vez...');
    const result1 = await apiClient.createProduct(testProduct);
    
    if (result1.success) {
      console.log('✅ Produto criado com sucesso!');
      console.log('📊 Ação:', result1.action || 'created');
      console.log('🆔 ID:', result1.productId);
    } else {
      console.log('❌ Erro ao criar produto:', result1.error);
      return;
    }
    
    // Aguarda um pouco
    console.log('\n⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Teste 2: Tentar criar o mesmo produto novamente
    console.log('\n🔄 Teste 2: Tentando criar o mesmo produto novamente...');
    const result2 = await apiClient.createProduct(testProduct);
    
    if (result2.success) {
      console.log('✅ Produto processado com sucesso!');
      console.log('📊 Ação:', result2.action || 'created');
      console.log('🆔 ID:', result2.productId);
      
      if (result2.action === 'updated') {
        console.log('🎉 SUCESSO: Sistema detectou duplicata e atualizou o produto!');
      } else {
        console.log('⚠️ ATENÇÃO: Sistema não detectou duplicata');
      }
    } else {
      console.log('❌ Erro ao processar produto:', result2.error);
    }
    
    // Teste 3: Verificar se produto existe
    console.log('\n🔄 Teste 3: Verificando se produto existe...');
    const existsCheck = await apiClient.checkProductExists(testProduct.referencia);
    
    if (existsCheck.exists) {
      console.log('✅ Produto encontrado!');
      console.log('🆔 ID:', existsCheck.productId);
    } else {
      console.log('❌ Produto não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executa o teste
testDuplicateCheck().catch(console.error);

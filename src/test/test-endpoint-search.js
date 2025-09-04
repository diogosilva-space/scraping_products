const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

// Carrega variáveis de ambiente
require('dotenv').config();

async function testEndpointSearch() {
  console.log('🧪 Testando endpoint de busca de produtos...\n');
  
  const apiClient = new ApiClient(config);
  
  try {
    // Autentica primeiro
    console.log('🔐 Autenticando...');
    await apiClient.authenticate();
    console.log('✅ Autenticado com sucesso\n');
    
    // Testa busca de produto existente
    const referenciaExistente = 'TEST-DUPLICATE-1757001549683';
    console.log(`🔍 Buscando produto existente: ${referenciaExistente}`);
    
    const result = await apiClient.checkProductExists(referenciaExistente);
    console.log('📊 Resultado:', result);
    
    if (result.exists) {
      console.log('✅ Produto encontrado!');
      console.log('🆔 ID:', result.productId);
      console.log('📝 Nome:', result.data?.nome);
    } else {
      console.log('❌ Produto não encontrado');
    }
    
    // Testa busca de produto inexistente
    const referenciaInexistente = 'PRODUTO-INEXISTENTE-123456';
    console.log(`\n🔍 Buscando produto inexistente: ${referenciaInexistente}`);
    
    const result2 = await apiClient.checkProductExists(referenciaInexistente);
    console.log('📊 Resultado:', result2);
    
    if (result2.exists) {
      console.log('❌ ERRO: Produto inexistente foi encontrado!');
    } else {
      console.log('✅ Correto: Produto inexistente não foi encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executa o teste
testEndpointSearch().catch(console.error);

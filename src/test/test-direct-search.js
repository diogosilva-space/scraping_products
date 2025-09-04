const ApiClient = require('../utils/apiClient');
const config = require('../config/api');

// Carrega variáveis de ambiente
require('dotenv').config();

async function testDirectSearch() {
  console.log('🧪 Testando busca direta de produtos...\n');
  
  const apiClient = new ApiClient(config);
  
  try {
    // Autentica primeiro
    console.log('🔐 Autenticando...');
    await apiClient.authenticate();
    console.log('✅ Autenticado com sucesso\n');
    
    // Testa busca direta usando axios
    const axios = require('axios');
    const referencia = 'TEST-DUPLICATE-1757001549683';
    
    console.log(`🔍 Buscando diretamente: ${referencia}`);
    console.log(`🔗 URL: ${apiClient.baseURL}/produto/${referencia}`);
    console.log(`🔑 Token: ${apiClient.accessToken.substring(0, 50)}...`);
    
    const response = await axios.get(`${apiClient.baseURL}/produto/${referencia}`, {
      headers: {
        'Authorization': `Bearer ${apiClient.accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Sucesso!');
    console.log('📊 Status:', response.status);
    console.log('🆔 ID:', response.data.id);
    console.log('📝 Nome:', response.data.nome);
    
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }
}

// Executa o teste
testDirectSearch().catch(console.error);

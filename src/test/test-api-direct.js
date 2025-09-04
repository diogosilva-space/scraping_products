/**
 * 🧪 Teste direto da API para descobrir o formato correto
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const axios = require('axios');
const FormData = require('form-data');

async function testarAPIDireta() {
  console.log('🧪 Testando API diretamente...\n');
  
  try {
    // Primeiro, vamos obter o token JWT
    console.log('🔐 Obtendo token JWT...');
    const authResponse = await axios.post('https://api.djob.com.br/wp-json/jwt-auth/v1/token', {
      username: process.env.DJOB_USERNAME,
      password: process.env.DJOB_PASSWORD
    });
    
    const token = authResponse.data.token;
    console.log('✅ Token obtido:', token.substring(0, 20) + '...');
    
    // Agora vamos tentar criar um produto com diferentes formatos
    const baseURL = 'https://api.djob.com.br/wp-json/api/v1';
    
    // Teste 1: Produto com cores como string
    console.log('\n📤 Teste 1: Cores como string');
    try {
      const formData1 = new FormData();
      formData1.append('nome', 'Teste API Direta 1');
      formData1.append('referencia', 'TEST-DIRECT-1-' + Date.now());
      formData1.append('descricao', 'Teste direto da API');
      formData1.append('preco', '10.50');
      formData1.append('cores', 'Azul');
      formData1.append('categorias[0]', 'Teste');
      
      const response1 = await axios.post(`${baseURL}/produto`, formData1, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData1.getHeaders()
        }
      });
      
      console.log('✅ Sucesso! ID:', response1.data.id);
    } catch (error) {
      console.log('❌ Erro:', error.response?.data || error.message);
    }
    
    // Teste 2: Produto com cores como array de objetos
    console.log('\n📤 Teste 2: Cores como array de objetos');
    try {
      const formData2 = new FormData();
      formData2.append('nome', 'Teste API Direta 2');
      formData2.append('referencia', 'TEST-DIRECT-2-' + Date.now());
      formData2.append('descricao', 'Teste direto da API');
      formData2.append('preco', '10.50');
      formData2.append('cores[0][nome]', 'Azul');
      formData2.append('cores[0][tipo]', 'codigo');
      formData2.append('cores[0][codigo]', '#0000FF');
      formData2.append('cores[1][nome]', 'Vermelho');
      formData2.append('cores[1][tipo]', 'codigo');
      formData2.append('cores[1][codigo]', '#FF0000');
      formData2.append('categorias[0]', 'Teste');
      
      const response2 = await axios.post(`${baseURL}/produto`, formData2, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData2.getHeaders()
        }
      });
      
      console.log('✅ Sucesso! ID:', response2.data.id);
    } catch (error) {
      console.log('❌ Erro:', error.response?.data || error.message);
    }
    
    // Teste 3: Produto com cores como JSON
    console.log('\n📤 Teste 3: Cores como JSON');
    try {
      const formData3 = new FormData();
      formData3.append('nome', 'Teste API Direta 3');
      formData3.append('referencia', 'TEST-DIRECT-3-' + Date.now());
      formData3.append('descricao', 'Teste direto da API');
      formData3.append('preco', '10.50');
      formData3.append('cores', JSON.stringify([{nome: 'Azul', tipo: 'codigo'}]));
      formData3.append('categorias[0]', 'Teste');
      
      const response3 = await axios.post(`${baseURL}/produto`, formData3, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData3.getHeaders()
        }
      });
      
      console.log('✅ Sucesso! ID:', response3.data.id);
    } catch (error) {
      console.log('❌ Erro:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error.message);
    console.error('💥 Stack:', error.stack);
  }
}

// Executar teste
testarAPIDireta().catch(console.error);

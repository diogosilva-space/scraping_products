#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 Teste Simples de Autenticação');
console.log('================================');

// Verifica variáveis de ambiente
console.log('📋 Configurações:');
console.log(`  Username: ${process.env.DJOB_USERNAME}`);
console.log(`  Password: ${process.env.DJOB_PASSWORD ? '***' : 'NÃO CONFIGURADO'}`);
console.log(`  Base URL: ${process.env.DJOB_API_BASE_URL || 'https://api.djob.com.br/wp-json/api/v1'}`);

// Testa conexão básica
console.log('\n🌐 Testando conexão...');

const baseURL = process.env.DJOB_API_BASE_URL || 'https://api.djob.com.br/wp-json/api/v1';

// Testa com fetch nativo
async function testConnection() {
  try {
    const response = await fetch(baseURL + '/documentacao');
    console.log(`✅ Conexão OK: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    console.log(`❌ Erro de conexão: ${error.message}`);
    return false;
  }
}

// Testa autenticação
async function testAuth() {
  try {
    console.log('\n🔐 Testando autenticação...');
    
    const authData = {
      user_email: process.env.DJOB_USERNAME,
      user_pass: process.env.DJOB_PASSWORD
    };
    
    console.log('📤 Enviando dados:', { ...authData, user_pass: '***' });
    
    const response = await fetch(baseURL + '/usuario/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ScrapingProducts/1.0.0'
      },
      body: JSON.stringify(authData)
    });
    
    console.log(`📥 Resposta: ${response.status} ${response.statusText}`);
    
    const data = await response.text();
    console.log('📄 Conteúdo da resposta:');
    console.log(data.substring(0, 500) + (data.length > 500 ? '...' : ''));
    
    if (response.ok) {
      console.log('✅ Autenticação bem-sucedida!');
      return true;
    } else {
      console.log('❌ Autenticação falhou');
      return false;
    }
    
  } catch (error) {
    console.log(`💥 Erro durante autenticação: ${error.message}`);
    return false;
  }
}

// Executa testes
async function runTests() {
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    await testAuth();
  }
  
  console.log('\n🏁 Teste concluído');
}

runTests();


#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 DIAGNÓSTICO COMPLETO DA API DJOB.COM.BR');
console.log('============================================');

const baseURL = process.env.DJOB_API_BASE_URL || 'https://api.djob.com.br/wp-json/api/v1';

// Função para testar endpoint
async function testEndpoint(method, endpoint, data = null, description = '') {
  try {
    console.log(`\n🔍 Testando: ${method} ${endpoint}`);
    if (description) console.log(`   📝 ${description}`);
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ScrapingProducts/1.0.0'
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(baseURL + endpoint, options);
    const responseText = await response.text();
    
    console.log(`   📥 Status: ${response.status} ${response.statusText}`);
    console.log(`   📄 Resposta: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
    
    if (response.ok) {
      console.log('   ✅ SUCESSO');
      return { success: true, data: responseText };
    } else {
      console.log('   ❌ FALHOU');
      return { success: false, status: response.status, data: responseText };
    }
    
  } catch (error) {
    console.log(`   💥 ERRO: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Função para testar com autenticação
async function testAuthenticatedEndpoint(method, endpoint, data = null, description = '') {
  try {
    console.log(`\n🔐 Testando com autenticação: ${method} ${endpoint}`);
    if (description) console.log(`   📝 ${description}`);
    
    // Primeiro faz login para obter sessão
    const loginResponse = await fetch(baseURL + '/usuario/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ScrapingProducts/1.0.0'
      },
      body: JSON.stringify({
        user_email: process.env.DJOB_USERNAME,
        user_pass: process.env.DJOB_PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      console.log('   ❌ Falha no login');
      return { success: false, error: 'Login falhou' };
    }
    
    // Extrai cookies da resposta de login
    const cookies = loginResponse.headers.get('set-cookie');
    console.log(`   🍪 Cookies obtidos: ${cookies ? 'SIM' : 'NÃO'}`);
    
    // Testa o endpoint com cookies de sessão
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ScrapingProducts/1.0.0'
      }
    };
    
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(baseURL + endpoint, options);
    const responseText = await response.text();
    
    console.log(`   📥 Status: ${response.status} ${response.statusText}`);
    console.log(`   📄 Resposta: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
    
    if (response.ok) {
      console.log('   ✅ SUCESSO');
      return { success: true, data: responseText };
    } else {
      console.log('   ❌ FALHOU');
      return { success: false, status: response.status, data: responseText };
    }
    
  } catch (error) {
    console.log(`   💥 ERRO: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Executa todos os testes
async function runDiagnostic() {
  console.log('📋 Configurações:');
  console.log(`   Username: ${process.env.DJOB_USERNAME}`);
  console.log(`   Password: ${process.env.DJOB_PASSWORD ? '***' : 'NÃO CONFIGURADO'}`);
  console.log(`   Base URL: ${baseURL}`);
  
  console.log('\n🚀 INICIANDO DIAGNÓSTICO...\n');
  
  // Teste 1: Documentação (sem autenticação)
  await testEndpoint('GET', '/documentacao', null, 'Documentação da API');
  
  // Teste 2: Login (sem autenticação)
  await testEndpoint('POST', '/usuario/login', {
    user_email: process.env.DJOB_USERNAME,
    user_pass: process.env.DJOB_PASSWORD
  }, 'Login de usuário');
  
  // Teste 3: Listar produtos (sem autenticação)
  await testEndpoint('GET', '/produtos', null, 'Listar produtos (público)');
  
  // Teste 4: Listar produtos com autenticação
  await testAuthenticatedEndpoint('GET', '/produtos', null, 'Listar produtos (autenticado)');
  
  // Teste 5: Estatísticas com autenticação
  await testAuthenticatedEndpoint('GET', '/estatisticas?tipo=geral&periodo=7dias', null, 'Estatísticas gerais');
  
  // Teste 6: Criar produto (deve falhar sem dados válidos, mas testa o endpoint)
  await testAuthenticatedEndpoint('POST', '/produto', {
    referencia: 'TEST-DIAG-' + Date.now(),
    nome: 'Produto de Diagnóstico',
    descricao: 'Produto para teste de diagnóstico da API',
    preco: 99.99,
    categorias: 'Teste'
  }, 'Criar produto (teste)');
  
  // Teste 7: Perfil do usuário
  await testAuthenticatedEndpoint('GET', '/usuario', null, 'Perfil do usuário logado');
  
  console.log('\n🏁 DIAGNÓSTICO CONCLUÍDO!');
  console.log('\n📊 RESUMO:');
  console.log('   ✅ Endpoints que funcionam');
  console.log('   ❌ Endpoints que falham');
  console.log('   🔧 Ajustes necessários na API');
}

runDiagnostic().catch(console.error);


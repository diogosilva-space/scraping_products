const ApiClient = require('../utils/apiClient');
const logger = require('../utils/logger');

async function testColorImagesSP94690() {
  console.log('🧪 Testando upload de imagens das cores - SP-94690');
  
  const apiClient = new ApiClient();
  
  // Produto de teste baseado no SP-94690
  const product = {
    nome: 'Squeeze dobrável em PE com bico de sistema "push-pull" e acabamento metalizado 460 mL',
    referencia: 'SP-94690-TEST-COLORS',
    descricao: 'Squeeze dobrável em PE com bico de sistema "push-pull" e acabamento metalizado. Contém uma tampa transparente e um mosquetão para fácil transporte. Capacidade até 460 mL. Certificação EU Food Grade. 110 x 218 x 64 mm',
    preco: 3.12,
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
    ],
    categorias: ['Garrafas'],
    informacoes_adicionais: ''
  };

  try {
    console.log('📦 Produto de teste:', product.nome);
    console.log('🔗 Referência:', product.referencia);
    console.log('🎨 Cores:', product.cores.length);
    product.cores.forEach((cor, index) => {
      console.log(`  Cor ${index + 1}: ${cor.nome} (${cor.tipo})`);
      if (cor.tipo === 'imagem') {
        console.log(`    Imagem: ${cor.imagem}`);
      }
    });
    console.log('🖼️ Imagens do produto:', product.imagens.length);

    console.log('\n🔄 Criando/atualizando produto com imagens das cores...');
    
    const result = await apiClient.createProduct(product);
    
    if (result.success) {
      console.log('✅ Produto processado com sucesso!');
      console.log('📊 Ação:', result.action);
      console.log('🆔 ID:', result.productId);
      
      // Verificar se as imagens das cores foram enviadas corretamente
      console.log('\n🔍 Verificando produto na API...');
      const checkResult = await apiClient.checkProductExists(product.referencia);
      
      if (checkResult.exists) {
        console.log('✅ Produto encontrado na API!');
        console.log('🆔 ID:', checkResult.productId);
        
        // Fazer uma requisição direta para verificar as cores
        const response = await apiClient.client.get(`/produto/${product.referencia}`, {
          headers: {
            'Authorization': `Bearer ${apiClient.accessToken}`,
            'Accept': 'application/json'
          }
        });
        
        console.log('\n📋 Dados do produto na API:');
        console.log('🎨 Cores:', response.data.cores.length);
        response.data.cores.forEach((cor, index) => {
          console.log(`  Cor ${index + 1}: ${cor.nome}`);
          console.log(`    Tipo: ${cor.tipo}`);
          console.log(`    Imagem: ${cor.imagem || 'NENHUMA'}`);
          console.log(`    Código: ${cor.codigo || 'NENHUM'}`);
          console.log(`    Código Numérico: ${cor.codigoNumerico}`);
        });
        
        // Verificar se as imagens das cores foram enviadas
        const coresComImagem = response.data.cores.filter(cor => cor.tipo === 'imagem' && cor.imagem);
        console.log(`\n✅ Cores com imagem enviada: ${coresComImagem.length}/${response.data.cores.length}`);
        
        if (coresComImagem.length === response.data.cores.length) {
          console.log('🎉 SUCESSO: Todas as imagens das cores foram enviadas corretamente!');
        } else {
          console.log('❌ PROBLEMA: Nem todas as imagens das cores foram enviadas!');
        }
        
      } else {
        console.log('❌ Produto não encontrado na API');
      }
      
    } else {
      console.log('❌ Erro ao processar produto:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testColorImagesSP94690();

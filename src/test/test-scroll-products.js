/**
 * Teste para verificar quantos produtos são encontrados após rolagem
 */

const SpotGiftsScraper = require('../scrapers/spotgifts');
const logger = require('../utils/logger');

async function testScroll() {
  console.log('\n🧪 Testando rolagem e extração de produtos\n');
  
  const scraper = new SpotGiftsScraper();
  
  try {
    // Inicializa o scraper
    await scraper.initialize();
    
    // Navega para o catálogo
    await scraper.navigateToCatalog();
    
    console.log('\n📊 Contando produtos ANTES da rolagem...');
    const beforeScroll = await scraper.countVisibleProducts();
    console.log(`✅ Produtos visíveis ANTES: ${beforeScroll}`);
    
    // Rola a página
    console.log('\n🔄 Iniciando rolagem...');
    await scraper.scrollToLoadAllProducts();
    
    console.log('\n📊 Contando produtos DEPOIS da rolagem...');
    const afterScroll = await scraper.countVisibleProducts();
    console.log(`✅ Produtos visíveis DEPOIS: ${afterScroll}`);
    
    // Extrai links
    console.log('\n🔗 Extraindo links dos produtos...');
    const links = await scraper.extractProductLinks();
    console.log(`✅ Total de links extraídos: ${links.length}`);
    
    // Mostra os primeiros 5 links
    console.log('\n📋 Primeiros 5 links:');
    links.slice(0, 5).forEach((link, idx) => {
      console.log(`  ${idx + 1}. ${link.href}`);
    });
    
    if (links.length > 5) {
      console.log('\n📋 Últimos 5 links:');
      links.slice(-5).forEach((link, idx) => {
        console.log(`  ${links.length - 4 + idx}. ${link.href}`);
      });
    }
    
    // Fecha o browser
    await scraper.cleanup();
    
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    await scraper.cleanup();
  }
}

testScroll().catch(console.error);


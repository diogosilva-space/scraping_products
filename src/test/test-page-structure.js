/**
 * Teste para analisar a estrutura da página e entender o carregamento
 */

const SpotGiftsScraper = require('../scrapers/spotgifts');

async function testPageStructure() {
  console.log('\n🧪 Analisando estrutura da página\n');
  
  const scraper = new SpotGiftsScraper();
  
  try {
    await scraper.initialize();
    await scraper.navigateToCatalog();
    
    // Aguarda um pouco para garantir que a página carregou
    await scraper.browserManager.wait(3000);
    
    console.log('\n📋 Analisando estrutura da página...\n');
    
    const pageInfo = await scraper.browserManager.evaluate(() => {
      return {
        // Conta produtos
        productCount: document.querySelectorAll('.produto.fav-container').length,
        
        // Verifica se há botão "carregar mais"
        loadMoreButton: !!document.querySelector('.load-more, .btn-load-more, .ver-mais, [class*="load"]'),
        loadMoreText: document.querySelector('.load-more, .btn-load-more, .ver-mais, [class*="load"]')?.textContent,
        
        // Verifica paginação
        hasPagination: !!document.querySelector('.pagination, .paginacao, .pages'),
        paginationHTML: document.querySelector('.pagination, .paginacao, .pages')?.outerHTML,
        
        // Verifica links de próxima página
        nextPageLink: document.querySelector('.next, .proximo, .pagination a[rel="next"]')?.href,
        
        // Informações sobre total de produtos
        totalInfo: document.querySelector('.total, .count, .resultado')?.textContent,
        
        // Classes CSS na página
        bodyClasses: document.body.className,
        
        // Scripts que podem controlar carregamento
        hasInfiniteScroll: !!window.InfiniteScroll || 
                          Array.from(document.scripts).some(s => 
                            s.src.includes('infinite') || 
                            s.src.includes('lazy') || 
                            s.textContent.includes('infinite')
                          ),
        
        // Altura da página
        pageHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        
        // Última posição de scroll
        scrollPosition: window.scrollY
      };
    });
    
    console.log('📊 Informações da página:');
    console.log('  Produtos visíveis:', pageInfo.productCount);
    console.log('  Altura da página:', pageInfo.pageHeight);
    console.log('  Altura do viewport:', pageInfo.viewportHeight);
    console.log('  Posição de scroll:', pageInfo.scrollPosition);
    console.log('');
    console.log('🔘 Botões e controles:');
    console.log('  Botão "Carregar Mais":', pageInfo.loadMoreButton ? 'SIM' : 'NÃO');
    if (pageInfo.loadMoreText) {
      console.log('  Texto do botão:', pageInfo.loadMoreText.trim());
    }
    console.log('  Paginação:', pageInfo.hasPagination ? 'SIM' : 'NÃO');
    if (pageInfo.paginationHTML) {
      console.log('  HTML da paginação:', pageInfo.paginationHTML.substring(0, 200));
    }
    if (pageInfo.nextPageLink) {
      console.log('  Link próxima página:', pageInfo.nextPageLink);
    }
    console.log('');
    console.log('📝 Outras informações:');
    console.log('  Total de produtos (texto):', pageInfo.totalInfo || 'Não encontrado');
    console.log('  Infinite Scroll:', pageInfo.hasInfiniteScroll ? 'SIM' : 'NÃO');
    console.log('  Classes do body:', pageInfo.bodyClasses);
    
    // Tira um screenshot
    console.log('\n📸 Tirando screenshot da página...');
    await scraper.browserManager.page.screenshot({ 
      path: 'test-page-structure.png',
      fullPage: true 
    });
    console.log('✅ Screenshot salvo: test-page-structure.png');
    
    await scraper.cleanup();
    console.log('\n✅ Análise concluída!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error);
    await scraper.cleanup();
  }
}

testPageStructure().catch(console.error);


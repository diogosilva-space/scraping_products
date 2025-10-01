/**
 * Teste para verificar infinite scroll e carregamento dinâmico
 */

const SpotGiftsScraper = require('../scrapers/spotgifts');

async function testInfiniteScroll() {
  console.log('\n🧪 Testando infinite scroll e carregamento dinâmico\n');
  
  const scraper = new SpotGiftsScraper();
  
  try {
    await scraper.initialize();
    await scraper.navigateToCatalog();
    await scraper.browserManager.wait(2000);
    
    console.log('📊 Produtos iniciais:', await scraper.countVisibleProducts());
    
    // Tenta rolar de forma mais agressiva
    console.log('\n🔄 Rolando até o final da página...');
    await scraper.browserManager.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await scraper.browserManager.wait(3000);
    console.log('📊 Produtos após 1ª rolagem:', await scraper.countVisibleProducts());
    
    // Tenta clicar em elementos que possam carregar mais
    console.log('\n🔍 Procurando por botões ou triggers...');
    
    const triggers = await scraper.browserManager.evaluate(() => {
      // Procura por qualquer elemento clicável que possa carregar mais
      const possibleTriggers = [];
      
      // Procura botões
      document.querySelectorAll('button, a, .btn, [role="button"]').forEach(el => {
        const text = el.textContent?.toLowerCase() || '';
        const classes = el.className?.toLowerCase() || '';
        const id = el.id?.toLowerCase() || '';
        
        if (text.includes('mais') || text.includes('more') || text.includes('carregar') ||
            text.includes('load') || text.includes('ver') || text.includes('show') ||
            classes.includes('more') || classes.includes('load') || classes.includes('page') ||
            id.includes('more') || id.includes('load')) {
          possibleTriggers.push({
            tag: el.tagName,
            text: text.substring(0, 50),
            classes: classes.substring(0, 100),
            id: id,
            visible: el.offsetWidth > 0 && el.offsetHeight > 0
          });
        }
      });
      
      // Verifica se há algum trigger de scroll
      const scrollTrigger = document.querySelector('[data-scroll-trigger], [data-infinite-scroll]');
      if (scrollTrigger) {
        possibleTriggers.push({
          tag: scrollTrigger.tagName,
          text: 'Scroll Trigger Element',
          classes: scrollTrigger.className,
          id: scrollTrigger.id,
          visible: scrollTrigger.offsetWidth > 0 && scrollTrigger.offsetHeight > 0
        });
      }
      
      return possibleTriggers;
    });
    
    console.log(`✅ Encontrados ${triggers.length} possíveis triggers:`);
    triggers.forEach((t, idx) => {
      console.log(`  ${idx + 1}. <${t.tag}> "${t.text}" (visible: ${t.visible})`);
      if (t.classes) console.log(`     Classes: ${t.classes}`);
    });
    
    // Verifica se há mais páginas no HTML
    console.log('\n🔍 Verificando estrutura de paginação no DOM...');
    const paginationInfo = await scraper.browserManager.evaluate(() => {
      // Procura por informações de paginação escondidas
      const dataElements = document.querySelectorAll('[data-page], [data-total-pages], [data-current-page]');
      const info = {};
      
      dataElements.forEach(el => {
        if (el.dataset.page) info.currentPage = el.dataset.page;
        if (el.dataset.totalPages) info.totalPages = el.dataset.totalPages;
        if (el.dataset.currentPage) info.currentPage = el.dataset.currentPage;
      });
      
      // Procura por scripts com dados de paginação
      const scripts = Array.from(document.scripts);
      scripts.forEach(script => {
        const content = script.textContent || '';
        
        // Procura por variáveis de paginação
        const pageMatch = content.match(/currentPage\s*[:=]\s*(\d+)/i);
        const totalMatch = content.match(/totalPages\s*[:=]\s*(\d+)/i);
        const perPageMatch = content.match(/perPage\s*[:=]\s*(\d+)/i);
        const totalItemsMatch = content.match(/totalItems\s*[:=]\s*(\d+)/i);
        
        if (pageMatch) info.currentPageScript = parseInt(pageMatch[1]);
        if (totalMatch) info.totalPagesScript = parseInt(totalMatch[1]);
        if (perPageMatch) info.perPage = parseInt(perPageMatch[1]);
        if (totalItemsMatch) info.totalItems = parseInt(totalItemsMatch[1]);
      });
      
      return info;
    });
    
    console.log('📋 Informações de paginação:');
    console.log(JSON.stringify(paginationInfo, null, 2));
    
    await scraper.cleanup();
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error);
    await scraper.cleanup();
  }
}

testInfiniteScroll().catch(console.error);


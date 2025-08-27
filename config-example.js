/**
 * EXEMPLO DE CONFIGURAÇÃO PARA NOVOS SITES
 * 
 * Este arquivo mostra como configurar um novo site para scraping.
 * Copie este arquivo para src/config/ e personalize conforme necessário.
 */

module.exports = {
  // Informações básicas do site
  name: 'Nome do Site',
  baseUrl: 'https://www.exemplo.com',
  catalogUrl: 'https://www.exemplo.com/catalogo/',
  
  // Seletores para navegação e produtos
  selectors: {
    // Container principal dos produtos
    productGrid: '.product-grid, .products-grid, .catalog-grid',
    
    // Item individual de produto
    productCard: '.product-item, .product-card, .catalog-item',
    
    // Botão para carregar mais produtos (se aplicável)
    loadMoreButton: '.load-more, .show-more, .pagination-next',
    
    // Links para páginas individuais dos produtos
    productLinks: 'a[href*="/produto"], a[href*="/product"], .product-link',
    
    // Informações dos produtos na listagem
    productName: '.product-name, .product-title, h2, h3',
    productReference: '.product-reference, .product-code, .reference',
    productPrice: '.product-price, .price, .valor',
    productImage: '.product-image img, .product-img img',
    
    // Página individual do produto
    productPage: {
      name: 'h1, .product-name, .product-title',
      reference: '.product-reference, .product-code, .reference, .sku',
      description: '.product-description, .description, .product-details',
      colors: '.product-colors, .colors, .color-options',
      images: '.product-images img, .product-gallery img, .gallery img',
      categories: '.breadcrumb, .product-categories, .category',
      additionalInfo: '.product-info, .product-specs, .specifications',
      price: '.product-price, .price, .current-price'
    }
  },
  
  // Configurações de rolagem (para sites com carregamento lazy)
  scroll: {
    delay: 1500,           // Delay entre rolagens (ms)
    maxScrolls: 100,        // Máximo de tentativas de rolagem
    scrollStep: 800,        // Pixels para rolar a cada vez
    waitForNewContent: 2000 // Tempo para aguardar novo conteúdo (ms)
  },
  
  // Configurações de extração
  extraction: {
    delayBetweenProducts: 1000, // Delay entre extrações de produtos (ms)
    maxRetries: 3,              // Máximo de tentativas por produto
    timeout: 30000,             // Timeout para cada operação (ms)
    waitForImages: true         // Aguardar carregamento de imagens
  },
  
  // Mapeamento de campos para extração
  fieldMapping: {
    referencia: {
      selectors: ['.product-reference', '.product-code', '.reference', '.sku'],
      extract: 'text',      // Tipo de extração: 'text', 'src', 'href', 'array', 'price'
      required: true        // Campo obrigatório
    },
    nome: {
      selectors: ['h1', '.product-name', '.product-title'],
      extract: 'text',
      required: true
    },
    descricao: {
      selectors: ['.product-description', '.description', '.product-details'],
      extract: 'text',
      required: true
    },
    cores: {
      selectors: ['.product-colors', '.colors', '.color-options'],
      extract: 'array',     // Para arrays (cores, categorias, etc.)
      required: true
    },
    imagens: {
      selectors: ['.product-images img', '.product-gallery img', '.gallery img'],
      extract: 'src',       // Para URLs de imagens
      required: true
    },
    categorias: {
      selectors: ['.breadcrumb', '.product-categories', '.category'],
      extract: 'array',
      required: false       // Campo opcional
    },
    informacoes_adicionais: {
      selectors: ['.product-info', '.product-specs', '.specifications'],
      extract: 'text',
      required: false
    },
    preco: {
      selectors: ['.product-price', '.price', '.current-price'],
      extract: 'price',     // Para valores numéricos
      required: false
    }
  },
  
  // Configurações de login (se necessário)
  login: {
    required: false,        // Se o site requer login
    url: 'https://www.exemplo.com/login',
    selectors: {
      email: '#email, input[name="email"], input[type="email"]',
      password: '#password, input[name="password"], input[type="password"]',
      submit: 'button[type="submit"], .login-button, .btn-login'
    },
    credentials: {
      email: process.env.SITE_EMAIL,      // Variável de ambiente
      password: process.env.SITE_PASSWORD // Variável de ambiente
    }
  },
  
  // Configurações de filtros (se aplicável)
  filters: {
    enabled: false,         // Se o site tem filtros
    selectors: {
      categoryFilter: '.category-filter, .filter-category',
      priceFilter: '.price-filter, .filter-price',
      colorFilter: '.color-filter, .filter-color'
    }
  },
  
  // Configurações de performance
  performance: {
    disableImages: true,    // Desabilitar carregamento de imagens para performance
    disableCSS: true,       // Desabilitar CSS para performance
    disableFonts: true,     // Desabilitar fontes para performance
    maxConcurrentRequests: 1 // Máximo de requisições simultâneas
  },
  
  // Configurações de retry
  retry: {
    maxAttempts: 3,         // Máximo de tentativas
    delay: 2000,            // Delay entre tentativas (ms)
    backoffMultiplier: 2    // Multiplicador para backoff exponencial
  },
  
  // Configurações de validação
  validation: {
    minProductCount: 10,    // Mínimo de produtos esperados
    maxProductCount: 10000, // Máximo de produtos esperados
    requiredFields: ['referencia', 'nome', 'descricao', 'cores', 'imagens']
  },
  
  // Configurações de identificação
  identification: {
    referencePrefix: 'SITE-',    // Prefixo para referências (ex: SITE-12345)
    siteCode: 'SITE'            // Código único do site
  },
  
  // Configurações específicas do site
  siteSpecific: {
    // Comportamentos específicos do site
    useInfiniteScroll: true,    // Se usa rolagem infinita
    lazyLoading: true,          // Se usa carregamento lazy
    dynamicContent: true,       // Se o conteúdo é carregado dinamicamente
    
    // Seletores específicos para este site
    specificSelectors: {
      // Pode ser necessário ajustar baseado na análise do site
      productContainer: '.product, .item, .catalog-item',
      imageContainer: '.image-container, .img-wrapper, .photo-container'
    },
    
    // Funções personalizadas (se necessário)
    customExtractors: {
      // Exemplo de extrator personalizado para cores
      extractColors: async (page) => {
        // Implementação personalizada para extrair cores
        return await page.evaluate(() => {
          // Lógica específica para este site
          const colorElements = document.querySelectorAll('.custom-color-selector');
          return Array.from(colorElements).map(el => el.textContent?.trim()).filter(Boolean);
        });
      }
    }
  }
};

/**
 * INSTRUÇÕES PARA CONFIGURAÇÃO:
 * 
 * 1. Copie este arquivo para src/config/ com um nome descritivo
 * 2. Ajuste as URLs e seletores conforme o site
 * 3. Use o comando "npm run analyze" para analisar o site
 * 4. Ajuste os seletores baseado nas recomendações da análise
 * 5. Teste com um pequeno número de produtos primeiro
 * 6. Ajuste delays e timeouts conforme necessário
 * 
 * DICAS IMPORTANTES:
 * 
 * - Sempre teste os seletores no console do navegador primeiro
 * - Use seletores CSS específicos quando possível
 * - Considere o tempo de carregamento do site
 * - Respeite os termos de uso e robots.txt
 * - Use delays apropriados para não sobrecarregar o servidor
 * 
 * EXEMPLO DE USO:
 * 
 * const config = require('./config/exemplo');
 * const Scraper = require('./scrapers/BaseScraper');
 * 
 * const scraper = new Scraper(config);
 * await scraper.run();
 */

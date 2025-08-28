/**
 * Configuração para scraping do Spot Gifts
 * https://www.spotgifts.com.br/pt/catalogo/
 */

module.exports = {
  name: 'Spot Gifts',
  baseUrl: 'https://www.spotgifts.com.br',
  catalogUrl: 'https://www.spotgifts.com.br/pt/catalogo/',
  
  // Seletores para navegação
  selectors: {
    // Elementos de paginação/rolagem
    productGrid: '#produtos-wrap',
    productCard: '.produto, [class*="produto"]',
    loadMoreButton: '.load-more, .show-more, [class*="load-more"]',
    
    // Links dos produtos
    productLinks: '.produto, [class*="produto"]',
    
    // Informações dos produtos na listagem
    productName: '.produto-title, .title, [class*="title"], .produto h3, .produto h4',
    productReference: '.produto-ref, .reference, [class*="ref"], [class*="reference"]',
    productPrice: '.produto-price, .price, [class*="price"], .produto .price',
    productImage: 'img[src*="produto"], img[src*="product"], .produto img',
    
    // Página do produto
    productPage: {
      name: 'h1.titulo, h1, .titulo, [class*="title"]',
      reference: '.ref, [class*="ref"]',
      description: '.texto, .produto-description, .description, [class*="description"], .produto-details',
      colors: '.color',
      images: '.img-wrap.center > span > span > img',
      categories: '.breadcrumb, .produto-categories, .category, [class*="category"]',
      additionalInfo: '.produto-info, .produto-specs, .specifications, [class*="info"]',
      price: '.produto-price, .price, .current-price, [class*="price"]'
    }
  },
  
  // Configurações de rolagem
  scroll: {
    delay: 1500,
    maxScrolls: 100,
    scrollStep: 1000,
    waitForNewContent: 2000
  },
  
  // Configurações de extração
  extraction: {
    delayBetweenProducts: 1000,
    maxRetries: 3,
    timeout: 30000,
    waitForImages: true
  },
  
  // Mapeamento de campos
  fieldMapping: {
    referencia: {
      selectors: ['.ref', '[class*="ref"]'],
      extract: 'text',
      required: true
    },
    nome: {
      selectors: ['h1.titulo', 'h1', '.titulo', '[class*="title"]'],
      extract: 'text',
      required: true
    },
    descricao: {
      selectors: ['.texto', '.produto-description', '.description', '[class*="description"]', '.produto-details'],
      extract: 'text',
      required: true
    },
    cores: {
      selectors: ['.color'],
      extract: 'color',
      required: true
    },
    imagens: {
      selectors: ['.img-wrap.center > span > span > img'],
      extract: 'src',
      required: true
    },
    categorias: {
      selectors: ['.breadcrumb', '.produto-categories', '.category', '[class*="category"]'],
      extract: 'array',
      required: false
    },
    informacoes_adicionais: {
      selectors: ['.conteudo .caracteristica'],
      extract: 'text',
      required: false
    },
    preco: {
      selectors: ['.produto-price', '.price', '.current-price', '[class*="price"]'],
      extract: 'price',
      required: false
    }
  },
  
  // Configurações de login (se necessário)
  login: {
    required: false,
    url: 'https://www.spotgifts.com.br/pt/login',
    selectors: {
      email: '#email, input[name="email"], input[type="email"]',
      password: '#password, input[name="password"], input[type="password"]',
      submit: 'button[type="submit"], .login-button, .btn-login'
    },
    credentials: {
      email: process.env.SPOTGIFTS_EMAIL,
      password: process.env.SPOTGIFTS_PASSWORD
    }
  },
  
  // Configurações de filtros (se necessário)
  filters: {
    enabled: false,
    selectors: {
      categoryFilter: '.category-filter, .filter-category',
      priceFilter: '.price-filter, .filter-price',
      colorFilter: '.color-filter, .filter-color'
    }
  },
  
  // Configurações de performance
  performance: {
    disableImages: true,
    disableCSS: true,
    disableFonts: true,
    maxConcurrentRequests: 1
  },
  
  // Configurações de retry
  retry: {
    maxAttempts: 3,
    delay: 2000,
    backoffMultiplier: 2
  },
  
  // Configurações de validação
  validation: {
    minProductCount: 10,
    maxProductCount: 10000,
    requiredFields: ['referencia', 'nome', 'descricao', 'cores', 'imagens']
  },
  
  // Configurações de identificação
  identification: {
    referencePrefix: 'SP-',
    siteCode: 'SPOT'
  }
};

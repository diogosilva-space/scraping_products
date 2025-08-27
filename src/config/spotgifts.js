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
    productGrid: '.product-grid, .products-grid, [class*="product"]',
    productCard: '.product-item, .product-card, [class*="product-item"]',
    loadMoreButton: '.load-more, .show-more, [class*="load-more"]',
    
    // Links dos produtos
    productLinks: 'a[href*="/produto"], a[href*="/product"], .product-link',
    
    // Informações dos produtos na listagem
    productName: '.product-name, .product-title, h2, h3, h4',
    productReference: '.product-reference, .product-code, .reference',
    productPrice: '.product-price, .price, [class*="price"]',
    productImage: '.product-image img, .product-img img, img[src*="product"]',
    
    // Página do produto
    productPage: {
      name: 'h1, .product-name, .product-title',
      reference: '.product-reference, .product-code, .reference, .sku',
      description: '.product-description, .description, .product-details',
      colors: '.product-colors, .colors, .color-options, .color-selector',
      images: '.product-images img, .product-gallery img, .gallery img',
      categories: '.breadcrumb, .product-categories, .category',
      additionalInfo: '.product-info, .product-specs, .specifications',
      price: '.product-price, .price, .current-price'
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
      selectors: ['.product-reference', '.product-code', '.reference', '.sku'],
      extract: 'text',
      required: true
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
      extract: 'array',
      required: true
    },
    imagens: {
      selectors: ['.product-images img', '.product-gallery img', '.gallery img'],
      extract: 'src',
      required: true
    },
    categorias: {
      selectors: ['.breadcrumb', '.product-categories', '.category'],
      extract: 'array',
      required: false
    },
    informacoes_adicionais: {
      selectors: ['.product-info', '.product-specs', '.specifications'],
      extract: 'text',
      required: false
    },
    preco: {
      selectors: ['.product-price', '.price', '.current-price'],
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

/**
 * Configuração para scraping do XBZ Brindes
 * https://www.xbzbrindes.com.br/
 */

module.exports = {
  name: 'XBZ Brindes',
  baseUrl: 'https://www.xbzbrindes.com.br',
  catalogUrl: 'https://www.xbzbrindes.com.br/',
  
  // Seletores para navegação
  selectors: {
    // Elementos de paginação/rolagem
    productGrid: '.product-grid, .products-grid, .catalog-grid, [class*="product"]',
    productCard: '.product-item, .product-card, .catalog-item, [class*="product-item"]',
    loadMoreButton: '.load-more, .show-more, .pagination-next, [class*="load-more"]',
    
    // Links dos produtos
    productLinks: 'a[href*="/produto"], a[href*="/product"], a[href*="/item"], .product-link',
    
    // Informações dos produtos na listagem
    productName: '.product-name, .product-title, .item-name, h2, h3, h4',
    productReference: '.product-reference, .product-code, .reference, .sku, .item-code',
    productPrice: '.product-price, .price, .item-price, [class*="price"]',
    productImage: '.product-image img, .product-img img, .item-image img, img[src*="product"]',
    
    // Página do produto
    productPage: {
      name: 'h1, .product-name, .product-title, .item-name',
      reference: '.product-reference, .product-code, .reference, .sku, .item-code',
      description: '.product-description, .description, .product-details, .item-description',
      colors: '.product-colors, .colors, .color-options, .color-selector, .item-colors',
      images: '.product-images img, .product-gallery img, .gallery img, .item-images img',
      categories: '.breadcrumb, .product-categories, .category, .item-category',
      additionalInfo: '.product-info, .product-specs, .specifications, .item-specs',
      price: '.product-price, .price, .current-price, .item-price'
    }
  },
  
  // Configurações de rolagem
  scroll: {
    delay: 2000,
    maxScrolls: 150,
    scrollStep: 800,
    waitForNewContent: 2500
  },
  
  // Configurações de extração
  extraction: {
    delayBetweenProducts: 1500,
    maxRetries: 3,
    timeout: 30000,
    waitForImages: true
  },
  
  // Mapeamento de campos
  fieldMapping: {
    referencia: {
      selectors: ['.product-reference', '.product-code', '.reference', '.sku', '.item-code'],
      extract: 'text',
      required: true
    },
    nome: {
      selectors: ['h1', '.product-name', '.product-title', '.item-name'],
      extract: 'text',
      required: true
    },
    descricao: {
      selectors: ['.product-description', '.description', '.product-details', '.item-description'],
      extract: 'text',
      required: true
    },
    cores: {
      selectors: ['.product-colors', '.colors', '.color-options', '.item-colors'],
      extract: 'array',
      required: true
    },
    imagens: {
      selectors: ['.product-images img', '.product-gallery img', '.gallery img', '.item-images img'],
      extract: 'src',
      required: true
    },
    categorias: {
      selectors: ['.breadcrumb', '.product-categories', '.category', '.item-category'],
      extract: 'array',
      required: false
    },
    informacoes_adicionais: {
      selectors: ['.product-info', '.product-specs', '.specifications', '.item-specs'],
      extract: 'text',
      required: false
    },
    preco: {
      selectors: ['.product-price', '.price', '.current-price', '.item-price'],
      extract: 'price',
      required: false
    }
  },
  
  // Configurações de login (se necessário)
  login: {
    required: false,
    url: 'https://www.xbzbrindes.com.br/login',
    selectors: {
      email: '#email, input[name="email"], input[type="email"], .login-email',
      password: '#password, input[name="password"], input[type="password"], .login-password',
      submit: 'button[type="submit"], .login-button, .btn-login, .submit-login'
    },
    credentials: {
      email: process.env.XBZBRINDES_EMAIL,
      password: process.env.XBZBRINDES_PASSWORD
    }
  },
  
  // Configurações de filtros (se necessário)
  filters: {
    enabled: false,
    selectors: {
      categoryFilter: '.category-filter, .filter-category, .catalog-filter',
      priceFilter: '.price-filter, .filter-price, .value-filter',
      colorFilter: '.color-filter, .filter-color, .cor-filter'
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
    delay: 2500,
    backoffMultiplier: 2
  },
  
  // Configurações de validação
  validation: {
    minProductCount: 10,
    maxProductCount: 15000,
    requiredFields: ['referencia', 'nome', 'descricao', 'cores', 'imagens']
  },
  
  // Configurações específicas do site
  siteSpecific: {
    // Alguns sites podem ter estruturas específicas
    useInfiniteScroll: true,
    lazyLoading: true,
    dynamicContent: true,
    
    // Seletores específicos para este site
    specificSelectors: {
      // Pode ser necessário ajustar baseado na análise do site
      productContainer: '.product, .item, .catalog-item',
      imageContainer: '.image-container, .img-wrapper, .photo-container'
    }
  },
  
  // Configurações de identificação
  identification: {
    referencePrefix: 'XB-',
    siteCode: 'XBZ'
  }
};

const BaseScraper = require('./BaseScraper');
const config = require('../config/xbzbrindes');

/**
 * Scraper específico para o XBZ Brindes
 */
class XBZBrindesScraper extends BaseScraper {
  constructor() {
    super(config);
  }

  /**
   * Sobrescreve métodos específicos se necessário
   */
  async scrollToLoadAllProducts() {
    try {
      logger.info('Iniciando rolagem específica para XBZ Brindes...');
      
      // Implementação específica para o XBZ Brindes
      // Pode incluir lógica específica para este site
      
      await super.scrollToLoadAllProducts();
      
    } catch (error) {
      logger.error('Erro durante rolagem específica do XBZ Brindes:', error);
      throw error;
    }
  }

  /**
   * Extração específica para produtos do XBZ Brindes
   */
  async extractProductFields() {
    try {
      const productData = await super.extractProductFields();
      
      // Lógica específica para o XBZ Brindes
      // Por exemplo, tratamento especial para cores ou categorias
      
      // Se cores não foram encontradas, tenta extrair de outros elementos
      if (!productData.cores || productData.cores.length === 0) {
        productData.cores = await this.extractColorsFromAlternative();
      }
      
      // Se categorias não foram encontradas, tenta extrair do breadcrumb
      if (!productData.categorias || productData.categorias.length === 0) {
        productData.categorias = await this.extractCategoriesFromBreadcrumb();
      }
      
      // Tratamento específico para imagens
      if (!productData.imagens || productData.imagens.length === 0) {
        productData.imagens = await this.extractImages();
      }
      
      // Tratamento específico para preços
      if (!productData.preco) {
        productData.preco = await this.extractPrice();
      }
      
      return productData;
      
    } catch (error) {
      logger.error('Erro na extração específica do XBZ Brindes:', error);
      throw error;
    }
  }

  /**
   * Extrai cores de elementos alternativos
   */
  async extractColorsFromAlternative() {
    try {
      const colors = await this.browserManager.evaluate(() => {
        // Tenta encontrar cores em diferentes elementos
        const colorElements = document.querySelectorAll('.color, .cor, .color-option, .color-variant, .cor-opcao');
        if (colorElements.length > 0) {
          return Array.from(colorElements).map(el => el.textContent?.trim()).filter(Boolean);
        }
        
        // Tenta encontrar cores em atributos data ou classes
        const elementsWithColors = document.querySelectorAll('[class*="color"], [class*="cor"], [data-color], [data-cor]');
        if (elementsWithColors.length > 0) {
          return Array.from(elementsWithColors).map(el => {
            const color = el.getAttribute('data-color') || 
                         el.getAttribute('data-cor') ||
                         el.className.match(/color-(\w+)/)?.[1] ||
                         el.className.match(/cor-(\w+)/)?.[1] ||
                         el.textContent?.trim();
            return color;
          }).filter(Boolean);
        }
        
        // Tenta encontrar cores em elementos de seleção
        const colorSelects = document.querySelectorAll('select[name*="color"], select[name*="cor"], select[id*="color"], select[id*="cor"]');
        if (colorSelects.length > 0) {
          return Array.from(colorSelects[0].options).map(opt => opt.textContent?.trim()).filter(Boolean);
        }
        
        return [];
      });
      
      return colors;
      
    } catch (error) {
      logger.debug('Erro ao extrair cores alternativas:', error);
      return [];
    }
  }

  /**
   * Extrai categorias do breadcrumb
   */
  async extractCategoriesFromBreadcrumb() {
    try {
      const categories = await this.browserManager.evaluate(() => {
        const breadcrumb = document.querySelector('.breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"], .navegacao');
        if (breadcrumb) {
          const links = breadcrumb.querySelectorAll('a, span, .breadcrumb-item');
          return Array.from(links)
            .map(el => el.textContent?.trim())
            .filter(text => text && text !== 'Home' && text !== 'Início' && text !== 'Página Inicial')
            .slice(1); // Remove o primeiro item (geralmente "Home")
        }
        
        // Tenta encontrar categorias em outros elementos
        const categoryElements = document.querySelectorAll('.category, .categoria, .product-category, .categoria-produto');
        if (categoryElements.length > 0) {
          return Array.from(categoryElements).map(el => el.textContent?.trim()).filter(Boolean);
        }
        
        return [];
      });
      
      return categories;
      
    } catch (error) {
      logger.debug('Erro ao extrair categorias do breadcrumb:', error);
      return [];
    }
  }

  /**
   * Tratamento específico para imagens do XBZ Brindes
   */
  async extractImages() {
    try {
      const images = await this.browserManager.evaluate(() => {
        // Tenta diferentes seletores para imagens
        const imageSelectors = [
          '.product-images img',
          '.product-gallery img',
          '.gallery img',
          '.product-photos img',
          '.product-thumbnails img',
          '.item-images img',
          '.catalog-images img',
          '.produto-imagens img'
        ];
        
        for (const selector of imageSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return Array.from(elements).map(img => {
              // Pega a imagem de maior resolução
              const src = img.src || img.getAttribute('src');
              const dataSrc = img.getAttribute('data-src') || 
                             img.getAttribute('data-lazy-src') || 
                             img.getAttribute('data-original');
              
              // Se não tem src, tenta encontrar em outros atributos
              if (!src && !dataSrc) {
                const dataAttributes = ['data-image', 'data-img', 'data-photo'];
                for (const attr of dataAttributes) {
                  const dataImg = img.getAttribute(attr);
                  if (dataImg) return dataImg;
                }
              }
              
              return dataSrc || src;
            }).filter(Boolean);
          }
        }
        
        // Tenta encontrar imagens em elementos de fundo
        const backgroundImages = document.querySelectorAll('[style*="background-image"]');
        if (backgroundImages.length > 0) {
          return Array.from(backgroundImages).map(el => {
            const style = el.getAttribute('style');
            const match = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
            return match ? match[1] : null;
          }).filter(Boolean);
        }
        
        return [];
      });
      
      return images;
      
    } catch (error) {
      logger.debug('Erro ao extrair imagens:', error);
      return [];
    }
  }

  /**
   * Tratamento específico para preços do XBZ Brindes
   */
  async extractPrice() {
    try {
      const price = await this.browserManager.evaluate(() => {
        // Tenta diferentes seletores para preços
        const priceSelectors = [
          '.product-price',
          '.price',
          '.current-price',
          '.product-value',
          '.item-price',
          '.catalog-price',
          '.valor',
          '.preco',
          '[class*="price"]',
          '[class*="valor"]',
          '[class*="preco"]'
        ];
        
        for (const selector of priceSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const priceText = element.textContent?.trim();
            if (priceText) {
              // Remove símbolos de moeda e converte para número
              const cleanPrice = priceText.replace(/[^\d,.]/g, '');
              const priceMatch = cleanPrice.match(/[\d,]+\.?\d*/);
              if (priceMatch) {
                return parseFloat(priceMatch[0].replace(/,/g, ''));
              }
            }
          }
        }
        
        // Tenta encontrar preços em atributos data
        const priceElements = document.querySelectorAll('[data-price], [data-valor], [data-preco]');
        for (const element of priceElements) {
          const dataPrice = element.getAttribute('data-price') || 
                           element.getAttribute('data-valor') || 
                           element.getAttribute('data-preco');
          if (dataPrice) {
            const cleanPrice = dataPrice.replace(/[^\d,.]/g, '');
            const priceMatch = cleanPrice.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
              return parseFloat(priceMatch[0].replace(/,/g, ''));
            }
          }
        }
        
        return null;
      });
      
      return price;
      
    } catch (error) {
      logger.debug('Erro ao extrair preço:', error);
      return null;
    }
  }

  /**
   * Tratamento específico para referências do XBZ Brindes
   */
  async extractReference() {
    try {
      const reference = await this.browserManager.evaluate(() => {
        // Tenta diferentes seletores para referências
        const referenceSelectors = [
          '.product-reference',
          '.product-code',
          '.reference',
          '.sku',
          '.item-code',
          '.catalog-code',
          '.codigo',
          '.referencia',
          '[class*="reference"]',
          '[class*="code"]',
          '[class*="codigo"]'
        ];
        
        for (const selector of referenceSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const refText = element.textContent?.trim();
            if (refText) {
              return refText;
            }
          }
        }
        
        // Tenta encontrar referências em atributos data
        const refElements = document.querySelectorAll('[data-reference], [data-code], [data-codigo]');
        for (const element of refElements) {
          const dataRef = element.getAttribute('data-reference') || 
                         element.getAttribute('data-code') || 
                         element.getAttribute('data-codigo');
          if (dataRef) {
            return dataRef;
          }
        }
        
        return null;
      });
      
      return reference;
      
    } catch (error) {
      logger.debug('Erro ao extrair referência:', error);
      return null;
    }
  }
}

module.exports = XBZBrindesScraper;

const BaseScraper = require('./BaseScraper');
const config = require('../config/spotgifts');
const logger = require('../utils/logger');

/**
 * Scraper específico para o Spot Gifts
 */
class SpotGiftsScraper extends BaseScraper {
  constructor() {
    super(config);
  }

  /**
   * Sobrescreve métodos específicos se necessário
   */
  async scrollToLoadAllProducts() {
    try {
      logger.info('Iniciando rolagem específica para Spot Gifts...');
      
      // Implementação específica para o Spot Gifts
      // Pode incluir lógica específica para este site
      
      await super.scrollToLoadAllProducts();
      
    } catch (error) {
      logger.error('Erro durante rolagem específica do Spot Gifts:', error);
      throw error;
    }
  }

  /**
   * Extração específica para produtos do Spot Gifts
   */
  async extractProductFields() {
    try {
      const productData = await super.extractProductFields();
      
      // Lógica específica para o Spot Gifts
      // Por exemplo, tratamento especial para cores ou categorias
      
      // Se cores não foram encontradas, tenta extrair de outros elementos
      if (!productData.cores || productData.cores.length === 0) {
        productData.cores = await this.extractColorsFromAlternative();
      }
      
      // Se categorias não foram encontradas, tenta extrair do breadcrumb
      if (!productData.categorias || productData.categorias.length === 0) {
        productData.categorias = await this.extractCategoriesFromBreadcrumb();
      }
      
      return productData;
      
    } catch (error) {
      logger.error('Erro na extração específica do Spot Gifts:', error);
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
        const colorElements = document.querySelectorAll('.color, .cor, .color-option, .color-variant');
        if (colorElements.length > 0) {
          return Array.from(colorElements).map(el => el.textContent?.trim()).filter(Boolean);
        }
        
        // Tenta encontrar cores em atributos data ou classes
        const elementsWithColors = document.querySelectorAll('[class*="color"], [data-color]');
        if (elementsWithColors.length > 0) {
          return Array.from(elementsWithColors).map(el => {
            const color = el.getAttribute('data-color') || 
                         el.className.match(/color-(\w+)/)?.[1] ||
                         el.textContent?.trim();
            return color;
          }).filter(Boolean);
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
        const breadcrumb = document.querySelector('.breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"]');
        if (breadcrumb) {
          const links = breadcrumb.querySelectorAll('a, span');
          return Array.from(links)
            .map(el => el.textContent?.trim())
            .filter(text => text && text !== 'Home' && text !== 'Início')
            .slice(1); // Remove o primeiro item (geralmente "Home")
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
   * Tratamento específico para imagens do Spot Gifts
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
          '.product-thumbnails img'
        ];
        
        for (const selector of imageSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return Array.from(elements).map(img => {
              // Pega a imagem de maior resolução
              const src = img.src || img.getAttribute('src');
              const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
              return dataSrc || src;
            }).filter(Boolean);
          }
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
   * Tratamento específico para preços do Spot Gifts
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
          '[class*="price"]'
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
        
        return null;
      });
      
      return price;
      
    } catch (error) {
      logger.debug('Erro ao extrair preço:', error);
      return null;
    }
  }
}

module.exports = SpotGiftsScraper;

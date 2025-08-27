const BrowserManager = require('./browser');
const logger = require('./logger');

/**
 * Utilitário para analisar a estrutura dos sites
 * Ajuda a identificar seletores corretos para configuração
 */
class SiteAnalyzer {
  constructor() {
    this.browserManager = new BrowserManager();
  }

  /**
   * Analisa um site para identificar seletores
   */
  async analyzeSite(url, siteName) {
    try {
      logger.title(`🔍 ANÁLISE DO SITE: ${siteName}`);
      logger.info(`URL: ${url}`);
      
      await this.browserManager.initialize();
      await this.browserManager.navigateTo(url);
      
      // Aguarda carregamento da página
      await this.browserManager.getPage().waitForTimeout(3000);
      
      const analysis = {
        siteName,
        url,
        timestamp: new Date().toISOString(),
        selectors: {},
        structure: {},
        recommendations: []
      };
      
      // Analisa estrutura da página
      await this.analyzePageStructure(analysis);
      
      // Analisa produtos
      await this.analyzeProducts(analysis);
      
      // Analisa navegação
      await this.analyzeNavigation(analysis);
      
      // Gera recomendações
      this.generateRecommendations(analysis);
      
      // Salva análise
      await this.saveAnalysis(analysis);
      
      logger.success('✅ Análise concluída com sucesso!');
      
      return analysis;
      
    } catch (error) {
      logger.error('❌ Erro durante análise do site:', error);
      throw error;
    } finally {
      await this.browserManager.close();
    }
  }

  /**
   * Analisa a estrutura geral da página
   */
  async analyzePageStructure(analysis) {
    try {
      logger.info('Analisando estrutura da página...');
      
      const structure = await this.browserManager.evaluate(() => {
        const result = {
          title: document.title,
          metaDescription: document.querySelector('meta[name="description"]')?.content || '',
          headings: [],
          mainContent: null,
          sidebar: null,
          footer: null
        };
        
        // Analisa headings
        for (let i = 1; i <= 6; i++) {
          const headings = document.querySelectorAll(`h${i}`);
          if (headings.length > 0) {
            result.headings.push({
              level: i,
              count: headings.length,
              examples: Array.from(headings).slice(0, 3).map(h => h.textContent?.trim())
            });
          }
        }
        
        // Identifica elementos principais
        const main = document.querySelector('main, [role="main"], .main, .content, #main, #content');
        if (main) result.mainContent = main.tagName + (main.className ? '.' + main.className : '');
        
        const sidebar = document.querySelector('aside, .sidebar, .side, #sidebar');
        if (sidebar) result.sidebar = sidebar.tagName + (sidebar.className ? '.' + sidebar.className : '');
        
        const footer = document.querySelector('footer, .footer, #footer');
        if (footer) result.footer = footer.tagName + (footer.className ? '.' + footer.className : '');
        
        return result;
      });
      
      analysis.structure = structure;
      logger.success('✅ Estrutura da página analisada');
      
    } catch (error) {
      logger.error('Erro ao analisar estrutura da página:', error);
    }
  }

  /**
   * Analisa produtos na página
   */
  async analyzeProducts(analysis) {
    try {
      logger.info('Analisando produtos...');
      
      const products = await this.browserManager.evaluate(() => {
        const result = {
          productContainers: [],
          productLinks: [],
          productImages: [],
          productNames: [],
          productPrices: [],
          productReferences: []
        };
        
        // Procura por containers de produtos
        const containerSelectors = [
          '.product', '.product-item', '.product-card', '.item', '.catalog-item',
          '[class*="product"]', '[class*="item"]', '[class*="card"]'
        ];
        
        containerSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.productContainers.push({
              selector,
              count: elements.length,
              example: elements[0].outerHTML.substring(0, 200) + '...'
            });
          }
        });
        
        // Procura por links de produtos
        const linkSelectors = [
          'a[href*="/produto"]', 'a[href*="/product"]', 'a[href*="/item"]',
          '.product-link', '.item-link', 'a[class*="product"]'
        ];
        
        linkSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.productLinks.push({
              selector,
              count: elements.length,
              examples: Array.from(elements).slice(0, 3).map(a => a.href)
            });
          }
        });
        
        // Procura por imagens de produtos
        const imageSelectors = [
          'img[src*="product"]', 'img[alt*="produto"]', '.product-image img',
          '.item-image img', 'img[class*="product"]'
        ];
        
        imageSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.productImages.push({
              selector,
              count: elements.length,
              examples: Array.from(elements).slice(0, 3).map(img => img.src)
            });
          }
        });
        
        // Procura por nomes de produtos
        const nameSelectors = [
          'h1', 'h2', 'h3', 'h4', '.product-name', '.item-name',
          '.product-title', '.item-title', '[class*="name"]', '[class*="title"]'
        ];
        
        nameSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.productNames.push({
              selector,
              count: elements.length,
              examples: Array.from(elements).slice(0, 3).map(el => el.textContent?.trim())
            });
          }
        });
        
        // Procura por preços
        const priceSelectors = [
          '.price', '.product-price', '.item-price', '.valor', '.preco',
          '[class*="price"]', '[class*="valor"]', '[class*="preco"]'
        ];
        
        priceSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.productPrices.push({
              selector,
              count: elements.length,
              examples: Array.from(elements).slice(0, 3).map(el => el.textContent?.trim())
            });
          }
        });
        
        // Procura por referências/códigos
        const referenceSelectors = [
          '.reference', '.product-code', '.item-code', '.sku', '.codigo',
          '[class*="reference"]', '[class*="code"]', '[class*="codigo"]'
        ];
        
        referenceSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.productReferences.push({
              selector,
              count: elements.length,
              examples: Array.from(elements).slice(0, 3).map(el => el.textContent?.trim())
            });
          }
        });
        
        return result;
      });
      
      analysis.selectors = products;
      logger.success('✅ Produtos analisados');
      
    } catch (error) {
      logger.error('Erro ao analisar produtos:', error);
    }
  }

  /**
   * Analisa navegação e paginação
   */
  async analyzeNavigation(analysis) {
    try {
      logger.info('Analisando navegação...');
      
      const navigation = await this.browserManager.evaluate(() => {
        const result = {
          pagination: [],
          loadMore: [],
          filters: [],
          breadcrumbs: []
        };
        
        // Procura por paginação
        const paginationSelectors = [
          '.pagination', '.pager', '.pages', '.page-numbers',
          '[class*="pagination"]', '[class*="pager"]'
        ];
        
        paginationSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.pagination.push({
              selector,
              count: elements.length,
              example: elements[0].outerHTML.substring(0, 200) + '...'
            });
          }
        });
        
        // Procura por botões "carregar mais"
        const loadMoreSelectors = [
          '.load-more', '.show-more', '.load-more-products',
          '[class*="load"]', '[class*="more"]', 'button:contains("mais")'
        ];
        
        loadMoreSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.loadMore.push({
              selector,
              count: elements.length,
              text: elements[0].textContent?.trim()
            });
          }
        });
        
        // Procura por filtros
        const filterSelectors = [
          '.filters', '.filter', '.filter-group', '.filter-options',
          '[class*="filter"]', 'select[name*="filter"]'
        ];
        
        filterSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.filters.push({
              selector,
              count: elements.length,
              example: elements[0].outerHTML.substring(0, 200) + '...'
            });
          }
        });
        
        // Procura por breadcrumbs
        const breadcrumbSelectors = [
          '.breadcrumb', '.breadcrumbs', 'nav[aria-label="breadcrumb"]',
          '[class*="breadcrumb"]', '.navegacao'
        ];
        
        breadcrumbSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            result.breadcrumbs.push({
              selector,
              count: elements.length,
              example: elements[0].outerHTML.substring(0, 200) + '...'
            });
          }
        });
        
        return result;
      });
      
      analysis.navigation = navigation;
      logger.success('✅ Navegação analisada');
      
    } catch (error) {
      logger.error('Erro ao analisar navegação:', error);
    }
  }

  /**
   * Gera recomendações baseadas na análise
   */
  generateRecommendations(analysis) {
    try {
      logger.info('Gerando recomendações...');
      
      const recommendations = [];
      
      // Recomendações para seletores de produtos
      if (analysis.selectors.productContainers.length > 0) {
        const bestContainer = analysis.selectors.productContainers[0];
        recommendations.push({
          type: 'productContainer',
          priority: 'high',
          message: `Use "${bestContainer.selector}" para container de produtos (${bestContainer.count} encontrados)`
        });
      }
      
      if (analysis.selectors.productLinks.length > 0) {
        const bestLink = analysis.selectors.productLinks[0];
        recommendations.push({
          type: 'productLinks',
          priority: 'high',
          message: `Use "${bestLink.selector}" para links de produtos (${bestLink.count} encontrados)`
        });
      }
      
      if (analysis.selectors.productNames.length > 0) {
        const bestName = analysis.selectors.productNames[0];
        recommendations.push({
          type: 'productNames',
          priority: 'high',
          message: `Use "${bestName.selector}" para nomes de produtos (${bestName.count} encontrados)`
        });
      }
      
      if (analysis.selectors.productPrices.length > 0) {
        const bestPrice = analysis.selectors.productPrices[0];
        recommendations.push({
          type: 'productPrices',
          priority: 'medium',
          message: `Use "${bestPrice.selector}" para preços (${bestPrice.count} encontrados)`
        });
      }
      
      // Recomendações para navegação
      if (analysis.navigation.loadMore.length > 0) {
        const loadMore = analysis.navigation.loadMore[0];
        recommendations.push({
          type: 'loadMore',
          priority: 'medium',
          message: `Site usa botão "carregar mais" com seletor "${loadMore.selector}"`
        });
      }
      
      if (analysis.navigation.pagination.length > 0) {
        const pagination = analysis.navigation.pagination[0];
        recommendations.push({
          type: 'pagination',
          priority: 'medium',
          message: `Site usa paginação tradicional com seletor "${pagination.selector}"`
        });
      }
      
      // Recomendações gerais
      if (analysis.structure.headings.length > 0) {
        const mainHeading = analysis.structure.headings.find(h => h.level === 1);
        if (mainHeading) {
          recommendations.push({
            type: 'structure',
            priority: 'low',
            message: `Página tem ${mainHeading.count} heading principal (H1)`
          });
        }
      }
      
      analysis.recommendations = recommendations;
      logger.success('✅ Recomendações geradas');
      
    } catch (error) {
      logger.error('Erro ao gerar recomendações:', error);
    }
  }

  /**
   * Salva a análise em arquivo
   */
  async saveAnalysis(analysis) {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      
      const outputDir = path.join(process.cwd(), 'analysis');
      await fs.ensureDir(outputDir);
      
      const filename = `${analysis.siteName.toLowerCase().replace(/\s+/g, '_')}_analysis_${Date.now()}.json`;
      const filepath = path.join(outputDir, filename);
      
      await fs.writeJson(filepath, analysis, { spaces: 2 });
      
      logger.success(`📁 Análise salva em: ${filepath}`);
      
      return filepath;
      
    } catch (error) {
      logger.error('Erro ao salvar análise:', error);
    }
  }
}

module.exports = SiteAnalyzer;

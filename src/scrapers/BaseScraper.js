const BrowserManager = require('../utils/browser');
const DataManager = require('../utils/dataManager');
const Product = require('../models/Product');
const logger = require('../utils/logger');

/**
 * Classe base para todos os scrapers
 */
class BaseScraper {
  constructor(config) {
    this.config = config;
    this.browserManager = new BrowserManager();
    this.dataManager = new DataManager();
    this.products = [];
    this.stats = {
      total: 0,
      validos: 0,
      invalidos: 0,
      erros: 0,
      tempo_inicio: null,
      tempo_fim: null
    };
  }

  /**
   * Inicializa o scraper
   */
  async initialize() {
    try {
      logger.title(`Iniciando Scraping - ${this.config.name}`);
      this.stats.tempo_inicio = new Date();
      
      await this.browserManager.initialize();
      
      // Login se necessário
      if (this.config.login && this.config.login.required) {
        await this.performLogin();
      }
      
      logger.success('Scraper inicializado com sucesso');
      
    } catch (error) {
      logger.error('Erro ao inicializar scraper:', error);
      throw error;
    }
  }

  /**
   * Executa o processo completo de scraping
   */
  async run() {
    try {
      await this.initialize();
      
      // Navega para o catálogo
      await this.navigateToCatalog();
      
      // Rola a página para carregar todos os produtos
      await this.scrollToLoadAllProducts();
      
      // Extrai links dos produtos
      const productLinks = await this.extractProductLinks();
      logger.info(`Encontrados ${productLinks.length} produtos para extrair`);
      
      // Extrai dados de cada produto
      await this.extractAllProducts(productLinks);
      
      // Valida e salva os dados
      await this.saveResults();
      
      // Gera relatórios
      await this.generateReports();
      
      logger.success('Scraping concluído com sucesso!');
      
    } catch (error) {
      logger.error('Erro durante o scraping:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Navega para o catálogo
   */
  async navigateToCatalog() {
    try {
      logger.info(`Navegando para o catálogo: ${this.config.catalogUrl}`);
      await this.browserManager.navigateTo(this.config.catalogUrl);
      
      // Aguarda carregamento da página
      await this.waitForPageLoad();
      
    } catch (error) {
      logger.error('Erro ao navegar para o catálogo:', error);
      throw error;
    }
  }

  /**
   * Aguarda o carregamento da página
   */
  async waitForPageLoad() {
    try {
      // Aguarda elementos básicos da página
      const basicSelectors = [
        this.config.selectors.productGrid,
        this.config.selectors.productCard
      ].filter(Boolean);
      
      for (const selector of basicSelectors) {
        try {
          await this.browserManager.waitForElement(selector, { timeout: 10000 });
          break;
        } catch (error) {
          logger.debug(`Seletor não encontrado: ${selector}`);
        }
      }
      
      // Aguarda um pouco mais para garantir carregamento completo
      await this.browserManager.getPage().waitForTimeout(2000);
      
    } catch (error) {
      logger.warn('Timeout aguardando carregamento da página, continuando...');
    }
  }

  /**
   * Rola a página para carregar todos os produtos
   */
  async scrollToLoadAllProducts() {
    try {
      logger.info('Iniciando rolagem para carregar todos os produtos...');
      
      const scrollConfig = this.config.scroll;
      let previousProductCount = 0;
      let scrollCount = 0;
      
      while (scrollCount < scrollConfig.maxScrolls) {
        // Conta produtos visíveis
        const currentProductCount = await this.countVisibleProducts();
        
        // Rola a página
        await this.browserManager.scrollToBottom({
          delay: scrollConfig.delay,
          maxScrolls: 1,
          scrollStep: scrollConfig.scrollStep
        });
        
        // Aguarda carregamento de novo conteúdo
        await this.browserManager.getPage().waitForTimeout(scrollConfig.waitForNewContent);
        
        // Verifica se novos produtos foram carregados
        const newProductCount = await this.countVisibleProducts();
        
        if (newProductCount === previousProductCount) {
          logger.info('Nenhum novo produto carregado, parando rolagem');
          break;
        }
        
        previousProductCount = newProductCount;
        scrollCount++;
        
        logger.progress(scrollCount, scrollConfig.maxScrolls, `Produtos encontrados: ${newProductCount}`);
      }
      
      logger.newLine();
      const finalProductCount = await this.countVisibleProducts();
      logger.success(`Rolagem concluída. Total de produtos visíveis: ${finalProductCount}`);
      
    } catch (error) {
      logger.error('Erro durante a rolagem da página:', error);
      throw error;
    }
  }

  /**
   * Conta produtos visíveis na página
   */
  async countVisibleProducts() {
    try {
      const count = await this.browserManager.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        return elements.length;
      }, this.config.selectors.productCard);
      
      return count || 0;
      
    } catch (error) {
      logger.debug('Erro ao contar produtos:', error);
      return 0;
    }
  }

  /**
   * Extrai links dos produtos
   */
  async extractProductLinks() {
    try {
      logger.info('Extraindo links dos produtos...');
      
      const links = await this.browserManager.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map(el => {
          const href = el.href || el.getAttribute('href');
          const text = el.textContent?.trim() || '';
          return { href, text };
        }).filter(item => item.href);
      }, this.config.selectors.productLinks);
      
      // Remove duplicatas
      const uniqueLinks = links.filter((link, index, self) => 
        index === self.findIndex(l => l.href === link.href)
      );
      
      logger.success(`${uniqueLinks.length} links únicos extraídos`);
      return uniqueLinks;
      
    } catch (error) {
      logger.error('Erro ao extrair links dos produtos:', error);
      throw error;
    }
  }

  /**
   * Extrai dados de todos os produtos
   */
  async extractAllProducts(productLinks) {
    try {
      logger.info(`Iniciando extração de ${productLinks.length} produtos...`);
      
      for (let i = 0; i < productLinks.length; i++) {
        const link = productLinks[i];
        
        try {
          logger.progress(i + 1, productLinks.length, `Extraindo: ${link.text || link.href}`);
          
          const product = await this.extractProduct(link.href);
          
          if (product && product.isValid()) {
            this.products.push(product);
            this.stats.validos++;
          } else {
            this.stats.invalidos++;
            logger.warn(`Produto inválido: ${link.href}`);
          }
          
          // Delay entre produtos
          if (i < productLinks.length - 1) {
            await this.browserManager.getPage().waitForTimeout(
              this.config.extraction.delayBetweenProducts
            );
          }
          
        } catch (error) {
          this.stats.erros++;
          logger.error(`Erro ao extrair produto ${link.href}:`, error);
        }
      }
      
      logger.newLine();
      logger.success(`Extração concluída: ${this.products.length} produtos válidos`);
      
    } catch (error) {
      logger.error('Erro durante a extração dos produtos:', error);
      throw error;
    }
  }

  /**
   * Extrai dados de um produto específico
   */
  async extractProduct(productUrl) {
    try {
      // Navega para a página do produto
      await this.browserManager.navigateTo(productUrl);
      
      // Aguarda carregamento da página
      await this.waitForProductPageLoad();
      
      // Extrai dados usando o mapeamento de campos
      const productData = await this.extractProductFields();
      
      // Adiciona prefixo do site na referência
      if (productData.referencia) {
        productData.referencia = this.addSitePrefix(productData.referencia);
      }
      
      // Cria objeto Product
      const product = new Product({
        ...productData,
        url_produto: productUrl,
        site_origem: this.config.name
      });
      
      return product;
      
    } catch (error) {
      logger.error(`Erro ao extrair produto ${productUrl}:`, error);
      throw error;
    }
  }

  /**
   * Adiciona prefixo do site na referência
   */
  addSitePrefix(reference) {
    if (!reference) return reference;
    
    // Usa configuração do site se disponível
    if (this.config.identification && this.config.identification.referencePrefix) {
      const prefix = this.config.identification.referencePrefix;
      if (!reference.startsWith(prefix)) {
        return `${prefix}${reference}`;
      }
    } else {
      // Fallback para configurações antigas
      const sitePrefixes = {
        'Spot Gifts': 'SP-',
        'XBZ Brindes': 'XB-'
      };
      
      const prefix = sitePrefixes[this.config.name];
      if (prefix && !reference.startsWith(prefix)) {
        return `${prefix}${reference}`;
      }
    }
    
    return reference;
  }

  /**
   * Remove prefixo do site da referência
   */
  removeSitePrefix(reference) {
    if (!reference) return reference;
    
    // Usa configuração do site se disponível
    if (this.config.identification && this.config.identification.referencePrefix) {
      const prefix = this.config.identification.referencePrefix;
      if (reference.startsWith(prefix)) {
        return reference.substring(prefix.length);
      }
    } else {
      // Fallback para configurações antigas
      const sitePrefixes = {
        'Spot Gifts': 'SP-',
        'XBZ Brindes': 'XB-'
      };
      
      const prefix = sitePrefixes[this.config.name];
      if (prefix && reference.startsWith(prefix)) {
        return reference.substring(prefix.length);
      }
    }
    
    return reference;
  }

  /**
   * Aguarda carregamento da página do produto
   */
  async waitForProductPageLoad() {
    try {
      // Aguarda elementos básicos da página do produto
      const basicSelectors = [
        this.config.selectors.productPage.name,
        this.config.selectors.productPage.reference
      ].filter(Boolean);
      
      for (const selector of basicSelectors) {
        try {
          await this.browserManager.waitForElement(selector, { timeout: 10000 });
          break;
        } catch (error) {
          logger.debug(`Seletor de produto não encontrado: ${selector}`);
        }
      }
      
      // Aguarda um pouco mais
      await this.browserManager.getPage().waitForTimeout(1000);
      
    } catch (error) {
      logger.warn('Timeout aguardando carregamento da página do produto');
    }
  }

  /**
   * Extrai campos do produto usando o mapeamento configurado
   */
  async extractProductFields() {
    try {
      const productData = {};
      
      for (const [field, config] of Object.entries(this.config.fieldMapping)) {
        try {
          const value = await this.extractField(config);
          productData[field] = value;
        } catch (error) {
          logger.debug(`Erro ao extrair campo ${field}:`, error);
          if (config.required) {
            productData[field] = '';
          }
        }
      }
      
      return productData;
      
    } catch (error) {
      logger.error('Erro ao extrair campos do produto:', error);
      throw error;
    }
  }

  /**
   * Extrai um campo específico
   */
  async extractField(fieldConfig) {
    try {
      const { selectors, extract, required } = fieldConfig;
      
      for (const selector of selectors) {
        try {
          const value = await this.browserManager.evaluate((sel, extType) => {
            const element = document.querySelector(sel);
            if (!element) return null;
            
            switch (extType) {
              case 'text':
                return element.textContent?.trim() || '';
              case 'src':
                return element.src || element.getAttribute('src') || '';
              case 'href':
                return element.href || element.getAttribute('href') || '';
              case 'array':
                // Para arrays (cores, categorias, etc.)
                if (element.tagName === 'SELECT') {
                  return Array.from(element.options).map(opt => opt.textContent?.trim()).filter(Boolean);
                }
                // Para elementos múltiplos
                const elements = document.querySelectorAll(sel);
                return Array.from(elements).map(el => el.textContent?.trim()).filter(Boolean);
              case 'price':
                const priceText = element.textContent?.trim() || '';
                const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                return priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;
              default:
                return element.textContent?.trim() || '';
            }
          }, selector, extract);
          
          if (value !== null && value !== '') {
            return value;
          }
          
        } catch (error) {
          logger.debug(`Erro com seletor ${selector}:`, error);
        }
      }
      
      if (required) {
        throw new Error(`Campo obrigatório não encontrado: ${fieldConfig}`);
      }
      
      return null;
      
    } catch (error) {
      logger.debug('Erro ao extrair campo:', error);
      throw error;
    }
  }

  /**
   * Realiza login no site
   */
  async performLogin() {
    try {
      logger.info('Realizando login...');
      
      const loginConfig = this.config.login;
      
      // Navega para a página de login
      await this.browserManager.navigateTo(loginConfig.url);
      
      // Preenche credenciais
      await this.browserManager.getPage().type(loginConfig.selectors.email, loginConfig.credentials.email);
      await this.browserManager.getPage().type(loginConfig.selectors.password, loginConfig.credentials.password);
      
      // Submete o formulário
      await this.browserManager.getPage().click(loginConfig.selectors.submit);
      
      // Aguarda redirecionamento
      await this.browserManager.getPage().waitForTimeout(3000);
      
      logger.success('Login realizado com sucesso');
      
    } catch (error) {
      logger.error('Erro ao realizar login:', error);
      throw error;
    }
  }

  /**
   * Salva os resultados
   */
  async saveResults() {
    try {
      logger.info('Salvando resultados...');
      
      // Valida produtos
      const validationStats = this.dataManager.validateProducts(this.products);
      this.stats = { ...this.stats, ...validationStats };
      
      // Salva produtos
      const productsFile = await this.dataManager.saveProducts(
        this.products,
        this.config.name.toLowerCase().replace(/\s+/g, '_'),
        this.config.name
      );
      
      // Salva estatísticas
      const statsFile = await this.dataManager.saveStats(
        this.stats,
        this.config.name.toLowerCase().replace(/\s+/g, '_'),
        this.config.name
      );
      
      logger.success('Resultados salvos com sucesso');
      
      return { productsFile, statsFile };
      
    } catch (error) {
      logger.error('Erro ao salvar resultados:', error);
      throw error;
    }
  }

  /**
   * Gera relatórios
   */
  async generateReports() {
    try {
      logger.info('Gerando relatórios...');
      
      // Relatório de resumo
      const summaryReport = await this.dataManager.createSummaryReport(
        this.products,
        this.stats,
        this.config.name
      );
      
      // Exporta para CSV
      const csvFile = await this.dataManager.exportToCSV(
        this.products,
        this.config.name.toLowerCase().replace(/\s+/g, '_'),
        this.config.name
      );
      
      logger.success('Relatórios gerados com sucesso');
      
      return { summaryReport, csvFile };
      
    } catch (error) {
      logger.error('Erro ao gerar relatórios:', error);
      throw error;
    }
  }

  /**
   * Limpeza e finalização
   */
  async cleanup() {
    try {
      this.stats.tempo_fim = new Date();
      const duracao = this.stats.tempo_fim - this.stats.tempo_inicio;
      
      logger.info(`Tempo total de execução: ${Math.round(duracao / 1000)}s`);
      
      // Exibe estatísticas finais
      this.dataManager.stats(this.stats);
      
      // Fecha o navegador
      await this.browserManager.close();
      
    } catch (error) {
      logger.error('Erro durante a limpeza:', error);
    }
  }
}

module.exports = BaseScraper;

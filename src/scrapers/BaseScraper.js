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
      console.log('error', error);
      logger.error('Erro durante o scraping:', error);
      // Garante que o cleanup seja executado mesmo com erro
      await this.emergencyCleanup();
      throw error;
    } finally {
      // Sempre executa o cleanup
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
      await this.browserManager.wait(2000);
      
    } catch (error) {
      logger.warn('Timeout aguardando carregamento da página, continuando...');
      logger.debug('Detalhes do erro:', error.message);
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
        await this.browserManager.wait(scrollConfig.waitForNewContent);
        
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
          logger.progress(i + 1, productLinks.length, `Extraindo: ${link.text || link.href}\n`);
          
          logger.info(`🔍 Extraindo produto: ${link.href}`);
          
          const product = await this.extractProduct(link.href);
          
          logger.info(`📦 Produto retornado: ${product ? 'SIM' : 'NÃO'}`);
          
          // Debug: mostra dados extraídos
          if (product) {
            logger.info(`✅ Dados extraídos para ${link.href}:`);
            logger.info(`  Nome: ${product.nome || 'N/A'}`);
            logger.info(`  Referência: ${product.referencia || 'N/A'}`);
            logger.info(`  Cores: ${product.cores ? product.cores.length : 0} cores`);
            if (product.cores && product.cores.length > 0) {
              product.cores.forEach((cor, index) => {
                if (cor.nome) logger.info(`    Cor ${index + 1}: ${cor.nome} (${cor.tipo || 'texto'})`);
                if (cor.imagem) logger.info(`      Imagem Relativa: ${cor.imagem}`);
                if (cor.imagemCompleta) logger.info(`      Imagem Completa: ${cor.imagemCompleta}`);
                if (cor.codigo) logger.info(`      Código: ${cor.codigo}`);
                if (cor.codigoNumerico) logger.info(`      Código Numérico: ${cor.codigoNumerico}`);
              });
            }
            logger.info(`  Imagens: ${product.imagens ? product.imagens.length : 0} imagens`);
            logger.info(`  Válido: ${product.isValid()}`);
            
            if (!product.isValid()) {
              const missing = product.getMissingFields();
              logger.info(`  ❌ Campos faltando: ${missing.join(', ')}`);
            }
          } else {
            logger.warn(`❌ Produto retornou null/undefined`);
          }
          
          if (product && product.isValid()) {
            this.products.push(product);
            this.stats.validos++;
            logger.success(`✅ Produto válido adicionado: ${product.nome}`);
          } else {
            this.stats.invalidos++;
            logger.warn(`❌ Produto inválido: ${link.href}`);
          }
          
          // Delay entre produtos
          if (i < productLinks.length - 1) {
            await this.browserManager.wait(
              this.config.extraction.delayBetweenProducts
            );
          }
          
        } catch (error) {
          this.stats.erros++;
          logger.error(`❌ Erro ao extrair produto ${link.href}:`, error);
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
      logger.debug(`Iniciando extração do produto: ${productUrl}`);
      
      // Navega para a página do produto
      await this.browserManager.navigateTo(productUrl);
      
      // Aguarda carregamento da página
      await this.waitForProductPageLoad();
      
      // Extrai dados usando o mapeamento de campos
      logger.debug('Extraindo campos do produto...');
      const productData = await this.extractProductFields();
      
      logger.debug('Dados extraídos:', productData);
      
      // Adiciona prefixo do site na referência
      if (productData.referencia) {
        productData.referencia = this.addSitePrefix(productData.referencia);
        logger.debug(`Referência com prefixo: ${productData.referencia}`);
      }
      
      // Cria objeto Product
      logger.debug('Criando objeto Product...');
      const product = new Product({
        ...productData,
        url_produto: productUrl,
        site_origem: this.config.name
      });
      
      logger.debug('Objeto Product criado:', {
        nome: product.nome,
        referencia: product.referencia,
        cores: product.cores?.length,
        imagens: product.imagens?.length
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
        await this.browserManager.wait(1000);
      
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
          if (field === 'categorias') {
            console.log('value ===================>>>>>>>>', field, "===", value);
          }
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
            switch (extType) {
              case 'script':
                const scriptElement = document.querySelector(sel);
                if (!scriptElement) return null;
                const content = scriptElement.textContent || scriptElement.innerHTML;
                if (content.includes('item_category')) {
                  const categories = content.match(/"item_category2":"([^"]*)"/);
                  return categories;
                }
                return content;
              case 'text':
                const element = document.querySelector(sel);
                if (!element) return null;
                return element.textContent?.trim() || '';
              case 'src':
                // Para imagens, extrai apenas src e remove duplicatas
                if (sel.includes('img')) {
                  const elements = document.querySelectorAll(sel);
                  if (elements.length === 0) return null;
                  
                  const imageUrls = new Set(); // Usa Set para garantir URLs únicas
                  elements.forEach(el => {
                    if (el.tagName === 'IMG') {
                      const src = el.src || el.getAttribute('src');
                      if (src) {
                        // Constrói URL completa se for relativa
                        let fullUrl = src;
                        if (src.startsWith('/')) {
                          fullUrl = window.location.origin + src;
                        } else if (!src.startsWith('http')) {
                          fullUrl = window.location.origin + '/' + src;
                        }
                        imageUrls.add(fullUrl);
                      }
                    }
                  });
                  
                  return Array.from(imageUrls); // Converte Set para Array
                } else {
                  const imgElement = document.querySelector(sel);
                  if (!imgElement) return null;
                  const src = imgElement.src || imgElement.getAttribute('src') || '';
                  
                  // Constrói URL completa se for relativa
                  if (src && src.startsWith('/')) {
                    return window.location.origin + src;
                  } else if (src && !src.startsWith('http')) {
                    return window.location.origin + '/' + src;
                  }
                  
                  return src;
                }
                
                return Array.from(imageUrls); // Converte Set para Array
              case 'href':
                const linkElement = document.querySelector(sel);
                if (!linkElement) return null;
                return linkElement.href || linkElement.getAttribute('href') || '';
              case 'array':
                // Para arrays (cores, categorias, etc.)
                const elements = document.querySelectorAll(sel);
                if (elements.length === 0) return null;
                
                if (elements[0].tagName === 'SELECT') {
                  return Array.from(elements[0].options).map(opt => opt.textContent?.trim()).filter(Boolean);
                }
                
                // Para elementos múltiplos
                return Array.from(elements).map(el => el.textContent?.trim()).filter(Boolean);
              case 'color':
                // Para cores - extrai imagem, código hex e nome
                const colorElements = document.querySelectorAll(sel);
                if (colorElements.length === 0) return null;
                
                return Array.from(colorElements).map(el => {
                  const colorData = {};
                  
                  // Nome da cor (title)
                  colorData.nome = el.getAttribute('title') || '';
                  
                  // Código da cor (span dentro)
                  const span = el.querySelector('span');
                  if (span) {
                    const style = span.getAttribute('style') || '';
                    
                    // Verifica se tem background-image (imagem)
                    const bgImageMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
                    if (bgImageMatch) {
                      const relativeUrl = bgImageMatch[1];
                      colorData.imagem = relativeUrl;
                      colorData.tipo = 'imagem';
                      
                      // Constrói URL completa
                      if (relativeUrl.startsWith('http')) {
                        colorData.imagemCompleta = relativeUrl;
                      } else if (relativeUrl.startsWith('/')) {
                        colorData.imagemCompleta = window.location.origin + relativeUrl;
                      } else {
                        colorData.imagemCompleta = window.location.origin + '/' + relativeUrl;
                      }
                    }
                    
                    // Verifica se tem background-color (código hex)
                    const bgColorMatch = style.match(/background-color:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})/);
                    if (bgColorMatch) {
                      colorData.codigo = bgColorMatch[1];
                      colorData.tipo = 'hex';
                    }
                  }
                  
                  // Texto do elemento (código numérico)
                  colorData.codigoNumerico = el.textContent?.trim() || '';
                  
                  return colorData;
                });
              case 'price':
                const priceElement = document.querySelector(sel);
                if (!priceElement) return null;
                const priceText = priceElement.textContent?.trim() || '';
                const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                return priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;
              default:
                const defaultElement = document.querySelector(sel);
                if (!defaultElement) return null;
                return defaultElement.textContent?.trim() || '';
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
      await this.browserManager.wait(3000);
      
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
   * Limpeza de emergência - executa mesmo com erros
   */
  async emergencyCleanup() {
    try {
      logger.warn('Executando limpeza de emergência...');
      
      // Força fechamento do navegador
      if (this.browserManager && this.browserManager.isActive()) {
        await this.browserManager.forceClose();
      }
      
      logger.success('Limpeza de emergência concluída');
      
    } catch (error) {
      logger.error('Erro durante limpeza de emergência:', error);
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
      
      // Fecha o navegador de forma segura
      if (this.browserManager && this.browserManager.isActive()) {
        await this.browserManager.close();
      }
      
    } catch (error) {
      logger.error('Erro durante a limpeza:', error);
      // Tenta limpeza de emergência se a normal falhar
      await this.emergencyCleanup();
    }
  }
}

module.exports = BaseScraper;

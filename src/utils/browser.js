const puppeteer = require('puppeteer');
const logger = require('./logger');

class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Inicializa o navegador
   */
  async initialize(options = {}) {
    try {
  
      const defaultOptions = {
        headless: process.env.HEADLESS === 'true',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--window-size=1920,1080',   
          '--start-maximized'  
        ],
        defaultViewport: null,
        timeout: 30000
      };

      const launchOptions = { ...defaultOptions, ...options };
      
      logger.info('Iniciando navegador...');
      this.browser = await puppeteer.launch(launchOptions);
      
      logger.info('Criando nova página...');
      this.page = await this.browser.newPage();
      
      // Configurar timeouts
      this.page.setDefaultTimeout(30000);
      this.page.setDefaultNavigationTimeout(30000);
      
      // Configurar user agent
      await this.page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      );

      // Interceptar requisições para melhorar performance
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType()) && process.env.HEADLESS === 'true') {
          req.abort();
        } else {
          req.continue();
        }
      });

      logger.success('Navegador inicializado com sucesso');
      return this.page;
      
    } catch (error) {
      logger.error('Erro ao inicializar navegador:', error);
      throw error;
    }
  }

  /**
   * Navega para uma URL
   */
  async navigateTo(url, options = {}) {
    try {
      logger.info(`Navegando para: ${url}`);
      
      const defaultOptions = {
        waitUntil: 'networkidle2',
        timeout: 30000
      };
      
      const navOptions = { ...defaultOptions, ...options };
      
      await this.page.goto(url, navOptions);
      logger.success(`Navegação concluída para: ${url}`);
      
    } catch (error) {
      logger.error(`Erro ao navegar para ${url}:`, error);
      throw error;
      }
  }

  /**
   * Aguarda um elemento aparecer na página
   */
  async waitForElement(selector, options = {}) {
    try {
      const defaultOptions = {
        timeout: 10000,
        visible: true
      };
      
      const waitOptions = { ...defaultOptions, ...options };
      
      // Usa waitForSelector que é compatível com todas as versões
      await this.page.waitForSelector(selector, waitOptions);
      logger.debug(`Elemento encontrado: ${selector}`);
      
    } catch (error) {
      logger.warn(`Elemento não encontrado: ${selector}`);
      throw error;
    }
  }



  /**
   * Aguarda um elemento com timeout personalizado
   */
  async waitForElementWithTimeout(selector, timeout = 10000) {
    try {
      await this.page.waitForSelector(selector, { timeout, visible: true });
      return true;
    } catch (error) {
      logger.warn(`Timeout aguardando elemento: ${selector} (${timeout}ms)`);
      return false;
    }
  }

  /**
   * Rola a página até o final para carregar conteúdo lazy
   */
  async scrollToBottom(options = {}) {
    try {
      const defaultOptions = {
        delay: 1000,
        maxScrolls: 50,
        scrollStep: 800
      };
      
      const scrollOptions = { ...defaultOptions, ...options };
      
      logger.info('Iniciando rolagem da página...');
      
      let previousHeight = 0;
      let scrollCount = 0;
      
      while (scrollCount < scrollOptions.maxScrolls) {
        // Rola para baixo
        await this.page.evaluate((step) => {
          window.scrollBy(0, step);
        }, scrollOptions.scrollStep);
        
        // Aguarda carregamento
        await this.wait(scrollOptions.delay);
        
        // Verifica se chegou ao final
        const currentHeight = await this.page.evaluate(() => {
          return document.documentElement.scrollHeight;
        });
        
        if (currentHeight === previousHeight) {
          logger.info('Página rolada até o final');
          break;
        }
        
        previousHeight = currentHeight;
        scrollCount++;
        
        logger.progress(scrollCount, scrollOptions.maxScrolls, 'Rolando página...');
      }
      
      logger.newLine();
      logger.success(`Rolagem concluída após ${scrollCount} tentativas`);
      
    } catch (error) {
      logger.error('Erro durante a rolagem da página:', error);
      throw error;
    }
  }

  /**
   * Executa JavaScript na página
   */
  async evaluate(fn, ...args) {
    try {
      return await this.page.evaluate(fn, ...args);
    } catch (error) {
      logger.error('Erro ao executar JavaScript na página:', error);
      throw error;
    }
  }

  /**
   * Tira screenshot da página
   */
  async takeScreenshot(options = {}) {
    try {
      const defaultOptions = {
        path: `screenshot_${Date.now()}.png`,
        fullPage: true
      };
      
      const screenshotOptions = { ...defaultOptions, ...options };
      
      await this.page.screenshot(screenshotOptions);
      logger.success(`Screenshot salvo: ${screenshotOptions.path}`);
      
      return screenshotOptions.path;
      
    } catch (error) {
      logger.error('Erro ao tirar screenshot:', error);
      throw error;
    }
  }

  /**
   * Fecha o navegador
   */
  async close() {
    try {
      if (this.browser) {
        logger.info('Fechando navegador...');
        await this.browser.close();
        this.browser = null;
        this.page = null;
        logger.success('Navegador fechado com sucesso');
      }
    } catch (error) {
      logger.error('Erro ao fechar navegador:', error);
      // Tenta fechamento forçado se o normal falhar
      await this.forceClose();
    }
  }

  /**
   * Fechamento forçado do navegador
   */
  async forceClose() {
    try {
      logger.warn('Executando fechamento forçado do navegador...');
      
      if (this.page) {
        try {
          await this.page.close();
        } catch (error) {
          logger.debug('Erro ao fechar página:', error);
        }
        this.page = null;
      }
      
      if (this.browser) {
        try {
          // Tenta fechar normalmente primeiro
          await this.browser.close();
        } catch (error) {
          logger.debug('Fechamento normal falhou, tentando forçado:', error);
          
          // Fechamento forçado
          if (this.browser.process()) {
            this.browser.process().kill('SIGKILL');
          }
        }
        this.browser = null;
      }
      
      logger.success('Fechamento forçado concluído');
      
    } catch (error) {
      logger.error('Erro durante fechamento forçado:', error);
    }
  }

  /**
   * Mata todos os processos do Chrome órfãos
   */
  async killOrphanProcesses() {
    try {
      if (process.platform === 'win32') {
        // Windows
        const { exec } = require('child_process');
        exec('taskkill /f /im chrome.exe /t', (error) => {
          if (error) {
            logger.debug('Nenhum processo Chrome encontrado para matar');
          } else {
            logger.info('Processos Chrome órfãos finalizados');
          }
        });
      } else {
        // Linux/Mac
        const { exec } = require('child_process');
        exec('pkill -f chrome', (error) => {
          if (error) {
            logger.debug('Nenhum processo Chrome encontrado para matar');
          } else {
            logger.info('Processos Chrome órfãos finalizados');
          }
        });
      }
    } catch (error) {
      logger.error('Erro ao matar processos órfãos:', error);
    }
  }

  /**
   * Aguarda um tempo específico (compatível com todas as versões)
   */
  async wait(milliseconds) {
    try {
      // Tenta usar waitForTimeout se disponível
      if (this.page && typeof this.page.waitForTimeout === 'function') {
        await this.page.waitForTimeout(milliseconds);
      } else {
        // Fallback para setTimeout
        await new Promise(resolve => setTimeout(resolve, milliseconds));
      }
    } catch (error) {
      // Se waitForTimeout falhar, usa setTimeout
      await new Promise(resolve => setTimeout(resolve, milliseconds));
    }
  }

  /**
   * Verifica se o navegador está ativo
   */
  isActive() {
    return this.browser !== null && this.page !== null;
  }

  /**
   * Retorna a página atual
   */
  getPage() {
    return this.page;
  }

  /**
   * Retorna o navegador atual
   */
  getBrowser() {
    return this.browser;
  }
}

module.exports = BrowserManager;

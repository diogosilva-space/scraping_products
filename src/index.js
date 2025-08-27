#!/usr/bin/env node

require('dotenv').config();
const logger = require('./utils/logger');
const SpotGiftsScraper = require('./scrapers/spotgifts');
const XBZBrindesScraper = require('./scrapers/xbzbrindes');

/**
 * Classe principal que gerencia todos os scrapers
 */
class ScrapingManager {
  constructor() {
    this.scrapers = [
      { name: 'Spot Gifts', scraper: SpotGiftsScraper },
      { name: 'XBZ Brindes', scraper: XBZBrindesScraper }
    ];
    
    this.results = {
      total_sites: this.scrapers.length,
      sites_processados: 0,
      sites_sucesso: 0,
      sites_erro: 0,
      total_produtos: 0,
      tempo_inicio: null,
      tempo_fim: null
    };
  }

  /**
   * Executa o scraping de todos os sites
   */
  async runAll() {
    try {
      logger.title('🚀 INICIANDO SCRAPING DE TODOS OS SITES');
      this.results.tempo_inicio = new Date();
      
      logger.info(`Total de sites configurados: ${this.scrapers.length}`);
      
      for (const site of this.scrapers) {
        try {
          logger.separator();
          logger.info(`Processando site: ${site.name}`);
          
          const scraper = new site.scraper();
          await scraper.run();
          
          this.results.sites_sucesso++;
          this.results.total_produtos += scraper.products.length;
          
          logger.success(`✅ ${site.name} processado com sucesso!`);
          
        } catch (error) {
          this.results.sites_erro++;
          logger.error(`❌ Erro ao processar ${site.name}:`, error);
        } finally {
          this.results.sites_processados++;
        }
      }
      
      await this.generateFinalReport();
      
    } catch (error) {
      logger.error('Erro durante execução de todos os scrapers:', error);
      throw error;
    }
  }

  /**
   * Executa scraping de um site específico
   */
  async runSite(siteName) {
    try {
      const site = this.scrapers.find(s => 
        s.name.toLowerCase().includes(siteName.toLowerCase()) ||
        s.name.toLowerCase().replace(/\s+/g, '_').includes(siteName.toLowerCase())
      );
      
      if (!site) {
        throw new Error(`Site não encontrado: ${siteName}`);
      }
      
      logger.title(`🚀 INICIANDO SCRAPING - ${site.name}`);
      
      const scraper = new site.scraper();
      await scraper.run();
      
      logger.success(`✅ ${site.name} processado com sucesso!`);
      
      return scraper;
      
    } catch (error) {
      logger.error(`Erro ao processar site ${siteName}:`, error);
      throw error;
    }
  }

  /**
   * Lista todos os sites disponíveis
   */
  listSites() {
    logger.info('📋 Sites disponíveis para scraping:');
    this.scrapers.forEach((site, index) => {
      logger.info(`  ${index + 1}. ${site.name}`);
    });
  }

  /**
   * Gera relatório final
   */
  async generateFinalReport() {
    try {
      this.results.tempo_fim = new Date();
      const duracao = this.results.tempo_fim - this.results.tempo_inicio;
      
      logger.separator();
      logger.title('📊 RELATÓRIO FINAL');
      
      logger.info(`⏱️  Tempo total de execução: ${Math.round(duracao / 1000)}s`);
      logger.info(`🌐 Total de sites: ${this.results.total_sites}`);
      logger.info(`✅ Sites processados com sucesso: ${this.results.sites_sucesso}`);
      logger.info(`❌ Sites com erro: ${this.results.sites_erro}`);
      logger.info(`📦 Total de produtos extraídos: ${this.results.total_produtos}`);
      
      // Taxa de sucesso
      const taxaSucesso = (this.results.sites_sucesso / this.results.total_sites) * 100;
      logger.info(`📈 Taxa de sucesso: ${taxaSucesso.toFixed(1)}%`);
      
      // Produtos por site
      const produtosPorSite = this.results.total_produtos / this.results.sites_sucesso;
      logger.info(`📊 Média de produtos por site: ${produtosPorSite.toFixed(1)}`);
      
      logger.separator();
      
      if (this.results.sites_erro > 0) {
        logger.warn(`⚠️  ${this.results.sites_erro} site(s) apresentaram erros. Verifique os logs para mais detalhes.`);
      }
      
      if (this.results.sites_sucesso === this.results.total_sites) {
        logger.success('🎉 Todos os sites foram processados com sucesso!');
      }
      
    } catch (error) {
      logger.error('Erro ao gerar relatório final:', error);
    }
  }

  /**
   * Exibe ajuda
   */
  showHelp() {
    logger.info(`
📖 AJUDA - Sistema de Scraping de Produtos

Uso:
  npm start                    # Executa todos os sites
  npm run scrape:spotgifts    # Executa apenas Spot Gifts
  npm run scrape:xbzbrindes   # Executa apenas XBZ Brindes

Comandos disponíveis:
  --help, -h                  # Exibe esta ajuda
  --site <nome>               # Executa site específico
  --list                      # Lista sites disponíveis
  --all                       # Executa todos os sites

Exemplos:
  node src/index.js --site "Spot Gifts"
  node src/index.js --list
  node src/index.js --all

Configuração:
  Crie um arquivo .env na raiz do projeto com as credenciais necessárias.
  Veja o README.md para mais detalhes.
    `);
  }

  /**
   * Processa argumentos da linha de comando
   */
  async processArguments() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // Sem argumentos, executa todos os sites
      await this.runAll();
      return;
    }
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--help':
        case '-h':
          this.showHelp();
          break;
          
        case '--list':
          this.listSites();
          break;
          
        case '--site':
          if (i + 1 < args.length) {
            const siteName = args[i + 1];
            await this.runSite(siteName);
            i++; // Pula o próximo argumento
          } else {
            logger.error('--site requer um nome de site');
            this.showHelp();
          }
          break;
          
        case '--all':
          await this.runAll();
          break;
          
        default:
          logger.warn(`Argumento desconhecido: ${arg}`);
          this.showHelp();
          break;
      }
    }
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    const manager = new ScrapingManager();
    
    // Verifica se há argumentos de linha de comando
    if (process.argv.length > 2) {
      await manager.processArguments();
    } else {
      // Execução padrão
      await manager.runAll();
    }
    
  } catch (error) {
    logger.error('Erro fatal na aplicação:', error);
    process.exit(1);
  }
}

// Executa se for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = ScrapingManager;

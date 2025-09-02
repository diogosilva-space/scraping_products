const ApiClient = require('./apiClient');
const logger = require('./logger');
const fs = require('fs-extra');
const path = require('path');

/**
 * Gerenciador de sincronização entre scraping local e API
 * Coordena o processo de envio dos produtos extraídos para a nuvem
 */
class SyncManager {
  constructor(config = {}) {
    this.apiClient = new ApiClient(config.api);
    this.config = {
      // Configurações de sincronização
      autoSync: config.autoSync !== false, // Sincroniza automaticamente por padrão
      syncAfterScraping: config.syncAfterScraping !== false, // Sincroniza após scraping
      syncExisting: config.syncExisting !== false, // Sincroniza produtos existentes
      
      // Configurações de lote
      batchSize: config.batchSize || 10,
      delayBetweenBatches: config.delayBetweenBatches || 2000,
      continueOnError: config.continueOnError !== false,
      
      // Configurações de arquivos
      outputDir: config.outputDir || 'output',
      syncLogFile: config.syncLogFile || 'sync_log.json',
      
      // Configurações de validação
      validateBeforeSync: config.validateBeforeSync !== false,
      skipInvalidProducts: config.skipInvalidProducts !== false,
      
      ...config
    };
    
    this.syncStats = {
      totalProcessed: 0,
      totalSynced: 0,
      totalErrors: 0,
      totalSkipped: 0,
      lastSync: null,
      syncHistory: []
    };
  }

  /**
   * Inicializa o gerenciador de sincronização
   */
  async initialize() {
    try {
      logger.info('🚀 Inicializando gerenciador de sincronização...');
      
      // Testa conexão com a API
      const connectionTest = await this.apiClient.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Falha na conexão com a API: ${connectionTest.error}`);
      }
      
      // Carrega estatísticas de sincronização anteriores
      await this.loadSyncStats();
      
      logger.success('✅ Gerenciador de sincronização inicializado');
      return true;
      
    } catch (error) {
      logger.error('❌ Erro ao inicializar sincronização:', error.message);
      throw error;
    }
  }

  /**
   * Sincroniza produtos após o scraping (upload direto para API)
   */
  async syncAfterScraping(products, scraperName) {
    try {
      if (!this.config.syncAfterScraping) {
        logger.info('⏭️ Sincronização automática desabilitada');
        return { skipped: true, reason: 'Sincronização automática desabilitada' };
      }

      logger.title(`🚀 UPLOAD DIRETO PARA API - ${scraperName}`);
      logger.info(`📦 ${products.length} produtos para enviar para a API`);
      
      // Filtra produtos válidos se necessário
      let productsToSync = products;
      if (this.config.validateBeforeSync) {
        productsToSync = products.filter(product => product.isValid());
        logger.info(`✅ ${productsToSync.length} produtos válidos para upload`);
      }
      
      if (productsToSync.length === 0) {
        logger.warn('⚠️ Nenhum produto válido para upload');
        return { skipped: true, reason: 'Nenhum produto válido' };
      }

      // Executa upload direto para API
      const syncResult = await this.syncProducts(productsToSync, {
        source: scraperName,
        type: 'post_scraping'
      });

      // Atualiza estatísticas
      this.updateSyncStats(syncResult);
      
      // Salva log de sincronização
      await this.saveSyncLog(syncResult, scraperName);
      
      return syncResult;
      
    } catch (error) {
      logger.error('❌ Erro durante sincronização pós-scraping:', error.message);
      throw error;
    }
  }

  /**
   * Sincroniza produtos existentes de arquivos locais
   */
  async syncExistingProducts(scraperName = null) {
    try {
      logger.title('🔄 SINCRONIZANDO PRODUTOS EXISTENTES');
      
      // Busca arquivos de produtos
      const productFiles = await this.findProductFiles(scraperName);
      
      if (productFiles.length === 0) {
        logger.warn('⚠️ Nenhum arquivo de produtos encontrado');
        return { skipped: true, reason: 'Nenhum arquivo encontrado' };
      }

      let allProducts = [];
      
      // Carrega produtos de cada arquivo
      for (const file of productFiles) {
        try {
          const products = await this.loadProductsFromFile(file);
          allProducts = allProducts.concat(products);
          logger.info(`📁 ${products.length} produtos carregados de ${path.basename(file)}`);
        } catch (error) {
          logger.error(`❌ Erro ao carregar arquivo ${file}:`, error.message);
        }
      }

      if (allProducts.length === 0) {
        logger.warn('⚠️ Nenhum produto carregado dos arquivos');
        return { skipped: true, reason: 'Nenhum produto carregado' };
      }

      // Remove duplicatas por referência
      const uniqueProducts = this.removeDuplicates(allProducts);
      logger.info(`🔄 ${uniqueProducts.length} produtos únicos para sincronizar`);

      // Executa sincronização
      const syncResult = await this.syncProducts(uniqueProducts, {
        source: 'existing_files',
        type: 'manual_sync'
      });

      // Atualiza estatísticas
      this.updateSyncStats(syncResult);
      
      // Salva log de sincronização
      await this.saveSyncLog(syncResult, 'existing_files');
      
      return syncResult;
      
    } catch (error) {
      logger.error('❌ Erro durante sincronização de produtos existentes:', error.message);
      throw error;
    }
  }

  /**
   * Faz upload direto de produtos para a API
   */
  async syncProducts(products, metadata = {}) {
    try {
      const startTime = new Date();
      logger.info(`🚀 Iniciando upload direto de ${products.length} produtos para a API...`);

      // Callback de progresso
      const progressCallback = (progress) => {
        logger.progress(
          progress.current, 
          progress.total, 
          `Enviando lote ${progress.batch}/${progress.totalBatches} para API (${progress.percentage}%)`
        );
      };

      // Executa upload direto para API em lote
      const batchResult = await this.apiClient.createProductsBatch(products, {
        batchSize: this.config.batchSize,
        delayBetweenBatches: this.config.delayBetweenBatches,
        continueOnError: this.config.continueOnError,
        progressCallback
      });

      const endTime = new Date();
      const duration = endTime - startTime;

      // Prepara resultado
      const result = {
        ...batchResult,
        metadata,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration.getTime(),
        durationFormatted: this.formatDuration(duration)
      };

      // Log do resultado
      logger.newLine();
      logger.success(`✅ Upload para API concluído em ${result.durationFormatted}`);
      logger.info(`📊 Resultado: ${result.success} produtos enviados, ${result.errors} erros`);
      
      if (result.errors > 0) {
        logger.warn(`⚠️ ${result.errors} produtos com erro durante upload`);
      }

      return result;
      
    } catch (error) {
      logger.error('❌ Erro durante upload para API:', error.message);
      throw error;
    }
  }

  /**
   * Busca arquivos de produtos no diretório de saída
   */
  async findProductFiles(scraperName = null) {
    try {
      const outputPath = path.resolve(this.config.outputDir);
      
      if (!await fs.pathExists(outputPath)) {
        return [];
      }

      const files = await fs.readdir(outputPath);
      const productFiles = files
        .filter(file => file.endsWith('.json') && file.includes('_'))
        .filter(file => {
          if (scraperName) {
            return file.toLowerCase().includes(scraperName.toLowerCase().replace(/\s+/g, '_'));
          }
          return true;
        })
        .map(file => path.join(outputPath, file))
        .sort((a, b) => {
          // Ordena por data de modificação (mais recente primeiro)
          return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
        });

      return productFiles;
      
    } catch (error) {
      logger.error('❌ Erro ao buscar arquivos de produtos:', error.message);
      return [];
    }
  }

  /**
   * Carrega produtos de um arquivo JSON
   */
  async loadProductsFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Suporta diferentes formatos de arquivo
      if (Array.isArray(data)) {
        return data;
      } else if (data.products && Array.isArray(data.products)) {
        return data.products;
      } else if (data.produtos && Array.isArray(data.produtos)) {
        return data.produtos;
      } else {
        logger.warn(`⚠️ Formato de arquivo não reconhecido: ${path.basename(filePath)}`);
        return [];
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao carregar arquivo ${path.basename(filePath)}:`, error.message);
      return [];
    }
  }

  /**
   * Remove produtos duplicados por referência
   */
  removeDuplicates(products) {
    const seen = new Set();
    const unique = [];
    
    for (const product of products) {
      if (product.referencia && !seen.has(product.referencia)) {
        seen.add(product.referencia);
        unique.push(product);
      }
    }
    
    return unique;
  }

  /**
   * Atualiza estatísticas de sincronização
   */
  updateSyncStats(syncResult) {
    this.syncStats.totalProcessed += syncResult.total;
    this.syncStats.totalSynced += syncResult.success;
    this.syncStats.totalErrors += syncResult.errors;
    this.syncStats.lastSync = new Date().toISOString();
    
    this.syncStats.syncHistory.push({
      timestamp: new Date().toISOString(),
      ...syncResult
    });
    
    // Mantém apenas os últimos 100 registros
    if (this.syncStats.syncHistory.length > 100) {
      this.syncStats.syncHistory = this.syncStats.syncHistory.slice(-100);
    }
  }

  /**
   * Salva log de sincronização
   */
  async saveSyncLog(syncResult, source) {
    try {
      const logPath = path.join(this.config.outputDir, this.config.syncLogFile);
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        source,
        ...syncResult
      };

      // Carrega log existente ou cria novo
      let existingLog = [];
      if (await fs.pathExists(logPath)) {
        try {
          const content = await fs.readFile(logPath, 'utf8');
          existingLog = JSON.parse(content);
        } catch (error) {
          logger.warn('⚠️ Erro ao carregar log existente, criando novo');
        }
      }

      // Adiciona nova entrada
      existingLog.push(logEntry);

      // Salva log atualizado
      await fs.writeFile(logPath, JSON.stringify(existingLog, null, 2));
      
      logger.debug(`📝 Log de sincronização salvo: ${logPath}`);
      
    } catch (error) {
      logger.error('❌ Erro ao salvar log de sincronização:', error.message);
    }
  }

  /**
   * Carrega estatísticas de sincronização
   */
  async loadSyncStats() {
    try {
      const logPath = path.join(this.config.outputDir, this.config.syncLogFile);
      
      if (await fs.pathExists(logPath)) {
        const content = await fs.readFile(logPath, 'utf8');
        const log = JSON.parse(content);
        
        // Calcula estatísticas totais
        this.syncStats.totalProcessed = log.reduce((sum, entry) => sum + (entry.total || 0), 0);
        this.syncStats.totalSynced = log.reduce((sum, entry) => sum + (entry.success || 0), 0);
        this.syncStats.totalErrors = log.reduce((sum, entry) => sum + (entry.errors || 0), 0);
        
        if (log.length > 0) {
          this.syncStats.lastSync = log[log.length - 1].timestamp;
        }
        
        this.syncStats.syncHistory = log.slice(-100); // Últimos 100 registros
      }
      
    } catch (error) {
      logger.warn('⚠️ Erro ao carregar estatísticas de sincronização:', error.message);
    }
  }

  /**
   * Exibe estatísticas de sincronização
   */
  showStats() {
    logger.separator();
    logger.title('📊 ESTATÍSTICAS DE SINCRONIZAÇÃO');
    
    logger.info(`📦 Total processado: ${this.syncStats.totalProcessed}`);
    logger.info(`✅ Total sincronizado: ${this.syncStats.totalSynced}`);
    logger.info(`❌ Total de erros: ${this.syncStats.totalErrors}`);
    
    if (this.syncStats.lastSync) {
      const lastSync = new Date(this.syncStats.lastSync);
      logger.info(`🕐 Última sincronização: ${lastSync.toLocaleString('pt-BR')}`);
    }
    
    // Taxa de sucesso
    if (this.syncStats.totalProcessed > 0) {
      const successRate = (this.syncStats.totalSynced / this.syncStats.totalProcessed) * 100;
      logger.info(`📈 Taxa de sucesso: ${successRate.toFixed(1)}%`);
    }
    
    logger.separator();
  }

  /**
   * Formata duração em formato legível
   */
  formatDuration(duration) {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Limpa recursos e fecha conexões
   */
  async cleanup() {
    try {
      await this.apiClient.cleanup();
      logger.info('🧹 Recursos de sincronização limpos');
    } catch (error) {
      logger.error('Erro durante limpeza da sincronização:', error);
    }
  }
}

module.exports = SyncManager;

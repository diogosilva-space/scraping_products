const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const Product = require('../models/Product');
const ReferenceManager = require('./referenceManager');

class DataManager {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'output');
    this.referenceManager = new ReferenceManager();
    this.ensureOutputDirectory();
  }

  /**
   * Garante que o diretório de saída existe
   */
  async ensureOutputDirectory() {
    try {
      await fs.ensureDir(this.outputDir);
    } catch (error) {
      logger.error('Erro ao criar diretório de saída:', error);
    }
  }

  /**
   * Salva produtos em arquivo JSON
   */
  async saveProducts(products, filename, siteName) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, '_');
      const filepath = path.join(this.outputDir, `${safeFilename}_${timestamp}.json`);
      
      // Converte produtos para objetos
      const productsData = products.map(product => {
        if (product instanceof Product) {
          return product.toObject();
        }
        return product;
      });

      // Adiciona metadados
      const outputData = {
        metadata: {
          site: siteName,
          total_produtos: productsData.length,
          data_extracao: new Date().toISOString(),
          versao: '1.0.0'
        },
        produtos: productsData
      };

      await fs.writeJson(filepath, outputData, { spaces: 2 });
      logger.success(`Dados salvos em: ${filepath}`);
      
      return filepath;
      
    } catch (error) {
      logger.error('Erro ao salvar produtos:', error);
      throw error;
    }
  }

  /**
   * Salva estatísticas da extração
   */
  async saveStats(stats, filename, siteName) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, '_');
      const filepath = path.join(this.outputDir, `${safeFilename}_stats_${timestamp}.json`);
      
      const statsData = {
        metadata: {
          site: siteName,
          data_extracao: new Date().toISOString(),
          versao: '1.0.0'
        },
        estatisticas: stats
      };

      await fs.writeJson(filepath, statsData, { spaces: 2 });
      logger.success(`Estatísticas salvas em: ${filepath}`);
      
      return filepath;
      
    } catch (error) {
      logger.error('Erro ao salvar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Carrega produtos de um arquivo JSON
   */
  async loadProducts(filepath) {
    try {
      const data = await fs.readJson(filepath);
      
      if (data.produtos && Array.isArray(data.produtos)) {
        const products = data.produtos.map(productData => new Product(productData));
        logger.success(`Produtos carregados de: ${filepath}`);
        return products;
      } else {
        logger.warn('Arquivo não contém produtos válidos');
        return [];
      }
      
    } catch (error) {
      logger.error('Erro ao carregar produtos:', error);
      throw error;
    }
  }

  /**
   * Lista todos os arquivos de saída
   */
  async listOutputFiles() {
    try {
      const files = await fs.readdir(this.outputDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      logger.info(`Arquivos de saída encontrados: ${jsonFiles.length}`);
      return jsonFiles.map(file => path.join(this.outputDir, file));
      
    } catch (error) {
      logger.error('Erro ao listar arquivos de saída:', error);
      return [];
    }
  }

  /**
   * Remove arquivos antigos (mais de X dias)
   */
  async cleanupOldFiles(daysToKeep = 7) {
    try {
      const files = await this.listOutputFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      let removedCount = 0;
      
      for (const filepath of files) {
        const stats = await fs.stat(filepath);
        if (stats.mtime < cutoffDate) {
          await fs.remove(filepath);
          removedCount++;
          logger.debug(`Arquivo removido: ${path.basename(filepath)}`);
        }
      }
      
      if (removedCount > 0) {
        logger.info(`${removedCount} arquivos antigos removidos`);
      } else {
        logger.info('Nenhum arquivo antigo encontrado para remoção');
      }
      
    } catch (error) {
      logger.error('Erro ao limpar arquivos antigos:', error);
    }
  }

  /**
   * Valida produtos e retorna estatísticas
   */
  validateProducts(products) {
    const stats = {
      total: products.length,
      validos: 0,
      invalidos: 0,
      campos_faltando: {},
      produtos_invalidos: [],
      referencias_invalidas: []
    };

    // Valida referências com prefixos
    const referenceValidation = this.referenceManager.validateProductReferences(products);
    if (!referenceValidation.valid) {
      stats.referencias_invalidas = referenceValidation.errors;
      logger.warn(`Encontradas ${referenceValidation.errors.length} referências inválidas`);
    }

    products.forEach((product, index) => {
      if (product.isValid()) {
        stats.validos++;
      } else {
        stats.invalidos++;
        const missingFields = product.getMissingFields();
        
        missingFields.forEach(field => {
          stats.campos_faltando[field] = (stats.campos_faltando[field] || 0) + 1;
        });
        
        stats.produtos_invalidos.push({
          index,
          referencia: product.referencia || 'N/A',
          campos_faltando: missingFields
        });
      }
    });

    // Adiciona estatísticas de referências
    stats.referenceStats = this.referenceManager.getReferenceStats(
      products.map(p => p.referencia).filter(Boolean)
    );

    return stats;
  }

  /**
   * Exporta produtos para CSV
   */
  async exportToCSV(products, filename, siteName) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, '_');
      const filepath = path.join(this.outputDir, `${safeFilename}_${timestamp}.csv`);
      
      // Cabeçalho CSV
      const headers = [
        'referencia',
        'nome',
        'descricao',
        'cores',
        'imagens',
        'categorias',
        'informacoes_adicionais',
        'preco',
        'url_produto',
        'data_extracao',
        'site_origem'
      ];
      
      let csvContent = headers.join(',') + '\n';
      
      // Dados dos produtos
      products.forEach(product => {
        const row = headers.map(header => {
          let value = product[header];
          
          if (Array.isArray(value)) {
            value = value.join('; ');
          }
          
          // Escapar vírgulas e aspas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value || '';
        });
        
        csvContent += row.join(',') + '\n';
      });
      
      await fs.writeFile(filepath, csvContent, 'utf8');
      logger.success(`CSV exportado para: ${filepath}`);
      
      return filepath;
      
    } catch (error) {
      logger.error('Erro ao exportar para CSV:', error);
      throw error;
    }
  }

  /**
   * Cria relatório de resumo
   */
  async createSummaryReport(products, stats, siteName) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeFilename = siteName.replace(/[^a-zA-Z0-9]/g, '_');
      const filepath = path.join(this.outputDir, `${safeFilename}_resumo_${timestamp}.txt`);
      
      let report = `RELATÓRIO DE EXTRAÇÃO - ${siteName.toUpperCase()}\n`;
      report += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
      report += '='.repeat(50) + '\n\n';
      
      report += `Total de produtos: ${stats.total}\n`;
      report += `Produtos válidos: ${stats.validos}\n`;
      report += `Produtos inválidos: ${stats.invalidos}\n`;
      report += `Taxa de sucesso: ${((stats.validos / stats.total) * 100).toFixed(2)}%\n\n`;
      
      if (stats.campos_faltando && Object.keys(stats.campos_faltando).length > 0) {
        report += 'Campos mais faltando:\n';
        Object.entries(stats.campos_faltando)
          .sort(([,a], [,b]) => b - a)
          .forEach(([field, count]) => {
            report += `  ${field}: ${count} produtos\n`;
          });
        report += '\n';
      }
      
      if (stats.produtos_invalidos.length > 0) {
        report += 'Produtos com problemas:\n';
        stats.produtos_invalidos.slice(0, 10).forEach(prod => {
          report += `  Ref: ${prod.referencia} - Campos faltando: ${prod.campos_faltando.join(', ')}\n`;
        });
        if (stats.produtos_invalidos.length > 10) {
          report += `  ... e mais ${stats.produtos_invalidos.length - 10} produtos\n`;
        }
      }
      
      await fs.writeFile(filepath, report, 'utf8');
      logger.success(`Relatório de resumo criado: ${filepath}`);
      
      return filepath;
      
    } catch (error) {
      logger.error('Erro ao criar relatório de resumo:', error);
      throw error;
    }
  }
}

module.exports = DataManager;

#!/usr/bin/env node

require('dotenv').config();
const SiteAnalyzer = require('./utils/siteAnalyzer');
const logger = require('./utils/logger');

/**
 * Script para analisar sites e gerar configurações otimizadas
 */
async function analyzeAllSites() {
  try {
    logger.title('🔍 ANÁLISE AUTOMÁTICA DE SITES');
    
    const sites = [
      {
        name: 'Spot Gifts',
        url: 'https://www.spotgifts.com.br/pt/catalogo/'
      },
      {
        name: 'XBZ Brindes',
        url: 'https://www.xbzbrindes.com.br/'
      }
    ];
    
    const analyzer = new SiteAnalyzer();
    
    for (const site of sites) {
      try {
        logger.separator();
        logger.info(`Analisando: ${site.name}`);
        
        const analysis = await analyzer.analyzeSite(site.url, site.name);
        
        // Exibe resumo da análise
        logger.info(`📊 Resumo da análise de ${site.name}:`);
        logger.info(`  - Produtos encontrados: ${analysis.selectors.productContainers.length > 0 ? analysis.selectors.productContainers[0].count : 0}`);
        logger.info(`  - Links de produtos: ${analysis.selectors.productLinks.length > 0 ? analysis.selectors.productLinks[0].count : 0}`);
        logger.info(`  - Imagens: ${analysis.selectors.productImages.length > 0 ? analysis.selectors.productImages[0].count : 0}`);
        logger.info(`  - Nomes: ${analysis.selectors.productNames.length > 0 ? analysis.selectors.productNames[0].count : 0}`);
        logger.info(`  - Preços: ${analysis.selectors.productPrices.length > 0 ? analysis.selectors.productPrices[0].count : 0}`);
        logger.info(`  - Referências: ${analysis.selectors.productReferences.length > 0 ? analysis.selectors.productReferences[0].count : 0}`);
        
        // Exibe recomendações principais
        if (analysis.recommendations.length > 0) {
          logger.info(`💡 Recomendações principais:`);
          analysis.recommendations
            .filter(r => r.priority === 'high')
            .slice(0, 3)
            .forEach(rec => {
              logger.info(`  - ${rec.message}`);
            });
        }
        
        logger.success(`✅ ${site.name} analisado com sucesso`);
        
      } catch (error) {
        logger.error(`❌ Erro ao analisar ${site.name}:`, error);
      }
    }
    
    logger.separator();
    logger.success('🎉 Análise de todos os sites concluída!');
    logger.info('Verifique a pasta "analysis" para os relatórios detalhados.');
    
  } catch (error) {
    logger.error('❌ Erro durante análise dos sites:', error);
    throw error;
  }
}

/**
 * Analisa um site específico
 */
async function analyzeSpecificSite(siteName) {
  try {
    const sites = {
      'spotgifts': {
        name: 'Spot Gifts',
        url: 'https://www.spotgifts.com.br/pt/catalogo/'
      },
      'xbzbrindes': {
        name: 'XBZ Brindes',
        url: 'https://www.xbzbrindes.com.br/'
      }
    };
    
    const site = sites[siteName.toLowerCase()];
    if (!site) {
      throw new Error(`Site não encontrado: ${siteName}. Sites disponíveis: ${Object.keys(sites).join(', ')}`);
    }
    
    logger.title(`🔍 ANÁLISE DO SITE: ${site.name}`);
    
    const analyzer = new SiteAnalyzer();
    const analysis = await analyzer.analyzeSite(site.url, site.name);
    
    // Exibe análise detalhada
    logger.separator();
    logger.title('📊 ANÁLISE DETALHADA');
    
    // Seletores encontrados
    logger.info('🎯 Seletores encontrados:');
    Object.entries(analysis.selectors).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        logger.info(`  ${key}:`);
        value.slice(0, 2).forEach(item => {
          logger.info(`    - ${item.selector} (${item.count} encontrados)`);
        });
      }
    });
    
    // Recomendações
    if (analysis.recommendations.length > 0) {
      logger.info('💡 Recomendações:');
      analysis.recommendations.forEach(rec => {
        const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        logger.info(`  ${icon} ${rec.message}`);
      });
    }
    
    logger.success(`✅ Análise de ${site.name} concluída!`);
    
  } catch (error) {
    logger.error('❌ Erro durante análise:', error);
    throw error;
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // Sem argumentos, analisa todos os sites
      await analyzeAllSites();
    } else {
      const command = args[0];
      
      switch (command) {
        case '--all':
        case 'all':
          await analyzeAllSites();
          break;
          
        case '--site':
        case 'site':
          if (args.length < 2) {
            logger.error('--site requer um nome de site');
            logger.info('Sites disponíveis: spotgifts, xbzbrindes');
            return;
          }
          await analyzeSpecificSite(args[1]);
          break;
          
        case '--help':
        case '-h':
        case 'help':
          logger.info(`
🔍 ANALISADOR DE SITES - AJUDA

Uso:
  node src/analyze-sites.js                    # Analisa todos os sites
  node src/analyze-sites.js --all              # Analisa todos os sites
  node src/analyze-sites.js --site <nome>      # Analisa site específico

Sites disponíveis:
  spotgifts    - Spot Gifts
  xbzbrindes   - XBZ Brindes

Exemplos:
  node src/analyze-sites.js
  node src/analyze-sites.js --site spotgifts
  node src/analyze-sites.js --site xbzbrindes

Saída:
  Os relatórios são salvos na pasta "analysis" com timestamp.
          `);
          break;
          
        default:
          logger.warn(`Comando desconhecido: ${command}`);
          logger.info('Use --help para ver as opções disponíveis');
          break;
      }
    }
    
  } catch (error) {
    logger.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executa se for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  analyzeAllSites,
  analyzeSpecificSite
};

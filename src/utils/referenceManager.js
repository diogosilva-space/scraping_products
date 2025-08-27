/**
 * Utilitário para gerenciar referências com prefixos de sites
 */
class ReferenceManager {
  constructor() {
    this.sitePrefixes = {
      'Spot Gifts': 'SP-',
      'XBZ Brindes': 'XB-'
    };
  }

  /**
   * Adiciona prefixo do site na referência
   */
  addSitePrefix(reference, siteName) {
    if (!reference || !siteName) return reference;
    
    const prefix = this.sitePrefixes[siteName];
    if (prefix && !reference.startsWith(prefix)) {
      return `${prefix}${reference}`;
    }
    
    return reference;
  }

  /**
   * Remove prefixo do site da referência
   */
  removeSitePrefix(reference, siteName) {
    if (!reference || !siteName) return reference;
    
    const prefix = this.sitePrefixes[siteName];
    if (prefix && reference.startsWith(prefix)) {
      return reference.substring(prefix.length);
    }
    
    return reference;
  }

  /**
   * Identifica o site baseado no prefixo da referência
   */
  identifySiteByReference(reference) {
    if (!reference) return null;
    
    for (const [siteName, prefix] of Object.entries(this.sitePrefixes)) {
      if (reference.startsWith(prefix)) {
        return siteName;
      }
    }
    
    return null;
  }

  /**
   * Valida se a referência tem o prefixo correto para o site
   */
  validateReferencePrefix(reference, siteName) {
    if (!reference || !siteName) return false;
    
    const prefix = this.sitePrefixes[siteName];
    if (!prefix) return false;
    
    return reference.startsWith(prefix);
  }

  /**
   * Normaliza referência (remove prefixo se existir e adiciona o correto)
   */
  normalizeReference(reference, siteName) {
    if (!reference || !siteName) return reference;
    
    // Remove qualquer prefixo existente
    let cleanReference = reference;
    for (const prefix of Object.values(this.sitePrefixes)) {
      if (cleanReference.startsWith(prefix)) {
        cleanReference = cleanReference.substring(prefix.length);
        break;
      }
    }
    
    // Adiciona o prefixo correto do site
    return this.addSitePrefix(cleanReference, siteName);
  }

  /**
   * Gera lista de referências com prefixos para um site
   */
  generateReferencesWithPrefix(references, siteName) {
    if (!Array.isArray(references) || !siteName) return references;
    
    return references.map(ref => this.addSitePrefix(ref, siteName));
  }

  /**
   * Filtra referências por site
   */
  filterReferencesBySite(references, siteName) {
    if (!Array.isArray(references) || !siteName) return [];
    
    const prefix = this.sitePrefixes[siteName];
    if (!prefix) return [];
    
    return references.filter(ref => ref && ref.startsWith(prefix));
  }

  /**
   * Estatísticas de referências por site
   */
  getReferenceStats(references) {
    if (!Array.isArray(references)) return {};
    
    const stats = {};
    
    for (const reference of references) {
      if (!reference) continue;
      
      const siteName = this.identifySiteByReference(reference);
      if (siteName) {
        stats[siteName] = (stats[siteName] || 0) + 1;
      } else {
        stats['sem_prefixo'] = (stats['sem_prefixo'] || 0) + 1;
      }
    }
    
    return stats;
  }

  /**
   * Converte referências para formato de consulta
   */
  convertToQueryFormat(references, targetSite) {
    if (!Array.isArray(references) || !targetSite) return references;
    
    return references.map(ref => {
      const originalSite = this.identifySiteByReference(ref);
      if (originalSite && originalSite !== targetSite) {
        // Converte referência de outro site para o site alvo
        return this.normalizeReference(ref, targetSite);
      }
      return ref;
    });
  }

  /**
   * Valida consistência de referências em um conjunto de produtos
   */
  validateProductReferences(products) {
    if (!Array.isArray(products)) return { valid: false, errors: [] };
    
    const errors = [];
    const sitePrefixes = {};
    
    for (const product of products) {
      if (!product.referencia || !product.site_origem) {
        errors.push(`Produto sem referência ou site: ${JSON.stringify(product)}`);
        continue;
      }
      
      const expectedPrefix = this.sitePrefixes[product.site_origem];
      if (!expectedPrefix) {
        errors.push(`Site não reconhecido: ${product.site_origem}`);
        continue;
      }
      
      if (!product.referencia.startsWith(expectedPrefix)) {
        errors.push(`Referência ${product.referencia} não tem prefixo ${expectedPrefix} para site ${product.site_origem}`);
        continue;
      }
      
      // Registra prefixo usado
      sitePrefixes[product.site_origem] = expectedPrefix;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      sitePrefixes,
      totalProducts: products.length,
      validProducts: products.length - errors.length
    };
  }
}

module.exports = ReferenceManager;

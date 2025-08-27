/**
 * Modelo de dados para produtos extraídos
 */
class Product {
  constructor(data = {}) {
    this.referencia = data.referencia || '';
    this.nome = data.nome || '';
    this.descricao = data.descricao || '';
    this.cores = data.cores || [];
    this.imagens = data.imagens || [];
    this.categorias = data.categorias || [];
    this.informacoes_adicionais = data.informacoes_adicionais || '';
    this.preco = data.preco || null;
    this.url_produto = data.url_produto || '';
    this.data_extracao = data.data_extracao || new Date().toISOString();
    this.site_origem = data.site_origem || '';
  }

  /**
   * Valida se o produto tem todos os campos obrigatórios
   */
  isValid() {
    return (
      this.referencia &&
      this.nome &&
      this.descricao &&
      this.cores.length > 0 &&
      this.imagens.length > 0
    );
  }

  /**
   * Retorna os campos obrigatórios que estão faltando
   */
  getMissingFields() {
    const missing = [];
    
    if (!this.referencia) missing.push('referencia');
    if (!this.nome) missing.push('nome');
    if (!this.descricao) missing.push('descricao');
    if (this.cores.length === 0) missing.push('cores');
    if (this.imagens.length === 0) missing.push('imagens');
    
    return missing;
  }

  /**
   * Converte para objeto plano
   */
  toObject() {
    return {
      referencia: this.referencia,
      nome: this.nome,
      descricao: this.descricao,
      cores: this.cores,
      imagens: this.imagens,
      categorias: this.categorias,
      informacoes_adicionais: this.informacoes_adicionais,
      preco: this.preco,
      url_produto: this.url_produto,
      data_extracao: this.data_extracao,
      site_origem: this.site_origem
    };
  }

  /**
   * Converte para JSON
   */
  toJSON() {
    return JSON.stringify(this.toObject(), null, 2);
  }

  /**
   * Cria um produto a partir de dados JSON
   */
  static fromJSON(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      return new Product(data);
    } catch (error) {
      throw new Error(`Erro ao criar produto a partir de JSON: ${error.message}`);
    }
  }
}

module.exports = Product;

/**
 * Configurações da API da djob.com.br
 * Configure as credenciais no arquivo .env
 */

module.exports = {
  // URL base da API
  baseURL: process.env.DJOB_API_BASE_URL || 'https://api.djob.com.br/wp-json/api/v1',
  
  // Credenciais de acesso
  username: process.env.DJOB_USERNAME,
  password: process.env.DJOB_PASSWORD,
  
  // Configurações de timeout e retry
  timeout: parseInt(process.env.DJOB_API_TIMEOUT) || 30000,
  maxRetries: parseInt(process.env.DJOB_API_MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.DJOB_API_RETRY_DELAY) || 1000,
  
  // Configurações de rate limiting
  rateLimit: {
    requestsPerMinute: parseInt(process.env.DJOB_API_RATE_LIMIT) || 60,
    delayBetweenRequests: parseInt(process.env.DJOB_API_REQUEST_DELAY) || 1000
  },
  
  // Configurações de sincronização
  sync: {
    // Sincronização automática após scraping
    autoSync: process.env.DJOB_AUTO_SYNC !== 'false',
    
    // Sincronização após scraping
    syncAfterScraping: process.env.DJOB_SYNC_AFTER_SCRAPING !== 'false',
    
    // Sincronização de produtos existentes
    syncExisting: process.env.DJOB_SYNC_EXISTING !== 'false',
    
    // Tamanho do lote para envio
    batchSize: parseInt(process.env.DJOB_BATCH_SIZE) || 10,
    
    // Delay entre lotes (ms)
    delayBetweenBatches: parseInt(process.env.DJOB_BATCH_DELAY) || 2000,
    
    // Continuar em caso de erro
    continueOnError: process.env.DJOB_CONTINUE_ON_ERROR !== 'false',
    
    // Validar produtos antes da sincronização
    validateBeforeSync: process.env.DJOB_VALIDATE_BEFORE_SYNC !== 'false',
    
    // Pular produtos inválidos
    skipInvalidProducts: process.env.DJOB_SKIP_INVALID !== 'false'
  },
  
  // Configurações de produtos
  products: {
    // Campos obrigatórios para criação
    requiredFields: ['referencia', 'nome', 'descricao', 'preco', 'categorias'],
    
    // Campos opcionais
    optionalFields: ['cores', 'imagens', 'informacoes_adicionais'],
    
    // Mapeamento de campos da API para o modelo local
    fieldMapping: {
      referencia: 'referencia',
      nome: 'nome',
      descricao: 'descricao',
      preco: 'preco',
      categorias: 'categorias',
      cores: 'cores',
      imagens: 'imagens'
    },
    
    // Validações específicas
    validation: {
      // Preço mínimo
      minPrice: parseFloat(process.env.DJOB_MIN_PRICE) || 0,
      
      // Comprimento máximo do nome
      maxNameLength: parseInt(process.env.DJOB_MAX_NAME_LENGTH) || 255,
      
      // Comprimento máximo da descrição
      maxDescriptionLength: parseInt(process.env.DJOB_MAX_DESCRIPTION_LENGTH) || 1000
    }
  },
  
  // Configurações de logs e monitoramento
  logging: {
    // Nível de log para API
    level: process.env.DJOB_LOG_LEVEL || 'info',
    
    // Log de todas as requisições
    logRequests: process.env.DJOB_LOG_REQUESTS !== 'false',
    
    // Log de respostas
    logResponses: process.env.DJOB_LOG_RESPONSES !== 'false',
    
    // Log de erros detalhado
    detailedErrors: process.env.DJOB_DETAILED_ERRORS !== 'false'
  },
  
  // Configurações de desenvolvimento
  development: {
    // Modo de teste (não envia dados reais)
    testMode: process.env.DJOB_TEST_MODE === 'true',
    
    // Simular respostas da API
    mockResponses: process.env.DJOB_MOCK_RESPONSES === 'true',
    
    // Delay artificial para simular latência
    artificialDelay: parseInt(process.env.DJOB_ARTIFICIAL_DELAY) || 0
  }
};

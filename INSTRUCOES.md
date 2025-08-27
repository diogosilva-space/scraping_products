# 📋 INSTRUÇÕES DE USO - Sistema de Scraping de Produtos

## 🚀 Primeiros Passos

### 1. Instalação das Dependências

```bash
# Instale todas as dependências
npm install

# Instale o navegador Chrome para o Puppeteer
npx puppeteer browsers install chrome
```

### 2. Configuração do Ambiente

```bash
# Copie o arquivo de exemplo de variáveis de ambiente
cp env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

**Exemplo de configuração no .env:**
```env
# Configurações gerais
HEADLESS=true
DELAY_BETWEEN_REQUESTS=1000
MAX_RETRIES=3

# Credenciais (se necessário)
SPOTGIFTS_EMAIL=seu-email@exemplo.com
SPOTGIFTS_PASSWORD=sua-senha
XBZBRINDES_EMAIL=seu-email@exemplo.com
XBZBRINDES_PASSWORD=sua-senha
```

## 🧪 Testando o Sistema

### Teste Básico
```bash
# Executa todos os testes
npm test

# Teste específico
npm run test:basic
npm run test:config
npm run test:utils
```

### Teste de Navegador
```bash
# Testa se o Puppeteer está funcionando
node src/test/test-scraper.js
```

## 🔍 Analisando Sites

### Análise Automática
```bash
# Analisa todos os sites configurados
npm run analyze

# Análise específica
npm run analyze:spotgifts
npm run analyze:xbzbrindes

# Análise manual
node src/analyze-sites.js --site spotgifts
```

**O que a análise faz:**
- Identifica seletores CSS para produtos
- Analisa estrutura da página
- Gera recomendações de configuração
- Salva relatório detalhado na pasta `analysis/`

## 🚀 Executando o Scraping

### Scraping de Todos os Sites
```bash
# Executa scraping de todos os sites
npm start

# Ou diretamente
node src/index.js
```

### Scraping de Site Específico
```bash
# Spot Gifts
npm run scrape:spotgifts

# XBZ Brindes
npm run scrape:xbzbrindes

# Comando personalizado
node src/index.js --site "Spot Gifts"
```

### Opções de Linha de Comando
```bash
# Lista sites disponíveis
node src/index.js --list

# Executa site específico
node src/index.js --site "nome-do-site"

# Exibe ajuda
node src/index.js --help
```

## 📊 Estrutura de Saída

### Arquivos Gerados
```
output/
├── spot_gifts_2024-01-15T10-30-00.json    # Dados dos produtos
├── spot_gifts_stats_2024-01-15T10-30-00.json  # Estatísticas
├── spot_gifts_2024-01-15T10-30-00.csv     # Exportação CSV
└── spot_gifts_resumo_2024-01-15T10-30-00.txt  # Relatório de resumo
```

### Estrutura dos Dados
```json
{
  "metadata": {
    "site": "Spot Gifts",
    "total_produtos": 1246,
    "data_extracao": "2024-01-15T10:30:00.000Z",
    "versao": "1.0.0"
  },
  "produtos": [
    {
      "referencia": "94690",
      "nome": "GILDED. Squeeze dobrável em PE",
      "descricao": "Squeeze dobrável em PE com bico de sistema push-pull",
      "cores": ["Preto", "Azul", "Vermelho"],
      "imagens": ["https://exemplo.com/imagem1.jpg"],
      "categorias": ["Squeezes & Copos"],
      "informacoes_adicionais": "460 mL",
      "preco": null,
      "url_produto": "https://exemplo.com/produto/94690",
      "data_extracao": "2024-01-15T10:30:00.000Z",
      "site_origem": "Spot Gifts"
    }
  ]
}
```

## ⚙️ Personalizando Configurações

### 1. Configuração de Identificação

**IMPORTANTE**: Cada site deve ter um prefixo único para suas referências:

```javascript
// src/config/spotgifts.js
identification: {
  referencePrefix: 'SP-',    // Referências: SP-94690, SP-94689, etc.
  siteCode: 'SPOT'
}

// src/config/xbzbrindes.js  
identification: {
  referencePrefix: 'XB-',    // Referências: XB-12345, XB-67890, etc.
  siteCode: 'XBZ'
}
```

**Benefícios:**
- ✅ Evita conflitos entre referências de diferentes sites
- ✅ Facilita identificação da origem do produto
- ✅ Permite consultas específicas por site
- ✅ Mantém histórico de produtos organizado

### 2. Ajustando Seletores

Edite os arquivos em `src/config/`:

```javascript
// src/config/spotgifts.js
selectors: {
  productCard: '.novo-seletor-produto',  // Ajuste conforme necessário
  productLinks: 'a[href*="/novo-padrao"]',
  // ... outros seletores
}
```

### 2. Ajustando Delays

```javascript
// Configurações de rolagem
scroll: {
  delay: 2000,        // Aumente se o site for lento
  maxScrolls: 150,    // Ajuste conforme número de produtos
  scrollStep: 1000,   // Pixels por rolagem
  waitForNewContent: 3000  // Tempo para aguardar carregamento
}

// Configurações de extração
extraction: {
  delayBetweenProducts: 2000,  // Delay entre produtos
  maxRetries: 5,               // Tentativas em caso de erro
  timeout: 45000               // Timeout para operações
}
```

### 3. Adicionando Novo Site

1. **Crie arquivo de configuração:**
```bash
cp config-example.js src/config/novo-site.js
```

2. **Edite a configuração:**
```javascript
module.exports = {
  name: 'Novo Site',
  baseUrl: 'https://www.novosite.com',
  catalogUrl: 'https://www.novosite.com/catalogo/',
  
  // Configuração de identificação (IMPORTANTE!)
  identification: {
    referencePrefix: 'NS-',    // Prefixo para referências (ex: NS-12345)
    siteCode: 'NOVOSITE'       // Código único do site
  },
  
  // ... configure seletores e outras opções
};
```

3. **Crie o scraper:**
```bash
cp src/scrapers/spotgifts.js src/scrapers/novo-site.js
```

4. **Edite o scraper:**
```javascript
const config = require('../config/novo-site');

class NovoSiteScraper extends BaseScraper {
  constructor() {
    super(config);
  }
  // ... implementações específicas
}
```

5. **Adicione ao sistema principal:**
```javascript
// src/index.js
const NovoSiteScraper = require('./scrapers/novo-site');

this.scrapers = [
  // ... outros scrapers
  { name: 'Novo Site', scraper: NovoSiteScraper }
];
```

6. **Adicione scripts no package.json:**
```json
{
  "scripts": {
    "scrape:novo-site": "node src/scrapers/novo-site.js"
  }
}
```

## 🔧 Solução de Problemas

### Problemas Comuns

#### 1. Navegador não inicia
```bash
# Reinstale o Puppeteer
npm uninstall puppeteer
npm install puppeteer

# Instale o Chrome manualmente
npx puppeteer browsers install chrome
```

#### 2. Seletores não encontrados
```bash
# Analise o site primeiro
npm run analyze:spotgifts

# Verifique o relatório na pasta analysis/
# Ajuste os seletores conforme as recomendações
```

#### 3. Timeout de operações
```javascript
// Aumente os timeouts na configuração
extraction: {
  timeout: 60000,  // 60 segundos
  delayBetweenProducts: 2000
}
```

#### 4. Produtos não carregam
```javascript
// Ajuste configurações de rolagem
scroll: {
  delay: 3000,           // Mais tempo entre rolagens
  waitForNewContent: 5000, // Mais tempo para carregar
  maxScrolls: 200        // Mais tentativas
}
```

### Logs e Debug

#### Habilitar Debug
```env
# .env
DEBUG=true
LOG_LEVEL=debug
```

#### Verificar Logs
```bash
# Logs em tempo real
tail -f logs/scraping.log

# Últimas linhas
tail -n 100 logs/scraping.log
```

## 📈 Monitoramento e Performance

### Métricas Importantes
- **Taxa de sucesso**: Produtos válidos vs. total
- **Tempo de execução**: Por site e total
- **Erros**: Tipos e frequência
- **Produtos por minuto**: Velocidade de extração

### Otimizações
```javascript
// Configurações de performance
performance: {
  disableImages: true,     // Mais rápido
  disableCSS: true,        // Mais rápido
  disableFonts: true,      // Mais rápido
  maxConcurrentRequests: 1 // Evita sobrecarga
}
```

## 🛡️ Considerações de Segurança

### Boas Práticas
- ✅ Use delays apropriados entre requisições
- ✅ Respeite robots.txt dos sites
- ✅ Não sobrecarregue servidores
- ✅ Use user-agent realista
- ✅ Considere usar APIs oficiais quando disponíveis

### Evite
- ❌ Muitas requisições simultâneas
- ❌ Delays muito baixos
- ❌ Ignorar termos de uso
- ❌ Scraping em horários de pico

## 📞 Suporte e Manutenção

### Verificações Regulares
1. **Teste mensal** com `npm test`
2. **Análise de sites** com `npm run analyze`
3. **Verificação de logs** para erros
4. **Atualização de seletores** se necessário

### Backup de Configurações
```bash
# Faça backup das configurações
cp -r src/config/ backup-config-$(date +%Y%m%d)

# Restaure se necessário
cp -r backup-config-20240115/ src/config/
```

## 🎯 Próximos Passos

### Melhorias Sugeridas
1. **Interface web** para monitoramento
2. **Agendamento** de execuções automáticas
3. **Notificações** por email/telegram
4. **Dashboard** com métricas em tempo real
5. **Integração** com bancos de dados
6. **API REST** para consultas

### Recursos Avançados
- **Proxy rotation** para evitar bloqueios
- **Captcha solving** automático
- **Machine learning** para seletores
- **Distributed scraping** em múltiplas máquinas

---

**🎉 Parabéns! Você está pronto para usar o sistema de scraping!**

Para dúvidas ou problemas, verifique:
1. Os logs em `logs/scraping.log`
2. A documentação no `README.md`
3. Os exemplos em `config-example.js`
4. Os testes em `src/test/`

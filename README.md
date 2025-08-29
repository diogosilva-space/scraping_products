# Sistema de Scraping de Produtos

Sistema automatizado para extração de dados de produtos de sites de e-commerce usando Puppeteer.

## 🚀 Funcionalidades

- Scraping automático de produtos com rolagem infinita
- Suporte a múltiplos sites com configurações personalizadas
- Extração de dados estruturados (referência, nome, descrição, cores, imagens, etc.)
- Sistema de configuração modular por site
- Suporte a login quando necessário
- Salvamento de dados em formato JSON
- **🆕 Sincronização automática com API da djob.com.br**
- **🆕 Envio em lote de produtos para a nuvem**
- **🆕 Sistema de retry e tratamento de erros robusto**
- Interface de linha de comando com progresso visual

## 📋 Sites Suportados

- [Spot Gifts](https://www.spotgifts.com.br/pt/catalogo/) - Catálogo de brindes corporativos
- [XBZ Brindes](https://www.xbzbrindes.com.br/) - Brindes personalizados

## 🛠️ Instalação

```bash
# Clone o repositório
git clone <seu-repositorio>
cd scraping-products

# Instale as dependências
npm install

# Instale o Puppeteer (pode demorar na primeira vez)
npx puppeteer browsers install chrome
```

### 🔄 Atualizando Dependências

Se você encontrar avisos de versões desatualizadas:

```bash
# Execute o script de atualização automática
chmod +x update-dependencies.sh
./update-dependencies.sh

# Ou atualize manualmente
npm update
npx puppeteer browsers install chrome
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Configurações gerais
HEADLESS=true
DELAY_BETWEEN_REQUESTS=1000
MAX_RETRIES=3

# Credenciais de login (quando necessário)
SPOTGIFTS_EMAIL=seu-email@exemplo.com
SPOTGIFTS_PASSWORD=sua-senha
XBZBRINDES_EMAIL=seu-email@exemplo.com
XBZBRINDES_PASSWORD=sua-senha

# ========================================
# CONFIGURAÇÕES DA API DJOB.COM.BR
# ========================================

# Credenciais de acesso à API
DJOB_USERNAME=seu_email@exemplo.com
DJOB_PASSWORD=sua_senha_aqui
DJOB_API_KEY=sua_chave_api_aqui

# Sincronização automática
DJOB_AUTO_SYNC=true
DJOB_SYNC_AFTER_SCRAPING=true
DJOB_BATCH_SIZE=10
DJOB_BATCH_DELAY=2000
```

### 2. Configuração dos Sites

Cada site tem seu arquivo de configuração em `src/config/` com:
- URLs base
- Seletores CSS/XPath
- Configurações de rolagem
- Mapeamento de campos

## 🚀 Uso

### Scraping de um site específico:

```bash
# Scraping do Spot Gifts
npm run scrape:spotgifts

# Scraping do XBZ Brindes
npm run scrape:xbzbrindes
```

### Scraping de todos os sites:

```bash
npm start
```

### 🆕 Sincronização com a API:

```bash
# Sincroniza todos os produtos existentes
npm run sync

# Sincroniza produtos de um site específico
npm run sync:spotgifts
npm run sync:xbzbrindes

# Exibe estatísticas de sincronização
npm run stats
```

### 🆕 Comandos de linha de comando:

```bash
# Sincronização direta
node src/index.js --sync
node src/index.js --sync:site "Spot Gifts"
node src/index.js --stats

# Combinação de scraping + sincronização
node src/index.js --site "Spot Gifts"  # Scraping + sincronização automática
```

## 📊 Estrutura dos Dados

Cada produto extraído contém:

```json
{
  "referencia": "string (obrigatório)",
  "nome": "string (obrigatório)",
  "descricao": "string (obrigatório)",
  "cores": ["array de strings (obrigatório)"],
  "imagens": ["array de URLs (obrigatório)"],
  "categorias": ["array de strings (opcional)"],
  "informacoes_adicionais": "string (opcional)",
  "preco": "number (opcional)",
  "url_produto": "string",
  "data_extracao": "ISO string"
}
```

## 📁 Estrutura do Projeto

```
src/
├── config/           # Configurações dos sites
│   └── api.js        # 🆕 Configurações da API
├── scrapers/         # Implementações dos scrapers
├── utils/            # Utilitários compartilhados
│   ├── apiClient.js  # 🆕 Cliente da API
│   └── syncManager.js # 🆕 Gerenciador de sincronização
├── models/           # Modelos de dados
└── index.js          # Arquivo principal
```

## 🔧 Personalização

Para adicionar um novo site:

1. Crie um arquivo de configuração em `src/config/`
2. Implemente o scraper em `src/scrapers/`
3. Adicione o script no `package.json`
4. Configure as variáveis de ambiente se necessário

## ⚠️ Considerações Legais

- Respeite os termos de uso dos sites
- Use delays apropriados entre requisições
- Não sobrecarregue os servidores
- Considere usar APIs oficiais quando disponíveis

## 🆕 Integração com API

O sistema agora integra automaticamente com a API da [djob.com.br](https://api.djob.com.br/wp-json/api/v1/documentacao):

- **Sincronização automática**: Produtos são enviados para a nuvem após o scraping
- **Envio em lote**: Processamento eficiente de múltiplos produtos
- **Tratamento de erros**: Sistema robusto de retry e fallback
- **Validação**: Produtos são validados antes do envio
- **Logs detalhados**: Acompanhamento completo do processo de sincronização

## 📝 Logs

O sistema gera logs detalhados em:
- Console com cores
- Arquivo `logs/scraping.log`
- Relatórios de progresso em tempo real

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

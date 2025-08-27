# Sistema de Scraping de Produtos

Sistema automatizado para extração de dados de produtos de sites de e-commerce usando Puppeteer.

## 🚀 Funcionalidades

- Scraping automático de produtos com rolagem infinita
- Suporte a múltiplos sites com configurações personalizadas
- Extração de dados estruturados (referência, nome, descrição, cores, imagens, etc.)
- Sistema de configuração modular por site
- Suporte a login quando necessário
- Salvamento de dados em formato JSON
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
├── scrapers/         # Implementações dos scrapers
├── utils/            # Utilitários compartilhados
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

# 🚀 Integração com API da djob.com.br

Este documento explica como configurar e usar a nova funcionalidade de sincronização automática com a API da djob.com.br.

## 📋 Pré-requisitos

1. **Credenciais da API**: Você precisa ter acesso à API da djob.com.br
2. **Arquivo .env**: Configure suas credenciais no arquivo de ambiente
3. **Dependências**: As novas dependências já foram instaladas automaticamente

## ⚙️ Configuração

### 1. Arquivo de Ambiente

Copie o arquivo `env.example` para `.env` e configure suas credenciais:

```bash
cp env.example .env
```

Edite o arquivo `.env` com suas informações reais:

```env
# Credenciais da API
DJOB_USERNAME=seu_email_real@exemplo.com
DJOB_PASSWORD=sua_senha_real
DJOB_API_KEY=sua_chave_api_real

# Configurações de sincronização
DJOB_AUTO_SYNC=true
DJOB_SYNC_AFTER_SCRAPING=true
DJOB_BATCH_SIZE=10
DJOB_BATCH_DELAY=2000
```

### 2. Verificação da Configuração

Teste se a configuração está correta:

```bash
npm run test:api
```

Este comando testará:
- ✅ Conexão com a API
- ✅ Autenticação
- ✅ Verificação de produtos
- ✅ Obtenção de estatísticas
- ✅ Gerenciador de sincronização

## 🚀 Como Usar

### Sincronização Automática (Recomendado)

A sincronização acontece automaticamente após cada scraping:

```bash
# Scraping + sincronização automática
npm run scrape:spotgifts
npm run scrape:xbzbrindes
npm start  # Todos os sites
```

### Sincronização Manual

Para sincronizar produtos existentes:

```bash
# Sincroniza todos os produtos
npm run sync

# Sincroniza produtos de um site específico
npm run sync:spotgifts
npm run sync:xbzbrindes

# Exibe estatísticas
npm run stats
```

### Comandos de Linha de Comando

```bash
# Sincronização direta
node src/index.js --sync
node src/index.js --sync:site "Spot Gifts"
node src/index.js --stats

# Combinação
node src/index.js --site "Spot Gifts"  # Scraping + sincronização
```

## 📊 Monitoramento

### Logs de Sincronização

Os logs são salvos em:
- **Console**: Progresso em tempo real
- **Arquivo**: `output/sync_log.json`
- **Estatísticas**: Histórico completo de sincronizações

### Estatísticas Disponíveis

```bash
npm run stats
```

Exibe:
- 📦 Total de produtos processados
- ✅ Total de produtos sincronizados
- ❌ Total de erros
- 🕐 Última sincronização
- 📈 Taxa de sucesso

## 🔧 Configurações Avançadas

### Tamanho do Lote

```env
DJOB_BATCH_SIZE=20        # Produtos por lote
DJOB_BATCH_DELAY=3000     # Delay entre lotes (ms)
```

### Tratamento de Erros

```env
DJOB_CONTINUE_ON_ERROR=true    # Continua em caso de erro
DJOB_VALIDATE_BEFORE_SYNC=true # Valida antes de sincronizar
DJOB_SKIP_INVALID=false        # Pula produtos inválidos
```

### Rate Limiting

```env
DJOB_API_RATE_LIMIT=60         # Requisições por minuto
DJOB_API_REQUEST_DELAY=1000    # Delay entre requisições (ms)
```

## 🚨 Solução de Problemas

### Erro de Autenticação

```bash
# Verifique suas credenciais
echo $DJOB_USERNAME
echo $DJOB_PASSWORD

# Teste a conexão
npm run test:api
```

### Erro de Conexão

```bash
# Verifique a URL da API
echo $DJOB_API_BASE_URL

# Teste conectividade
curl -I https://api.djob.com.br/wp-json/api/v1/documentacao
```

### Produtos Não Sincronizados

```bash
# Verifique logs
cat output/sync_log.json | tail -20

# Force sincronização
npm run sync
```

### Erro de Rate Limiting

```bash
# Aumente delays
DJOB_BATCH_DELAY=5000
DJOB_API_REQUEST_DELAY=2000

# Reduza tamanho do lote
DJOB_BATCH_SIZE=5
```

## 📈 Métricas e Performance

### Otimizações Recomendadas

- **Lotes pequenos**: 5-10 produtos por lote
- **Delays adequados**: 2-5 segundos entre lotes
- **Validação**: Sempre valide produtos antes do envio
- **Monitoramento**: Acompanhe logs e estatísticas

### Indicadores de Saúde

- ✅ Taxa de sucesso > 95%
- ✅ Tempo de sincronização < 5 min por 100 produtos
- ✅ Erros de rede < 1%
- ✅ Produtos duplicados < 0.1%

## 🔒 Segurança

### Boas Práticas

1. **Nunca commite o arquivo .env**
2. **Use credenciais específicas para API**
3. **Monitore logs de acesso**
4. **Configure timeouts adequados**
5. **Use HTTPS sempre**

### Variáveis Sensíveis

```env
# ✅ Seguro (não commitar)
DJOB_USERNAME=seu_email
DJOB_PASSWORD=sua_senha
DJOB_API_KEY=sua_chave

# ❌ Inseguro (não usar)
DJOB_USERNAME=admin
DJOB_PASSWORD=123456
DJOB_API_KEY=public_key
```

## 🆘 Suporte

### Comandos de Diagnóstico

```bash
# Teste completo da API
npm run test:api

# Verificar configurações
node -e "console.log(require('./src/config/api'))"

# Logs de sincronização
tail -f output/sync_log.json

# Estatísticas em tempo real
watch -n 5 'npm run stats'
```

### Contatos

- **Documentação da API**: [https://api.djob.com.br/wp-json/api/v1/documentacao](https://api.djob.com.br/wp-json/api/v1/documentacao)
- **Suporte Técnico**: suporte@exemplo.com
- **Issues**: Use o sistema de issues do projeto

## 🎯 Próximos Passos

1. **Configure suas credenciais** no arquivo `.env`
2. **Teste a integração** com `npm run test:api`
3. **Execute um scraping** para ver a sincronização automática
4. **Monitore os logs** para acompanhar o progresso
5. **Ajuste configurações** conforme necessário

---

**🎉 Parabéns!** Sua aplicação agora está integrada com a API da djob.com.br e sincroniza automaticamente todos os produtos extraídos para a nuvem.

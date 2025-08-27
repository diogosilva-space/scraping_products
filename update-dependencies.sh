#!/bin/bash

echo "🔄 Atualizando dependências do projeto..."

# Remove node_modules e package-lock.json
echo "🗑️  Removendo dependências antigas..."
rm -rf node_modules package-lock.json

# Limpa cache do npm
echo "🧹 Limpando cache do npm..."
npm cache clean --force

# Instala dependências atualizadas
echo "📦 Instalando dependências atualizadas..."
npm install

# Instala navegador Chrome para Puppeteer
echo "🌐 Instalando navegador Chrome para Puppeteer..."
npx puppeteer browsers install chrome

# Verifica versões instaladas
echo "📋 Versões instaladas:"
npm list --depth=0

echo "✅ Atualização concluída!"
echo ""
echo "🚀 Para testar o sistema:"
echo "  npm test"
echo ""
echo "🔍 Para analisar sites:"
echo "  npm run analyze"
echo ""
echo "🚀 Para executar scraping:"
echo "  npm start"

#!/bin/bash

echo "🧹 LIMPEZA DE EMERGÊNCIA - Matando processos órfãos"

# Detecta o sistema operacional
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "🪟 Windows detectado"
    
    # Mata processos Chrome no Windows
    echo "🔴 Matando processos Chrome..."
    taskkill /f /im chrome.exe /t 2>/dev/null || echo "Nenhum processo Chrome encontrado"
    taskkill /f /im chromedriver.exe /t 2>/dev/null || echo "Nenhum processo ChromeDriver encontrado"
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detectado"
    
    # Mata processos Chrome no macOS
    echo "🔴 Matando processos Chrome..."
    pkill -f "Google Chrome" 2>/dev/null || echo "Nenhum processo Chrome encontrado"
    pkill -f "chromedriver" 2>/dev/null || echo "Nenhum processo ChromeDriver encontrado"
    
else
    echo "🐧 Linux detectado"
    
    # Mata processos Chrome no Linux
    echo "🔴 Matando processos Chrome..."
    pkill -f chrome 2>/dev/null || echo "Nenhum processo Chrome encontrado"
    pkill -f chromedriver 2>/dev/null || echo "Nenhum processo ChromeDriver encontrado"
fi

# Mata processos Node.js órfãos relacionados ao scraping
echo "🔴 Matando processos Node.js órfãos..."
pkill -f "puppeteer" 2>/dev/null || echo "Nenhum processo Puppeteer encontrado"
pkill -f "scraping" 2>/dev/null || echo "Nenhum processo de scraping encontrado"

# Limpa arquivos temporários
echo "🗑️  Limpando arquivos temporários..."
rm -f *.png 2>/dev/null || echo "Nenhum screenshot encontrado"
rm -f logs/*.tmp 2>/dev/null || echo "Nenhum log temporário encontrado"

echo "✅ Limpeza de emergência concluída!"
echo ""
echo "🚀 Para executar novamente:"
echo "  npm start"
echo ""
echo "🔍 Para analisar sites:"
echo "  npm run analyze"

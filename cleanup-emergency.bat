@echo off
echo 🧹 LIMPEZA DE EMERGÊNCIA - Matando processos órfãos

echo 🔴 Matando processos Chrome...
taskkill /f /im chrome.exe /t 2>nul || echo Nenhum processo Chrome encontrado
taskkill /f /im chromedriver.exe /t 2>nul || echo Nenhum processo ChromeDriver encontrado

echo 🔴 Matando processos Node.js órfãos...
taskkill /f /im node.exe /t 2>nul || echo Nenhum processo Node.js encontrado

echo 🗑️  Limpando arquivos temporários...
del *.png 2>nul || echo Nenhum screenshot encontrado
del logs\*.tmp 2>nul || echo Nenhum log temporário encontrado

echo ✅ Limpeza de emergência concluída!
echo.
echo 🚀 Para executar novamente:
echo   npm start
echo.
echo 🔍 Para analisar sites:
echo   npm run analyze

pause

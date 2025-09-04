/**
 * 🧪 Teste específico para download de imagens
 */

// Carrega variáveis de ambiente
require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testarDownloadImagem() {
  console.log('🧪 Testando download de imagem...\n');
  
  try {
    const imageUrl = "https://www.spotgifts.com.br/fotos/opcionais/127_95942891861fd2ed30cc0a.png";
    
    console.log(`📥 Baixando imagem: ${imageUrl}`);
    
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    console.log(`✅ Status: ${imageResponse.status}`);
    console.log(`✅ Tamanho: ${imageResponse.data.length} bytes`);
    
    // Salva a imagem temporariamente
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempImagePath = path.join(tempDir, `test_image_${Date.now()}.png`);
    fs.writeFileSync(tempImagePath, imageResponse.data);
    
    console.log(`✅ Imagem salva em: ${tempImagePath}`);
    
    // Remove o arquivo temporário
    fs.unlinkSync(tempImagePath);
    console.log(`🧹 Arquivo temporário removido`);
    
  } catch (error) {
    console.error('❌ Erro no download:', error.message);
    if (error.response) {
      console.error(`❌ Status: ${error.response.status}`);
      console.error(`❌ Headers:`, error.response.headers);
    }
  }
}

// Executar teste
testarDownloadImagem().catch(console.error);

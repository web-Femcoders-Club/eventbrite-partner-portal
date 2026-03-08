import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\proye\\.gemini\\antigravity\\brain\\6981fff1-0fe4-4388-9f73-69d4dc5c3be1';
const publicDir = 'c:\\Users\\proye\\.gemini\\antigravity\\playground\\entropic-halo\\eventbrite-partner-portal\\web\\public';

const filesToCopy = [
  { src: 'media__1772925462071.jpg', dest: 'logo-infojobs.jpg' },
  { src: 'media__1772925536786.jpg', dest: 'logo-femcoders.jpg' },
  { src: 'femcoders_favicon_design_1772927882171.png', dest: 'favicon.png' }
];

async function runCopy() {
  console.log('--- COPIANDO ACTIVOS VISUALES ---');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  filesToCopy.forEach(file => {
    const srcPath = path.join(brainDir, file.src);
    const destPath = path.join(publicDir, file.dest);
    
    try {
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copiado: ${file.dest}`);
      } else {
        console.log(`❌ No se encontró el origen: ${file.src}`);
      }
    } catch (err) {
      console.error(`Error copiando ${file.dest}:`, err);
    }
  });

  console.log('\n--- PROCESO FINALIZADO ---');
}

runCopy();

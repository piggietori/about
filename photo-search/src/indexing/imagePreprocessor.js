const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const config = require('../../config/config');

async function toBase64ForClaude(filePath) {
  const buffer = await sharp(filePath)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return buffer.toString('base64');
}

async function generateThumbnail(filePath, photoId) {
  const outPath = path.join(config.thumbnailDir, `${photoId}.jpg`);
  if (fs.existsSync(outPath)) return outPath;

  fs.mkdirSync(config.thumbnailDir, { recursive: true });
  await sharp(filePath)
    .rotate()
    .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toFile(outPath);
  return outPath;
}

module.exports = { toBase64ForClaude, generateThumbnail };

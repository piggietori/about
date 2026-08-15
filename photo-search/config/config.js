const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  photoDir: process.env.PHOTO_DIR || '',
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  dbPath: path.join(__dirname, '../data/photos.db'),
  thumbnailDir: path.join(__dirname, '../data/thumbnails'),
  model: 'claude-sonnet-4-6',
};

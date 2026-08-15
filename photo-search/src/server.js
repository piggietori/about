const express = require('express');
const path = require('path');
const config = require('../config/config');
const logger = require('./lib/logger');

const { getDb } = require('./db/connection');
getDb(); // initialize DB on startup

const app = express();
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/config',  require('./routes/config'));
app.use('/api/index',   require('./routes/indexRoutes'));
app.use('/api/photos',  require('./routes/photos'));
app.use('/api/search',  require('./routes/search'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.listen(config.port, () => {
  logger.info(`photo-memory-search running at http://localhost:${config.port}`);
  logger.info(`Set ANTHROPIC_API_KEY and PHOTO_DIR in .env, then open http://localhost:${config.port}/setup`);
});

module.exports = app;

const express = require('express');
const indexer = require('../indexing/indexer');
const repo = require('../db/photoRepository');

const router = express.Router();

router.post('/start', (req, res) => {
  const photoDir = repo.getSetting('photo_dir');
  if (!photoDir) return res.status(400).json({ error: 'No photo directory configured. Visit /setup first.' });

  indexer.start(photoDir).catch(() => {});
  res.json({ ok: true, message: 'Indexing started' });
});

router.get('/status', (req, res) => {
  res.json(indexer.getState());
});

module.exports = router;

const express = require('express');
const fs = require('fs');
const config = require('../../config/config');
const repo = require('../db/photoRepository');

const router = express.Router();

router.get('/', (req, res) => {
  const photoDir = repo.getSetting('photo_dir') || config.photoDir || '';
  res.json({
    photoDir,
    apiKeySet: Boolean(config.apiKey),
    photoDirValid: photoDir ? fs.existsSync(photoDir) : false,
  });
});

router.post('/', express.json(), (req, res) => {
  const { photoDir } = req.body || {};
  if (!photoDir) return res.status(400).json({ error: 'photoDir is required' });
  if (!fs.existsSync(photoDir)) return res.status(400).json({ error: `Directory not found: ${photoDir}` });

  repo.setSetting('photo_dir', photoDir);
  res.json({ ok: true, photoDir });
});

module.exports = router;

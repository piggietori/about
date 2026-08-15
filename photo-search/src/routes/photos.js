const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../../config/config');
const repo = require('../db/photoRepository');

const router = express.Router();

router.get('/', (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const perPage = Math.min(parseInt(req.query.perPage || '60', 10), 200);
  const photos = repo.listPhotos({ page, perPage, status: req.query.status });
  res.json(photos);
});

router.get('/stats', (req, res) => {
  res.json(repo.getStats());
});

router.get('/:id', (req, res) => {
  const photo = repo.getPhotoById(parseInt(req.params.id, 10));
  if (!photo) return res.status(404).json({ error: 'Not found' });
  res.json(photo);
});

router.get('/:id/image', (req, res) => {
  const photo = repo.getPhotoById(parseInt(req.params.id, 10));
  if (!photo || !fs.existsSync(photo.file_path)) return res.status(404).send('Not found');
  res.sendFile(photo.file_path);
});

router.get('/:id/thumbnail', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const thumbPath = path.join(config.thumbnailDir, `${id}.jpg`);
  if (fs.existsSync(thumbPath)) return res.sendFile(thumbPath);

  const photo = repo.getPhotoById(id);
  if (!photo || !fs.existsSync(photo.file_path)) return res.status(404).send('Not found');
  res.sendFile(photo.file_path);
});

module.exports = router;

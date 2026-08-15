const express = require('express');
const { search } = require('../search/searchService');
const { summarize } = require('../search/summarizer');

const router = express.Router();

router.post('/', express.json(), async (req, res) => {
  const { query } = req.body || {};
  if (!query || !query.trim()) return res.status(400).json({ error: 'query is required' });

  try {
    const results = await search(query.trim());
    const summary = results.length ? await summarize(query.trim(), results) : null;
    res.json({ query, summary, count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

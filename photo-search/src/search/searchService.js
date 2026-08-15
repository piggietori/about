const repo = require('../db/photoRepository');
const { getClient } = require('../lib/claudeClient');
const { getDb } = require('../db/connection');
const config = require('../../config/config');
const logger = require('../lib/logger');

async function interpretQuery(query) {
  const db = getDb();
  const allCategories = db.prepare(`
    SELECT DISTINCT categories FROM photos WHERE status = 'done' AND categories IS NOT NULL LIMIT 200
  `).all().flatMap(r => {
    try { return JSON.parse(r.categories); } catch { return []; }
  });
  const uniqueCats = [...new Set(allCategories)].slice(0, 80);

  const allPlaces = db.prepare(`SELECT DISTINCT place_name FROM photos WHERE place_name IS NOT NULL LIMIT 100`).all().map(r => r.place_name);

  const client = getClient();
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 512,
    tools: [{
      name: 'query_filters',
      description: 'Return structured search filters for a photo library query',
      input_schema: {
        type: 'object',
        properties: {
          categories: {
            type: 'array', items: { type: 'string' },
            description: 'Category labels from the provided list that best match the user query',
          },
          keywords: {
            type: 'array', items: { type: 'string' },
            description: 'Additional keyword terms to search for in photo descriptions',
          },
        },
        required: ['categories', 'keywords'],
      },
    }],
    tool_choice: { type: 'tool', name: 'query_filters' },
    messages: [{
      role: 'user',
      content: `The user is searching their photo library for: "${query}"

Available categories in the library: ${uniqueCats.join(', ')}
Available places: ${allPlaces.slice(0, 30).join(', ')}

Return the category labels from the list that best match the user's query, plus any extra keyword terms to search photo descriptions.`,
    }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) return { categories: [], keywords: [] };
  return toolUse.input;
}

async function search(query) {
  if (!query || !query.trim()) return [];

  const ftsResults = repo.searchByFts(query);
  const seen = new Map(ftsResults.map(r => [r.id, r]));

  try {
    const interpreted = await interpretQuery(query);
    const allTerms = [...(interpreted.categories || []), ...(interpreted.keywords || [])];

    const catResults = repo.searchByCategories(allTerms);
    for (const r of catResults) {
      if (!seen.has(r.id)) seen.set(r.id, r);
    }

    if (interpreted.keywords?.length) {
      const kwResults = repo.searchByFts(interpreted.keywords.join(' '));
      for (const r of kwResults) {
        if (!seen.has(r.id)) seen.set(r.id, r);
      }
    }
  } catch (err) {
    logger.warn(`Query interpretation failed, using FTS only: ${err.message}`);
  }

  return [...seen.values()]
    .sort((a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''))
    .slice(0, 60);
}

module.exports = { search };

const { getClient } = require('../lib/claudeClient');
const config = require('../../config/config');
const logger = require('../lib/logger');

function buildPhotoSnippets(photos) {
  return photos.slice(0, 40).map(p => {
    const date = p.taken_at ? p.taken_at.slice(0, 10) : 'unknown date';
    const place = p.place_name || 'unknown location';
    const cats = (() => { try { return JSON.parse(p.categories || '[]').join(', '); } catch { return ''; } })();
    return `- ${date} | ${place} | ${p.scene_type || ''} | ${cats} | ${p.people_desc || ''} | ${p.description || ''}`;
  }).join('\n');
}

async function summarize(query, photos) {
  if (!photos.length) return null;

  const snippets = buildPhotoSnippets(photos);
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Here are ${photos.length} photos from a personal photo library that match the search "${query}":

${snippets}

Write a 3-5 sentence natural-language summary covering: who appears, where these photos were taken, the time period they span, and what kinds of activities or occasions they show. Be warm and specific. Do not mention photo IDs or metadata format.`,
      }],
    });

    return response.content[0]?.text || null;
  } catch (err) {
    logger.warn(`Summarization failed: ${err.message}`);
    return null;
  }
}

module.exports = { summarize };

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../../config/config');

let client;

function getClient() {
  if (!client) {
    if (!config.apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    client = new Anthropic({ apiKey: config.apiKey, maxRetries: 2 });
  }
  return client;
}

module.exports = { getClient };

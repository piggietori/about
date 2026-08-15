const { getClient } = require('../lib/claudeClient');
const config = require('../../config/config');

const PROMPT = `Analyze this personal photo and return structured information to help organize and search a photo library.

Be factual and concise. For "categories", use an open vocabulary of 1-4 labels that would help someone find this photo by topic (e.g. "family vacation", "school event", "birthday party", "holiday", "sports", "nature", "food", "pets", "work", "concert"). For "people_desc", describe people only by role/age-group (e.g. "two adults and a toddler") — do not attempt to identify anyone by name.`;

const TOOL_SCHEMA = {
  name: 'analyze_photo',
  description: 'Return structured analysis of the photo for a personal photo library organizer',
  input_schema: {
    type: 'object',
    properties: {
      description:  { type: 'string',  description: '1-2 sentence factual description of what is shown' },
      scene_type:   { type: 'string',  description: 'Brief scene label, e.g. "beach", "birthday party", "classroom", "hiking trail", "restaurant"' },
      categories:   { type: 'array',   items: { type: 'string' }, description: '1-4 topic labels for search' },
      objects:      { type: 'array',   items: { type: 'string' }, description: 'Notable objects, landmarks, or food items visible' },
      is_indoor:    { type: 'boolean', description: 'Whether the photo is primarily indoors' },
      people_count: { type: 'integer', description: 'Estimated number of people visible (0 if none)' },
      people_desc:  { type: 'string',  description: 'Brief description of people by role/age-group only; empty string if no people' },
    },
    required: ['description', 'scene_type', 'categories', 'objects', 'is_indoor', 'people_count', 'people_desc'],
  },
};

async function analyzeImage(base64Image) {
  const client = getClient();
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 1024,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'tool', name: 'analyze_photo' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
        { type: 'text', text: PROMPT },
      ],
    }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a tool_use response');

  const inp = toolUse.input;
  return {
    description:  String(inp.description || ''),
    sceneType:    String(inp.scene_type || ''),
    categories:   JSON.stringify(Array.isArray(inp.categories) ? inp.categories : []),
    objects:      JSON.stringify(Array.isArray(inp.objects) ? inp.objects : []),
    isIndoor:     inp.is_indoor ? 1 : 0,
    peopleCount:  Number(inp.people_count) || 0,
    peopleDesc:   String(inp.people_desc || ''),
  };
}

module.exports = { analyzeImage };

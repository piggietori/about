// Drop-in mock for src/lib/claudeClient.js
// Override in tests by pointing require cache at this file.

let callCount = 0;

const mockClient = {
  messages: {
    async create({ tools, tool_choice, messages }) {
      callCount++;

      // Vision call (has image content)
      const content = messages?.[0]?.content;
      const hasImage = Array.isArray(content) && content.some(b => b.type === 'image');
      if (hasImage) {
        return {
          content: [{
            type: 'tool_use',
            name: 'analyze_photo',
            input: {
              description: 'A colorful test image used for unit testing.',
              scene_type: 'indoor',
              categories: ['family vacation', 'birthday party'],
              objects: ['balloons', 'cake'],
              is_indoor: true,
              people_count: 3,
              people_desc: 'two adults and a child',
            },
          }],
        };
      }

      // Query interpretation call
      if (tool_choice?.name === 'query_filters') {
        return {
          content: [{
            type: 'tool_use',
            name: 'query_filters',
            input: { categories: ['family vacation', 'birthday party'], keywords: ['family', 'vacation'] },
          }],
        };
      }

      // Summarize call (plain text)
      return {
        content: [{ type: 'text', text: 'These photos capture warm family moments across several locations and celebrations.' }],
      };
    },
  },
};

function getClient() { return mockClient; }
function getCallCount() { return callCount; }
function resetCallCount() { callCount = 0; }

module.exports = { getClient, getCallCount, resetCallCount };

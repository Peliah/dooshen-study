/**
 * Example: Agent-to-Agent Communication using A2A Protocol
 * 
 * This example demonstrates how agents can communicate with each other
 * using the A2A protocol via HTTP.
 * 
 * Prerequisites:
 * 1. Install @mastra/client-js: npm install @mastra/client-js
 * 2. Make sure your Mastra server is running (mastra dev or mastra start)
 * 3. Agents must be registered in your Mastra instance
 */

import { mastra } from '../src/mastra/index.js';

async function exampleA2ACommunication() {
  console.log('🔄 A2A Protocol Communication Example\n');

  // Option 1: Direct agent-to-agent communication (in-process)
  // This works when both agents are in the same Mastra instance
  console.log('Option 1: Direct Agent Communication (In-Process)');
  console.log('================================================\n');

  const animeAgent = mastra.getAgent('animeAgent');
  const weatherAgent = mastra.getAgent('weatherAgent');

  // Anime agent can use weather agent's capabilities
  const weatherResponse = await weatherAgent.generate(
    'What is the weather in Tokyo?'
  );
  console.log('Weather Agent Response:', weatherResponse.text);
  console.log('\n');

  // Weather agent can use anime agent's capabilities
  const animeResponse = await animeAgent.generate(
    'Get me a random anime quote'
  );
  console.log('Anime Agent Response:', animeResponse.text);
  console.log('\n');

  // Option 2: A2A Protocol Communication (HTTP-based)
  // This works when agents are on different servers or you want standardized communication
  console.log('Option 2: A2A Protocol Communication (HTTP-based)');
  console.log('==================================================\n');

  // Note: For A2A protocol, you need:
  // 1. Mastra server running (mastra dev or mastra start)
  // 2. @mastra/client-js package installed
  // 3. Agents registered with proper IDs

  console.log('To use A2A protocol:');
  console.log('1. Add a2aCommunicationTool to your agent');
  console.log('2. Use the tool to communicate with other agents');
  console.log('3. Example: animeAgent can ask weatherAgent via tool');
  console.log('\n');

  // Example using the tool (when added to agent)
  /*
  const animeAgentWithA2A = mastra.getAgent('animeAgent');
  const result = await animeAgentWithA2A.generate(
    'Ask the weather agent what the weather is in London, then suggest an anime to watch based on the weather'
  );
  */
}

// Example: Creating a collaborative agent
async function createCollaborativeAgent() {
  console.log('Creating Collaborative Agent Example\n');
  console.log('====================================\n');

  // An agent that can collaborate with others
  // This agent would have the a2aCommunicationTool available
  // and can delegate tasks to other agents

  console.log(`
  Example use case:
  
  User: "What's the weather in Tokyo? And if it's sunny, suggest an anime with beach scenes"
  
  The collaborative agent would:
  1. Use a2aCommunicationTool to ask weatherAgent about Tokyo weather
  2. Based on the response, use animeAgent (or a2a tool) to find relevant anime
  3. Compose a comprehensive answer
  
  This demonstrates true agent-to-agent collaboration!
  `);
}

// Run examples
exampleA2ACommunication().catch(console.error);
createCollaborativeAgent().catch(console.error);


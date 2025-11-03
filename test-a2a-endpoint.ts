/**
 * Test script for A2A endpoints
 * 
 * Run with: tsx test-a2a-endpoint.ts
 * 
 * Prerequisites:
 * - Mastra server must be running: pnpm dev
 * - Server should be on http://localhost:4111 (default)
 */

const BASE_URL = process.env.MASTRA_BASE_URL || 'http://localhost:4111';
const AGENT_ID = 'animeAgent';

/**
 * Test 1: Get agent card (capabilities)
 */
async function testAgentCard() {
  console.log('\n📋 Test 1: Get Agent Card');
  console.log('═'.repeat(50));
  
  try {
    const url = `${BASE_URL}/a2a/agent/${AGENT_ID}/card`;
    console.log(`GET ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log(JSON.stringify(data, null, 2));
      
      // Extract result if JSON-RPC 2.0 format
      if (data.jsonrpc === '2.0' && data.result) {
        console.log('\n📋 Agent Card Data:');
        console.log(JSON.stringify(data.result, null, 2));
      }
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

/**
 * Test 2: Send message via JSON-RPC 2.0
 */
async function testJsonRpcMessage() {
  console.log('\n📤 Test 2: Send Message (JSON-RPC 2.0)');
  console.log('═'.repeat(50));
  
  try {
    const url = `${BASE_URL}/a2a/agent/${AGENT_ID}`;
    console.log(`POST ${url}\n`);
    
    const requestBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'task.create',
      params: {
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: 'Get me a random anime quote' }],
          kind: 'message',
        },
      },
    };
    
    console.log('Request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('\nResponse:');
      console.log(JSON.stringify(data, null, 2));
      
      // Extract agent response text
      if (data.result?.status?.message?.parts) {
        const agentText = data.result.status.message.parts
          .find((p: any) => p.kind === 'text')?.text;
        if (agentText) {
          console.log('\n🤖 Agent Response:');
          console.log(agentText);
        }
      }
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

/**
 * Test 3: Send direct message via JSON-RPC 2.0 (A2A compliant)
 */
async function testDirectMessage() {
  console.log('\n📨 Test 3: Send Direct Message (JSON-RPC 2.0)');
  console.log('═'.repeat(50));
  
  try {
    const url = `${BASE_URL}/a2a/agent/${AGENT_ID}/message`;
    console.log(`POST ${url}\n`);
    
    const requestBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'task.create',
      params: {
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: 'Verify this quote: "I am Luffy! The man who will become the Pirate King!" - Who said this?' }],
          kind: 'message',
        },
      },
    };
    
    console.log('Request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('\nResponse:');
      console.log(JSON.stringify(data, null, 2));
      
      // Extract agent response text (handle JSON-RPC 2.0 format)
      const result = data.result || data; // Support both formats
      if (result.status?.message?.parts) {
        const agentText = result.status.message.parts
          .find((p: any) => p.kind === 'text')?.text;
        if (agentText) {
          console.log('\n🤖 Agent Response:');
          console.log(agentText);
        }
      }
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

/**
 * Test 4: MyAnimeList - Search Anime
 */
async function testMyAnimeListSearch() {
  console.log('\n🔍 Test 4: MyAnimeList - Search Anime (JSON-RPC 2.0)');
  console.log('═'.repeat(50));
  
  try {
    const url = `${BASE_URL}/a2a/agent/${AGENT_ID}/message`;
    console.log(`POST ${url}\n`);
    
    const requestBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'task.create',
      params: {
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: 'Search for One Piece anime on MyAnimeList' }],
          kind: 'message',
        },
      },
    };
    
    console.log('Request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      
      // Validate JSON-RPC 2.0 format
      if (data.jsonrpc === '2.0') {
        console.log('\n📋 JSON-RPC 2.0 Response Structure:');
        console.log(`   jsonrpc: ${data.jsonrpc}`);
        console.log(`   id: ${data.id}`);
        console.log(`   result.kind: ${data.result?.kind || 'N/A'}`);
        console.log(`   result.status.state: ${data.result?.status?.state || 'N/A'}`);
        
        const result = data.result;
        if (result) {
          // Show agent message
          if (result.status?.message?.parts) {
            const agentText = result.status.message.parts
              .find((p: any) => p.kind === 'text')?.text;
            if (agentText) {
              console.log('\n🤖 Agent Response:');
              console.log(agentText);
            }
          }
          
          // Show artifacts if present
          if (result.artifacts && result.artifacts.length > 0) {
            console.log(`\n📦 Artifacts (${result.artifacts.length}):`);
            result.artifacts.forEach((artifact: any, i: number) => {
              console.log(`   ${i + 1}. ${artifact.name}`);
              if (artifact.parts && artifact.parts.length > 0) {
                const partsInfo = artifact.parts.map((p: any) => p.kind).join(', ');
                console.log(`      Parts: ${partsInfo}`);
              }
            });
          }
          
          // Show history count
          if (result.history && result.history.length > 0) {
            console.log(`\n📜 Conversation History: ${result.history.length} message(s)`);
          }
        }
      } else {
        // Fallback for non-JSON-RPC format
        console.log('\n⚠️  Response not in JSON-RPC 2.0 format');
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      }
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

/**
 * Test 5: MyAnimeList - Get Anime Details
 */
async function testMyAnimeListDetails() {
  console.log('\n📋 Test 5: MyAnimeList - Get Anime Details (JSON-RPC 2.0)');
  console.log('═'.repeat(50));
  
  try {
    const url = `${BASE_URL}/a2a/agent/${AGENT_ID}/message`;
    console.log(`POST ${url}\n`);
    
    const requestBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'task.create',
      params: {
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: 'Get details about anime ID 30230 from MyAnimeList' }],
          kind: 'message',
        },
      },
    };
    
    console.log('Request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      
      // Validate JSON-RPC 2.0 format
      if (data.jsonrpc === '2.0') {
        console.log('\n📋 JSON-RPC 2.0 Response Structure:');
        console.log(`   jsonrpc: ${data.jsonrpc}`);
        console.log(`   id: ${data.id}`);
        console.log(`   result.kind: ${data.result?.kind || 'N/A'}`);
        console.log(`   result.status.state: ${data.result?.status?.state || 'N/A'}`);
        
        const result = data.result;
        if (result) {
          // Show agent message
          if (result.status?.message?.parts) {
            const agentText = result.status.message.parts
              .find((p: any) => p.kind === 'text')?.text;
            if (agentText) {
              console.log('\n🤖 Agent Response:');
              console.log(agentText);
            }
          }
          
          // Show artifacts if present
          if (result.artifacts && result.artifacts.length > 0) {
            console.log(`\n📦 Artifacts (${result.artifacts.length}):`);
            result.artifacts.forEach((artifact: any, i: number) => {
              console.log(`   ${i + 1}. ${artifact.name}`);
              if (artifact.parts && artifact.parts.length > 0) {
                const partsInfo = artifact.parts.map((p: any) => p.kind).join(', ');
                console.log(`      Parts: ${partsInfo}`);
              }
            });
          }
          
          // Show history count
          if (result.history && result.history.length > 0) {
            console.log(`\n📜 Conversation History: ${result.history.length} message(s)`);
          }
        }
      } else {
        // Fallback for non-JSON-RPC format
        console.log('\n⚠️  Response not in JSON-RPC 2.0 format');
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      }
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

/**
 * Test 6: MyAnimeList - Get Rankings
 */
async function testMyAnimeListRankings() {
  console.log('\n🏆 Test 6: MyAnimeList - Get Rankings (JSON-RPC 2.0)');
  console.log('═'.repeat(50));
  
  try {
    const url = `${BASE_URL}/a2a/agent/${AGENT_ID}/message`;
    console.log(`POST ${url}\n`);
    
    const requestBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'task.create',
      params: {
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: 'Get the top 5 anime rankings from MyAnimeList' }],
          kind: 'message',
        },
      },
    };
    
    console.log('Request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      
      // Validate JSON-RPC 2.0 format
      if (data.jsonrpc === '2.0') {
        console.log('\n📋 JSON-RPC 2.0 Response Structure:');
        console.log(`   jsonrpc: ${data.jsonrpc}`);
        console.log(`   id: ${data.id}`);
        console.log(`   result.kind: ${data.result?.kind || 'N/A'}`);
        console.log(`   result.status.state: ${data.result?.status?.state || 'N/A'}`);
        
        const result = data.result;
        if (result) {
          // Show agent message
          if (result.status?.message?.parts) {
            const agentText = result.status.message.parts
              .find((p: any) => p.kind === 'text')?.text;
            if (agentText) {
              console.log('\n🤖 Agent Response:');
              console.log(agentText);
            }
          }
          
          // Show artifacts if present
          if (result.artifacts && result.artifacts.length > 0) {
            console.log(`\n📦 Artifacts (${result.artifacts.length}):`);
            result.artifacts.forEach((artifact: any, i: number) => {
              console.log(`   ${i + 1}. ${artifact.name}`);
              if (artifact.parts && artifact.parts.length > 0) {
                const partsInfo = artifact.parts.map((p: any) => p.kind).join(', ');
                console.log(`      Parts: ${partsInfo}`);
              }
            });
          }
          
          // Show history count
          if (result.history && result.history.length > 0) {
            console.log(`\n📜 Conversation History: ${result.history.length} message(s)`);
          }
        }
      } else {
        // Fallback for non-JSON-RPC format
        console.log('\n⚠️  Response not in JSON-RPC 2.0 format');
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      }
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

/**
 * Test 7: MyAnimeList - Get Seasonal Anime
 */
async function testMyAnimeListSeasonal() {
  console.log('\n🌸 Test 7: MyAnimeList - Get Seasonal Anime (JSON-RPC 2.0)');
  console.log('═'.repeat(50));
  
  try {
    const url = `${BASE_URL}/a2a/agent/${AGENT_ID}/message`;
    console.log(`POST ${url}\n`);
    
    const requestBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'task.create',
      params: {
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: 'Show me summer 2017 anime from MyAnimeList' }],
          kind: 'message',
        },
      },
    };
    
    console.log('Request body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      
      // Validate JSON-RPC 2.0 format
      if (data.jsonrpc === '2.0') {
        console.log('\n📋 JSON-RPC 2.0 Response Structure:');
        console.log(`   jsonrpc: ${data.jsonrpc}`);
        console.log(`   id: ${data.id}`);
        console.log(`   result.kind: ${data.result?.kind || 'N/A'}`);
        console.log(`   result.status.state: ${data.result?.status?.state || 'N/A'}`);
        
        const result = data.result;
        if (result) {
          // Show agent message
          if (result.status?.message?.parts) {
            const agentText = result.status.message.parts
              .find((p: any) => p.kind === 'text')?.text;
            if (agentText) {
              console.log('\n🤖 Agent Response:');
              console.log(agentText);
            }
          }
          
          // Show artifacts if present
          if (result.artifacts && result.artifacts.length > 0) {
            console.log(`\n📦 Artifacts (${result.artifacts.length}):`);
            result.artifacts.forEach((artifact: any, i: number) => {
              console.log(`   ${i + 1}. ${artifact.name}`);
              if (artifact.parts && artifact.parts.length > 0) {
                const partsInfo = artifact.parts.map((p: any) => p.kind).join(', ');
                console.log(`      Parts: ${partsInfo}`);
              }
            });
          }
          
          // Show history count
          if (result.history && result.history.length > 0) {
            console.log(`\n📜 Conversation History: ${result.history.length} message(s)`);
          }
        }
      } else {
        // Fallback for non-JSON-RPC format
        console.log('\n⚠️  Response not in JSON-RPC 2.0 format');
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      }
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

/**
 * Test 4: Check if server is running
 */
async function testServerHealth() {
  console.log('\n🏥 Test 0: Check Server Health');
  console.log('═'.repeat(50));
  
  try {
    // Try to access the agent card endpoint instead of /health
    // This will tell us if the server is running and A2A routes are available
    const url = `${BASE_URL}/a2a/agent/${AGENT_ID}/card`;
    console.log(`GET ${url}\n`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ Server is running and A2A routes are active!');
        console.log(`   Agent: ${data.name || AGENT_ID}`);
        return true;
      } else {
        console.log('⚠️  Server responded but with unexpected content type');
        return true; // Still consider it running
      }
    } else if (response.status === 404) {
      console.log('⚠️  Server is running but agent not found');
      console.log(`   Agent ID "${AGENT_ID}" might not be registered`);
      return true; // Server is running, just agent issue
    } else {
      console.log(`⚠️  Server responded with status ${response.status}`);
      return true; // Still consider it running
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.error('❌ Server is not running!');
      console.error(`   Make sure you've started the Mastra server:`);
      console.error(`   pnpm dev`);
      console.error(`   or`);
      console.error(`   mastra dev`);
      return false;
    }
    // Check if it's a JSON parse error (HTML response = server running)
    if (error.message?.includes('JSON') || error.message?.includes('token')) {
      console.log('✅ Server is running (got non-JSON response, which is normal)');
      return true;
    }
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Wait function - 2 minute delay between tests
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 A2A Endpoint Test Suite');
  console.log('═'.repeat(50));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log('═'.repeat(50));
  
  // First check if server is running
  const serverRunning = await testServerHealth();
  
  if (!serverRunning) {
    console.log('\n❌ Cannot proceed with tests. Server is not running.');
    process.exit(1);
  }
  
  // Run all tests with 2-minute intervals
  await testAgentCard();
  
  console.log('\n⏳ Waiting 2 minutes before next test...');
//   await wait(2 * 60 * 1000); // 2 minutes = 120,000 ms
  
  await testJsonRpcMessage();
  
  console.log('\n⏳ Waiting 2 minutes before next test...');
  await wait(2 * 45 * 1000); // 2 minutes = 120,000 ms
  
  await testDirectMessage();
  
  console.log('\n⏳ Waiting 2 minutes before next test...');
  await wait(2 * 45 * 1000); // 2 minutes = 120,000 ms
  
  await testMyAnimeListSearch();
  
  console.log('\n⏳ Waiting 2 minutes before next test...');
  await wait(2 * 45 * 1000); // 2 minutes = 120,000 ms
  
  await testMyAnimeListDetails();
  
  console.log('\n⏳ Waiting 2 minutes before next test...');
  await wait(2 * 45 * 1000); // 2 minutes = 120,000 ms
  
  await testMyAnimeListRankings();
  
  console.log('\n⏳ Waiting 2 minutes before next test...');
  await wait(2 * 45 * 1000); // 2 minutes = 120,000 ms
  
  await testMyAnimeListSeasonal();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. If tests passed, your A2A endpoint is working!');
  console.log('2. Deploy your Mastra instance to get a public URL');
  console.log('3. Use that URL to integrate with Telex.im');
  console.log(`4. Integration URL format: https://your-url.com/a2a/agent/${AGENT_ID}`);
}

// Run tests
runAllTests().catch(console.error);


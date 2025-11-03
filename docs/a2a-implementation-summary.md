# A2A Protocol Implementation Summary

## Quick Start

I've created **two tools** for agent-to-agent communication:

### 1. `callAgentTool` (Recommended for your use case)
- **File**: `src/mastra/tools/call-agent-tool.ts`
- **Purpose**: Direct in-process agent communication
- **When to use**: All agents in same Mastra instance
- **No dependencies**: Works out of the box

### 2. `a2aCommunicationTool` (For distributed systems)
- **File**: `src/mastra/tools/a2a-communication-tool.ts`
- **Purpose**: HTTP-based A2A protocol communication
- **When to use**: Agents on different servers
- **Dependency**: Requires `@mastra/client-js` package

## Implementation Steps

### Step 1: Choose Your Approach

For your current setup (all agents in one Mastra instance), **use `callAgentTool`**:

```typescript
import { callAgentTool } from '../tools/call-agent-tool';

// Add to your agent
export const animeAgent = new Agent({
  // ...
  tools: {
    // ... existing tools
    callAgentTool,  // Add this
  },
});
```

### Step 2: Update Agent Instructions

Tell your agent when and how to use the tool:

```typescript
instructions: `
You are an anime assistant. When you need information that another agent specializes in:

- Weather information → Use callAgentTool with agentId="weatherAgent"
- Study materials → Use callAgentTool with agentId="studyBuddyAgent"

Example: If user asks "What anime should I watch on a rainy day?", first ask the weather agent about current weather, then suggest appropriate anime.
`
```

### Step 3: Test It

```typescript
// The agent can now call other agents
const result = await animeAgent.generate(
  'What is the weather in Tokyo? Also, suggest an anime that matches the mood.'
);

// The anime agent will:
// 1. Call weatherAgent to get weather
// 2. Use that info to suggest anime
```

## Example: Collaborative Agent

Create an agent that orchestrates others:

```typescript
import { callAgentTool } from '../tools/call-agent-tool';

export const orchestratorAgent = new Agent({
  name: 'orchestrator-agent',
  instructions: `
You coordinate tasks between specialized agents:
- Use callAgentTool to delegate tasks to the right agent
- Combine their responses for comprehensive answers
- Available agents: weatherAgent, animeAgent, studyBuddyAgent
`,
  tools: {
    callAgentTool,
  },
  // ... rest of config
});
```

## Next Steps

1. ✅ **Add `callAgentTool` to your anime agent** (or create an orchestrator agent)
2. ✅ **Update agent instructions** to explain when to use the tool
3. ✅ **Test with a multi-agent query** like: "What's the weather in Tokyo? Based on that, suggest an anime to watch."
4. 🔄 **For distributed setup**: Install `@mastra/client-js` and use `a2aCommunicationTool`

## Files Created

- `src/mastra/tools/call-agent-tool.ts` - Direct communication tool
- `src/mastra/tools/a2a-communication-tool.ts` - A2A protocol tool
- `docs/a2a-protocol-guide.md` - Detailed guide
- `examples/a2a-example.ts` - Usage examples


# Agent-to-Agent (A2A) Protocol Guide

## Overview

There are **two approaches** for agent-to-agent communication in Mastra:

1. **Direct In-Process Communication** (Simpler, Same Process)
   - Agents call each other directly using `mastra.getAgent()`
   - Works when all agents are in the same Mastra instance
   - No HTTP overhead, faster

2. **A2A Protocol Communication** (Distributed, HTTP-based)
   - Agents communicate via HTTP using standardized A2A protocol
   - Works across different services/servers
   - Enables agent discovery and capability advertising
   - Better for distributed systems

## Approach 1: Direct In-Process Communication

### How It Works

When agents are in the same Mastra instance, they can directly call each other:

```typescript
// In a workflow or tool
const otherAgent = mastra.getAgent('otherAgentId');
const response = await otherAgent.generate('question');
```

### Example: Agent Tool for Direct Communication

Create a tool that lets one agent call another:

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const callAgentTool = createTool({
  id: 'call-agent',
  description: 'Call another agent to help with a task',
  inputSchema: z.object({
    agentId: z.string().describe('ID of the agent to call'),
    message: z.string().describe('Message to send to the agent'),
  }),
  outputSchema: z.object({
    response: z.string(),
    agentName: z.string(),
  }),
  execute: async ({ context, runtimeContext }) => {
    // Import mastra to access agents
    const { mastra } = await import('../index');
    const agent = mastra?.getAgent(context.agentId);
    
    if (!agent) {
      throw new Error(`Agent ${context.agentId} not found`);
    }
    
    const result = await agent.generate(context.message);
    
    return {
      response: result.text,
      agentName: agent.name || context.agentId,
    };
  },
});
```

## Approach 2: A2A Protocol (HTTP-based)

### Architecture

```
Agent A (Anime Agent)  <--A2A Protocol (HTTP)-->  Agent B (Weather Agent)
         ↓                                                  ↓
    Mastra Server                                      Mastra Server
         ↓                                                  ↓
    HTTP/JSON-RPC                                    HTTP/JSON-RPC
```

### Implementation Steps

#### 1. Install Required Package

```bash
npm install @mastra/client-js
```

#### 2. Set Up Mastra Server

Run your Mastra instance as a server:

```bash
# Development
npm run dev  # or: mastra dev

# Production
npm run start  # or: mastra start
```

This exposes agents via HTTP at `http://localhost:4111` (default).

#### 3. Use A2A Communication Tool

The `a2aCommunicationTool` allows agents to communicate via HTTP using A2A protocol.

#### 4. Agent Cards

Agent cards automatically describe capabilities based on:
- Agent `description`
- Available `tools`
- Agent `instructions` summary

## Which Approach Should You Use?

**Use Direct Communication (Approach 1)** when:
- ✅ All agents are in the same Mastra instance
- ✅ You want faster, simpler communication
- ✅ No need for distributed architecture

**Use A2A Protocol (Approach 2)** when:
- ✅ Agents run on different servers/services
- ✅ You need standardized interfaces
- ✅ Building a distributed multi-agent system
- ✅ You want agent discovery capabilities
- ✅ Need enterprise security features


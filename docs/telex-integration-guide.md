# Telex.im Integration Guide

## Overview

This guide shows how to integrate your Mastra anime agent with Telex.im using the A2A protocol, following the pattern from [Fynix's blog post](https://fynix.dev/blog/telex-x-mastra).

## Architecture

```
Telex.im  →  A2A Protocol (HTTP/JSON-RPC)  →  Your Mastra Agent
                ↓
          Route Handler (Express)
                ↓
          Mastra Instance
                ↓
          Anime Agent
```

## Step 1: A2A Route Handler Setup

The A2A route handler bridges Telex.im's A2A requests with your Mastra agent.

### Files Created

- `src/mastra/routes/a2a-agent-route.ts` - A2A protocol handlers using Mastra's `registerApiRoute`

### No Additional Dependencies Needed

The routes use Mastra's built-in server system (`registerApiRoute` from `@mastra/core/server`), so no Express installation is required!

## Step 2: Start the Mastra Server

The A2A routes are automatically registered when you import them in your Mastra instance. Simply start the Mastra server:

```bash
# Development
npm run dev  # or: mastra dev

# Production
npm run start  # or: mastra start
```

The routes will be available at:
- `POST /a2a/agent/:agentId` - Main A2A endpoint (JSON-RPC 2.0)
- `GET /a2a/agent/:agentId/card` - Get agent capabilities
- `POST /a2a/agent/:agentId/message` - Direct message format (simpler)

## Step 3: Deploy to Production

### Deploy to Mastra Cloud

```bash
mastra deploy
```

This will give you a URL like:
```
https://your-agent-id.mastra.cloud
```

### Deploy to Your Own Server

1. Set up your hosting (Railway, Render, Fly.io, etc.)
2. Point your domain to the server
3. Configure environment variables
4. Start the A2A server

## Step 4: Test Your A2A Endpoint

### Test Agent Card (Capabilities)

```bash
curl http://localhost:4111/a2a/agent/animeAgent/card
```

Expected response:
```json
{
  "result": {
    "name": "Anime Agent",
    "description": "An AI assistant that helps with anime quotes...",
    "version": "1.0.0",
    "capabilities": {
      "tools": [...],
      "instructions": "..."
    }
  }
}
```

### Test Message Sending (JSON-RPC 2.0)

```bash
curl -X POST http://localhost:4111/a2a/agent/animeAgent \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "task.create",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "Get me a random anime quote"}],
        "kind": "message"
      }
    }
  }'
```

### Test Direct Message Format (Simpler)

```bash
curl -X POST http://localhost:4111/a2a/agent/animeAgent/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "role": "user",
      "parts": [{"kind": "text", "text": "Get me a random anime quote"}],
      "kind": "message"
    }
  }'
```

## Step 5: Integrate with Telex.im

### 1. Create AI Co-Worker in Telex

1. Go to your Telex dashboard
2. Navigate to **AI Co-Workers**
3. Click **Create New Co-Worker**

### 2. Configure the Workflow

In the workflow editor, paste this workflow definition:

```json
{
  "name": "Anime Quote Assistant",
  "description": "Get anime quotes and verify character quotes",
  "nodes": [
    {
      "id": "anime-agent",
      "type": "ai-agent",
      "name": "Anime Agent",
      "description": "Specialized in anime quotes and character information",
      "url": "https://your-agent-url.com/a2a/agent/animeAgent",
      "config": {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "message": {
            "role": "user",
            "parts": [
              {
                "kind": "text",
                "text": "{{userMessage}}"
              }
            ],
            "kind": "message"
          }
        }
      }
    }
  ]
}
```

**Important**: Replace `https://your-agent-url.com` with your actual deployed agent URL.

### 3. Understanding the Configuration

The key field is the `url` - this is your A2A endpoint. The workflow JSON is primarily descriptive metadata.

The `{{userMessage}}` template variable will be replaced with the actual user message from Telex.

## How It Works

1. **User sends message in Telex**: "Get me a random anime quote"

2. **Telex constructs A2A request (JSON-RPC 2.0)**:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "task.create",
     "params": {
       "message": {
         "role": "user",
         "parts": [{"kind": "text", "text": "Get me a random anime quote"}],
         "kind": "message"
       }
     }
   }
   ```

3. **A2A Route Handler processes request**:
   - Receives the A2A message
   - Extracts the user's question
   - Calls your Mastra anime agent
   - Gets the response

4. **Response is returned in A2A format (JSON-RPC 2.0)**:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "result": {
       "id": "task-123",
       "contextId": "context-456",
       "status": {
         "state": "completed",
         "timestamp": "2025-01-15T10:30:00Z",
         "message": {
           "messageId": "msg-789",
           "role": "agent",
           "parts": [{"kind": "text", "text": "Here's a quote from Naruto..."}],
           "kind": "message"
         }
       },
       "artifacts": [...],
       "history": [...],
       "kind": "task"
     }
   }
   ```

5. **Telex displays the response** to the user

## Key Benefits

### 1. Standardization
- A2A protocol ensures compatibility across platforms
- Your agent works with Telex and any A2A-compliant platform

### 2. Context Management
- Conversation history is maintained
- Multi-turn conversations are supported

### 3. Structured Artifacts
- Tool calls and results are included
- Enables complex workflow orchestration

### 4. Error Handling
- JSON-RPC 2.0 compliant error responses
- Standardized debugging and monitoring

## Troubleshooting

### Agent Not Found
```json
{
  "error": {
    "code": -32001,
    "message": "Agent \"animeAgent\" not found"
  }
}
```

**Solution**: Make sure the agent ID in the URL matches the agent ID in your Mastra instance.

### Connection Errors
- Check that your server is running
- Verify the URL is accessible
- Check firewall/network settings

### Response Format Issues
- Ensure the route handler returns proper A2A format
- Check that the response includes required fields

## Example Use Cases

### 1. Quote Verification
User: "Did Light Yagami say 'I'll become the god of this new world'?"
→ Agent verifies and responds

### 2. Random Quotes
User: "Give me an inspiring anime quote"
→ Agent fetches and returns a quote

### 3. Character-Specific Quotes
User: "Show me quotes from Luffy"
→ Agent searches and returns quotes

## Next Steps

1. ✅ Set up A2A route handler
2. ✅ Test endpoints locally
3. ✅ Deploy to production
4. ✅ Integrate with Telex.im
5. 🎉 Start using your agent!

## Resources

- [Fynix Blog: Telex x Mastra](https://fynix.dev/blog/telex-x-mastra)
- [A2A Protocol Specification](https://a2a.cx/)
- [Mastra Documentation](https://docs.mastra.ai)
- [Telex Platform](https://telex.im)


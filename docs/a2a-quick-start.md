# A2A Protocol Quick Start

## Overview

Your Mastra agents are now exposed via A2A protocol using `registerApiRoute` from `@mastra/core/server`, following the pattern from [Fynix's blog post](https://fynix.dev/blog/telex-x-mastra).

## Available Endpoints

Once you start your Mastra server (`npm run dev` or `mastra dev`), these endpoints are automatically available:

### 1. Main A2A Endpoint (JSON-RPC 2.0)
```
POST /a2a/agent/:agentId
```

### 2. Agent Card (Capabilities)
```
GET /a2a/agent/:agentId/card
```

### 3. Direct Message (Simpler Format)
```
POST /a2a/agent/:agentId/message
```

## Example Usage

### Get Agent Capabilities

```bash
curl http://localhost:4111/a2a/agent/animeAgent/card
```

Response:
```json
{
  "name": "Anime Agent",
  "description": "An AI assistant that helps with anime quotes...",
  "version": "1.0.0",
  "capabilities": {
    "tools": [
      {"name": "getRandomQuoteTool", "description": "..."},
      ...
    ],
    "instructions": "..."
  }
}
```

### Send Message (JSON-RPC 2.0)

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

### Send Direct Message (Simpler)

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

## Integration with Telex.im

1. **Deploy your Mastra instance** (get a public URL)
2. **In Telex dashboard**, create an AI Co-Worker
3. **Use this URL**: `https://your-url.com/a2a/agent/animeAgent`
4. **Configure the workflow** as shown in `docs/telex-integration-guide.md`

## How It Works

The routes are registered using Mastra's `registerApiRoute` function, which automatically:
- ✅ Integrates with Mastra's server
- ✅ Provides access to the Mastra instance via context
- ✅ Handles JSON-RPC 2.0 protocol
- ✅ Formats responses in A2A-compliant format
- ✅ Includes artifacts and conversation history

## Files

- `src/mastra/routes/a2a-agent-route.ts` - A2A route handlers
- `src/mastra/index.ts` - Routes automatically registered via import

## Next Steps

1. Start your Mastra server: `npm run dev`
2. Test the endpoints locally
3. Deploy to production
4. Integrate with Telex.im or other A2A-compliant platforms

For detailed integration steps, see `docs/telex-integration-guide.md`.


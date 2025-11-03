/**
 * A2A Protocol Route Handler for Anime Agent
 * 
 * This handler enables external platforms (like Telex.im) to communicate
 * with your Mastra agents using the A2A protocol.
 * 
 * Based on: https://fynix.dev/blog/telex-x-mastra
 */

import { registerApiRoute } from '@mastra/core/server';
import { randomUUID } from 'crypto';

/**
 * Main A2A route handler for agents
 * Handles JSON-RPC 2.0 requests and returns A2A-compliant responses
 */
export const a2aAgentRoute = registerApiRoute('/a2a/agent/:agentId', {
  method: 'POST',
  handler: async (c) => {
    try {
      const mastra = c.get('mastra');
      const agentId = c.req.param('agentId');

      // Parse JSON-RPC 2.0 request
      const body = await c.req.json();
      const { jsonrpc, id: requestId, method, params } = body;

      // Validate JSON-RPC 2.0 format
      if (jsonrpc !== '2.0' || !requestId) {
        return c.json(
          {
            jsonrpc: '2.0',
            id: requestId || null,
            error: {
              code: -32600,
              message:
                'Invalid Request: jsonrpc must be "2.0" and id is required',
            },
          },
          200
        );
      }

      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json(
          {
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32602,
              message: `Agent '${agentId}' not found`,
            },
          },
          200
        );
      }

      // Extract messages from params
      const { message, messages, contextId, taskId, metadata } = params || {};

      let messagesList: any[] = [];

      if (message) {
        messagesList = [message];
      } else if (messages && Array.isArray(messages)) {
        messagesList = messages;
      }

      // Convert A2A messages to Mastra format
      const mastraMessages = messagesList.map((msg) => ({
        role: msg.role,
        content:
          msg.parts
            ?.map((part: any) => {
              if (part.kind === 'text') return part.text;
              if (part.kind === 'data') return JSON.stringify(part.data);
              return '';
            })
            .join('\n') || '',
      }));

      // Execute agent
      const response = await agent.generate(mastraMessages);
      const agentText = response.text || '';

      // Build artifacts array
      const artifacts: any[] = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [{ kind: 'text', text: agentText }],
        },
      ];

      // Add tool results as artifacts
      if (response.toolResults && response.toolResults.length > 0) {
        artifacts.push({
          artifactId: randomUUID(),
          name: 'ToolResults',
          parts: response.toolResults.map((result: any) => ({
            kind: 'data',
            data: result,
          })),
        });
      }

      // Build conversation history
      const history = [
        ...messagesList.map((msg: any) => ({
          kind: 'message',
          role: msg.role,
          parts: msg.parts,
          messageId: msg.messageId || randomUUID(),
          taskId: msg.taskId || taskId || randomUUID(),
        })),
        {
          kind: 'message',
          role: 'agent',
          parts: [{ kind: 'text', text: agentText }],
          messageId: randomUUID(),
          taskId: taskId || randomUUID(),
        },
      ];

      // Return A2A-compliant response
      return c.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          id: taskId || randomUUID(),
          contextId: contextId || randomUUID(),
          status: {
            state: 'completed',
            timestamp: new Date().toISOString(),
            message: {
              messageId: randomUUID(),
              role: 'agent',
              parts: [{ kind: 'text', text: agentText }],
              kind: 'message',
            },
          },
          artifacts,
          history,
          kind: 'task',
        },
      });
    } catch (error: any) {
      return c.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: { details: error.message },
          },
        },
        500
      );
    }
  },
});

/**
 * A2A Agent Card Route
 * Returns agent capabilities in A2A format
 */
export const a2aAgentCardRoute = registerApiRoute('/a2a/agent/:agentId/card', {
  method: 'GET',
  handler: async (c) => {
    try {
      const mastra = c.get('mastra');
      const agentId = c.req.param('agentId');

      // Get request ID from query or body for JSON-RPC 2.0
      const requestId = c.req.query('id') || c.req.query('requestId') || 1;

      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json(
          {
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32001,
              message: `Agent '${agentId}' not found`,
            },
          },
          404
        );
      }

      // Get agent tools
      const tools = await agent.getTools();
      const toolsList = Object.entries(tools || {}).map(
        ([name, tool]: [string, any]) => ({
          name,
          description: tool.description || tool.id || name,
        })
      );

      // Get agent properties using proper methods
      const description = await agent.getDescription();
      const instructions = await agent.getInstructions();
      const agentName = agent.name || agentId;

      // Return agent card in JSON-RPC 2.0 format
      return c.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          name: agentName,
          description: description || `Agent: ${agentId}`,
          version: '1.0.0',
          capabilities: {
            tools: toolsList,
            instructions: Array.isArray(instructions)
              ? instructions.map((i: any) => (typeof i === 'string' ? i : i.content || '')).join('\n')
              : typeof instructions === 'string'
              ? instructions
              : '',
          },
        },
      });
    } catch (error: any) {
      return c.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: { details: error.message },
          },
        },
        500
      );
    }
  },
});

/**
 * Alternative message endpoint (simpler format, non-JSON-RPC)
 * Some platforms prefer direct POST with message
 */
export const a2aAgentMessageRoute = registerApiRoute(
  '/a2a/agent/:agentId/message',
  {
    method: 'POST',
    handler: async (c) => {
      try {
        const mastra = c.get('mastra');
        const agentId = c.req.param('agentId');

        const body = await c.req.json();
        // Support both JSON-RPC 2.0 and direct message formats
        const { jsonrpc, id: requestId, params, message, messages, contextId, taskId } = body;
        
        // Extract message from params if JSON-RPC format, otherwise from body
        const actualMessage = params?.message || message;
        const actualMessages = params?.messages || messages;
        const actualContextId = params?.contextId || contextId;
        const actualTaskId = params?.taskId || taskId;

        const agent = mastra.getAgent(agentId);
        if (!agent) {
          const errorResponse: any = {
            jsonrpc: '2.0',
            id: requestId || null,
            error: {
              code: -32001,
              message: `Agent '${agentId}' not found`,
            },
          };
          return c.json(errorResponse, 404);
        }

        let messagesList: any[] = [];

        if (actualMessage) {
          messagesList = [actualMessage];
        } else if (actualMessages && Array.isArray(actualMessages)) {
          messagesList = actualMessages;
        }

        // Convert A2A messages to Mastra format
        const mastraMessages = messagesList.map((msg: any) => ({
          role: msg.role,
          content:
            msg.parts
              ?.map((part: any) => {
                if (part.kind === 'text') return part.text;
                if (part.kind === 'data') return JSON.stringify(part.data);
                return '';
              })
              .join('\n') || '',
        }));

        // Execute agent
        const response = await agent.generate(mastraMessages);
        const agentText = response.text || '';

        // Build artifacts
        const artifacts: any[] = [
          {
            artifactId: randomUUID(),
            name: `${agentId}Response`,
            parts: [{ kind: 'text', text: agentText }],
          },
        ];

        if (response.toolResults && response.toolResults.length > 0) {
          artifacts.push({
            artifactId: randomUUID(),
            name: 'ToolResults',
            parts: response.toolResults.map((result: any) => ({
              kind: 'data',
              data: result,
            })),
          });
        }

        // Build history
        const history = [
          ...messagesList.map((msg: any) => ({
            kind: 'message',
            role: msg.role,
            parts: msg.parts,
            messageId: msg.messageId || randomUUID(),
            taskId: msg.taskId || actualTaskId || randomUUID(),
          })),
          {
            kind: 'message',
            role: 'agent',
            parts: [{ kind: 'text', text: agentText }],
            messageId: randomUUID(),
            taskId: actualTaskId || randomUUID(),
          },
        ];

        // Return A2A-compliant response in JSON-RPC 2.0 format
        return c.json({
          jsonrpc: '2.0',
          id: requestId || randomUUID(),
          result: {
            id: actualTaskId || randomUUID(),
            contextId: actualContextId || randomUUID(),
            status: {
              state: 'completed',
              timestamp: new Date().toISOString(),
              message: {
                messageId: randomUUID(),
                role: 'agent',
                parts: [{ kind: 'text', text: agentText }],
                kind: 'message',
              },
            },
            artifacts,
            history,
            kind: 'task',
          },
        });
      } catch (error: any) {
        return c.json(
          {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32603,
              message: 'Internal error',
              data: { details: error.message },
            },
          },
          500
        );
      }
    },
  }
);


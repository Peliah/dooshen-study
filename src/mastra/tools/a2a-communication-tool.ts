import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for agent-to-agent communication using A2A protocol
 * Allows agents to communicate with other agents via HTTP using the A2A protocol
 */
export const a2aCommunicationTool = createTool({
  id: 'a2a-communicate',
  description:
    'Communicate with another agent using the A2A protocol. This enables agent-to-agent communication via HTTP. The target agent must be running and accessible via Mastra server.',
  inputSchema: z.object({
    targetAgentId: z
      .string()
      .describe(
        'The ID of the target agent to communicate with (e.g., "weatherAgent", "animeAgent")'
      ),
    message: z
      .string()
      .describe('The message to send to the target agent'),
    baseUrl: z
      .string()
      .optional()
      .describe(
        'Base URL of the Mastra server. Defaults to http://localhost:4111 or from MASTRA_BASE_URL env variable'
      ),
    waitForResponse: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Whether to wait for the agent response. If false, returns immediately with task ID'
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    agentResponse: z.string().optional().describe('Response from the target agent'),
    taskId: z.string().optional().describe('Task ID if async operation'),
    error: z.string().optional().describe('Error message if communication failed'),
    agentName: z.string().optional().describe('Name of the target agent'),
  }),
  execute: async ({ context, runtimeContext }) => {
    const { targetAgentId, message, baseUrl, waitForResponse } = context;

    try {
      // Dynamically import MastraClient (optional dependency)
      let MastraClient;
      try {
        const clientModule = await import('@mastra/client-js');
        MastraClient = clientModule.MastraClient;
      } catch (error) {
        throw new Error(
          '@mastra/client-js package is required for A2A protocol communication. Install it with: npm install @mastra/client-js'
        );
      }

      // Get base URL from env or parameter
      const mastraBaseUrl =
        baseUrl ||
        process.env.MASTRA_BASE_URL ||
        'http://localhost:4111';

      // Initialize Mastra client
      const client = new MastraClient({
        baseUrl: mastraBaseUrl,
      });

      // Get A2A client for the target agent
      const a2aClient = client.getA2A(targetAgentId);

      // Step 1: Get agent card to verify agent exists and get capabilities
      let agentCard;
      try {
        agentCard = await a2aClient.getCard();
      } catch (error) {
        return {
          success: false,
          error: `Agent "${targetAgentId}" not found or not accessible. Make sure the agent is registered and the Mastra server is running at ${mastraBaseUrl}`,
        };
      }

      // Step 2: Send message to agent
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await a2aClient.sendMessage({
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: message }],
          kind: 'message',
          messageId,
        },
      });

      // Handle error response
      if ('error' in response) {
        return {
          success: false,
          error: response.error.message || 'Failed to send message to agent',
          agentName: agentCard.name,
        };
      }

      // Handle message response (if immediate)
      if ('messageId' in response.result) {
        return {
          success: true,
          taskId: response.result.messageId,
          agentName: agentCard.name,
          agentResponse: waitForResponse
            ? 'Message sent, waiting for response...'
            : 'Message sent successfully',
        };
      }

      // Handle task response
      const task = response.result;

      // If we should wait for response, poll for task completion
      if (waitForResponse && task.status.state === 'running') {
        // Poll for task completion (with timeout)
        const maxAttempts = 30;
        let attempts = 0;
        let currentTask = task;

        while (
          currentTask.status.state === 'running' &&
          attempts < maxAttempts
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

          const taskStatus = await a2aClient.getTask({
            id: currentTask.id,
          });

          if ('error' in taskStatus) {
            return {
              success: false,
              error: taskStatus.error.message,
              agentName: agentCard.name,
            };
          }

          currentTask = taskStatus.result;
          attempts++;
        }

        // Extract response from completed task
        if (
          currentTask.status.state === 'completed' &&
          currentTask.status.message
        ) {
          const responseText =
            currentTask.status.message.parts
              ?.find((part: any) => part.kind === 'text')
              ?.text || 'No response text available';

          return {
            success: true,
            agentResponse: responseText,
            taskId: currentTask.id,
            agentName: agentCard.name,
          };
        }

        return {
          success: true,
          taskId: currentTask.id,
          agentName: agentCard.name,
          agentResponse: 'Task completed but no response text available',
        };
      }

      // Return immediate response
      const immediateResponse =
        task.status.message?.parts
          ?.find((part: any) => part.kind === 'text')
          ?.text || '';

      return {
        success: true,
        agentResponse: immediateResponse || 'Message sent successfully',
        taskId: task.id,
        agentName: agentCard.name,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during A2A communication',
      };
    }
  },
});


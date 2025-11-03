import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for direct agent-to-agent communication (in-process)
 * This allows agents to call other agents in the same Mastra instance
 * 
 * Note: This is simpler than A2A protocol and works when all agents
 * are in the same process. For distributed communication, use a2aCommunicationTool.
 */
export const callAgentTool = createTool({
  id: 'call-agent',
  description:
    'Call another agent to help with a task. This enables direct agent-to-agent communication within the same Mastra instance. Use this when you need to delegate a task to another specialized agent.',
  inputSchema: z.object({
    agentId: z
      .string()
      .describe(
        'The ID of the agent to call (e.g., "weatherAgent", "animeAgent", "studyBuddyAgent")'
      ),
    message: z
      .string()
      .describe('The message or question to send to the target agent'),
  }),
  outputSchema: z.object({
    response: z
      .string()
      .describe('The response from the target agent'),
    agentName: z
      .string()
      .describe('Name of the agent that responded'),
    agentId: z
      .string()
      .describe('ID of the agent that was called'),
  }),
  execute: async ({ context, runtimeContext }) => {
    try {
      // Import mastra to access agents
      const { mastra } = await import('../index');
      
      if (!mastra) {
        throw new Error('Mastra instance not found');
      }

      const agent = mastra.getAgent(context.agentId);

      if (!agent) {
        throw new Error(
          `Agent "${context.agentId}" not found. Available agents: ${Object.keys(
            mastra.agents || {}
          ).join(', ')}`
        );
      }

      // Call the agent with the message
      const result = await agent.generate(context.message);

      return {
        response: result.text,
        agentName: agent.name || context.agentId,
        agentId: context.agentId,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to call agent: ${error.message}`);
      }
      throw new Error('Failed to call agent: Unknown error');
    }
  },
});


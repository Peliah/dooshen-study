import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for querying document content and answering questions
 * Uses the agent's knowledge and memory to provide answers with citations
 * 
 * Note: Once a vector store is configured, this can be enhanced with
 * createVectorQueryTool from @mastra/rag for semantic search
 */
export const queryDocumentTool = createTool({
  id: 'query-document',
  description:
    'Answer questions about document content. Provides answers based on processed documents with relevant context and citations. Can filter by chapter or topic if specified.',
  inputSchema: z.object({
    question: z
      .string()
      .describe('The question to answer about the document content'),
    chapter: z
      .string()
      .optional()
      .describe('Optional chapter or section identifier to narrow the search'),
    topic: z
      .string()
      .optional()
      .describe('Optional topic filter to narrow the search'),
    documentId: z
      .string()
      .optional()
      .describe('Optional document ID to query specific document'),
  }),
  outputSchema: z.object({
    answer: z
      .string()
      .describe('The answer to the question based on document content'),
    context: z
      .array(z.string())
      .describe('Relevant context chunks from the document'),
    sources: z
      .array(
        z.object({
          chapter: z.string().optional(),
          page: z.number().optional(),
          section: z.string().optional(),
          documentId: z.string().optional(),
        })
      )
      .optional()
      .describe('Source references (chapter, page, section)'),
    confidence: z
      .enum(['high', 'medium', 'low'])
      .optional()
      .describe('Confidence level of the answer'),
  }),
  execute: async ({ context, runtimeContext }) => {
    // Import mastra instance to access agents
    const { mastra } = await import('../index');
    const agent = mastra?.getAgent('studyBuddyAgent');

    if (!agent) {
      // Fallback: return a basic response if agent is not available
      return {
        answer:
          'I cannot answer questions at this time. Please ensure documents have been processed first.',
        context: [],
        confidence: 'low' as const,
      };
    }

    // Build a comprehensive prompt for the agent
    const prompt = buildQueryPrompt(context);

    try {
      // Use the agent to generate an answer
      const response = await agent.generate(prompt);

      // Try to parse structured response, otherwise use the full text
      let answer: string;
      let sources: any[] = [];
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      // Try to extract structured JSON from response
      const jsonMatch =
        response.text.match(/```json\n([\s\S]*?)\n```/) ||
        response.text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          answer = parsed.answer || parsed.text || response.text;
          sources = parsed.sources || [];
          confidence = parsed.confidence || 'medium';
        } catch {
          // If JSON parsing fails, use the full response text
          answer = response.text;
        }
      } else {
        answer = response.text;
      }

      // Extract context from response or use memory
      const contextChunks = await extractContext(context, agent);

      return {
        answer,
        context: contextChunks,
        sources,
        confidence,
      };
    } catch (error) {
      console.error('Error querying document:', error);
      return {
        answer:
          'I encountered an error while processing your question. Please try again.',
        context: [],
        confidence: 'low' as const,
      };
    }
  },
});

/**
 * Build a prompt for querying the document
 */
function buildQueryPrompt(context: {
  question: string;
  chapter?: string;
  topic?: string;
  documentId?: string;
}): string {
  let prompt = `Answer the following question about the study material:\n\n`;
  prompt += `Question: ${context.question}\n\n`;

  if (context.chapter) {
    prompt += `Focus on chapter: ${context.chapter}\n`;
  }

  if (context.topic) {
    prompt += `Focus on topic: ${context.topic}\n`;
  }

  if (context.documentId) {
    prompt += `From document ID: ${context.documentId}\n`;
  }

  prompt += `\nInstructions:\n`;
  prompt += `1. Provide a clear, accurate answer based on the document content\n`;
  prompt += `2. Include relevant context and details\n`;
  prompt += `3. If the information is not available in the documents, say so clearly\n`;
  prompt += `4. Cite which chapters or sections your answer comes from if possible\n`;
  prompt += `5. Be concise but thorough\n\n`;
  prompt += `Answer:`;

  return prompt;
}

/**
 * Extract relevant context chunks from agent memory
 * This is a placeholder - can be enhanced with vector search later
 */
async function extractContext(
  context: {
    question: string;
    chapter?: string;
    topic?: string;
    documentId?: string;
  },
  agent: any
): Promise<string[]> {
  // For now, return empty array
  // TODO: Implement vector search or memory retrieval once vector store is set up
  // This can use createVectorQueryTool from @mastra/rag
  
  // Example future implementation:
  // const vectorTool = createVectorQueryTool({
  //   vectorStoreName: 'pgVector',
  //   indexName: 'document_chunks',
  //   model: embeddingModel,
  // });
  // const results = await vectorTool.execute({ context: { queryText: context.question } });
  // return results.map(r => r.text);

  return [];
}


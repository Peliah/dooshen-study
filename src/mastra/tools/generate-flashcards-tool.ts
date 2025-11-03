import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for generating flashcards from document content
 * Supports multiple flashcard types including image-based cards with generation prompts
 */
export const generateFlashcardsTool = createTool({
  id: 'generate-flashcards',
  description:
    'Generate flashcards from document content. Supports basic Q&A, cloze deletion, multiple choice, and image-based flashcards with image generation prompts. Can generate flashcards from specific text content or entire documents.',
  inputSchema: z.object({
    content: z.string().describe('Text content to generate flashcards from'),
    flashcardType: z
      .enum([
        'basic',
        'cloze',
        'multiple-choice',
        'image-based',
        'true-false',
        'concept-definition',
      ])
      .optional()
      .default('basic')
      .describe('Type of flashcards to generate'),
    count: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe('Number of flashcards to generate (1-50)'),
    difficulty: z
      .enum(['easy', 'medium', 'hard'])
      .optional()
      .default('medium')
      .describe('Difficulty level of flashcards'),
    topic: z
      .string()
      .optional()
      .describe('Optional topic/tag for organizing flashcards'),
    chapter: z
      .string()
      .optional()
      .describe('Optional chapter/section identifier'),
  }),
  outputSchema: z.object({
    flashcards: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        front: z.string().describe('Front side of flashcard (question/concept)'),
        back: z.string().describe('Back side of flashcard (answer/explanation)'),
        difficulty: z.string(),
        topic: z.string().optional(),
        chapter: z.string().optional(),
        imagePrompt: z
          .string()
          .optional()
          .describe(
            'Detailed image generation prompt (for image-based cards)'
          ),
        imageDescription: z
          .string()
          .optional()
          .describe(
            'Text description of what the image should convey (for image-based cards)'
          ),
        tags: z.array(z.string()).optional(),
      })
    ),
    totalGenerated: z.number(),
  }),
  execute: async ({ context, runtimeContext }) => {
    // Import mastra instance to access agents
    const { mastra } = await import('../index');
    const agent = mastra?.getAgent('studyBuddyAgent');
    
    if (!agent) {
      // If agent not available, create a basic implementation
      return await generateFlashcardsBasic(context);
    }

    // Use agent to generate flashcards with AI
    const prompt = createFlashcardPrompt(context);
    
    const response = await agent.generate(prompt);
    
    // Parse the response to extract flashcards
    // The agent should return JSON with flashcards array
    try {
      // Try to parse as JSON first
      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) || 
                       response.text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
          flashcards: parsed.flashcards || [],
          totalGenerated: parsed.flashcards?.length || 0,
        };
      }
      
      // Fallback: try to parse structured text
      return parseFlashcardsFromText(response.text, context);
    } catch (error) {
      // Fallback to basic generation
      return await generateFlashcardsBasic(context);
    }
  },
});

/**
 * Generate flashcards using AI agent prompt
 */
function createFlashcardPrompt(context: {
  content: string;
  flashcardType: string;
  count: number;
  difficulty: string;
  topic?: string;
  chapter?: string;
}): string {
  const typeInstructions: Record<string, string> = {
    basic: 'Basic question and answer format',
    cloze: 'Cloze deletion format with blanks to fill in',
    'multiple-choice': 'Multiple choice questions with 4 options',
    'image-based': 'Include detailed image generation prompts and descriptions for visual learning',
    'true-false': 'True/False questions',
    'concept-definition': 'Concept on front, definition on back',
  };

  return `Generate ${context.count} ${context.difficulty} difficulty ${context.flashcardType} flashcards from the following content:

${context.content.substring(0, 3000)}${context.content.length > 3000 ? '...' : ''}

Requirements:
- Flashcard type: ${context.flashcardType} (${typeInstructions[context.flashcardType]})
- Difficulty: ${context.difficulty}
${context.topic ? `- Topic: ${context.topic}` : ''}
${context.chapter ? `- Chapter: ${context.chapter}` : ''}

${
  context.flashcardType === 'image-based'
    ? `IMPORTANT: For image-based flashcards, include:
   - A detailed, specific image generation prompt describing diagrams, concepts, processes, or illustrations
   - An image description explaining what visual should be generated and why it's educational
   - Make prompts educational and clear, suitable for learning visuals`
    : ''
}

Return as JSON with this structure:
{
  "flashcards": [
    {
      "id": "unique-id",
      "type": "${context.flashcardType}",
      "front": "question or concept",
      "back": "answer or explanation",
      "difficulty": "${context.difficulty}",
      ${context.topic ? `"topic": "${context.topic}",` : ''}
      ${context.chapter ? `"chapter": "${context.chapter}",` : ''}
      ${context.flashcardType === 'image-based' ? `"imagePrompt": "detailed prompt for image generation",\n      "imageDescription": "description of the educational image"` : ''}
    }
  ]
}`;
}

/**
 * Parse flashcards from agent text response
 */
function parseFlashcardsFromText(
  text: string,
  context: any
): { flashcards: any[]; totalGenerated: number } {
  // Simple parsing - extract Q&A pairs
  const flashcards: any[] = [];
  const lines = text.split('\n').filter((l) => l.trim());

  let currentFlashcard: any = null;
  for (const line of lines) {
    if (line.match(/^(Q:|Question:|Front:)/i)) {
      if (currentFlashcard) flashcards.push(currentFlashcard);
      currentFlashcard = {
        id: `fc-${flashcards.length + 1}`,
        type: context.flashcardType,
        front: line.replace(/^(Q:|Question:|Front:)\s*/i, '').trim(),
        back: '',
        difficulty: context.difficulty,
        topic: context.topic,
        chapter: context.chapter,
      };
    } else if (line.match(/^(A:|Answer:|Back:)/i) && currentFlashcard) {
      currentFlashcard.back = line
        .replace(/^(A:|Answer:|Back:)\s*/i, '')
        .trim();
    } else if (currentFlashcard && !currentFlashcard.back) {
      currentFlashcard.front += ' ' + line.trim();
    } else if (currentFlashcard && currentFlashcard.back) {
      currentFlashcard.back += ' ' + line.trim();
    }
  }
  if (currentFlashcard) flashcards.push(currentFlashcard);

  return {
    flashcards: flashcards.slice(0, context.count),
    totalGenerated: flashcards.length,
  };
}

/**
 * Fallback basic flashcard generation
 */
async function generateFlashcardsBasic(context: {
  content: string;
  flashcardType: string;
  count: number;
  difficulty: string;
  topic?: string;
  chapter?: string;
}): Promise<{ flashcards: any[]; totalGenerated: number }> {
  // Simple sentence-based flashcard generation
  const sentences = context.content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const flashcards = sentences.slice(0, context.count).map((sentence, index) => {
    const words = sentence.trim().split(' ');
    const midPoint = Math.floor(words.length / 2);

    return {
      id: `fc-${index + 1}`,
      type: context.flashcardType,
      front:
        context.flashcardType === 'cloze'
          ? words.slice(0, midPoint).join(' ') + ' _____ ' + words.slice(midPoint + 1).join(' ')
          : sentence.trim(),
      back: sentence.trim(),
      difficulty: context.difficulty,
      topic: context.topic,
      chapter: context.chapter,
      ...(context.flashcardType === 'image-based' && {
        imagePrompt: `Generate an educational diagram or illustration that visually represents: ${sentence.trim()}`,
        imageDescription: `A visual aid to help understand: ${sentence.trim()}`,
      }),
    };
  });

  return {
    flashcards,
    totalGenerated: flashcards.length,
  };
}


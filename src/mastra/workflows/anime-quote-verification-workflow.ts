import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const BASE_URL = 'https://api.animechan.io/v1';

interface AnimechanQuote {
  anime: string;
  character: string;
  quote: string;
}

interface AnimechanError {
  error: string;
}

/**
 * Step 1: Search for quotes (by character and/or anime)
 */
const searchQuotes = createStep({
  id: 'search-quotes',
  description: 'Search for quotes by character and/or anime',
  inputSchema: z.object({
    quote: z.string().describe('The quote to verify (for reference)'),
    character: z.string().optional().describe('Character name to search for'),
    anime: z.string().optional().describe('Anime title to search for'),
    apiKey: z.string().optional(),
  }),
  outputSchema: z.object({
    quote: z.string(),
    character: z.string().optional(),
    anime: z.string().optional(),
    characterQuotes: z.array(
      z.object({
        quote: z.string(),
        anime: z.string(),
        character: z.string(),
      })
    ),
    apiKey: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (inputData.apiKey) {
      headers['x-api-key'] = inputData.apiKey;
    }

    let characterQuotes: Array<{
      quote: string;
      anime: string;
      character: string;
    }> = [];

    // Search by character if provided
    if (inputData.character) {
      try {
        const response = await fetch(
          `${BASE_URL}/quotes/?character=${encodeURIComponent(inputData.character)}&page=1`,
          { headers }
        );

        if (response.ok) {
          const data = (await response.json()) as AnimechanQuote[];
          characterQuotes = data.map((quote) => ({
            quote: quote.quote,
            anime: quote.anime,
            character: quote.character,
          }));
        }
      } catch (error) {
        // Continue with empty quotes if search fails
      }
    }

    return {
      quote: inputData.quote,
      character: inputData.character,
      anime: inputData.anime,
      characterQuotes,
      apiKey: inputData.apiKey,
    };
  },
});

/**
 * Step 2: Collect quotes from all sources (character and anime)
 */
const collectQuotes = createStep({
  id: 'collect-quotes',
  description: 'Collect quotes from both character and anime sources',
  inputSchema: z.object({
    quote: z.string().describe('The quote to verify'),
    character: z.string().optional(),
    anime: z.string().optional(),
    apiKey: z.string().optional(),
    characterQuotes: z.array(
      z.object({
        quote: z.string(),
        anime: z.string(),
        character: z.string(),
      })
    ),
  }),
  outputSchema: z.object({
    quote: z.string(),
    allQuotes: z.array(
      z.object({
        quote: z.string(),
        anime: z.string(),
        character: z.string(),
      })
    ),
    character: z.string().optional(),
    anime: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    let allQuotes = [...(inputData.characterQuotes || [])];

    // Also search by anime if provided and not already covered
    if (inputData.anime) {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (inputData.apiKey) {
        headers['x-api-key'] = inputData.apiKey;
      }

      try {
        const response = await fetch(
          `${BASE_URL}/quotes/?anime=${encodeURIComponent(inputData.anime)}&page=1`,
          { headers }
        );

        if (response.ok) {
          const data = (await response.json()) as AnimechanQuote[];
          const animeQuotes = data.map((quote) => ({
            quote: quote.quote,
            anime: quote.anime,
            character: quote.character,
          }));
          
          // Merge quotes, avoiding duplicates
          const existingQuotes = new Set(allQuotes.map(q => q.quote));
          for (const quote of animeQuotes) {
            if (!existingQuotes.has(quote.quote)) {
              allQuotes.push(quote);
            }
          }
        }
      } catch (error) {
        // Continue even if anime search fails
      }
    }

    return {
      quote: inputData.quote,
      allQuotes,
      character: inputData.character,
      anime: inputData.anime,
    };
  },
});

/**
 * Step 3: Verify specific quote against collected quotes
 */
const verifyQuote = createStep({
  id: 'verify-quote',
  description: 'Verify if a specific quote matches any of the collected quotes',
  inputSchema: z.object({
    quote: z.string().describe('The quote text to verify'),
    allQuotes: z.array(
      z.object({
        quote: z.string(),
        anime: z.string(),
        character: z.string(),
      })
    ),
    character: z.string().optional(),
    anime: z.string().optional(),
  }),
  outputSchema: z.object({
    quote: z.string(),
    verified: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']),
    matches: z.array(
      z.object({
        quote: z.string(),
        anime: z.string(),
        character: z.string(),
        matchType: z.enum(['exact', 'partial', 'similar']),
      })
    ),
    message: z.string(),
    character: z.string().optional(),
    anime: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const quoteToVerify = inputData.quote.toLowerCase().trim();
    
    // Remove duplicates
    const uniqueQuotes = Array.from(
      new Map(inputData.allQuotes.map((q) => [q.quote, q])).values()
    );

    const matches: Array<{
      quote: string;
      anime: string;
      character: string;
      matchType: 'exact' | 'partial' | 'similar';
    }> = [];

    for (const quote of uniqueQuotes) {
      const quoteText = quote.quote.toLowerCase().trim();

      // Exact match
      if (quoteText === quoteToVerify) {
        matches.push({
          ...quote,
          matchType: 'exact',
        });
      }
      // Partial match (one contains the other)
      else if (
        quoteText.includes(quoteToVerify) ||
        quoteToVerify.includes(quoteText)
      ) {
        matches.push({
          ...quote,
          matchType: 'partial',
        });
      }
      // Similar match (check word overlap - at least 50% of words match)
      else {
        const quoteWords = new Set(quoteText.split(/\s+/));
        const verifyWords = new Set(quoteToVerify.split(/\s+/));
        const intersection = new Set(
          [...quoteWords].filter((x) => verifyWords.has(x))
        );
        const union = new Set([...quoteWords, ...verifyWords]);
        const similarity = intersection.size / union.size;

        if (similarity >= 0.5 && quoteWords.size > 2 && verifyWords.size > 2) {
          matches.push({
            ...quote,
            matchType: 'similar',
          });
        }
      }
    }

    // Determine verification result
    const exactMatches = matches.filter((m) => m.matchType === 'exact');
    const partialMatches = matches.filter((m) => m.matchType === 'partial');

    let verified = false;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let message = '';

    if (exactMatches.length > 0) {
      verified = true;
      confidence = 'high';
      message = `Quote verified! Found ${exactMatches.length} exact match(es).`;
    } else if (partialMatches.length > 0) {
      verified = true;
      confidence = 'medium';
      message = `Quote likely verified. Found ${partialMatches.length} partial match(es) - the quote may have slight variations.`;
    } else if (matches.length > 0) {
      verified = true;
      confidence = 'low';
      message = `Found ${matches.length} similar quote(s), but not an exact match.`;
    } else {
      verified = false;
      confidence = inputData.allQuotes.length > 0
        ? 'high'
        : 'medium';
      message =
        'Quote not found in the database. The quote may not exist, or the character/anime name might be slightly different.';
    }

    return {
      quote: inputData.quote,
      verified,
      confidence,
      matches: matches.slice(0, 5), // Limit to top 5 matches
      message,
      character: inputData.character,
      anime: inputData.anime,
    };
  },
});

/**
 * Step 4: Generate comprehensive verification report using agent
 */
const generateVerificationReport = createStep({
  id: 'generate-verification-report',
  description: 'Generate a comprehensive verification report using the anime agent',
  inputSchema: z.object({
    quote: z.string(),
    verified: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']),
    matches: z.array(
      z.object({
        quote: z.string(),
        anime: z.string(),
        character: z.string(),
        matchType: z.enum(['exact', 'partial', 'similar']),
      })
    ),
    message: z.string(),
    character: z.string().optional(),
    anime: z.string().optional(),
  }),
  outputSchema: z.object({
    verified: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']),
    matches: z.array(
      z.object({
        quote: z.string(),
        anime: z.string(),
        character: z.string(),
        matchType: z.enum(['exact', 'partial', 'similar']),
      })
    ),
    report: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('animeAgent');
    if (!agent) {
      throw new Error('Anime agent not found');
    }

    const { quote, verified, confidence, matches, message, character, anime } = inputData;
    
    // Build context string
    let context = '';
    if (character) {
      context += `Character: ${character}\n`;
    }
    if (anime) {
      context += `Anime: ${anime}\n`;
    }

    const prompt = `Create a comprehensive verification report for the following anime quote verification:

${context}
Quote to verify: "${quote}"

Verification Result:
- Status: ${verified ? 'VERIFIED' : 'NOT VERIFIED'}
- Confidence: ${confidence.toUpperCase()}
- Message: ${message}

${matches.length > 0 ? `\nMatching Quotes Found:\n${matches.map((m, i) => `${i + 1}. "${m.quote}"\n   - Character: ${m.character}\n   - Anime: ${m.anime}\n   - Match Type: ${m.matchType}`).join('\n\n')}` : ''}

Please provide a well-formatted, friendly report that:
1. Summarizes the verification result clearly
2. Explains what was found (or not found)
3. Provides context about the quote if verified
4. Suggests next steps if not verified (e.g., checking alternative character names)
5. Uses emojis and formatting to make it engaging
6. Includes the confidence level and what it means

Make it informative but easy to understand.`;

    const response = await agent.generate(prompt);

    return {
      verified,
      confidence,
      matches,
      report: response.text,
    };
  },
});

/**
 * Anime Quote Verification Workflow
 * 
 * This workflow performs a comprehensive quote verification by:
 * 1. Searching quotes by character (if provided)
 * 2. Collecting quotes from anime as well (if provided)
 * 3. Verifying the specific quote against collected quotes
 * 4. Generating a detailed verification report
 * 
 * Use Case: "Did Light Yagami really say 'I'll become the god of this new world'?"
 */
export const animeQuoteVerificationWorkflow = createWorkflow({
  id: 'anime-quote-verification-workflow',
  inputSchema: z.object({
    quote: z.string().describe('The quote to verify'),
    character: z.string().optional().describe('Character name (if known)'),
    anime: z.string().optional().describe('Anime title (if known)'),
    apiKey: z.string().optional().describe('Optional API key for supporter tier'),
  }),
  outputSchema: z.object({
    verified: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']),
    matches: z.array(
      z.object({
        quote: z.string(),
        anime: z.string(),
        character: z.string(),
        matchType: z.enum(['exact', 'partial', 'similar']),
      })
    ),
    report: z.string(),
  }),
})
  .then(searchQuotes)
  .then(collectQuotes)
  .then(verifyQuote)
  .then(generateVerificationReport);

animeQuoteVerificationWorkflow.commit();


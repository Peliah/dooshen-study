import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const BASE_URL = 'https://api.animechan.io/v1';

/**
 * Interface for Animechan Quote response (direct format)
 */
interface AnimechanQuote {
  anime: string;
  character: string;
  quote: string;
}

/**
 * Interface for Animechan API response with wrapper
 */
interface AnimechanApiResponse {
  status: string;
  data: Array<{
    content: string;
    anime: {
      id: number;
      name: string;
      altName?: string;
    };
    character: {
      id: number;
      name: string;
    };
  }>;
}

/**
 * Interface for Animechan API error response
 */
interface AnimechanError {
  error: string;
}

/**
 * Tool for getting a random anime quote
 */
export const getRandomQuoteTool = createTool({
  id: 'get-random-anime-quote',
  description:
    'Get a random anime quote from the Animechan API. Returns a quote along with the anime title and character name.',
  inputSchema: z.object({
    apiKey: z
      .string()
      .optional()
      .describe(
        'Optional API key for supporter tier (1000 requests/hour). Include as x-api-key header.'
      ),
  }),
  outputSchema: z.object({
    quote: z.string().describe('The anime quote'),
    anime: z.string().describe('The anime title the quote is from'),
    character: z.string().describe('The character who said the quote'),
  }),
  execute: async ({ context }) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (context.apiKey) {
      headers['x-api-key'] = context.apiKey;
    }

    try {
      const response = await fetch(`${BASE_URL}/quotes/random`, {
        headers,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as AnimechanError;
        throw new Error(
          errorData.error || `API request failed with status ${response.status}`
        );
      }

      const apiResponse = await response.json();

      // Handle the actual API response format: { status: "success", data: { content, anime: {...}, character: {...} } }
      let quoteData: AnimechanQuote;
      
      if (apiResponse && typeof apiResponse === 'object' && 'status' in apiResponse && apiResponse.status === 'success' && apiResponse.data) {
        // Actual API format: { status: "success", data: { content, anime: {id, name, altName}, character: {id, name} } }
        const data = apiResponse.data;
        quoteData = {
          quote: data.content,
          anime: data.anime?.name || data.anime?.altName || 'Unknown',
          character: data.character?.name || 'Unknown',
        };
      } else if (apiResponse && typeof apiResponse === 'object' && 'status' in apiResponse && apiResponse.status && Array.isArray(apiResponse.data)) {
        // Fallback: Array format (for other endpoints)
        const firstItem = apiResponse.data[0];
        quoteData = {
          quote: firstItem.content,
          anime: firstItem.anime?.name || firstItem.anime?.altName || 'Unknown',
          character: firstItem.character?.name || 'Unknown',
        };
      } else if (apiResponse && typeof apiResponse === 'object') {
        // Old format: direct object or array with one item
        if (Array.isArray(apiResponse) && apiResponse.length > 0) {
          const firstItem = apiResponse[0];
          quoteData = {
            quote: firstItem.quote || firstItem.content,
            anime: typeof firstItem.anime === 'string' ? firstItem.anime : firstItem.anime?.name || 'Unknown',
            character: typeof firstItem.character === 'string' ? firstItem.character : firstItem.character?.name || 'Unknown',
          };
        } else {
          // Direct object format (legacy)
          quoteData = {
            quote: (apiResponse as any).quote || (apiResponse as any).content,
            anime: typeof (apiResponse as any).anime === 'string' ? (apiResponse as any).anime : (apiResponse as any).anime?.name || 'Unknown',
            character: typeof (apiResponse as any).character === 'string' ? (apiResponse as any).character : (apiResponse as any).character?.name || 'Unknown',
          };
        }
      } else {
        throw new Error('Unexpected API response format');
      }

      return {
        quote: quoteData.quote,
        anime: quoteData.anime,
        character: quoteData.character,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch random quote: ${error.message}`);
      }
      throw new Error('Failed to fetch random quote: Unknown error');
    }
  },
});

/**
 * Tool for getting quotes by anime title
 */
export const getQuotesByAnimeTool = createTool({
  id: 'get-quotes-by-anime',
  description:
    'Get anime quotes from a specific anime series. Returns multiple quotes from the specified anime.',
  inputSchema: z.object({
    anime: z
      .string()
      .describe('The anime title to get quotes from (e.g., "Naruto", "One Piece")'),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe('Page number for pagination (default: 1)'),
    apiKey: z
      .string()
      .optional()
      .describe(
        'Optional API key for supporter tier. Include as x-api-key header.'
      ),
  }),
  outputSchema: z.object({
    quotes: z
      .array(
        z.object({
          quote: z.string(),
          anime: z.string(),
          character: z.string(),
        })
      )
      .describe('Array of quotes from the specified anime'),
    page: z.number().describe('Current page number'),
  }),
  execute: async ({ context }) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (context.apiKey) {
      headers['x-api-key'] = context.apiKey;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/quotes/?anime=${encodeURIComponent(context.anime)}&page=${context.page || 1}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as AnimechanError;
        throw new Error(
          errorData.error || `API request failed with status ${response.status}`
        );
      }

      const apiResponse = (await response.json()) as AnimechanApiResponse | AnimechanQuote[];

      // Handle both formats: wrapped response or direct array
      let quotesArray: AnimechanQuote[];
      
      if (apiResponse && typeof apiResponse === 'object' && 'status' in apiResponse && apiResponse.status && apiResponse.data) {
        // New format with wrapper: { status, data: [...] }
        quotesArray = apiResponse.data.map((item) => ({
          quote: item.content,
          anime: item.anime.name || item.anime.altName || 'Unknown',
          character: item.character.name,
        }));
      } else if (Array.isArray(apiResponse)) {
        // Old format: direct array
        quotesArray = apiResponse.map((quote) => ({
          quote: quote.quote || (quote as any).content,
          anime: typeof quote.anime === 'string' ? quote.anime : (quote as any).anime?.name || 'Unknown',
          character: typeof quote.character === 'string' ? quote.character : (quote as any).character?.name || 'Unknown',
        }));
      } else {
        throw new Error('Unexpected API response format');
      }

      return {
        quotes: quotesArray,
        page: context.page || 1,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to fetch quotes for anime "${context.anime}": ${error.message}`
        );
      }
      throw new Error(
        `Failed to fetch quotes for anime "${context.anime}": Unknown error`
      );
    }
  },
});

/**
 * Tool for getting quotes by character name
 */
export const getQuotesByCharacterTool = createTool({
  id: 'get-quotes-by-character',
  description:
    'Get anime quotes from a specific character. Returns multiple quotes said by the specified character.',
  inputSchema: z.object({
    character: z
      .string()
      .describe(
        'The character name to get quotes from (e.g., "Naruto Uzumaki", "Light Yagami")'
      ),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe('Page number for pagination (default: 1)'),
    apiKey: z
      .string()
      .optional()
      .describe(
        'Optional API key for supporter tier. Include as x-api-key header.'
      ),
  }),
  outputSchema: z.object({
    quotes: z
      .array(
        z.object({
          quote: z.string(),
          anime: z.string(),
          character: z.string(),
        })
      )
      .describe('Array of quotes from the specified character'),
    page: z.number().describe('Current page number'),
  }),
  execute: async ({ context }) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (context.apiKey) {
      headers['x-api-key'] = context.apiKey;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/quotes/?character=${encodeURIComponent(context.character)}&page=${context.page || 1}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as AnimechanError;
        throw new Error(
          errorData.error || `API request failed with status ${response.status}`
        );
      }

      const apiResponse = (await response.json()) as AnimechanApiResponse;

      // Handle both formats: wrapped response or direct array
      let quotesArray: AnimechanQuote[];
      
      if (apiResponse.status && apiResponse.data) {
        // New format with wrapper: { status, data: [...] }
        quotesArray = apiResponse.data.map((item) => ({
          quote: item.content,
          anime: item.anime.name || item.anime.altName || 'Unknown',
          character: item.character.name,
        }));
      } else if (Array.isArray(apiResponse)) {
        // Old format: direct array
        quotesArray = (apiResponse as any[]).map((quote) => ({
          quote: quote.quote || quote.content,
          anime: typeof quote.anime === 'string' ? quote.anime : quote.anime?.name || 'Unknown',
          character: typeof quote.character === 'string' ? quote.character : quote.character?.name || 'Unknown',
        }));
      } else {
        throw new Error('Unexpected API response format');
      }

      return {
        quotes: quotesArray,
        page: context.page || 1,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to fetch quotes for character "${context.character}": ${error.message}`
        );
      }
      throw new Error(
        `Failed to fetch quotes for character "${context.character}": Unknown error`
      );
    }
  },
});

/**
 * Tool for verifying anime quotes
 * Combines search functionality to verify if a quote is accurate
 */
export const verifyAnimeQuoteTool = createTool({
  id: 'verify-anime-quote',
  description:
    'Verify if a quote is accurate by searching for it. Checks if a character said a specific quote, or if a quote exists in an anime. Can verify quotes by character, by anime, or by exact quote text.',
  inputSchema: z.object({
    quote: z
      .string()
      .optional()
      .describe(
        'The quote text to verify (optional, but recommended for accuracy)'
      ),
    character: z
      .string()
      .optional()
      .describe('The character who allegedly said the quote'),
    anime: z
      .string()
      .optional()
      .describe('The anime the quote is from'),
    apiKey: z
      .string()
      .optional()
      .describe('Optional API key for supporter tier'),
  }),
  outputSchema: z.object({
    verified: z
      .boolean()
      .describe('Whether the quote was found and verified'),
    confidence: z
      .enum(['high', 'medium', 'low'])
      .describe('Confidence level of verification'),
    matches: z
      .array(
        z.object({
          quote: z.string(),
          anime: z.string(),
          character: z.string(),
        })
      )
      .describe('Matching quotes found'),
    message: z.string().describe('Verification result message'),
  }),
  execute: async ({ context }) => {
    // At least one of quote, character, or anime must be provided
    if (!context.quote && !context.character && !context.anime) {
      return {
        verified: false,
        confidence: 'low' as const,
        matches: [],
        message:
          'Cannot verify: Please provide at least a quote, character, or anime name.',
      };
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (context.apiKey) {
      headers['x-api-key'] = context.apiKey;
    }

    try {
      let quotes: AnimechanQuote[] = [];

      // Helper function to parse API response
      const parseApiResponse = (apiResponse: any): AnimechanQuote[] => {
        if (apiResponse && typeof apiResponse === 'object' && 'status' in apiResponse && apiResponse.status && apiResponse.data) {
          // New format with wrapper: { status, data: [...] }
          return apiResponse.data.map((item: any) => ({
            quote: item.content,
            anime: item.anime?.name || item.anime?.altName || 'Unknown',
            character: item.character?.name || 'Unknown',
          }));
        } else if (Array.isArray(apiResponse)) {
          // Old format: direct array
          return apiResponse.map((quote: any) => ({
            quote: quote.quote || quote.content,
            anime: typeof quote.anime === 'string' ? quote.anime : quote.anime?.name || 'Unknown',
            character: typeof quote.character === 'string' ? quote.character : quote.character?.name || 'Unknown',
          }));
        }
        return [];
      };

      // Strategy: Search by character first (most specific), then by anime
      if (context.character) {
        const charResponse = await fetch(
          `${BASE_URL}/quotes/?character=${encodeURIComponent(context.character)}`,
          { headers }
        );
        if (charResponse.ok) {
          const apiResponse = await charResponse.json();
          quotes = parseApiResponse(apiResponse);
        }
      }

      // If no quotes found by character, try by anime
      if (quotes.length === 0 && context.anime) {
        const animeResponse = await fetch(
          `${BASE_URL}/quotes/anime?title=${encodeURIComponent(context.anime)}`,
          { headers }
        );
        if (animeResponse.ok) {
          const apiResponse = await animeResponse.json();
          quotes = parseApiResponse(apiResponse);
        }
      }

      // If we have a quote text to verify, check if any match
      if (context.quote) {
        const quoteText = context.quote.toLowerCase().trim();
        const matchingQuotes = quotes.filter((q) =>
          q.quote.toLowerCase().includes(quoteText) ||
          quoteText.includes(q.quote.toLowerCase())
        );

        if (matchingQuotes.length > 0) {
          return {
            verified: true,
            confidence: 'high' as const,
            matches: matchingQuotes.map((q) => ({
              quote: q.quote,
              anime: q.anime,
              character: q.character,
            })),
            message: `Quote verified! Found ${matchingQuotes.length} matching quote(s).`,
          };
        }
      } else {
        // No quote text provided, just return what we found
        if (quotes.length > 0) {
          return {
            verified: true,
            confidence: 'medium' as const,
            matches: quotes.slice(0, 10).map((q) => ({
              quote: q.quote,
              anime: q.anime,
              character: q.character,
            })),
            message: `Found ${quotes.length} quote(s) for the specified criteria.`,
          };
        }
      }

      // No matches found
      return {
        verified: false,
        confidence: context.quote ? ('high' as const) : ('medium' as const),
        matches: [],
        message:
          'Quote not found in the database. It may not exist, or the character/anime name might be slightly different.',
      };
    } catch (error) {
      return {
        verified: false,
        confidence: 'low' as const,
        matches: [],
        message: `Error during verification: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  },
});


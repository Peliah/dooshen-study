import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const BASE_URL = 'https://api.myanimelist.net/v2';

/**
 * MyAnimeList API Tools
 * 
 * Authentication:
 * Uses X-MAL-CLIENT-ID header for public endpoints (no Bearer token needed).
 * 
 * Public endpoints supported:
 * - Search anime
 * - Get anime details
 * - Get rankings
 * - Get seasonal anime
 * 
 * Environment Variables:
 * - MAL_CLIENT_ID: Your MyAnimeList Client ID (default: 978e2136b42a31dc4b1d9ecb2ce6e14d)
 * 
 * Get your Client ID from: https://myanimelist.net/apiconfig
 */

// Helper function to get authentication headers using Client ID
function getAuthHeaders(): HeadersInit {
  const clientId = process.env.MAL_CLIENT_ID || '978e2136b42a31dc4b1d9ecb2ce6e14d';

  return {
    'X-MAL-CLIENT-ID': clientId,
  };
}

interface MyAnimeListAnime {
  id: number;
  title: string;
  main_picture?: {
    medium: string;
    large: string;
  };
  synopsis?: string;
  mean?: number;
  rank?: number;
  popularity?: number;
  num_list_users?: number;
  num_episodes?: number;
  start_date?: string;
  end_date?: string;
  media_type?: string;
  status?: string;
  genres?: Array<{ id: number; name: string }>;
}

// Response structure for list endpoints (search, rankings, seasonal)
interface MyAnimeListListResponse {
  data: Array<{
    node: MyAnimeListAnime;
    ranking?: {
      rank: number;
    };
  }>;
  paging?: {
    next?: string;
    previous?: string;
  };
  season?: {
    year: number;
    season: string;
  };
}

/**
 * Tool for searching anime on MyAnimeList
 */
export const searchAnimeTool = createTool({
  id: 'search-anime',
  description:
    'Search for anime on MyAnimeList. Returns a list of anime matching the search query with details like title, synopsis, ratings, and popularity.',
  inputSchema: z.object({
    query: z.string().describe('Search query (anime title or keywords)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe('Maximum number of results (1-100, default: 10)'),
    fields: z
      .string()
      .optional()
      .describe(
        'Comma-separated list of fields to return (e.g., "synopsis,mean,rank,popularity")'
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        synopsis: z.string().optional(),
        picture: z.string().optional(),
        rating: z.number().optional(),
        rank: z.number().optional(),
        popularity: z.number().optional(),
        episodes: z.number().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
      })
    ),
    total: z.number().describe('Number of results returned'),
  }),
  execute: async ({ context }) => {
    try {
      const defaultFields = 'id,title,main_picture,synopsis,mean,rank,popularity,num_episodes,status,media_type';
      const fields = context.fields || defaultFields;
      
      const params = new URLSearchParams({
        q: context.query,
        limit: (context.limit || 10).toString(),
        fields: fields,
      });

      const response = await fetch(`${BASE_URL}/anime?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as any).message ||
            `API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as MyAnimeListListResponse;

      // API returns data as array of { node: {...} } objects
      return {
        results: data.data.map((item) => {
          const anime = item.node;
          return {
            id: anime.id,
            title: anime.title,
            synopsis: anime.synopsis,
            picture: anime.main_picture?.medium || anime.main_picture?.large,
            rating: anime.mean,
            rank: anime.rank,
            popularity: anime.popularity,
            episodes: anime.num_episodes,
            status: anime.status,
            type: anime.media_type,
          };
        }),
        total: data.data.length,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search anime: ${error.message}`);
      }
      throw new Error('Failed to search anime: Unknown error');
    }
  },
});

/**
 * Tool for getting anime details
 */
export const getAnimeDetailsTool = createTool({
  id: 'get-anime-details',
  description:
    'Get detailed information about a specific anime by ID from MyAnimeList. Returns comprehensive details including synopsis, ratings, genres, episodes, and more.',
  inputSchema: z.object({
    animeId: z
      .number()
      .int()
      .describe('MyAnimeList anime ID (e.g., 30230, 266)'),
    fields: z
      .string()
      .optional()
      .describe(
        'Comma-separated list of fields to return. Default includes: id,title,main_picture,synopsis,mean,rank,popularity,num_episodes,start_date,end_date,status,genres,media_type'
      ),
  }),
  outputSchema: z.object({
    id: z.number(),
    title: z.string(),
    synopsis: z.string().optional(),
    picture: z.string().optional(),
    rating: z.number().optional().describe('Average rating (out of 10)'),
    rank: z.number().optional().describe('Overall rank'),
    popularity: z.number().optional().describe('Popularity rank'),
    episodes: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.string().optional().describe('Airing status'),
    type: z.string().optional().describe('Media type (TV, Movie, OVA, etc.)'),
    genres: z.array(z.string()).optional(),
    usersListed: z.number().optional().describe('Number of users who have this in their list'),
  }),
  execute: async ({ context }) => {
    try {
      const defaultFields =
        'id,title,main_picture,synopsis,mean,rank,popularity,num_episodes,start_date,end_date,status,genres,media_type,num_list_users';
      const fields = context.fields || defaultFields;

      const response = await fetch(
        `${BASE_URL}/anime/${context.animeId}?fields=${encodeURIComponent(fields)}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Anime with ID ${context.animeId} not found`);
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as any).message ||
            `API request failed with status ${response.status}`
        );
      }

      const anime = (await response.json()) as MyAnimeListAnime;

      return {
        id: anime.id,
        title: anime.title,
        synopsis: anime.synopsis,
        picture: anime.main_picture?.medium || anime.main_picture?.large,
        rating: anime.mean,
        rank: anime.rank,
        popularity: anime.popularity,
        episodes: anime.num_episodes,
        startDate: anime.start_date,
        endDate: anime.end_date,
        status: anime.status,
        type: anime.media_type,
        genres: anime.genres?.map((g) => g.name) || [],
        usersListed: anime.num_list_users,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get anime details: ${error.message}`);
      }
      throw new Error('Failed to get anime details: Unknown error');
    }
  },
});

/**
 * Tool for getting anime rankings
 */
export const getAnimeRankingsTool = createTool({
  id: 'get-anime-rankings',
  description:
    'Get top anime rankings from MyAnimeList. Can get top anime overall, top airing, upcoming, TV series, movies, or by popularity.',
  inputSchema: z.object({
    rankingType: z
      .enum([
        'all',
        'airing',
        'upcoming',
        'tv',
        'ova',
        'movie',
        'special',
        'bypopularity',
        'favorite',
      ])
      .default('all')
      .describe('Type of ranking to retrieve'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .default(10)
      .describe('Number of results (1-500, default: 10)'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        rank: z.number().optional(),
        rating: z.number().optional(),
        picture: z.string().optional(),
      })
    ),
    rankingType: z.string(),
    total: z.number(),
  }),
  execute: async ({ context }) => {
    try {
      const params = new URLSearchParams({
        ranking_type: context.rankingType || 'all',
        limit: (context.limit || 10).toString(),
        fields: 'id,title,main_picture,mean,rank',
      });

      const response = await fetch(`${BASE_URL}/anime/ranking?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as any).message ||
            `API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as MyAnimeListListResponse;

      // API returns data as array of { node: {...}, ranking: {...} } objects
      return {
        results: data.data.map((item) => {
          const anime = item.node;
          return {
            id: anime.id,
            title: anime.title,
            rank: item.ranking?.rank || anime.rank,
            rating: anime.mean,
            picture: anime.main_picture?.medium || anime.main_picture?.large,
          };
        }),
        rankingType: context.rankingType || 'all',
        total: data.data.length,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get anime rankings: ${error.message}`);
      }
      throw new Error('Failed to get anime rankings: Unknown error');
    }
  },
});

/**
 * Tool for getting seasonal anime
 */
export const getSeasonalAnimeTool = createTool({
  id: 'get-seasonal-anime',
  description:
    'Get anime for a specific season and year from MyAnimeList. Returns anime that aired in the specified season (winter, spring, summer, fall).',
  inputSchema: z.object({
    year: z
      .number()
      .int()
      .min(1970)
      .max(2030)
      .describe('Year (e.g., 2017, 2024)'),
    season: z
      .enum(['winter', 'spring', 'summer', 'fall'])
      .describe('Season: winter, spring, summer, or fall'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .default(10)
      .describe('Number of results (1-500, default: 10)'),
    fields: z
      .string()
      .optional()
      .describe(
        'Comma-separated list of fields to return (e.g., "synopsis,mean,rank,popularity")'
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        synopsis: z.string().optional(),
        picture: z.string().optional(),
        rating: z.number().optional(),
        rank: z.number().optional(),
        popularity: z.number().optional(),
        episodes: z.number().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        startDate: z.string().optional(),
      })
    ),
    season: z.string().describe('Season (e.g., "2017/summer")'),
    total: z.number(),
  }),
  execute: async ({ context }) => {
    try {
      const defaultFields = 'id,title,main_picture,synopsis,mean,rank,popularity,num_episodes,start_date,status,media_type';
      const fields = context.fields || defaultFields;
      
      const params = new URLSearchParams({
        limit: (context.limit || 10).toString(),
        fields: fields,
      });

      const response = await fetch(
        `${BASE_URL}/anime/season/${context.year}/${context.season}?${params.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as any).message ||
            `API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as MyAnimeListListResponse;

      // API returns data as array of { node: {...} } objects
      return {
        results: data.data.map((item) => {
          const anime = item.node;
          return {
            id: anime.id,
            title: anime.title,
            synopsis: anime.synopsis,
            picture: anime.main_picture?.medium || anime.main_picture?.large,
            rating: anime.mean,
            rank: anime.rank,
            popularity: anime.popularity,
            episodes: anime.num_episodes,
            status: anime.status,
            type: anime.media_type,
            startDate: anime.start_date,
          };
        }),
        season: `${context.year}/${context.season}`,
        total: data.data.length,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get seasonal anime: ${error.message}`);
      }
      throw new Error('Failed to get seasonal anime: Unknown error');
    }
  },
});


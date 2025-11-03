
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { documentIngestionWorkflow } from './workflows/document-ingestion-workflow';
import { studyBuddyAgent } from './agents/study-buddy-agent';
import { animeAgent } from './agents/anime-agent';
import { animeQuoteVerificationWorkflow } from './workflows/anime-quote-verification-workflow';

// Register A2A protocol routes for external platform integration (Telex.im, etc.)
import {a2aAgentRoute, a2aAgentCardRoute, a2aAgentMessageRoute } from './routes/a2a-agent-route';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, documentIngestionWorkflow, animeQuoteVerificationWorkflow },
  agents: { weatherAgent, studyBuddyAgent, animeAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    // url: ":memory:",
    url: "file:./study-buddy.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
  server:{
    build:{
      openAPIDocs: true,
      swaggerUI: true,
    },
    apiRoutes: [a2aAgentRoute, a2aAgentCardRoute, a2aAgentMessageRoute]
  }
});

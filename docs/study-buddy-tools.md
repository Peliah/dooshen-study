# Study Buddy Agent - Tools Specification

## Required Tools

### 1. Document Processing Tools

#### `processPdfTool`
**Purpose**: Extract and process PDF documents
- **Input**: PDF file (buffer/URL/filepath)
- **Output**: Processed document text with metadata (chapters, sections, etc.)
- **External Dependencies**: 
  - `pdf-parse` or `pdfjs-dist` for PDF parsing
  - `@mastra/rag` MDocument for document structure
- **Features**:
  - Extract text from PDF
  - Maintain document structure
  - Extract metadata (title, chapters, page numbers)
  - Handle OCR if needed (via Tesseract or similar)

#### `chunkDocumentTool`
**Purpose**: Split documents into manageable chunks for processing
- **Input**: Document text/content
- **Output**: Chunked document segments
- **Uses**: Mastra's `MDocument.chunk()` method
- **Features**:
  - Multiple chunking strategies (recursive, markdown, semantic)
  - Metadata preservation
  - Configurable chunk size and overlap

### 2. Content Generation Tools

#### `generateFlashcardsTool`
**Purpose**: Generate flashcards from document content
- **Input**: 
  - Content (text or document chunks)
  - Flashcard type (basic, cloze, multiple choice, image-based)
  - Number of flashcards
  - Difficulty level
- **Output**: Array of flashcards with:
  - Front content (question/concept)
  - Back content (answer/explanation)
  - Image prompt (for image-based cards)
  - Image description
  - Tags/topics
  - Difficulty
- **Features**:
  - Multiple flashcard formats
  - Image generation prompts included
  - Topic tagging
  - Difficulty levels

#### `generateStudyPlanTool`
**Purpose**: Create personalized study plans
- **Input**:
  - Document metadata (chapters, total content)
  - Available study hours per day
  - Target completion date
  - Study style preferences
  - Focus areas
- **Output**: 
  - Daily or weekly study schedule
  - Topic distribution
  - Review sessions
  - Break recommendations
- **Features**:
  - Daily and weekly formats
  - Adaptive scheduling
  - Review frequency management

#### `generateSummaryTool`
**Purpose**: Generate chapter or document summaries
- **Input**:
  - Content to summarize
  - Summary type (bullet-point, narrative, executive)
  - Detail level
- **Output**: 
  - Summary text
  - Key concepts list
  - Important definitions
  - Connections to other chapters
- **Features**:
  - Multiple summary formats
  - Key concept extraction
  - Cross-reference linking

#### `generateQuizTool`
**Purpose**: Generate practice questions and quizzes
- **Input**:
  - Content/chapter to quiz on
  - Question types (multiple choice, short answer, essay)
  - Number of questions
  - Difficulty level
- **Output**: 
  - Quiz questions with answers
  - Answer explanations
  - Difficulty ratings
- **Features**:
  - Multiple question types
  - Answer explanations
  - Topic tagging

#### `generateNotesTool`
**Purpose**: Create structured notes from content
- **Input**: Content/chapters
- **Output**: 
  - Hierarchical notes
  - Concept maps structure
  - Important highlights
- **Features**:
  - Structured formatting
  - Concept relationships
  - Cross-references

### 3. Retrieval & Query Tools

#### `queryDocumentTool` 
**Purpose**: Answer questions about document content
- **Input**: 
  - Question text
  - Optional: chapter/topic filter
- **Output**: 
  - Answer with citation
  - Relevant context
  - Source chapter/page reference
- **Uses**: Mastra's `createVectorQueryTool` from RAG
- **Features**:
  - Semantic search over document content
  - Citation tracking
  - Context-aware answers

#### `retrieveChapterTool`
**Purpose**: Retrieve specific chapter or section content
- **Input**: 
  - Chapter/section identifier
  - Document ID
- **Output**: 
  - Full chapter content
  - Metadata (page numbers, related chapters)
- **Features**:
  - Precise content retrieval
  - Relationship mapping

### 4. Analysis Tools

#### `extractKeyConceptsTool`
**Purpose**: Extract key concepts and definitions
- **Input**: Content/chapter
- **Output**: 
  - Concept list with definitions
  - Concept relationships
  - Importance scores
- **Features**:
  - Concept extraction
  - Relationship mapping
  - Glossary generation

#### `compareTopicsTool`
**Purpose**: Compare and contrast different topics
- **Input**: 
  - Topic 1
  - Topic 2
- **Output**: 
  - Similarities
  - Differences
  - Relationship analysis
- **Features**:
  - Comparative analysis
  - Visual descriptions

### 5. Progress Tracking Tools

#### `trackProgressTool`
**Purpose**: Track study progress
- **Input**: 
  - User ID
  - Document/chapter identifiers
  - Completion status
- **Output**: 
  - Progress metrics
  - Completion percentages
  - Recommendations
- **Uses**: LibSQL store for persistence
- **Features**:
  - Progress tracking
  - Analytics
  - Recommendations

## Tool Dependencies

### External NPM Packages Needed:
```json
{
  "pdf-parse": "^1.1.1",  // For PDF text extraction
  "pdfjs-dist": "^3.x",   // Alternative PDF parser (if needed)
  "@mastra/rag": "^latest", // For document processing and RAG
  "@ai-sdk/openai": "^latest", // For embeddings and LLM
  "@ai-sdk/google": "^latest", // Alternative LLM provider
  "zod": "^4.x" // Already installed
}
```

### Mastra Packages (Already Installed):
- `@mastra/core` - Core tools and agent framework
- `@mastra/memory` - Memory management
- `@mastra/libsql` - Storage backend
- `@mastra/mcp` - MCP support

### Mastra Packages Needed (To Install):
- `@mastra/rag` - For document chunking and RAG capabilities
- Vector store package (choose one):
  - `@mastra/pg` - PostgreSQL with pgvector (recommended for local dev)
  - `@mastra/pinecone` - Pinecone (cloud vector DB)
  - `@mastra/qdrant` - Qdrant
  - Or others based on preference

## Tool Implementation Priority

### Phase 1 (MVP - Core Functionality):
1. ✅ `processPdfTool` - Document ingestion
2. ✅ `generateFlashcardsTool` - Core feature
3. ✅ `queryDocumentTool` - Q&A capability
4. ✅ `generateStudyPlanTool` - Study planning

### Phase 2 (Enhanced Features):
5. ✅ `generateSummaryTool` - Summaries
6. ✅ `generateQuizTool` - Practice questions
7. ✅ `trackProgressTool` - Progress tracking

### Phase 3 (Advanced Features):
8. ✅ `generateNotesTool` - Note generation
9. ✅ `extractKeyConceptsTool` - Concept extraction
10. ✅ `compareTopicsTool` - Comparative analysis
11. ✅ `retrieveChapterTool` - Content retrieval

## Tool Structure Example

Each tool follows the Mastra pattern:
```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const myTool = createTool({
  id: 'tool-id',
  description: 'What the tool does',
  inputSchema: z.object({
    // Input parameters
  }),
  outputSchema: z.object({
    // Output structure
  }),
  execute: async ({ context }) => {
    // Tool logic
    return result;
  },
});
```

## Integration with Agent

Tools will be integrated into the study buddy agent:
```typescript
export const studyBuddyAgent = new Agent({
  name: 'Study Buddy Agent',
  instructions: `...`,
  model: 'google/gemini-2.5-pro',
  tools: {
    processPdfTool,
    generateFlashcardsTool,
    generateStudyPlanTool,
    queryDocumentTool,
    // ... other tools
  },
});
```


# Study Buddy Agent - Workflows Specification

## When to Use Workflows vs Tools

### Tools (Simple Operations)
Use **tools** for:
- Single, self-contained operations
- Direct user requests ("generate flashcards from this text")
- Independent functions that don't depend on other operations
- Quick responses to user queries

**Example**: User asks "Generate flashcards from Chapter 1" → Agent calls `generateFlashcardsTool` directly

### Workflows (Multi-Step Processes)
Use **workflows** for:
- Sequential operations with dependencies
- Complex pipelines that need orchestration
- Operations that combine multiple tools/steps
- Batch processing that should happen atomically
- Error handling across multiple steps

**Example**: "Upload this PDF and create my study materials" → Needs workflow to: process PDF → chunk → store → generate flashcards → generate summary → create study plan

---

## Recommended Workflows

### 1. `documentIngestionWorkflow`
**Purpose**: Complete document processing pipeline

**Steps**:
1. **Extract PDF** → Extract text from PDF
2. **Chunk Document** → Split into manageable chunks
3. **Generate Embeddings** → Create vector embeddings
4. **Store in Vector DB** → Save for later retrieval
5. **Extract Metadata** → Extract chapters, structure, key info
6. **Store Metadata** → Save document metadata for progress tracking

**Input**: PDF file (buffer/URL/filepath)
**Output**: 
- Document ID
- Processed chunks count
- Metadata (chapters, sections, total pages)
- Storage confirmation

**Use Case**: "I've uploaded a new PDF, process it for me"

---

### 2. `generateCompleteStudyMaterialsWorkflow`
**Purpose**: Generate all study materials from a document at once

**Steps**:
1. **Retrieve Document** → Get processed document from storage
2. **Analyze Structure** → Identify chapters, key topics, complexity
3. **Generate Flashcards** → Create flashcards from all content
4. **Generate Summary** → Create chapter summaries
5. **Generate Study Plan** → Create personalized study schedule
6. **Generate Quiz** → Create practice questions
7. **Package Results** → Format and return all materials

**Input**: 
- Document ID
- Study preferences (hours per day, completion date, etc.)

**Output**: 
- Flashcards (array)
- Summaries (by chapter)
- Study plan (daily/weekly)
- Quiz questions
- Notes outline

**Use Case**: "I just uploaded my textbook, generate all my study materials"

---

### 3. `updateStudyProgressWorkflow`
**Purpose**: Update progress and recommend next actions

**Steps**:
1. **Get Current Progress** → Retrieve user's progress data
2. **Update Completion Status** → Mark completed chapters/topics
3. **Calculate Progress Metrics** → Percentages, time spent, etc.
4. **Analyze Performance** → Quiz scores, retention rates
5. **Generate Recommendations** → Suggest next study focus areas
6. **Update Study Plan** → Adjust schedule if needed

**Input**: 
- User ID
- Completed items (chapters, flashcards, quizzes)
- Performance data (scores, time spent)

**Output**: 
- Updated progress metrics
- Recommendations
- Adjusted study plan (if needed)
- Performance insights

**Use Case**: "I've completed Chapter 3, update my progress"

---

### 4. `adaptiveStudySessionWorkflow`
**Purpose**: Create an adaptive study session based on progress and performance

**Steps**:
1. **Assess Current Status** → Get progress and weak areas
2. **Select Review Content** → Choose topics needing review (spaced repetition)
3. **Select New Content** → Choose next topics to learn
4. **Generate Session Materials** → Create flashcards/quiz for this session
5. **Create Session Plan** → Time-blocked study schedule for today
6. **Track Session Start** → Log session beginning

**Input**: 
- User ID
- Study time available (hours)
- Focus preferences

**Output**: 
- Session flashcards
- Session quiz
- Time-blocked schedule
- Review items
- New learning items

**Use Case**: "I have 2 hours to study today, create my session"

---

### 5. `comprehensiveDocumentAnalysisWorkflow`
**Purpose**: Deep analysis of a document before generating materials

**Steps**:
1. **Extract Document Structure** → Chapters, sections, hierarchy
2. **Extract Key Concepts** → Identify main concepts and relationships
3. **Determine Complexity** → Assess difficulty levels
4. **Identify Dependencies** → Find prerequisite knowledge
5. **Generate Concept Map** → Visual representation structure
6. **Extract Definitions** → Pull out all key definitions
7. **Identify Question Patterns** → Suggest question types

**Input**: Document ID or content
**Output**: 
- Document structure tree
- Concept list with relationships
- Complexity analysis
- Dependency graph
- Concept map structure
- Definitions glossary
- Question type recommendations

**Use Case**: "Analyze this document and tell me what I need to study"

---

## Optional Workflows (Future Enhancements)

### 6. `exportStudyMaterialsWorkflow`
**Purpose**: Export study materials in various formats

**Steps**:
1. **Gather Materials** → Collect flashcards, summaries, notes
2. **Format for Export** → Convert to requested format (Anki, PDF, JSON, etc.)
3. **Generate Files** → Create export files
4. **Package** → Bundle if needed (ZIP, etc.)

---

### 7. `collaborativeStudyWorkflow`
**Purpose**: Share and collaborate on study materials

**Steps**:
1. **Select Materials** → Choose what to share
2. **Generate Share Link** → Create shareable resource
3. **Set Permissions** → Define access levels
4. **Notify Recipients** → Send invitations

---

## Workflow vs Tool Decision Matrix

| Task | Tool or Workflow? | Why |
|------|------------------|-----|
| Generate flashcards from text | **Tool** | Single operation |
| Answer question about document | **Tool** | Direct query |
| Extract text from PDF | **Tool** | Simple extraction |
| Upload PDF → Process → Store → Generate Materials | **Workflow** | Multi-step pipeline |
| Update progress + Get recommendations | **Workflow** | Sequential operations |
| Create adaptive study session | **Workflow** | Complex orchestration |
| Generate summary | **Tool** | Single operation |
| Export materials to Anki format | **Tool** | Format conversion |

---

## Implementation Priority

### Phase 1 (Essential):
1. ✅ `documentIngestionWorkflow` - **CRITICAL** - Needed for any PDF processing
2. ✅ `generateCompleteStudyMaterialsWorkflow` - **HIGH PRIORITY** - Core user flow

### Phase 2 (Important):
3. ✅ `updateStudyProgressWorkflow` - Track and update progress
4. ✅ `adaptiveStudySessionWorkflow` - Daily study sessions

### Phase 3 (Advanced):
5. ✅ `comprehensiveDocumentAnalysisWorkflow` - Deep analysis

---

## Workflow Structure Example

```typescript
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Step 1: Extract PDF
const extractPdf = createStep({
  id: 'extract-pdf',
  description: 'Extract text from PDF document',
  inputSchema: z.object({
    pdfFile: z.union([z.string(), z.instanceof(Buffer)]),
  }),
  outputSchema: z.object({
    text: z.string(),
    metadata: z.object({
      pages: z.number(),
      title: z.string().optional(),
    }),
  }),
  execute: async ({ inputData }) => {
    // PDF extraction logic
    return { text, metadata };
  },
});

// Step 2: Chunk document
const chunkDocument = createStep({
  id: 'chunk-document',
  description: 'Split document into chunks',
  inputSchema: z.object({
    text: z.string(),
    metadata: z.any(),
  }),
  outputSchema: z.object({
    chunks: z.array(z.object({
      text: z.string(),
      metadata: z.any(),
    })),
  }),
  execute: async ({ inputData }) => {
    // Chunking logic
    return { chunks };
  },
});

// Workflow definition
const documentIngestionWorkflow = createWorkflow({
  id: 'document-ingestion',
  inputSchema: z.object({
    pdfFile: z.union([z.string(), z.instanceof(Buffer)]),
  }),
  outputSchema: z.object({
    documentId: z.string(),
    chunksCount: z.number(),
    metadata: z.any(),
  }),
})
  .then(extractPdf)
  .then(chunkDocument)
  // ... more steps

documentIngestionWorkflow.commit();
export { documentIngestionWorkflow };
```

---

## Integration with Agent

Workflows can be exposed as tools to the agent, or called directly:

```typescript
// Option 1: Expose workflow as agent tool
export const studyBuddyAgent = new Agent({
  name: 'Study Buddy Agent',
  tools: {
    // Direct tools
    generateFlashcardsTool,
    queryDocumentTool,
    
    // Workflows can be called via agent.generate() or as part of instructions
  },
});

// Option 2: Call workflow directly (not through agent)
const result = await documentIngestionWorkflow.execute({
  inputData: { pdfFile: pdfBuffer },
});
```

**Recommendation**: Use workflows for multi-step processes, but let the agent decide when to call them based on user requests.


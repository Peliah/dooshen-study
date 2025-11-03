import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { MDocument } from '@mastra/rag';
import { r2Storage } from '../storage/r2-storage-service';
import { randomUUID } from 'crypto';

/**
 * Step 1: Process PDF and extract text
 */
const extractPdfText = createStep({
  id: 'extract-pdf-text',
  description: 'Extract text and metadata from PDF file',
  inputSchema: z.object({
    pdfFile: z.union([
      z.instanceof(Buffer),
      z.string().url(),
      z.string(),
    ]),
    fileName: z.string().optional(),
    userId: z.string().optional(),
  }),
  outputSchema: z.object({
    documentId: z.string(),
    textContent: z.string(),
    metadata: z.object({
      pages: z.number(),
      title: z.string().optional(),
      author: z.string().optional(),
      creationDate: z.string().optional(),
    }),
    filePath: z.string(),
    fileSize: z.number(),
  }),
  execute: async ({ inputData }) => {
    let pdfBuffer: Buffer;

    // Handle different input types
    if (Buffer.isBuffer(inputData.pdfFile)) {
      pdfBuffer = inputData.pdfFile;
    } else if (typeof inputData.pdfFile === 'string') {
      if (inputData.pdfFile.startsWith('http://') || inputData.pdfFile.startsWith('https://')) {
        const response = await fetch(inputData.pdfFile);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }
        pdfBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        const fs = await import('fs/promises');
        pdfBuffer = await fs.readFile(inputData.pdfFile);
      }
    } else {
      throw new Error('Invalid PDF file input');
    }

    // Parse PDF
    const pdfParseModule = await import('pdf-parse');
    const pdfParseFn = (pdfParseModule as any).default || pdfParseModule;
    const pdfData = await pdfParseFn(pdfBuffer);

    // Generate document ID
    const documentId = randomUUID();
    const fileName = inputData.fileName || `document-${documentId}.pdf`;
    const folder = inputData.userId ? `users/${inputData.userId}/pdfs` : 'pdfs';

    // Upload to R2
    const filePath = await r2Storage.upload(pdfBuffer, fileName, folder);

    return {
      documentId,
      textContent: pdfData.text,
      metadata: {
        pages: pdfData.numpages,
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        creationDate: pdfData.info?.CreationDate
          ? new Date(pdfData.info.CreationDate).toISOString()
          : undefined,
      },
      filePath,
      fileSize: pdfBuffer.length,
    };
  },
});

/**
 * Step 2: Chunk the document
 */
const chunkDocument = createStep({
  id: 'chunk-document',
  description: 'Split document into manageable chunks for processing',
  inputSchema: z.object({
    documentId: z.string(),
    textContent: z.string(),
    metadata: z.any(),
    filePath: z.string(),
    fileSize: z.number(),
  }),
  outputSchema: z.object({
    documentId: z.string(),
    chunks: z.array(
      z.object({
        text: z.string(),
        metadata: z.any(),
      })
    ),
    originalMetadata: z.any(),
    filePath: z.string(),
  }),
  execute: async ({ inputData }) => {
    // Create MDocument from text
    const doc = MDocument.fromText(inputData.textContent, {
      documentId: inputData.documentId,
      ...inputData.metadata,
      filePath: inputData.filePath,
    });

    // Chunk the document using recursive strategy
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 1000,
      overlap: 200,
      separators: ['\n\n', '\n', ' '],
    });

    return {
      documentId: inputData.documentId,
      chunks: chunks.map((chunk) => ({
        text: chunk.text,
        metadata: {
          ...chunk.metadata,
          documentId: inputData.documentId,
          chunkIndex: chunks.indexOf(chunk),
          totalChunks: chunks.length,
        },
      })),
      originalMetadata: inputData.metadata,
      filePath: inputData.filePath,
    };
  },
});

/**
 * Step 3: Store document metadata and chunks
 */
const storeDocumentData = createStep({
  id: 'store-document-data',
  description: 'Store document chunks and metadata for future retrieval',
  inputSchema: z.object({
    documentId: z.string(),
    chunks: z.array(
      z.object({
        text: z.string(),
        metadata: z.any(),
      })
    ),
    originalMetadata: z.any(),
    filePath: z.string(),
  }),
  outputSchema: z.object({
    documentId: z.string(),
    chunksCount: z.number(),
    stored: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    // Store chunks metadata as JSON in R2 for future reference
    // Note: In a full implementation, you might want to store this in a database
    // For now, we'll store the summary as JSON
    const summary = {
      documentId: inputData.documentId,
      chunksCount: inputData.chunks.length,
      metadata: inputData.originalMetadata,
      filePath: inputData.filePath,
      createdAt: new Date().toISOString(),
      chunks: inputData.chunks.map((chunk, index) => ({
        index,
        textLength: chunk.text.length,
        metadata: chunk.metadata,
      })),
    };

    // Store summary as JSON file
    const summaryBuffer = Buffer.from(JSON.stringify(summary, null, 2));
    await r2Storage.upload(
      summaryBuffer,
      `${inputData.documentId}-summary.json`,
      'metadata'
    );

    return {
      documentId: inputData.documentId,
      chunksCount: inputData.chunks.length,
      stored: true,
    };
  },
});

/**
 * Document Ingestion Workflow
 * Complete pipeline: PDF → Extract → Chunk → Store
 */
export const documentIngestionWorkflow = createWorkflow({
  id: 'document-ingestion-workflow',
  inputSchema: z.object({
    pdfFile: z.union([
      z.instanceof(Buffer),
      z.string().url(),
      z.string(),
    ]),
    fileName: z.string().optional(),
    userId: z.string().optional(),
  }),
  outputSchema: z.object({
    documentId: z.string(),
    chunksCount: z.number(),
    stored: z.boolean(),
  }),
})
  .then(extractPdfText)
  .then(chunkDocument)
  .then(storeDocumentData);

documentIngestionWorkflow.commit();


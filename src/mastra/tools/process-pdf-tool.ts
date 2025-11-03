import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { r2Storage } from '../storage/r2-storage-service';
import { randomUUID } from 'crypto';

/**
 * Tool for processing PDF documents
 * Extracts text, uploads to R2 storage, and returns document metadata
 */
export const processPdfTool = createTool({
  id: 'process-pdf',
  description:
    'Upload and process a PDF document. Extracts text content, stores the file in cloud storage, and returns document metadata including document ID and file location. Accepts PDF files as Buffer or URL.',
  inputSchema: z.object({
    pdfFile: z
      .union([
        z.instanceof(Buffer).describe('PDF file as Buffer'),
        z.string().url().describe('URL to PDF file'),
        z.string().describe('Local file path to PDF'),
      ])
      .describe('The PDF file to process - can be Buffer, URL, or file path'),
    fileName: z
      .string()
      .optional()
      .describe(
        'Optional custom filename. If not provided, generates one from document ID.'
      ),
    userId: z
      .string()
      .optional()
      .describe(
        'Optional user ID to organize files by user. Creates user-specific folder structure.'
      ),
  }),
  outputSchema: z.object({
    documentId: z.string().describe('Unique identifier for the document'),
    filePath: z.string().describe('Path where PDF is stored in R2'),
    textContent: z
      .string()
      .describe('Extracted text content from the PDF'),
    metadata: z.object({
      pages: z.number().describe('Number of pages in the PDF'),
      title: z.string().optional().describe('PDF title if available'),
      author: z.string().optional().describe('PDF author if available'),
      creationDate: z.string().optional().describe('PDF creation date if available'),
    }),
    fileSize: z.number().describe('File size in bytes'),
  }),
  execute: async ({ context }) => {
    let pdfBuffer: Buffer;

    // Handle different input types
    if (Buffer.isBuffer(context.pdfFile)) {
      pdfBuffer = context.pdfFile;
    } else if (typeof context.pdfFile === 'string') {
      if (context.pdfFile.startsWith('http://') || context.pdfFile.startsWith('https://')) {
        // Fetch from URL with streaming for large files
        const response = await fetch(context.pdfFile);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
        }
        
        // Check content length if available
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          const sizeMB = parseInt(contentLength) / (1024 * 1024);
          if (sizeMB > 50) {
            throw new Error(`File too large: ${sizeMB.toFixed(2)}MB. Maximum size is 50MB.`);
          }
        }
        
        pdfBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        // Local file path - check size first
        const fs = await import('fs/promises');
        const stats = await fs.stat(context.pdfFile);
        const sizeMB = stats.size / (1024 * 1024);
        
        if (sizeMB > 50) {
          throw new Error(`File too large: ${sizeMB.toFixed(2)}MB. Maximum size is 50MB.`);
        }
        
        pdfBuffer = await fs.readFile(context.pdfFile);
      }
    } else {
      throw new Error('Invalid PDF file input');
    }

    // Check buffer size
    const sizeMB = pdfBuffer.length / (1024 * 1024);
    if (sizeMB > 50) {
      throw new Error(`File too large: ${sizeMB.toFixed(2)}MB. Maximum size is 50MB.`);
    }
    
    // For large files (>3MB), process more efficiently
    if (sizeMB > 3) {
      console.log(`Processing large PDF (${sizeMB.toFixed(2)}MB)... This may take a moment.`);
    }

    // Parse PDF to extract text and metadata
    // pdf-parse is an ESM module, use dynamic import with proper typing
    const pdfParseModule = await import('pdf-parse');
    const pdfParseFn = (pdfParseModule as any).default || pdfParseModule;
    const pdfData = await pdfParseFn(pdfBuffer);

    // Generate document ID
    const documentId = randomUUID();

    // Generate filename
    const fileName =
      context.fileName || `document-${documentId}.pdf`;

    // Determine folder structure
    const folder = context.userId
      ? `users/${context.userId}/pdfs`
      : 'pdfs';

    // Upload to R2
    const filePath = await r2Storage.upload(
      pdfBuffer,
      fileName,
      folder
    );

    return {
      documentId,
      filePath,
      textContent: pdfData.text,
      metadata: {
        pages: pdfData.numpages,
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        creationDate: pdfData.info?.CreationDate
          ? new Date(pdfData.info.CreationDate).toISOString()
          : undefined,
      },
      fileSize: pdfBuffer.length,
    };
  },
});


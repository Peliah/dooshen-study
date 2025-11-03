# Handling Large PDF Files (5MB+)

## The Issue

5MB PDFs can fail to upload due to:
1. **Server/Middleware limits** (Express body-parser, Next.js API routes)
2. **Memory constraints** when loading entire file into Buffer
3. **Timeout issues** during processing
4. **Network/Upload limits**

## Solutions Implemented

### 1. File Size Validation ✅

The tool now checks file size before processing:
- **Maximum size: 50MB** (configurable)
- Pre-checks file size to fail fast
- Shows clear error messages

### 2. Large File Handling ✅

- Logs progress for files >3MB
- Better error messages
- Size checks at multiple stages

## Additional Solutions You May Need

### Option A: Increase Server Upload Limits

If you're using a web framework, increase the body size limit:

#### Next.js API Route

```typescript
// pages/api/upload-pdf.ts or app/api/upload-pdf/route.ts
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increase from default 1mb
    },
  },
};

// Or for App Router:
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes
```

#### Express Server

```typescript
import express from 'express';

const app = express();

// Increase body size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ limit: '50mb', type: 'application/pdf' }));

// For multipart/form-data (file uploads)
import multer from 'multer';
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
```

### Option B: Stream Processing (Advanced)

For very large files (>10MB), consider streaming instead of loading everything into memory:

```typescript
// Future enhancement: Process PDF in chunks
// This would require pdf-parse streaming or chunked processing
```

### Option C: Optimize PDF Before Upload

Compress the PDF before uploading:

```bash
# Using ghostscript (if available)
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET \
   -dBATCH -sOutputFile=compressed.pdf input.pdf
```

## Current Limits

- **Hard limit: 50MB** per file
- **Warning threshold: 3MB** (shows processing message)
- **R2 Storage**: Supports up to 5GB, but we limit to 50MB for processing

## What Error Did You Get?

The specific error message will help identify the issue:

1. **"Payload too large"** → Server body size limit
2. **"File too large: XMB"** → Our size check (max 50MB)
3. **Timeout error** → Processing took too long
4. **Memory error** → Node.js ran out of memory

## Quick Fixes

### 1. Check Your Upload Endpoint

If you're uploading via HTTP, make sure your API route/server has increased limits:

```typescript
// Example for Next.js App Router
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  const buffer = Buffer.from(await file.arrayBuffer());
  // Now process with tool...
}
```

### 2. Increase Node.js Memory (if needed)

```bash
# Run with more memory
node --max-old-space-size=4096 your-script.js

# Or in package.json
"scripts": {
  "start": "node --max-old-space-size=4096 index.js"
}
```

### 3. Use Direct File Path (if testing locally)

Instead of uploading via HTTP, use file path directly:

```typescript
const result = await processPdfTool.execute({
  context: {
    pdfFile: '/path/to/your/file.pdf', // Direct file path
    fileName: 'my-document.pdf',
  },
});
```

## Testing

Try uploading your 5MB PDF again. If you still get errors, share:
1. The exact error message
2. How you're uploading (HTTP endpoint, direct tool call, etc.)
3. What framework/server you're using (Next.js, Express, etc.)

## Future Improvements

- [ ] Multipart uploads for very large files
- [ ] Chunked PDF processing (process page-by-page)
- [ ] Background job processing for large files
- [ ] Progress tracking for uploads


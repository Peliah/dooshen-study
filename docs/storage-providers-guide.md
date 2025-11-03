# Storage Providers Guide for Study Buddy

## Understanding S3-Compatible APIs

**Important Concept:** Some storage providers (like Cloudflare R2, Backblaze B2) use **S3-compatible APIs**. This means:

1. ✅ They use the same API protocol as AWS S3 (same commands, same request format)
2. ✅ You can use the AWS SDK (`@aws-sdk/client-s3`) to interact with them
3. ✅ But you configure the SDK to point to **their servers**, not AWS's
4. ✅ Your data stays on their platform, not AWS

**Think of it like this:**
- AWS S3 speaks "S3 language"
- Cloudflare R2 also speaks "S3 language" (but is a different service)
- The AWS SDK can talk "S3 language" to either one
- You just tell the SDK which address to call (endpoint)

**Example:**
```typescript
// This connects to AWS S3
const awsClient = new S3Client({
  region: 'us-east-1',
  // Uses default AWS endpoint: s3.amazonaws.com
});

// This connects to Cloudflare R2 (using same SDK!)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: 'https://your-account.r2.cloudflarestorage.com', // Cloudflare's address
});
```

Both use the same SDK, but data goes to different places!

---

## Recommended Free Storage Providers

### 1. **Cloudflare R2** ⭐ (BEST FOR MOST USE CASES)
**Free Tier:**
- 10 GB storage
- 1 million Class A operations (writes/reads)
- Unlimited Class B operations (retrievals)
- **No egress fees** (this is huge!)
- **S3-compatible API** (uses same protocol as AWS S3)

**Why it's great:**
- No egress/bandwidth costs (unlike AWS S3)
- S3-compatible (can use AWS SDK, but points to Cloudflare's servers)
- Fast CDN integration
- Generous free tier

**Why use AWS SDK with Cloudflare?**
Cloudflare R2 implements the **S3-compatible API**, meaning it speaks the same "language" as AWS S3. So you use the AWS SDK, but configure it to connect to Cloudflare's endpoint instead of AWS's. The SDK doesn't know it's talking to Cloudflare!

**Installation:**
```bash
npm install @aws-sdk/client-s3
```

**Note:** You're using AWS SDK, but all data goes to Cloudflare's servers, not AWS. Cloudflare just uses the same API protocol for compatibility.

**Setup:**
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Create S3 client but point it to Cloudflare's endpoint
// The AWS SDK works with R2 because R2 uses S3-compatible API
const r2Client = new S3Client({
  region: 'auto', // Cloudflare uses 'auto' for region
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`, // Cloudflare endpoint, not AWS!
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!, // Cloudflare R2 access key (not AWS key)
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, // Cloudflare R2 secret (not AWS secret)
  },
});

// Upload PDF
export async function uploadPdfToR2(fileBuffer: Buffer, fileName: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: `pdfs/${fileName}`,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  });
  
  await r2Client.send(command);
  return `pdfs/${fileName}`;
}

// Get PDF
export async function getPdfFromR2(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  
  const response = await r2Client.send(command);
  const stream = response.Body as any;
  const chunks: Buffer[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}
```

**Environment Variables:**
```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=study-buddy-docs
```

---

### 2. **AWS S3** 
**Free Tier (12 months):**
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests
- After 12 months: pay-as-you-go

**Why it's good:**
- Industry standard
- Mature ecosystem
- Good documentation
- **Downside**: Egress fees after free tier

**Installation:**
```bash
npm install @aws-sdk/client-s3
```

**Setup:**
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadPdfToS3(fileBuffer: Buffer, fileName: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: `pdfs/${fileName}`,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  });
  
  await s3Client.send(command);
  return `pdfs/${fileName}`;
}
```

**Environment Variables:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=study-buddy-docs
```

---

### 3. **Supabase Storage** ⭐ (GREAT FOR QUICK SETUP)
**Free Tier:**
- 1 GB storage
- 2 GB bandwidth/month
- Unlimited uploads
- **Includes database + auth!**

**Why it's great:**
- Very easy setup
- Includes Postgres database (can use for vector storage!)
- Built-in auth
- REST API and SDK

**Installation:**
```bash
npm install @supabase/supabase-js
```

**Setup:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Upload PDF
export async function uploadPdfToSupabase(fileBuffer: Buffer, fileName: string) {
  const { data, error } = await supabase.storage
    .from('pdfs')
    .upload(`/${fileName}`, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
  
  if (error) throw error;
  return data.path;
}

// Get PDF (returns public URL or signed URL)
export async function getPdfFromSupabase(filePath: string) {
  const { data, error } = await supabase.storage
    .from('pdfs')
    .download(filePath);
  
  if (error) throw error;
  return data;
}

// Get public URL (if bucket is public)
export function getPdfUrlFromSupabase(filePath: string) {
  const { data } = supabase.storage
    .from('pdfs')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}
```

**Environment Variables:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

**Bucket Setup in Supabase Dashboard:**
1. Go to Storage
2. Create bucket named "pdfs"
3. Set privacy (public or private)

---

### 4. **Backblaze B2**
**Free Tier:**
- 10 GB storage
- 1 GB download/day
- Unlimited uploads
- **Very cheap after free tier**

**Why it's good:**
- Generous free tier
- S3-compatible API
- Very affordable pricing

**Installation:**
```bash
npm install @aws-sdk/client-s3
```

**Setup:** (Same as S3, different endpoint)
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const b2Client = new S3Client({
  region: 'us-west-004',
  endpoint: 'https://s3.us-west-004.backblazeb2.com',
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
});

export async function uploadPdfToB2(fileBuffer: Buffer, fileName: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.B2_BUCKET_NAME!,
    Key: `pdfs/${fileName}`,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  });
  
  await b2Client.send(command);
  return `pdfs/${fileName}`;
}
```

---

### 5. **Google Cloud Storage**
**Free Tier:**
- 5 GB storage
- 5 GB egress/month
- Unlimited operations

**Installation:**
```bash
npm install @google-cloud/storage
```

**Setup:**
```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL!,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

export async function uploadPdfToGCS(fileBuffer: Buffer, fileName: string) {
  const file = bucket.file(`pdfs/${fileName}`);
  await file.save(fileBuffer, {
    metadata: { contentType: 'application/pdf' },
  });
  return `pdfs/${fileName}`;
}
```

---

## Comparison Table

| Provider | Free Storage | Free Bandwidth | Egress Fees | Setup Difficulty | Best For |
|----------|--------------|----------------|-------------|------------------|----------|
| **Cloudflare R2** | 10 GB | Unlimited* | None | Medium | Most use cases |
| **Supabase** | 1 GB | 2 GB/month | Low | Easy | Quick MVP |
| **AWS S3** | 5 GB (12mo) | Limited | Yes | Medium | Enterprise |
| **Backblaze B2** | 10 GB | 1 GB/day | Low | Medium | Budget-friendly |
| **Google Cloud** | 5 GB | 5 GB/month | Yes | Medium | Google ecosystem |

*Unlimited Class B operations (retrievals)

---

## Recommended Setup for Study Buddy

### Option 1: Cloudflare R2 (Recommended)
**Best for:** Production, no egress costs, S3-compatible

**Pros:**
- No egress fees (huge for PDF downloads)
- Generous free tier
- Fast CDN
- S3-compatible API

**Cons:**
- Requires Cloudflare account setup
- Slightly more setup than Supabase

### Option 2: Supabase Storage (Quick Start)
**Best for:** MVP, rapid development

**Pros:**
- Easiest setup
- Includes database (can use for vector storage!)
- Built-in auth
- REST API

**Cons:**
- Smaller free tier (1 GB)
- Less storage than R2

---

## Implementation Example: Storage Service

Create a unified storage service that can switch providers:

```typescript
// src/mastra/storage/storage-service.ts
interface StorageProvider {
  upload(fileBuffer: Buffer, fileName: string, folder?: string): Promise<string>;
  get(filePath: string): Promise<Buffer>;
  getUrl(filePath: string): Promise<string>;
  delete(filePath: string): Promise<void>;
}

// Cloudflare R2 implementation
class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = process.env.R2_BUCKET_NAME!;
  }

  async upload(fileBuffer: Buffer, fileName: string, folder = 'pdfs'): Promise<string> {
    const key = `${folder}/${fileName}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: this.getContentType(fileName),
    });
    
    await this.client.send(command);
    return key;
  }

  async get(filePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });
    
    const response = await this.client.send(command);
    const stream = response.Body as any;
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  async getUrl(filePath: string): Promise<string> {
    // For R2, you might need to create signed URLs or use public buckets
    return `https://your-custom-domain.com/${filePath}`;
  }

  async delete(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });
    
    await this.client.send(command);
  }

  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return types[ext || ''] || 'application/octet-stream';
  }
}

// Factory to create storage provider
export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'r2';
  
  switch (provider) {
    case 'r2':
      return new R2StorageProvider();
    case 'supabase':
      // return new SupabaseStorageProvider();
    case 's3':
      // return new S3StorageProvider();
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

export const storageService = createStorageProvider();
```

---

## Tool Integration

Use the storage service in your PDF processing tool:

```typescript
// src/mastra/tools/process-pdf-tool.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { storageService } from '../storage/storage-service';

export const processPdfTool = createTool({
  id: 'process-pdf',
  description: 'Upload and process a PDF document for study materials',
  inputSchema: z.object({
    pdfFile: z.union([
      z.string().describe('URL or file path'),
      z.instanceof(Buffer).describe('PDF file buffer'),
    ]),
    fileName: z.string().describe('Name for the PDF file'),
  }),
  outputSchema: z.object({
    filePath: z.string().describe('Path where PDF is stored'),
    fileUrl: z.string().describe('URL to access the PDF'),
    documentId: z.string().describe('Unique document identifier'),
  }),
  execute: async ({ context }) => {
    let pdfBuffer: Buffer;
    
    // Handle URL or Buffer input
    if (typeof context.pdfFile === 'string') {
      if (context.pdfFile.startsWith('http')) {
        // Fetch from URL
        const response = await fetch(context.pdfFile);
        pdfBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        // Local file path (read file)
        pdfBuffer = await fs.readFile(context.pdfFile);
      }
    } else {
      pdfBuffer = context.pdfFile;
    }
    
    // Upload to storage
    const filePath = await storageService.upload(
      pdfBuffer,
      context.fileName,
      'pdfs'
    );
    
    const fileUrl = await storageService.getUrl(filePath);
    
    // Generate document ID (you might want to store this in your database)
    const documentId = crypto.randomUUID();
    
    return {
      filePath,
      fileUrl,
      documentId,
    };
  },
});
```

---

## Folder Structure Recommendations

Organize files by type and user:

```
pdfs/
  ├── user-{userId}/
  │   ├── document-{docId}.pdf
  │   └── ...
  └── shared/
      └── ...

generated-materials/
  ├── flashcards/
  │   └── doc-{docId}/
  │       └── flashcards.json
  ├── summaries/
  │   └── doc-{docId}/
  │       └── chapter-{num}.md
  └── study-plans/
      └── doc-{docId}/
          └── plan.json
```

---

## Getting Started

1. **Choose a provider** (recommend R2 or Supabase)
2. **Create account** and get API keys
3. **Set environment variables**
4. **Install SDK** (`@aws-sdk/client-s3` for R2/S3/B2, `@supabase/supabase-js` for Supabase)
5. **Create storage service** (use example above)
6. **Integrate with tools**

Want me to help you set up a specific provider?


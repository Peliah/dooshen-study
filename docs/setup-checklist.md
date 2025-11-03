# Study Buddy - Complete Setup Checklist

## 1. Cloudflare R2 Setup ⚠️ (Do This First)

### Step 1: Create Cloudflare Account
1. Go to [cloudflare.com](https://dash.cloudflare.com/sign-up)
2. Sign up for free account
3. Verify email

### Step 2: Create R2 Bucket
1. Go to Cloudflare Dashboard → R2
2. Click "Create bucket"
3. Name: `study-buddy-docs` (or your preferred name)
4. Choose location (closest to you)
5. Click "Create bucket"

### Step 3: Create API Token
1. In R2 dashboard, go to "Manage R2 API Tokens"
2. Click "Create API token"
3. Set:
   - Token name: `study-buddy-token`
   - Permissions: `Object Read & Write` (or `Admin Read & Write`)
   - TTL: Leave default or set expiration
4. **IMPORTANT:** Copy these values immediately (you won't see them again):
   - `Access Key ID`
   - `Secret Access Key`
5. Save them securely (we'll use them in `.env`)

### Step 4: Get Your Account ID
**Where to find it:**
1. In Cloudflare dashboard, go to any page (Home, R2, etc.)
2. Look at the **right sidebar** (or bottom if on mobile)
3. You'll see "Account ID" with a copy button next to it
4. **OR** Go to: **Dashboard Home** → Scroll to bottom → "Account ID" is shown
5. Click the copy icon to copy it

**Visual guide:**
- Right sidebar always shows: "Account ID: [code]" with a 📋 copy button
- It's usually visible on all pages in the dashboard
- Format: Usually looks like `a1b2c3d4e5f6g7h8i9j0k1l2m3n4`

**Alternative method:**
- Go to any R2 bucket settings
- The Account ID is shown in the bucket URL or settings page

---

## 2. Install Required Packages

Run these commands:

```bash
# AWS SDK for Cloudflare R2 (S3-compatible API)
pnpm add @aws-sdk/client-s3

# PDF parsing
pnpm add pdf-parse

# Mastra RAG (for document chunking)
pnpm add @mastra/rag

# Vector store (OPTIONAL - only if you want Q&A features)
# Skip this for now, add later if needed:
# pnpm add @mastra/pinecone  # Cloud option (recommended if you add vectors)
# pnpm add @mastra/qdrant   # Alternative cloud option

# File handling utilities
pnpm add -D @types/node
```

**Essential packages to install:**
```bash
pnpm add @aws-sdk/client-s3 pdf-parse @mastra/rag
```

**Optional (for vector search/Q&A features - add later if needed):**
```bash
pnpm add @mastra/pinecone  # Cloud vector store
```

---

## 3. Environment Variables Setup

Create a `.env` file in your project root:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=study-buddy-docs

# LLM Provider (choose one)
# For OpenAI:
OPENAI_API_KEY=your_openai_key
# OR for Google (currently using in weather agent):
GOOGLE_GEMINI_API_KEY=your_gemini_key

# Database (LibSQL - already configured in project)
# Local file (persists to disk):
DATABASE_URL=file:./study-buddy.db
# OR Turso Cloud (optional, for cloud persistence):
# DATABASE_URL=libsql://your-db.turso.io
# DATABASE_AUTH_TOKEN=your-turso-token

# Storage Provider Selection
STORAGE_PROVIDER=r2

# Optional: Vector Store (only if you add Q&A features later)
# VECTOR_STORE_NAME=pinecone
# PINECONE_API_KEY=your-pinecone-key
# PINECONE_INDEX_NAME=documents
```

**Important:** 
- Add `.env` to `.gitignore` (if not already there)
- Never commit API keys to git!

---

## 4. Project Structure Setup

Create these folders:

```
src/
  mastra/
    storage/
      └── storage-service.ts (storage service)
    tools/
      └── process-pdf-tool.ts (PDF processing)
      └── generate-flashcards-tool.ts (flashcard generation)
    workflows/
      └── document-ingestion-workflow.ts (document processing pipeline)
    agents/
      └── study-buddy-agent.ts (main agent)
```

---

## 5. Database Setup ✅ (Already Configured!)

**You already have LibSQL set up!** No local PostgreSQL needed.

### For Regular Storage (Progress, Metadata, etc.)
Your existing `LibSQLStore` is perfect:
- Already configured in `src/mastra/index.ts`
- Can use local file: `file:./study-buddy.db`
- OR Turso Cloud (free tier) for persistence

**Update your storage config:**
```typescript
// In src/mastra/index.ts - change from ":memory:" to file:
storage: new LibSQLStore({
  url: 'file:./study-buddy.db', // Persists to file
}),
```

**Optional - Turso Cloud (free tier) for cloud persistence:**
1. Sign up at [turso.tech](https://turso.tech)
2. Create database
3. Get connection string and token
4. Update storage:
```typescript
storage: new LibSQLStore({
  url: process.env.DATABASE_URL!, // libsql://your-db.turso.io
  authToken: process.env.DATABASE_AUTH_TOKEN,
}),
```

---

## 6. LLM API Key (You Already Have This)

Since you're using `google/gemini-2.5-pro` in your weather agent, you likely already have:

```env
GOOGLE_GEMINI_API_KEY=your_key_here
```

If not, get one from:
- [Google AI Studio](https://aistudio.google.com/apikey)

---

## 7. Vector Store Setup (Optional - For RAG/Document Querying)

**You can skip this initially!** Start with basic document processing, add vectors later.

If you want Q&A features (agent answering questions about documents), you'll need a vector store:

### Option A: Pinecone (Cloud - Easiest, No Local Setup)
- Sign up at [pinecone.io](https://www.pinecone.io) (free tier available)
- Create index
- Get API key
- **No local installation needed!**

```bash
pnpm add @mastra/pinecone
```

### Option B: Qdrant Cloud (Alternative Cloud Option)
- Sign up at [qdrant.tech](https://cloud.qdrant.io) (free tier available)
- No local setup needed

### Option C: Skip for Now
- Start with basic flashcard generation
- Add vector search/Q&A later when needed
- Much simpler initial setup!

---

## 8. Quick Verification Checklist

Before starting development, verify:

- [ ] Cloudflare account created
- [ ] R2 bucket created (`study-buddy-docs`)
- [ ] R2 API token created and saved (Access Key ID + Secret)
- [ ] Cloudflare Account ID copied
- [ ] All NPM packages installed
- [ ] `.env` file created with all keys
- [ ] Database configured (LibSQL - already done! Just update to file:./study-buddy.db)
- [ ] LLM API key configured (Gemini or OpenAI)
- [ ] Project folders created

---

## 9. Testing Your Setup

Once everything is installed, test:

1. **Test R2 Connection:**
   ```typescript
   // Quick test script
   import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
   
   const client = new S3Client({
     region: 'auto',
     endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
     credentials: {
       accessKeyId: process.env.R2_ACCESS_KEY_ID!,
       secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
     },
   });
   
   // Test upload
   await client.send(new PutObjectCommand({
     Bucket: process.env.R2_BUCKET_NAME!,
     Key: 'test.txt',
     Body: 'Hello R2!',
   }));
   
   console.log('✅ R2 connection successful!');
   ```

2. **Test PDF Parsing:**
   ```typescript
   import pdfParse from 'pdf-parse';
   import fs from 'fs';
   
   const pdfBuffer = fs.readFileSync('test.pdf');
   const data = await pdfParse(pdfBuffer);
   console.log('✅ PDF parsing works!', data.text.substring(0, 100));
   ```

---

## 10. What I'll Help You Build Next

Once setup is complete, I can help you create:

1. **Storage Service** (`src/mastra/storage/storage-service.ts`)
   - Upload/download files to R2
   - File management

2. **PDF Processing Tool** (`src/mastra/tools/process-pdf-tool.ts`)
   - Extract text from PDFs
   - Upload to R2
   - Return document info

3. **Document Ingestion Workflow** (`src/mastra/workflows/document-ingestion-workflow.ts`)
   - Process PDF → Chunk → Embed → Store

4. **Study Buddy Agent** (`src/mastra/agents/study-buddy-agent.ts`)
   - Main agent with all tools

---

## Priority Order for Setup

1. **Cloudflare R2** (most important - need this for file storage) ⚠️
2. **Install packages** (`@aws-sdk/client-s3`, `pdf-parse`, `@mastra/rag`)
3. **Update LibSQL config** (change `:memory:` to `file:./study-buddy.db` in index.ts)
4. **Environment variables** (R2 credentials + existing keys)
5. **Test connections** (verify R2 works)

---

## Estimated Time

- Cloudflare setup: 5-10 minutes
- Package installation: 2-3 minutes
- Database setup: 1 minute (just update config - already done!)
- Environment setup: 5 minutes
- Testing: 5 minutes

**Total: ~20-30 minutes** (much faster since database is already set up!)

---

## Need Help?

If you get stuck on any step:
1. Check the error message
2. Verify environment variables are correct
3. Make sure all packages installed
4. Test each component individually

Let me know when you've completed the setup and we can start building the storage service and tools!


# Quick Setup with Supabase Storage (Simpler Alternative)

If you want to skip the Cloudflare Account ID complexity, use Supabase Storage instead!

## Supabase Storage Setup (5 minutes)

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (easiest) or email
4. Create a new project

### Step 2: Create Storage Bucket
1. In Supabase dashboard, go to **Storage**
2. Click **"New bucket"**
3. Name: `pdfs` (or `study-buddy-docs`)
4. Make it **Public** (for easy access) or **Private** (more secure)
5. Click **"Create bucket"**

### Step 3: Get Your Keys
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (the `anon` key, not the `service_role` key)

**That's it!** No Account ID needed!

## Environment Variables

```env
# Supabase Storage (much simpler!)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# No Account ID needed!
```

## Packages Needed

```bash
pnpm add @supabase/supabase-js
# That's it! No AWS SDK needed
```

## Code Example

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Upload PDF
await supabase.storage
  .from('pdfs')
  .upload('my-document.pdf', pdfBuffer);

// Get PDF
const { data } = await supabase.storage
  .from('pdfs')
  .download('my-document.pdf');
```

**Much simpler than R2!**

---

## Comparison

| Feature | Cloudflare R2 | Supabase Storage |
|---------|---------------|------------------|
| Free Storage | 10 GB | 1 GB |
| Setup Complexity | Medium (needs Account ID) | Easy (just URL + key) |
| SDK Needed | AWS SDK | Supabase SDK |
| Account ID Required | ✅ Yes | ❌ No |

**Recommendation:** If you want the simplest setup, go with Supabase!


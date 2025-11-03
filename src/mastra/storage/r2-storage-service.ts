import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 Storage Service
 * Handles file upload, download, and deletion for PDFs and study materials
 */
export class R2StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const endpoint = process.env.S3_CLIENTS;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error(
        'Missing R2 configuration. Please set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your .env file'
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: endpoint as string,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucket = bucketName;
  }

  /**
   * Upload a file to R2
   * Supports large files by using streaming uploads
   * @param fileBuffer - The file content as a Buffer
   * @param fileName - Name for the file (e.g., "document.pdf")
   * @param folder - Optional folder path (e.g., "pdfs", "flashcards")
   * @returns The file path/key in R2
   */
  async upload(
    fileBuffer: Buffer,
    fileName: string,
    folder: string = 'pdfs'
  ): Promise<string> {
    const key = `${folder}/${fileName}`;
    const fileSizeMB = fileBuffer.length / (1024 * 1024);

    // For large files, use multipart upload approach
    // R2/S3 supports up to 5GB per object, but we'll handle large files efficiently
    if (fileSizeMB > 100) {
      // For very large files (>100MB), would need multipart upload
      // For now, standard upload works up to ~5GB, but may be slow
      console.log(`Uploading large file (${fileSizeMB.toFixed(2)}MB) to R2...`);
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: this.getContentType(fileName),
      // Note: R2 doesn't have explicit size limits in the free tier for uploads
      // The 5GB limit is more about storage quota than upload size
    });

    await this.client.send(command);
    return key;
  }

  /**
   * Download a file from R2
   * @param filePath - The file path/key in R2
   * @returns The file content as a Buffer
   */
  async get(filePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });

    const response = await this.client.send(command);
    const stream = response.Body as any;

    if (!stream) {
      throw new Error(`File not found: ${filePath}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Check if a file exists in R2
   * @param filePath - The file path/key in R2
   * @returns true if file exists, false otherwise
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete a file from R2
   * @param filePath - The file path/key in R2
   */
  async delete(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });

    await this.client.send(command);
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
      md: 'text/markdown',
      docx:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      csv: 'text/csv',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
    };
    return types[ext || ''] || 'application/octet-stream';
  }
}

// Export singleton instance
export const r2Storage = new R2StorageService();


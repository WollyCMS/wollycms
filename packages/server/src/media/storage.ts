import { env } from '../env.js';

export interface StorageBackend {
  /** Upload a file buffer to storage, return its public-facing path/URL. */
  upload(key: string, buffer: Buffer | Uint8Array, contentType: string): Promise<string>;
  /** Upload a variant buffer, return its public-facing path/URL. */
  uploadVariant(key: string, buffer: Buffer | Uint8Array, contentType: string): Promise<string>;
  /** Delete a file by its stored path/key. */
  delete(path: string): Promise<void>;
  /** Get the public URL for a stored file path/key. */
  getUrl(path: string): string;
  /** Read a file from storage (for local serving). Returns null if not applicable. */
  read(path: string): Promise<Buffer | Uint8Array | null>;
  /** Whether files are served externally (S3/R2) or locally. */
  readonly isExternal: boolean;
}

class LocalStorage implements StorageBackend {
  readonly isExternal = false;
  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    await mkdir(this.dir, { recursive: true });
    const filePath = join(this.dir, key);
    await writeFile(filePath, buffer);
    return filePath;
  }

  async uploadVariant(key: string, buffer: Buffer): Promise<string> {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const variantsDir = join(this.dir, 'variants');
    await mkdir(variantsDir, { recursive: true });
    const filePath = join(variantsDir, key);
    await writeFile(filePath, buffer);
    return filePath;
  }

  async delete(path: string): Promise<void> {
    const { unlink } = await import('node:fs/promises');
    try {
      await unlink(path);
    } catch {
      // File may already be gone
    }
  }

  getUrl(path: string): string {
    // Convert absolute path to relative URL
    const relative = path.replace(this.dir, '').replace(/^[/\\]/, '');
    return `/uploads/${relative}`;
  }

  async read(path: string): Promise<Buffer | null> {
    const { readFile } = await import('node:fs/promises');
    try {
      return await readFile(path);
    } catch {
      return null;
    }
  }
}

class S3Storage implements StorageBackend {
  readonly isExternal = true;
  private bucket: string;
  private publicUrl: string;
  private clientPromise: Promise<S3Client>;

  constructor() {
    this.bucket = env.S3_BUCKET;
    this.publicUrl = env.S3_PUBLIC_URL.replace(/\/$/, '');

    if (!this.bucket) throw new Error('S3_BUCKET is required when MEDIA_STORAGE=s3');
    if (!this.publicUrl) throw new Error('S3_PUBLIC_URL is required when MEDIA_STORAGE=s3');
    if (!env.S3_ENDPOINT) throw new Error('S3_ENDPOINT is required when MEDIA_STORAGE=s3');

    // Lazy-load the S3 client
    this.clientPromise = this.createClient();
  }

  private async createClient() {
    const { S3Client: Client } = await import('@aws-sdk/client-s3');
    return new Client({
      region: env.S3_REGION || 'auto',
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    });
  }

  private async putObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.clientPromise;
    await client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
  }

  private async deleteObject(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.clientPromise;
    await client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const s3Key = `media/${key}`;
    await this.putObject(s3Key, buffer, contentType);
    return s3Key;
  }

  async uploadVariant(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const s3Key = `media/variants/${key}`;
    await this.putObject(s3Key, buffer, contentType);
    return s3Key;
  }

  async delete(path: string): Promise<void> {
    try {
      await this.deleteObject(path);
    } catch {
      // Object may already be gone
    }
  }

  getUrl(path: string): string {
    return `${this.publicUrl}/${path}`;
  }

  async read(): Promise<Buffer | null> {
    // S3 files are served directly via public URL, not through the app
    return null;
  }
}

// Re-export the S3Client type for use in the class
type S3Client = import('@aws-sdk/client-s3').S3Client;

/**
 * R2Storage uses Cloudflare R2 bindings directly (no S3 SDK needed).
 * The R2 bucket binding must be passed via initR2Storage().
 */
class R2Storage implements StorageBackend {
  readonly isExternal = true;
  private bucket: R2Bucket;
  private publicUrl: string;

  constructor(bucket: R2Bucket, publicUrl?: string) {
    this.bucket = bucket;
    this.publicUrl = (publicUrl || '').replace(/\/$/, '');
  }

  async upload(key: string, buffer: Buffer | Uint8Array, contentType: string): Promise<string> {
    const r2Key = `media/${key}`;
    await this.bucket.put(r2Key, buffer, { httpMetadata: { contentType } });
    return r2Key;
  }

  async uploadVariant(key: string, buffer: Buffer | Uint8Array, contentType: string): Promise<string> {
    const r2Key = `media/variants/${key}`;
    await this.bucket.put(r2Key, buffer, { httpMetadata: { contentType } });
    return r2Key;
  }

  async delete(path: string): Promise<void> {
    try {
      await this.bucket.delete(path);
    } catch {
      // Object may already be gone
    }
  }

  getUrl(path: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${path}`;
    }
    return `/media/${path}`;
  }

  async read(path: string): Promise<Uint8Array | null> {
    const obj = await this.bucket.get(path);
    if (!obj) return null;
    return new Uint8Array(await obj.arrayBuffer());
  }
}

// R2Bucket type from Workers runtime
type R2Bucket = {
  put(key: string, value: ArrayBuffer | Uint8Array | ReadableStream | string | Blob | null, options?: Record<string, unknown>): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string | string[]): Promise<void>;
};

let storage: StorageBackend | null = null;

export function getStorage(): StorageBackend {
  if (!storage) {
    storage = env.MEDIA_STORAGE === 's3'
      ? new S3Storage()
      : new LocalStorage(env.MEDIA_DIR);
  }
  return storage;
}

/** Initialize R2 storage from a Workers R2 bucket binding. */
export function initR2Storage(bucket: unknown, publicUrl?: string): void {
  storage = new R2Storage(bucket as R2Bucket, publicUrl);
}

/** Reset storage instance (for testing). */
export function resetStorage(): void {
  storage = null;
}

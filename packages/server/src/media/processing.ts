export type VariantPaths = Record<string, string>;

export interface ProcessedImage {
  width: number;
  height: number;
  metadata: Record<string, unknown>;
  variants: VariantResult[];
}

export interface VariantResult {
  name: string;
  buffer: Buffer;
  filename: string;
}

interface VariantConfig {
  name: string;
  width: number;
  height: number;
  fit: string;
}

const VARIANT_CONFIGS: VariantConfig[] = [
  { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
  { name: 'medium', width: 600, height: 600, fit: 'inside' },
  { name: 'large', width: 1200, height: 1200, fit: 'inside' },
];

/** Try to load sharp. Returns null if not available (e.g. Workers). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadSharp(): Promise<any | null> {
  try {
    const mod = await import('sharp');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

/**
 * Check if a MIME type is a processable image.
 */
export function isProcessableImage(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg');
}

/**
 * Process an image buffer: extract dimensions, generate WebP variant buffers.
 *
 * Returns the image metadata and variant buffers. The caller is responsible
 * for persisting the variants to the appropriate storage backend.
 *
 * Returns null if sharp is unavailable (e.g. on Workers) or if processing fails.
 */
export async function processImage(
  inputBuffer: Buffer,
  baseFilename: string,
): Promise<ProcessedImage | null> {
  const sharp = await loadSharp();
  if (!sharp) {
    console.warn('sharp not available — skipping image variant generation');
    return null;
  }

  const sharpInstance = sharp(inputBuffer);
  let sharpMeta: Record<string, unknown>;

  try {
    sharpMeta = await sharpInstance.metadata();
  } catch (err) {
    console.error('Sharp failed to read image metadata:', err);
    return null;
  }

  const width = (sharpMeta.width as number) ?? 0;
  const height = (sharpMeta.height as number) ?? 0;

  if (width === 0 || height === 0) {
    console.error('Image has zero dimensions, skipping variant generation');
    return null;
  }

  const metadata: Record<string, unknown> = {
    format: sharpMeta.format,
    space: sharpMeta.space,
    channels: sharpMeta.channels,
    depth: sharpMeta.depth,
    density: sharpMeta.density,
    hasAlpha: sharpMeta.hasAlpha,
  };

  const variants: VariantResult[] = [];

  for (const config of VARIANT_CONFIGS) {
    const variantFilename = `${baseFilename}-${config.name}.webp`;

    try {
      const buffer = await sharp(inputBuffer)
        .resize(config.width, config.height, { fit: config.fit, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      variants.push({ name: config.name, buffer, filename: variantFilename });
    } catch (err) {
      console.error(`Failed to generate ${config.name} variant:`, err);
    }
  }

  return { width, height, metadata, variants };
}

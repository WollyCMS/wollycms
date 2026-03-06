import sharp from 'sharp';
import { join, parse as parsePath } from 'node:path';
import { mkdir } from 'node:fs/promises';

export type VariantPaths = Record<string, string>;

export interface ProcessedImage {
  width: number;
  height: number;
  variants: VariantPaths;
  metadata: Record<string, unknown>;
}

interface VariantConfig {
  name: string;
  width: number;
  height: number;
  fit: keyof sharp.FitEnum;
}

const VARIANT_CONFIGS: VariantConfig[] = [
  { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
  { name: 'medium', width: 600, height: 600, fit: 'inside' },
  { name: 'large', width: 1200, height: 1200, fit: 'inside' },
];

/**
 * Check if a MIME type is a processable image.
 */
export function isProcessableImage(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg');
}

/**
 * Process an uploaded image: extract dimensions, generate WebP variants.
 *
 * Returns null for non-image files or if processing fails entirely.
 * Generates thumbnail (150x150 cover), medium (max 600px), large (max 1200px)
 * as WebP files saved alongside the original.
 */
export async function processImage(
  filePath: string,
  uploadDir: string,
): Promise<ProcessedImage | null> {
  const sharpInstance = sharp(filePath);
  let sharpMeta: sharp.Metadata;

  try {
    sharpMeta = await sharpInstance.metadata();
  } catch (err) {
    console.error('Sharp failed to read image metadata:', err);
    return null;
  }

  const width = sharpMeta.width ?? 0;
  const height = sharpMeta.height ?? 0;

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

  const { name: basename } = parsePath(filePath);
  const variantsDir = join(uploadDir, 'variants');
  await mkdir(variantsDir, { recursive: true });

  const variants: VariantPaths = {};

  for (const config of VARIANT_CONFIGS) {
    const variantFilename = `${basename}-${config.name}.webp`;
    const variantPath = join(variantsDir, variantFilename);

    try {
      await sharp(filePath)
        .resize(config.width, config.height, { fit: config.fit, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(variantPath);

      variants[config.name] = variantPath;
    } catch (err) {
      console.error(`Failed to generate ${config.name} variant:`, err);
      // Continue with other variants even if one fails
    }
  }

  return { width, height, variants, metadata };
}

/**
 * Client-side image compression utility.
 *
 * - Resize to maxSize×maxSize (centered crop)
 * - Output WebP, starting at quality 0.82
 * - If result > maxBytes: reduce quality by 0.05 steps
 * - Floor quality 0.50: throw if still too large
 * - Reject input > 10MB
 * - Accepts: JPG, PNG, WebP, HEIC, GIF (first frame)
 */

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB

export interface CompressOptions {
  /** Max width/height in px (default 400) */
  maxSize?: number;
  /** Max output size in bytes (default 150KB) */
  maxBytes?: number;
  /** Starting quality 0–1 (default 0.82) */
  startQuality?: number;
  /** Quality reduction step (default 0.05) */
  qualityStep?: number;
  /** Minimum quality before error (default 0.50) */
  minQuality?: number;
}

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageCompressionError";
  }
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<Blob> {
  const {
    maxSize = 400,
    maxBytes = 150 * 1024,
    startQuality = 0.82,
    qualityStep = 0.05,
    minQuality = 0.50,
  } = options;

  // ── Validate input ─────────────────────────────────────────────────────

  if (file.size > MAX_INPUT_SIZE) {
    throw new ImageCompressionError("L'image dépasse 10 Mo. Choisis une image plus légère.");
  }

  if (!ACCEPTED_TYPES.has(file.type) && !file.name.match(/\.(heic|heif)$/i)) {
    throw new ImageCompressionError("Format non supporté. Utilise JPG, PNG, WebP ou GIF.");
  }

  // ── Load image into canvas ─────────────────────────────────────────────

  const bitmap = await createImageBitmap(file);
  const { width: srcW, height: srcH } = bitmap;

  // Compute centered crop (square)
  const cropSize = Math.min(srcW, srcH);
  const cropX = Math.round((srcW - cropSize) / 2);
  const cropY = Math.round((srcH - cropSize) / 2);

  // Create output canvas at target size
  const canvas = new OffscreenCanvas(maxSize, maxSize);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageCompressionError("Impossible de traiter l'image.");

  // Draw cropped + resized
  ctx.drawImage(bitmap, cropX, cropY, cropSize, cropSize, 0, 0, maxSize, maxSize);
  bitmap.close();

  // ── Compress to WebP with quality reduction loop ───────────────────────

  let quality = startQuality;

  while (quality >= minQuality) {
    const blob = await canvas.convertToBlob({ type: "image/webp", quality });

    if (blob.size <= maxBytes) {
      return blob;
    }

    quality = Math.round((quality - qualityStep) * 100) / 100; // avoid float drift
  }

  // Last attempt at minimum quality
  const lastBlob = await canvas.convertToBlob({ type: "image/webp", quality: minQuality });
  if (lastBlob.size <= maxBytes) {
    return lastBlob;
  }

  throw new ImageCompressionError(
    "Impossible de compresser l'image sous 150 Ko. Choisis une image plus simple.",
  );
}

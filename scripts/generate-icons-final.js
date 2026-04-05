import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, '..', 'logo icon.png');
const ICONS_DIR = join(ROOT, 'public/icons');
const PUBLIC_DIR = join(ROOT, 'public');

const BG_COLOR = { r: 0, g: 0, b: 0, alpha: 1 };
const SCALE = 1.06;

const STANDARD_SIZES = [48, 72, 96, 144, 192, 512, 1024];
const APPLE_SIZES = [120, 152, 167, 180];
const FAVICON_SIZES = [16, 32];

async function generateIcon(sourceBuffer, size, outputPath) {
  const scaledSize = Math.round(size * SCALE);
  const resized = await sharp(sourceBuffer)
    .resize(scaledSize, scaledSize, { fit: 'cover' })
    .toBuffer();

  const offset = Math.round((scaledSize - size) / 2);

  await sharp(resized)
    .extract({ left: offset, top: offset, width: size, height: size })
    .flatten({ background: BG_COLOR })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`  ✓ ${size}x${size}`);
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  // Prepare square source
  const trimmed = await sharp(SOURCE).trim().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const maxDim = Math.max(meta.width, meta.height);

  const squareSource = await sharp(trimmed)
    .resize(maxDim, maxDim, { fit: 'contain', background: BG_COLOR })
    .flatten({ background: BG_COLOR })
    .toBuffer();

  console.log('Standard icons...');
  for (const size of STANDARD_SIZES) {
    await generateIcon(squareSource, size, join(ICONS_DIR, `icon-${size}x${size}.png`));
  }

  console.log('Apple Touch Icons...');
  for (const size of APPLE_SIZES) {
    await generateIcon(squareSource, size, join(ICONS_DIR, `apple-touch-icon-${size}x${size}.png`));
  }
  await generateIcon(squareSource, 180, join(PUBLIC_DIR, 'apple-touch-icon.png'));

  console.log('Favicons...');
  for (const size of FAVICON_SIZES) {
    await generateIcon(squareSource, size, join(ICONS_DIR, `favicon-${size}x${size}.png`));
  }

  console.log('Maskable icons...');
  await generateIcon(squareSource, 192, join(ICONS_DIR, 'icon-maskable-192x192.png'));
  await generateIcon(squareSource, 512, join(ICONS_DIR, 'icon-maskable-512x512.png'));

  console.log('\n✅ All production icons generated at 112% scale!');
}

main().catch(console.error);

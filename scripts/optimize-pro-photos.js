/**
 * Converts professional player PNGs to WebP (128x128) preserving transparency.
 * 128px is enough for 36px icons at 3x retina.
 *
 * - Reads all .png/.PNG from assets/fotos/profissionais/
 * - Outputs .webp with same base name to the same folder
 * - Updates pro-players.json references from .png/.PNG to .webp
 * - Removes original PNGs after successful conversion
 */

import sharp from 'sharp';
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, extname, basename } from 'path';

const DIR = join(import.meta.dirname, '..', 'assets', 'fotos', 'profissionais');
const JSON_PATH = join(import.meta.dirname, '..', 'data', 'pro-players.json');
const PUBLIC_DIR = join(import.meta.dirname, '..', 'public', 'assets', 'fotos', 'profissionais');
const SIZE = 128;

async function run() {
  const files = readdirSync(DIR).filter(f => /\.png$/i.test(f));
  console.log(`Found ${files.length} PNG files to convert.\n`);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const src = join(DIR, file);
    const name = basename(file, extname(file));
    const dest = join(DIR, `${name}.webp`);
    const publicDest = join(PUBLIC_DIR, `${name}.webp`);

    const input = readFileSync(src);
    totalBefore += input.length;

    const output = await sharp(input)
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85 })
      .toBuffer();

    totalAfter += output.length;

    writeFileSync(dest, output);
    writeFileSync(publicDest, output);

    const saved = ((1 - output.length / input.length) * 100).toFixed(1);
    console.log(`  ${file} (${(input.length / 1024).toFixed(0)}KB) → ${name}.webp (${(output.length / 1024).toFixed(1)}KB)  -${saved}%`);
  }

  // Update pro-players.json
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  for (const player of json) {
    player.foto = player.foto.replace(/\.png$/i, '.webp');
  }
  writeFileSync(JSON_PATH, JSON.stringify(json, null, 2) + '\n');

  // Also update public copy
  const publicJsonPath = join(import.meta.dirname, '..', 'public', 'data', 'pro-players.json');
  writeFileSync(publicJsonPath, JSON.stringify(json, null, 2) + '\n');

  // Remove original PNGs
  for (const file of files) {
    unlinkSync(join(DIR, file));
    // Also remove from public if exists
    try { unlinkSync(join(PUBLIC_DIR, file)); } catch {}
  }

  console.log(`\n✓ Done!`);
  console.log(`  Before: ${(totalBefore / 1024 / 1024).toFixed(1)}MB`);
  console.log(`  After:  ${(totalAfter / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Saved:  ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)}MB (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%)`);
  console.log(`  PNGs removed, pro-players.json updated.`);
}

run();

import { readdir, writeFile, mkdir } from 'fs/promises';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FOTOS_DIR = join(ROOT, 'assets', 'fotos');
const OUT = join(ROOT, 'data', 'gallery.json');

const CATEGORY_MAP = {
  campeoes: { label: 'Campeões', prefix: 'campeoes' },
  jogadores: { label: 'Jogadores', prefix: 'jogadores' },
  motm: { label: 'Man of the Match', prefix: 'motm' },
  premios: { label: 'Prêmios', prefix: 'premios' },
};

function parseDateFromFilename(filename, category) {
  // Pattern: "something DD-MM-YY.ext"
  const dateMatch = filename.match(/(\d{2})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, dd, mm, yy] = dateMatch;
    return {
      display: `${dd}/${mm}/20${yy}`,
      sort: `20${yy}-${mm}-${dd}`,
    };
  }
  // Pattern: "something YYYY.ext" (premios)
  const yearMatch = filename.match(/(\d{4})/);
  if (yearMatch) {
    return {
      display: yearMatch[1],
      sort: `${yearMatch[1]}-01-01`,
    };
  }
  return { display: '', sort: '0000-00-00' };
}

function titleFromFilename(filename, category) {
  const name = basename(filename, extname(filename));
  if (category === 'premios') {
    // Detect known awards
    const lower = name.toLowerCase();
    if (lower.includes('bola de ouro')) return 'Bola de Ouro 2025';
    if (lower.includes('chuteira de ouro') || lower.includes('chuteira de')) return 'Chuteira de Ouro 2025';
    if (lower.includes('luva de ouro') || lower.includes('luvo de ouro')) return 'Luva de Ouro 2025';
    // Fallback: take first ~40 chars
    const clean = name.replace(/[!'"]/g, '').trim();
    return clean.length > 40 ? clean.substring(0, 40) + '...' : clean;
  }
  const date = parseDateFromFilename(filename, category);
  const labels = {
    campeoes: 'Campeões da Semana',
    jogadores: 'Jogadores da Semana',
    motm: 'Man of the Match',
  };
  return `${labels[category] || category} - ${date.display}`;
}

async function main() {
  const fotos = [];

  for (const [dir, meta] of Object.entries(CATEGORY_MAP)) {
    const dirPath = join(FOTOS_DIR, dir);
    let files;
    try {
      files = await readdir(dirPath);
    } catch {
      console.log(`  Skipping ${dir} (directory not found)`);
      continue;
    }

    const imageFiles = files.filter(f =>
      /\.(jpe?g|png|webp|gif)$/i.test(f)
    );

    for (const file of imageFiles) {
      const date = parseDateFromFilename(file, dir);
      fotos.push({
        src: `assets/fotos/${dir}/${file}`,
        categoria: dir,
        categoriaLabel: meta.label,
        data: date.display,
        sortKey: date.sort,
        titulo: titleFromFilename(file, dir),
      });
    }

    console.log(`${meta.label}: ${imageFiles.length} photos`);
  }

  fotos.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  const result = {
    categorias: Object.entries(CATEGORY_MAP).map(([key, val]) => ({
      id: key,
      label: val.label,
    })),
    fotos,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\nWritten ${fotos.length} photos to ${OUT}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PARENT = join(ROOT, '..');
const OUT = join(ROOT, 'data', 'stats.json');

// --------------- helpers ---------------

/** Parse "DD/MM/YYYY" into ISO "YYYY-MM-DD". Returns null on failure. */
function parseDateHeader(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  return `${m[3]}-${mm}-${dd}`;
}

/**
 * Try to get a date string from an XLSX cell.
 * Handles: formatted text (cell.w), raw string (cell.v), or Excel serial number.
 */
function cellToDateISO(cell) {
  if (!cell) return null;

  // Try the formatted text first (cell.w is the display string)
  if (cell.w) {
    const iso = parseDateHeader(cell.w);
    if (iso) return iso;
  }

  // Try raw value as string
  if (typeof cell.v === 'string') {
    const iso = parseDateHeader(cell.v);
    if (iso) return iso;
  }

  // Try interpreting as Excel date serial number
  if (typeof cell.v === 'number' && cell.v > 40000 && cell.v < 60000) {
    // Use XLSX utility to convert serial to date
    const dateObj = XLSX.SSF.parse_date_code(cell.v);
    if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
      const yy = String(dateObj.y);
      const mm = String(dateObj.m).padStart(2, '0');
      const dd = String(dateObj.d).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    }
  }

  return null;
}

/** Treat "-", empty string, undefined, null as 0; otherwise Number(). */
function safeNum(v) {
  if (v == null || v === '' || v === '-') return 0;
  return Number(v) || 0;
}

// --------------- aggregated parsing (existing logic) ---------------

function parseSheetGeneric(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const range = XLSX.utils.decode_range(sheet['!ref']);

  const cellA1 = sheet[XLSX.utils.encode_cell({ r: 0, c: 0 })];
  const firstCellVal = cellA1 ? String(cellA1.v).trim() : '';

  if (firstCellVal === 'Jogador' || firstCellVal === 'JOGADOR') {
    return parseStandard(sheet, range);
  }

  const cellA3 = sheet[XLSX.utils.encode_cell({ r: 2, c: 0 })];
  if (cellA3 && String(cellA3.v).trim() === 'Jogador') {
    return parseWithHeaderOffset(sheet, range, 3);
  }

  return parseStandard(sheet, range);
}

function parseStandard(sheet, range) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]);
  const nameKey = keys[0];
  const totalKey = keys.find(k => /total/i.test(k)) || keys[1];

  return rows
    .filter(row => {
      const name = String(row[nameKey] || '').trim();
      const total = Number(row[totalKey]) || 0;
      return name && name !== '' && total > 0 && !/jogador/i.test(name);
    })
    .map(row => ({
      nome: String(row[nameKey]).trim(),
      total: Number(row[totalKey]) || 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function parseWithHeaderOffset(sheet, range, dataStartRow) {
  const players = [];
  for (let r = dataStartRow; r <= range.e.r; r++) {
    const nameCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    const totalCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
    if (!nameCell) continue;
    const name = String(nameCell.v).trim();
    const total = Number(totalCell?.v) || 0;
    if (name && total > 0) {
      players.push({ nome: name, total });
    }
  }
  return players.sort((a, b) => b.total - a.total);
}

function parsePresenca(workbook) {
  const sheet = workbook.Sheets['PRESENÇA'] || workbook.Sheets['PRESENCA'];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]);
  const nameKey = keys[0];
  const totalKey = keys.find(k => /total/i.test(k)) || keys[1];
  const matchdayCols = keys.filter(k => k !== nameKey && !/total/i.test(k));
  const maxMatchdays = matchdayCols.length;

  const players = rows
    .filter(row => {
      const name = String(row[nameKey] || '').trim();
      return name && name !== '';
    })
    .map(row => {
      let total = Number(row[totalKey]) || 0;
      if (total === 0) {
        for (const col of matchdayCols) {
          if (row[col] && row[col] !== 0 && row[col] !== '-') total++;
        }
      }
      return {
        nome: String(row[nameKey]).trim(),
        total,
        percentual: maxMatchdays > 0 ? Math.round((total / maxMatchdays) * 100) : 0,
      };
    })
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total);

  return players;
}

// --------------- per-date (timeseries) parsing ---------------

/**
 * Extract per-player per-date entries from a sheet.
 *
 * @param {object} sheet   – XLSX sheet object
 * @param {number} headerRow – row index that contains the date headers (DD/MM/YYYY)
 * @param {number} dataStartRow – first row of player data
 * @returns {{ [playerName: string]: Array<{date: string, value: number}> }}
 */
function extractTimeseries(sheet, headerRow, dataStartRow) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const result = {};

  // Collect date columns: col index -> ISO date string
  const dateCols = [];
  for (let c = 2; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (!cell) continue;
    const iso = cellToDateISO(cell);
    if (iso) dateCols.push({ c, date: iso });
  }

  // Iterate player rows
  for (let r = dataStartRow; r <= range.e.r; r++) {
    const nameCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    if (!nameCell) continue;
    const name = String(nameCell.v).trim();
    if (!name || /^jogador$/i.test(name)) continue;

    const entries = [];
    for (const { c, date } of dateCols) {
      const valCell = sheet[XLSX.utils.encode_cell({ r, c })];
      entries.push({ date, value: safeNum(valCell?.v) });
    }
    if (!result[name]) {
      result[name] = entries;
    } else {
      result[name] = result[name].concat(entries);
    }
  }

  return result;
}

/**
 * Determine header row and data start row for a given sheet, then extract timeseries.
 */
function parseSheetTimeseries(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return {};

  const range = XLSX.utils.decode_range(sheet['!ref']);

  const cellA1 = sheet[XLSX.utils.encode_cell({ r: 0, c: 0 })];
  const firstCellVal = cellA1 ? String(cellA1.v).trim() : '';

  if (firstCellVal === 'Jogador' || firstCellVal === 'JOGADOR') {
    return extractTimeseries(sheet, 0, 1);
  }

  const cellA3 = sheet[XLSX.utils.encode_cell({ r: 2, c: 0 })];
  if (cellA3 && String(cellA3.v).trim() === 'Jogador') {
    return extractTimeseries(sheet, 2, 3);
  }

  return extractTimeseries(sheet, 0, 1);
}

// --------------- main ---------------

async function main() {
  const files = [
    { path: join(PARENT, 'STATS FUT MENSAL - 2024.xlsx'), year: '2024' },
    { path: join(PARENT, 'STATS FUT MENSAL - 2025.xlsx'), year: '2025' },
    { path: join(PARENT, 'STATS 2026.xlsx'), year: '2026' },
  ];

  const stats = {};

  // Accumulate timeseries across years: { playerName: { gols: [], titulos: [], votos: [] } }
  const playerTimeseries = {};

  function mergeTimeseries(tsMap, category) {
    for (const [name, entries] of Object.entries(tsMap)) {
      if (!playerTimeseries[name]) {
        playerTimeseries[name] = { gols: [], titulos: [], votos: [] };
      }
      playerTimeseries[name][category] = playerTimeseries[name][category].concat(entries);
    }
  }

  for (const { path, year } of files) {
    console.log(`\nProcessing ${year}...`);
    const buf = await readFile(path);
    const wb = XLSX.read(buf, { type: 'buffer' });
    console.log(`  Sheets: ${wb.SheetNames.join(', ')}`);

    // Find sheets by name patterns
    const golsSheet = wb.SheetNames.find(s => /^GOLS$/i.test(s.trim()));
    const votosSheet =
      wb.SheetNames.find(s => /^VOTOS\s*-?\s*MOTM$/i.test(s.trim())) ||
      wb.SheetNames.find(s => /^VOTOS MOTM$/i.test(s.trim())) ||
      wb.SheetNames.find(s => /^VOTOS$/i.test(s.trim()));

    let titulosSheet;
    if (year === '2024') {
      titulosSheet = 'TÍTULOS';
    } else {
      titulosSheet = wb.SheetNames.find(s => /^T[ÍI]TULOS$/i.test(s.trim()));
    }

    // Aggregated data (existing)
    const yearData = {
      gols: golsSheet ? parseSheetGeneric(wb, golsSheet) : [],
      titulos: titulosSheet ? parseSheetGeneric(wb, titulosSheet) : [],
      votos: votosSheet ? parseSheetGeneric(wb, votosSheet) : [],
    };

    if (year === '2026') {
      yearData.presenca = parsePresenca(wb);
    }

    console.log(`  Gols: ${yearData.gols.length} players (sheet: ${golsSheet || 'N/A'})`);
    console.log(`  Titulos: ${yearData.titulos.length} players (sheet: ${titulosSheet || 'N/A'})`);
    console.log(`  Votos: ${yearData.votos.length} players (sheet: ${votosSheet || 'N/A'})`);
    if (yearData.presenca) {
      console.log(`  Presenca: ${yearData.presenca.length} players`);
    }

    if (yearData.gols.length) console.log(`    Top gols: ${yearData.gols.slice(0, 3).map(p => `${p.nome}(${p.total})`).join(', ')}`);
    if (yearData.titulos.length) console.log(`    Top titulos: ${yearData.titulos.slice(0, 3).map(p => `${p.nome}(${p.total})`).join(', ')}`);
    if (yearData.votos.length) console.log(`    Top votos: ${yearData.votos.slice(0, 3).map(p => `${p.nome}(${p.total})`).join(', ')}`);

    stats[year] = yearData;

    // Timeseries data
    if (golsSheet) mergeTimeseries(parseSheetTimeseries(wb, golsSheet), 'gols');
    if (titulosSheet) mergeTimeseries(parseSheetTimeseries(wb, titulosSheet), 'titulos');
    if (votosSheet) mergeTimeseries(parseSheetTimeseries(wb, votosSheet), 'votos');
  }

  // All Time aggregation (existing)
  const allTime = { gols: {}, titulos: {}, votos: {} };
  for (const year of ['2024', '2025', '2026']) {
    for (const cat of ['gols', 'titulos', 'votos']) {
      for (const p of stats[year][cat]) {
        if (!allTime[cat][p.nome]) allTime[cat][p.nome] = 0;
        allTime[cat][p.nome] += p.total;
      }
    }
  }

  stats.allTime = {};
  for (const cat of ['gols', 'titulos', 'votos']) {
    stats.allTime[cat] = Object.entries(allTime[cat])
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  }

  // Sort each player's timeseries chronologically and attach to stats
  for (const name of Object.keys(playerTimeseries)) {
    for (const cat of ['gols', 'titulos', 'votos']) {
      playerTimeseries[name][cat].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
  }
  stats.players = playerTimeseries;

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(stats, null, 2), 'utf-8');
  console.log(`\nWritten to ${OUT}`);
  console.log(`Players with timeseries: ${Object.keys(playerTimeseries).length}`);
  console.log(`\nAll Time Top 5:`);
  console.log(`  Gols: ${stats.allTime.gols.slice(0, 5).map(p => `${p.nome}(${p.total})`).join(', ')}`);
  console.log(`  Titulos: ${stats.allTime.titulos.slice(0, 5).map(p => `${p.nome}(${p.total})`).join(', ')}`);
  console.log(`  Votos: ${stats.allTime.votos.slice(0, 5).map(p => `${p.nome}(${p.total})`).join(', ')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

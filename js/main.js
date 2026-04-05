import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initUniformes } from './uniformes.js';
import { initGaleria } from './galeria.js';
import { initEstatisticas, renderAllYears } from './estatisticas.js';
import { initScrollReveal } from './animations.js';
import { initPatrocinadores } from './patrocinadores.js';
import { initReguaGols } from './regua-gols.js';
import { initInstallBanner } from './install-banner.js';

async function loadJSON(path) {
  try {
    const res = await fetch(path);
    return await res.json();
  } catch {
    console.warn(`Failed to load ${path}`);
    return null;
  }
}

async function init() {
  // Load data
  const [statsData, galleryData, proPlayersData] = await Promise.all([
    loadJSON('./data/stats.json'),
    loadJSON('./data/gallery.json'),
    loadJSON('./data/pro-players.json'),
  ]);

  // Init modules
  initNav();
  initHero();
  initPatrocinadores();
  initUniformes();
  initGaleria(galleryData);

  if (statsData) {
    renderAllYears(statsData);
    initEstatisticas(statsData, proPlayersData);
  }

  if (proPlayersData) {
    initReguaGols(proPlayersData);
  }

  initScrollReveal();
  initInstallBanner();
}

document.addEventListener('DOMContentLoaded', init);

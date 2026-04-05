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

async function initStatsLazy() {
  const [statsData, proPlayersData] = await Promise.all([
    loadJSON('./data/stats.json'),
    loadJSON('./data/pro-players.json'),
  ]);

  if (statsData) {
    renderAllYears(statsData);
    initEstatisticas(statsData, proPlayersData);
  }

  if (proPlayersData) {
    initReguaGols(proPlayersData);
  }
}

async function init() {
  // Load only lightweight data eagerly
  const galleryData = await loadJSON('./data/gallery.json');

  // Init modules
  initNav();
  initHero();
  initPatrocinadores();
  initUniformes();
  initGaleria(galleryData);

  // Lazy-load stats when section approaches viewport
  const statsSection = document.getElementById('estatisticas');
  if (statsSection) {
    let statsLoaded = false;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !statsLoaded) {
        statsLoaded = true;
        observer.disconnect();
        initStatsLazy();
      }
    }, { rootMargin: '400px' });
    observer.observe(statsSection);
  }

  initScrollReveal();
  initInstallBanner();
}

document.addEventListener('DOMContentLoaded', init);

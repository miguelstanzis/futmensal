import Chart from 'chart.js/auto';

let chartInstances = {};

export function initEstatisticas(statsData) {
  if (!statsData) return;

  initTabs(statsData);
  renderYear(statsData, '2026');
  initBarAnimations();
  initPlayerLookup(statsData);
}

function initTabs(data) {
  const tabs = document.querySelectorAll('#estatisticas .tab');
  const contents = document.querySelectorAll('.estatisticas__content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const year = tab.dataset.year;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      contents.forEach(c => {
        c.classList.remove('active');
        if (c.dataset.year === year) {
          c.classList.add('active');
          animateBars(c);
          animateCounters(c);
        }
      });
    });
  });
}

function renderYear(data, year) {
  const yearData = data[year];
  if (!yearData) return;

  renderBarChart(`#stats-gols-${year}`, yearData.gols, 'gols', 10);
  renderBarChart(`#stats-titulos-${year}`, yearData.titulos, 'titulos', 10);
  renderBarChart(`#stats-votos-${year}`, yearData.votos, 'votos', 10);

  if (yearData.presenca?.length) {
    renderBarChart(`#stats-presenca-${year}`, yearData.presenca, 'presenca', 10);
  }

  const summaryEl = document.querySelector(`#stats-summary-${year}`);
  if (summaryEl && yearData.gols.length) {
    const totalGols = yearData.gols.reduce((s, p) => s + p.total, 0);
    const totalPlayers = new Set([
      ...yearData.gols.map(p => p.nome.toLowerCase()),
      ...yearData.titulos.map(p => p.nome.toLowerCase()),
      ...yearData.votos.map(p => p.nome.toLowerCase()),
    ]).size;
    const topScorer = yearData.gols[0];
    const topVoted = yearData.votos[0];

    summaryEl.innerHTML = `
      <div class="summary-card">
        <div class="summary-card__value count-up" data-target="${totalGols}">0</div>
        <div class="summary-card__label">Total de Gols</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__value count-up" data-target="${totalPlayers}">0</div>
        <div class="summary-card__label">Jogadores</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__value summary-card__value--name">${topScorer?.nome || '-'}</div>
        <div class="summary-card__label">Artilheiro (${topScorer?.total || 0} gols)</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__value summary-card__value--name">${topVoted?.nome || '-'}</div>
        <div class="summary-card__label">Craque (${topVoted?.total || 0} votos)</div>
      </div>
    `;
  }
}

function renderBarChart(selector, players, type, max) {
  const container = document.querySelector(selector);
  if (!container || !players.length) return;

  const top = players.slice(0, max);
  const maxVal = top[0]?.total || 1;

  container.innerHTML = top.map((p, i) => {
    const pct = Math.max((p.total / maxVal) * 100, 8);
    return `
      <div class="bar-item">
        <span class="bar-item__rank ${i < 3 ? 'bar-item__rank--top' : ''}">${i + 1}</span>
        <div class="bar-item__bar-container">
          <div class="bar-item__bar bar-item__bar--${type}" data-width="${pct}%">
            <span class="bar-item__name">${p.nome}</span>
          </div>
        </div>
        <span class="bar-item__value count-up" data-target="${p.total}">0</span>
      </div>
    `;
  }).join('');
}

function animateBars(container) {
  if (!container) return;
  const bars = container.querySelectorAll('.bar-item__bar');
  bars.forEach((bar, i) => {
    bar.style.width = '0';
    setTimeout(() => {
      bar.style.width = bar.dataset.width;
    }, 100 + i * 60);
  });
}

function animateCounters(container) {
  if (!container) return;
  const counters = container.querySelectorAll('.count-up[data-target]');
  counters.forEach(el => {
    const target = parseInt(el.dataset.target);
    if (isNaN(target)) return;
    const duration = 1000;
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function initBarAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateBars(entry.target);
        animateCounters(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.estatisticas__content').forEach(el => {
    observer.observe(el);
  });
}

export function renderAllYears(data) {
  for (const year of ['2024', '2025', '2026', 'allTime']) {
    if (data[year]) {
      renderYear(data, year);
    }
  }
}

// ===== PLAYER LOOKUP & COMPARE =====

function mergePlayers(rawPlayers) {
  // Merge entries that differ only in casing (e.g. "Bruno Dias" + "Bruno dias")
  const merged = {};
  const canonicalNames = {};

  for (const [name, data] of Object.entries(rawPlayers)) {
    const key = name.toLowerCase();
    if (!merged[key]) {
      merged[key] = { gols: [], titulos: [], votos: [] };
      canonicalNames[key] = name; // keep first-seen casing
    }
    // Prefer the capitalised version as canonical
    if (name[0] === name[0].toUpperCase() && name.length > canonicalNames[key].length) {
      canonicalNames[key] = name;
    }
    for (const cat of ['gols', 'titulos', 'votos']) {
      if (data[cat]) merged[key][cat].push(...data[cat]);
    }
  }

  // Sort entries by date within each category
  const result = {};
  for (const [key, data] of Object.entries(merged)) {
    const name = canonicalNames[key];
    result[name] = {};
    for (const cat of ['gols', 'titulos', 'votos']) {
      result[name][cat] = data[cat].sort((a, b) => a.date.localeCompare(b.date));
    }
  }
  return result;
}

function initPlayerLookup(statsData) {
  const rawPlayers = statsData.players;
  if (!rawPlayers) return;

  const players = mergePlayers(rawPlayers);

  const input1 = document.getElementById('player-input-1');
  const input2 = document.getElementById('player-input-2');
  const dropdown1 = document.getElementById('dropdown-1');
  const dropdown2 = document.getElementById('dropdown-2');
  const results = document.querySelector('.player-lookup__results');
  const cardsContainer = document.querySelector('.player-cards');
  const chartsContainer = document.querySelector('.player-lookup__charts');
  const granularityBtns = document.querySelectorAll('.player-lookup__granularity .filter-pill');

  if (!input1 || !results) return;

  const playerNames = Object.keys(players).sort();

  let currentPlayer1 = null;
  let currentPlayer2 = null;
  let currentGranularity = 'allTime';

  function findPlayer(val) {
    if (!val) return null;
    const lower = val.toLowerCase();
    const exact = playerNames.find(n => n.toLowerCase() === lower);
    if (exact) return exact;
    if (val.length >= 2) {
      const partial = playerNames.find(n => n.toLowerCase().startsWith(lower));
      if (partial) return partial;
    }
    return null;
  }

  function filterNames(query) {
    if (!query || query.length < 1) return [];
    const lower = query.toLowerCase();
    return playerNames.filter(n => n.toLowerCase().includes(lower)).slice(0, 8);
  }

  function highlightMatch(name, query) {
    const lower = name.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return name;
    return name.substring(0, idx) + '<mark>' + name.substring(idx, idx + query.length) + '</mark>' + name.substring(idx + query.length);
  }

  function showDropdown(dropdown, matches, query, onSelect) {
    if (!matches.length) {
      dropdown.classList.remove('open');
      return;
    }
    dropdown.innerHTML = matches.map(name =>
      `<div class="player-lookup__dropdown-item" data-name="${name}">${highlightMatch(name, query)}</div>`
    ).join('');
    dropdown.classList.add('open');

    dropdown.querySelectorAll('.player-lookup__dropdown-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent input blur
        onSelect(item.dataset.name);
        dropdown.classList.remove('open');
      });
    });
  }

  function setupAutocomplete(input, dropdown, onSelect) {
    input.addEventListener('input', () => {
      const val = input.value.trim();
      const matches = filterNames(val);
      showDropdown(dropdown, matches, val, (name) => {
        input.value = name;
        onSelect(name);
      });
      // Also try to find and select player
      const found = findPlayer(val);
      if (found) onSelect(found);
    });

    input.addEventListener('focus', () => {
      const val = input.value.trim();
      if (val.length >= 1) {
        const matches = filterNames(val);
        showDropdown(dropdown, matches, val, (name) => {
          input.value = name;
          onSelect(name);
        });
      }
    });

    input.addEventListener('blur', () => {
      // Delay to allow click on dropdown item
      setTimeout(() => dropdown.classList.remove('open'), 150);
    });
  }

  function update() {
    if (!currentPlayer1) {
      results.style.display = 'none';
      return;
    }

    results.style.display = '';
    const isCompare = !!currentPlayer2;
    const isAllTime = currentGranularity === 'allTime';

    renderPlayerCards(cardsContainer, players, currentPlayer1, currentPlayer2, isCompare);

    if (isAllTime) {
      chartsContainer.style.display = 'none';
    } else {
      chartsContainer.style.display = '';
      renderLookupCharts(players, currentPlayer1, currentPlayer2, currentGranularity);
    }
  }

  setupAutocomplete(input1, dropdown1, (name) => {
    currentPlayer1 = name;
    update();
  });

  setupAutocomplete(input2, dropdown2, (name) => {
    currentPlayer2 = name;
    update();
  });

  // Granularity buttons
  granularityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      granularityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGranularity = btn.dataset.granularity;
      update();
    });
  });
}

function getPlayerTotals(playerData) {
  const sum = arr => (arr || []).reduce((s, e) => s + e.value, 0);
  return {
    gols: sum(playerData.gols),
    titulos: sum(playerData.titulos),
    votos: sum(playerData.votos),
  };
}

function renderPlayerCards(container, allPlayers, name1, name2, isCompare) {
  const p1 = allPlayers[name1];
  const totals1 = getPlayerTotals(p1);

  container.className = isCompare ? 'player-cards player-cards--compare' : 'player-cards';

  if (!isCompare) {
    container.innerHTML = buildPlayerCard(name1, totals1);
  } else {
    const p2 = allPlayers[name2];
    const totals2 = getPlayerTotals(p2);
    const maxVals = {
      gols: Math.max(totals1.gols, totals2.gols) || 1,
      titulos: Math.max(totals1.titulos, totals2.titulos) || 1,
      votos: Math.max(totals1.votos, totals2.votos) || 1,
    };

    container.innerHTML =
      buildPlayerCard(name1, totals1, maxVals) +
      buildPlayerCard(name2, totals2, maxVals);
  }

  // Animate compare bars after render
  requestAnimationFrame(() => {
    container.querySelectorAll('.compare-bar__fill').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.width; }, 100);
    });
  });
}

function buildPlayerCard(name, totals, maxVals) {
  const barsHtml = maxVals ? `
    <div class="player-card__compare-bars">
      ${buildCompareBar('Gols', totals.gols, maxVals.gols, 'pink')}
      ${buildCompareBar('Titulos', totals.titulos, maxVals.titulos, 'gold')}
      ${buildCompareBar('MOTM', totals.votos, maxVals.votos, 'cyan')}
    </div>
  ` : '';

  return `
    <div class="player-card">
      <div class="player-card__name">${name}</div>
      <div class="player-card__stats">
        <div class="player-stat">
          <div class="player-stat__value player-stat__value--pink">${totals.gols}</div>
          <div class="player-stat__label">Gols</div>
        </div>
        <div class="player-stat">
          <div class="player-stat__value player-stat__value--gold">${totals.titulos}</div>
          <div class="player-stat__label">Títulos</div>
        </div>
        <div class="player-stat">
          <div class="player-stat__value player-stat__value--cyan">${totals.votos}</div>
          <div class="player-stat__label">MOTM</div>
        </div>
      </div>
      ${barsHtml}
    </div>
  `;
}

function buildCompareBar(label, value, maxValue, color) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const isWinner = value === maxValue && value > 0;
  return `
    <div class="compare-bar">
      <span class="compare-bar__label">${label}</span>
      <div class="compare-bar__track">
        <div class="compare-bar__fill compare-bar__fill--${color}" data-width="${pct}%"></div>
      </div>
      <span class="compare-bar__value ${isWinner ? 'compare-bar__value--winner' : ''}">${value}</span>
    </div>
  `;
}

function renderLookupCharts(allPlayers, name1, name2, granularity) {
  const categories = ['gols', 'titulos', 'votos'];
  const colors = {
    gols: { border: '#e91e8c', bg: 'rgba(233, 30, 140, 0.15)' },
    titulos: { border: '#f5a623', bg: 'rgba(245, 166, 35, 0.15)' },
    votos: { border: '#4ecde6', bg: 'rgba(78, 205, 230, 0.15)' },
  };
  const colors2 = {
    gols: { border: '#f74dab', bg: 'rgba(247, 77, 171, 0.1)' },
    titulos: { border: '#ffd700', bg: 'rgba(255, 215, 0, 0.1)' },
    votos: { border: '#7eddf0', bg: 'rgba(126, 221, 240, 0.1)' },
  };

  const p1 = allPlayers[name1];
  const p2 = name2 ? allPlayers[name2] : null;

  categories.forEach(cat => {
    const canvasId = `chart-${cat}`;
    const raw1 = p1[cat] || [];
    const agg1 = aggregateData(raw1, granularity);

    const datasets = [{
      label: name1,
      data: agg1.map(d => d.value),
      borderColor: colors[cat].border,
      backgroundColor: colors[cat].bg,
      borderWidth: 2,
      fill: !p2,
      tension: 0.3,
      pointRadius: granularity === 'day' ? 2 : 4,
      pointBackgroundColor: colors[cat].border,
      pointHoverRadius: 6,
    }];

    let labels = agg1.map(d => d.label);

    if (p2) {
      const raw2 = p2[cat] || [];
      const agg2 = aggregateData(raw2, granularity);

      // Merge labels from both players
      const allLabels = new Set([...agg1.map(d => d.label), ...agg2.map(d => d.label)]);
      labels = [...allLabels].sort();

      const map1 = Object.fromEntries(agg1.map(d => [d.label, d.value]));
      const map2 = Object.fromEntries(agg2.map(d => [d.label, d.value]));

      datasets[0].data = labels.map(l => map1[l] ?? null);
      datasets[0].fill = false;
      datasets[0].spanGaps = true;

      datasets.push({
        label: name2,
        data: labels.map(l => map2[l] ?? null),
        borderColor: colors2[cat].border,
        backgroundColor: colors2[cat].bg,
        borderWidth: 2,
        borderDash: [6, 3],
        fill: false,
        tension: 0.3,
        pointRadius: granularity === 'day' ? 2 : 4,
        pointBackgroundColor: colors2[cat].border,
        pointHoverRadius: 6,
        spanGaps: true,
      });
    }

    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: !!p2,
            labels: {
              color: '#8b8fa3',
              font: { family: 'Outfit', size: 11 },
              boxWidth: 12,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(10, 14, 26, 0.92)',
            titleColor: '#f0f0f5',
            bodyColor: '#f0f0f5',
            borderColor: colors[cat].border,
            borderWidth: 1,
            padding: 10,
            titleFont: { family: 'Outfit' },
            bodyFont: { family: 'JetBrains Mono' },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#555a6e',
              font: { family: 'Outfit', size: 10 },
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: granularity === 'day' ? 15 : 20,
            },
            grid: { color: 'rgba(255,255,255,0.03)' },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#555a6e',
              font: { family: 'JetBrains Mono', size: 11 },
              stepSize: 1,
            },
            grid: { color: 'rgba(255,255,255,0.03)' },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    });
  });
}

function aggregateData(entries, granularity) {
  if (!entries.length) return [];

  if (granularity === 'day') {
    return entries.map(e => ({
      label: formatDate(e.date, 'day'),
      value: e.value,
    }));
  }

  if (granularity === 'month') {
    const grouped = {};
    entries.forEach(e => {
      const key = e.date.substring(0, 7);
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += e.value;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        label: formatDate(key + '-01', 'month'),
        value,
      }));
  }

  if (granularity === 'year') {
    const grouped = {};
    entries.forEach(e => {
      const key = e.date.substring(0, 4);
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += e.value;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        label: key,
        value,
      }));
  }

  if (granularity === 'allTime') {
    const total = entries.reduce((s, e) => s + e.value, 0);
    return [{ label: 'Total', value: total }];
  }

  return [];
}

function formatDate(isoDate, granularity) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const parts = isoDate.split('-');
  const y = parts[0];
  const m = parseInt(parts[1]) - 1;
  const d = parts[2];

  if (granularity === 'day') {
    return `${d}/${String(m + 1).padStart(2, '0')}`;
  }
  if (granularity === 'month') {
    return `${months[m]}/${y.slice(2)}`;
  }
  return y;
}

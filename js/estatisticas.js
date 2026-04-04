import Chart from 'chart.js/auto';

let chartInstances = {};

export function initEstatisticas(statsData) {
  if (!statsData) return;

  initTabs(statsData);
  // Show All Time by default
  renderYear(statsData, 'allTime');
  initBarAnimations();
  initPlayerLookup(statsData);

  // Blur current year stats to hide prize data
  const currentYear = String(new Date().getFullYear());
  const currentYearContent = document.querySelector(
    `.estatisticas__content[data-year="${currentYear}"]`
  );
  if (currentYearContent) {
    currentYearContent.classList.add('estatisticas__content--blurred');
    const overlay = document.createElement('div');
    overlay.className = 'blur-overlay';
    overlay.innerHTML = `
      <div class="blur-overlay__message">
        <div class="blur-overlay__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="32" height="32"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <div class="blur-overlay__title">Dados em sigilo</div>
        <div class="blur-overlay__text">
          As estatísticas de ${currentYear} serão reveladas na premiação de fim de ano.
        </div>
      </div>
    `;
    currentYearContent.appendChild(overlay);
  }
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
  const years = Object.keys(data).filter(k => /^\d{4}$/.test(k)).sort();
  for (const year of [...years, 'allTime']) {
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
  const clearBtn1 = document.getElementById('clear-player-1');
  const clearBtn2 = document.getElementById('clear-player-2');
  const results = document.querySelector('.player-lookup__results');
  const cardsContainer = document.querySelector('.player-cards');
  const chartsContainer = document.querySelector('.player-lookup__charts');
  const chartModeFloat = document.getElementById('chart-mode-float');
  const inlineControls = document.getElementById('chart-controls-inline');

  // Collect ALL granularity and mode buttons (inline + float)
  const allGranularityBtns = document.querySelectorAll('[data-granularity]');
  const allModeBtns = document.querySelectorAll('[data-mode]');
  const monthPickerFrom = document.getElementById('month-picker-from');
  const monthPickerTo = document.getElementById('month-picker-to');
  const dateFromYear = document.getElementById('date-from-year');
  const dateToYear = document.getElementById('date-to-year');
  const dateClear = document.getElementById('date-clear');

  if (!input1 || !results) return;

  const playerNames = Object.keys(players).sort();

  // Detect date range and populate options
  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  let minDate = '9999', maxDate = '0000';
  for (const p of Object.values(players)) {
    for (const cat of ['gols', 'titulos', 'votos']) {
      for (const e of (p[cat] || [])) {
        if (e.date < minDate) minDate = e.date;
        if (e.date > maxDate) maxDate = e.date;
      }
    }
  }

  // Month picker state
  const monthPickerState = { from: '', to: '' };

  function initMonthPicker(container, key) {
    if (!container) return;
    const trigger = container.querySelector('.month-picker__trigger');
    const dropdown = container.querySelector('.month-picker__dropdown');

    // Populate grid
    dropdown.innerHTML = MONTH_NAMES.map((m, i) => {
      const val = String(i + 1).padStart(2, '0');
      return `<button class="month-picker__item" type="button" data-value="${val}">${m}</button>`;
    }).join('');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close any other open picker
      document.querySelectorAll('.month-picker.open').forEach(p => {
        if (p !== container) p.classList.remove('open');
      });
      container.classList.toggle('open');
    });

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.month-picker__item');
      if (!item) return;
      const val = item.dataset.value;
      // Toggle: clicking same month deselects
      if (monthPickerState[key] === val) {
        monthPickerState[key] = '';
        trigger.textContent = '--';
        trigger.classList.remove('has-value');
        dropdown.querySelectorAll('.month-picker__item').forEach(i => i.classList.remove('active'));
      } else {
        monthPickerState[key] = val;
        trigger.textContent = MONTH_NAMES[parseInt(val) - 1];
        trigger.classList.add('has-value');
        dropdown.querySelectorAll('.month-picker__item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      }
      container.classList.remove('open');
      update();
    });
  }

  initMonthPicker(monthPickerFrom, 'from');
  initMonthPicker(monthPickerTo, 'to');

  // Close month pickers on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.month-picker.open').forEach(p => p.classList.remove('open'));
  });

  // Populate year selects
  if (minDate !== '9999') {
    const minYear = parseInt(minDate.substring(0, 4));
    const maxYear = parseInt(maxDate.substring(0, 4));
    const yearOptions = [];
    for (let y = minYear; y <= maxYear; y++) {
      yearOptions.push(`<option value="${y}">${y}</option>`);
    }
    const yearHtml = yearOptions.join('');
    [dateFromYear, dateToYear].forEach(s => { s.innerHTML = '<option value="" hidden>--</option>' + yearHtml; });
  }

  let currentPlayer1 = null;
  let currentPlayer2 = null;
  let currentGranularity = 'month';
  let currentMode = 'individual';

  function normalize(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function findPlayer(val) {
    if (!val) return null;
    const norm = normalize(val);
    const exact = playerNames.find(n => normalize(n) === norm);
    if (exact) return exact;
    if (val.length >= 2) {
      const partial = playerNames.find(n => normalize(n).startsWith(norm));
      if (partial) return partial;
    }
    return null;
  }

  function filterNames(query) {
    if (!query || query.length < 1) return [];
    const norm = normalize(query);
    return playerNames.filter(n => normalize(n).includes(norm)).slice(0, 8);
  }

  function highlightMatch(name, query) {
    const normName = normalize(name);
    const normQuery = normalize(query);
    const idx = normName.indexOf(normQuery);
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

  function getDateRange() {
    const fy = dateFromYear?.value;
    const fm = monthPickerState.from;
    const ty = dateToYear?.value;
    const tm = monthPickerState.to;
    const from = fy ? `${fy}-${fm || '01'}` : null;
    const to = ty ? `${ty}-${tm || '12'}` : null;
    return { from, to };
  }

  function update() {
    if (!currentPlayer1) {
      results.style.display = 'none';
      if (chartModeFloat) chartModeFloat.classList.remove('visible');
      return;
    }

    results.style.display = '';
    const isCompare = !!currentPlayer2;
    const range = getDateRange();

    renderPlayerCards(cardsContainer, players, currentPlayer1, currentPlayer2, isCompare, range);
    chartsContainer.style.display = '';
    renderLookupCharts(players, currentPlayer1, currentPlayer2, currentGranularity, currentMode === 'cumulative', range);
  }

  setupAutocomplete(input1, dropdown1, (name) => {
    currentPlayer1 = name;
    update();
  });

  setupAutocomplete(input2, dropdown2, (name) => {
    currentPlayer2 = name;
    update();
  });

  // Clear player buttons
  if (clearBtn1) clearBtn1.addEventListener('click', () => {
    input1.value = '';
    currentPlayer1 = null;
    update();
  });
  if (clearBtn2) clearBtn2.addEventListener('click', () => {
    input2.value = '';
    currentPlayer2 = null;
    update();
  });

  // Sync all granularity/mode buttons across inline, float, and top bar
  function syncGranularity() {
    allGranularityBtns.forEach(b => b.classList.toggle('active', b.dataset.granularity === currentGranularity));
  }
  function syncMode() {
    allModeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === currentMode));
  }
  syncGranularity();
  syncMode();

  function syncAll() { syncGranularity(); syncMode(); }

  // Granularity buttons (all instances)
  allGranularityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentGranularity = btn.dataset.granularity;
      syncAll();
      update();
    });
  });

  // Mode buttons (all instances)
  allModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.mode;
      syncAll();
      update();
    });
  });

  // Date range year selects
  [dateFromYear, dateToYear].forEach(el => {
    if (el) el.addEventListener('change', () => {
      el.style.color = el.value ? 'var(--text-primary)' : '';
      update();
    });
  });


  // Clear date range
  if (dateClear) dateClear.addEventListener('click', () => {
    [dateFromYear, dateToYear].forEach(el => { el.value = ''; el.style.color = ''; });
    monthPickerState.from = '';
    monthPickerState.to = '';
    document.querySelectorAll('.month-picker__trigger').forEach(t => {
      t.textContent = '--';
      t.classList.remove('has-value');
    });
    document.querySelectorAll('.month-picker__item.active').forEach(i => i.classList.remove('active'));
    update();
  });

  // Show floating bar only when charts visible but inline controls scrolled out
  if (chartModeFloat && chartsContainer && inlineControls) {
    let chartsInView = false;
    let inlineInView = false;

    const chartsObs = new IntersectionObserver(([e]) => {
      chartsInView = e.isIntersecting;
      updateFloat();
    }, { threshold: 0.05 });

    const inlineObs = new IntersectionObserver(([e]) => {
      inlineInView = e.isIntersecting;
      updateFloat();
    }, { threshold: 0.1 });

    function updateFloat() {
      const show = chartsInView && !inlineInView && currentPlayer1;
      chartModeFloat.classList.toggle('visible', !!show);
    }

    chartsObs.observe(chartsContainer);
    inlineObs.observe(inlineControls);
  }
}

const CURRENT_YEAR = String(new Date().getFullYear());

function filterByRange(entries, range) {
  if (!range) return entries;
  const from = range.from ? range.from + '-01' : null;
  // Last day of the "to" month: use first day of next month
  const to = range.to ? nextMonth(range.to) : null;
  return entries.filter(e => {
    if (from && e.date < from) return false;
    if (to && e.date >= to) return false;
    return true;
  });
}

function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  if (m === 12) return `${y + 1}-01-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

function getPlayerTotals(playerData, excludeYear, range) {
  const sum = arr => filterByRange(
    (arr || []).filter(e => !excludeYear || !e.date.startsWith(excludeYear)),
    range
  ).reduce((s, e) => s + e.value, 0);
  return {
    gols: sum(playerData.gols),
    titulos: sum(playerData.titulos),
    votos: sum(playerData.votos),
  };
}

function renderPlayerCards(container, allPlayers, name1, name2, isCompare, range) {
  const p1 = allPlayers[name1];
  const totals1 = getPlayerTotals(p1, CURRENT_YEAR, range);

  container.className = isCompare ? 'player-cards player-cards--compare' : 'player-cards';

  if (!isCompare) {
    container.innerHTML = buildPlayerCard(name1, totals1);
  } else {
    const p2 = allPlayers[name2];
    const totals2 = getPlayerTotals(p2, CURRENT_YEAR, range);
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

function toCumulative(data) {
  let sum = 0;
  return data.map(d => ({ label: d.label, sortKey: d.sortKey, value: (sum += d.value) }));
}

function fillCumulative(labels, valueMap) {
  let last = null;
  return labels.map(l => {
    if (valueMap[l] != null) last = valueMap[l];
    return last;
  });
}

function renderLookupCharts(allPlayers, name1, name2, granularity, cumulative, range) {
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
    const raw1 = filterByRange((p1[cat] || []).filter(e => !e.date.startsWith(CURRENT_YEAR)), range);
    const agg1Raw = aggregateData(raw1, granularity);
    const agg1 = cumulative ? toCumulative(agg1Raw) : agg1Raw;

    const numPoints = agg1.length;
    const showPoints = numPoints <= 15;

    const datasets = [{
      label: name1,
      data: agg1.map(d => d.value),
      borderColor: colors[cat].border,
      backgroundColor: colors[cat].bg,
      borderWidth: 2,
      fill: cumulative || !p2,
      tension: 0.3,
      pointRadius: showPoints ? 4 : 0,
      pointHoverRadius: showPoints ? 6 : 4,
      pointBackgroundColor: colors[cat].border,
    }];

    let labels = agg1.map(d => d.label);

    if (p2) {
      const raw2 = filterByRange((p2[cat] || []).filter(e => !e.date.startsWith(CURRENT_YEAR)), range);
      const agg2Raw = aggregateData(raw2, granularity);
      const agg2 = cumulative ? toCumulative(agg2Raw) : agg2Raw;

      // Merge labels from both players, sorted chronologically by sortKey
      const labelMap = new Map();
      for (const d of [...agg1, ...agg2]) {
        if (!labelMap.has(d.sortKey)) labelMap.set(d.sortKey, d.label);
      }
      const sortedKeys = [...labelMap.keys()].sort();
      labels = sortedKeys.map(k => labelMap.get(k));

      const map1 = Object.fromEntries(agg1.map(d => [d.sortKey, d.value]));
      const map2 = Object.fromEntries(agg2.map(d => [d.sortKey, d.value]));

      datasets[0].data = cumulative
        ? fillCumulative(sortedKeys, map1)
        : sortedKeys.map(k => map1[k] ?? null);
      datasets[0].fill = false;
      datasets[0].spanGaps = true;

      const mergedPoints = sortedKeys.length;
      const showMergedPoints = mergedPoints <= 15;
      // Update player 1 points for merged count
      datasets[0].pointRadius = showMergedPoints ? 4 : 0;
      datasets[0].pointHoverRadius = showMergedPoints ? 6 : 4;

      datasets.push({
        label: name2,
        data: cumulative
          ? fillCumulative(sortedKeys, map2)
          : sortedKeys.map(k => map2[k] ?? null),
        borderColor: colors2[cat].border,
        backgroundColor: colors2[cat].bg,
        borderWidth: 2,
        borderDash: [6, 3],
        fill: false,
        tension: 0.3,
        pointRadius: showMergedPoints ? 4 : 0,
        pointHoverRadius: showMergedPoints ? 6 : 4,
        pointBackgroundColor: colors2[cat].border,
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
              ...(cumulative ? {} : { stepSize: 1 }),
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
      sortKey: e.date,
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
        sortKey: key,
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
        sortKey: key,
        value,
      }));
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
    return `${d}/${String(m + 1).padStart(2, '0')}/${y.slice(2)}`;
  }
  if (granularity === 'month') {
    return `${months[m]}/${y.slice(2)}`;
  }
  return y;
}

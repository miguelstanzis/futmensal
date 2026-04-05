const PRO_PHOTO_BASE = './assets/fotos/profissionais/';
const PX_PER_GOAL = 3.2;
const MIN_TRACK_WIDTH = 800;
const BUBBLE_W = 60;   // horizontal space each bubble needs
const ROW_H = 68;      // height per row (photo + name + goal badge)
const TEAM_ROW_H = 72; // slightly taller for team (has glow)

let proPlayers = [];
let currentTeamPlayers = [];

export async function initReguaGols(proPlayersData) {
  proPlayers = proPlayersData || [];
  renderRuler();
  initDragScroll();
}

export function updateTeamPlayers(players) {
  currentTeamPlayers = players;
  renderRuler();
}

/**
 * Greedy lane assignment (closest row to the ruler first).
 * Each lane stores the rightmost occupied x.
 */
function assignLanes(sorted) {
  const lanes = []; // lanes[i] = rightmost x edge
  const result = [];
  for (const item of sorted) {
    const left = item.x - BUBBLE_W / 2;
    const right = item.x + BUBBLE_W / 2;
    let placed = false;
    for (let l = 0; l < lanes.length; l++) {
      if (left >= lanes[l]) {
        lanes[l] = right;
        result.push(l);
        placed = true;
        break;
      }
    }
    if (!placed) {
      result.push(lanes.length);
      lanes.push(right);
    }
  }
  return result;
}

function renderRuler() {
  const track = document.querySelector('.regua-gols__track');
  const viewport = document.querySelector('.regua-gols__viewport');
  if (!track) return;

  if (!currentTeamPlayers.length) {
    track.innerHTML = `
      <div class="regua-gols__empty">
        <div class="regua-gols__empty-text">
          Selecione jogadores acima para comparar com os profissionais
        </div>
      </div>
    `;
    track.style.width = '';
    track.style.height = '';
    return;
  }

  const maxGoals = Math.max(
    ...currentTeamPlayers.map(p => p.gols),
    ...proPlayers.map(p => p.gols)
  );
  if (maxGoals <= 0) return;

  const trackWidth = Math.max(maxGoals * PX_PER_GOAL, MIN_TRACK_WIDTH);
  const pad = 50;

  const goalToX = (g) => pad + (g / maxGoals) * trackWidth;

  // Sort left→right
  const teamSorted = [...currentTeamPlayers].sort((a, b) => a.gols - b.gols);
  const proSorted = [...proPlayers].sort((a, b) => a.gols - b.gols);

  // Assign lanes
  const teamLanes = assignLanes(teamSorted.map(p => ({ x: goalToX(p.gols) })));
  const proLanes = assignLanes(proSorted.map(p => ({ x: goalToX(p.gols) })));

  const maxTeamLane = teamLanes.length ? Math.max(...teamLanes) + 1 : 0;
  const maxProLane = proLanes.length ? Math.max(...proLanes) + 1 : 0;

  // Layout heights
  const teamZoneH = maxTeamLane * TEAM_ROW_H;
  const proZoneH = maxProLane * ROW_H;
  const rulerLineH = 2;
  const tickZone = 20; // space for tick labels
  const gap = 6;

  // Total: [team rows] [gap] [ruler] [tick labels] [gap] [pro rows]
  const rulerY = teamZoneH + gap;
  const totalH = teamZoneH + gap + rulerLineH + tickZone + gap + proZoneH;

  track.style.width = `${trackWidth + pad * 2}px`;
  track.style.height = `${totalH}px`;

  // Ticks
  const tickInterval = getTickInterval(maxGoals);
  let ticksHtml = '';
  for (let g = 0; g <= maxGoals; g += tickInterval) {
    const x = goalToX(g);
    ticksHtml += `
      <div class="regua-gols__tick" style="left:${x}px; top:${rulerY - 5}px">
        <div class="regua-gols__tick-line"></div>
        <span class="regua-gols__tick-label">${g}</span>
      </div>
    `;
  }

  // Team bubbles (above ruler, row 0 = closest to ruler)
  const proStartY = rulerY + rulerLineH + tickZone + gap;

  const teamHtml = teamSorted.map((p, i) => {
    const x = goalToX(p.gols);
    const lane = teamLanes[i];
    // lane 0 = bottom of team zone (closest to ruler)
    const top = teamZoneH - (lane + 1) * TEAM_ROW_H;
    const delay = i * 80;
    return `
      <div class="regua-gols__bubble regua-gols__bubble--team"
           style="left:${x}px; top:${top}px; animation-delay:${delay}ms"
           title="${p.nome}: ${p.gols} gols (All Time)">
        <div class="regua-gols__photo">
          <div class="regua-gols__photo-initial">${p.nome.charAt(0)}</div>
        </div>
        <div class="regua-gols__name">${p.nome}</div>
        <div class="regua-gols__goals">${p.gols}</div>
      </div>
    `;
  }).join('');

  // Pro bubbles (below ruler, row 0 = closest to ruler)
  const proHtml = proSorted.map((p, i) => {
    const x = goalToX(p.gols);
    const lane = proLanes[i];
    const top = proStartY + lane * ROW_H;
    const delay = 100 + i * 20;
    return `
      <div class="regua-gols__bubble regua-gols__bubble--pro"
           style="left:${x}px; top:${top}px; animation-delay:${delay}ms"
           title="${p.nome}: ${p.gols} gols">
        <div class="regua-gols__photo">
          <img src="${PRO_PHOTO_BASE}${p.foto}" alt="${p.nome}" loading="lazy">
        </div>
        <div class="regua-gols__name">${p.nome}</div>
        <div class="regua-gols__goals">${p.gols}</div>
      </div>
    `;
  }).join('');

  track.innerHTML = `
    <div class="regua-gols__line" style="top:${rulerY}px"></div>
    ${ticksHtml}
    ${teamHtml}
    ${proHtml}
  `;

  // Auto-scroll to center on team player
  if (viewport && teamSorted.length) {
    const targetX = goalToX(teamSorted[Math.floor(teamSorted.length / 2)].gols);
    viewport.scrollTo({ left: Math.max(0, targetX - viewport.clientWidth / 2), behavior: 'smooth' });
  }
}

function getTickInterval(max) {
  if (max <= 50) return 5;
  if (max <= 150) return 25;
  if (max <= 500) return 50;
  return 100;
}

function initDragScroll() {
  const vp = document.querySelector('.regua-gols__viewport');
  if (!vp) return;

  let down = false, startX, sl;

  vp.addEventListener('mousedown', (e) => {
    down = true;
    vp.style.cursor = 'grabbing';
    startX = e.pageX - vp.offsetLeft;
    sl = vp.scrollLeft;
  });

  const stop = () => { down = false; vp.style.cursor = 'grab'; };
  vp.addEventListener('mouseleave', stop);
  vp.addEventListener('mouseup', stop);

  vp.addEventListener('mousemove', (e) => {
    if (!down) return;
    e.preventDefault();
    vp.scrollLeft = sl - (e.pageX - vp.offsetLeft - startX) * 1.5;
  });
}

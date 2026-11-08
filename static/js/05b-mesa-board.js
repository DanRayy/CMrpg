/**
 * CMrpg — Módulo da Aba MESA (Tabuleiro Virtual Compartilhado)
 * Geometria de colisão determinística (paridade 1:1 com table_engine.py),
 * câmera individual (zoom na posição do cursor + pan com botão do meio ou Espaço+arrastar),
 * arraste de cards com colisão real, limites físicos e divisão horizontal de Modo de Batalha.
 */

'use strict';

const MESA_DEFAULT_WORLD_W = 4800;
const MESA_DEFAULT_WORLD_H = 3000;
const MESA_DEFAULT_CARD_W = 420;
const MESA_DEFAULT_CARD_H = 468;
const MESA_COMPACT_CARD_W = 72;
const MESA_COMPACT_CARD_H = 96;

const MESA_MIN_ZOOM = 0.25;
const MESA_MAX_ZOOM = 1.50;
const MESA_DEFAULT_ZOOM = 0.75;

const MESA_SPAWN_GAP_X = 44;
const MESA_SPAWN_GAP_Y = 44;
const MESA_SPAWN_MARGIN_X = 120;
const MESA_SPAWN_MARGIN_Y = 90;

const MESA_DRAG_THROTTLE_MS = 35;
const MESA_DRAG_THRESHOLD_PX = 4;

// ===========================================================================
// Funções Puras de Geometria e Colisão (Paridade 1:1 com table_engine.py)
// ===========================================================================
function mesaGetAllowedRegion(
  worldW,
  worldH,
  cardW,
  cardH,
  battleActive = false,
  battleSplit = null,
  isEnemy = false
) {
  const w = Math.max(1, Math.round(cardW));
  const h = Math.max(1, Math.round(cardH));
  const ww = Math.max(w, Math.round(worldW));
  const wh = Math.max(h, Math.round(worldH));

  const min_x = 0;
  const max_x = Math.max(0, ww - w);

  if (!battleActive) {
    return {
      min_x,
      max_x,
      min_y: 0,
      max_y: Math.max(0, wh - h),
    };
  }

  let split = battleSplit !== null && battleSplit !== undefined ? Math.round(battleSplit) : Math.floor(wh / 2);
  split = Math.max(h, Math.min(wh - h, split));

  const min_y = isEnemy ? 0 : split;
  const max_y = isEnemy ? Math.max(0, split - h) : Math.max(split, wh - h);

  return { min_x, max_x, min_y, max_y };
}

function mesaClampToRegion(x, y, region) {
  const fx = Number.isFinite(x) ? x : region.min_x;
  const fy = Number.isFinite(y) ? y : region.min_y;
  const cx = Math.max(region.min_x, Math.min(region.max_x, Math.round(fx)));
  const cy = Math.max(region.min_y, Math.min(region.max_y, Math.round(fy)));
  return { x: cx, y: cy };
}

function mesaInRegion(x, y, region) {
  return x >= region.min_x && x <= region.max_x && y >= region.min_y && y <= region.max_y;
}

function mesaRectsOverlap(ax, ay, aw, ah, bx, by, bw, bh, gap = 0) {
  return (
    ax < bx + bw + gap &&
    ax + aw + gap > bx &&
    ay < by + bh + gap &&
    ay + ah + gap > by
  );
}

function mesaOverlapsAny(x, y, w, h, obstacles, gap = 0) {
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (mesaRectsOverlap(x, y, w, h, obs.x, obs.y, obs.w, obs.h, gap)) {
      return true;
    }
  }
  return false;
}

function mesaSweepX(curX, curY, targetX, w, h, obstacles, region) {
  let rx = Math.max(region.min_x, Math.min(region.max_x, Math.round(targetX)));
  if (rx === curX) return rx;
  if (rx > curX) {
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (curY < obs.y + obs.h && curY + h > obs.y) {
        if (obs.x >= curX + w && rx + w > obs.x) {
          rx = Math.min(rx, obs.x - w);
        }
      }
    }
  } else {
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (curY < obs.y + obs.h && curY + h > obs.y) {
        if (obs.x + obs.w <= curX && rx < obs.x + obs.w) {
          rx = Math.max(rx, obs.x + obs.w);
        }
      }
    }
  }
  return Math.max(region.min_x, Math.min(region.max_x, rx));
}

function mesaSweepY(curX, curY, targetY, w, h, obstacles, region) {
  let ry = Math.max(region.min_y, Math.min(region.max_y, Math.round(targetY)));
  if (ry === curY) return ry;
  if (ry > curY) {
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (curX < obs.x + obs.w && curX + w > obs.x) {
        if (obs.y >= curY + h && ry + h > obs.y) {
          ry = Math.min(ry, obs.y - h);
        }
      }
    }
  } else {
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (curX < obs.x + obs.w && curX + w > obs.x) {
        if (obs.y + obs.h <= curY && ry < obs.y + obs.h) {
          ry = Math.max(ry, obs.y + obs.h);
        }
      }
    }
  }
  return Math.max(region.min_y, Math.min(region.max_y, ry));
}

function mesaSlideMove(curX, curY, targetX, targetY, w, h, obstacles, region) {
  if (!mesaInRegion(curX, curY, region) || mesaOverlapsAny(curX, curY, w, h, obstacles)) {
    return null;
  }

  const x1 = mesaSweepX(curX, curY, targetX, w, h, obstacles, region);
  const y1 = mesaSweepY(x1, curY, targetY, w, h, obstacles, region);

  const y2 = mesaSweepY(curX, curY, targetY, w, h, obstacles, region);
  const x2 = mesaSweepX(curX, y2, targetX, w, h, obstacles, region);

  const valid = [];
  if (mesaInRegion(x1, y1, region) && !mesaOverlapsAny(x1, y1, w, h, obstacles)) {
    valid.push({ x: x1, y: y1 });
  }
  if ((x2 !== x1 || y2 !== y1) && mesaInRegion(x2, y2, region) && !mesaOverlapsAny(x2, y2, w, h, obstacles)) {
    valid.push({ x: x2, y: y2 });
  }

  if (valid.length === 0) {
    return { x: curX, y: curY };
  }

  valid.sort((a, b) => {
    const da = (a.x - targetX) ** 2 + (a.y - targetY) ** 2;
    const db = (b.x - targetX) ** 2 + (b.y - targetY) ** 2;
    return da - db;
  });
  return valid[0];
}

function mesaNearestFree(desiredX, desiredY, w, h, obstacles, region, gap = 0) {
  const clamped = mesaClampToRegion(desiredX, desiredY, region);
  const tx = clamped.x;
  const ty = clamped.y;
  if (!mesaOverlapsAny(tx, ty, w, h, obstacles, gap)) {
    return { x: tx, y: ty };
  }

  const candidates = [];
  const seen = new Set();

  function addCandidate(cx, cy) {
    const pt = mesaClampToRegion(cx, cy, region);
    const key = `${pt.x},${pt.y}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (!mesaOverlapsAny(pt.x, pt.y, w, h, obstacles, gap)) {
      candidates.push(pt);
    }
  }

  const l1Points = [];
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const pts = [
      { x: obs.x - w - gap, y: ty },
      { x: obs.x + obs.w + gap, y: ty },
      { x: tx, y: obs.y - h - gap },
      { x: tx, y: obs.y + obs.h + gap },
    ];
    for (let j = 0; j < pts.length; j++) {
      addCandidate(pts[j].x, pts[j].y);
      l1Points.push(mesaClampToRegion(pts[j].x, pts[j].y, region));
    }
  }

  for (let i = 0; i < l1Points.length; i++) {
    const pt = l1Points[i];
    for (let j = 0; j < obstacles.length; j++) {
      const obs = obstacles[j];
      if (mesaRectsOverlap(pt.x, pt.y, w, h, obs.x, obs.y, obs.w, obs.h, gap)) {
        addCandidate(obs.x - w - gap, pt.y);
        addCandidate(obs.x + obs.w + gap, pt.y);
        addCandidate(pt.x, obs.y - h - gap);
        addCandidate(pt.x, obs.y + obs.h + gap);
      }
    }
  }

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const xs = [obs.x - w - gap, obs.x, obs.x + obs.w - w, obs.x + obs.w + gap];
    const ys = [obs.y - h - gap, obs.y, obs.y + obs.h - h, obs.y + obs.h + gap];
    for (let xi = 0; xi < xs.length; xi++) {
      for (let yi = 0; yi < ys.length; yi++) {
        addCandidate(xs[xi], ys[yi]);
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const da = (a.x - tx) ** 2 + (a.y - ty) ** 2;
      const db = (b.x - tx) ** 2 + (b.y - ty) ** 2;
      if (da !== db) return da - db;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    return candidates[0];
  }

  const stepX = Math.max(24, Math.floor(w / 4));
  const stepY = Math.max(24, Math.floor(h / 4));
  let bestPt = null;
  let bestDist = Infinity;
  for (let gy = region.min_y; gy <= region.max_y; gy += stepY) {
    for (let gx = region.min_x; gx <= region.max_x; gx += stepX) {
      if (!mesaOverlapsAny(gx, gy, w, h, obstacles, gap)) {
        const d = (gx - tx) ** 2 + (gy - ty) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestPt = { x: gx, y: gy };
        }
      }
    }
  }
  return bestPt || { x: tx, y: ty };
}

function mesaResolveMove(desiredX, desiredY, w, h, obstacles, region, currentPos = null) {
  const clamped = mesaClampToRegion(desiredX, desiredY, region);
  const tx = clamped.x;
  const ty = clamped.y;

  if (!mesaOverlapsAny(tx, ty, w, h, obstacles)) {
    return { x: tx, y: ty };
  }

  if (currentPos && Number.isFinite(currentPos.x) && Number.isFinite(currentPos.y)) {
    const cx = Math.round(currentPos.x);
    const cy = Math.round(currentPos.y);
    if (mesaInRegion(cx, cy, region) && !mesaOverlapsAny(cx, cy, w, h, obstacles)) {
      const distFromCur = Math.hypot(tx - cx, ty - cy);
      if (distFromCur <= Math.max(w, h) * 1.5) {
        const slid = mesaSlideMove(cx, cy, tx, ty, w, h, obstacles, region);
        if (slid) return slid;
      }
    }
  }

  return mesaNearestFree(tx, ty, w, h, obstacles, region, 0);
}

// ===========================================================================
// Estado de Câmera, Arraste e Cache de Renderização (Browser)
// ===========================================================================
const mesaCamera = {
  x: 60,
  y: 40,
  zoom: MESA_DEFAULT_ZOOM,
  initialized: false,
  serverViewAppliedForMember: null,
  isPanning: false,
  panPointerId: null,
  panStartClientX: 0,
  panStartClientY: 0,
  panStartCamX: 0,
  panStartCamY: 0,
  spacePressed: false,
  saveViewTimer: null,
};

const mesaDrag = {
  pointerId: null,
  charId: null,
  tokenEl: null,
  startClientX: 0,
  startClientY: 0,
  grabOffsetX: 0,
  grabOffsetY: 0,
  currentX: 0,
  currentY: 0,
  cardW: MESA_DEFAULT_CARD_W,
  cardH: MESA_DEFAULT_CARD_H,
  isEnemy: false,
  movedBeyondThreshold: false,
  lastDragSentAt: 0,
  lastSentX: 0,
  lastSentY: 0,
  suppressNextClick: false,
};

const mesaCardHtmlCache = new Map();
let mesaResizeObserver = null;
let mesaSizesDebounceTimer = null;
let mesaPendingSizes = {};
let mesaSearchMatchIndex = 0;
let mesaForbiddenToastAt = 0;

function getMesaStorageKey() {
  const memId = (typeof state !== 'undefined' && state.localMemberId) ? state.localMemberId : 'default';
  return `cmrpg_mesa_view_${memId}`;
}

function ensureClientTableState(targetState = null) {
  const st = targetState || (typeof state !== 'undefined' ? state : null);
  if (!st) return null;

  if (!st.table || typeof st.table !== 'object') {
    st.table = {
      schemaVersion: 1,
      rev: 1,
      world: { w: MESA_DEFAULT_WORLD_W, h: MESA_DEFAULT_WORLD_H },
      positions: {},
      sizes: {},
      battle: { active: false, split: MESA_DEFAULT_WORLD_H / 2 },
    };
  }
  if (!st.table.world || typeof st.table.world !== 'object') {
    st.table.world = { w: MESA_DEFAULT_WORLD_W, h: MESA_DEFAULT_WORLD_H };
  }
  if (!st.table.positions || typeof st.table.positions !== 'object') {
    st.table.positions = {};
  }
  if (!st.table.sizes || typeof st.table.sizes !== 'object') {
    st.table.sizes = {};
  }
  if (!st.table.battle || typeof st.table.battle !== 'object') {
    st.table.battle = { active: false, split: Math.floor((st.table.world.h || MESA_DEFAULT_WORLD_H) / 2) };
  }

  const worldW = Number(st.table.world.w || MESA_DEFAULT_WORLD_W);
  const worldH = Number(st.table.world.h || MESA_DEFAULT_WORLD_H);
  const split = Number(st.table.battle.split || Math.floor(worldH / 2));
  const battleActive = Boolean(st.battle?.isActive || st.table.battle.active);
  st.table.battle.active = battleActive;
  st.table.battle.split = split;

  const chars = Array.isArray(st.characters) ? st.characters : [];
  const validIds = new Set(chars.map((c) => c.id));

  // Remove posições de fichas que foram excluídas
  Object.keys(st.table.positions).forEach((cid) => {
    if (!validIds.has(cid)) {
      delete st.table.positions[cid];
      delete st.table.sizes[cid];
    }
  });

  // Garante posição inicial para fichas novas ainda sem coordenadas
  const placed = [];
  let heroIdx = 0;
  let enemyIdx = 0;

  chars.forEach((c) => {
    const isCompact = isCharMesaCompact(c);
    const sz = st.table.sizes[c.id];
    const w = isCompact
      ? MESA_COMPACT_CARD_W
      : (sz && Number(sz.w) > 120 ? Number(sz.w) : MESA_DEFAULT_CARD_W);
    const h = isCompact
      ? MESA_COMPACT_CARD_H
      : (sz && Number(sz.w) > 120 && Number(sz.h) > 120 ? Number(sz.h) : MESA_DEFAULT_CARD_H);
    st.table.sizes[c.id] = { w, h };
    const pos = st.table.positions[c.id];
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      placed.push({ id: c.id, x: Math.round(pos.x), y: Math.round(pos.y), w, h });
      if (c.isEnemy) enemyIdx++;
      else heroIdx++;
    }
  });

  const usableW = Math.max(MESA_DEFAULT_CARD_W, worldW - 2 * MESA_SPAWN_MARGIN_X);
  const cols = Math.max(1, Math.floor((usableW + MESA_SPAWN_GAP_X) / (MESA_DEFAULT_CARD_W + MESA_SPAWN_GAP_X)));

  chars.forEach((c) => {
    const pos = st.table.positions[c.id];
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) return;

    const sz = st.table.sizes[c.id];
    const isEnemy = Boolean(c.isEnemy);
    const idx = isEnemy ? enemyIdx++ : heroIdx++;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const desX = MESA_SPAWN_MARGIN_X + col * (sz.w + MESA_SPAWN_GAP_X);
    const desY = isEnemy
      ? MESA_SPAWN_MARGIN_Y + row * (sz.h + MESA_SPAWN_GAP_Y)
      : split + MESA_SPAWN_MARGIN_Y + row * (sz.h + MESA_SPAWN_GAP_Y);

    const region = mesaGetAllowedRegion(worldW, worldH, sz.w, sz.h, battleActive, split, isEnemy);
    const resolved = mesaNearestFree(desX, desY, sz.w, sz.h, placed, region, 16);
    st.table.positions[c.id] = { x: resolved.x, y: resolved.y };
    placed.push({ id: c.id, x: resolved.x, y: resolved.y, w: sz.w, h: sz.h });
  });

  return st.table;
}

function enterMesaBattleClient(targetState) {
  const tbl = ensureClientTableState(targetState);
  if (!tbl) return;
  const worldW = Number(tbl.world.w || MESA_DEFAULT_WORLD_W);
  const worldH = Number(tbl.world.h || MESA_DEFAULT_WORLD_H);
  const split = Number(tbl.battle.split || Math.floor(worldH / 2));
  tbl.battle.active = true;
  tbl.battle.split = split;

  const chars = Array.isArray(targetState.characters) ? targetState.characters : [];
  const placed = [];
  const relocate = [];

  chars.forEach((c) => {
    const sz = tbl.sizes[c.id] || { w: MESA_DEFAULT_CARD_W, h: MESA_DEFAULT_CARD_H };
    const isEnemy = Boolean(c.isEnemy);
    const region = mesaGetAllowedRegion(worldW, worldH, sz.w, sz.h, true, split, isEnemy);
    const pos = tbl.positions[c.id];
    if (pos && mesaInRegion(Math.round(pos.x), Math.round(pos.y), region) && !mesaOverlapsAny(Math.round(pos.x), Math.round(pos.y), sz.w, sz.h, placed)) {
      placed.push({ id: c.id, x: Math.round(pos.x), y: Math.round(pos.y), w: sz.w, h: sz.h });
    } else {
      relocate.push({ char: c, origX: pos ? Math.round(pos.x) : MESA_SPAWN_MARGIN_X, origY: pos ? Math.round(pos.y) : split, sz, region });
    }
  });

  relocate.sort((a, b) => (a.origY - b.origY) || (a.origX - b.origX));
  relocate.forEach((item) => {
    const isEnemy = Boolean(item.char.isEnemy);
    const desiredY = isEnemy
      ? Math.min(item.origY, item.region.max_y - MESA_SPAWN_MARGIN_Y)
      : Math.max(item.origY, item.region.min_y + MESA_SPAWN_MARGIN_Y);
    const pt = mesaNearestFree(item.origX, desiredY, item.sz.w, item.sz.h, placed, item.region, 16);
    tbl.positions[item.char.id] = { x: pt.x, y: pt.y };
    placed.push({ id: item.char.id, x: pt.x, y: pt.y, w: item.sz.w, h: item.sz.h });
  });
}

function exitMesaBattleClient(targetState) {
  const tbl = ensureClientTableState(targetState);
  if (!tbl) return;
  tbl.battle.active = false;
}

function reconcileMesaTableStateClient(targetState) {
  return ensureClientTableState(targetState);
}

function centerMesaOnCard(charId) {
  if (!charId || typeof state === 'undefined') return;
  const target = (state.characters || []).find((c) => c.id === charId);
  if (target) {
    centerMesaCameraOnCards([target], Math.max(mesaCamera.zoom, 0.8));
  }
}

// ===========================================================================
// Controle de Câmera e Zoom Independente por Usuário
// ===========================================================================
function clampCameraToBounds(x, y, zoom) {
  const viewport = document.getElementById('mesa-viewport');
  const tbl = ensureClientTableState();
  const worldW = tbl?.world?.w || MESA_DEFAULT_WORLD_W;
  const worldH = tbl?.world?.h || MESA_DEFAULT_WORLD_H;
  const vw = viewport ? viewport.clientWidth || 1200 : 1200;
  const vh = viewport ? viewport.clientHeight || 750 : 750;

  const z = Math.max(MESA_MIN_ZOOM, Math.min(MESA_MAX_ZOOM, Number(zoom || MESA_DEFAULT_ZOOM)));
  const scaledW = worldW * z;
  const scaledH = worldH * z;

  const marginX = Math.min(320, vw * 0.35);
  const marginY = Math.min(240, vh * 0.35);

  const minX = vw - scaledW - marginX;
  const maxX = marginX;
  const minY = vh - scaledH - marginY;
  const maxY = marginY;

  let cx = x;
  let cy = y;
  if (minX > maxX) {
    cx = (vw - scaledW) / 2;
  } else {
    cx = Math.max(minX, Math.min(maxX, x));
  }
  if (minY > maxY) {
    cy = (vh - scaledH) / 2;
  } else {
    cy = Math.max(minY, Math.min(maxY, y));
  }

  return { x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10, zoom: Math.round(z * 1000) / 1000 };
}

let mesaLastAppliedZoom = 1;
let mesaRerasterRaf = null;

function triggerMesaZoomRerasterization() {
  const worldEl = document.getElementById('mesa-world');
  if (!worldEl) return;
  if (mesaRerasterRaf) cancelAnimationFrame(mesaRerasterRaf);
  mesaRerasterRaf = requestAnimationFrame(() => {
    mesaRerasterRaf = null;
    // Micro-escala e reflow para invalidar o cache de textura da GPU, forçando super-sampling nítido no zoom
    worldEl.style.willChange = 'auto';
    void worldEl.offsetHeight;
    worldEl.style.willChange = 'transform';
  });
}

function applyMesaCameraTransform() {
  const worldEl = document.getElementById('mesa-world');
  if (worldEl) {
    worldEl.style.transform = `translate3d(${mesaCamera.x}px, ${mesaCamera.y}px, 0) scale(${mesaCamera.zoom})`;
  }
  const zoomLabel = document.getElementById('mesa-zoom-label');
  if (zoomLabel) {
    zoomLabel.textContent = `${Math.round(mesaCamera.zoom * 100)}%`;
  }
  if (Math.abs(mesaCamera.zoom - mesaLastAppliedZoom) > 0.0001) {
    mesaLastAppliedZoom = mesaCamera.zoom;
    triggerMesaZoomRerasterization();
  }
  if (typeof refreshAllRemoteCursorsVisibility === 'function' && state.activeTab === 'mesa') {
    refreshAllRemoteCursorsVisibility();
  }
}

function scheduleSaveMesaView() {
  try {
    localStorage.setItem(
      getMesaStorageKey(),
      JSON.stringify({ x: mesaCamera.x, y: mesaCamera.y, zoom: mesaCamera.zoom })
    );
  } catch (_) {}

  if (mesaCamera.saveViewTimer) clearTimeout(mesaCamera.saveViewTimer);
  mesaCamera.saveViewTimer = setTimeout(() => {
    mesaCamera.saveViewTimer = null;
    if (typeof state !== 'undefined' && state.wsConnected && state.ws && state.ws.readyState === WebSocket.OPEN) {
      try {
        state.ws.send(
          JSON.stringify({
            type: 'table_view',
            view: { x: mesaCamera.x, y: mesaCamera.y, zoom: mesaCamera.zoom },
          })
        );
      } catch (_) {}
    }
  }, 650);
}

function setMesaCamera(x, y, zoom, save = true) {
  const clamped = clampCameraToBounds(x, y, zoom);
  mesaCamera.x = clamped.x;
  mesaCamera.y = clamped.y;
  mesaCamera.zoom = clamped.zoom;
  mesaCamera.initialized = true;
  applyMesaCameraTransform();
  if (save) scheduleSaveMesaView();
}

function applyServerMesaView(view) {
  if (!view || typeof view !== 'object') return;
  const memId = state.localMemberId || 'host_master';
  if (mesaCamera.serverViewAppliedForMember === memId) return;
  mesaCamera.serverViewAppliedForMember = memId;
  if (Number.isFinite(view.x) && Number.isFinite(view.y) && Number.isFinite(view.zoom)) {
    setMesaCamera(Number(view.x), Number(view.y), Number(view.zoom), false);
  }
}

function centerMesaCameraOnCards(targetChars = null, targetZoom = null) {
  const viewport = document.getElementById('mesa-viewport');
  const tbl = ensureClientTableState();
  if (!viewport || !tbl) return;

  const vw = viewport.clientWidth || 1200;
  const vh = viewport.clientHeight || 750;
  const zoom = targetZoom !== null ? targetZoom : mesaCamera.zoom;

  const list = Array.isArray(targetChars) && targetChars.length > 0
    ? targetChars
    : (state.characters || []);

  if (list.length === 0) {
    const cx = (vw - tbl.world.w * zoom) / 2;
    const cy = (vh - tbl.world.h * zoom) / 2;
    setMesaCamera(cx, cy, zoom);
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  list.forEach((c) => {
    const pos = tbl.positions[c.id];
    const sz = tbl.sizes[c.id] || { w: MESA_DEFAULT_CARD_W, h: MESA_DEFAULT_CARD_H };
    if (!pos) return;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + sz.w);
    maxY = Math.max(maxY, pos.y + sz.h);
  });

  if (!Number.isFinite(minX)) return;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  setMesaCamera(vw / 2 - centerX * zoom, vh / 2 - centerY * zoom, zoom);
}

function centerMesaDefaultView() {
  const myChars = (state.characters || []).filter((c) => !c.isEnemy && isCharacterOwner(c));
  if (!isEffectiveMaster() && myChars.length > 0) {
    centerMesaCameraOnCards(myChars, mesaCamera.zoom);
  } else {
    centerMesaCameraOnCards(state.characters || [], mesaCamera.zoom);
  }
}

function fitMesaAllToViewport() {
  const viewport = document.getElementById('mesa-viewport');
  const tbl = ensureClientTableState();
  if (!viewport || !tbl) return;

  const vw = viewport.clientWidth || 1200;
  const vh = viewport.clientHeight || 750;
  const chars = state.characters || [];

  if (chars.length === 0) {
    const fitZ = Math.max(MESA_MIN_ZOOM, Math.min(MESA_MAX_ZOOM, Math.min((vw - 60) / tbl.world.w, (vh - 60) / tbl.world.h)));
    setMesaCamera((vw - tbl.world.w * fitZ) / 2, (vh - tbl.world.h * fitZ) / 2, fitZ);
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  chars.forEach((c) => {
    const pos = tbl.positions[c.id];
    const sz = tbl.sizes[c.id] || { w: MESA_DEFAULT_CARD_W, h: MESA_DEFAULT_CARD_H };
    if (!pos) return;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + sz.w);
    maxY = Math.max(maxY, pos.y + sz.h);
  });

  const pad = 140;
  const boxW = Math.max(600, maxX - minX + pad * 2);
  const boxH = Math.max(500, maxY - minY + pad * 2);
  const fitZ = Math.max(MESA_MIN_ZOOM, Math.min(1.0, Math.min(vw / boxW, vh / boxH)));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  setMesaCamera(vw / 2 - centerX * fitZ, vh / 2 - centerY * fitZ, fitZ);
}

function zoomMesaAtScreenPoint(newZoomRaw, clientX, clientY) {
  const viewport = document.getElementById('mesa-viewport');
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  const localX = clientX !== undefined ? clientX - rect.left : rect.width / 2;
  const localY = clientY !== undefined ? clientY - rect.top : rect.height / 2;

  const oldZoom = mesaCamera.zoom;
  const newZoom = Math.max(MESA_MIN_ZOOM, Math.min(MESA_MAX_ZOOM, newZoomRaw));
  if (Math.abs(newZoom - oldZoom) < 0.001) return;

  const worldX = (localX - mesaCamera.x) / oldZoom;
  const worldY = (localY - mesaCamera.y) / oldZoom;

  const nextX = localX - worldX * newZoom;
  const nextY = localY - worldY * newZoom;
  setMesaCamera(nextX, nextY, newZoom);
}

// ===========================================================================
// Medição Real dos Cards e Sincronização de Tamanhos (ResizeObserver)
// ===========================================================================
function queueMesaCardSizeReport(charId, w, h) {
  const tbl = ensureClientTableState();
  if (!tbl) return;
  const cleanW = Math.max(64, Math.min(720, Math.round(w)));
  const cleanH = Math.max(64, Math.min(1200, Math.round(h)));
  const cur = tbl.sizes[charId];
  if (cur && Math.abs(cur.w - cleanW) <= 1 && Math.abs(cur.h - cleanH) <= 1) {
    return;
  }
  tbl.sizes[charId] = { w: cleanW, h: cleanH };
  mesaPendingSizes[charId] = { w: cleanW, h: cleanH };

  if (mesaSizesDebounceTimer) clearTimeout(mesaSizesDebounceTimer);
  mesaSizesDebounceTimer = setTimeout(() => {
    mesaSizesDebounceTimer = null;
    const payloadSizes = { ...mesaPendingSizes };
    mesaPendingSizes = {};
    if (
      Object.keys(payloadSizes).length > 0 &&
      typeof state !== 'undefined' &&
      state.wsConnected &&
      state.ws &&
      state.ws.readyState === WebSocket.OPEN
    ) {
      try {
        state.ws.send(JSON.stringify({ type: 'table_sizes', sizes: payloadSizes }));
      } catch (_) {}
    }
  }, 240);
}

function ensureMesaResizeObserver() {
  if (mesaResizeObserver || typeof ResizeObserver === 'undefined') return;
  mesaResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target;
      const cid = el.getAttribute('data-token-char-id');
      if (!cid) continue;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) {
        queueMesaCardSizeReport(cid, w, h);
      }
    }
  });
}

// ===========================================================================
// Renderização Eficiente da Mesa (DOM Diffing por Token + Transform)
// ===========================================================================
function renderMesaTab() {
  const viewport = document.getElementById('mesa-viewport');
  const worldEl = document.getElementById('mesa-world');
  const tokensLayer = document.getElementById('mesa-tokens-layer');
  const countLabel = document.getElementById('char-count-label');
  if (!viewport || !worldEl || !tokensLayer) {
    renderBattleSidebar();
    updateBattleToggleButton();
    return;
  }

  const tbl = ensureClientTableState();
  const worldW = Number(tbl.world.w || MESA_DEFAULT_WORLD_W);
  const worldH = Number(tbl.world.h || MESA_DEFAULT_WORLD_H);
  const split = Number(tbl.battle.split || Math.floor(worldH / 2));
  const battle = getBattleState();
  const isBattleActive = Boolean(battle.isActive || tbl.battle.active);

  worldEl.style.width = `${worldW}px`;
  worldEl.style.height = `${worldH}px`;

  // Inicializa câmera na primeira abertura (localStorage ou centralizada)
  if (!mesaCamera.initialized && viewport.clientWidth > 0) {
    let restored = false;
    try {
      const savedRaw = localStorage.getItem(getMesaStorageKey());
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y) && Number.isFinite(parsed.zoom)) {
          setMesaCamera(parsed.x, parsed.y, parsed.zoom, false);
          restored = true;
        }
      }
    } catch (_) {}
    if (!restored) {
      centerMesaDefaultView();
    }
  } else {
    applyMesaCameraTransform();
  }

  // Atualiza divisória horizontal e indicador de Modo de Batalha
  const battleZonesEl = document.getElementById('mesa-battle-zones');
  const battleDividerEl = document.getElementById('mesa-battle-divider');
  const battleBadgeEl = document.getElementById('mesa-battle-indicator');
  const battleRoundEl = document.getElementById('mesa-battle-round-label');

  if (battleZonesEl) {
    battleZonesEl.classList.toggle('hidden', !isBattleActive);
    const topZone = document.getElementById('mesa-zone-enemies');
    const botZone = document.getElementById('mesa-zone-heroes');
    if (topZone) topZone.style.height = `${split}px`;
    if (botZone) {
      botZone.style.top = `${split}px`;
      botZone.style.height = `${worldH - split}px`;
    }
  }
  if (battleDividerEl) {
    battleDividerEl.classList.toggle('hidden', !isBattleActive);
    battleDividerEl.style.top = `${split}px`;
  }
  if (battleBadgeEl) {
    battleBadgeEl.classList.toggle('hidden', !isBattleActive);
    battleBadgeEl.classList.toggle('inline-flex', isBattleActive);
  }
  if (battleRoundEl) {
    battleRoundEl.textContent = `BATALHA ATIVA • RODADA ${battle.roundNumber || 1}`;
  }

  ensureMesaResizeObserver();

  const chars = state.characters || [];
  const q = (state.searchQuery || '').trim().toLowerCase();
  const matchingIds = new Set();
  chars.forEach((c) => {
    if (!q || (c.name || '').toLowerCase().includes(q)) {
      matchingIds.add(c.id);
    }
  });

  if (countLabel) {
    const heroesCount = chars.filter((c) => !c.isEnemy).length;
    const enemiesCount = chars.filter((c) => Boolean(c.isEnemy)).length;
    countLabel.textContent = enemiesCount > 0
      ? `${heroesCount} HERÓI(S) • ${enemiesCount} INIMIGO(S)`
      : `${chars.length} FICHA(S) NA MESA`;
  }

  const validIds = new Set(chars.map((c) => c.id));

  // Remove tokens órfãos
  Array.from(tokensLayer.querySelectorAll('.mesa-token')).forEach((el) => {
    const cid = el.getAttribute('data-token-char-id');
    if (!validIds.has(cid)) {
      if (mesaResizeObserver) mesaResizeObserver.unobserve(el);
      mesaCardHtmlCache.delete(cid);
      el.remove();
    }
  });

  // Atualiza ou cria cada token individualmente sem recriar os demais
  chars.forEach((char) => {
    const cid = char.id;
    let tokenEl = tokensLayer.querySelector(`.mesa-token[data-token-char-id="${CSS.escape(cid)}"]`);
    if (!tokenEl) {
      tokenEl = document.createElement('div');
      tokenEl.className = 'mesa-token';
      tokenEl.setAttribute('data-token-char-id', cid);
      tokenEl.style.width = `${MESA_DEFAULT_CARD_W}px`;
      tokensLayer.appendChild(tokenEl);
      if (mesaResizeObserver) mesaResizeObserver.observe(tokenEl);
    }

    const canMove = canMoveCharacterOnMesa(char);
    const isCompact = isCharMesaCompact(char);
    tokenEl.classList.toggle('mesa-token-movable', canMove);
    tokenEl.classList.toggle('mesa-token-locked', !canMove);
    tokenEl.classList.toggle('mesa-token-enemy', Boolean(char.isEnemy));
    tokenEl.classList.toggle('mesa-token-compact', isCompact);
    tokenEl.classList.toggle('mesa-token-search-match', Boolean(q && matchingIds.has(cid)));
    tokenEl.classList.toggle('mesa-token-search-dim', Boolean(q && !matchingIds.has(cid)));

    if (isCompact) {
      tokenEl.style.width = `${MESA_COMPACT_CARD_W}px`;
      tokenEl.style.height = `${MESA_COMPACT_CARD_H}px`;
      tbl.sizes[cid] = { w: MESA_COMPACT_CARD_W, h: MESA_COMPACT_CARD_H };
    } else {
      tokenEl.style.width = `${MESA_DEFAULT_CARD_W}px`;
      tokenEl.style.height = '';
    }

    // Não substitui o innerHTML se este card estiver sendo arrastado no momento
    const isBeingDragged = mesaDrag.charId === cid && mesaDrag.movedBeyondThreshold;
    if (!isBeingDragged) {
      const nextHtml = buildCharacterCardHtml(char, { forMesa: true });
      if (mesaCardHtmlCache.get(cid) !== nextHtml) {
        tokenEl.innerHTML = nextHtml;
        mesaCardHtmlCache.set(cid, nextHtml);
      }
      const pos = tbl.positions[cid] || { x: MESA_SPAWN_MARGIN_X, y: MESA_SPAWN_MARGIN_Y };
      tokenEl.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0)`;
    }

    if (isCompact) {
      queueMesaCardSizeReport(cid, MESA_COMPACT_CARD_W, MESA_COMPACT_CARD_H);
    } else if (tokenEl.offsetWidth > 0 && tokenEl.offsetHeight > 0) {
      queueMesaCardSizeReport(cid, tokenEl.offsetWidth, tokenEl.offsetHeight);
    }
  });

  renderBattleSidebar();
  updateBattleToggleButton();
}

// ===========================================================================
// Arraste de Cards na Mesa com Colisão em Tempo Real
// ===========================================================================
function buildMesaObstaclesForChar(excludeCharId) {
  const tbl = ensureClientTableState();
  const tokensLayer = document.getElementById('mesa-tokens-layer');
  const obstacles = [];
  if (!tbl) return obstacles;

  (state.characters || []).forEach((c) => {
    if (c.id === excludeCharId) return;
    const pos = tbl.positions[c.id];
    if (!pos) return;
    const isCompact = isCharMesaCompact(c);
    let w = isCompact ? MESA_COMPACT_CARD_W : (tbl.sizes[c.id]?.w || MESA_DEFAULT_CARD_W);
    let h = isCompact ? MESA_COMPACT_CARD_H : (tbl.sizes[c.id]?.h || MESA_DEFAULT_CARD_H);
    if (!isCompact && tokensLayer) {
      const domEl = tokensLayer.querySelector(`.mesa-token[data-token-char-id="${CSS.escape(c.id)}"]`);
      if (domEl && domEl.offsetWidth > 0 && domEl.offsetHeight > 0) {
        w = Math.max(w, domEl.offsetWidth);
        h = Math.max(h, domEl.offsetHeight);
      }
    }
    obstacles.push({
      id: c.id,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      w: Math.round(w),
      h: Math.round(h),
    });
  });

  return obstacles;
}

function getMesaLocalUserName() {
  try {
    if (typeof getActiveMember === 'function') {
      const mem = getActiveMember();
      if (mem && (mem.name || mem.nickname)) return mem.name || mem.nickname;
    }
  } catch (_) {}
  if (typeof isEffectiveMaster === 'function' && isEffectiveMaster()) return 'Mestre';
  return 'Jogador';
}

function sendMesaDragPreviewThrottled(charId, x, y) {
  if (!state.wsConnected || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  const now = performance.now();
  if (now - mesaDrag.lastDragSentAt < MESA_DRAG_THROTTLE_MS) return;
  if (Math.abs(x - mesaDrag.lastSentX) < 2 && Math.abs(y - mesaDrag.lastSentY) < 2) return;

  mesaDrag.lastDragSentAt = now;
  mesaDrag.lastSentX = x;
  mesaDrag.lastSentY = y;

  const userName = getMesaLocalUserName();

  try {
    state.ws.send(
      JSON.stringify({
        type: 'REMOTE_CARD_DRAG',
        cardId: charId,
        charId,
        x: Math.round(x),
        y: Math.round(y),
        user: userName,
      })
    );
  } catch (_) {}
}

function sendMesaFinalMove(charId, x, y) {
  const tbl = ensureClientTableState();
  if (tbl) {
    tbl.positions[charId] = { x: Math.round(x), y: Math.round(y) };
  }
  saveStateToLocalStorage();

  if (state.wsConnected && state.ws && state.ws.readyState === WebSocket.OPEN) {
    try {
      state.ws.send(
        JSON.stringify({
          type: 'REMOTE_CARD_DROP',
          cardId: charId,
          charId,
          x: Math.round(x),
          y: Math.round(y),
        })
      );
    } catch (_) {}
  }
}

// ===========================================================================
// Handlers de Mensagens WebSocket da Mesa
// ===========================================================================
const mesaRemoteDragWatchdogs = new Map();

function handleIncomingTableDrag(data) {
  const charId = data.cardId || data.charId || data.id;
  if (!charId) return;
  if (mesaDrag.charId === charId && mesaDrag.movedBeyondThreshold) return;

  const tbl = ensureClientTableState();
  if (tbl && Number.isFinite(data.x) && Number.isFinite(data.y)) {
    tbl.positions[charId] = { x: Math.round(data.x), y: Math.round(data.y) };
  }
  const tokensLayer = document.getElementById('mesa-tokens-layer');
  const tokenEl = tokensLayer?.querySelector(`.mesa-token[data-token-char-id="${CSS.escape(charId)}"]`);
  if (tokenEl && Number.isFinite(data.x) && Number.isFinite(data.y)) {
    tokenEl.classList.add('mesa-token-remote-dragging');
    tokenEl.style.transform = `translate3d(${Math.round(data.x)}px, ${Math.round(data.y)}px, 0)`;

    const userName = String(data.user || 'Jogador');
    let badgeEl = tokenEl.querySelector('.mesa-remote-drag-badge');
    if (!badgeEl) {
      badgeEl = document.createElement('div');
      badgeEl.className = 'mesa-remote-drag-badge';
      tokenEl.appendChild(badgeEl);
    }
    badgeEl.textContent = `Arrastando: ${userName}`;

    if (mesaRemoteDragWatchdogs.has(charId)) {
      clearTimeout(mesaRemoteDragWatchdogs.get(charId));
    }
    const timer = setTimeout(() => {
      tokenEl.classList.remove('mesa-token-remote-dragging');
      const b = tokenEl.querySelector('.mesa-remote-drag-badge');
      if (b) b.remove();
      mesaRemoteDragWatchdogs.delete(charId);
    }, 400);
    mesaRemoteDragWatchdogs.set(charId, timer);
  }
}

function handleIncomingTableUpdate(data) {
  const charId = data.cardId || data.charId || data.id;
  const pos = data.position || (Number.isFinite(data.x) && Number.isFinite(data.y) ? { x: data.x, y: data.y } : null);
  if (!charId || !pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;

  const tbl = ensureClientTableState();
  if (tbl) {
    tbl.positions[charId] = { x: Math.round(pos.x), y: Math.round(pos.y) };
    if (Number.isFinite(data.rev)) tbl.rev = data.rev;
  }
  saveStateToLocalStorage();

  if (mesaRemoteDragWatchdogs.has(charId)) {
    clearTimeout(mesaRemoteDragWatchdogs.get(charId));
    mesaRemoteDragWatchdogs.delete(charId);
  }

  if (mesaDrag.charId === charId && mesaDrag.movedBeyondThreshold) return;

  const tokensLayer = document.getElementById('mesa-tokens-layer');
  const tokenEl = tokensLayer?.querySelector(`.mesa-token[data-token-char-id="${CSS.escape(charId)}"]`);
  if (tokenEl) {
    tokenEl.classList.remove('mesa-token-remote-dragging');
    const badge = tokenEl.querySelector('.mesa-remote-drag-badge');
    if (badge) badge.remove();
    tokenEl.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0)`;
  }
}

function handleIncomingTableMoveRejected(data) {
  const charId = data.charId;
  if (data.table && typeof data.table === 'object') {
    state.table = data.table;
  } else if (charId && data.position) {
    const tbl = ensureClientTableState();
    if (tbl) tbl.positions[charId] = data.position;
  }
  renderMesaTab();
  showToast('Você não tem permissão para movimentar este card na Mesa.', 'warning');
}

function handleIncomingTableSync(data) {
  if (!data.table || typeof data.table !== 'object') return;
  state.table = data.table;
  saveStateToLocalStorage();
  renderMesaTab();
  if (typeof renderCharactersTab === 'function') {
    renderCharactersTab();
  }
}

// ===========================================================================
// Inicialização de Eventos de Câmera, Zoom e Arraste na Mesa
// ===========================================================================
function initMesaBoardEvents() {
  const viewport = document.getElementById('mesa-viewport');
  if (!viewport) return;

  // Suprime clique acidental em botão/card imediatamente após finalizar um arraste
  viewport.addEventListener(
    'click',
    (e) => {
      if (mesaDrag.suppressNextClick) {
        mesaDrag.suppressNextClick = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );

  // Previne menu de autoscroll nativo ao clicar com o botão do meio
  viewport.addEventListener('auxclick', (e) => {
    if (e.button === 1) e.preventDefault();
  });

  // Zoom na roda do mouse direcionado ao cursor
  viewport.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.1 : 1 / 1.1;
      zoomMesaAtScreenPoint(mesaCamera.zoom * factor, e.clientX, e.clientY);
    },
    { passive: false }
  );

  // Tecla Espaço para pan da câmera
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && state.activeTab === 'mesa') {
      const tag = (e.target?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }
      if (!document.querySelector('.modal-backdrop:not(.hidden)')) {
        e.preventDefault();
        mesaCamera.spacePressed = true;
        viewport.classList.add('mesa-space-pan-ready');
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      mesaCamera.spacePressed = false;
      viewport.classList.remove('mesa-space-pan-ready');
    }
  });

  // PointerDown no Viewport: Pan da Câmera OU Início de Arraste de Card
  viewport.addEventListener('pointerdown', (e) => {
    // 1. Movimentação da câmera: Botão do Meio (1) ou Espaço + Botão Esquerdo (0)
    if (e.button === 1 || (e.button === 0 && mesaCamera.spacePressed)) {
      const interactiveEl = e.target.closest('button, input, textarea, select, a');
      if (interactiveEl && e.button === 0) return;

      e.preventDefault();
      mesaCamera.isPanning = true;
      mesaCamera.panPointerId = e.pointerId;
      mesaCamera.panStartClientX = e.clientX;
      mesaCamera.panStartClientY = e.clientY;
      mesaCamera.panStartCamX = mesaCamera.x;
      mesaCamera.panStartCamY = mesaCamera.y;
      viewport.classList.add('mesa-panning');
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch (_) {}
      return;
    }

    if (e.button !== 0) return;

    // 2. Se clicou em um botão, input, avatar de ficha completa ou controle interativo dentro do card, deixa o clique normal agir
    if (e.target.closest('button, input, textarea, select, a, label, [data-action], .char-card-top-avatar-wrap[data-view-image-src]')) {
      return;
    }

    const tokenEl = e.target.closest('.mesa-token');
    if (!tokenEl) return;

    const charId = tokenEl.getAttribute('data-token-char-id');
    const char = (state.characters || []).find((c) => c.id === charId);
    if (!char) return;

    if (!canMoveCharacterOnMesa(char)) {
      // Bloqueio silencioso para inimigos por não-hosts
      return;
    }

    const tbl = ensureClientTableState();
    const pos = tbl.positions[charId] || { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - mesaCamera.x) / mesaCamera.zoom;
    const worldY = (e.clientY - rect.top - mesaCamera.y) / mesaCamera.zoom;

    const isCompact = isCharMesaCompact(char);
    const cardW = isCompact ? MESA_COMPACT_CARD_W : (tokenEl.offsetWidth || tbl.sizes[charId]?.w || MESA_DEFAULT_CARD_W);
    const cardH = isCompact ? MESA_COMPACT_CARD_H : (tokenEl.offsetHeight || tbl.sizes[charId]?.h || MESA_DEFAULT_CARD_H);
    tbl.sizes[charId] = { w: cardW, h: cardH };

    mesaDrag.pointerId = e.pointerId;
    mesaDrag.charId = charId;
    mesaDrag.tokenEl = tokenEl;
    mesaDrag.startClientX = e.clientX;
    mesaDrag.startClientY = e.clientY;
    mesaDrag.grabOffsetX = worldX - pos.x;
    mesaDrag.grabOffsetY = worldY - pos.y;
    mesaDrag.currentX = Math.round(pos.x);
    mesaDrag.currentY = Math.round(pos.y);
    mesaDrag.cardW = cardW;
    mesaDrag.cardH = cardH;
    mesaDrag.isCompact = isCompact;
    mesaDrag.isEnemy = Boolean(char.isEnemy);
    mesaDrag.movedBeyondThreshold = false;
    mesaDrag.lastSentX = mesaDrag.currentX;
    mesaDrag.lastSentY = mesaDrag.currentY;
  });

  window.addEventListener('pointermove', (e) => {
    // 1. Atualização de Pan da Câmera
    if (mesaCamera.isPanning && e.pointerId === mesaCamera.panPointerId) {
      const dx = e.clientX - mesaCamera.panStartClientX;
      const dy = e.clientY - mesaCamera.panStartClientY;
      setMesaCamera(mesaCamera.panStartCamX + dx, mesaCamera.panStartCamY + dy, mesaCamera.zoom);
      return;
    }

    // 2. Atualização de Arraste de Card com Colisão Real
    if (!mesaDrag.charId || e.pointerId !== mesaDrag.pointerId || !mesaDrag.tokenEl) return;

    const distScreen = Math.hypot(e.clientX - mesaDrag.startClientX, e.clientY - mesaDrag.startClientY);
    if (!mesaDrag.movedBeyondThreshold) {
      if (distScreen < MESA_DRAG_THRESHOLD_PX) return;
      mesaDrag.movedBeyondThreshold = true;
      mesaDrag.tokenEl.classList.add('mesa-token-dragging');
      try {
        mesaDrag.tokenEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - mesaCamera.x) / mesaCamera.zoom;
    const worldY = (e.clientY - rect.top - mesaCamera.y) / mesaCamera.zoom;

    const desiredX = worldX - mesaDrag.grabOffsetX;
    const desiredY = worldY - mesaDrag.grabOffsetY;

    const tbl = ensureClientTableState();
    const worldW = Number(tbl.world.w || MESA_DEFAULT_WORLD_W);
    const worldH = Number(tbl.world.h || MESA_DEFAULT_WORLD_H);
    const split = Number(tbl.battle.split || Math.floor(worldH / 2));
    const battleActive = Boolean(getBattleState().isActive || tbl.battle.active);

    const cardW = mesaDrag.isCompact ? MESA_COMPACT_CARD_W : (mesaDrag.tokenEl.offsetWidth || mesaDrag.cardW);
    const cardH = mesaDrag.isCompact ? MESA_COMPACT_CARD_H : (mesaDrag.tokenEl.offsetHeight || mesaDrag.cardH);
    mesaDrag.cardW = cardW;
    mesaDrag.cardH = cardH;

    const region = mesaGetAllowedRegion(worldW, worldH, cardW, cardH, battleActive, split, mesaDrag.isEnemy);
    const obstacles = buildMesaObstaclesForChar(mesaDrag.charId);
    const resolved = mesaResolveMove(
      desiredX,
      desiredY,
      cardW,
      cardH,
      obstacles,
      region,
      { x: mesaDrag.currentX, y: mesaDrag.currentY }
    );

    const wasBlocked =
      Math.abs(resolved.x - Math.round(desiredX)) > 1 ||
      Math.abs(resolved.y - Math.round(desiredY)) > 1;
    mesaDrag.tokenEl.classList.toggle('mesa-token-colliding', wasBlocked);

    mesaDrag.currentX = resolved.x;
    mesaDrag.currentY = resolved.y;
    tbl.positions[mesaDrag.charId] = { x: resolved.x, y: resolved.y };
    mesaDrag.tokenEl.style.transform = `translate3d(${resolved.x}px, ${resolved.y}px, 0)`;

    sendMesaDragPreviewThrottled(mesaDrag.charId, resolved.x, resolved.y);
  });

  const finishPointerInteraction = (e) => {
    if (mesaCamera.isPanning && e.pointerId === mesaCamera.panPointerId) {
      mesaCamera.isPanning = false;
      mesaCamera.panPointerId = null;
      viewport.classList.remove('mesa-panning');
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (mesaDrag.charId && e.pointerId === mesaDrag.pointerId) {
      const charId = mesaDrag.charId;
      const finalX = mesaDrag.currentX;
      const finalY = mesaDrag.currentY;
      const didDrag = mesaDrag.movedBeyondThreshold;

      if (mesaDrag.tokenEl) {
        mesaDrag.tokenEl.classList.remove('mesa-token-dragging', 'mesa-token-colliding');
        try {
          mesaDrag.tokenEl.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      mesaDrag.pointerId = null;
      mesaDrag.charId = null;
      mesaDrag.tokenEl = null;
      mesaDrag.movedBeyondThreshold = false;

      if (didDrag) {
        mesaDrag.suppressNextClick = true;
        setTimeout(() => {
          mesaDrag.suppressNextClick = false;
        }, 120);
        sendMesaFinalMove(charId, finalX, finalY);
      }
    }
  };

  window.addEventListener('pointerup', finishPointerInteraction);
  window.addEventListener('pointercancel', finishPointerInteraction);

  // Botões auxiliares de câmera na barra de ferramentas da Mesa
  document.getElementById('btn-mesa-center')?.addEventListener('click', () => {
    centerMesaDefaultView();
  });

  document.getElementById('btn-mesa-fit')?.addEventListener('click', () => {
    fitMesaAllToViewport();
  });

  document.getElementById('btn-mesa-zoom-in')?.addEventListener('click', () => {
    zoomMesaAtScreenPoint(mesaCamera.zoom + 0.15);
  });

  document.getElementById('btn-mesa-zoom-out')?.addEventListener('click', () => {
    zoomMesaAtScreenPoint(mesaCamera.zoom - 0.15);
  });

  document.getElementById('btn-mesa-zoom-reset')?.addEventListener('click', () => {
    zoomMesaAtScreenPoint(MESA_DEFAULT_ZOOM);
  });

  // Seletor de Qualidade Gráfica da Mesa (Aplicação Imediata em Tempo Real)
  const qualitySelect = document.getElementById('select-mesa-render-quality');
  if (qualitySelect) {
    qualitySelect.value = getMesaRenderQuality();
    const onQualityChange = (e) => {
      updateTableRenderQuality(e.target.value);
    };
    qualitySelect.addEventListener('change', onQualityChange);
    qualitySelect.addEventListener('input', onQualityChange);
  }
  updateTableRenderQuality(getMesaRenderQuality());

  // Busca na barra da Mesa: destaca e centraliza no personagem buscado
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = (state.searchQuery || '').trim().toLowerCase();
      if (!q) return;
      const matches = (state.characters || []).filter((c) => (c.name || '').toLowerCase().includes(q));
      if (matches.length > 0) {
        const target = matches[mesaSearchMatchIndex % matches.length];
        mesaSearchMatchIndex++;
        centerMesaCameraOnCards([target], Math.max(mesaCamera.zoom, 0.8));
      }
    }
  });
}

// ===========================================================================
// Qualidade Gráfica e Super-Sampling no Zoom Máximo
// ===========================================================================
const STORAGE_KEY_MESA_QUALITY = 'cmrpg_render_quality';

function getMesaRenderQuality() {
  try {
    const val = localStorage.getItem(STORAGE_KEY_MESA_QUALITY);
    if (val === '1' || val === '1.5' || val === '2') return val;
  } catch (_) {}
  return '2';
}

function updateTableRenderQuality(qualityStr) {
  const q = qualityStr === '1' || qualityStr === '1.5' ? qualityStr : '2';
  try {
    localStorage.setItem(STORAGE_KEY_MESA_QUALITY, q);
  } catch (_) {}

  const qualityMultiplier = parseFloat(q) || 1.5;
  const effectiveDpr = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1) * qualityMultiplier;
  const imageRenderingMode = q === '1' ? 'auto' : 'crisp-edges';

  const viewport = document.getElementById('mesa-viewport');
  const worldEl = document.getElementById('mesa-world');
  const tokensLayer = document.getElementById('mesa-tokens-layer');

  if (viewport) {
    viewport.classList.remove('mesa-quality-1x', 'mesa-quality-15x', 'mesa-quality-2x');
    if (q === '1') viewport.classList.add('mesa-quality-1x');
    else if (q === '2') viewport.classList.add('mesa-quality-2x');
    else viewport.classList.add('mesa-quality-15x');

    viewport.dataset.renderQuality = q;
    viewport.style.setProperty('--mesa-render-quality', String(qualityMultiplier));
    viewport.style.setProperty('--mesa-effective-dpr', String(effectiveDpr));
    viewport.style.imageRendering = imageRenderingMode;
    viewport.style.webkitFontSmoothing = q === '1' ? 'auto' : 'antialiased';
    viewport.style.textRendering = q === '1' ? 'optimizeSpeed' : 'geometricPrecision';
  }

  if (worldEl) {
    worldEl.dataset.renderQuality = q;
    worldEl.style.setProperty('--mesa-render-quality', String(qualityMultiplier));
    worldEl.style.setProperty('--mesa-effective-dpr', String(effectiveDpr));
    worldEl.style.imageRendering = imageRenderingMode;
    worldEl.style.backfaceVisibility = 'hidden';
    worldEl.style.transformStyle = q === '1' ? 'flat' : 'preserve-3d';

    // Invalida o buffer de textura da GPU para forçar re-rasterização imediata na nova resolução sem precisar de F5
    worldEl.style.willChange = 'auto';
    void worldEl.offsetHeight;
    applyMesaCameraTransform();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (worldEl) worldEl.style.willChange = 'transform';
      });
    } else {
      worldEl.style.willChange = 'transform';
    }
  }

  if (tokensLayer) {
    mesaCardHtmlCache.clear();
    renderMesaTab();
    tokensLayer.querySelectorAll('.mesa-token, .char-card').forEach((el) => {
      el.style.imageRendering = imageRenderingMode;
      el.style.webkitFontSmoothing = q === '1' ? 'auto' : 'antialiased';
      el.style.textRendering = q === '1' ? 'optimizeSpeed' : 'geometricPrecision';
      el.style.backfaceVisibility = 'hidden';
    });
  }

  if (viewport) {
    viewport.querySelectorAll('canvas').forEach((cv) => {
      applyCanvasSuperSampling(cv, mesaCamera.zoom);
    });
  }

  const select = document.getElementById('select-mesa-render-quality');
  if (select && select.value !== q) {
    select.value = q;
  }
}

function setMesaRenderQuality(qualityStr) {
  updateTableRenderQuality(qualityStr);
}

function applySuperSampling(canvas, zoomFactor = 1) {
  applyCanvasSuperSampling(canvas, zoomFactor);
}

function toggleCharacterCompactMode(charId) {
  if (!charId || typeof state === 'undefined') return;
  const char = (state.characters || []).find((c) => c.id === charId);
  if (!char) return;
  if (typeof canMoveCharacterOnMesa === 'function' && !canMoveCharacterOnMesa(char)) {
    return;
  }

  const nextCompact = !isCharMesaCompact(char);
  const nextW = nextCompact ? MESA_COMPACT_CARD_W : MESA_DEFAULT_CARD_W;
  const nextH = nextCompact ? MESA_COMPACT_CARD_H : MESA_DEFAULT_CARD_H;

  if (typeof commitMutation === 'function') {
    commitMutation(
      (st) => {
        const target = (st.characters || []).find((c) => c.id === charId);
        if (!target) return false;
        target.mesaCompact = nextCompact;
        target.isCompact = false;
        const tbl = ensureClientTableState(st);
        if (tbl) {
          tbl.sizes[charId] = { w: nextW, h: nextH };
          if (!nextCompact) {
            const pos = tbl.positions[charId];
            if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
              const worldW = Number(tbl.world.w || MESA_DEFAULT_WORLD_W);
              const worldH = Number(tbl.world.h || MESA_DEFAULT_WORLD_H);
              const split = Number(tbl.battle.split || Math.floor(worldH / 2));
              const battleActive = Boolean(st.battle?.isActive || tbl.battle.active);
              const region = mesaGetAllowedRegion(
                worldW,
                worldH,
                nextW,
                nextH,
                battleActive,
                split,
                Boolean(target.isEnemy)
              );
              const obstacles = [];
              (st.characters || []).forEach((other) => {
                if (other.id === charId) return;
                const op = tbl.positions[other.id];
                if (!op) return;
                const osz = isCharMesaCompact(other)
                  ? { w: MESA_COMPACT_CARD_W, h: MESA_COMPACT_CARD_H }
                  : tbl.sizes[other.id] || { w: MESA_DEFAULT_CARD_W, h: MESA_DEFAULT_CARD_H };
                obstacles.push({
                  id: other.id,
                  x: Math.round(op.x),
                  y: Math.round(op.y),
                  w: Math.round(osz.w),
                  h: Math.round(osz.h),
                });
              });
              const clamped = mesaClampToRegion(pos.x, pos.y, region);
              if (mesaOverlapsAny(clamped.x, clamped.y, nextW, nextH, obstacles, 0)) {
                tbl.positions[charId] = mesaNearestFree(clamped.x, clamped.y, nextW, nextH, obstacles, region, 12);
              } else {
                tbl.positions[charId] = clamped;
              }
            }
          }
        }
        return true;
      },
      { skipUndo: true }
    );
  } else {
    char.mesaCompact = nextCompact;
    char.isCompact = false;
    renderMesaTab();
  }

  queueMesaCardSizeReport(charId, nextW, nextH);
}

/**
 * Função utilitária para buffers Canvas com super-sampling nítido em zoom elevado.
 * Multiplica as dimensões internas por window.devicePixelRatio * zoomFactor * qualityMultiplier.
 */
function applyCanvasSuperSampling(canvas, zoomFactor = 1) {
  if (!canvas) return;
  const quality = parseFloat(getMesaRenderQuality()) || 1.5;
  const dpr = (window.devicePixelRatio || 1) * quality;
  const rect = canvas.getBoundingClientRect();
  const displayW = rect.width || canvas.clientWidth || 300;
  const displayH = rect.height || canvas.clientHeight || 150;
  const z = Math.max(1, Number(zoomFactor) || 1);
  const targetW = Math.round(displayW * dpr * z);
  const targetH = Math.round(displayH * dpr * z);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
  }
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
}

function isCharMesaCompact(char) {
  if (!char || typeof char !== 'object') return false;
  return Boolean(char.mesaCompact || char.isCompact);
}

// Exportação para testes automatizados em Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isCharMesaCompact,
    mesaGetAllowedRegion,
    mesaClampToRegion,
    mesaInRegion,
    mesaRectsOverlap,
    mesaOverlapsAny,
    mesaSlideMove,
    mesaNearestFree,
    mesaResolveMove,
    ensureClientTableState,
    reconcileMesaTableStateClient,
    enterMesaBattleClient,
    exitMesaBattleClient,
    getMesaRenderQuality,
    setMesaRenderQuality,
    updateTableRenderQuality,
    applySuperSampling,
    applyCanvasSuperSampling,
    toggleCharacterCompactMode,
  };
}

  // ===========================================================================
  // Conexão WebSocket com Reconexão Automática
  // ===========================================================================
  // Sistema de Cursores Colaborativos em Tempo Real (Multiplayer Cursors)
  // ===========================================================================
  function getOrAssignLocalCursorClientId() {
    if (state.localCursorClientId) return state.localCursorClientId;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY_CURSOR_CLIENT_ID);
      if (saved) {
        state.localCursorClientId = saved;
        return saved;
      }
    } catch (_) {}
    const generated = `cursor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    state.localCursorClientId = generated;
    try {
      sessionStorage.setItem(SESSION_KEY_CURSOR_CLIENT_ID, generated);
    } catch (_) {}
    return generated;
  }

  function loadStoredCursorColorsMap() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CURSOR_COLOR_MAP);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    return {};
  }

  function saveStoredCursorColorForKey(memberKey, hexColor) {
    if (!memberKey || !hexColor) return;
    try {
      const map = loadStoredCursorColorsMap();
      map[memberKey] = hexColor;
      localStorage.setItem(STORAGE_KEY_CURSOR_COLOR_MAP, JSON.stringify(map));
    } catch (_) {}
  }

  function isValidPaletteColor(hex) {
    if (!hex) return false;
    const upper = String(hex).trim().toUpperCase();
    if (upper === 'RGB_CHROMA') return true;
    return CURSOR_COLOR_PALETTE.some((c) => c.hex.toUpperCase() === upper);
  }

  function normalizePaletteColor(hex) {
    if (!hex) return null;
    const upper = String(hex).trim().toUpperCase();
    if (upper === 'RGB_CHROMA') return 'RGB_CHROMA';
    const found = CURSOR_COLOR_PALETTE.find((c) => c.hex.toUpperCase() === upper);
    return found ? found.hex : null;
  }

  function getColorNameByHex(hex) {
    const norm = normalizePaletteColor(hex);
    if (norm === 'RGB_CHROMA') return 'RGB Cromático (Transição Suave)';
    const found = CURSOR_COLOR_PALETTE.find((c) => c.hex === norm);
    return found ? found.name : 'Cor Personalizada';
  }

  function assignPermanentMemberCursorColor(memberKey, preferredHex = null, usedHexList = []) {
    const key = String(memberKey || 'player').trim();
    if (key === 'host_master' || String(preferredHex || '').toUpperCase() === 'RGB_CHROMA') {
      return 'RGB_CHROMA';
    }

    const normPreferred = normalizePaletteColor(preferredHex);
    if (normPreferred) {
      saveStoredCursorColorForKey(key, normPreferred);
      return normPreferred;
    }

    const storedMap = loadStoredCursorColorsMap();
    const storedColor = normalizePaletteColor(storedMap[key]);
    if (storedColor) {
      return storedColor;
    }

    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    const baseIdx = h % CURSOR_COLOR_PALETTE.length;

    const usedSet = new Set(
      (usedHexList || [])
        .map((c) => String(c || '').toUpperCase())
        .filter((c) => c !== 'RGB_CHROMA')
    );
    for (let offset = 0; offset < CURSOR_COLOR_PALETTE.length; offset++) {
      const candidate = CURSOR_COLOR_PALETTE[(baseIdx + offset) % CURSOR_COLOR_PALETTE.length].hex;
      if (!usedSet.has(candidate.toUpperCase())) {
        saveStoredCursorColorForKey(key, candidate);
        return candidate;
      }
    }

    const fallback = CURSOR_COLOR_PALETTE[baseIdx].hex;
    saveStoredCursorColorForKey(key, fallback);
    return fallback;
  }

  function ensureMembersHavePermanentCursorColors() {
    const used = [];
    for (const m of state.members || []) {
      if (!m) continue;
      const isMasterRole = m.role === 'MESTRE' || m.id === 'host_master';
      if (isMasterRole) {
        m.cursorColor = 'RGB_CHROMA';
        continue;
      }
      const key = m.id || (m.ip ? `ip_${m.ip}` : 'player');
      const assigned = assignPermanentMemberCursorColor(key, m.cursorColor, used);
      m.cursorColor = assigned;
      used.push(assigned);
    }
  }

  function getLocalPlayerCursorIdentity() {
    const activeMem = getActiveMember();
    const isMaster = isEffectiveMaster();
    const memberKey = activeMem?.id || state.localMemberId || `ip_${state.localClientIp}`;
    const color = isMaster ? 'RGB_CHROMA' : assignPermanentMemberCursorColor(memberKey, activeMem?.cursorColor);
    if (activeMem) {
      activeMem.cursorColor = color;
    }
    const rawNick = (activeMem?.nickname || activeMem?.name || '').trim();
    const nickname = rawNick || (isMaster ? 'Mestre' : `Jogador (${state.localClientIp})`);
    return {
      clientId: getOrAssignLocalCursorClientId(),
      memberId: memberKey,
      nickname,
      color,
      isMaster,
    };
  }

  function computeLocalProportionalCursorPayload(clientX, clientY) {
    const vw = Math.max(0, Math.min(1, clientX / Math.max(1, window.innerWidth)));
    const vh = Math.max(0, Math.min(1, clientY / Math.max(1, window.innerHeight)));

    // 1. Verifica se há algum modal aberto sob o cursor
    const openModals = Array.from(document.querySelectorAll('.modal-backdrop:not(.hidden)'));
    for (let i = openModals.length - 1; i >= 0; i--) {
      const bd = openModals[i];
      const panel = bd.querySelector('.modal-panel');
      if (panel) {
        const r = panel.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
          return {
            region: 'modal',
            modalId: bd.id || '',
            relX: Number(((clientX - r.left) / r.width).toFixed(4)),
            relY: Number(((clientY - r.top) / r.height).toFixed(4)),
            vw: Number(vw.toFixed(4)),
            vh: Number(vh.toFixed(4)),
          };
        }
      }
    }

    // 2. Verifica se o cursor está sobre o menu lateral esquerdo (#app-sidebar)
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      const sr = sidebar.getBoundingClientRect();
      if (sr.width > 0 && sr.height > 0 && sr.right > 0 && clientX >= sr.left && clientX <= sr.right && clientY >= sr.top && clientY <= sr.bottom) {
        return {
          region: 'sidebar',
          modalId: '',
          relX: Number(((clientX - sr.left) / sr.width).toFixed(4)),
          relY: Number(((clientY - sr.top) / sr.height).toFixed(4)),
          vw: Number(vw.toFixed(4)),
          vh: Number(vh.toFixed(4)),
        };
      }
    }

    // 3. Posicionamento proporcional em relação à seção ativa / área útil principal (compensa scroll e largura do monitor)
    const activeSec = document.getElementById(`tab-${state.activeTab}`) || document.querySelector('main');
    if (activeSec) {
      const mr = activeSec.getBoundingClientRect();
      if (mr.width > 0 && mr.height > 0) {
        return {
          region: 'main',
          modalId: '',
          relX: Number(((clientX - mr.left) / mr.width).toFixed(4)),
          relY: Number(((clientY - mr.top) / mr.height).toFixed(4)),
          vw: Number(vw.toFixed(4)),
          vh: Number(vh.toFixed(4)),
        };
      }
    }

    return {
      region: 'viewport',
      modalId: '',
      relX: Number(vw.toFixed(4)),
      relY: Number(vh.toFixed(4)),
      vw: Number(vw.toFixed(4)),
      vh: Number(vh.toFixed(4)),
    };
  }

  function computeRemoteCursorScreenXY(cursor) {
    let x = (cursor.vw ?? 0.5) * window.innerWidth;
    let y = (cursor.vh ?? 0.5) * window.innerHeight;

    if (cursor.region === 'modal' && cursor.modalId) {
      const bd = document.getElementById(cursor.modalId);
      const panel = bd && !bd.classList.contains('hidden') ? bd.querySelector('.modal-panel') : null;
      if (panel) {
        const r = panel.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          x = r.left + Number(cursor.relX || 0.5) * r.width;
          y = r.top + Number(cursor.relY || 0.5) * r.height;
        }
      }
    } else if (cursor.region === 'sidebar') {
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar) {
        const sr = sidebar.getBoundingClientRect();
        if (sr.width > 0 && sr.height > 0 && sr.right > 0) {
          x = sr.left + Number(cursor.relX || 0.5) * sr.width;
          y = sr.top + Number(cursor.relY || 0.5) * sr.height;
        }
      }
    } else if (cursor.region === 'main') {
      const activeSec = document.getElementById(`tab-${state.activeTab}`) || document.querySelector('main');
      if (activeSec) {
        const mr = activeSec.getBoundingClientRect();
        if (mr.width > 0 && mr.height > 0) {
          x = mr.left + Number(cursor.relX || 0.5) * mr.width;
          y = mr.top + Number(cursor.relY || 0.5) * mr.height;
        }
      }
    }

    const clampedX = Math.max(2, Math.min(window.innerWidth - 18, x));
    const clampedY = Math.max(2, Math.min(window.innerHeight - 18, y));
    return { x: Math.round(clampedX), y: Math.round(clampedY) };
  }

  function sendCursorMoveNow(clientX, clientY) {
    if (!state.wsConnected || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    const identity = getLocalPlayerCursorIdentity();
    const coords = computeLocalProportionalCursorPayload(clientX, clientY);
    state.lastCursorSentAt = performance.now();
    try {
      state.ws.send(
        JSON.stringify({
          type: 'cursor_move',
          clientId: identity.clientId,
          memberId: identity.memberId,
          nickname: identity.nickname,
          color: identity.color,
          isMaster: identity.isMaster,
          activeTab: state.activeTab,
          ...coords,
        })
      );
    } catch (_) {}
  }

  function scheduleSendCursorMove(clientX, clientY) {
    state.lastLocalPointer = { x: clientX, y: clientY, hasMoved: true };
    if (!state.wsConnected || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    const elapsed = now - state.lastCursorSentAt;

    if (elapsed >= CURSOR_THROTTLE_MS) {
      if (state.cursorThrottleTimer) {
        clearTimeout(state.cursorThrottleTimer);
        state.cursorThrottleTimer = null;
      }
      sendCursorMoveNow(clientX, clientY);
    } else if (!state.cursorThrottleTimer) {
      const remaining = Math.max(8, CURSOR_THROTTLE_MS - elapsed);
      state.cursorThrottleTimer = setTimeout(() => {
        state.cursorThrottleTimer = null;
        if (state.lastLocalPointer.hasMoved) {
          sendCursorMoveNow(state.lastLocalPointer.x, state.lastLocalPointer.y);
        }
      }, remaining);
    }
  }

  function createOrUpdateRemoteCursorElement(cursor) {
    const layer = document.getElementById('multiplayer-cursors-layer');
    if (!layer) return;

    const isMaster = Boolean(cursor.isMaster || cursor.color === 'RGB_CHROMA');
    let el = cursor.el;
    if (!el || !layer.contains(el)) {
      el = document.createElement('div');
      el.className = `remote-cursor cursor-hidden ${isMaster ? 'cursor-master-rgb' : ''}`;
      el.setAttribute('data-cursor-id', cursor.cursorId);
      el.innerHTML = `
        <svg class="remote-cursor-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            class="remote-cursor-arrow-path"
            d="M4.2 2.6L19.8 11.1C20.7 11.6 20.5 13.0 19.5 13.2L12.6 14.7L9.3 20.9C8.8 21.8 7.4 21.6 7.2 20.6L3.0 4.0C2.8 2.9 3.4 2.1 4.2 2.6Z"
            fill="${isMaster ? '#ff2255' : escapeHtml(cursor.color)}"
            stroke="#FFFFFF"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
        <div class="remote-cursor-badge">
          ${
            isMaster
              ? '<iconify-icon icon="game-icons:crown" class="text-amber-300"></iconify-icon>'
              : '<span class="remote-cursor-badge-dot"></span>'
          }
          <span class="remote-cursor-badge-name"></span>
        </div>
      `;
      layer.appendChild(el);
      cursor.el = el;
    }

    if (isMaster) {
      el.classList.add('cursor-master-rgb');
      const badge = el.querySelector('.remote-cursor-badge');
      if (badge && !badge.querySelector('iconify-icon[icon="game-icons:crown"]')) {
        badge.innerHTML = `
          <iconify-icon icon="game-icons:crown" class="text-amber-300"></iconify-icon>
          <span class="remote-cursor-badge-name"></span>
        `;
      }
    } else {
      el.classList.remove('cursor-master-rgb');
      el.style.setProperty('--cursor-color', cursor.color);
      const arrowPath = el.querySelector('.remote-cursor-arrow-path');
      if (arrowPath) arrowPath.setAttribute('fill', cursor.color);
      const badge = el.querySelector('.remote-cursor-badge');
      if (badge && !badge.querySelector('.remote-cursor-badge-dot')) {
        badge.innerHTML = `
          <span class="remote-cursor-badge-dot"></span>
          <span class="remote-cursor-badge-name"></span>
        `;
      }
    }

    const nameEl = el.querySelector('.remote-cursor-badge-name');
    if (nameEl && nameEl.textContent !== cursor.nickname) {
      nameEl.textContent = cursor.nickname;
    }

    const isSameTab = cursor.activeTab === state.activeTab;
    const isFresh = Date.now() - cursor.lastSeen <= CURSOR_INACTIVITY_MS;

    if (isSameTab && isFresh) {
      const { x, y } = computeRemoteCursorScreenXY(cursor);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.classList.remove('cursor-hidden');
    } else {
      el.classList.add('cursor-hidden');
    }
  }

  function renderSidebarRemoteCursorIndicators() {
    const now = Date.now();
    const byTab = {};
    Object.keys(TAB_TITLES).forEach((t) => {
      byTab[t] = [];
    });

    for (const cursor of state.remoteCursors.values()) {
      if (now - cursor.lastSeen > CURSOR_INACTIVITY_MS) continue;
      const tab = cursor.activeTab || 'overview';
      if (!byTab[tab]) byTab[tab] = [];
      // Exibe bolinha + nome no menu lateral quando o jogador está noutra aba (ou para identificar em qual seção está)
      if (tab !== state.activeTab) {
        byTab[tab].push(cursor);
      }
    }

    document.querySelectorAll('[data-nav-cursors]').forEach((container) => {
      const tabId = container.getAttribute('data-nav-cursors');
      const list = byTab[tabId] || [];
      if (list.length === 0) {
        if (container.innerHTML !== '') container.innerHTML = '';
        return;
      }
      container.innerHTML = list
        .map((c) => {
          const isMaster = Boolean(c.isMaster || c.color === 'RGB_CHROMA');
          if (isMaster) {
            return `
              <span
                class="sidebar-cursor-pill pill-master-rgb"
                title="${escapeHtml(c.nickname)} (Mestre) está em ${TAB_TITLES[tabId] || tabId}"
              >
                <iconify-icon icon="game-icons:crown" class="text-amber-300 text-[10px]"></iconify-icon>
                <span>${escapeHtml(c.nickname)}</span>
              </span>
            `;
          }
          return `
            <span
              class="sidebar-cursor-pill"
              style="--cursor-color: ${escapeHtml(c.color)}"
              title="${escapeHtml(c.nickname)} está em ${TAB_TITLES[tabId] || tabId}"
            >
              <span class="sidebar-cursor-pill-dot"></span>
              <span>${escapeHtml(c.nickname)}</span>
            </span>
          `;
        })
        .join('');
    });
  }

  function refreshAllRemoteCursorsVisibility() {
    for (const cursor of state.remoteCursors.values()) {
      // Sincroniza cor/apelido mais recente se o membro tiver sido atualizado
      const mem = (state.members || []).find(
        (m) => m.id === cursor.memberId || (cursor.ip && m.ip === cursor.ip)
      );
      if (mem) {
        const isMaster = mem.role === 'MESTRE' || mem.id === 'host_master';
        if (isMaster) {
          cursor.isMaster = true;
          cursor.color = 'RGB_CHROMA';
        } else if (mem.cursorColor) {
          cursor.color = normalizePaletteColor(mem.cursorColor) || cursor.color;
        }
        if (mem.nickname && mem.nickname.trim()) {
          cursor.nickname = mem.nickname.trim();
        }
      }
      createOrUpdateRemoteCursorElement(cursor);
    }
    renderSidebarRemoteCursorIndicators();
  }

  function handleIncomingCursorMove(data) {
    const cursorId = String(data.cursorId || data.connId || '').trim();
    if (!cursorId || cursorId === getOrAssignLocalCursorClientId()) return;

    const memberObj = (state.members || []).find(
      (m) => m.id === data.memberId || (data.ip && m.ip === data.ip)
    );
    const isMaster = Boolean(
      data.isMaster ||
      data.isHost ||
      data.memberId === 'host_master' ||
      memberObj?.role === 'MESTRE' ||
      memberObj?.id === 'host_master'
    );
    const resolvedColor = isMaster
      ? 'RGB_CHROMA'
      : (normalizePaletteColor(memberObj?.cursorColor) ||
         normalizePaletteColor(data.color) ||
         assignPermanentMemberCursorColor(data.memberId || cursorId));
    const resolvedNickname =
      (memberObj?.nickname && memberObj.nickname.trim()) ||
      String(data.nickname || '').trim() ||
      (isMaster ? 'Mestre' : `Jogador (${data.ip || ''})`);

    let existing = state.remoteCursors.get(cursorId);
    if (!existing) {
      existing = {
        cursorId,
        connId: data.connId || '',
        memberId: data.memberId || '',
        ip: data.ip || '',
        isMaster,
        nickname: resolvedNickname,
        color: resolvedColor,
        activeTab: data.activeTab || 'overview',
        region: data.region || 'main',
        modalId: data.modalId || '',
        relX: Number(data.relX ?? 0.5),
        relY: Number(data.relY ?? 0.5),
        vw: Number(data.vw ?? 0.5),
        vh: Number(data.vh ?? 0.5),
        lastSeen: Date.now(),
        el: null,
      };
      state.remoteCursors.set(cursorId, existing);
    } else {
      existing.connId = data.connId || existing.connId;
      existing.memberId = data.memberId || existing.memberId;
      existing.ip = data.ip || existing.ip;
      existing.isMaster = isMaster;
      existing.nickname = resolvedNickname;
      existing.color = resolvedColor;
      existing.activeTab = data.activeTab || 'overview';
      existing.region = data.region || 'main';
      existing.modalId = data.modalId || '';
      existing.relX = Number(data.relX ?? 0.5);
      existing.relY = Number(data.relY ?? 0.5);
      existing.vw = Number(data.vw ?? 0.5);
      existing.vh = Number(data.vh ?? 0.5);
      existing.lastSeen = Date.now();
    }

    createOrUpdateRemoteCursorElement(existing);
    renderSidebarRemoteCursorIndicators();
  }

  function handleIncomingCursorDisconnect(data) {
    const cursorId = String(data.cursorId || '').trim();
    const connId = String(data.connId || '').trim();

    for (const [key, cursor] of state.remoteCursors.entries()) {
      if ((cursorId && key === cursorId) || (connId && cursor.connId === connId)) {
        if (cursor.el) {
          cursor.el.classList.add('cursor-hidden');
          const elToRemove = cursor.el;
          setTimeout(() => elToRemove.remove(), 240);
        }
        state.remoteCursors.delete(key);
      }
    }
    renderSidebarRemoteCursorIndicators();
  }

  function cleanupInactiveRemoteCursors() {
    const now = Date.now();
    let changed = false;
    for (const [key, cursor] of state.remoteCursors.entries()) {
      const idleMs = now - cursor.lastSeen;
      if (idleMs > CURSOR_INACTIVITY_MS) {
        if (cursor.el && !cursor.el.classList.contains('cursor-hidden')) {
          cursor.el.classList.add('cursor-hidden');
          changed = true;
        }
        if (idleMs > CURSOR_INACTIVITY_MS + 15000) {
          cursor.el?.remove();
          state.remoteCursors.delete(key);
          changed = true;
        }
      }
    }
    if (changed) {
      renderSidebarRemoteCursorIndicators();
    }
  }

  function initMultiplayerCursorsTracking() {
    getOrAssignLocalCursorClientId();
    ensureMembersHavePermanentCursorColors();

    const localFollower = document.getElementById('local-master-cursor');
    if (localFollower) localFollower.remove();

    window.addEventListener(
      'mousemove',
      (e) => {
        scheduleSendCursorMove(e.clientX, e.clientY);
      },
      { passive: true }
    );

    window.addEventListener(
      'scroll',
      () => {
        refreshAllRemoteCursorsVisibility();
      },
      { passive: true }
    );

    window.addEventListener(
      'resize',
      () => {
        refreshAllRemoteCursorsVisibility();
      },
      { passive: true }
    );

    window.addEventListener('beforeunload', () => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        try {
          state.ws.send(
            JSON.stringify({
              type: 'cursor_disconnect',
              clientId: getOrAssignLocalCursorClientId(),
            })
          );
        } catch (_) {}
      }
    });

    if (state.cursorCleanupTimer) clearInterval(state.cursorCleanupTimer);
    state.cursorCleanupTimer = setInterval(cleanupInactiveRemoteCursors, 2000);
  }

  // ===========================================================================
  // Conexão WebSocket com Reconexão Automática
  // ===========================================================================
  function setWsStatusUI(connected) {
    const dot = document.getElementById('ws-status-dot');
    const txt = document.getElementById('ws-status-text');
    if (!dot || !txt) return;
    if (connected) {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shrink-0';
      txt.textContent = 'ONLINE • SINCRONIZADO';
      txt.className = 'font-bold tracking-wider uppercase truncate text-emerald-400';
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0';
      txt.textContent = 'MODO LOCAL / RECONECTANDO';
      txt.className = 'font-bold tracking-wider uppercase truncate text-amber-400';
    }
  }

  function connectWebSocket() {
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    if (!window.location.host) {
      state.wsConnected = false;
      setWsStatusUI(false);
      updateHistoryButtonsUI();
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      state.ws = ws;

      ws.addEventListener('open', () => {
        state.wsConnected = true;
        setWsStatusUI(true);
        updateHistoryButtonsUI();
        if (state.pingTimer) clearInterval(state.pingTimer);
        state.pingTimer = setInterval(() => {
          if (state.ws && state.ws.readyState === WebSocket.OPEN) {
            state.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      });

      ws.addEventListener('message', (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === 'cursor_move') {
            handleIncomingCursorMove(data);
            return;
          }
          if (data.type === 'cursor_disconnect') {
            handleIncomingCursorDisconnect(data);
            return;
          }
          if (data.type === 'state_sync') {
            if (data.identity) {
              state.isHost = Boolean(data.identity.is_host);
              state.localClientIp = data.identity.client_ip || state.localClientIp;
              state.localMemberId =
                data.identity.member_id || (state.isHost ? 'host_master' : `ip_${state.localClientIp}`);
              try {
                localStorage.setItem(STORAGE_KEY_MEMBER_ID, state.localMemberId);
              } catch (_) {}
              if (!state.isHost) {
                state.simulatingPlayer = false;
              }
            }
            if (data.network) state.network = data.network;
            if (data.room) state.room = data.room;
            if (Array.isArray(data.members)) {
              state.members = data.members;
              sanitizeLegacyMembersClient();
              ensureMembersHavePermanentCursorColors();
            }
            if (Array.isArray(data.itemsCatalog)) state.itemsCatalog = data.itemsCatalog;
            if (Array.isArray(data.characters)) {
              state.characters = data.characters;
              state.characters.forEach(recalculateCharacterDerived);
            }
            if (Array.isArray(data.npcs)) state.npcs = data.npcs;
            if (Array.isArray(data.escrowSales)) state.escrowSales = data.escrowSales;
            if (Array.isArray(data.bestiary)) state.bestiary = data.bestiary;
            if (data.battle) state.battle = data.battle;
            if (Array.isArray(data.quests)) state.quests = data.quests;
            if (Array.isArray(data.auditLog)) state.auditLog = data.auditLog;
            if (Array.isArray(data.customPermissionPresets)) state.customPermissionPresets = data.customPermissionPresets;

            state.serverCanUndo = Boolean(data.can_undo);
            state.serverCanRedo = Boolean(data.can_redo);

            saveStateToLocalStorage();
            updateHistoryButtonsUI();
            renderAll();
            refreshAllRemoteCursorsVisibility();

            if (Array.isArray(data.toasts)) {
              for (const t of data.toasts) showToast(t);
            }
          } else if (data.type === 'toast' && data.message) {
            showToast(data.message);
          }
        } catch (err) {
          console.warn('[CMrpg] Erro no payload WS:', err);
        }
      });

      ws.addEventListener('close', () => {
        state.wsConnected = false;
        if (state.pingTimer) clearInterval(state.pingTimer);
        setWsStatusUI(false);
        updateHistoryButtonsUI();
        state.reconnectTimer = setTimeout(connectWebSocket, 2200);
      });

      ws.addEventListener('error', () => ws.close());
    } catch (_) {
      state.wsConnected = false;
      setWsStatusUI(false);
      state.reconnectTimer = setTimeout(connectWebSocket, 2500);
    }
  }

  // ===========================================================================
  // Navegação de Abas (Sidebar + Topbar)
  // ===========================================================================
  const TAB_TITLES = {
    overview: 'VISÃO GERAL',
    characters: 'PERSONAGENS & FICHAS',
    catalog: 'CATÁLOGO DE ITENS',
    shop: 'LOJA & MERCADORES',
    bestiary: 'BESTIÁRIO',
    quests: 'MISSÕES',
    admin: 'ADMINISTRAÇÃO',
  };

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('[data-nav-tab]').forEach((btn) => {
      if (btn.getAttribute('data-nav-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.tab-section').forEach((sec) => {
      if (sec.id === `tab-${tabId}`) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    });

    const bcSec = document.getElementById('topbar-section-breadcrumb');
    if (bcSec) bcSec.textContent = TAB_TITLES[tabId] || 'VISÃO GERAL';

    // Fecha menu mobile caso aberto
    document.getElementById('app-sidebar')?.classList.add('-translate-x-full');
    document.getElementById('sidebar-mobile-backdrop')?.classList.add('hidden');

    renderAll();
    refreshAllRemoteCursorsVisibility();
    if (state.lastLocalPointer.hasMoved) {
      sendCursorMoveNow(state.lastLocalPointer.x, state.lastLocalPointer.y);
    }
  }

  // ===========================================================================
  // Renderização Global e de Cada Seção
  // ===========================================================================
  function calcPercentage(cur, max) {
    if (max <= 0) return cur > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, (cur / max) * 100));
  }

  function renderHeaderAndSidebarBadges() {
    updateRoleUI();

    const rName = state.room?.name || 'SALA1';
    const rSub = state.room?.subtitle || 'TESTES DE TUDOO';
    const rQuote = state.room?.quote || '';
    const curName = state.room?.currencyName || 'Ouro';

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('sidebar-room-name', rName);
    setTxt('sidebar-room-subtitle', rSub);
    setTxt('topbar-room-breadcrumb', rName);
    setTxt('hero-room-name', rName);
    setTxt('hero-room-subtitle', rSub);
    setTxt('hero-room-quote', rQuote);

    setTxt('topbar-gold-amount', String(state.room?.sharedGold ?? 0));
    setTxt('topbar-currency-name', curName.toUpperCase());

    const visibleItems = (state.itemsCatalog || []).filter(
      (i) => isEffectiveMaster() || i.visivelParaJogadores !== false
    );
    setTxt('badge-chars-count', String(state.characters.length));
    setTxt('badge-items-count', String(visibleItems.length));
    setTxt('badge-npcs-count', String(state.npcs.length));
    setTxt('badge-quests-count', String(state.quests.length));
    const visibleBestiary = isEffectiveMaster() ? (state.bestiary || []) : (state.bestiary || []).filter((b) => b.reveladoParaJogadores);
    setTxt('badge-bestiary-count', String(visibleBestiary.length));

    const combatDot = document.getElementById('combat-nav-dot');
    if (combatDot) {
      combatDot.className = state.battle?.isActive
        ? 'w-2.5 h-2.5 rounded-full bg-red-400 animate-ping'
        : 'w-2.5 h-2.5 rounded-full bg-red-500/60';
    }

    const hostIp = state.network?.preferred_ip || window.location.hostname || '127.0.0.1';
    const inviteUrl = state.network?.invite_url || window.location.origin || `http://${hostIp}:8000`;
    setTxt('overview-invite-url', inviteUrl);
    setTxt('overview-host-ip', hostIp);
  }

  // ---------------------------------------------------------------------------
  // ABA 1: VISÃO GERAL (IPs Conectados em Tempo Real & Membros por IP/Apelido)
  // ---------------------------------------------------------------------------
  function renderOverviewTab() {
    const hostIp = state.network?.preferred_ip || window.location.hostname || '127.0.0.1';

    // 1. Renderizar barra de IPs Conectados no Momento (Ao Vivo via WebSocket)
    const liveIpsEl = document.getElementById('live-connected-ips-list');
    const liveIpsCountEl = document.getElementById('connected-ips-count');
    if (liveIpsEl) {
      let connectedList = Array.isArray(state.network?.connected_ips) ? state.network.connected_ips : [];
      if (connectedList.length === 0) {
        // Fallback se estiver visualizando sem WS aberto ainda
        connectedList = (state.members || [])
          .filter((m) => m.online)
          .map((m) => ({
            ip: m.ip || hostIp,
            count: m.connectionsCount || 1,
            isHost: m.role === 'MESTRE' || m.id === 'host_master',
          }));
      }

      if (liveIpsCountEl) liveIpsCountEl.textContent = String(connectedList.length);

      if (connectedList.length === 0) {
        liveIpsEl.innerHTML = `<span class="text-xs app-muted italic">Nenhuma conexão ativa detectada no momento.</span>`;
      } else {
        liveIpsEl.innerHTML = connectedList
          .map((conn) => {
            const memberObj = (state.members || []).find(
              (m) => m.ip === conn.ip || (conn.isHost && (m.role === 'MESTRE' || m.id === 'host_master'))
            );
            const displayNick = memberObj?.nickname || memberObj?.name || (conn.isHost ? 'Mestre' : 'Sem apelido');
            const memberIdAttr = memberObj ? `data-edit-member="${escapeHtml(memberObj.id)}"` : '';
            const cursorColor = assignPermanentMemberCursorColor(
              memberObj?.id || (conn.isHost ? 'host_master' : `ip_${conn.ip}`),
              memberObj?.cursorColor
            );

            return `
            <div
              ${memberIdAttr}
              title="${isEffectiveMaster() ? 'Clique para dar/editar apelido e cor deste IP' : 'Conectado em tempo real'}"
              class="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs transition ${
                conn.isHost
                  ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                  : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              } ${memberObj ? 'cursor-pointer hover:border-amber-300' : ''}"
            >
              ${
                conn.isHost || cursorColor === 'RGB_CHROMA'
                  ? `<span class="w-3 h-3 rounded-full shrink-0 border border-white/60 rgb-smooth-bg-cycle inline-block" title="Cursor do Mestre: Transição RGB Suave"></span>`
                  : `<span class="w-2.5 h-2.5 rounded-full shrink-0 border border-white/50" style="background-color: ${escapeHtml(cursorColor)}" title="Cor do Cursor: ${escapeHtml(getColorNameByHex(cursorColor))}"></span>`
              }
              <span class="font-mono font-black tracking-wide">${escapeHtml(conn.ip)}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                conn.isHost ? 'bg-amber-400 text-black' : 'bg-black/40 text-amber-300'
              }">
                ${conn.isHost ? '<iconify-icon icon="game-icons:crown"></iconify-icon> HOST (MESTRE)' : `<iconify-icon icon="game-icons:hooded-figure"></iconify-icon> ${escapeHtml(displayNick)}`}
              </span>
              ${
                conn.isHost && displayNick && displayNick !== 'Mestre'
                  ? `<span class="text-[11px] font-bold gold-title">(${escapeHtml(displayNick)})</span>`
                  : ''
              }
              <span class="text-[10px] font-mono opacity-75">• ${conn.count || 1} aba(s)</span>
            </div>
          `;
          })
          .join('');
      }
    }

    // 2. Renderizar Tabela de Membros da Sala (IP Principal = Mestre + Jogadores por IP com Apelido)
    const tbody = document.getElementById('members-table-body');
    const countEl = document.getElementById('members-count-label');
    if (!tbody) return;

    const q = state.memberSearchQuery.trim().toLowerCase();
    const roleFilter = state.memberRoleFilter;

    const filtered = (state.members || []).filter((m) => {
      if (roleFilter !== 'ALL' && m.role !== roleFilter) return false;
      const mName = String(m.name || '').toLowerCase();
      const mNick = String(m.nickname || '').toLowerCase();
      const mIp = String(m.ip || '').toLowerCase();
      const mTitle = String(m.title || '').toLowerCase();
      return mName.includes(q) || mNick.includes(q) || mIp.includes(q) || mTitle.includes(q);
    });

    if (countEl) countEl.textContent = String(filtered.length);

    const charsById = {};
    for (const c of state.characters) charsById[c.id] = c;

    const activeMemberId = getActiveMember()?.id;

    tbody.innerHTML = filtered
      .map((m) => {
        const isMasterRole = m.role === 'MESTRE' || m.id === 'host_master';
        const memberIp = m.ip || (isMasterRole ? hostIp : 'IP Desconhecido');
        const hasCustomNickname = Boolean(m.nickname && m.nickname.trim());
        const displayName = hasCustomNickname
          ? m.nickname.trim()
          : isMasterRole
          ? 'Mestre (Host)'
          : `Jogador (${memberIp})`;
        const linkedChars = state.characters.filter(
          (c) =>
            c.id === m.characterId ||
            c.ownerMemberId === m.id ||
            (m.ip && c.ownerIp && c.ownerIp === m.ip)
        );
        const isMe = m.id === activeMemberId || (state.localClientIp && m.ip === state.localClientIp);
        const isOnline = Boolean(m.online);
        const memberCursorColor = assignPermanentMemberCursorColor(
          m.id || (isMasterRole ? 'host_master' : `ip_${memberIp}`),
          m.cursorColor
        );

        return `
        <tr class="hover:bg-amber-500/5 transition">
          <td class="py-3.5 px-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full ${
                isMasterRole
                  ? 'bg-amber-500/20 border-amber-400/60 rgb-avatar-box-shadow'
                  : 'bg-amber-500/10 border-amber-500/30'
              } border flex items-center justify-center text-base shrink-0" ${
                isMasterRole
                  ? ''
                  : `style="border-color: ${escapeHtml(memberCursorColor)};"`
              }>
                ${isMasterRole ? '<iconify-icon icon="game-icons:crown" class="gold-title"></iconify-icon>' : '<iconify-icon icon="game-icons:hooded-figure"></iconify-icon>'}
              </div>
              <div>
                <div class="font-bold text-sm app-title flex flex-wrap items-center gap-2">
                  ${
                    isMasterRole || memberCursorColor === 'RGB_CHROMA'
                      ? `<span class="w-3 h-3 rounded-full inline-block shrink-0 border border-white/60 rgb-smooth-bg-cycle" title="Cursor do Mestre: Transição RGB Suave"></span>`
                      : `<span class="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-white/50" style="background-color: ${escapeHtml(memberCursorColor)}" title="Cor do Cursor: ${escapeHtml(getColorNameByHex(memberCursorColor))}"></span>`
                  }
                  <span>${escapeHtml(displayName)}</span>
                  ${isMe ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 gold-title border border-amber-500/30">VOCÊ</span>' : ''}
                  ${
                    !isMasterRole && !hasCustomNickname
                      ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">Sem apelido</span>'
                      : ''
                  }
                </div>
                <div class="text-[11px] app-muted">
                  ${
                    isMasterRole
                      ? `Host Principal da Sala (Sempre Mestre)`
                      : hasCustomNickname
                      ? `Apelido definido pelo Mestre para o IP ${escapeHtml(memberIp)}`
                      : `Clique em "Dar Apelido" para identificar este IP`
                  }
                </div>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-5">
            <div class="flex flex-wrap items-center gap-2">
              <code class="px-2.5 py-1 rounded-lg bg-black/35 border app-divider-border font-mono font-bold text-xs gold-title">
                <iconify-icon icon="game-icons:crystal-ball"></iconify-icon> ${escapeHtml(memberIp)}
              </code>
              ${
                isOnline
                  ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>ONLINE${(m.connectionsCount || 1) > 1 ? ` (${m.connectionsCount})` : ''}</span>
                    </span>`
                  : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/30 app-muted border app-divider-border">
                      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-500 inline-block"></span><span>OFFLINE</span></span>
                    </span>`
              }
            </div>
          </td>
          <td class="py-3.5 px-5">
            ${
              isMasterRole
                ? '<span class="role-badge-master"><iconify-icon icon="game-icons:crown"></iconify-icon> MESTRE (HOST)</span>'
                : '<span class="role-badge-player"><iconify-icon icon="game-icons:hooded-figure"></iconify-icon> JOGADOR</span>'
            }
          </td>
          <td class="py-3.5 px-5 text-xs">
            ${
              linkedChars.length > 0
                ? `<div class="flex flex-wrap gap-1.5">${linkedChars
                    .map(
                      (lc) =>
                        `<span class="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-bold gold-title flex items-center gap-1.5"><iconify-icon icon="game-icons:crossed-swords"></iconify-icon> ${escapeHtml(
                          lc.name
                        )} (Nv. ${lc.level})</span>`
                    )
                    .join('')}</div>`
                : '<span class="app-muted italic">Nenhum vinculado</span>'
            }
          </td>
          <td class="py-3.5 px-5 text-right">
            <div class="inline-flex items-center justify-end gap-1.5">
              ${
                isEffectiveMaster() || isMe
                  ? `<button
                      type="button"
                      data-edit-member="${escapeHtml(m.id)}"
                      class="px-2.5 py-1.5 rounded-lg text-xs font-bold btn-gold-outline flex items-center gap-1"
                      title="Dar ou editar apelido deste IP e configurar permissões"
                    >
                      <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
                      <span>${hasCustomNickname ? 'Editar Apelido' : 'Dar Apelido'}</span>
                    </button>`
                  : `<span class="text-xs app-muted">—</span>`
              }
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  // ===========================================================================
  // SISTEMA DE BATALHA & FILA DE TURNOS (Combate Dinâmico & Sincronizado)
  // ===========================================================================
  let battleOrderWorkingQueue = [];

  function getBattleState() {
    if (!state.battle || typeof state.battle !== 'object') {
      state.battle = {
        isActive: false,
        roundNumber: 1,
        currentTurnIndex: 0,
        charges: 0,
        orderIds: [],
        turnCounts: {},
      };
    }
    if (!Array.isArray(state.battle.orderIds)) state.battle.orderIds = [];
    if (!state.battle.turnCounts || typeof state.battle.turnCounts !== 'object') {
      state.battle.turnCounts = {};
    }
    state.battle.roundNumber = Math.max(1, Number(state.battle.roundNumber || 1));
    state.battle.currentTurnIndex = Math.max(0, Number(state.battle.currentTurnIndex || 0));
    state.battle.charges = Math.max(0, Number(state.battle.charges || 0));
    return state.battle;
  }

  function calculateCombatantPaPenalty(char) {
    if (!char || !Array.isArray(char.buffsNerfs)) return 0;
    return char.buffsNerfs
      .filter((e) => e.enabled !== false && e.type === 'NERF')
      .reduce((acc, e) => {
        let pen = 0;
        if (Number(e.paModifier || 0) < 0) {
          pen += Math.abs(Number(e.paModifier));
        }
        for (const m of e.modifiers || []) {
          if ((m.targetStat || m.stat) === 'PA' && Number(m.value || 0) < 0) {
            pen += Math.abs(Number(m.value));
          }
        }
        return acc + pen;
      }, 0);
  }

  function resetTurnCombatantPa(char) {
    if (!char) return;
    const baseMax = Math.max(1, Number(char.baseMaxPa || 3));
    const penalty = calculateCombatantPaPenalty(char);
    const startingPa = Math.max(0, baseMax - penalty);
    char.pa = startingPa;
    char.maxPa = baseMax;
  }

  function applyDirectDamageToCombatant(char, dmg, toasts = [], reason = '') {
    if (!char) return { armorAbsorbed: 0, hpLoss: 0, finalHp: 0 };
    const currentArmor = Math.max(0, Number(char.armor || 0));
    const currentHp = Math.max(0, Number(char.hp || 0));
    let remainingDmg = Math.max(0, Math.round(Number(dmg) || 0));

    const armorAbsorbed = Math.min(currentArmor, remainingDmg);
    char.armor = currentArmor - armorAbsorbed;
    remainingDmg -= armorAbsorbed;

    const hpLoss = Math.min(currentHp, remainingDmg);
    char.hp = Math.max(0, currentHp - hpLoss);

    if (char.hp === 0) {
      char.isDead = true;
      char.pa = 0;
      toasts.push(`${char.name} caiu em combate (0 HP)!`);
    }
    return { armorAbsorbed, hpLoss, finalHp: char.hp };
  }

  function applyDirectHpDamageToCombatant(char, dmg, toasts = [], reason = '') {
    if (!char) return { hpLoss: 0, finalHp: 0 };
    const currentHp = Math.max(0, Number(char.hp || 0));
    const hpLoss = Math.min(currentHp, Math.max(0, Math.round(Number(dmg) || 0)));
    char.hp = Math.max(0, currentHp - hpLoss);

    if (char.hp === 0) {
      char.isDead = true;
      char.pa = 0;
      toasts.push(`${char.name} caiu em combate (0 HP)!`);
    }
    return { hpLoss, finalHp: char.hp };
  }

  function checkPendingFreezeTrigger(char, toasts = [], st = null) {
    if (!char || !char.resistances || !char.resistances['Congelamento']) return;
    const freezeEntry = char.resistances['Congelamento'];
    const maxVal = Number(freezeEntry.max || 100);
    const isImmune = (char.buffsNerfs || []).some(
      (b) => b.statusKey === 'IMUNIDADE_CONGELAMENTO' || b.name?.toLowerCase().includes('imunidade a congelamento')
    );
    if (!isImmune && maxVal > 0 && Number(freezeEntry.current || 0) >= maxVal) {
      freezeEntry.current = 0;
      applyAccumulationTrigger(char, 'Congelamento', maxVal, toasts, st);
      toasts.push(
        `A imunidade de ${char.name} cessou e o Congelamento reprimido (${maxVal}/${maxVal}) foi ATIVADO IMEDIATAMENTE!`
      );
    }
  }

  function applyAccumulationTrigger(target, resName, maxVal, toasts = [], st = null) {
    if (!target) return;
    if (!Array.isArray(target.buffsNerfs)) target.buffsNerfs = [];
    const lvl = Math.max(1, Number(target.level || 1));
    const isEnemy = Boolean(target.isEnemy);

    if (resName === 'Chamas') {
      const baseDmg = 15 + 2 * lvl;
      const existingChamas = target.buffsNerfs.find(
        (e) => e.statusKey === 'CHAMAS' || e.name?.includes('Chamas')
      );

      if (existingChamas) {
        // Sofrer chamas novamente: avança o dano para o próximo turno e renova a duração para 3 turnos sem dano imediato
        const prevDmg = Number(existingChamas.currentDmg || baseDmg);
        const nextDmg = Math.floor((prevDmg + 10) * 1.2);
        existingChamas.currentDmg = nextDmg;
        existingChamas.duration = 3;
        existingChamas.description = `Sofre ${nextDmg} de dano de fogo no fim do turno (+10 e +20% a cada ativação)`;
        toasts.push(
          `${target.name} sofreu nova ativação de CHAMAS! Duração renovada (3 turnos) e próximo dano aumentado para ${nextDmg} (sem dano imediato).`
        );
      } else {
        target.buffsNerfs.push({
          id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          statusKey: 'CHAMAS',
          type: 'NERF',
          name: 'Chamas (Combustão)',
          description: `Sofre ${baseDmg} de dano de fogo no fim do turno (+10 e +20% a cada ativação)`,
          duration: 3,
          currentDmg: baseDmg,
          source: '[Máx] acúmulos de chamas',
          createdAt: Date.now(),
        });
        toasts.push(`${target.name} entrou em combustão (CHAMAS)! 3 turnos, ${baseDmg} de dano inicial no fim do turno.`);
      }
    } else if (resName === 'Congelamento') {
      target.buffsNerfs.push({
        id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        statusKey: 'CONGELAMENTO',
        type: 'NERF',
        name: 'Congelamento Severo',
        description: 'Perde o próximo turno. +25% Resistência Geral e +25% Resistência Perfuração.',
        duration: 1,
        source: '[Máx] acúmulos de congelamento',
        generalResModifier: 25,
        piercingResModifier: 25,
        createdAt: Date.now(),
      });
      recalculateCharacterDerived(target);
      toasts.push(`${target.name} foi CONGELADO! Perderá o próximo turno (+25% Resistência Geral e Perfuração).`);
    } else if (resName === 'Choque') {
      const shockDmg = 30 + 5 * lvl;
      applyDirectDamageToCombatant(target, shockDmg, toasts, 'Choque');

      const b = (st && st.battle) || state.battle;
      const chargeReduction = isEnemy ? 1 : 2;
      if (b && b.isActive) {
        const oldCharges = Number(b.charges || 0);
        b.charges = Math.max(0, oldCharges - chargeReduction);
      }
      toasts.push(
        `${target.name} sofreu Sobrecarga de CHOQUE! ${shockDmg} de dano aplicado e -${chargeReduction} carga(s) de batalha.`
      );
    } else if (resName === 'Sangramento') {
      const pct = isEnemy ? 0.11 : 0.22;
      const bleedDmg = Math.max(1, Math.round(Number(target.maxHp || 0) * pct));
      applyDirectHpDamageToCombatant(target, bleedDmg, toasts, 'Sangramento');
      toasts.push(
        `${target.name} sofreu Hemorragia de SANGRAMENTO! ${bleedDmg} de dano direto na vida (${Math.round(pct * 100)}% do HP Máx).`
      );
    } else if (resName === 'Veneno') {
      const existingVeneno = target.buffsNerfs.find(
        (e) => e.statusKey === 'VENENO' || e.name?.includes('Veneno')
      );
      if (existingVeneno) {
        existingVeneno.duration = 3;
        toasts.push(`${target.name} sofreu nova intoxicação por Veneno! Duração renovada para 3 turnos.`);
      } else {
        target.buffsNerfs.push({
          id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          statusKey: 'VENENO',
          type: 'NERF',
          name: 'Veneno Letal',
          description: `Sofre ${isEnemy ? '5%' : '10%'} do HP Máx direto na Vida no início do turno por 3 turnos`,
          duration: 3,
          source: '[Máx] acúmulos de veneno',
          createdAt: Date.now(),
        });
        toasts.push(
          `${target.name} foi INTOXICADO por Veneno! Sofrerá ${isEnemy ? '5%' : '10%'} de dano na Vida no início dos próximos 3 turnos.`
        );
      }
    } else if (resName === 'Atordoamento') {
      const existingAtordoamento = target.buffsNerfs.find(
        (e) => e.statusKey === 'ATORDOAMENTO' || e.name?.includes('Atordoamento')
      );
      if (existingAtordoamento) {
        existingAtordoamento.duration = 2;
        toasts.push(`${target.name} sofreu novo Atordoamento! Duração renovada para 2 turnos.`);
      } else {
        target.buffsNerfs.push({
          id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          statusKey: 'ATORDOAMENTO',
          type: 'NERF',
          name: 'Atordoamento',
          description: '-1 PA por 2 turnos',
          duration: 2,
          paModifier: -1,
          source: '[Máx] acúmulos de atordoamento',
          createdAt: Date.now(),
        });
        toasts.push(`${target.name} está ATORDOADO! -1 PA por 2 turnos.`);
      }
      const penalty = calculateCombatantPaPenalty(target);
      const maxAvailable = Math.max(0, (target.baseMaxPa || 3) - penalty);
      if (target.pa > maxAvailable) {
        target.pa = maxAvailable;
      }
    } else {
      target.buffsNerfs.push({
        id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'NERF',
        name: `Penalidade de ${resName}`,
        description: `Efeito de ${resName} por 2 turnos`,
        duration: 2,
        paModifier: 0,
        source: `[Máx] acúmulos de ${resName.toLowerCase()}`,
        createdAt: Date.now(),
      });
      toasts.push(`${target.name} sofreu efeito máximo de ${resName}!`);
    }
  }

  function syncBattleQueueAliveState(st, toasts = []) {
    const b = st.battle;
    if (!b || !b.isActive || !Array.isArray(b.orderIds) || b.orderIds.length === 0) return;

    // Personagens mortos (0 HP) PERMANECEM na fila. Removemos apenas se o personagem foi excluído do jogo.
    const existingIds = new Set((st.characters || []).map((c) => c.id));
    const newOrder = b.orderIds.filter((id) => existingIds.has(id));

    if (newOrder.length !== b.orderIds.length) {
      b.orderIds = newOrder;
      if (b.orderIds.length === 0) {
        b.isActive = false;
        b.roundNumber = 1;
        b.currentTurnIndex = 0;
        b.charges = 0;
      } else if (b.currentTurnIndex >= b.orderIds.length) {
        b.currentTurnIndex = Math.max(0, b.orderIds.length - 1);
      }
    }
  }

  function adjustCharacterPa(charId, delta) {
    commitMutation((st) => {
      const char = st.characters.find((c) => c.id === charId);
      if (!char || !canAdjustPa(char)) return false;

      const penalty = calculateCombatantPaPenalty(char);
      const baseMax = Math.max(1, Number(char.baseMaxPa || 3));
      const maxAvailable = Math.max(0, baseMax - penalty);

      const cur = Number(char.pa ?? maxAvailable);
      char.pa = Math.max(0, Math.min(maxAvailable, cur + delta));
      return true;
    });
  }

  function sanitizeBattleOrder() {
    const battle = getBattleState();
    if (!battle.isActive || battle.orderIds.length === 0) return false;

    // Personagens mortos (0 HP) PERMANECEM na fila. Removemos apenas se o personagem foi excluído do jogo.
    const existingCharIds = new Set((state.characters || []).map((c) => c.id));
    const originalLength = battle.orderIds.length;
    const currentActingId = battle.orderIds[battle.currentTurnIndex % battle.orderIds.length];

    battle.orderIds = battle.orderIds.filter((id) => existingCharIds.has(id));
    if (battle.orderIds.length === 0) {
      battle.isActive = false;
      battle.roundNumber = 1;
      battle.currentTurnIndex = 0;
      battle.charges = 0;
      return true;
    }
    if (battle.orderIds.length !== originalLength) {
      const newIdx = battle.orderIds.indexOf(currentActingId);
      battle.currentTurnIndex = newIdx !== -1 ? newIdx : Math.min(battle.currentTurnIndex, battle.orderIds.length - 1);
      return true;
    }
    return false;
  }

  function canCurrentMemberAdvanceTurn() {
    const battle = getBattleState();
    if (!battle.isActive || battle.orderIds.length === 0) return false;
    if (isEffectiveMaster()) return true;
    if (hasPermission('combat_advance_any_turn')) return true;

    const actingId = battle.orderIds[battle.currentTurnIndex % battle.orderIds.length];
    const actingChar = (state.characters || []).find((c) => c.id === actingId);
    if (!actingChar) return false;
    if (actingChar.isEnemy) return false;

    if (isCharacterOwner(actingChar)) {
      return hasPermission('combat_advance_own_turn');
    }
    return false;
  }

  function getTurnPermissionText() {
    const battle = getBattleState();
    if (!battle.isActive || battle.orderIds.length === 0) return '';
    const actingId = battle.orderIds[battle.currentTurnIndex % battle.orderIds.length];
    const actingChar = (state.characters || []).find((c) => c.id === actingId);
    if (!actingChar) return 'Aguardando combatente...';

    const isMaster = isEffectiveMaster();
    const canAdvanceAny = hasPermission('combat_advance_any_turn');
    if (actingChar.isEnemy) {
      return (isMaster || canAdvanceAny)
        ? `Turno de ${actingChar.name} (Inimigo) — Você tem controle de avanço.`
        : `Turno de ${actingChar.name} (Inimigo) — Aguardando o Mestre avançar.`;
    }

    if (isCharacterOwner(actingChar)) {
      if (hasPermission('combat_advance_own_turn')) {
        return `É o seu turno (${actingChar.name})! Clique em Avançar Turno para finalizar.`;
      }
      return `É o turno de seu personagem (${actingChar.name}), mas você não tem permissão para avançar turnos.`;
    }

    if (canAdvanceAny) {
      return `Turno de ${actingChar.name} — Você pode avançar este turno como Sub-Mestre.`;
    }

    return `Turno de ${actingChar.name} — Aguardando o jogador ou Mestre avançar.`;
  }

  function processStartOfTurn(actingChar, st, toasts = []) {
    if (!actingChar) return;

    // 1. Veneno: Dano no COMEÇO do turno direto na Vida (5% Inimigo / 10% Jogador)
    const hasPoison = (actingChar.buffsNerfs || []).some(
      (eff) => eff.statusKey === 'VENENO' || eff.name?.includes('Veneno')
    );
    if (hasPoison && Number(actingChar.hp || 0) > 0 && !actingChar.isDead) {
      const isEnemy = Boolean(actingChar.isEnemy);
      const poisonPct = isEnemy ? 0.05 : 0.10;
      const poisonDmg = Math.max(1, Math.round(Number(actingChar.maxHp || 0) * poisonPct));
      applyDirectHpDamageToCombatant(actingChar, poisonDmg, toasts, 'Veneno (Início do Turno)');
      toasts.push(
        `${actingChar.name} sofreu ${poisonDmg} de dano por Veneno direto na Vida (${Math.round(poisonPct * 100)}% HP Máx) no início do turno!`
      );
    }

    // 2. Se ainda estiver vivo após Veneno/expirações:
    if (Number(actingChar.hp || 0) > 0 && !actingChar.isDead) {
      // 2.1 Reset Automático de PA no Início do Turno (descontando penalidades ativas, ex: Atordoamento)
      resetTurnCombatantPa(actingChar);

      // 2.2 Reduz em 1 a duração dos Buffs e Nerfs temporários no INÍCIO DO TURNO
      // (EXCETO efeitos de fim de turno como CHAMAS, que reduzem no fim do turno após aplicar dano)
      if (Array.isArray(actingChar.buffsNerfs)) {
        const hadFreezeImmunity = actingChar.buffsNerfs.some(
          (eff) => eff.statusKey === 'IMUNIDADE_CONGELAMENTO' || eff.name?.toLowerCase().includes('imunidade a congelamento')
        );

        actingChar.buffsNerfs.forEach((eff) => {
          if (eff.statusKey === 'CHAMAS' || eff.name?.includes('Chamas')) return; // Chamas é deduzido no fim do turno
          if (isBuffEffectPermanent(eff)) return; // Efeitos permanentes não perdem duração por turnos
          if (Number.isFinite(Number(eff.duration)) && Number(eff.duration) > 0) {
            eff.duration = Number(eff.duration) - 1;
          }
        });

        const prevCount = actingChar.buffsNerfs.length;
        actingChar.buffsNerfs = actingChar.buffsNerfs.filter(
          (eff) => isBuffEffectPermanent(eff) || !Number.isFinite(Number(eff.duration)) || Number(eff.duration) > 0
        );

        if (actingChar.buffsNerfs.length < prevCount) {
          toasts.push(`Efeitos temporários de ${actingChar.name} expiraram no início do turno.`);
        }

        // Se a imunidade a congelamento acabou de expirar, checa se havia Congelamento reprimido
        const stillImmune = actingChar.buffsNerfs.some(
          (eff) => eff.statusKey === 'IMUNIDADE_CONGELAMENTO' || eff.name?.toLowerCase().includes('imunidade a congelamento')
        );
        if (hadFreezeImmunity && !stillImmune) {
          checkPendingFreezeTrigger(actingChar, toasts, st);
          // Se foi congelado imediatamente após expirar a imunidade, perde este turno
          const justFrozen = (actingChar.buffsNerfs || []).find(
            (eff) =>
              eff.statusKey === 'CONGELAMENTO' ||
              (eff.name?.includes('Congelamento') &&
                eff.statusKey !== 'IMUNIDADE_CONGELAMENTO' &&
                !eff.name?.toLowerCase().includes('imunidade'))
          );
          if (justFrozen) {
            actingChar.buffsNerfs = actingChar.buffsNerfs.filter((e) => e !== justFrozen);
            actingChar.buffsNerfs.push({
              id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              statusKey: 'IMUNIDADE_CONGELAMENTO',
              type: 'BUFF',
              name: 'Imunidade a Congelamento',
              description: 'Imune a Congelamento por 1 turno (acúmulos são retidos no máximo até o término da imunidade).',
              duration: 1,
              source: 'Pós-Congelamento',
              createdAt: Date.now(),
            });
            actingChar.pa = 0;
            recalculateCharacterDerived(actingChar);
            toasts.push(`${actingChar.name} está CONGELADO e perdeu o turno! Ganhou Imunidade a Congelamento por 1 turno.`);
          }
        }
      }

      // 2.3 Regeneração Automática de Mana no início do turno: Math.round(Mana_Max * (Regen_Percent / 100))
      recalculateCharacterDerived(actingChar);
      const maxMana = Number(actingChar.maxMana || 0);
      const regenPct = Number(actingChar.regen || 0);
      const recoveredMana = Math.round(maxMana * (regenPct / 100));
      if (recoveredMana > 0 && Number(actingChar.mana || 0) < maxMana) {
        actingChar.mana = Math.min(maxMana, Number(actingChar.mana || 0) + recoveredMana);
        toasts.push(`${actingChar.name} regenerou ${recoveredMana} de Mana no início do turno (${regenPct}%).`);
      }

      // Regeneração de Vida / Armadura se configuradas
      const regenVida = Number(actingChar.derived?.effectiveRegenVida || 0);
      if (regenVida > 0 && actingChar.hp < actingChar.maxHp) {
        actingChar.hp = Math.min(actingChar.maxHp, actingChar.hp + regenVida);
      }
      const regenArmadura = Number(actingChar.derived?.effectiveRegenArmadura || 0);
      if (regenArmadura > 0 && actingChar.armor < actingChar.maxArmor) {
        actingChar.armor = Math.min(actingChar.maxArmor, actingChar.armor + regenArmadura);
      }
    } else {
      actingChar.isDead = true;
      actingChar.pa = 0;
    }
  }

  function advanceBattleTurn() {
    const battle = getBattleState();
    if (!battle.isActive || battle.orderIds.length === 0) return;

    if (!canCurrentMemberAdvanceTurn()) {
      showToast('Você não tem permissão para avançar o turno deste combatente!', 'warning');
      return;
    }

    commitMutation((st, toasts) => {
      syncBattleQueueAliveState(st, toasts);

      const b = st.battle;
      if (!b || !b.isActive || !Array.isArray(b.orderIds) || b.orderIds.length === 0) return false;
      const len = b.orderIds.length;

      // Combatente que está FINALIZANDO o turno agora
      const currentActingIdx = Number(b.currentTurnIndex || 0) % len;
      const finishingActingId = b.orderIds[currentActingIdx];
      const finishingChar = (st.characters || []).find((c) => c.id === finishingActingId);

      // 1. Efeitos de FIM DE TURNO de finishingChar:
      if (finishingChar && Number(finishingChar.hp || 0) > 0 && !finishingChar.isDead) {
        // Dano de Chamas no fim do turno: 15 + (2 * Nivel), reduz armadura primeiro, depois vida.
        // A cada dano sofrido, o próximo aumenta em 10 + 20%.
        const chamasEff = (finishingChar.buffsNerfs || []).find(
          (e) => e.statusKey === 'CHAMAS' || e.name?.includes('Chamas')
        );
        if (chamasEff) {
          const lvl = Math.max(1, Number(finishingChar.level || 1));
          const baseDmg = 15 + 2 * lvl;
          const currentDmg = Math.max(1, Number(chamasEff.currentDmg || baseDmg));

          applyDirectDamageToCombatant(finishingChar, currentDmg, toasts, 'Chamas (Fim de Turno)');

          const nextDmg = Math.floor((currentDmg + 10) * 1.2);
          chamasEff.currentDmg = nextDmg;
          chamasEff.duration = Math.max(0, Number(chamasEff.duration || 1) - 1);
          chamasEff.description = `Sofre ${nextDmg} de dano de fogo no fim do turno (+10 e +20% a cada ativação)`;

          if (chamasEff.duration <= 0) {
            finishingChar.buffsNerfs = finishingChar.buffsNerfs.filter((e) => e !== chamasEff);
            toasts.push(
              `${finishingChar.name} sofreu ${currentDmg} de dano por Chamas no fim do turno! As chamas se extinguiram.`
            );
          } else {
            toasts.push(
              `${finishingChar.name} sofreu ${currentDmg} de dano por Chamas no fim do turno! Próximo dano aumentado para ${nextDmg} (${chamasEff.duration} turno(s) restante(s)).`
            );
          }
        }
      }

      // 2. Regra de Cargas: +1 APENAS se for JOGADOR E NÃO ESTIVER MORTO (hp > 0 e !isDead)
      const isFinishingEnemy = Boolean(finishingChar && finishingChar.isEnemy);
      const isFinishingDead = !finishingChar || Number(finishingChar.hp || 0) <= 0 || Boolean(finishingChar.isDead);
      if (finishingChar && !isFinishingEnemy && !isFinishingDead) {
        b.charges = Math.max(0, Number(b.charges || 0)) + 1;
      }

      // 3. Avança na fila procurando o próximo combatente VIVO e NÃO CONGELADO (Auto-Skip)
      let nextIdx = Number(b.currentTurnIndex || 0);
      let foundActingChar = null;
      let loops = 0;
      const maxLoops = len + 1;
      const skippedInThisAdvance = new Set();

      while (loops < maxLoops) {
        nextIdx = (nextIdx + 1) % len;
        if (nextIdx === 0) {
          b.roundNumber = Math.max(1, Number(b.roundNumber || 1)) + 1;
        }
        loops++;

        const candidateId = b.orderIds[nextIdx];
        const candidate = (st.characters || []).find((c) => c.id === candidateId);
        if (!candidate) continue;

        const isCandidateDead = Number(candidate.hp || 0) <= 0 || Boolean(candidate.isDead);
        if (isCandidateDead) {
          toasts.push(`${candidate.name} está derrotado (0 HP) — turno pulado.`);
          continue;
        }

        if (skippedInThisAdvance.has(candidate.id)) {
          continue;
        }

        // Se o combatente tem imunidade a congelamento e acúmulos de Congelamento represados no máximo:
        // A imunidade cessa agora no início do turno dele, o congelamento ativa e o turno é pulado!
        const hadImmunity = (candidate.buffsNerfs || []).some(
          (b) => b.statusKey === 'IMUNIDADE_CONGELAMENTO' || b.name?.toLowerCase().includes('imunidade a congelamento')
        );
        const freezeEntry = candidate.resistances?.['Congelamento'];
        const freezeMax = Number(freezeEntry?.max || 100);
        if (hadImmunity && freezeMax > 0 && Number(freezeEntry?.current || 0) >= freezeMax) {
          candidate.buffsNerfs = (candidate.buffsNerfs || []).filter(
            (b) => b.statusKey !== 'IMUNIDADE_CONGELAMENTO' && !b.name?.toLowerCase().includes('imunidade a congelamento')
          );
          freezeEntry.current = 0;
          candidate.buffsNerfs.push({
            id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            statusKey: 'IMUNIDADE_CONGELAMENTO',
            type: 'BUFF',
            name: 'Imunidade a Congelamento',
            description: 'Imune a Congelamento por 1 turno (acúmulos são retidos no máximo até o término da imunidade).',
            duration: 1,
            source: 'Pós-Congelamento',
            createdAt: Date.now(),
          });
          recalculateCharacterDerived(candidate);
          toasts.push(`A imunidade de ${candidate.name} cessou e o Congelamento reprimido (${freezeMax}/${freezeMax}) foi ativado! Turno pulado.`);
          skippedInThisAdvance.add(candidate.id);
          continue;
        }

        // Combatente vivo: checa se está Congelado
        const frozenIdx = (candidate.buffsNerfs || []).findIndex(
          (eff) =>
            eff.statusKey === 'CONGELAMENTO' ||
            (eff.name?.includes('Congelamento') &&
              eff.statusKey !== 'IMUNIDADE_CONGELAMENTO' &&
              !eff.name?.toLowerCase().includes('imunidade'))
        );
        if (frozenIdx !== -1) {
          candidate.buffsNerfs.splice(frozenIdx, 1);
          if (!Array.isArray(candidate.buffsNerfs)) candidate.buffsNerfs = [];
          candidate.buffsNerfs.push({
            id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            statusKey: 'IMUNIDADE_CONGELAMENTO',
            type: 'BUFF',
            name: 'Imunidade a Congelamento',
            description: 'Imune a Congelamento por 1 turno (acúmulos são retidos no máximo até o término da imunidade).',
            duration: 1,
            source: 'Pós-Congelamento',
            createdAt: Date.now(),
          });
          recalculateCharacterDerived(candidate);
          toasts.push(`${candidate.name} está CONGELADO e perdeu o turno! Ganhou Imunidade a Congelamento por 1 turno.`);
          skippedInThisAdvance.add(candidate.id);
          continue;
        }

        // Encontrou o combatente ativo apto
        foundActingChar = candidate;
        b.currentTurnIndex = nextIdx;
        break;
      }

      if (!foundActingChar) {
        b.currentTurnIndex = nextIdx;
        toasts.push('Não há combatentes vivos aptos para agir no momento.');
        return true;
      }

      const newActingId = b.orderIds[b.currentTurnIndex];
      if (!b.turnCounts) b.turnCounts = {};
      b.turnCounts[newActingId] = Number(b.turnCounts[newActingId] || 0) + 1;

      // 4. Início de Turno do combatente apto
      processStartOfTurn(foundActingChar, st, toasts);
      toasts.push(`Rodada ${b.roundNumber} - Turno de ${foundActingChar.name}!`);

      return true;
    });
  }

  function adjustBattleCharges(delta) {
    if (!isEffectiveMaster() && !hasPermission('combat_manage_charges')) return;
    commitMutation((st) => {
      if (!st.battle || !st.battle.isActive) return false;
      st.battle.charges = Math.max(0, Number(st.battle.charges || 0) + delta);
      return true;
    });
  }

  function updateBattleToggleButton() {
    const btn = document.getElementById('btn-battle-toggle');
    const icon = document.getElementById('btn-battle-toggle-icon');
    const text = document.getElementById('btn-battle-toggle-text');
    if (!btn || !text) return;

    const battle = getBattleState();
    if (battle.isActive) {
      btn.className = 'master-only-el rounded-lg px-3.5 py-2 text-xs font-serif-fantasy uppercase tracking-wider bg-rose-950/80 hover:bg-rose-900 border border-rose-500/70 text-rose-200 font-extrabold flex items-center gap-1.5 shadow-md transition';
      if (icon) icon.setAttribute('icon', 'game-icons:skull-crossed-bones');
      text.textContent = 'ENCERRAR BATALHA';
      btn.title = 'Encerrar o combate ativo e zerar contadores de turno e cargas';
    } else {
      btn.className = 'master-only-el rounded-lg px-3.5 py-2 text-xs font-serif-fantasy uppercase tracking-wider btn-gold flex items-center gap-1.5 shadow-md transition';
      if (icon) icon.setAttribute('icon', 'game-icons:crossed-swords');
      text.textContent = 'INICIAR BATALHA';
      btn.title = 'Configurar ordem e iniciar combate';
    }
  }

  function handleBattleToggleClick() {
    if (!isEffectiveMaster() && !hasPermission('combat_manage_battle')) return;
    const battle = getBattleState();
    if (battle.isActive) {
      openConfirmModal({
        icon: '<iconify-icon icon="game-icons:skull-crossed-bones" class="text-rose-400"></iconify-icon>',
        title: 'ENCERRAR BATALHA?',
        message: 'Deseja realmente encerrar o combate atual? A fila de batalha será fechada, os contadores serão zerados e todas as fichas de inimigos em campo serão removidas da mesa.',
        confirmText: '<iconify-icon icon="game-icons:skull-crossed-bones"></iconify-icon> <span>Encerrar Batalha</span>',
        onConfirm: () => {
          commitMutation(
            (st, toasts) => {
              const enemyCount = (st.characters || []).filter((c) => Boolean(c.isEnemy)).length;
              st.characters = (st.characters || []).filter((c) => !c.isEnemy);
              st.battle = {
                isActive: false,
                roundNumber: 1,
                currentTurnIndex: 0,
                charges: 0,
                orderIds: [],
                turnCounts: {},
              };
              if (enemyCount > 0) {
                toasts.push(`Combate encerrado. ${enemyCount} ficha(s) de inimigo removida(s) da mesa.`);
              } else {
                toasts.push('Combate encerrado pelo Mestre.');
              }
              return true;
            },
            {
              actionType: 'BATTLE_END',
              targetEntity: 'Mesa de Combate',
              summary: 'Batalha encerrada e todas as fichas de inimigos foram removidas da mesa.',
            }
          );
          closeModal('modal-general-skills');
          renderCharactersTab();
        },
      });
    } else {
      openBattleOrderModal();
    }
  }

  function openBattleOrderModal() {
    if (!isEffectiveMaster() && !hasPermission('combat_manage_battle') && !hasPermission('combat_edit_order')) return;
    const battle = getBattleState();
    const existingIds = new Set((state.characters || []).map((c) => c.id));
    if (battle.isActive && battle.orderIds.length > 0) {
      battleOrderWorkingQueue = battle.orderIds.filter((id) => existingIds.has(id));
    } else {
      battleOrderWorkingQueue = (state.characters || []).filter((c) => Number(c.hp || 0) > 0 && !c.isDead).map((c) => c.id);
    }

    const titleEl = document.getElementById('battle-order-modal-title');
    const confirmBtnText = document.getElementById('btn-confirm-battle-order-text');
    if (titleEl) {
      titleEl.textContent = battle.isActive ? 'ATUALIZAR ORDEM DE BATALHA' : 'ORDEM DE INICIATIVA DA BATALHA';
    }
    if (confirmBtnText) {
      confirmBtnText.textContent = battle.isActive ? 'ATUALIZAR ORDEM' : 'CONFIRMAR E INICIAR BATALHA';
    }

    renderBattleOrderModalContent();
    openModal('modal-battle-order');
  }

  function renderBattleOrderModalContent() {
    const availableContainer = document.getElementById('battle-available-list');
    const queueContainer = document.getElementById('battle-modal-queue-list');
    const availableCountEl = document.getElementById('battle-available-count');
    const queueCountEl = document.getElementById('battle-queue-count');
    if (!availableContainer || !queueContainer) return;

    const queuedSet = new Set(battleOrderWorkingQueue);
    const availableChars = (state.characters || []).filter(
      (c) => !queuedSet.has(c.id) && Number(c.hp || 0) > 0 && !c.isDead
    );

    if (availableCountEl) availableCountEl.textContent = String(availableChars.length);
    if (queueCountEl) queueCountEl.textContent = String(battleOrderWorkingQueue.length);

    // Coluna Esquerda: Disponíveis
    if (availableChars.length === 0) {
      availableContainer.innerHTML = `
        <div class="py-12 text-center text-xs app-muted italic flex flex-col items-center gap-2">
          <iconify-icon icon="game-icons:check-mark" class="text-2xl text-emerald-400"></iconify-icon>
          <span>Todos os combatentes da mesa estão na fila!</span>
        </div>
      `;
    } else {
      availableContainer.innerHTML = availableChars.map((c) => {
        const isEnemy = Boolean(c.isEnemy);
        return `
          <div class="p-2.5 rounded-lg border app-divider-border bg-black/40 flex items-center justify-between gap-2.5 hover:border-amber-500/30 transition">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                isEnemy ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }">
                <iconify-icon icon="${isEnemy ? 'game-icons:monster-grasp' : 'game-icons:hooded-figure'}" class="text-lg"></iconify-icon>
              </span>
              <div class="min-w-0">
                <div class="font-serif-fantasy font-black text-xs truncate app-title">${escapeHtml(c.name)}</div>
                <div class="flex items-center gap-1.5 text-[10px] font-mono app-muted">
                  <span>${isEnemy ? 'Inimigo' : 'Jogador'}</span>
                  <span>•</span>
                  <span>NV. ${c.level || 1}</span>
                  <span>•</span>
                  <span>HP ${c.hp}/${c.maxHp}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              data-battle-add-id="${escapeHtml(c.id)}"
              class="px-2.5 py-1 text-xs font-serif-fantasy font-black btn-gold rounded flex items-center gap-1 shrink-0 hover:scale-105 transition"
              title="Adicionar à fila de batalha"
            >
              <span>+</span>
            </button>
          </div>
        `;
      }).join('');
    }

    // Coluna Direita: Fila Ordenada
    if (battleOrderWorkingQueue.length === 0) {
      queueContainer.innerHTML = `
        <div class="py-12 text-center text-xs app-muted italic flex flex-col items-center gap-2">
          <iconify-icon icon="game-icons:crossed-swords" class="text-2xl text-amber-400/50"></iconify-icon>
          <span>Fila vazia. Adicione participantes da coluna ao lado.</span>
        </div>
      `;
    } else {
      queueContainer.innerHTML = battleOrderWorkingQueue.map((id, index) => {
        const c = (state.characters || []).find((char) => char.id === id);
        if (!c) return '';
        const isEnemy = Boolean(c.isEnemy);
        return `
          <div
            class="battle-queue-draggable-item p-2.5 rounded-lg border border-amber-500/25 bg-black/40 flex items-center justify-between gap-2.5 cursor-move hover:border-amber-400/60 transition"
            draggable="true"
            data-drag-order-id="${escapeHtml(c.id)}"
            data-drag-order-index="${index}"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <span class="text-xs font-mono opacity-50 shrink-0">⠿</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                index === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50' : 'bg-black/40 app-muted border app-divider-border'
              } shrink-0">
                ${index + 1}º
              </span>
              <span class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                isEnemy ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }">
                <iconify-icon icon="${isEnemy ? 'game-icons:monster-grasp' : 'game-icons:hooded-figure'}" class="text-lg"></iconify-icon>
              </span>
              <div class="min-w-0 flex-1">
                <div class="font-serif-fantasy font-black text-xs truncate app-title">${escapeHtml(c.name)}</div>
                <div class="text-[10px] font-mono app-muted truncate">${isEnemy ? 'Inimigo' : 'Jogador'} • NV. ${c.level || 1}</div>
              </div>
            </div>

            <!-- Controles Subir/Descer/Remover -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-battle-move-up="${index}"
                ${index === 0 ? 'disabled' : ''}
                class="w-7 h-7 rounded flex items-center justify-center app-icon-btn text-xs disabled:opacity-20 disabled:cursor-not-allowed hover:text-amber-400"
                title="Mover para cima"
              >
                ▲
              </button>
              <button
                type="button"
                data-battle-move-down="${index}"
                ${index === battleOrderWorkingQueue.length - 1 ? 'disabled' : ''}
                class="w-7 h-7 rounded flex items-center justify-center app-icon-btn text-xs disabled:opacity-20 disabled:cursor-not-allowed hover:text-amber-400"
                title="Mover para baixo"
              >
                ▼
              </button>
              <button
                type="button"
                data-battle-remove-id="${escapeHtml(c.id)}"
                class="w-7 h-7 rounded flex items-center justify-center app-icon-btn text-xs text-rose-400 hover:bg-rose-950/60"
                title="Remover da fila"
              >
                ✕
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    attachBattleOrderModalListeners();
  }

  function attachBattleOrderModalListeners() {
    const availableContainer = document.getElementById('battle-available-list');
    const queueContainer = document.getElementById('battle-modal-queue-list');
    if (!availableContainer || !queueContainer) return;

    availableContainer.querySelectorAll('[data-battle-add-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-battle-add-id');
        if (id && !battleOrderWorkingQueue.includes(id)) {
          battleOrderWorkingQueue.push(id);
          renderBattleOrderModalContent();
        }
      });
    });

    queueContainer.querySelectorAll('[data-battle-move-up]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-battle-move-up'));
        if (idx > 0 && idx < battleOrderWorkingQueue.length) {
          const temp = battleOrderWorkingQueue[idx];
          battleOrderWorkingQueue[idx] = battleOrderWorkingQueue[idx - 1];
          battleOrderWorkingQueue[idx - 1] = temp;
          renderBattleOrderModalContent();
        }
      });
    });

    queueContainer.querySelectorAll('[data-battle-move-down]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-battle-move-down'));
        if (idx >= 0 && idx < battleOrderWorkingQueue.length - 1) {
          const temp = battleOrderWorkingQueue[idx];
          battleOrderWorkingQueue[idx] = battleOrderWorkingQueue[idx + 1];
          battleOrderWorkingQueue[idx + 1] = temp;
          renderBattleOrderModalContent();
        }
      });
    });

    queueContainer.querySelectorAll('[data-battle-remove-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-battle-remove-id');
        battleOrderWorkingQueue = battleOrderWorkingQueue.filter((x) => x !== id);
        renderBattleOrderModalContent();
      });
    });

    let draggedId = null;
    queueContainer.querySelectorAll('.battle-queue-draggable-item').forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        draggedId = item.getAttribute('data-drag-order-id');
        item.classList.add('battle-item-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedId);
      });

      item.addEventListener('dragend', () => {
        draggedId = null;
        item.classList.remove('battle-item-dragging');
        queueContainer.querySelectorAll('.battle-queue-draggable-item').forEach((el) => {
          el.classList.remove('battle-drag-target-over');
        });
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('battle-drag-target-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('battle-drag-target-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('battle-drag-target-over');
        const targetId = item.getAttribute('data-drag-order-id');
        if (!draggedId || draggedId === targetId) return;

        const fromIdx = battleOrderWorkingQueue.indexOf(draggedId);
        const toIdx = battleOrderWorkingQueue.indexOf(targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          battleOrderWorkingQueue.splice(fromIdx, 1);
          battleOrderWorkingQueue.splice(toIdx, 0, draggedId);
          renderBattleOrderModalContent();
        }
      });
    });
  }

  function handleConfirmBattleOrder() {
    if (!isEffectiveMaster() && !hasPermission('combat_manage_battle') && !hasPermission('combat_edit_order')) {
      showToast('Você não tem permissão para configurar a ordem de batalha.', 'warning');
      return;
    }
    if (battleOrderWorkingQueue.length === 0) {
      showToast('Adicione pelo menos 1 participante à fila de combate!', 'warning');
      return;
    }

    commitMutation((st, toasts) => {
      const wasActive = Boolean(st.battle?.isActive);
      if (!st.battle) st.battle = {};
      st.battle.orderIds = [...battleOrderWorkingQueue];

      if (!wasActive) {
        st.battle.isActive = true;
        st.battle.roundNumber = 1;
        st.battle.currentTurnIndex = 0;
        st.battle.charges = 0;
        st.battle.turnCounts = {};
        const firstId = st.battle.orderIds[0];
        st.battle.turnCounts[firstId] = 1;

        state.battleSidebarCollapsed = false;

        const firstChar = (st.characters || []).find((c) => c.id === firstId);
        if (firstChar) {
          resetTurnCombatantPa(firstChar);
        }
        const firstName = firstChar ? firstChar.name : '1º Combatente';
        toasts.push(`Combate iniciado! Turno de ${firstName}!`);
      } else {
        st.battle.currentTurnIndex = Math.min(
          Math.max(0, Number(st.battle.currentTurnIndex || 0)),
          st.battle.orderIds.length - 1
        );
        toasts.push('Ordem da batalha atualizada!');
      }
      return true;
    });

    closeModal('modal-battle-order');
  }

  function renderBattleSidebar() {
    const sidebar = document.getElementById('battle-sidebar');
    const dockTab = document.getElementById('btn-battle-sidebar-dock-tab');
    if (!sidebar) return;

    sanitizeBattleOrder();
    const battle = getBattleState();

    if (!battle.isActive || battle.orderIds.length === 0) {
      sidebar.classList.add('hidden');
      if (dockTab) dockTab.classList.add('hidden');
      return;
    }

    const isCollapsed = Boolean(state.battleSidebarCollapsed);

    if (isCollapsed) {
      sidebar.classList.add('sidebar-collapsed');
      sidebar.classList.add('hidden');
      if (dockTab) dockTab.classList.remove('hidden');
    } else {
      sidebar.classList.remove('sidebar-collapsed');
      sidebar.classList.remove('hidden');
      if (dockTab) dockTab.classList.add('hidden');
    }

    const roundBadge = document.getElementById('battle-round-badge');
    if (roundBadge) roundBadge.textContent = `Rodada ${battle.roundNumber || 1}`;

    const chargesVal = document.getElementById('battle-charges-value');
    if (chargesVal) chargesVal.textContent = String(battle.charges || 0);

    const dockCharges = document.getElementById('battle-dock-tab-charges');
    if (dockCharges) dockCharges.textContent = `C:${battle.charges || 0}`;

    const canManageCharges = isEffectiveMaster() || hasPermission('combat_manage_charges');
    const chargeBtns = document.getElementById('btn-battle-charge-sub')?.parentElement;
    if (chargeBtns) {
      chargeBtns.classList.toggle('hidden', !canManageCharges);
    }

    const canEditOrder = isEffectiveMaster() || hasPermission('combat_edit_order') || hasPermission('combat_manage_battle');
    const editOrderBtn = document.getElementById('btn-battle-edit-order');
    if (editOrderBtn) {
      editOrderBtn.classList.toggle('hidden', !canEditOrder);
    }

    const actingIndex = battle.currentTurnIndex % battle.orderIds.length;
    const actingId = battle.orderIds[actingIndex];
    const actingChar = (state.characters || []).find((c) => c.id === actingId);

    const canAdvance = canCurrentMemberAdvanceTurn();
    const hintText = getTurnPermissionText();

    const advanceBtn = document.getElementById('btn-battle-advance-turn');
    const hintEl = document.getElementById('battle-turn-hint');

    if (advanceBtn) {
      advanceBtn.disabled = !canAdvance;
      advanceBtn.title = canAdvance ? 'Avançar para o próximo combatente' : hintText;
    }
    if (hintEl) hintEl.textContent = hintText;

    const queueListEl = document.getElementById('battle-queue-list');
    if (queueListEl) {
      const canReorderQueue = isEffectiveMaster() || hasPermission('combat_edit_order');
      queueListEl.innerHTML = battle.orderIds.map((id, index) => {
        const c = (state.characters || []).find((char) => char.id === id);
        if (!c) return '';
        const isDead = Number(c.hp || 0) <= 0 || Boolean(c.isDead);
        const isCurrent = index === actingIndex;
        const isEnemy = Boolean(c.isEnemy);
        const count = battle.turnCounts?.[id] || 0;

        return `
          <div
            class="p-2 rounded-lg border transition flex items-center justify-between gap-2 ${
              isDead
                ? 'bg-black/50 border-rose-950/60 opacity-60 grayscale'
                : isCurrent
                ? 'bg-amber-500/20 border-amber-400 shadow-md card-active-turn'
                : 'bg-black/30 border-app-divider-border hover:border-amber-500/30'
            }"
            data-sidebar-order-id="${escapeHtml(c.id)}"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                isDead
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-900/50'
                  : isCurrent
                  ? 'bg-amber-400 text-black'
                  : 'bg-black/40 app-muted border app-divider-border'
              } shrink-0">
                ${index + 1}º
              </span>
              <span class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                isDead
                  ? 'bg-black/60 border-rose-900/50 text-rose-400'
                  : isEnemy
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }">
                <iconify-icon icon="${
                  isDead ? 'game-icons:crowned-skull' : isEnemy ? 'game-icons:monster-grasp' : 'game-icons:hooded-figure'
                }" class="text-base"></iconify-icon>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="font-serif-fantasy font-black text-xs truncate ${
                    isDead ? 'text-rose-400/80 line-through' : isCurrent ? 'text-amber-200' : 'app-title'
                  }">
                    ${escapeHtml(c.name)}
                  </span>
                  ${
                    isDead
                      ? '<span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-950 text-rose-300 border border-rose-600/50 shrink-0">0 HP (MORTO)</span>'
                      : isCurrent
                      ? '<span class="px-1 py-0.2 rounded text-[8px] font-black bg-amber-400 text-black shrink-0 animate-pulse">VEZ</span>'
                      : ''
                  }
                </div>
                <div class="flex items-center gap-1.5 text-[9px] font-mono app-muted truncate">
                  <span>${isEnemy ? 'Inimigo' : 'Jogador'}</span>
                  <span>•</span>
                  <span>Turnos: ${count}</span>
                  ${isDead ? '<span class="text-rose-400 font-bold">• Derrotado</span>' : ''}
                </div>
              </div>
            </div>

            ${
              canReorderQueue
                ? `<div class="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      data-sidebar-move-up="${index}"
                      ${index === 0 ? 'disabled' : ''}
                      class="w-6 h-6 rounded flex items-center justify-center app-icon-btn text-[10px] disabled:opacity-20 disabled:cursor-not-allowed hover:text-amber-400"
                      title="Subir na fila"
                    >▲</button>
                    <button
                      type="button"
                      data-sidebar-move-down="${index}"
                      ${index === battle.orderIds.length - 1 ? 'disabled' : ''}
                      class="w-6 h-6 rounded flex items-center justify-center app-icon-btn text-[10px] disabled:opacity-20 disabled:cursor-not-allowed hover:text-amber-400"
                      title="Descer na fila"
                    >▼</button>
                  </div>`
                : ''
            }
          </div>
        `;
      }).join('');

      if (canReorderQueue) {
        queueListEl.querySelectorAll('[data-sidebar-move-up]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = Number(btn.getAttribute('data-sidebar-move-up'));
            if (idx > 0 && idx < battle.orderIds.length) {
              commitMutation((st) => {
                if (!st.battle?.orderIds) return false;
                const temp = st.battle.orderIds[idx];
                st.battle.orderIds[idx] = st.battle.orderIds[idx - 1];
                st.battle.orderIds[idx - 1] = temp;
                return true;
              });
            }
          });
        });

        queueListEl.querySelectorAll('[data-sidebar-move-down]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = Number(btn.getAttribute('data-sidebar-move-down'));
            if (idx >= 0 && idx < battle.orderIds.length - 1) {
              commitMutation((st) => {
                if (!st.battle?.orderIds) return false;
                const temp = st.battle.orderIds[idx];
                st.battle.orderIds[idx] = st.battle.orderIds[idx + 1];
                st.battle.orderIds[idx + 1] = temp;
                return true;
              });
            }
          });
        });
      }
    }
  }


/**
 * CMrpg v2.0 — Frontend Application (Vanilla ES6+)
 * Interface Dark Fantasy Medieval + Motor Completo de Regras (/docs) + WebSockets Radmin VPN.
 */

  'use strict';

  // ===========================================================================
  // Constantes e Metadados do Sistema
  // ===========================================================================
  const STORAGE_KEY_CHARS = 'rpg_chars_v1';
  const STORAGE_KEY_STATE = 'cmrpg_full_state_v2';
  const STORAGE_KEY_THEME = 'theme-preference';
  const STORAGE_KEY_MEMBER_ID = 'cmrpg_local_member_id';
  const STORAGE_KEY_CURSOR_COLOR_MAP = 'cmrpg_cursor_colors_v1';
  const SESSION_KEY_CURSOR_CLIENT_ID = 'cmrpg_cursor_client_id_v1';
  const CURSOR_THROTTLE_MS = 40; // ~25 FPS network throttle
  const CURSOR_INACTIVITY_MS = 30000; // 30 segundos de inatividade
  const HISTORY_LIMIT = 6;

  // Paleta fixa com 10 cores vibrantes e distintas para Cursores Colaborativos
  const CURSOR_COLOR_PALETTE = [
    { hex: '#FF595E', name: 'Vermelho Coral' },
    { hex: '#3B82F6', name: 'Azul Neon' },
    { hex: '#10B981', name: 'Verde Esmeralda' },
    { hex: '#F59E0B', name: 'Amarelo Ouro' },
    { hex: '#A855F7', name: 'Roxo' },
    { hex: '#06B6D4', name: 'Ciano' },
    { hex: '#F97316', name: 'Laranja' },
    { hex: '#EC4899', name: 'Rosa Choque' },
    { hex: '#84CC16', name: 'Lima' },
    { hex: '#818CF8', name: 'Lavanda' },
  ];

  const CANONICAL_ATTRIBUTES = [
    { key: 'FORCA', label: 'Força', short: 'FOR', icon: '<iconify-icon icon="game-icons:biceps"></iconify-icon>' },
    { key: 'DESTREZA', label: 'Destreza', short: 'DES', icon: '<iconify-icon icon="game-icons:bow-arrow"></iconify-icon>' },
    { key: 'INTELIGENCIA', label: 'Inteligência', short: 'INT', icon: '<iconify-icon icon="game-icons:spell-book"></iconify-icon>' },
    { key: 'SABEDORIA', label: 'Sabedoria', short: 'SAB', icon: '<iconify-icon icon="game-icons:owl"></iconify-icon>' },
    { key: 'LABIA', label: 'Lábia', short: 'LAB', icon: '<iconify-icon icon="game-icons:conversation"></iconify-icon>' },
  ];

  const RESISTANCE_TYPES = [
    { name: 'Congelamento', icon: '<iconify-icon icon="game-icons:ice-cube" style="color: #38bdf8;"></iconify-icon>', barClass: 'from-cyan-500 to-sky-400', textClass: 'text-cyan-400' },
    { name: 'Choque', icon: '<iconify-icon icon="game-icons:lightning-branches" style="color: #facc15;"></iconify-icon>', barClass: 'from-amber-400 to-yellow-300', textClass: 'text-amber-400' },
    { name: 'Sangramento', icon: '<iconify-icon icon="game-icons:bleeding-wound" style="color: #ef4444;"></iconify-icon>', barClass: 'from-rose-600 to-red-500', textClass: 'text-rose-400' },
    { name: 'Chamas', icon: '<iconify-icon icon="game-icons:ifrit" style="color: #f97316;"></iconify-icon>', barClass: 'from-orange-500 to-red-500', textClass: 'text-orange-400' },
    { name: 'Veneno', icon: '<iconify-icon icon="game-icons:poison-bottle" style="color: #a3e635;"></iconify-icon>', barClass: 'from-emerald-500 to-lime-400', textClass: 'text-emerald-400' },
    { name: 'Atordoamento', icon: '<iconify-icon icon="game-icons:knockout" style="color: #c084fc;"></iconify-icon>', barClass: 'from-purple-500 to-fuchsia-400', textClass: 'text-purple-400' },
  ];

  const ACCUMULATION_MAX_EFFECTS = {
    Atordoamento: {
      description: '-1 PA por 2 turnos',
      duration: 2,
      paModifier: -1,
      type: 'NERF',
    },
    Congelamento: {
      description: 'Congelamento Severo: Perde o próximo turno (+25% Resistência Geral/Perfuração)',
      duration: 1,
      paModifier: 0,
      type: 'NERF',
    },
    Choque: {
      description: 'Sobrecarga de Choque: Dano 30 + (5*Nv) e redução de cargas (-1 inimigo / -2 jogador)',
      duration: 0,
      paModifier: 0,
      type: 'NERF',
    },
    Sangramento: {
      description: 'Hemorragia Profunda: Dano direto na Vida (11% Inimigo / 22% Jogador do HP Máx)',
      duration: 0,
      paModifier: 0,
      type: 'NERF',
    },
    Chamas: {
      description: 'Combustão Viva: Dano no fim do turno 15 + (2*Nv) com amplificação cumulativa de +20% por 3 turnos',
      duration: 3,
      paModifier: 0,
      type: 'NERF',
    },
    Veneno: {
      description: 'Intoxicação Letal: Dano no começo do turno direto na Vida (5% Inimigo / 10% Jogador do HP Máx) por 3 turnos',
      duration: 3,
      paModifier: 0,
      type: 'NERF',
    },
    Cegueira: {
      description: 'Cegueira Completa: Desvantagem em testes por 2 turnos',
      duration: 2,
      paModifier: 0,
      type: 'NERF',
    },
  };

  const ELEMENTAL_RESISTANCE_TYPES = [
    { key: 'FISICO', label: 'Físico', icon: '<iconify-icon icon="game-icons:gladius"></iconify-icon>', textClass: 'text-slate-300', bgClass: 'bg-slate-500/10 border-slate-500/30' },
    { key: 'MAGICO', label: 'Mágico', icon: '<iconify-icon icon="game-icons:crystal-ball"></iconify-icon>', textClass: 'text-indigo-300', bgClass: 'bg-indigo-500/10 border-indigo-500/30' },
    { key: 'PYRO', label: 'Pyro', icon: '<iconify-icon icon="game-icons:ifrit" style="color: #f97316;"></iconify-icon>', textClass: 'text-orange-400', bgClass: 'bg-orange-500/10 border-orange-500/30' },
    { key: 'CRYO', label: 'Cryo', icon: '<iconify-icon icon="game-icons:ice-cube" style="color: #38bdf8;"></iconify-icon>', textClass: 'text-cyan-300', bgClass: 'bg-cyan-500/10 border-cyan-500/30' },
    { key: 'ELETRICO', label: 'Elétrico', icon: '<iconify-icon icon="game-icons:lightning-branches" style="color: #facc15;"></iconify-icon>', textClass: 'text-yellow-300', bgClass: 'bg-yellow-500/10 border-yellow-500/30' },
    { key: 'PROFANO', label: 'Profano', icon: '<iconify-icon icon="game-icons:eclipse"></iconify-icon>', textClass: 'text-purple-400', bgClass: 'bg-purple-500/10 border-purple-500/30' },
    { key: 'SACRO', label: 'Sacro', icon: '<iconify-icon icon="game-icons:sparkles"></iconify-icon>', textClass: 'text-amber-300', bgClass: 'bg-amber-500/10 border-amber-500/30' },
  ];

  const EFFECT_TARGET_OPTIONS = [
    { group: 'Atributos Vitais & Combate', value: 'VIDA', label: 'Vida Máxima (HP)' },
    { group: 'Atributos Vitais & Combate', value: 'ARMADURA', label: 'Armadura Máxima' },
    { group: 'Atributos Vitais & Combate', value: 'MANA', label: 'Mana Máxima' },
    { group: 'Atributos Vitais & Combate', value: 'PA', label: 'Pontos de Ação (PA)' },
    { group: 'Atributos Vitais & Combate', value: 'CAPACIDADE_PESO', label: 'Capacidade de Peso (kg)' },
    { group: 'Atributos Vitais & Combate', value: 'REGEN_VIDA', label: 'Regenerar Vida' },
    { group: 'Atributos Vitais & Combate', value: 'REGEN_ARMADURA', label: 'Regenerar Armadura' },
    { group: 'Atributos Vitais & Combate', value: 'REGEN_MANA', label: 'Regenerar Mana' },
    { group: 'Atributos Vitais & Combate', value: 'DEFESA', label: 'Defesa' },
    { group: 'Atributos Vitais & Combate', value: 'ATAQUE', label: 'Ataque' },
    { group: 'Atributos Vitais & Combate', value: 'ARCANA', label: 'Arcana' },
    { group: 'Atributos Vitais & Combate', value: 'SANTIDADE', label: 'Santidade' },

    { group: 'Resistências Elementais (%)', value: 'RES_GERAL', label: 'Resistência Geral (%)' },
    { group: 'Resistências Elementais (%)', value: 'RES_FISICO', label: 'Resistência Físico (%)' },
    { group: 'Resistências Elementais (%)', value: 'RES_MAGICO', label: 'Resistência Mágico (%)' },
    { group: 'Resistências Elementais (%)', value: 'RES_PYRO', label: 'Resistência Pyro (%)' },
    { group: 'Resistências Elementais (%)', value: 'RES_CRYO', label: 'Resistência Cryo (%)' },
    { group: 'Resistências Elementais (%)', value: 'RES_ELETRICO', label: 'Resistência Elétrico (%)' },
    { group: 'Resistências Elementais (%)', value: 'RES_PROFANO', label: 'Resistência Profano (%)' },
    { group: 'Resistências Elementais (%)', value: 'RES_SACRO', label: 'Resistência Sacro (%)' },

    { group: 'Limites Máximos de Acúmulos', value: 'ACUMULO_GERAL', label: 'Acúmulos Gerais' },
    { group: 'Limites Máximos de Acúmulos', value: 'ACUMULO_CONGELAMENTO', label: 'Acúmulo de Congelamento' },
    { group: 'Limites Máximos de Acúmulos', value: 'ACUMULO_CHOQUE', label: 'Acúmulo de Choque' },
    { group: 'Limites Máximos de Acúmulos', value: 'ACUMULO_SANGRAMENTO', label: 'Acúmulo de Sangramento' },
    { group: 'Limites Máximos de Acúmulos', value: 'ACUMULO_CHAMAS', label: 'Acúmulo de Chamas' },
    { group: 'Limites Máximos de Acúmulos', value: 'ACUMULO_VENENO', label: 'Acúmulo de Veneno' },
    { group: 'Limites Máximos de Acúmulos', value: 'ACUMULO_ATORDOAMENTO', label: 'Acúmulo de Atordoamento' },
    { group: 'Limites Máximos de Acúmulos', value: 'ACUMULO_CEGUEIRA', label: 'Acúmulo de Cegueira' },

    { group: '5 Atributos Canônicos', value: 'FORCA', label: 'Força' },
    { group: '5 Atributos Canônicos', value: 'DESTREZA', label: 'Destreza' },
    { group: '5 Atributos Canônicos', value: 'INTELIGENCIA', label: 'Inteligência' },
    { group: '5 Atributos Canônicos', value: 'SABEDORIA', label: 'Sabedoria' },
    { group: '5 Atributos Canônicos', value: 'LABIA', label: 'Lábia' },
  ];

  const EFFECT_TARGET_SHORT_LABELS = {
    VIDA: 'VIDA',
    ARMADURA: 'ARMADURA',
    MANA: 'MANA',
    PA: 'PA',
    CAPACIDADE_PESO: 'CAP. PESO (kg)',
    REGEN_VIDA: 'REGEN VIDA',
    REGEN_ARMADURA: 'REGEN ARMADURA',
    REGEN_MANA: 'REGEN MANA',
    DEFESA: 'DEFESA',
    ATAQUE: 'ATAQUE',
    ARCANA: 'ARCANA',
    SANTIDADE: 'SANTIDADE',
    RES_GERAL: 'RES. GERAL (%)',
    RES_FISICO: 'RES. FÍSICO (%)',
    RES_MAGICO: 'RES. MÁGICO (%)',
    RES_PYRO: 'RES. PYRO (%)',
    RES_CRYO: 'RES. CRYO (%)',
    RES_ELETRICO: 'RES. ELÉTRICO (%)',
    RES_PROFANO: 'RES. PROFANO (%)',
    RES_SACRO: 'RES. SACRO (%)',
    ACUMULO_GERAL: 'ACÚM. GERAIS',
    ACUMULO_CONGELAMENTO: 'ACÚM. CONGELAMENTO',
    ACUMULO_CHOQUE: 'ACÚM. CHOQUE',
    ACUMULO_SANGRAMENTO: 'ACÚM. SANGRAMENTO',
    ACUMULO_CHAMAS: 'ACÚM. CHAMAS',
    ACUMULO_VENENO: 'ACÚM. VENENO',
    ACUMULO_ATORDOAMENTO: 'ACÚM. ATORDOAMENTO',
    ACUMULO_CEGUEIRA: 'ACÚM. CEGUEIRA',
    FORCA: 'FORÇA',
    DESTREZA: 'DESTREZA',
    INTELIGENCIA: 'INTELIGÊNCIA',
    SABEDORIA: 'SABEDORIA',
    LABIA: 'LÁBIA',
  };

  function formatEffectTargetLabel(targetStat) {
    if (!targetStat) return '';
    if (EFFECT_TARGET_SHORT_LABELS[targetStat]) return EFFECT_TARGET_SHORT_LABELS[targetStat];
    if (targetStat === 'RESISTENCIA_GERAL') return 'RES. GERAL (%)';
    if (targetStat === 'ACUMULOS_GERAIS') return 'ACÚM. GERAIS';
    return targetStat;
  }

  function renderEffectTargetOptionsHtml(selectedValue) {
    let html = '';
    let currentGroup = null;
    for (const opt of EFFECT_TARGET_OPTIONS) {
      if (opt.group && opt.group !== currentGroup) {
        if (currentGroup !== null) html += '</optgroup>';
        currentGroup = opt.group;
        html += `<optgroup label="${escapeHtml(currentGroup)}">`;
      }
      const isSelected = selectedValue === opt.value ? 'selected' : '';
      html += `<option value="${opt.value}" ${isSelected}>${escapeHtml(opt.label)}</option>`;
    }
    if (currentGroup !== null) html += '</optgroup>';
    return html;
  }

  // ===========================================================================
  // Estado Global no Cliente
  // ===========================================================================
  const state = {
    activeTab: 'overview',
    isHost: ['localhost', '127.0.0.1', '::1', ''].includes(window.location.hostname),
    simulatingPlayer: false,
    localClientIp: window.location.hostname || '127.0.0.1',
    localMemberId: localStorage.getItem(STORAGE_KEY_MEMBER_ID) || 'host_master',
    network: {
      preferred_ip: window.location.hostname || '127.0.0.1',
      invite_url: window.location.origin || 'http://localhost:8000',
      connected_ips: [],
    },
    room: {
      name: 'SALA1',
      subtitle: 'TESTES DE TUDOO',
      quote: 'GRANDES HISTÓRIAS NASCEM DE BOAS COMPANHIAS.\nBEM-VINDOS À MESA.',
      currencyName: 'Ouro',
      sharedGold: 1620,
      isSharedWallet: true,
      unlimitedInventory: true,
      inventoryLimit: 10,
      statModifierPrecedence: 'FLAT_FIRST',
      roundingMode: 'ROUND_DOWN',
      inviteCode: 'RADMIN-LAN-8000',
    },
    members: [],
    characters: [],
    itemsCatalog: [],
    npcs: [],
    escrowSales: [],
    bestiary: [],
    bestiarySearchQuery: '',
    bestiaryPage: 1,
    battle: {
      isActive: false,
      roundNumber: 1,
      totalTurnsCount: 0,
      masterTurnsCount: 0,
      currentTurnIndex: 0,
      groupCharges: 0,
      participantsOrder: [],
    },
    quests: [],
    auditLog: [],
    customPermissionPresets: [],
    skillTrees: [],

    // Skill Trees UI state
    activeSkillTreeId: null,
    activeSkillTreeModalCharId: null,
    activeSkillTreeModalTreeId: null,
    editingSkillTreeId: null,
    editingSkillNodeTreeId: null,
    editingSkillNodeId: null,
    skillTreeSearchQuery: '',
    skillTreeCategoryFilter: 'ALL',
    hostSkillTreeSearchQuery: '',
    hostSkillTreeCategoryFilter: 'ALL',

    // UI Filters & Selections
    searchQuery: '',
    memberSearchQuery: '',
    memberRoleFilter: 'ALL',
    catalogTypeFilter: 'ALL',
    catalogSearchQuery: '',
    npcModalTypeFilter: 'ALL',
    selectedShopNpcId: null,
    selectedBuyerCharId: null,
    shopSearchQuery: '',
    shopTypeFilter: 'ALL',
    questsSearchQuery: '',
    questsStatusFilter: 'ALL',
    auditFilterType: 'ALL',
    auditFilterUser: 'ALL',
    auditFilterSearch: '',

    // Modals & Operations state
    editingMemberId: null,
    editingMemberPermissions: null,
    activePermCategoryId: 'characters',
    activeResistanceCharId: null,
    activeBuffsNerfsCharId: null,
    activeSheetCharId: null,
    activeInventoryCharId: null,
    invModalFilter: 'ALL',
    invModalSearchQuery: '',
    activeAttrOp: 'add',
    activeResOp: 'add',
    activeGoldOp: 'add',
    activeReviveMode: '100',
    damageMode: 'simple', // 'simple' | 'pipeline'
    confirmCallback: null,

    // Undo / Redo & WS
    undoStack: [],
    redoStack: [],
    serverCanUndo: false,
    serverCanRedo: false,
    ws: null,
    wsConnected: false,
    reconnectTimer: null,
    pingTimer: null,
    recentToastSignatures: new Map(),

    // Multiplayer Cursors state
    localCursorClientId: '',
    remoteCursors: new Map(), // cursorId -> { cursorId, memberId, ip, nickname, color, activeTab, region, modalId, relX, relY, vw, vh, lastSeen, el }
    lastCursorSentAt: 0,
    cursorThrottleTimer: null,
    lastLocalPointer: { x: 0, y: 0, hasMoved: false },
    cursorCleanupTimer: null,
  };

  // ===========================================================================
  // Funções Puras do Motor de Regras no Cliente (Espelho de rules_engine.py)
  // ===========================================================================
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function applyRounding(val, mode = state.room?.roundingMode || 'ROUND_DOWN') {
    if (Math.abs(val - Math.round(val)) < 1e-9) return Math.round(val);
    return mode === 'ROUND_UP' ? Math.ceil(val) : Math.floor(val);
  }

  function getAttributeModifier(score) {
    const s = Number(score || 8);
    if (s <= 1) return -5;
    if (s <= 3) return -3;
    if (s <= 5) return -2;
    if (s <= 7) return -1;
    if (s <= 9) return 0;
    if (s <= 11) return 1;
    if (s <= 13) return 2;
    if (s <= 15) return 3;
    if (s <= 17) return 4;
    if (s <= 19) return 5;
    return 7;
  }

  function getPassiveAutoSuccessDc(score) {
    const s = Number(score || 8);
    if (s >= 19) return 11;
    if (s >= 17) return 8;
    if (s >= 15) return 5;
    return null;
  }

  function calculateXpRequiredForLevel(level, roundingMode = state.room?.roundingMode || 'ROUND_DOWN') {
    const lvl = Math.max(1, Math.round(Number(level || 1)));
    let req = 80;
    for (let i = 1; i < lvl; i++) {
      req = applyRounding(req * 1.08, roundingMode);
    }
    return req;
  }

  function grantXpToCharacter(char, xpAmount) {
    const mode = state.room?.roundingMode || 'ROUND_DOWN';
    char.xp = Math.max(0, Number(char.xp || 0) + Number(xpAmount || 0));
    char.level = Math.max(1, Number(char.level || 1));
    char.xpNext = calculateXpRequiredForLevel(char.level, mode);

    let levelsGained = 0;
    while (char.xp >= char.xpNext) {
      char.xp -= char.xpNext;
      char.level += 1;
      levelsGained += 1;
      char.skillPoints = Math.max(0, Number(char.skillPoints || 0)) + 2;
      char.xpNext = calculateXpRequiredForLevel(char.level, mode);
    }
    return levelsGained;
  }

  /**
   * Determina de forma unificada se um efeito (buff ou nerf) é permanente.
   * Considera permanente se:
   * 1. Possui isPermanent === true (ou 'true') ou permanent === true (ou 'true'); OU
   * 2. Não possui duração definida (duration é null, undefined, vazio '' ou não-numérico).
   * Efeitos temporários com turnos positivos restantes (ex: 3) retornam false.
   * Efeitos com duração zerada (0) e sem flag de permanência retornam false (expirados).
   */
  function isBuffEffectPermanent(eff) {
    if (!eff || typeof eff !== 'object') return false;
    if (eff.isPermanent === true || eff.isPermanent === 'true' || eff.permanent === true || eff.permanent === 'true') {
      return true;
    }
    if (eff.duration === null || eff.duration === undefined || eff.duration === '' || eff.duration === 'null') {
      return true;
    }
    const durNum = Number(eff.duration);
    if (!Number.isFinite(durNum)) {
      return true;
    }
    return false;
  }

  function computeStatWithModifiers(baseVal, flatSum, pctSum) {
    const precedence = state.room?.statModifierPrecedence || 'FLAT_FIRST';
    const rounding = state.room?.roundingMode || 'ROUND_DOWN';
    const factor = 1 + Number(pctSum || 0) / 100;
    const raw =
      precedence === 'PERCENT_FIRST'
        ? Number(baseVal || 0) * factor + Number(flatSum || 0)
        : (Number(baseVal || 0) + Number(flatSum || 0)) * factor;
    return applyRounding(raw, rounding);
  }

  /**
   * Adiciona unidades de um item ao inventário do personagem:
   * - Itens equipáveis (`itemTpl.equipavel === true`) NUNCA se juntam (cada unidade ocupa 1 slot próprio com quantity=1).
   * - Itens não-equipáveis (`!itemTpl.equipavel`) podem se juntar no mesmo slot (`quantity += qty`).
   */
  function addItemsToCharacterInventory(char, itemTpl, qty = 1) {
    if (!char || !itemTpl) return;
    char.inventory = char.inventory || [];
    const count = Math.max(1, Math.round(Number(qty || 1)));
    if (itemTpl.equipavel) {
      for (let i = 0; i < count; i++) {
        char.inventory.push({
          id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${i}`,
          itemId: itemTpl.id,
          quantity: 1,
          isEquipped: false,
          status: 'IN_INVENTORY',
        });
      }
    } else {
      const existing = char.inventory.find(
        (inv) => inv.itemId === itemTpl.id && !inv.isEquipped && inv.status === 'IN_INVENTORY'
      );
      if (existing) {
        existing.quantity = Math.max(1, Number(existing.quantity || 1)) + count;
      } else {
        char.inventory.push({
          id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          itemId: itemTpl.id,
          quantity: count,
          isEquipped: false,
          status: 'IN_INVENTORY',
        });
      }
    }
  }

  function recalculateCharacterDerived(char) {
    const itemsById = {};
    for (const it of state.itemsCatalog || []) {
      itemsById[it.id] = it;
    }

    // Garante que itens equipáveis nunca fiquem agrupados (quantity > 1) no inventário
    if (Array.isArray(char.inventory)) {
      const normalizedInv = [];
      for (const inv of char.inventory) {
        if (!inv) continue;
        const tpl = itemsById[inv.itemId];
        const qty = Math.max(1, Math.round(Number(inv.quantity || 1)));
        if (tpl?.equipavel && qty > 1) {
          for (let idx = 0; idx < qty; idx++) {
            normalizedInv.push({
              ...inv,
              id: idx === 0 ? inv.id : `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${idx}`,
              quantity: 1,
              isEquipped: idx === 0 ? Boolean(inv.isEquipped) : false,
            });
          }
        } else {
          if (tpl?.equipavel) inv.quantity = 1;
          else inv.quantity = qty;
          normalizedInv.push(inv);
        }
      }
      char.inventory = normalizedInv;
    }

    const flatMods = {};
    const pctMods = {};
    for (const opt of EFFECT_TARGET_OPTIONS) {
      flatMods[opt.value] = 0;
      pctMods[opt.value] = 0;
    }
    flatMods.RESISTENCIA_GERAL = 0;
    pctMods.RESISTENCIA_GERAL = 0;
    flatMods.ACUMULOS_GERAIS = 0;
    pctMods.ACUMULOS_GERAIS = 0;

    let totalWeight = 0;
    for (const inv of char.inventory || []) {
      if (!inv.isEquipped || inv.status === 'IN_ESCROW') continue;
      const tpl = itemsById[inv.itemId];
      if (!tpl || !tpl.equipavel) continue;
      totalWeight += Number(tpl.peso || 0);

      const directAtk = Number(tpl.attack ?? tpl.ataque ?? 0);
      if (directAtk) flatMods.ATAQUE += directAtk;
      const directArc = Number(tpl.arcana ?? 0);
      if (directArc) flatMods.ARCANA += directArc;

      for (const eff of tpl.effects || []) {
        let tStat = eff.targetStat;
        if (tStat === 'RESISTENCIA_GERAL') tStat = 'RES_GERAL';
        else if (tStat === 'ACUMULOS_GERAIS') tStat = 'ACUMULO_GERAL';
        if (!(tStat in flatMods)) continue;
        if (eff.modifierType === 'PERCENT') {
          pctMods[tStat] += Number(eff.value || 0);
        } else {
          flatMods[tStat] += Number(eff.value || 0);
        }
      }
    }

    for (const buff of char.activeBuffs || []) {
      if (Number(buff.remainingTurns || 0) <= 0) continue;
      for (const eff of buff.effects || []) {
        let tStat = eff.targetStat;
        if (tStat === 'RESISTENCIA_GERAL') tStat = 'RES_GERAL';
        else if (tStat === 'ACUMULOS_GERAIS') tStat = 'ACUMULO_GERAL';
        if (!(tStat in flatMods)) continue;
        if (eff.modifierType === 'PERCENT') {
          pctMods[tStat] += Number(eff.value || 0);
        } else {
          flatMods[tStat] += Number(eff.value || 0);
        }
      }
    }

    // Buffs e Nerfs manuais do combatente (com modificadores, permanência e toggle habilitado)
    for (const bn of char.buffsNerfs || []) {
      if (bn.enabled === false) continue;
      const isPerm = isBuffEffectPermanent(bn);
      const dur = bn.duration;
      if (!isPerm && dur !== null && dur !== undefined && Number(dur) <= 0) continue;

      for (const mod of bn.modifiers || []) {
        let stat = mod.targetStat || mod.stat;
        if (stat === 'RESISTENCIA_GERAL') stat = 'RES_GERAL';
        else if (stat === 'ACUMULOS_GERAIS') stat = 'ACUMULO_GERAL';
        if (!(stat in flatMods)) continue;
        const val = Number(mod.value || 0);
        const mode = String(mod.modifierType || mod.mode || 'FLAT').toUpperCase();
        if (mode === 'PERCENT' || mode === 'PERCENTUAL' || mode === '%') {
          pctMods[stat] += val;
        } else {
          flatMods[stat] += val;
        }
      }

      // Suporte legado a paModifier se não houver modifiers para PA
      if (
        Number(bn.paModifier || 0) !== 0 &&
        (!bn.modifiers || !bn.modifiers.some((m) => (m.targetStat || m.stat) === 'PA'))
      ) {
        flatMods.PA += Number(bn.paModifier || 0);
      }
    }

    // Talentos legados da ficha (compatibilidade)
    for (const tal of char.talents || []) {
      if (!tal || tal.enabled === false) continue;
      for (const mod of tal.modifiers || tal.effects || []) {
        let stat = mod.targetStat || mod.stat;
        if (stat === 'RESISTENCIA_GERAL') stat = 'RES_GERAL';
        else if (stat === 'ACUMULOS_GERAIS') stat = 'ACUMULO_GERAL';
        if (!(stat in flatMods)) continue;
        const val = Number(mod.value || 0);
        const mode = String(mod.modifierType || mod.mode || 'FLAT').toUpperCase();
        if (mode === 'PERCENT' || mode === 'PERCENTUAL' || mode === '%') {
          pctMods[stat] += val;
        } else {
          flatMods[stat] += val;
        }
      }
    }

    // Árvores de Habilidades: Nós adquiridos, Multi-Ranks e Efeito de Árvore Completa (100%)
    if (!char.skillTreeProgress || typeof char.skillTreeProgress !== 'object') {
      char.skillTreeProgress = {};
    }
    const completedTreeIds = [];
    for (const tree of state.skillTrees || []) {
      if (!tree || !Array.isArray(tree.nodes) || tree.nodes.length === 0) continue;
      let totalSteps = 0;
      let acquiredSteps = 0;

      for (const node of tree.nodes) {
        if (!node || !node.id) continue;
        const nState = getCharacterSkillNodeState(char, node);
        totalSteps += nState.totalSteps;
        acquiredSteps += nState.acquiredSteps;

        if (nState.unlocked && nState.enabled) {
          const mult = String(node.category || 'TALENTO').toUpperCase() === 'TALENTO' ? nState.rank : 1;
          if (mult > 0) {
            for (const eff of node.effects || node.modifiers || []) {
              let stat = eff.targetStat || eff.stat;
              if (stat === 'RESISTENCIA_GERAL') stat = 'RES_GERAL';
              else if (stat === 'ACUMULOS_GERAIS') stat = 'ACUMULO_GERAL';
              if (!(stat in flatMods)) continue;
              const val = Number(eff.value || 0) * mult;
              const mode = String(eff.modifierType || eff.mode || 'FLAT').toUpperCase();
              if (mode === 'PERCENT' || mode === 'PERCENTUAL' || mode === '%') {
                pctMods[stat] += val;
              } else {
                flatMods[stat] += val;
              }
            }
          }
        }
      }

      if (totalSteps > 0 && acquiredSteps >= totalSteps) {
        completedTreeIds.push(tree.id);
        for (const cEff of tree.completionEffects || []) {
          let stat = cEff.targetStat || cEff.stat;
          if (stat === 'RESISTENCIA_GERAL') stat = 'RES_GERAL';
          else if (stat === 'ACUMULOS_GERAIS') stat = 'ACUMULO_GERAL';
          if (!(stat in flatMods)) continue;
          const val = Number(cEff.value || 0);
          const mode = String(cEff.modifierType || cEff.mode || 'FLAT').toUpperCase();
          if (mode === 'PERCENT' || mode === 'PERCENTUAL' || mode === '%') {
            pctMods[stat] += val;
          } else {
            flatMods[stat] += val;
          }
        }
      }
    }

    const effectiveAttributes = {};
    char.attributes = char.attributes || {};
    for (const attr of CANONICAL_ATTRIBUTES) {
      const base = Math.max(7, Number(char.attributes[attr.key] ?? 8));
      char.attributes[attr.key] = base;
      const eff = Math.max(1, computeStatWithModifiers(base, flatMods[attr.key], pctMods[attr.key]));
      effectiveAttributes[attr.key] = {
        base,
        effective: eff,
        modifier: getAttributeModifier(eff),
        autoSuccessDc: getPassiveAutoSuccessDc(eff),
      };
    }

    const rawBaseWeight = Number(char.baseMaxWeight ?? char.maxWeight ?? 27);
    char.baseMaxWeight = Number.isFinite(rawBaseWeight) && rawBaseWeight >= 0 ? rawBaseWeight : 27;
    char.skillPassive = String(char.skillPassive || '').trim();
    char.skillActive = String(char.skillActive || '').trim();
    char.skillSupreme = String(char.skillSupreme || '').trim();

    char.elementalResistances = char.elementalResistances || {};
    const effectiveElementalResistances = {};
    const resGeralBonus =
      Number(flatMods.RES_GERAL || flatMods.RESISTENCIA_GERAL || 0) +
      Number(pctMods.RES_GERAL || pctMods.RESISTENCIA_GERAL || 0);

    for (const er of ELEMENTAL_RESISTANCE_TYPES) {
      const rawEr = Number(char.elementalResistances[er.key] ?? 0);
      const baseEr = Number.isFinite(rawEr) ? Number(rawEr.toFixed(1)) : 0;
      char.elementalResistances[er.key] = baseEr;
      const targetKey = `RES_${er.key}`;
      const bonusEr = Number(flatMods[targetKey] || 0) + Number(pctMods[targetKey] || 0) + resGeralBonus;
      effectiveElementalResistances[er.key] = Number((baseEr + bonusEr).toFixed(1));
    }

    // Cálculo dos Limites Máximos de Acúmulos (Painel de Acúmulos / Resistências de Status)
    const ACCUMULATION_STAT_MAP = {
      Congelamento: 'ACUMULO_CONGELAMENTO',
      Choque: 'ACUMULO_CHOQUE',
      Sangramento: 'ACUMULO_SANGRAMENTO',
      Chamas: 'ACUMULO_CHAMAS',
      Veneno: 'ACUMULO_VENENO',
      Atordoamento: 'ACUMULO_ATORDOAMENTO',
      Cegueira: 'ACUMULO_CEGUEIRA',
    };

    const flatAcumGeral = Number(flatMods.ACUMULO_GERAL || flatMods.ACUMULOS_GERAIS || 0);
    const pctAcumGeral = Number(pctMods.ACUMULO_GERAL || pctMods.ACUMULOS_GERAIS || 0);

    char.resistances = char.resistances || {};
    if (!char.initial) char.initial = {};
    if (!char.initial.resistances) char.initial.resistances = {};

    const effectiveResistances = {};
    for (const r of RESISTANCE_TYPES) {
      if (!char.resistances[r.name]) {
        char.resistances[r.name] = { current: 0, max: 100 };
      }
      const curEntry = char.resistances[r.name];
      const baseMax = Number(
        char.initial.resistances[r.name]?.max ?? curEntry.baseMax ?? curEntry.max ?? 100
      );
      curEntry.baseMax = baseMax;
      if (!char.initial.resistances[r.name]) {
        char.initial.resistances[r.name] = { current: curEntry.current || 0, max: baseMax };
      }

      const tStat = ACCUMULATION_STAT_MAP[r.name];
      const indivFlat = tStat ? Number(flatMods[tStat] || 0) : 0;
      const indivPct = tStat ? Number(pctMods[tStat] || 0) : 0;
      const totFlat = flatAcumGeral + indivFlat;
      const totPct = pctAcumGeral + indivPct;

      const effMax = Math.max(1, computeStatWithModifiers(baseMax, totFlat, totPct));
      curEntry.max = effMax;
      if (curEntry.current > effMax) {
        curEntry.current = effMax;
      }
      effectiveResistances[r.name] = {
        current: curEntry.current,
        max: effMax,
        baseMax,
      };
    }

    if (char.resistances['Cegueira']) {
      const curEntry = char.resistances['Cegueira'];
      const baseMax = Number(char.initial.resistances['Cegueira']?.max ?? curEntry.baseMax ?? curEntry.max ?? 100);
      curEntry.baseMax = baseMax;
      const indivFlat = Number(flatMods.ACUMULO_CEGUEIRA || 0);
      const indivPct = Number(pctMods.ACUMULO_CEGUEIRA || 0);
      const effMax = Math.max(1, computeStatWithModifiers(baseMax, flatAcumGeral + indivFlat, pctAcumGeral + indivPct));
      curEntry.max = effMax;
      if (curEntry.current > effMax) curEntry.current = effMax;
      effectiveResistances['Cegueira'] = { current: curEntry.current, max: effMax, baseMax };
    }

    char.baseMaxHp = Math.max(1, Number(char.baseMaxHp ?? char.maxHp ?? 80));
    char.baseMaxArmor = Math.max(0, Number(char.baseMaxArmor ?? char.maxArmor ?? 0));
    char.baseMaxMana = Math.max(0, Number(char.baseMaxMana ?? char.maxMana ?? 100));
    char.baseMaxPa = Math.max(0, Number(char.baseMaxPa ?? char.maxPa ?? 3));
    char.baseRegen = Number(char.baseRegen ?? char.regen ?? 20);
    char.baseDefense = Number(char.baseDefense ?? char.defense ?? 0);
    char.baseAttack = Number(char.baseAttack ?? char.attack ?? 0);
    char.baseArcana = Number(char.baseArcana ?? char.arcana ?? 0);
    char.baseSantidade = Number(char.baseSantidade ?? char.santidade ?? 0);
    char.baseResistancePercent = Number(char.baseResistancePercent ?? char.resistancePercent ?? 0);
    char.baseDamageReductionPercent = Number(char.baseDamageReductionPercent ?? char.damageReductionPercent ?? 0);
    char.armorDegradation = 0;

    const effMaxHp = Math.max(1, computeStatWithModifiers(char.baseMaxHp, flatMods.VIDA, pctMods.VIDA));
    const effMaxArmor = Math.max(0, computeStatWithModifiers(char.baseMaxArmor, flatMods.ARMADURA, pctMods.ARMADURA));
    const effMaxArmorRaw = effMaxArmor;
    const effMaxMana = Math.max(0, computeStatWithModifiers(char.baseMaxMana, flatMods.MANA, pctMods.MANA));
    const effMaxPa = Math.max(0, computeStatWithModifiers(char.baseMaxPa, flatMods.PA, pctMods.PA));
    const effMaxWeight = char.isEnemy
      ? 999
      : Math.max(0, computeStatWithModifiers(char.baseMaxWeight, flatMods.CAPACIDADE_PESO || 0, pctMods.CAPACIDADE_PESO || 0));
    const effRegen = Math.max(0, computeStatWithModifiers(char.baseRegen, flatMods.REGEN_MANA, pctMods.REGEN_MANA));
    const effRegenVida = Math.max(0, applyRounding(flatMods.REGEN_VIDA + effMaxHp * (pctMods.REGEN_VIDA / 100)));
    const effRegenArmadura = Math.max(
      0,
      applyRounding(flatMods.REGEN_ARMADURA + effMaxArmor * (pctMods.REGEN_ARMADURA / 100))
    );
    const effDef = computeStatWithModifiers(char.baseDefense, flatMods.DEFESA, pctMods.DEFESA);
    const effAtk = computeStatWithModifiers(char.baseAttack, flatMods.ATAQUE, pctMods.ATAQUE);
    const effArc = computeStatWithModifiers(char.baseArcana, flatMods.ARCANA, pctMods.ARCANA);
    const effSan = computeStatWithModifiers(char.baseSantidade, flatMods.SANTIDADE, pctMods.SANTIDADE);
    let effResPct = Math.max(0, Math.min(100, applyRounding(char.baseResistancePercent)));
    let effRedPct = Math.max(0, Math.min(100, applyRounding(char.baseDamageReductionPercent)));

    const isFrozen = (char.buffsNerfs || []).some(
      (b) =>
        b.statusKey === 'CONGELAMENTO' ||
        (b.name?.includes('Congelamento') &&
          b.statusKey !== 'IMUNIDADE_CONGELAMENTO' &&
          !b.name?.toLowerCase().includes('imunidade'))
    );
    if (isFrozen) {
      effResPct = Math.min(100, effResPct + 25);
      if (effectiveElementalResistances['FISICO'] !== undefined) {
        effectiveElementalResistances['FISICO'] = Number(
          ((effectiveElementalResistances['FISICO'] || 0) + 25).toFixed(1)
        );
      }
    }

    char.maxHp = effMaxHp;
    char.maxArmor = effMaxArmor;
    char.maxMana = effMaxMana;
    char.maxPa = effMaxPa;
    char.maxWeight = effMaxWeight;
    char.regen = effRegen;
    char.defense = effDef;
    char.attack = effAtk;
    char.arcana = effArc;
    char.santidade = effSan;
    char.resistancePercent = effResPct;
    char.damageReductionPercent = effRedPct;

    char.derived = {
      totalWeight: Number(totalWeight.toFixed(2)),
      effectiveMaxWeight: effMaxWeight,
      completedTreeIds,
      effectiveAttributes,
      effectiveElementalResistances,
      effectiveResistances,
      effectiveMaxArmorUnpenalized: effMaxArmorRaw,
      effectiveRegenVida: effRegenVida,
      effectiveRegenArmadura: effRegenArmadura,
    };

    char.hp = Math.max(0, Number(char.hp ?? char.maxHp));
    char.armor = Math.max(0, Number(char.armor ?? char.maxArmor));
    char.mana = Math.max(0, Number(char.mana ?? char.maxMana));
    char.pa = Math.max(0, Number(char.pa ?? char.maxPa));

    char.isDead = Boolean(char.isDead) || char.hp === 0;
    if (char.isDead) {
      char.hp = 0;
      char.pa = 0;
    }

    return char;
  }

  function evaluateDamagePipelineClient(attacker, target, isTrueDamage) {
    const rounding = state.room?.roundingMode || 'ROUND_DOWN';
    const baseDamage = Math.max(0, Number(attacker.baseDamage || 0));
    const multipliers = Number(attacker.statusMultipliers || 0);
    const bonusPct = Number(attacker.damageBonusPercent || 0);
    const lethalityPct = Math.max(0, Math.min(100, Number(attacker.lethalityPercent || 0)));
    const penetrationPct = Math.max(0, Math.min(100, Number(attacker.penetrationPercent || 0)));
    const rupturePct = Math.max(0, Math.min(100, Number(attacker.rupturePercent || 0)));

    const tDef = Number(target.defense || 0);
    const tResPct = Math.max(0, Math.min(100, Number(target.resistancePercent || 0)));
    const tRedPct = Math.max(0, Math.min(100, Number(target.damageReductionPercent || 0)));
    const curArmor = Math.max(0, Number(target.currentArmor || 0));
    const maxArmor = Math.max(0, Number(target.maxArmor || 0));
    const curHp = Math.max(0, Number(target.currentHp || 0));

    const dBaseEff = Math.max(0, baseDamage + multipliers);
    const dRaw = dBaseEff * (1 + bonusPct / 100);

    if (isTrueDamage) {
      const finalDamage = Math.max(0, applyRounding(dRaw, rounding));
      return {
        dRaw: Number(dRaw.toFixed(1)),
        dAfterDefense: Number(dRaw.toFixed(1)),
        dAfterResistance: Number(dRaw.toFixed(1)),
        finalDamage,
        nextArmor: curArmor,
        armorDegradedBy: 0,
        nextHp: Math.max(0, curHp - finalDamage),
      };
    }

    const effDef = Math.max(0, tDef * (1 - lethalityPct / 100));
    const d1 = Math.max(0, dRaw - effDef);

    const effRes = Math.max(0, Math.min(100, tResPct * (1 - penetrationPct / 100)));
    const d2 = d1 * (1 - effRes / 100);

    const effRed = Math.max(0, Math.min(100, tRedPct * (1 - rupturePct / 100)));
    const dFinalRaw = d2 * (1 - effRed / 100);

    const finalDamage = Math.max(0, applyRounding(dFinalRaw, rounding));

    let nextArmor = curArmor;
    let nextHp = curHp;
    let armorDegradedBy = 0;

    if (finalDamage > curArmor) {
      const overflow = finalDamage - curArmor;
      nextArmor = 0;
      armorDegradedBy = 0;
      nextHp = Math.max(0, curHp - overflow);
    } else {
      nextArmor = curArmor - finalDamage;
    }

    return {
      dRaw: Number(dRaw.toFixed(1)),
      dAfterDefense: Number(d1.toFixed(1)),
      dAfterResistance: Number(d2.toFixed(1)),
      finalDamage,
      nextArmor,
      armorDegradedBy,
      nextHp,
    };
  }

  // ===========================================================================
  // Controle de Papel (Host = Mestre vs Jogador) e Permissões
  // ===========================================================================
  function isEffectiveMaster() {
    return state.isHost && !state.simulatingPlayer;
  }

  function getActiveMember() {
    if (isEffectiveMaster()) {
      return state.members.find((m) => m.role === 'MESTRE') || state.members[0];
    }
    if (state.simulatingPlayer) {
      return (
        state.members.find((m) => m.role === 'JOGADOR') || {
          id: 'simulated_player',
          ip: '26.0.0.99',
          role: 'JOGADOR',
          name: 'Jogador (Visão Teste)',
          nickname: 'Jogador (Visão Teste)',
          characterId: null,
          permissions: getDefaultPermissionsForPreset('JOGADOR_COMUM'),
        }
      );
    }
    return (
      state.members.find((m) => m.id === state.localMemberId || (state.localClientIp && m.ip === state.localClientIp)) ||
      state.members.find((m) => m.role === 'JOGADOR') ||
      state.members[0]
    );
  }

  // ===========================================================================
  // Permissões por Categoria & Presets Canônicos
  // ===========================================================================
  const PERMISSION_CATEGORIES = [
    {
      id: 'characters',
      title: 'Personagens & Fichas',
      icon: 'game-icons:hooded-figure',
      description: 'Criação, edição, visualização e concessão de XP/níveis.',
      permissions: [
        {
          key: 'char_manage_own',
          name: 'Gerenciar Própria Ficha',
          description: 'Editar atributos, talentos, habilidades e usar inventário do próprio personagem.',
          defaultVal: true,
        },
        {
          key: 'char_view_others',
          name: 'Visualizar Outros Personagens',
          description: 'Abrir e inspecionar fichas de outros jogadores em modo somente leitura.',
          defaultVal: true,
        },
        {
          key: 'char_create',
          name: 'Criar Novos Personagens',
          description: 'Criar novas fichas de personagens na mesa através do botão ＋ CRIAR.',
          defaultVal: false,
        },
        {
          key: 'char_edit_others',
          name: 'Editar Fichas de Outros',
          description: 'Alterar atributos, talentos, habilidades e dados de fichas de outros jogadores.',
          defaultVal: false,
        },
        {
          key: 'char_delete',
          name: 'Excluir Personagens',
          description: 'Excluir fichas de personagens da mesa permanentemente.',
          defaultVal: false,
        },
        {
          key: 'char_reorder',
          name: 'Reordenar Fichas',
          description: 'Mudar a ordem dos cards de personagens na mesa arrastando pelo cabeçalho.',
          defaultVal: false,
        },
        {
          key: 'char_grant_xp',
          name: 'Distribuir XP / Nível em Lote',
          description: 'Conceder experiência e alterar níveis e pontos de atributos de personagens.',
          defaultVal: false,
        },
      ],
    },
    {
      id: 'combat',
      title: 'Combate, Turnos & Acúmulos',
      icon: 'game-icons:crossed-swords',
      description: 'Controle de batalha, iniciativa, avançar turnos, cargas e dano.',
      permissions: [
        {
          key: 'combat_advance_own_turn',
          name: 'Avançar Próprio Turno',
          description: 'Avançar o turno da batalha quando for a vez do seu próprio personagem.',
          defaultVal: true,
        },
        {
          key: 'combat_manage_battle',
          name: 'Iniciar / Encerrar Batalha',
          description: 'Iniciar novas batalhas e encerrar batalhas ativas na mesa.',
          defaultVal: false,
        },
        {
          key: 'combat_edit_order',
          name: 'Editar Ordem de Batalha',
          description: 'Alterar a fila de iniciativa e posições dos combatentes na sidebar.',
          defaultVal: false,
        },
        {
          key: 'combat_advance_any_turn',
          name: 'Avançar Qualquer Turno',
          description: 'Forçar o avanço de turno de qualquer participante ou inimigo.',
          defaultVal: false,
        },
        {
          key: 'combat_manage_charges',
          name: 'Controlar Cargas de Batalha',
          description: 'Adicionar, gastar ou resetar o contador de Cargas de batalha.',
          defaultVal: false,
        },
        {
          key: 'combat_apply_damage_others',
          name: 'Ações Rápidas nos Cards (Dano/Vida/Armadura/Mana/Resetar)',
          description: 'Permite usar os 5 botões inferiores dos cards em si mesmo, aliados e inimigos na mesa.',
          defaultVal: true,
        },
        {
          key: 'combat_manage_accumulations_others',
          name: 'Gerenciar Acúmulos / Buffs de Terceiros',
          description: 'Alterar acúmulos, buffs e debuffs de outros personagens e inimigos.',
          defaultVal: false,
        },
      ],
    },
    {
      id: 'inventory',
      title: 'Itens, Inventário & Ouro',
      icon: 'game-icons:backpack',
      description: 'Visualização e manipulação de mochilas, catálogo de itens e moedas.',
      permissions: [
        {
          key: 'inventory_view_others',
          name: 'Visualizar Outros Inventários',
          description: 'Abrir mochilas de outros jogadores em modo somente leitura.',
          defaultVal: true,
        },
        {
          key: 'inventory_transfer_any',
          name: 'Transferir Itens entre Inventários (Qualquer Ficha)',
          description: 'Mover e transferir itens de qualquer ficha para outra ficha da mesa.',
          defaultVal: true,
        },
        {
          key: 'inventory_edit_others',
          name: 'Modificar Inventários de Outros',
          description: 'Adicionar, remover livremente ou equipar itens de outros jogadores.',
          defaultVal: false,
        },
        {
          key: 'item_manage_catalog',
          name: 'Gerenciar Catálogo de Itens',
          description: 'Criar, editar e excluir itens do compêndio geral do jogo.',
          defaultVal: false,
        },
        {
          key: 'gold_manage',
          name: 'Gerenciar Ouro Global',
          description: 'Alterar o saldo de moedas de ouro do cofre compartilhado livremente.',
          defaultVal: false,
        },
      ],
    },
    {
      id: 'shop',
      title: 'Loja, Mercadores & Escrow',
      icon: 'game-icons:shop',
      description: 'Compra, venda, gerenciamento de NPCs mercadores e aprovações.',
      permissions: [
        {
          key: 'shop_buy_sell',
          name: 'Comprar e Vender na Loja',
          description: 'Comprar produtos dos mercadores e solicitar vendas para o Escrow.',
          defaultVal: true,
        },
        {
          key: 'shop_manage_npcs',
          name: 'Gerenciar Mercadores (NPCs)',
          description: 'Criar mercadores, definir estoque, preços e tipos de moeda.',
          defaultVal: false,
        },
        {
          key: 'shop_approve_escrow',
          name: 'Aprovar Vendas no Escrow',
          description: 'Avaliar e aprovar ou recusar solicitações de venda de jogadores.',
          defaultVal: false,
        },
      ],
    },
    {
      id: 'bestiary',
      title: 'Bestiário & Invocação',
      icon: 'game-icons:monster-grasp',
      description: 'Acesso a criaturas hostis, revelação e convocação para a mesa.',
      permissions: [
        {
          key: 'bestiary_view_revealed',
          name: 'Ver Bestas Reveladas',
          description: 'Ver fichas e dados de criaturas reveladas pelo Mestre.',
          defaultVal: true,
        },
        {
          key: 'bestiary_view_hidden',
          name: 'Ver Bestas Ocultas',
          description: 'Acessar informações completas de monstros não revelados aos jogadores.',
          defaultVal: false,
        },
        {
          key: 'bestiary_manage',
          name: 'Gerenciar Bestiário',
          description: 'Criar, editar e excluir criaturas do Bestiário.',
          defaultVal: false,
        },
        {
          key: 'bestiary_summon',
          name: 'Trazer Inimigos para Mesa',
          description: 'Puxar monstros do Bestiário para o combate e dispensá-los.',
          defaultVal: false,
        },
      ],
    },
    {
      id: 'system',
      title: 'Missões & Sistema',
      icon: 'game-icons:scroll-quill',
      description: 'Mural de missões, recompensas, histórico temporal e auditoria.',
      permissions: [
        {
          key: 'mission_accept',
          name: 'Aceitar Missões',
          description: 'Aceitar missões disponíveis no mural com o próprio personagem.',
          defaultVal: true,
        },
        {
          key: 'mission_manage',
          name: 'Gerenciar Mural de Missões',
          description: 'Criar, editar e remover missões do mural.',
          defaultVal: false,
        },
        {
          key: 'mission_approve',
          name: 'Aprovar Conclusão de Missões',
          description: 'Validar missões concluídas e distribuir as recompensas.',
          defaultVal: false,
        },
        {
          key: 'system_undo_redo',
          name: 'Desfazer / Refazer (Undo/Redo)',
          description: 'Usar o histórico temporal para reverter mutações do jogo.',
          defaultVal: false,
        },
        {
          key: 'system_view_audit_log',
          name: 'Ver Histórico de Auditoria',
          description: 'Consultar o log completo de ações dos participantes.',
          defaultVal: false,
        },
      ],
    },
  ];

  const PRESET_DEFINITIONS = {
    JOGADOR_COMUM: {
      char_manage_own: true,
      char_view_others: true,
      char_create: true,
      char_edit_others: false,
      char_delete: false,
      char_reorder: false,
      char_grant_xp: false,
      combat_advance_own_turn: true,
      combat_manage_battle: false,
      combat_edit_order: false,
      combat_advance_any_turn: false,
      combat_manage_charges: true,
      combat_apply_damage_others: true,
      combat_manage_accumulations_others: false,
      inventory_view_others: true,
      inventory_transfer_any: true,
      inventory_edit_others: false,
      item_manage_catalog: false,
      gold_manage: false,
      shop_buy_sell: true,
      shop_manage_npcs: false,
      shop_approve_escrow: false,
      bestiary_view_revealed: true,
      bestiary_view_hidden: false,
      bestiary_manage: false,
      bestiary_summon: false,
      mission_accept: true,
      mission_manage: false,
      mission_approve: false,
      system_undo_redo: false,
      system_view_audit_log: true,
    },
    SUB_MESTRE: {
      char_manage_own: true,
      char_view_others: true,
      char_create: true,
      char_edit_others: true,
      char_delete: false,
      char_reorder: false,
      char_grant_xp: true,
      combat_advance_own_turn: true,
      combat_manage_battle: true,
      combat_edit_order: true,
      combat_advance_any_turn: true,
      combat_manage_charges: true,
      combat_apply_damage_others: true,
      combat_manage_accumulations_others: true,
      inventory_view_others: true,
      inventory_transfer_any: true,
      inventory_edit_others: true,
      item_manage_catalog: false,
      gold_manage: false,
      shop_buy_sell: true,
      shop_manage_npcs: true,
      shop_approve_escrow: true,
      bestiary_view_revealed: true,
      bestiary_view_hidden: false,
      bestiary_manage: false,
      bestiary_summon: true,
      mission_accept: true,
      mission_manage: true,
      mission_approve: true,
      system_undo_redo: false,
      system_view_audit_log: true,
    },
    ESPECTADOR: {
      char_manage_own: false,
      char_view_others: true,
      char_create: false,
      char_edit_others: false,
      char_delete: false,
      char_reorder: false,
      char_grant_xp: false,
      combat_advance_own_turn: false,
      combat_manage_battle: false,
      combat_edit_order: false,
      combat_advance_any_turn: false,
      combat_manage_charges: false,
      combat_apply_damage_others: false,
      combat_manage_accumulations_others: false,
      inventory_view_others: true,
      inventory_transfer_any: false,
      inventory_edit_others: false,
      item_manage_catalog: false,
      gold_manage: false,
      shop_buy_sell: false,
      shop_manage_npcs: false,
      shop_approve_escrow: false,
      bestiary_view_revealed: true,
      bestiary_view_hidden: false,
      bestiary_manage: false,
      bestiary_summon: false,
      mission_accept: false,
      mission_manage: false,
      mission_approve: false,
      system_undo_redo: false,
      system_view_audit_log: false,
    },
  };

  function syncLegacyPermAliases(perms) {
    if (!perms || typeof perms !== 'object') return;
    perms.canCreateCharacters = Boolean(perms.char_create);
    perms.canEditOwnCharacter = Boolean(perms.char_manage_own);
    perms.canEditOtherCharacters = Boolean(perms.char_edit_others);
    perms.canDeleteCharacters = Boolean(perms.char_delete);
    perms.canViewOtherInventories = Boolean(perms.inventory_view_others);
    perms.canManageItemsCatalog = Boolean(perms.item_manage_catalog);
    perms.canApproveSales = Boolean(perms.shop_approve_escrow);
    perms.canManageShopNpcs = Boolean(perms.shop_manage_npcs);
    perms.canManageGold = Boolean(perms.gold_manage);
    perms.canManageQuests = Boolean(perms.mission_manage);
    perms.canViewAudit = Boolean(perms.system_view_audit_log);
  }

  function getDefaultPermissionsForPreset(preset) {
    if (!preset) return { preset: 'JOGADOR_COMUM', ...PRESET_DEFINITIONS.JOGADOR_COMUM };
    const norm = String(preset).toUpperCase();
    if (norm === 'MESTRE_TOTAL') {
      return masterFullPermissionsClient();
    }
    const custom = (state.customPermissionPresets || []).find(
      (cp) => cp && (cp.id === preset || cp.id === norm || (cp.name && cp.name.toUpperCase() === norm))
    );
    if (custom && custom.permissions) {
      const perms = { preset: custom.id, ...deepClone(custom.permissions) };
      syncLegacyPermAliases(perms);
      return perms;
    }
    const def = PRESET_DEFINITIONS[norm] || PRESET_DEFINITIONS.JOGADOR_COMUM;
    const perms = { preset: norm in PRESET_DEFINITIONS ? norm : 'PERSONALIZADO', ...def };
    syncLegacyPermAliases(perms);
    return perms;
  }

  function masterFullPermissionsClient() {
    const full = { preset: 'MESTRE_TOTAL' };
    PERMISSION_CATEGORIES.forEach((cat) => {
      cat.permissions.forEach((p) => {
        full[p.key] = true;
      });
    });
    syncLegacyPermAliases(full);
    return full;
  }

  function detectMatchingPreset(perms) {
    if (!perms) return 'JOGADOR_COMUM';
    if (perms.preset) {
      const explicitCustom = (state.customPermissionPresets || []).find((cp) => cp && cp.id === perms.preset);
      if (explicitCustom && explicitCustom.permissions) {
        let matches = true;
        for (const cat of PERMISSION_CATEGORIES) {
          for (const p of cat.permissions) {
            if (Boolean(perms[p.key]) !== Boolean(explicitCustom.permissions[p.key])) {
              matches = false;
              break;
            }
          }
          if (!matches) break;
        }
        if (matches) return explicitCustom.id;
      }
      if (PRESET_DEFINITIONS[perms.preset]) {
        const defObj = PRESET_DEFINITIONS[perms.preset];
        let matches = true;
        for (const [k, v] of Object.entries(defObj)) {
          if (Boolean(perms[k]) !== Boolean(v)) {
            matches = false;
            break;
          }
        }
        if (matches) return perms.preset;
      }
    }
    for (const cp of (state.customPermissionPresets || [])) {
      if (!cp || !cp.permissions) continue;
      let matches = true;
      for (const cat of PERMISSION_CATEGORIES) {
        for (const p of cat.permissions) {
          if (Boolean(perms[p.key]) !== Boolean(cp.permissions[p.key])) {
            matches = false;
            break;
          }
        }
        if (!matches) break;
      }
      if (matches) return cp.id;
    }
    for (const [presetKey, defObj] of Object.entries(PRESET_DEFINITIONS)) {
      let matches = true;
      for (const [k, v] of Object.entries(defObj)) {
        if (Boolean(perms[k]) !== Boolean(v)) {
          matches = false;
          break;
        }
      }
      if (matches) return presetKey;
    }
    return 'PERSONALIZADO';
  }

  const PERM_LEGACY_MAP = {
    char_manage_own: 'canEditOwnCharacter',
    char_create: 'canCreateCharacters',
    char_edit_others: 'canEditOtherCharacters',
    char_delete: 'canDeleteCharacters',
    inventory_view_others: 'canViewOtherInventories',
    item_manage_catalog: 'canManageItemsCatalog',
    shop_approve_escrow: 'canApproveSales',
    shop_manage_npcs: 'canManageShopNpcs',
    gold_manage: 'canManageGold',
    mission_manage: 'canManageQuests',
    system_view_audit_log: 'canViewAudit',
  };
  const LEGACY_TO_PERM_MAP = {
    canEditOwnCharacter: 'char_manage_own',
    canCreateCharacters: 'char_create',
    canEditOtherCharacters: 'char_edit_others',
    canDeleteCharacters: 'char_delete',
    canViewOtherInventories: 'inventory_view_others',
    canManageItemsCatalog: 'item_manage_catalog',
    canApproveSales: 'shop_approve_escrow',
    canManageShopNpcs: 'shop_manage_npcs',
    canManageGold: 'gold_manage',
    canManageQuests: 'mission_manage',
    canViewAudit: 'system_view_audit_log',
  };

  function hasPermission(permKey) {
    if (isEffectiveMaster()) return true;
    const member = getActiveMember();
    if (!member || !member.permissions) return false;
    const perms = member.permissions;

    if (perms[permKey] !== undefined) return Boolean(perms[permKey]);
    if (PERM_LEGACY_MAP[permKey] && perms[PERM_LEGACY_MAP[permKey]] !== undefined) {
      return Boolean(perms[PERM_LEGACY_MAP[permKey]]);
    }
    if (LEGACY_TO_PERM_MAP[permKey] && perms[LEGACY_TO_PERM_MAP[permKey]] !== undefined) {
      return Boolean(perms[LEGACY_TO_PERM_MAP[permKey]]);
    }
    const def = getDefaultPermissionsForPreset(perms.preset || (member.role === 'MESTRE' ? 'MESTRE_TOTAL' : 'JOGADOR_COMUM'));
    if (def && def[permKey] !== undefined) {
      return Boolean(def[permKey]);
    }
    return false;
  }

  function isCharacterOwner(char) {
    if (!char) return false;
    if (char.isEnemy || char.type === 'enemy' || char.bestiaryId) return false;
    const activeMem = getActiveMember();
    if (!activeMem) return false;

    if (char.ownerId && (char.ownerId === activeMem.id || char.ownerId === state.localMemberId)) return true;
    if (activeMem.characterId && activeMem.characterId === char.id) return true;
    if (char.ownerMemberId && char.ownerMemberId === activeMem.id) return true;
    if (!state.simulatingPlayer && state.localClientIp && char.ownerIp && char.ownerIp === state.localClientIp) {
      return true;
    }
    if (activeMem.ip && char.ownerIp && char.ownerIp === activeMem.ip) {
      return true;
    }
    return false;
  }

  function canEditCharacter(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (char.isEnemy) return false;

    if (isCharacterOwner(char)) {
      return hasPermission('char_manage_own');
    }
    return hasPermission('char_edit_others');
  }

  function canViewCharacter(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (char.isEnemy) {
      const bestiaryRef = (state.bestiary || []).find((b) => b.id === char.bestiaryId);
      const isRevealed = bestiaryRef ? Boolean(bestiaryRef.reveladoParaJogadores) : Boolean(char.reveladoParaJogadores);
      return isRevealed || hasPermission('bestiary_view_hidden');
    }
    if (isCharacterOwner(char)) return true;
    return hasPermission('char_view_others') || hasPermission('char_edit_others');
  }

  function canEditInventory(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (char.isEnemy) return false;

    if (isCharacterOwner(char)) {
      return hasPermission('char_manage_own');
    }
    return hasPermission('inventory_edit_others');
  }

  function canTransferFromInventory(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (char.isEnemy) return false;
    if (hasPermission('inventory_transfer_any')) return true;
    if (isCharacterOwner(char)) return hasPermission('char_manage_own');
    return hasPermission('inventory_edit_others');
  }

  function canViewInventory(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (char.isEnemy) return false;
    if (isCharacterOwner(char)) return true;
    return (
      hasPermission('inventory_view_others') ||
      hasPermission('inventory_transfer_any') ||
      hasPermission('inventory_edit_others')
    );
  }

  function canApplyCombatActions(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (char.isEnemy) {
      return hasPermission('combat_apply_damage_others');
    }
    if (isCharacterOwner(char)) {
      return hasPermission('char_manage_own');
    }
    return hasPermission('combat_apply_damage_others');
  }

  function canAdjustPa(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (char.isEnemy) {
      return hasPermission('combat_apply_damage_others') || hasPermission('combat_edit_order');
    }
    if (isCharacterOwner(char)) {
      return hasPermission('char_manage_own');
    }
    return hasPermission('combat_apply_damage_others');
  }

  function canManageAccumulations(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (char.isEnemy) {
      return hasPermission('combat_manage_accumulations_others');
    }
    if (isCharacterOwner(char)) {
      return hasPermission('char_manage_own');
    }
    return hasPermission('combat_manage_accumulations_others');
  }

  function updateRoleUI() {
    const roleBtn = document.getElementById('btn-role-badge');
    const roleIcon = document.getElementById('role-badge-icon');
    const roleText = document.getElementById('role-badge-text');

    const masterMode = isEffectiveMaster();
    if (roleBtn && roleIcon && roleText) {
      if (masterMode) {
        roleBtn.classList.remove('role-player');
        roleIcon.innerHTML = '<iconify-icon icon="game-icons:crown"></iconify-icon>';
        roleText.textContent = 'MODO MESTRE';
      } else {
        roleBtn.classList.add('role-player');
        roleIcon.innerHTML = '<iconify-icon icon="game-icons:hooded-figure"></iconify-icon>';
        roleText.textContent = state.isHost ? 'VISÃO JOGADOR' : 'MODO JOGADOR';
      }
    }

    document.querySelectorAll('.master-only-el').forEach((el) => {
      if (masterMode) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    // Ajustes finos baseados no novo sistema granular de permissões
    const canCreateChar = hasPermission('char_create');
    document.getElementById('btn-create-char')?.classList.toggle('hidden', !canCreateChar);

    const canSummon = hasPermission('bestiary_summon');
    document.getElementById('btn-spawn-enemy')?.classList.toggle('hidden', !canSummon);

    const canManageBattle = hasPermission('combat_manage_battle');
    document.getElementById('btn-battle-toggle')?.classList.toggle('hidden', !canManageBattle);

    const canGrantXp = hasPermission('char_grant_xp');
    document.getElementById('btn-bulk-rewards')?.classList.toggle('hidden', !canGrantXp);
    document.getElementById('btn-quests-bulk-xp')?.classList.toggle('hidden', !canGrantXp);

    const canManageCatalog = hasPermission('item_manage_catalog');
    document.getElementById('btn-new-catalog-item')?.classList.toggle('hidden', !canManageCatalog);

    const canManageShopNpc = hasPermission('shop_manage_npcs');
    document.getElementById('btn-new-npc')?.classList.toggle('hidden', !canManageShopNpc);

    const canManageBestiary = hasPermission('bestiary_manage');
    document.getElementById('btn-create-enemy')?.classList.toggle('hidden', !canManageBestiary);

    const canManageQuests = hasPermission('mission_manage');
    document.getElementById('btn-new-quest')?.classList.toggle('hidden', !canManageQuests);

    const canManageGold = hasPermission('gold_manage');
    const goldBtn = document.getElementById('btn-manage-gold');
    if (goldBtn) {
      goldBtn.classList.toggle('hidden', !canManageGold);
      goldBtn.style.cursor = canManageGold ? 'pointer' : 'default';
      goldBtn.title = canManageGold ? 'Gerenciar Saldo de Ouro' : 'Saldo Global de Ouro';
    }

    const canUndoRedo = hasPermission('system_undo_redo');
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.classList.toggle('hidden', !canUndoRedo);
    if (redoBtn) redoBtn.classList.toggle('hidden', !canUndoRedo);
  }

  // ===========================================================================
  // Persistência Local (Fallback) & Tema
  // ===========================================================================
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    const theme = saved === 'light' ? 'light' : 'dark';
    applyTheme(theme);
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerHTML = theme === 'dark' ? '<iconify-icon icon="game-icons:crescent-blade"></iconify-icon>' : '<iconify-icon icon="game-icons:sun"></iconify-icon>';
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (_) {}
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }

  function buildGeomanciaSkillTreeTemplate() {
    return {
      id: 'tree_geomancia_exemplo',
      name: 'Geomancia',
      description: 'Domínio telúrico focado em fortificação de armadura, postura defensiva inabalável e retaliação sísmica.',
      hiddenForPlayers: false,
      completionDescription: 'Domínio completo da terra: +10 kg de Capacidade de Peso máxima na mochila.',
      completionEffects: [
        { targetStat: 'CAPACIDADE_PESO', modifierType: 'FLAT', value: 10 },
      ],
      nodes: [
        {
          id: 'node_geo_passiva_1',
          category: 'PASSIVA',
          name: 'Geomancia',
          subtype: '',
          description:
            'Inicia batalhas com 10% de sua capacidade de armadura como armadura adicional, e aumenta sua defesa enquanto tem armadura em 8%+2. Se sua armadura for quebrada, causa 25+40% de seu ataque e arcana ao atacante, esse dano possui 50% de letalidade.',
          unlockCost: 6,
          maxRanks: 1,
          costPerRank: 6,
          maxUpgrades: 0,
          upgradeCost: 0,
          upgradeDescription: '',
          manaCost: '',
          paCost: '',
          uses: '',
          cooldown: '',
          effects: [],
          order: 0,
        },
        {
          id: 'node_geo_passiva_2',
          category: 'PASSIVA',
          name: 'Foco de Armadura',
          subtype: '',
          description:
            'Aumenta sua redução de dano em 10% enquanto tiver armadura, mas recebe 15%+1 de dano quando sofrer dano fora da armadura (efeitos não inclusos).',
          unlockCost: 4,
          maxRanks: 1,
          costPerRank: 4,
          maxUpgrades: 0,
          upgradeCost: 0,
          upgradeDescription: '',
          manaCost: '',
          paCost: '',
          uses: '',
          cooldown: '',
          effects: [],
          order: 1,
        },
        {
          id: 'node_geo_ativa_1',
          category: 'ATIVA',
          name: 'Armadura de Rochas',
          subtype: 'Postura',
          description:
            'Recupera 10% de sua armadura máxima e um adicional de 65% de sua arcana, para si ou um aliado, enquanto mantiver a postura o alvo recebe 5 de defesa e 8% de resistência geral, mas se sua postura for quebrada você sofre 55 acúmulos de atordoamento.',
          unlockCost: 4,
          maxRanks: 1,
          costPerRank: 4,
          maxUpgrades: 2,
          upgradeCost: 2,
          upgradeDescription: 'Recuperação com base em armadura +2%.',
          manaCost: '35',
          paCost: '2',
          uses: '3',
          cooldown: '',
          effects: [],
          order: 2,
        },
        {
          id: 'node_geo_talento_1',
          category: 'TALENTO',
          name: 'Blindagem',
          subtype: '',
          description: 'Aumenta a armadura em 4 e defesa em 1.',
          unlockCost: 1,
          maxRanks: 5,
          costPerRank: 1,
          maxUpgrades: 0,
          upgradeCost: 1,
          upgradeDescription: '',
          manaCost: '',
          paCost: '',
          uses: '',
          cooldown: '',
          effects: [
            { targetStat: 'ARMADURA', modifierType: 'FLAT', value: 4 },
            { targetStat: 'DEFESA', modifierType: 'FLAT', value: 1 },
          ],
          order: 3,
        },
        {
          id: 'node_geo_talento_2',
          category: 'TALENTO',
          name: 'Vigor',
          subtype: '',
          description: 'Aumenta o HP em 5.',
          unlockCost: 1,
          maxRanks: 5,
          costPerRank: 1,
          maxUpgrades: 0,
          upgradeCost: 1,
          upgradeDescription: '',
          manaCost: '',
          paCost: '',
          uses: '',
          cooldown: '',
          effects: [
            { targetStat: 'VIDA', modifierType: 'FLAT', value: 5 },
          ],
          order: 4,
        },
      ],
    };
  }

  function getVisibleSkillTrees() {
    const trees = Array.isArray(state.skillTrees) ? state.skillTrees : [];
    if (isEffectiveMaster()) return trees;
    return trees.filter((t) => t && !t.hiddenForPlayers && !t.ocultarParaJogadores);
  }

  function getCharacterSkillNodeState(char, node) {
    if (!node || !node.id) {
      return {
        isTalent: true,
        unlocked: false,
        isAcquired: false,
        isMaxed: false,
        rank: 0,
        upgrades: 0,
        maxRanks: 1,
        maxUpgrades: 0,
        enabled: true,
        acquiredSteps: 0,
        totalSteps: 1,
        unlockCost: 1,
        upgradeCost: 1,
        costPerRank: 1,
      };
    }
    const rawProg = (char?.skillTreeProgress && char.skillTreeProgress[node.id]) || {};
    const cat = String(node.category || 'TALENTO').toUpperCase();
    const isTalent = cat === 'TALENTO';
    const enabled = rawProg.enabled !== false;

    if (isTalent) {
      const maxRanks = Math.max(1, Math.round(Number(node.maxRanks || 1)));
      const costPerRank = Math.max(0, Math.round(Number(node.costPerRank ?? node.unlockCost ?? 1)));
      const rank = Math.max(0, Math.min(maxRanks, Math.round(Number(rawProg.rank || 0))));
      const unlocked = rank > 0;
      const isMaxed = rank >= maxRanks;
      return {
        isTalent: true,
        unlocked,
        isAcquired: unlocked,
        isMaxed,
        rank,
        upgrades: 0,
        maxRanks,
        maxUpgrades: 0,
        enabled,
        acquiredSteps: rank,
        totalSteps: maxRanks,
        unlockCost: costPerRank,
        upgradeCost: costPerRank,
        costPerRank,
      };
    }

    const unlockCost = Math.max(0, Math.round(Number(node.unlockCost ?? node.costPerRank ?? 1)));
    const maxUpgrades = Math.max(0, Math.round(Number(node.maxUpgrades || 0)));
    const upgradeCost = Math.max(0, Math.round(Number(node.upgradeCost ?? 1)));
    const unlocked = Boolean(rawProg.unlocked || Number(rawProg.rank || 0) > 0);
    const upgrades = unlocked
      ? Math.max(0, Math.min(maxUpgrades, Math.round(Number(rawProg.upgrades || 0))))
      : 0;
    const rank = unlocked ? 1 : 0;
    const acquiredSteps = (unlocked ? 1 : 0) + upgrades;
    const totalSteps = 1 + maxUpgrades;
    const isMaxed = unlocked && acquiredSteps >= totalSteps;

    return {
      isTalent: false,
      unlocked,
      isAcquired: unlocked,
      isMaxed,
      rank,
      upgrades,
      maxRanks: 1,
      maxUpgrades,
      enabled,
      acquiredSteps,
      totalSteps,
      unlockCost,
      upgradeCost,
      costPerRank: unlockCost,
    };
  }

  function normalizeSkillSearchTerm(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function doesSkillNodeMatchSearch(node, searchQuery) {
    const qRaw = String(searchQuery || '').toLowerCase().trim();
    if (!qRaw) return true;
    const qNorm = normalizeSkillSearchTerm(qRaw);
    if (!node) return false;

    const candidateParts = [
      node.name || '',
      node.description || '',
      node.upgradeDescription || '',
      node.subtype || '',
      node.category || '',
    ];

    const effectsList = Array.isArray(node.effects)
      ? node.effects
      : Array.isArray(node.modifiers)
      ? node.modifiers
      : [];
    for (const ef of effectsList) {
      if (!ef || !ef.targetStat) continue;
      candidateParts.push(ef.targetStat);
      candidateParts.push(formatEffectTargetLabel(ef.targetStat));
      const fullOpt = EFFECT_TARGET_OPTIONS.find((o) => o.value === ef.targetStat);
      if (fullOpt && fullOpt.label) {
        candidateParts.push(fullOpt.label);
      }
    }

    const haystackRaw = candidateParts.join(' ').toLowerCase();
    if (haystackRaw.includes(qRaw)) return true;
    const haystackNorm = normalizeSkillSearchTerm(haystackRaw);
    return haystackNorm.includes(qNorm);
  }

  function doesSkillNodeMatchFilter(node, char, searchQuery, categoryFilter = 'ALL') {
    if (!node) return false;
    const filter = String(categoryFilter || 'ALL').toUpperCase();
    const nodeCat = String(node.category || 'TALENTO').toUpperCase();

    if (filter === 'ACQUIRED') {
      if (!char) return false;
      const ns = getCharacterSkillNodeState(char, node);
      if (!ns.isAcquired) return false;
    } else if (filter !== 'ALL' && nodeCat !== filter) {
      return false;
    }

    return doesSkillNodeMatchSearch(node, searchQuery);
  }

  function countMatchingNodesInTree(tree, char, searchQuery, categoryFilter = 'ALL') {
    const nodes = Array.isArray(tree?.nodes) ? tree.nodes : [];
    let count = 0;
    for (const n of nodes) {
      if (doesSkillNodeMatchFilter(n, char, searchQuery, categoryFilter)) {
        count += 1;
      }
    }
    return count;
  }

  function computeSkillTreeProgress(char, tree) {
    const nodes = Array.isArray(tree?.nodes) ? tree.nodes : [];
    if (nodes.length === 0) {
      return {
        acquiredSteps: 0,
        totalSteps: 0,
        percent: 0,
        isComplete: false,
        unlockedNodesCount: 0,
        totalNodesCount: 0,
        spentPoints: 0,
      };
    }
    let acquiredSteps = 0;
    let totalSteps = 0;
    let unlockedNodesCount = 0;
    let spentPoints = 0;

    for (const node of nodes) {
      if (!node || !node.id) continue;
      const st = getCharacterSkillNodeState(char, node);
      acquiredSteps += st.acquiredSteps;
      totalSteps += st.totalSteps;
      if (st.unlocked) {
        unlockedNodesCount += 1;
        if (String(node.category || 'TALENTO').toUpperCase() === 'TALENTO') {
          spentPoints += st.rank * st.costPerRank;
        } else {
          spentPoints += st.unlockCost + st.upgrades * st.upgradeCost;
        }
      }
    }

    const isComplete = totalSteps > 0 && acquiredSteps >= totalSteps;
    const percent = totalSteps > 0 ? Math.min(100, Math.floor((acquiredSteps / totalSteps) * 100)) : 0;

    return {
      acquiredSteps,
      totalSteps,
      percent: isComplete ? 100 : percent,
      isComplete,
      unlockedNodesCount,
      totalNodesCount: nodes.length,
      spentPoints,
    };
  }

  function getCharacterAcquiredTreeSkillsByCategory(char, category) {
    const targetCat = String(category || '').toUpperCase();
    const results = [];
    if (!char) return results;
    for (const tree of state.skillTrees || []) {
      if (!tree || !Array.isArray(tree.nodes)) continue;
      if (!isEffectiveMaster() && (tree.hiddenForPlayers || tree.ocultarParaJogadores)) continue;
      for (const node of tree.nodes) {
        if (!node || String(node.category || '').toUpperCase() !== targetCat) continue;
        const nodeState = getCharacterSkillNodeState(char, node);
        if (nodeState.unlocked) {
          results.push({ tree, node, nodeState });
        }
      }
    }
    return results;
  }

  // Função auxiliar isolada para metadados de combate de habilidades (Mana, PA, Usos, Recarga)
  function renderSkillCombatTags(node) {
    if (!node) return '';
    const badges = [];
    const mana = String(node.manaCost ?? '').trim();
    const pa = String(node.paCost ?? '').trim();
    const uses = String(node.uses ?? '').trim();
    const cooldown = String(node.cooldown ?? '').trim();

    if (mana !== '' && mana !== '0') {
      badges.push(
        `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/40" title="Custo de Mana"><iconify-icon icon="game-icons:sparkles"></iconify-icon> Mana: ${escapeHtml(mana)}</span>`
      );
    }
    if (pa !== '' && pa !== '0') {
      badges.push(
        `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/40" title="Custo de Pontos de Ação (PA)"><iconify-icon icon="game-icons:lightning-helix"></iconify-icon> PA: ${escapeHtml(pa)}</span>`
      );
    }
    if (uses !== '' && uses !== '0') {
      badges.push(
        `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" title="Limite de Usos"><iconify-icon icon="game-icons:Concentric-crescents"></iconify-icon> Usos: ${escapeHtml(uses)}</span>`
      );
    }
    if (cooldown !== '' && cooldown !== '0') {
      badges.push(
        `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/40" title="Recarga / Cooldown"><iconify-icon icon="game-icons:sands-of-time"></iconify-icon> Recarga: ${escapeHtml(cooldown)}</span>`
      );
    }

    if (badges.length === 0) return '';
    return `<div class="skill-combat-tags-bar flex flex-wrap items-center gap-1.5">${badges.join('')}</div>`;
  }

  function saveStateToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_CHARS, JSON.stringify(state.characters));
      localStorage.setItem(
        STORAGE_KEY_STATE,
        JSON.stringify({
          room: state.room,
          members: state.members,
          characters: state.characters,
          itemsCatalog: state.itemsCatalog,
          npcs: state.npcs,
          escrowSales: state.escrowSales,
          bestiary: state.bestiary,
          battle: state.battle,
          quests: state.quests,
          auditLog: state.auditLog,
          customPermissionPresets: state.customPermissionPresets,
          skillTrees: state.skillTrees,
        })
      );
    } catch (_) {}
  }

  function buildFallbackDefaultState() {
    const res = {};
    for (const r of RESISTANCE_TYPES) {
      res[r.name] = { current: 0, max: 100 };
    }
    state.characters = [
      {
        id: 'char_default_1',
        name: 'Teste',
        level: 1,
        xp: 0,
        xpNext: 80,
        skillPoints: 0,
        pendingAttributePoints: 0,
        hp: 143,
        maxHp: 143,
        baseMaxHp: 143,
        armor: 117,
        maxArmor: 117,
        baseMaxArmor: 117,
        armorDegradation: 0,
        mana: 200,
        maxMana: 200,
        baseMaxMana: 200,
        pa: 3,
        maxPa: 3,
        baseMaxPa: 3,
        regen: 20,
        baseRegen: 20,
        defense: 0,
        baseDefense: 0,
        attack: 12,
        baseAttack: 12,
        arcana: 5,
        baseArcana: 5,
        santidade: 0,
        baseSantidade: 0,
        resistancePercent: 0,
        baseResistancePercent: 0,
        damageReductionPercent: 0,
        baseDamageReductionPercent: 0,
        gold: 250,
        maxWeight: 27,
        ownerMemberId: 'host_master',
        skillPassive: '',
        skillActive: '',
        skillSupreme: '',
        isDead: false,
        attributes: { FORCA: 16, DESTREZA: 13, INTELIGENCIA: 8, SABEDORIA: 11, LABIA: 9 },
        resistances: deepClone(res),
        inventory: [],
        activeBuffs: [],
        talents: [],
        initial: {
          hp: 143,
          maxHp: 143,
          armor: 117,
          maxArmor: 117,
          mana: 200,
          maxMana: 200,
          pa: 3,
          maxPa: 3,
          regen: 20,
          defense: 0,
          maxWeight: 27,
          resistances: deepClone(res),
        },
      },
      {
        id: 'char_default_2',
        name: 'Teste2',
        level: 1,
        xp: 0,
        xpNext: 80,
        skillPoints: 0,
        pendingAttributePoints: 0,
        hp: 1000,
        maxHp: 1000,
        baseMaxHp: 1000,
        armor: 500,
        maxArmor: 500,
        baseMaxArmor: 500,
        armorDegradation: 0,
        mana: 300,
        maxMana: 300,
        baseMaxMana: 300,
        pa: 3,
        maxPa: 3,
        baseMaxPa: 3,
        regen: 40,
        baseRegen: 40,
        defense: 10,
        baseDefense: 10,
        attack: 8,
        baseAttack: 8,
        arcana: 25,
        baseArcana: 25,
        santidade: 10,
        baseSantidade: 10,
        resistancePercent: 10,
        baseResistancePercent: 10,
        damageReductionPercent: 5,
        baseDamageReductionPercent: 5,
        gold: 400,
        maxWeight: 27,
        ownerMemberId: 'host_master',
        skillPassive: '',
        skillActive: '',
        skillSupreme: '',
        isDead: false,
        attributes: { FORCA: 8, DESTREZA: 10, INTELIGENCIA: 18, SABEDORIA: 13, LABIA: 8 },
        resistances: deepClone(res),
        inventory: [],
        activeBuffs: [],
        talents: [],
        initial: {
          hp: 1000,
          maxHp: 1000,
          armor: 500,
          maxArmor: 500,
          mana: 300,
          maxMana: 300,
          pa: 3,
          maxPa: 3,
          regen: 40,
          defense: 10,
          maxWeight: 27,
          resistances: deepClone(res),
        },
      },
    ];
    const hostIp = state.network?.preferred_ip || window.location.hostname || '127.0.0.1';
    state.members = [
      {
        id: 'host_master',
        ip: hostIp,
        nickname: 'Mestre',
        name: 'Mestre',
        title: `IP Principal (Host): ${hostIp}`,
        role: 'MESTRE',
        avatar: 'crown',
        characterId: null,
        online: true,
        connectionsCount: 1,
        permissions: masterFullPermissionsClient(),
      },
    ];
    if (!Array.isArray(state.skillTrees)) {
      state.skillTrees = [];
    } else {
      state.skillTrees = state.skillTrees.filter((t) => t && t.id !== 'tree_geomancia');
    }
    state.characters.forEach(recalculateCharacterDerived);
  }

  function sanitizeLegacyMembersClient() {
    const legacyIds = new Set(['member_master', 'member_leetobr', 'member_san']);
    const legacyNames = new Set(['dan ray', 'mestre dan ray', 'leetobr', 'san']);
    const hostIp = state.network?.preferred_ip || window.location.hostname || '127.0.0.1';

    state.members = (state.members || []).filter((m) => {
      if (!m || typeof m !== 'object') return false;
      if (legacyIds.has(m.id)) return false;
      if (legacyNames.has(String(m.name || '').trim().toLowerCase())) return false;
      if (legacyNames.has(String(m.nickname || '').trim().toLowerCase())) return false;
      return true;
    });

    if (!state.members.some((m) => m.role === 'MESTRE' || m.id === 'host_master')) {
      state.members.unshift({
        id: 'host_master',
        ip: hostIp,
        nickname: 'Mestre',
        name: 'Mestre',
        title: `IP Principal (Host): ${hostIp}`,
        role: 'MESTRE',
        avatar: 'crown',
        characterId: null,
        online: true,
        connectionsCount: 1,
        permissions: masterFullPermissionsClient(),
      });
    }
  }

  function loadInitialLocalFallback() {
    try {
      const rawFull = localStorage.getItem(STORAGE_KEY_STATE);
      if (rawFull) {
        const parsed = JSON.parse(rawFull);
        if (parsed && Array.isArray(parsed.characters) && parsed.characters.length > 0) {
          Object.assign(state, parsed);
          if (!Array.isArray(state.skillTrees)) {
            state.skillTrees = [];
          } else {
            state.skillTrees = state.skillTrees.filter((t) => t && t.id !== 'tree_geomancia');
          }
          sanitizeLegacyMembersClient();
          state.characters.forEach(recalculateCharacterDerived);
          return;
        }
      }
    } catch (_) {}
    buildFallbackDefaultState();
    saveStateToLocalStorage();
  }

  // ===========================================================================
  // Toasts (Notificações Flutuantes no Canto Superior Direito)
  // ===========================================================================
  function showToast(message, variant = 'warning') {
    if (!message) return;
    const now = Date.now();
    const lastShown = state.recentToastSignatures.get(message) || 0;
    if (now - lastShown < 550) return;
    state.recentToastSignatures.set(message, now);

    const container = document.getElementById('toast-container');
    if (!container) return;

    const bgClass =
      variant === 'success'
        ? 'from-emerald-700 to-teal-700 border-emerald-400/50'
        : 'from-rose-700 via-amber-700 to-orange-700 border-amber-300/60';

    const toast = document.createElement('div');
    toast.className = `toast-item flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border shadow-2xl bg-gradient-to-r ${bgClass} text-white`;
    toast.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="text-lg shrink-0 flex items-center">${variant === 'success' ? '<iconify-icon icon="game-icons:sparkles"></iconify-icon>' : '<iconify-icon icon="game-icons:hazard-sign"></iconify-icon>'}</span>
        <span class="font-extrabold text-xs sm:text-sm tracking-wide break-words">${escapeHtml(message)}</span>
      </div>
      <button type="button" class="shrink-0 w-6 h-6 rounded-lg bg-black/25 hover:bg-black/45 flex items-center justify-center text-xs font-bold">✕</button>
    `;

    const removeToast = () => {
      if (toast.classList.contains('toast-leaving')) return;
      toast.classList.add('toast-leaving');
      setTimeout(() => toast.remove(), 200);
    };

    toast.querySelector('button')?.addEventListener('click', removeToast);
    container.appendChild(toast);
    setTimeout(removeToast, 4800);
  }

  // ===========================================================================
  // Histórico (Undo/Redo) & Commit de Mutação via WebSocket
  // ===========================================================================
  function snapshotCoreState() {
    return deepClone({
      room: state.room,
      members: state.members,
      characters: state.characters,
      itemsCatalog: state.itemsCatalog,
      npcs: state.npcs,
      escrowSales: state.escrowSales,
      bestiary: state.bestiary,
      battle: state.battle,
      quests: state.quests,
      customPermissionPresets: state.customPermissionPresets,
      skillTrees: state.skillTrees,
    });
  }

  function restoreCoreState(snap) {
    for (const k of ['room', 'members', 'characters', 'itemsCatalog', 'npcs', 'escrowSales', 'bestiary', 'battle', 'quests', 'customPermissionPresets', 'skillTrees']) {
      if (snap[k] !== undefined) state[k] = deepClone(snap[k]);
    }
    state.characters.forEach(recalculateCharacterDerived);
  }

  function updateHistoryButtonsUI() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const allowed = isEffectiveMaster() || hasPermission('system_undo_redo');
    const canUndo = allowed && (state.wsConnected ? state.serverCanUndo : state.undoStack.length > 0);
    const canRedo = allowed && (state.wsConnected ? state.serverCanRedo : state.redoStack.length > 0);
    if (btnUndo) {
      btnUndo.disabled = !canUndo;
      btnUndo.classList.toggle('hidden', !allowed);
    }
    if (btnRedo) {
      btnRedo.disabled = !canRedo;
      btnRedo.classList.toggle('hidden', !allowed);
    }
  }

  function commitMutation(mutatorFn, auditInfo = null) {
    const prevSnap = snapshotCoreState();
    const toasts = [];

    const ok = mutatorFn(state, toasts);
    if (ok === false) return;

    state.undoStack.push(prevSnap);
    if (state.undoStack.length > HISTORY_LIMIT) {
      state.undoStack = state.undoStack.slice(-HISTORY_LIMIT);
    }
    state.redoStack = [];

    state.characters.forEach(recalculateCharacterDerived);

    const activeMember = getActiveMember();
    const auditEntry = auditInfo
      ? {
          actorName: activeMember ? `${activeMember.name} (${activeMember.role})` : 'Mestre',
          actionType: auditInfo.actionType || 'UPDATE',
          targetEntity: auditInfo.targetEntity || '',
          summary: auditInfo.summary || '',
        }
      : null;

    if (auditEntry) {
      state.auditLog.unshift({
        id: `audit_${Date.now()}`,
        ...auditEntry,
        createdAt: new Date().toLocaleString('pt-BR'),
      });
    }

    saveStateToLocalStorage();
    renderAll();

    if (state.wsConnected && state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(
        JSON.stringify({
          type: 'update_state',
          room: state.room,
          members: state.members,
          characters: state.characters,
          itemsCatalog: state.itemsCatalog,
          npcs: state.npcs,
          escrowSales: state.escrowSales,
          bestiary: state.bestiary,
          battle: state.battle,
          quests: state.quests,
          customPermissionPresets: state.customPermissionPresets,
          skillTrees: state.skillTrees,
          auditEntry,
          record_history: true,
          toasts,
        })
      );
    } else {
      updateHistoryButtonsUI();
      for (const msg of toasts) showToast(msg);
    }
  }

  function triggerUndo() {
    if (!isEffectiveMaster() && !hasPermission('system_undo_redo')) {
      showToast('Você não tem permissão para desfazer ações.', 'warning');
      return;
    }
    if (state.wsConnected && state.ws && state.ws.readyState === WebSocket.OPEN) {
      if (!state.serverCanUndo) return;
      state.ws.send(JSON.stringify({ type: 'undo' }));
      return;
    }
    if (state.undoStack.length === 0) return;
    const prev = state.undoStack.pop();
    state.redoStack.push(snapshotCoreState());
    if (state.redoStack.length > HISTORY_LIMIT) state.redoStack = state.redoStack.slice(-HISTORY_LIMIT);
    restoreCoreState(prev);
    saveStateToLocalStorage();
    updateHistoryButtonsUI();
    renderAll();
  }

  function triggerRedo() {
    if (!isEffectiveMaster() && !hasPermission('system_undo_redo')) {
      showToast('Você não tem permissão para refazer ações.', 'warning');
      return;
    }
    if (state.wsConnected && state.ws && state.ws.readyState === WebSocket.OPEN) {
      if (!state.serverCanRedo) return;
      state.ws.send(JSON.stringify({ type: 'redo' }));
      return;
    }
    if (state.redoStack.length === 0) return;
    const nxt = state.redoStack.pop();
    state.undoStack.push(snapshotCoreState());
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack = state.undoStack.slice(-HISTORY_LIMIT);
    restoreCoreState(nxt);
    saveStateToLocalStorage();
    updateHistoryButtonsUI();
    renderAll();
  }


/**
 * CMrpg v2.0 — Frontend Application (Vanilla ES6+)
 * Interface Dark Fantasy Medieval + Motor Completo de Regras (/docs) + WebSockets Radmin VPN.
 */

(() => {
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
      description: 'Congelamento Severo: -50% Movimento e Esquiva por 2 turnos',
      duration: 2,
      paModifier: 0,
      type: 'NERF',
    },
    Choque: {
      description: 'Sobrecarga de Choque: Sofre +15 de dano adicional na próxima ação por 2 turnos',
      duration: 2,
      paModifier: 0,
      type: 'NERF',
    },
    Sangramento: {
      description: 'Hemorragia Profunda: Sofre 10 de dano contínuo ao passar o turno por 3 turnos',
      duration: 3,
      paModifier: 0,
      type: 'NERF',
    },
    Chamas: {
      description: 'Combustão Viva: Sofre 15 de dano de fogo contínuo ao passar o turno por 2 turnos',
      duration: 2,
      paModifier: 0,
      type: 'NERF',
    },
    Veneno: {
      description: 'Intoxicação Letal: -50% de Cura recebida e 10 de dano contínuo por 3 turnos',
      duration: 3,
      paModifier: 0,
      type: 'NERF',
    },
    Cegueira: {
      description: 'Cegueira Completa: Desvantagem em ataques e testes de visão por 2 turnos',
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
    { value: 'VIDA', label: 'Vida Máxima (HP)' },
    { value: 'ARMADURA', label: 'Armadura Máxima' },
    { value: 'MANA', label: 'Mana Máxima' },
    { value: 'PA', label: 'Pontos de Ação (PA)' },
    { value: 'REGEN_VIDA', label: 'Regenerar Vida' },
    { value: 'REGEN_ARMADURA', label: 'Regenerar Armadura' },
    { value: 'REGEN_MANA', label: 'Regenerar Mana' },
    { value: 'DEFESA', label: 'Defesa' },
    { value: 'ATAQUE', label: 'Ataque' },
    { value: 'ARCANA', label: 'Arcana' },
    { value: 'SANTIDADE', label: 'Santidade' },
    { value: 'RES_FISICO', label: 'Resistência Físico (%)' },
    { value: 'RES_MAGICO', label: 'Resistência Mágico (%)' },
    { value: 'RES_PYRO', label: 'Resistência Pyro (%)' },
    { value: 'RES_CRYO', label: 'Resistência Cryo (%)' },
    { value: 'RES_ELETRICO', label: 'Resistência Elétrico (%)' },
    { value: 'RES_PROFANO', label: 'Resistência Profano (%)' },
    { value: 'RES_SACRO', label: 'Resistência Sacro (%)' },
    { value: 'FORCA', label: 'Força' },
    { value: 'DESTREZA', label: 'Destreza' },
    { value: 'INTELIGENCIA', label: 'Inteligência' },
    { value: 'SABEDORIA', label: 'Sabedoria' },
    { value: 'LABIA', label: 'Lábia' },
  ];

  const EFFECT_TARGET_SHORT_LABELS = {
    VIDA: 'VIDA',
    ARMADURA: 'ARMADURA',
    MANA: 'MANA',
    PA: 'PA',
    REGEN_VIDA: 'REGEN VIDA',
    REGEN_ARMADURA: 'REGEN ARMADURA',
    REGEN_MANA: 'REGEN MANA',
    DEFESA: 'DEFESA',
    ATAQUE: 'ATAQUE',
    ARCANA: 'ARCANA',
    SANTIDADE: 'SANTIDADE',
    RES_FISICO: 'RES. FÍSICO (%)',
    RES_MAGICO: 'RES. MÁGICO (%)',
    RES_PYRO: 'RES. PYRO (%)',
    RES_CRYO: 'RES. CRYO (%)',
    RES_ELETRICO: 'RES. ELÉTRICO (%)',
    RES_PROFANO: 'RES. PROFANO (%)',
    RES_SACRO: 'RES. SACRO (%)',
    FORCA: 'FORÇA',
    DESTREZA: 'DESTREZA',
    INTELIGENCIA: 'INTELIGÊNCIA',
    SABEDORIA: 'SABEDORIA',
    LABIA: 'LÁBIA',
  };

  function formatEffectTargetLabel(targetStat) {
    return EFFECT_TARGET_SHORT_LABELS[targetStat] || targetStat;
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

    // UI Filters & Selections
    searchQuery: '',
    memberSearchQuery: '',
    memberRoleFilter: 'ALL',
    catalogTypeFilter: 'ALL',
    catalogSearchQuery: '',
    npcModalTypeFilter: 'ALL',
    selectedShopNpcId: null,
    selectedBuyerCharId: null,
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
        if (!(eff.targetStat in flatMods)) continue;
        if (eff.modifierType === 'PERCENT') {
          pctMods[eff.targetStat] += Number(eff.value || 0);
        } else {
          flatMods[eff.targetStat] += Number(eff.value || 0);
        }
      }
    }

    for (const buff of char.activeBuffs || []) {
      if (Number(buff.remainingTurns || 0) <= 0) continue;
      for (const eff of buff.effects || []) {
        if (!(eff.targetStat in flatMods)) continue;
        if (eff.modifierType === 'PERCENT') {
          pctMods[eff.targetStat] += Number(eff.value || 0);
        } else {
          flatMods[eff.targetStat] += Number(eff.value || 0);
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

    char.maxWeight =
      Number.isFinite(Number(char.maxWeight)) && Number(char.maxWeight) >= 0 ? Number(char.maxWeight) : 27;
    char.skillPassive = String(char.skillPassive || '').trim();
    char.skillActive = String(char.skillActive || '').trim();
    char.skillSupreme = String(char.skillSupreme || '').trim();

    char.elementalResistances = char.elementalResistances || {};
    const effectiveElementalResistances = {};
    for (const er of ELEMENTAL_RESISTANCE_TYPES) {
      const rawEr = Number(char.elementalResistances[er.key] ?? 0);
      const baseEr = Number.isFinite(rawEr) ? Number(rawEr.toFixed(1)) : 0;
      char.elementalResistances[er.key] = baseEr;
      const targetKey = `RES_${er.key}`;
      const bonusEr = Number(flatMods[targetKey] || 0) + Number(pctMods[targetKey] || 0);
      effectiveElementalResistances[er.key] = Number((baseEr + bonusEr).toFixed(1));
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
    const effResPct = Math.max(0, Math.min(100, applyRounding(char.baseResistancePercent)));
    const effRedPct = Math.max(0, Math.min(100, applyRounding(char.baseDamageReductionPercent)));

    char.maxHp = effMaxHp;
    char.maxArmor = effMaxArmor;
    char.maxMana = effMaxMana;
    char.maxPa = effMaxPa;
    char.regen = effRegen;
    char.defense = effDef;
    char.attack = effAtk;
    char.arcana = effArc;
    char.santidade = effSan;
    char.resistancePercent = effResPct;
    char.damageReductionPercent = effRedPct;

    char.derived = {
      totalWeight: Number(totalWeight.toFixed(2)),
      effectiveAttributes,
      effectiveElementalResistances,
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
          name: 'Ações Rápidas nos Cards (Dano/Vida/Armadura/Mana/Regen/Resetar)',
          description: 'Permite usar os 6 botões inferiores dos cards em si mesmo, aliados e inimigos na mesa.',
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
    if (char.isEnemy) return false;
    const activeMem = getActiveMember();
    if (!activeMem) return false;

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
    });
  }

  function restoreCoreState(snap) {
    for (const k of ['room', 'members', 'characters', 'itemsCatalog', 'npcs', 'escrowSales', 'bestiary', 'battle', 'quests', 'customPermissionPresets']) {
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
      .filter((e) => e.type === 'NERF' && Number(e.paModifier || 0) < 0)
      .reduce((acc, e) => acc + Math.abs(Number(e.paModifier)), 0);
  }

  function resetTurnCombatantPa(char) {
    if (!char) return;
    const baseMax = Math.max(1, Number(char.baseMaxPa || 3));
    const penalty = calculateCombatantPaPenalty(char);
    const startingPa = Math.max(0, baseMax - penalty);
    char.pa = startingPa;
    char.maxPa = baseMax;
  }

  function triggerMaxAccumulationEffect(char, resName, maxVal, toasts = []) {
    if (!char) return;
    const template = ACCUMULATION_MAX_EFFECTS[resName] || {
      description: `Penalidade de ${resName} por 2 turnos`,
      duration: 2,
      paModifier: 0,
      type: 'NERF',
    };

    const sourceStr = `[Máx] acúmulos de ${resName.toLowerCase()}`;
    let effectText = template.description;
    if (resName === 'Atordoamento') {
      effectText = `-1 PA por ${template.duration} turnos - Fonte: ${sourceStr}`;
    } else if (!effectText.includes('Fonte:')) {
      effectText = `${effectText} - Fonte: ${sourceStr}`;
    }

    if (!Array.isArray(char.buffsNerfs)) char.buffsNerfs = [];
    char.buffsNerfs.push({
      id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'NERF',
      name: effectText,
      description: effectText,
      duration: template.duration,
      source: sourceStr,
      paModifier: template.paModifier || 0,
      createdAt: Date.now(),
    });

    if (template.paModifier < 0) {
      const penalty = calculateCombatantPaPenalty(char);
      const maxAvailable = Math.max(0, (char.baseMaxPa || 3) - penalty);
      if (char.pa > maxAvailable) {
        char.pa = maxAvailable;
      }
    }

    toasts.push(`${char.name} MAX ACÚMULO: ${resName.toUpperCase()}! Aplicado: ${effectText}`);
  }

  function syncBattleQueueAliveState(st, toasts = []) {
    const b = st.battle;
    if (!b || !b.isActive || !Array.isArray(b.orderIds) || b.orderIds.length === 0) return;

    const validAliveIds = new Set(
      (st.characters || [])
        .filter((c) => Number(c.hp || 0) > 0 && !c.isDead)
        .map((c) => c.id)
    );

    const initialOrder = [...b.orderIds];
    const deadInQueue = initialOrder.filter((id) => !validAliveIds.has(id));
    if (deadInQueue.length === 0) return;

    const currentIdx = Number(b.currentTurnIndex || 0) % initialOrder.length;
    const currentActingId = initialOrder[currentIdx];
    const actingDied = !validAliveIds.has(currentActingId);

    const newOrder = initialOrder.filter((id) => validAliveIds.has(id));

    for (const deadId of deadInQueue) {
      const deadChar = (st.characters || []).find((c) => c.id === deadId);
      if (deadChar) {
        toasts.push(`${deadChar.name} (0 HP) foi removido da Fila de Batalha.`);
      }
    }

    if (newOrder.length === 0) {
      b.orderIds = [];
      b.currentTurnIndex = 0;
      toasts.push('Todos os combatentes na Fila de Batalha foram derrotados!');
      return;
    }

    b.orderIds = newOrder;

    if (actingDied) {
      const nextIdx = currentIdx % newOrder.length;
      b.currentTurnIndex = nextIdx;
      const newActingId = newOrder[nextIdx];
      const newActingChar = (st.characters || []).find((c) => c.id === newActingId);
      if (newActingChar) {
        resetTurnCombatantPa(newActingChar);
        toasts.push(`Turno transferido para ${newActingChar.name}!`);
      }
    } else {
      const newIdx = newOrder.indexOf(currentActingId);
      b.currentTurnIndex = newIdx !== -1 ? newIdx : (currentIdx % newOrder.length);
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
    const validCharIds = new Set(
      (state.characters || []).filter((c) => Number(c.hp || 0) > 0 && !c.isDead).map((c) => c.id)
    );
    const originalLength = battle.orderIds.length;
    const currentActingId = battle.orderIds[battle.currentTurnIndex % battle.orderIds.length];

    battle.orderIds = battle.orderIds.filter((id) => validCharIds.has(id));
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

  function advanceBattleTurn() {
    const battle = getBattleState();
    if (!battle.isActive || battle.orderIds.length === 0) return;

    if (!canCurrentMemberAdvanceTurn()) {
      showToast('Você não tem permissão para avançar o turno deste combatente!', 'warning');
      return;
    }

    commitMutation((st, toasts) => {
      // Sincroniza e remove combatentes com 0 HP antes de processar avanço
      syncBattleQueueAliveState(st, toasts);

      const b = st.battle;
      if (!b || !b.isActive || !Array.isArray(b.orderIds) || b.orderIds.length === 0) return false;
      const len = b.orderIds.length;

      // Combatente que está FINALIZANDO o turno agora
      const currentActingIdx = Number(b.currentTurnIndex || 0) % len;
      const finishingActingId = b.orderIds[currentActingIdx];
      const finishingChar = (st.characters || []).find((c) => c.id === finishingActingId);

      // 1. Reduz em 1 a duração de todos os Buffs e Nerfs temporários do combatente
      if (finishingChar && Array.isArray(finishingChar.buffsNerfs)) {
        finishingChar.buffsNerfs.forEach((eff) => {
          if (Number.isFinite(Number(eff.duration)) && Number(eff.duration) > 0) {
            eff.duration = Number(eff.duration) - 1;
          }
        });
        const prevCount = finishingChar.buffsNerfs.length;
        finishingChar.buffsNerfs = finishingChar.buffsNerfs.filter(
          (eff) => !Number.isFinite(Number(eff.duration)) || Number(eff.duration) > 0
        );
        if (finishingChar.buffsNerfs.length < prevCount) {
          toasts.push(`Efeitos temporários de ${finishingChar.name} expiraram.`);
        }
      }

      // 2. Regra de Cargas: +1 APENAS se for JOGADOR E NÃO ESTIVER MORTO (hp > 0 e !isDead)
      const isFinishingEnemy = Boolean(finishingChar && finishingChar.isEnemy);
      const isFinishingDead = !finishingChar || Number(finishingChar.hp || 0) <= 0 || Boolean(finishingChar.isDead);
      if (finishingChar && !isFinishingEnemy && !isFinishingDead) {
        b.charges = Math.max(0, Number(b.charges || 0)) + 1;
      }

      // 3. Avança para o próximo combatente
      const nextIdx = Number(b.currentTurnIndex || 0) + 1;
      if (nextIdx >= len) {
        b.currentTurnIndex = 0;
        b.roundNumber = Math.max(1, Number(b.roundNumber || 1)) + 1;
      } else {
        b.currentTurnIndex = nextIdx;
      }

      const newActingId = b.orderIds[b.currentTurnIndex];
      if (!b.turnCounts) b.turnCounts = {};
      b.turnCounts[newActingId] = Number(b.turnCounts[newActingId] || 0) + 1;

      const charObj = (st.characters || []).find((c) => c.id === newActingId);
      if (charObj) {
        // 4. Reset Automático de PA no Início do Turno (descontando nerfs de PA)
        resetTurnCombatantPa(charObj);
        toasts.push(`Rodada ${b.roundNumber} - Turno de ${charObj.name}!`);
      }
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
    const aliveChars = (state.characters || []).filter((c) => Number(c.hp || 0) > 0 && !c.isDead);
    const validAliveIds = new Set(aliveChars.map((c) => c.id));

    if (battle.isActive && battle.orderIds.length > 0) {
      battleOrderWorkingQueue = battle.orderIds.filter((id) => validAliveIds.has(id));
    } else {
      battleOrderWorkingQueue = aliveChars.map((c) => c.id);
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
        const isCurrent = index === actingIndex;
        const isEnemy = Boolean(c.isEnemy);
        const count = battle.turnCounts?.[id] || 0;

        return `
          <div
            class="p-2 rounded-lg border transition flex items-center justify-between gap-2 ${
              isCurrent
                ? 'bg-amber-500/20 border-amber-400 shadow-md card-active-turn'
                : 'bg-black/30 border-app-divider-border hover:border-amber-500/30'
            }"
            data-sidebar-order-id="${escapeHtml(c.id)}"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                isCurrent ? 'bg-amber-400 text-black' : 'bg-black/40 app-muted border app-divider-border'
              } shrink-0">
                ${index + 1}º
              </span>
              <span class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                isEnemy ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }">
                <iconify-icon icon="${isEnemy ? 'game-icons:monster-grasp' : 'game-icons:hooded-figure'}" class="text-base"></iconify-icon>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="font-serif-fantasy font-black text-xs truncate ${isCurrent ? 'text-amber-200' : 'app-title'}">
                    ${escapeHtml(c.name)}
                  </span>
                  ${
                    isCurrent
                      ? '<span class="px-1 py-0.2 rounded text-[8px] font-black bg-amber-400 text-black shrink-0 animate-pulse">VEZ</span>'
                      : ''
                  }
                </div>
                <div class="flex items-center gap-1.5 text-[9px] font-mono app-muted truncate">
                  <span>${isEnemy ? 'Inimigo' : 'Jogador'}</span>
                  <span>•</span>
                  <span>Turnos: ${count}</span>
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

  // ---------------------------------------------------------------------------
  // ABA 2: PERSONAGENS & FICHAS (Cards + Barras + 6 Action Pills + Drag & Drop)
  // ---------------------------------------------------------------------------
  function renderCharactersTab() {
    const grid = document.getElementById('characters-grid');
    const emptyState = document.getElementById('empty-search-state');
    const countLabel = document.getElementById('char-count-label');
    if (!grid || !emptyState) return;

    const q = state.searchQuery.trim().toLowerCase();
    const filtered = state.characters.filter((c) => c.name.toLowerCase().includes(q));

    if (countLabel) {
      countLabel.textContent = `${filtered.length} / ${state.characters.length} CHAR(S)`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
      renderBattleSidebar();
      updateBattleToggleButton();
      return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    grid.classList.remove('hidden');

    const isMaster = isEffectiveMaster();

    grid.innerHTML = filtered
      .map((char) => {
        const isEnemy = Boolean(char.isEnemy);
        const bestiaryRef = isEnemy ? (state.bestiary || []).find((b) => b.id === char.bestiaryId) : null;
        const isRevealed = !isEnemy || (bestiaryRef ? Boolean(bestiaryRef.reveladoParaJogadores) : Boolean(char.reveladoParaJogadores));
        const isMasked = isEnemy && !isMaster && !isRevealed;

        const hpPct = isMasked ? 0 : calcPercentage(char.hp, char.maxHp);
        const armorPct = isMasked ? 0 : calcPercentage(char.armor, char.maxArmor);
        const manaPct = isMasked ? 0 : calcPercentage(char.mana, char.maxMana);
        const xpPct = calcPercentage(char.xp, char.xpNext || 80);

        const battle = getBattleState();
        const isBattleActive = Boolean(battle.isActive);
        const orderIds = Array.isArray(battle.orderIds) ? battle.orderIds : [];
        const actingCharId = isBattleActive && orderIds.length > 0
          ? orderIds[battle.currentTurnIndex % orderIds.length]
          : null;
        const isCurrentTurn = isBattleActive && actingCharId === char.id;
        const turnCount = isBattleActive ? Number(battle.turnCounts?.[char.id] || 0) : 0;

        const hpOverflow = !isMasked && char.hp > char.maxHp;
        const armorOverflow = !isMasked && char.armor > char.maxArmor;
        const manaOverflow = !isMasked && char.mana > char.maxMana;

        let activeResCount = 0;
        let maxedResCount = 0;
        const activeResBadges = [];
        if (!isMasked) {
          for (const r of RESISTANCE_TYPES) {
            const entry = char.resistances?.[r.name] || { current: 0, max: 100 };
            if (entry.current > 0) {
              activeResCount++;
              const isMax = entry.max > 0 && entry.current >= entry.max;
              if (isMax) maxedResCount++;
              activeResBadges.push({
                name: r.name,
                icon: r.icon,
                current: entry.current,
                max: entry.max,
                isMax,
              });
            }
          }
        }

        const resChipsHtml =
          !isMasked && activeResBadges.length > 0
            ? `<div class="flex flex-wrap gap-1.5 pt-1">
                ${activeResBadges
                  .map(
                    (b) => `
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                    b.isMax
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : 'bg-amber-500/10 text-amber-200 border-amber-500/25'
                  }">
                    <span>${b.icon}</span>
                    <span>${escapeHtml(b.name)}: ${b.current}/${b.max}</span>
                  </span>`
                  )
                  .join('')}
              </div>`
            : '';

        const pendingBannerHtml =
          !isEnemy && Number(char.pendingAttributePoints || 0) > 0
            ? `<button
                type="button"
                data-action="open-sheet"
                data-char-id="${escapeHtml(char.id)}"
                class="w-full py-1.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-extrabold flex items-center justify-between hover:bg-emerald-500/25 transition"
              >
                <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:chest"></iconify-icon> <span>+${char.pendingAttributePoints} Ponto(s) de Atributo Pendente(s)!</span></span>
                <span class="underline">Distribuir →</span>
              </button>`
            : '';

        const deadBannerHtml = char.isDead
          ? `<div class="p-2.5 rounded-lg bg-red-950/80 border border-red-500/50 flex items-center justify-between">
              <span class="text-xs font-extrabold text-red-300 flex items-center gap-1.5">
                <iconify-icon icon="game-icons:crowned-skull"></iconify-icon>
                <span>${isEnemy ? 'INIMIGO DERROTADO / MORTO' : 'PERSONAGEM MORTO (0 HP)'}</span>
              </span>
              ${
                isMaster
                  ? `<button type="button" data-action="open-revive" data-char-id="${escapeHtml(char.id)}" class="px-2.5 py-1 rounded text-[11px] font-extrabold btn-gold flex items-center gap-1"><iconify-icon icon="game-icons:sparkles"></iconify-icon> <span>Reviver</span></button>`
                  : ''
              }
            </div>`
          : '';

        const activeTurnBannerHtml = isCurrentTurn
          ? `<div class="p-2.5 rounded-lg bg-amber-500/20 border border-amber-400/60 flex items-center justify-between text-amber-300 font-serif-fantasy text-xs font-black uppercase tracking-wider shadow-md animate-pulse">
              <span class="flex items-center gap-2">
                <iconify-icon icon="game-icons:crossed-swords" class="text-base text-amber-400"></iconify-icon>
                <span>TURNO ATUAL</span>
              </span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-200">AGINDO AGORA</span>
            </div>`
          : '';

        const weight = char.derived?.totalWeight ?? 0;
        const maxWeight = Number.isFinite(Number(char.maxWeight)) ? Number(char.maxWeight) : 27;
        const isOverweight = !isEnemy && weight > maxWeight;
        const canEdit = !isEnemy && canEditCharacter(char);
        const canCombat = canApplyCombatActions(char);
        const canPa = canAdjustPa(char);
        const canViewSheet = canViewCharacter(char);
        const canViewInv = canViewInventory(char);
        const canReorderChar = isMaster || hasPermission('char_reorder');
        const ownerMem =
          (state.members || []).find(
            (m) => m.id === char.ownerMemberId || (char.ownerIp && m.ip === char.ownerIp) || m.characterId === char.id
          ) || null;
        const ownerLabel = ownerMem
          ? ownerMem.nickname?.trim() || ownerMem.name || ownerMem.ip
          : char.ownerIp || 'Mestre';

        // Sub-bar / Metadados sob o nome
        let metaBarHtml = '';
        if (isEnemy) {
          if (isMasked) {
            metaBarHtml = `
              <div class="flex items-center gap-2 mt-1 text-[10px] font-mono text-neutral-500 italic">
                <iconify-icon icon="game-icons:blindfold"></iconify-icon>
                <span>Informações Ocultas pelo Mestre</span>
              </div>
            `;
          } else {
            metaBarHtml = `
              <div class="flex items-center gap-2 mt-1 text-[10px] font-mono text-amber-200/80">
                <iconify-icon icon="game-icons:monster-grasp" class="text-rose-400"></iconify-icon>
                <span>Criatura Hostil • Modelo: ${escapeHtml(bestiaryRef ? bestiaryRef.name : char.name)}</span>
              </div>
            `;
          }
        } else {
          metaBarHtml = `
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <div class="stat-bar-track h-1.5 w-20 rounded-full">
                <div class="stat-bar-fill stat-bar-xp" style="width: ${xpPct}%"></div>
              </div>
              <span class="text-[10px] font-mono app-muted">XP ${char.xp || 0}/${char.xpNext || 80}</span>
              <span class="text-[10px] font-mono app-muted" title="Membro/IP vinculado a este personagem">• <iconify-icon icon="game-icons:hooded-figure"></iconify-icon> ${escapeHtml(ownerLabel)}</span>
              ${
                char.skillPoints > 0
                  ? `<span class="text-[10px] font-mono font-bold text-purple-400">• +${char.skillPoints} Hab</span>`
                  : ''
              }
            </div>
          `;
        }

        // Indicadores Táticos (PA, DEF, ATAQUE/ARCANA, REGEN)
        let tacticalHtml = '';
        const atkVal = Number(char.attack ?? 0);
        const arcVal = Number(char.arcana ?? 0);
        const combatStatHtml = atkVal >= arcVal
          ? `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold stat-badge-attack flex items-center gap-1" title="Poder de Ataque (Base + Equipamentos)">
              <iconify-icon icon="game-icons:broadsword"></iconify-icon> Ataque: ${atkVal}
            </span>`
          : `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold stat-badge-arcana flex items-center gap-1" title="Poder Arcano (Base + Equipamentos)">
              <iconify-icon icon="game-icons:crystal-wand"></iconify-icon> Arcana: ${arcVal}
            </span>`;

        if (isMasked) {
          tacticalHtml = `
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-black/40 text-neutral-400 border app-divider-border">
                <iconify-icon icon="game-icons:lightning-branches"></iconify-icon> PA: ?
              </span>
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-black/40 text-neutral-400 border app-divider-border">
                <iconify-icon icon="game-icons:dragon-shield"></iconify-icon> DEF: ?
              </span>
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-black/40 text-neutral-400 border app-divider-border">
                <iconify-icon icon="game-icons:broadsword"></iconify-icon> ATK/ARC: ?
              </span>
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-black/40 text-neutral-400 border app-divider-border">
                <iconify-icon icon="game-icons:fairy-wand" class="icon-mana"></iconify-icon> REGEN: ?
              </span>
            </div>
          `;
        } else {
          const paInteractiveHtml = canPa
            ? `<span class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25 select-none" title="Pontos de Ação (PA): Clique para gastar 1 PA ou use os botões - / +">
                <button type="button" data-action="adjust-pa" data-delta="-1" data-char-id="${escapeHtml(char.id)}" class="w-4 h-4 rounded flex items-center justify-center hover:bg-amber-500/30 text-amber-200 transition font-black" title="Gastar 1 PA">-</button>
                <button type="button" data-action="spend-pa" data-char-id="${escapeHtml(char.id)}" class="inline-flex items-center gap-1 hover:text-amber-100 transition px-1" title="Gastar 1 PA">
                  <iconify-icon icon="game-icons:lightning-branches"></iconify-icon>
                  <span>PA: ${char.pa}/${char.maxPa}</span>
                </button>
                <button type="button" data-action="adjust-pa" data-delta="1" data-char-id="${escapeHtml(char.id)}" class="w-4 h-4 rounded flex items-center justify-center hover:bg-amber-500/30 text-amber-200 transition font-black" title="Restaurar 1 PA">+</button>
              </span>`
            : `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                <iconify-icon icon="game-icons:lightning-branches"></iconify-icon> PA: ${char.pa}/${char.maxPa}
              </span>`;

          tacticalHtml = `
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              ${paInteractiveHtml}
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <iconify-icon icon="game-icons:dragon-shield"></iconify-icon> DEF: ${char.defense}
              </span>
              ${combatStatHtml}
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/25">
                <iconify-icon icon="game-icons:fairy-wand" class="icon-mana"></iconify-icon> REGEN: ${char.regen}%
              </span>
              ${
                !isEnemy
                  ? `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      isOverweight
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                        : 'bg-black/25 app-muted border app-divider-border'
                    }">
                      <iconify-icon icon="game-icons:weight"></iconify-icon> ${weight}/${maxWeight}kg
                    </span>`
                  : ''
              }
            </div>
          `;
        }

        // Botões de Topo no Card
        let topButtonsHtml = '';
        if (isEnemy) {
          if (isMasked) {
            topButtonsHtml = `
              <button
                type="button"
                title="Ficha e habilidades ocultas pelo Mestre"
                class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn opacity-40 cursor-not-allowed shrink-0"
              >
                <iconify-icon icon="game-icons:blindfold"></iconify-icon>
              </button>
            `;
          } else {
            topButtonsHtml = `
              <button
                type="button"
                data-action="open-resistances"
                data-char-id="${escapeHtml(char.id)}"
                title="Painel de Acúmulos"
                class="relative w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn shrink-0 transition"
              >
                <iconify-icon icon="game-icons:round-bottom-flask"></iconify-icon>
                ${
                  activeResCount > 0
                    ? `<span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-black flex items-center justify-center text-white ${
                        maxedResCount > 0 ? 'bg-rose-600 animate-bounce' : 'bg-amber-600'
                      }">${activeResCount}</span>`
                    : ''
                }
              </button>
              ${
                (isMaster || hasPermission('bestiary_summon'))
                  ? `<button
                      type="button"
                      data-action="dismiss-enemy"
                      data-char-id="${escapeHtml(char.id)}"
                      title="Remover da Mesa (Despachar)"
                      class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn text-rose-400 hover:bg-rose-950/60 shrink-0 transition"
                    >
                      <iconify-icon icon="game-icons:portal"></iconify-icon>
                    </button>`
                  : ''
              }
            `;
          }
        } else {
          topButtonsHtml = `
            ${
              canViewSheet
                ? `<button
                    type="button"
                    data-action="open-sheet"
                    data-char-id="${escapeHtml(char.id)}"
                    title="${canEdit ? 'Abrir Ficha Completa, 5 Atributos e Habilidades' : 'Visualizar Ficha do Personagem (Somente Leitura)'}"
                    class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn shrink-0 transition"
                  >
                    <iconify-icon icon="game-icons:tied-scroll"></iconify-icon>
                  </button>`
                : ''
            }
            ${
              canViewInv
                ? `<button
                    type="button"
                    data-action="open-inventory"
                    data-char-id="${escapeHtml(char.id)}"
                    title="${canEdit ? 'Abrir Inventário 3x(Infinito) com Filtros e Pesquisa' : 'Visualizar Inventário (Somente Leitura)'}"
                    class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn shrink-0 transition"
                  >
                    <iconify-icon icon="game-icons:knapsack"></iconify-icon>
                  </button>`
                : ''
            }
            <button
              type="button"
              data-action="open-resistances"
              data-char-id="${escapeHtml(char.id)}"
              title="Painel de Acúmulos"
              class="relative w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn shrink-0 transition"
            >
              <iconify-icon icon="game-icons:round-bottom-flask"></iconify-icon>
              ${
                activeResCount > 0
                  ? `<span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-black flex items-center justify-center text-white ${
                      maxedResCount > 0 ? 'bg-rose-600 animate-bounce' : 'bg-amber-600'
                    }">${activeResCount}</span>`
                  : ''
              }
            </button>
            ${
              canEdit
                ? `<button
                    type="button"
                    data-action="open-edit"
                    data-char-id="${escapeHtml(char.id)}"
                    title="Editar Personagem"
                    class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn shrink-0 transition"
                  >
                    <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
                  </button>`
                : ''
            }
          `;
        }

        const activeBuffsNerfsCount = Array.isArray(char.buffsNerfs) ? char.buffsNerfs.length : 0;
        const buffsNerfsBtnHtml = !isMasked
          ? `<button
              type="button"
              data-action="open-buffs-nerfs"
              data-char-id="${escapeHtml(char.id)}"
              title="Buffs & Nerfs (Efeitos Ativos)"
              class="relative w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn shrink-0 transition"
            >
              <iconify-icon icon="game-icons:arrows-shield"></iconify-icon>
              ${
                activeBuffsNerfsCount > 0
                  ? `<span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-black flex items-center justify-center text-white bg-purple-600 shadow-sm animate-pulse">${activeBuffsNerfsCount}</span>`
                  : ''
              }
            </button>`
          : '';

        // Habilidades Gerais Banner para Inimigos Revelados
        let generalSkillsBannerHtml = '';
        if (isEnemy && !isMasked) {
          generalSkillsBannerHtml = `
            <button
              type="button"
              data-action="open-general-skills"
              data-char-id="${escapeHtml(char.id)}"
              class="w-full py-1.5 px-3 rounded-lg font-serif-fantasy font-extrabold text-xs uppercase tracking-wider bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 flex items-center justify-center gap-1.5 transition"
            >
              <iconify-icon icon="game-icons:scroll-unfurled"></iconify-icon>
              <span>HABILIDADES GERAIS</span>
            </button>
          `;
        }

        // Action Pills ou Mensagem de Bloqueio
        let bottomActionsHtml = '';
        if (isMasked) {
          bottomActionsHtml = `
            <div class="p-2.5 rounded-lg bg-black/30 border app-divider-border text-center text-xs font-mono text-amber-300/70 italic flex items-center justify-center gap-1.5">
              <iconify-icon icon="game-icons:blindfold"></iconify-icon>
              <span>Atributos e Ficha Ocultos pelo Mestre</span>
            </div>
          `;
        } else if (!canCombat) {
          bottomActionsHtml = `
            <div class="p-2 rounded-lg bg-black/20 border app-divider-border text-center text-xs font-mono ${isEnemy ? 'text-emerald-300/80' : 'text-amber-200/80'} flex items-center justify-center gap-1.5">
              <iconify-icon icon="${isEnemy ? 'game-icons:eyeball' : 'game-icons:tied-scroll'}" style="color: ${isEnemy ? '#4ade80' : '#f59e0b'};"></iconify-icon>
              <span>${isEnemy ? 'Criatura Revelada (Controle do Mestre)' : 'Ficha de Aliado (Somente Visualização)'}</span>
            </div>
          `;
        } else {
          bottomActionsHtml = `
            <div class="grid grid-cols-3 gap-2 pt-2 border-t app-divider-border">
              <button
                type="button"
                data-action="pill-damage"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill action-pill-damage py-2 px-2 rounded-lg font-extrabold text-[11px] tracking-wide flex items-center justify-center gap-1"
              >
                <span>DANO</span>
                <iconify-icon icon="game-icons:broadsword" class="icon-dmg"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-attr"
                data-attr="hp"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill py-2 px-2 rounded-lg font-extrabold text-[11px] tracking-wide flex items-center justify-center gap-1"
              >
                <span>VIDA</span>
                <iconify-icon icon="game-icons:heart-bottle" class="icon-hp"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-attr"
                data-attr="armor"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill py-2 px-2 rounded-lg font-extrabold text-[11px] tracking-wide flex items-center justify-center gap-1"
              >
                <span>ARMADURA</span>
                <iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-attr"
                data-attr="mana"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill py-2 px-2 rounded-lg font-extrabold text-[11px] tracking-wide flex items-center justify-center gap-1"
              >
                <span>MANA</span>
                <iconify-icon icon="game-icons:crystal-bars" class="icon-mana"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-regen"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill action-pill-regen py-2 px-2 rounded-lg font-extrabold text-[11px] tracking-wide flex items-center justify-center gap-1"
              >
                <span>REGEN</span>
                <iconify-icon icon="game-icons:fairy-wand" class="icon-mana"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-reset"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill py-2 px-2 rounded-lg font-extrabold text-[11px] tracking-wide flex items-center justify-center gap-1"
              >
                <span>RESETAR</span>
                <iconify-icon icon="game-icons:sands-of-time"></iconify-icon>
              </button>
            </div>
          `;
        }

        return `
        <article
          class="char-card p-4 sm:p-5 flex flex-col justify-between gap-3.5 relative ${
            isCurrentTurn ? 'card-active-turn' : ''
          } ${
            char.isDead
              ? 'border-red-500/50 opacity-90'
              : (isEnemy ? 'border-rose-950/40 hover:border-amber-500/40' : '')
          }"
          data-char-id="${escapeHtml(char.id)}"
        >
          <!-- Topo: Nome Arrastável + Nível/XP + Botões de Ação -->
          <div class="char-card-header flex items-start justify-between gap-3 min-w-0">
            <div class="min-w-0 flex-1">
              <div class="flex items-center flex-wrap gap-2 min-w-0">
                <div
                  class="${canReorderChar ? 'char-drag-handle' : ''} inline-flex items-center gap-1.5 px-2 py-0.5 -ml-2 rounded-lg ${canReorderChar ? 'hover:bg-amber-500/10 cursor-grab' : 'cursor-default'} transition group min-w-0 max-w-full"
                  ${canReorderChar ? `data-drag-char-id="${escapeHtml(char.id)}"` : ''}
                  title="${canReorderChar ? 'Clique e segure no nome para arrastar e reordenar' : escapeHtml(char.name)}"
                >
                  ${canReorderChar ? '<span class="text-xs opacity-40 group-hover:opacity-90 shrink-0">⠿</span>' : ''}
                  <h2 class="font-serif-fantasy text-lg sm:text-xl font-black tracking-wide truncate app-title">
                    ${escapeHtml(char.name)}
                  </h2>
                </div>
                ${
                  isEnemy
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0 flex items-center gap-1">
                        <iconify-icon icon="game-icons:monster-grasp"></iconify-icon> INIMIGO
                      </span>`
                    : ''
                }
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-amber-500/15 gold-title border border-amber-500/30 shrink-0">
                  ${isMasked ? 'NV. ?' : `NV. ${char.level || 1}`}
                </span>
                ${
                  isBattleActive
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0 flex items-center gap-1" title="Quantidade de turnos executados nesta batalha">
                        <iconify-icon icon="game-icons:sands-of-time"></iconify-icon> Turnos: ${turnCount}
                      </span>`
                    : ''
                }
              </div>

              ${metaBarHtml}
              ${tacticalHtml}
            </div>

            <!-- Botões de Ação no Canto Superior Direito -->
            <div class="char-top-actions shrink-0 pt-0.5 flex flex-col items-end gap-1.5">
              <div class="flex items-center gap-1">
                ${topButtonsHtml}
              </div>
              ${buffsNerfsBtnHtml ? `<div class="flex items-center justify-end">${buffsNerfsBtnHtml}</div>` : ''}
            </div>
          </div>

          ${activeTurnBannerHtml}
          ${deadBannerHtml}
          ${pendingBannerHtml}

          <!-- Barras Visuais: Vida, Armadura e Mana -->
          <div class="space-y-2.5">
            <!-- VIDA -->
            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1">
                <span class="flex items-center gap-1.5 text-rose-400 uppercase tracking-wider">
                  <iconify-icon icon="game-icons:heart-bottle" class="icon-hp"></iconify-icon>
                  <span>Vida</span>
                  ${hpOverflow ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/40">OVERFLOW</span>' : ''}
                </span>
                <span class="font-mono font-extrabold text-sm ${hpOverflow ? 'text-amber-400' : 'app-title'}">
                  ${isMasked ? '? <span class="opacity-50">/ ?</span>' : `${char.hp} <span class="opacity-50">/ ${char.maxHp}</span>`}
                </span>
              </div>
              <div class="stat-bar-track h-3 rounded-full ${hpOverflow ? 'stat-overflow-glow' : ''}">
                <div class="stat-bar-fill stat-bar-hp" style="width: ${hpPct}%"></div>
              </div>
            </div>

            <!-- ARMADURA -->
            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1">
                <span class="flex items-center gap-1.5 text-sky-400 uppercase tracking-wider">
                  <iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon>
                  <span>Armadura</span>
                  ${armorOverflow ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/40">OVERFLOW</span>' : ''}
                </span>
                <span class="font-mono font-extrabold text-sm ${armorOverflow ? 'text-amber-400' : 'app-title'}">
                  ${isMasked ? '? <span class="opacity-50">/ ?</span>' : `${char.armor} <span class="opacity-50">/ ${char.maxArmor}</span>`}
                </span>
              </div>
              <div class="stat-bar-track h-3 rounded-full ${armorOverflow ? 'stat-overflow-glow' : ''}">
                <div class="stat-bar-fill stat-bar-armor" style="width: ${armorPct}%"></div>
              </div>
            </div>

            <!-- MANA -->
            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1">
                <span class="flex items-center gap-1.5 text-indigo-400 uppercase tracking-wider">
                  <iconify-icon icon="game-icons:crystal-bars" class="icon-mana"></iconify-icon>
                  <span>Mana</span>
                  ${manaOverflow ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/40">OVERFLOW</span>' : ''}
                </span>
                <span class="font-mono font-extrabold text-sm ${manaOverflow ? 'text-amber-400' : 'app-title'}">
                  ${isMasked ? '? <span class="opacity-50">/ ?</span>' : `${char.mana} <span class="opacity-50">/ ${char.maxMana}</span>`}
                </span>
              </div>
              <div class="stat-bar-track h-3 rounded-full ${manaOverflow ? 'stat-overflow-glow' : ''}">
                <div class="stat-bar-fill stat-bar-mana" style="width: ${manaPct}%"></div>
              </div>
            </div>

            ${resChipsHtml}
          </div>

          ${generalSkillsBannerHtml}
          ${bottomActionsHtml}
        </article>
      `;
      })
      .join('');

    renderBattleSidebar();
    updateBattleToggleButton();
  }
  // ---------------------------------------------------------------------------
  // ABA 3: CATÁLOGO DE ITENS
  // ---------------------------------------------------------------------------
  const ITEM_TYPE_ICONS = {
    ARMADURA: '<iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon>',
    ARMA: '<iconify-icon icon="game-icons:gladius"></iconify-icon>',
    ACESSORIO: '<iconify-icon icon="game-icons:ring"></iconify-icon>',
    CONSUMIVEL: '<iconify-icon icon="game-icons:health-potion"></iconify-icon>',
    OUTRO: '<iconify-icon icon="game-icons:knapsack"></iconify-icon>',
  };

  function renderCatalogTab() {
    const grid = document.getElementById('catalog-items-grid');
    if (!grid) return;

    const q = state.catalogSearchQuery.trim().toLowerCase();
    const tFilter = state.catalogTypeFilter;

    const items = (state.itemsCatalog || []).filter((it) => {
      if (!isEffectiveMaster() && it.visivelParaJogadores === false) return false;
      if (tFilter !== 'ALL' && it.tipo !== tFilter) return false;
      return it.nome.toLowerCase().includes(q) || (it.descricao || '').toLowerCase().includes(q);
    });

    if (items.length === 0) {
      grid.innerHTML = `<div class="col-span-full py-12 text-center app-muted">Nenhum item encontrado no catálogo.</div>`;
      return;
    }

    const canManage = isEffectiveMaster() || hasPermission('item_manage_catalog') || hasPermission('canManageItemsCatalog');
    const canGrant = isEffectiveMaster() || hasPermission('inventory_edit_others');

    grid.innerHTML = items
      .map((it) => {
        const effectsHtml =
          (it.effects || []).length > 0
            ? `<div class="flex flex-wrap gap-1.5 pt-1">
                ${it.effects
                  .map(
                    (ef) => `
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 gold-title border border-amber-500/30">
                    ${ef.value >= 0 ? '+' : ''}${ef.value}${ef.modifierType === 'PERCENT' ? '%' : ''} ${escapeHtml(
                      formatEffectTargetLabel(ef.targetStat)
                    )}
                  </span>`
                  )
                  .join('')}
              </div>`
            : '<span class="text-[11px] app-muted italic">Sem efeitos se equipado</span>';

        return `
        <div class="fantasy-card p-4 flex flex-col justify-between gap-3">
          <div class="space-y-2">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xl flex items-center">${ITEM_TYPE_ICONS[it.tipo] || '<iconify-icon icon="game-icons:knapsack"></iconify-icon>'}</span>
                <div>
                  <h4 class="font-serif-fantasy font-bold text-sm app-title">${escapeHtml(it.nome)}</h4>
                  <span class="text-[10px] font-mono uppercase gold-title">${escapeHtml(it.tipo)}</span>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-500/10 gold-title border border-amber-500/30">
                ${it.precoIndefinido ? 'Preço Indef.' : `<iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> ${it.preco}`}
              </span>
            </div>

            <p class="text-xs app-muted leading-relaxed item-description">${escapeHtml(it.descricao || 'Sem descrição.')}</p>

            ${effectsHtml}

            <div class="flex flex-wrap gap-2 text-[10px] font-mono app-muted pt-1">
              <span class="flex items-center gap-1"><iconify-icon icon="game-icons:weight"></iconify-icon> <span>Peso: ${it.peso}kg</span></span>
              <span>• ${it.equipavel ? 'Equipável' : 'Não-equipável'}</span>
              ${it.naoNegociavel ? '<span class="text-rose-400">• Não Negociável</span>' : ''}
              ${it.visivelParaJogadores === false ? '<span class="text-amber-400">• Oculto p/ Jogadores</span>' : ''}
            </div>
          </div>

          <div class="pt-2.5 border-t app-divider-border flex items-center justify-between gap-2">
            ${
              canGrant
                ? `
              <button type="button" data-grant-item="${escapeHtml(it.id)}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold btn-gold-outline">
                <iconify-icon icon="game-icons:chest"></iconify-icon> <span>Conceder Item</span>
              </button>
            `
                : '<div></div>'
            }
            ${
              canManage
                ? `
              <div class="flex items-center gap-1">
                <button type="button" data-edit-item="${escapeHtml(it.id)}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold app-secondary-btn" title="Editar Item"><iconify-icon icon="game-icons:quill-ink"></iconify-icon></button>
                <button type="button" data-delete-item="${escapeHtml(it.id)}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-400 app-secondary-btn" title="Excluir Item"><iconify-icon icon="game-icons:crowned-skull"></iconify-icon></button>
              </div>
            `
                : (!canGrant ? `<span class="text-[11px] app-muted">Catálogo da Campanha</span>` : '')
            }
          </div>
        </div>
      `;
      })
      .join('');
  }

  // ---------------------------------------------------------------------------
  // ABA 4: LOJA & MERCADORES + ESCROW
  // ---------------------------------------------------------------------------
  function renderShopTab() {
    const buyerSelect = document.getElementById('shop-buyer-char-select');
    if (buyerSelect) {
      if (!state.selectedBuyerCharId && state.characters.length > 0) {
        state.selectedBuyerCharId = state.characters[0].id;
      }
      buyerSelect.innerHTML = state.characters
        .map(
          (c) =>
            `<option value="${escapeHtml(c.id)}" ${c.id === state.selectedBuyerCharId ? 'selected' : ''}>${escapeHtml(
              c.name
            )} ${state.room?.isSharedWallet ? '' : `(${c.gold || 0} ${state.room?.currencyName || 'Ouro'})`}</option>`
        )
        .join('');
    }

    // Escrow approvals box (visível para todos os jogadores e para o Mestre)
    const escrowBox = document.getElementById('escrow-approvals-box');
    const escrowList = document.getElementById('escrow-sales-list');
    const canApprove = hasPermission('canApproveSales');

    if (escrowBox && escrowList) {
      const pending = state.escrowSales || [];
      if (pending.length > 0) {
        escrowBox.classList.remove('hidden');
        escrowList.innerHTML = pending
          .map(
            (s) => `
          <div class="p-3 rounded-lg bg-black/30 border app-divider-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span class="font-bold gold-title">${escapeHtml(s.charName)}</span> solicita vender
              <strong>${escapeHtml(s.itemName)}</strong> por <span class="font-mono font-bold text-amber-400"><iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> ${s.salePrice} ${escapeHtml(state.room.currencyName)}</span>
            </div>
            <div class="flex items-center gap-2">
              ${
                canApprove
                  ? `
                <button type="button" data-approve-escrow="${escapeHtml(s.id)}" class="px-3 py-1 rounded font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition"><iconify-icon icon="game-icons:check-mark" style="color: #4ade80;"></iconify-icon> <span>Aprovar</span></button>
                <button type="button" data-reject-escrow="${escapeHtml(s.id)}" class="px-3 py-1 rounded font-bold bg-rose-600 text-white hover:bg-rose-500 transition flex items-center gap-1"><iconify-icon icon="game-icons:crowned-skull"></iconify-icon> <span>Recusar</span></button>
              `
                  : `<span class="px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5"><iconify-icon icon="game-icons:sands-of-time"></iconify-icon> <span>Aguardando aprovação do Mestre</span></span>`
              }
            </div>
          </div>
        `
          )
          .join('');
      } else {
        escrowBox.classList.add('hidden');
      }
    }

    // NPCs list
    const npcSidebar = document.getElementById('shop-npcs-sidebar');
    const showcase = document.getElementById('shop-npc-showcase');
    if (!npcSidebar || !showcase) return;

    if (!state.selectedShopNpcId && state.npcs.length > 0) {
      state.selectedShopNpcId = state.npcs[0].id;
    }

    const canManageShop = hasPermission('canManageShopNpcs');

    npcSidebar.innerHTML = (state.npcs || [])
      .map((npc) => {
        const active = npc.id === state.selectedShopNpcId;
        return `
        <div class="fantasy-card p-3.5 cursor-pointer transition ${
          active ? 'border-amber-400 bg-amber-500/10' : ''
        }" data-select-npc="${escapeHtml(npc.id)}">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="text-2xl shrink-0 flex items-center"><iconify-icon icon="game-icons:shop" class="text-amber-400"></iconify-icon></span>
              <div class="min-w-0">
                <h4 class="font-serif-fantasy font-bold text-xs sm:text-sm gold-title truncate">${escapeHtml(npc.name)}</h4>
                <p class="text-[11px] app-muted line-clamp-1">${escapeHtml(npc.description || '')}</p>
              </div>
            </div>
            ${
              canManageShop
                ? `<div class="flex items-center gap-1 shrink-0">
                    <button type="button" data-edit-npc="${escapeHtml(npc.id)}" title="Editar Mercador e Estoque" class="text-xs app-icon-btn px-2 py-1 rounded"><iconify-icon icon="game-icons:quill-ink"></iconify-icon></button>
                    <button type="button" data-delete-npc="${escapeHtml(npc.id)}" title="Excluir Mercador NPC" class="text-xs app-icon-btn px-2 py-1 rounded text-rose-400 hover:bg-rose-500/20"><iconify-icon icon="game-icons:crowned-skull"></iconify-icon></button>
                  </div>`
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');

    const activeNpc = (state.npcs || []).find((n) => n.id === state.selectedShopNpcId);
    if (!activeNpc) {
      showcase.innerHTML = `<div class="fantasy-card p-8 text-center app-muted">Selecione ou cadastre um Mercador NPC.</div>`;
      return;
    }

    const itemsById = {};
    for (const it of state.itemsCatalog) itemsById[it.id] = it;

    const stockCards = (activeNpc.stock || [])
      .map((st) => {
        const item = itemsById[st.itemId];
        if (!item) return '';
        if (!isEffectiveMaster() && item.visivelParaJogadores === false) return '';
        const outOfStock = !st.infinite && Number(st.quantity || 0) <= 0;
        const hasCustomPrice =
          st.customPrice !== undefined && st.customPrice !== null && String(st.customPrice).trim() !== '';
        const effectivePrice = hasCustomPrice ? Math.max(0, Number(st.customPrice)) : Number(item.preco || 0);
        const maxBuyQty = st.infinite ? 999 : Math.max(1, Number(st.quantity || 1));

        return `
        <div class="fantasy-card p-4 flex flex-col justify-between gap-3 ${outOfStock ? 'opacity-50' : ''}">
          <div>
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="font-serif-fantasy font-bold text-sm app-title flex items-center gap-1.5">${ITEM_TYPE_ICONS[item.tipo] || '<iconify-icon icon="game-icons:knapsack"></iconify-icon>'} <span>${escapeHtml(item.nome)}</span></h4>
                <span class="text-[10px] font-mono app-muted flex items-center gap-1"><iconify-icon icon="game-icons:weight"></iconify-icon> <span>${item.peso}kg</span> • ${
                  st.infinite ? 'Estoque Infinito' : `Estoque: ${st.quantity}`
                }</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-amber-500/15 gold-title border border-amber-500/30">
                  <iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> ${effectivePrice}
                </span>
                ${
                  canManageShop
                    ? `<button
                        type="button"
                        data-remove-shop-item="${escapeHtml(item.id)}"
                        data-npc-id="${escapeHtml(activeNpc.id)}"
                        title="Remover este item da loja do NPC"
                        class="px-2 py-1 rounded-lg text-xs font-bold text-rose-400 app-secondary-btn hover:bg-rose-500/20"
                      >
                        <iconify-icon icon="game-icons:crowned-skull"></iconify-icon>
                      </button>`
                    : ''
                }
              </div>
            </div>
            <p class="text-xs app-muted mt-2 item-description">${escapeHtml(item.descricao || '')}</p>
          </div>

          <div class="space-y-2 pt-2 border-t app-divider-border">
            ${
              canManageShop
                ? `<div class="flex items-center justify-between gap-2 text-[11px]">
                    <span class="font-bold app-muted" title="Apenas o Mestre pode alterar o valor cobrado pelo NPC (vazio = preço padrão ${item.preco})">
                      <iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> Valor no NPC <span class="opacity-60 font-mono">(Padrão: ${item.preco})</span>:
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      data-shop-custom-price="${escapeHtml(item.id)}"
                      data-npc-id="${escapeHtml(activeNpc.id)}"
                      value="${hasCustomPrice ? effectivePrice : ''}"
                      placeholder="${item.preco}"
                      class="w-24 app-input px-2 py-1 rounded-lg text-xs font-mono font-bold text-amber-300 text-right"
                    />
                  </div>`
                : ''
            }

            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/30 border app-divider-border shrink-0" title="Quantidade para comprar de uma vez">
                <span class="text-[10px] font-bold uppercase app-muted">Qtd:</span>
                <input
                  type="number"
                  min="1"
                  max="${maxBuyQty}"
                  step="1"
                  value="1"
                  data-shop-buy-qty="${escapeHtml(item.id)}"
                  data-unit-price="${effectivePrice}"
                  ${outOfStock ? 'disabled' : ''}
                  class="w-14 app-input px-1.5 py-0.5 rounded text-xs font-mono font-bold text-center"
                />
              </div>
              <button
                type="button"
                data-buy-item="${escapeHtml(item.id)}"
                data-npc-id="${escapeHtml(activeNpc.id)}"
                data-unit-price="${effectivePrice}"
                ${outOfStock ? 'disabled' : ''}
                class="btn-gold flex-1 py-2 px-3 text-xs font-serif-fantasy uppercase tracking-wider disabled:opacity-40"
              >
                ${outOfStock ? 'Esgotado' : `<iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> Comprar (${effectivePrice} ${escapeHtml(state.room.currencyName)})`}
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    showcase.innerHTML = `
      <div class="fantasy-card p-4 border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-serif-fantasy text-base font-extrabold gold-title flex items-center gap-2"><iconify-icon icon="game-icons:shop"></iconify-icon> <span>${escapeHtml(activeNpc.name)}</span></h3>
          <p class="text-xs app-muted mt-0.5">${escapeHtml(activeNpc.description || '')}</p>
        </div>
        ${
          canManageShop
            ? `<div class="flex items-center gap-2">
                <button type="button" data-edit-npc="${escapeHtml(activeNpc.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold btn-gold-outline">
                  <iconify-icon icon="game-icons:quill-ink"></iconify-icon> <span>Editar Loja</span>
                </button>
                <button type="button" data-delete-npc="${escapeHtml(activeNpc.id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/35 hover:bg-rose-500/25 transition">
                  <iconify-icon icon="game-icons:crowned-skull"></iconify-icon> <span>Excluir NPC</span>
                </button>
              </div>`
            : ''
        }
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${stockCards || '<div class="col-span-full p-6 text-center app-muted">Este mercador não possui itens à venda.</div>'}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // ABA 5: BESTIÁRIO DE CRIATURAS & INIMIGOS
  // ---------------------------------------------------------------------------
  function renderBestiaryTab() {
    const isMaster = isEffectiveMaster();
    const canSeeHidden = isMaster || hasPermission('bestiary_view_hidden');
    const canSeeRevealed = isMaster || hasPermission('bestiary_view_revealed') || canSeeHidden;
    const canManage = isMaster || hasPermission('bestiary_manage');
    const canSummon = isMaster || hasPermission('bestiary_summon');

    const visibleEnemies = canSeeHidden
      ? (state.bestiary || [])
      : canSeeRevealed
      ? (state.bestiary || []).filter((b) => b.reveladoParaJogadores)
      : [];

    const q = (state.bestiarySearchQuery || '').trim().toLowerCase();
    const filtered = visibleEnemies.filter((e) => (e.name || '').toLowerCase().includes(q));

    const countPill = document.getElementById('bestiary-count-pill');
    if (countPill) countPill.textContent = `${filtered.length} MONSTRO(S)`;

    const grid = document.getElementById('bestiary-grid');
    const empty = document.getElementById('empty-bestiary-state');
    const emptyMsg = document.getElementById('empty-bestiary-message');
    const pageInfo = document.getElementById('bestiary-page-info');
    const btnPrev = document.getElementById('btn-bestiary-prev');
    const btnNext = document.getElementById('btn-bestiary-next');

    const PAGE_SIZE = 6;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.bestiaryPage > totalPages) state.bestiaryPage = totalPages;
    if (state.bestiaryPage < 1) state.bestiaryPage = 1;

    if (pageInfo) pageInfo.textContent = `Página ${state.bestiaryPage} de ${totalPages}`;
    if (btnPrev) btnPrev.disabled = state.bestiaryPage <= 1;
    if (btnNext) btnNext.disabled = state.bestiaryPage >= totalPages;

    if (filtered.length === 0) {
      if (grid) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
      }
      if (empty) {
        empty.classList.remove('hidden');
        empty.classList.add('flex');
      }
      if (emptyMsg) {
        emptyMsg.textContent = q
          ? `Nenhuma criatura corresponde à busca "${q}".`
          : (isMaster
            ? 'Nenhum inimigo cadastrado ainda no Bestiário. Clique em "CRIAR INIMIGO" para começar.'
            : 'Nenhum inimigo revelado pelo Mestre até o momento.');
      }
      return;
    }

    if (empty) {
      empty.classList.add('hidden');
      empty.classList.remove('flex');
    }
    if (grid) grid.classList.remove('hidden');

    const paged = filtered.slice((state.bestiaryPage - 1) * PAGE_SIZE, state.bestiaryPage * PAGE_SIZE);

    if (grid) {
      grid.innerHTML = paged
        .map((e) => {
          const isRevealed = Boolean(e.reveladoParaJogadores);

          const resChips = RESISTANCE_TYPES.map((r) => {
            const resVal = e.resistances?.[r.name]?.max ?? 100;
            return `
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-200 border border-amber-500/20" title="${r.label}">
                ${r.icon} <span>${r.name}: ${resVal}</span>
              </span>
            `;
          }).join('');

          return `
          <article class="char-card p-4 sm:p-5 flex flex-col justify-between gap-3.5 relative border border-rose-950/40 hover:border-amber-500/40 transition">
            <!-- Topo: Ícone + Nome + Nível + Visibilidade -->
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 text-lg shrink-0">
                    <iconify-icon icon="game-icons:monster-grasp"></iconify-icon>
                  </span>
                  <div class="min-w-0">
                    <h3 class="font-serif-fantasy text-base sm:text-lg font-black tracking-wide truncate gold-title" title="${escapeHtml(e.name)}">
                      ${escapeHtml(e.name)}
                    </h3>
                    <span class="px-2 py-0.2 rounded text-[10px] font-mono font-extrabold bg-amber-500/15 gold-title border border-amber-500/30">
                      NV. ${e.level || 1}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Switch / Indicador de Liberação -->
              <div class="shrink-0">
                ${
                  canManage
                    ? `<button
                        type="button"
                        data-toggle-reveal="${escapeHtml(e.id)}"
                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
                          isRevealed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30'
                            : 'bg-black/50 text-neutral-400 border border-neutral-700 hover:border-amber-500/40'
                        }"
                        title="${isRevealed ? 'Liberado para jogadores (Clique para Ocultar)' : 'Oculto para jogadores (Clique para Liberar)'}"
                      >
                        <iconify-icon icon="${isRevealed ? 'game-icons:eyeball' : 'game-icons:blindfold'}" style="color: ${isRevealed ? '#4ade80' : '#94a3b8'};"></iconify-icon>
                        <span>${isRevealed ? 'Liberado' : 'Oculto'}</span>
                      </button>`
                    : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <iconify-icon icon="game-icons:eyeball" style="color: #4ade80;"></iconify-icon> <span>Conhecido</span>
                      </span>`
                }
              </div>
            </div>

            <!-- Recursos Vitais do Inimigo -->
            <div class="space-y-1.5 p-2.5 rounded-xl bg-black/30 border app-divider-border text-xs font-mono">
              <div class="grid grid-cols-3 gap-2">
                <div class="flex items-center gap-1 text-rose-400">
                  <iconify-icon icon="game-icons:heart-bottle" class="icon-hp"></iconify-icon>
                  <span class="font-extrabold">${e.maxHp} HP</span>
                </div>
                <div class="flex items-center gap-1 text-sky-400">
                  <iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon>
                  <span class="font-extrabold">${e.maxArmor} ARM</span>
                </div>
                <div class="flex items-center gap-1 text-indigo-400">
                  <iconify-icon icon="game-icons:crystal-bars" class="icon-mana"></iconify-icon>
                  <span class="font-extrabold">${e.maxMana} MP</span>
                </div>
              </div>
              <div class="flex items-center justify-between pt-1 border-t app-divider-border text-[11px]">
                <span class="text-emerald-400 flex items-center gap-1">
                  <iconify-icon icon="game-icons:dragon-shield"></iconify-icon> DEF: <strong>${e.defense || 0}</strong>
                </span>
                <span class="text-violet-400 flex items-center gap-1">
                  <iconify-icon icon="game-icons:fairy-wand" class="icon-mana"></iconify-icon> REGEN: <strong>${e.regen || 10}%</strong>
                </span>
                <span class="text-amber-300 flex items-center gap-1">
                  <iconify-icon icon="game-icons:gladius" class="icon-dmg"></iconify-icon> ATQ: <strong>${e.attack || 0}</strong>
                </span>
              </div>
            </div>

            <!-- 7 Resistências de Status -->
            <div class="flex flex-wrap gap-1">
              ${resChips}
            </div>

            <!-- Botão HABILIDADES GERAIS -->
            <button
              type="button"
              data-open-general-skills="${escapeHtml(e.id)}"
              data-target-type="bestiary"
              class="w-full py-2 px-3 rounded-lg font-serif-fantasy font-extrabold text-xs uppercase tracking-wider bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 flex items-center justify-center gap-1.5 transition"
            >
              <iconify-icon icon="game-icons:scroll-unfurled"></iconify-icon>
              <span>HABILIDADES GERAIS</span>
            </button>

            <!-- Ações do Mestre / Invocação -->
            ${
              (canSummon || canManage)
                ? `<div class="flex items-center gap-2 pt-2 border-t app-divider-border">
                    ${
                      canSummon
                        ? `<button
                            type="button"
                            data-spawn-enemy="${escapeHtml(e.id)}"
                            class="btn-gold flex-1 py-1.5 px-3 text-xs font-serif-fantasy font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5"
                            title="Trazer este inimigo para a mesa de combate"
                          >
                            <iconify-icon icon="game-icons:portal"></iconify-icon>
                            <span>Trazer p/ Mesa</span>
                          </button>`
                        : ''
                    }
                    ${
                      canManage
                        ? `<button
                            type="button"
                            data-edit-enemy="${escapeHtml(e.id)}"
                            class="app-secondary-btn py-1.5 px-2.5 text-xs font-bold rounded-lg flex items-center justify-center"
                            title="Editar Ficha do Inimigo"
                          >
                            <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
                          </button>
                          <button
                            type="button"
                            data-delete-enemy="${escapeHtml(e.id)}"
                            class="py-1.5 px-2.5 text-xs font-bold rounded-lg flex items-center justify-center text-rose-400 border border-rose-500/30 hover:bg-rose-950/50 transition"
                            title="Excluir do Bestiário"
                          >
                            <iconify-icon icon="game-icons:crowned-skull"></iconify-icon>
                          </button>`
                        : ''
                    }
                  </div>`
                : ''
            }
          </article>
          `;
        })
        .join('');
    }
  }

  // ---------------------------------------------------------------------------
  // ABA 6: MISSÕES
  // ---------------------------------------------------------------------------
  const QUEST_STATUS_BADGES = {
    PENDENTE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ACEITA: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    EM_PROGRESSO: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    PAUSADA: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    CONCLUIDA: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    RECUSADA: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    CANCELADA: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
  };

  function renderQuestsTab() {
    const grid = document.getElementById('quests-list-grid');
    if (!grid) return;

    const canAccept = isEffectiveMaster() || hasPermission('mission_accept');
    const canApprove = isEffectiveMaster() || hasPermission('mission_approve');
    const canManage = isEffectiveMaster() || hasPermission('mission_manage');
    const itemsById = {};
    for (const it of state.itemsCatalog) itemsById[it.id] = it;

    if ((state.quests || []).length === 0) {
      grid.innerHTML = `<div class="col-span-full py-12 text-center app-muted">Nenhuma missão cadastrada.</div>`;
      return;
    }

    grid.innerHTML = state.quests
      .map((q) => {
        const rw = q.rewards || {};
        const rewardItems = [];
        if (Array.isArray(rw.items) && rw.items.length > 0) {
          rw.items.forEach((it) => {
            if (it && it.itemId) {
              const tpl = itemsById[it.itemId];
              const name = tpl ? tpl.nome : it.itemId;
              const qty = Math.max(1, Number(it.quantity || 1));
              rewardItems.push(`${qty}x ${name}`);
            }
          });
        } else if (Array.isArray(rw.itemIds)) {
          rw.itemIds.forEach((id) => {
            const tpl = itemsById[id];
            if (tpl) rewardItems.push(`1x ${tpl.nome}`);
          });
        }
        const rewardItemNames = rewardItems.join(', ');

        let acceptedBadgeHtml = '';
        if (q.acceptedByCharacterId) {
          const charObj = (state.characters || []).find((c) => c.id === q.acceptedByCharacterId);
          const charName = q.acceptedByCharacterName || charObj?.name || 'Personagem';
          acceptedBadgeHtml = `
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs font-mono">
              <iconify-icon icon="game-icons:hooded-figure" class="icon-gold"></iconify-icon>
              <span><strong>Aceita por:</strong> ${escapeHtml(charName)}</span>
            </div>
          `;
        }

        return `
        <div class="fantasy-card p-5 flex flex-col justify-between gap-4">
          <div class="space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-serif-fantasy text-base font-extrabold gold-title">${escapeHtml(q.title)}</h3>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                QUEST_STATUS_BADGES[q.status] || QUEST_STATUS_BADGES.PENDENTE
              }">
                ${escapeHtml(q.status)}
              </span>
            </div>

            <p class="text-xs app-muted leading-relaxed">${escapeHtml(q.description)}</p>

            ${acceptedBadgeHtml}

            <!-- Pacote de Recompensas -->
            <div class="p-3 rounded-xl bg-black/25 border app-divider-border space-y-1.5">
              <div class="text-[10px] font-serif-fantasy uppercase tracking-wider gold-title font-bold">
                <iconify-icon icon="game-icons:chest"></iconify-icon> Pacote de Recompensas ${q.rewarded ? '(JÁ ENTREGUE <iconify-icon icon="game-icons:check-mark" style="color: #4ade80;"></iconify-icon>)' : ''}
              </div>
              <div class="flex flex-wrap gap-2 text-xs font-mono">
                ${rw.gold ? `<span class="text-amber-300 flex items-center gap-1"><iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> +${rw.gold} ${escapeHtml(state.room.currencyName)}</span>` : ''}
                ${rw.xp ? `<span class="text-amber-400 flex items-center gap-1"><iconify-icon icon="game-icons:sparkles" class="icon-gold"></iconify-icon> +${rw.xp} XP</span>` : ''}
                ${rw.attributePoints ? `<span class="text-emerald-400 flex items-center gap-1"><iconify-icon icon="game-icons:dna1"></iconify-icon> +${rw.attributePoints} Pts Atrib.</span>` : ''}
                ${rw.skillPoints ? `<span class="text-purple-400 flex items-center gap-1"><iconify-icon icon="game-icons:spell-book"></iconify-icon> +${rw.skillPoints} Pts Hab.</span>` : ''}
                ${rewardItemNames ? `<span class="text-sky-300 flex items-center gap-1"><iconify-icon icon="game-icons:knapsack"></iconify-icon> ${escapeHtml(rewardItemNames)}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="pt-3 border-t app-divider-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-1.5">
              ${
                q.status === 'PENDENTE' && !q.acceptedByCharacterId && canAccept
                  ? `<button type="button" data-action="open-accept-quest" data-quest-id="${escapeHtml(q.id)}" class="px-3 py-1.5 rounded-lg font-bold btn-gold flex items-center gap-1.5"><iconify-icon icon="game-icons:tied-scroll"></iconify-icon> <span>Aceitar Missão</span></button>`
                  : ''
              }
              ${
                canApprove && q.status !== 'CONCLUIDA'
                  ? `<button type="button" data-quest-status="${escapeHtml(q.id)}" data-status="CONCLUIDA" class="px-3 py-1.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"><iconify-icon icon="game-icons:check-mark"></iconify-icon> <span>Concluir &amp; Premiar</span></button>`
                  : ''
              }
            </div>

            ${
              canManage
                ? `
              <div class="flex items-center gap-1.5">
                <button type="button" data-edit-quest="${escapeHtml(q.id)}" class="px-2 py-1 rounded app-secondary-btn text-amber-300 hover:text-amber-200" title="Editar Missão">
                  <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
                </button>
                <select data-quest-select-status="${escapeHtml(q.id)}" class="px-2 py-1 app-input text-[11px] font-bold">
                  ${['PENDENTE', 'ACEITA', 'EM_PROGRESSO', 'PAUSADA', 'CONCLUIDA', 'RECUSADA', 'CANCELADA']
                    .map((st) => `<option value="${st}" ${q.status === st ? 'selected' : ''}>${st}</option>`)
                    .join('')}
                </select>
                <button type="button" data-delete-quest="${escapeHtml(q.id)}" class="px-2 py-1 rounded app-secondary-btn text-rose-400 hover:bg-rose-500/20" title="Excluir Missão">
                  <iconify-icon icon="game-icons:crowned-skull"></iconify-icon>
                </button>
              </div>
            `
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');
  }

  // ---------------------------------------------------------------------------
  // ABA 7: ADMINISTRAÇÃO & AUDITORIA PERPÉTUA COM FILTROS AVANÇADOS
  // ---------------------------------------------------------------------------
  function renderAdminTab() {
    const isMaster = isEffectiveMaster();
    const r = state.room || {};
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = String(v ?? '');
        el.disabled = !isMaster;
      }
    };
    setVal('cfg-room-name', r.name || 'SALA1');
    setVal('cfg-room-subtitle', r.subtitle || '');
    setVal('cfg-currency-name', r.currencyName || 'Ouro');
    setVal('cfg-wallet-mode', r.isSharedWallet !== false ? 'SHARED' : 'INDIVIDUAL');
    setVal('cfg-precedence', r.statModifierPrecedence || 'FLAT_FIRST');
    setVal('cfg-rounding', r.roundingMode || 'ROUND_DOWN');
    setVal('cfg-inv-unlimited', r.unlimitedInventory !== false ? 'true' : 'false');
    setVal('cfg-inv-limit', r.inventoryLimit || 10);
    setVal('cfg-room-quote', r.quote || '');

    const btnSaveConfig = document.querySelector('#form-room-config button[type="submit"]');
    if (btnSaveConfig) btnSaveConfig.classList.toggle('hidden', !isMaster);

    const logEl = document.getElementById('audit-log-container');
    if (!logEl) return;

    if (!isMaster && !hasPermission('system_view_audit_log')) {
      logEl.innerHTML = `<div class="p-8 text-center text-xs app-muted">Você não possui permissão para visualizar o log de auditoria.</div>`;
      const counterEl = document.getElementById('audit-log-counter');
      if (counterEl) counterEl.textContent = 'Acesso restrito pelo Mestre';
      return;
    }

    const allLogs = state.auditLog || [];

    // Preenchimento dinâmico dos selects de filtro
    const typeSelect = document.getElementById('audit-filter-type');
    const userSelect = document.getElementById('audit-filter-user');
    const searchInput = document.getElementById('audit-filter-search');
    const counterEl = document.getElementById('audit-log-counter');

    if (searchInput && searchInput.value !== (state.auditFilterSearch || '')) {
      searchInput.value = state.auditFilterSearch || '';
    }

    if (typeSelect) {
      const currentVal = state.auditFilterType || 'ALL';
      const types = Array.from(new Set(allLogs.map((l) => l.actionType).filter(Boolean))).sort();
      typeSelect.innerHTML =
        `<option value="ALL">Todos os Tipos</option>` +
        types.map((t) => `<option value="${escapeHtml(t)}" ${t === currentVal ? 'selected' : ''}>[${escapeHtml(t)}]</option>`).join('');
    }

    if (userSelect) {
      const currentVal = state.auditFilterUser || 'ALL';
      const users = Array.from(new Set(allLogs.map((l) => l.actorName).filter(Boolean))).sort();
      userSelect.innerHTML =
        `<option value="ALL">Todos os Usuários</option>` +
        users.map((u) => `<option value="${escapeHtml(u)}" ${u === currentVal ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('');
    }

    // Filtragem em tempo real
    const q = (state.auditFilterSearch || '').trim().toLowerCase();
    const selType = state.auditFilterType || 'ALL';
    const selUser = state.auditFilterUser || 'ALL';

    const filteredLogs = allLogs.filter((entry) => {
      if (selType !== 'ALL' && entry.actionType !== selType) return false;
      if (selUser !== 'ALL' && entry.actorName !== selUser) return false;
      if (q) {
        const fullHaystack = `${entry.actionType || ''} ${entry.targetEntity || ''} ${entry.summary || ''} ${entry.actorName || ''} ${entry.createdAt || ''}`.toLowerCase();
        if (!fullHaystack.includes(q)) return false;
      }
      return true;
    });

    if (counterEl) {
      counterEl.textContent = `Exibindo ${filteredLogs.length} de ${allLogs.length} registros`;
    }

    if (filteredLogs.length === 0) {
      logEl.innerHTML = `<div class="p-8 text-center text-xs app-muted">Nenhum registro encontrado para os filtros aplicados.</div>`;
      return;
    }

    logEl.innerHTML = filteredLogs
      .map(
        (entry) => `
      <div class="p-3 rounded-xl bg-black/25 border app-divider-border text-xs space-y-1 hover:border-amber-500/30 transition">
        <div class="flex items-center justify-between">
          <span class="font-mono font-bold gold-title">[${escapeHtml(entry.actionType)}] ${escapeHtml(entry.targetEntity || '')}</span>
          <span class="text-[10px] font-mono app-muted">${escapeHtml(entry.createdAt || '')}</span>
        </div>
        <p class="app-label leading-relaxed">${escapeHtml(entry.summary || '')}</p>
        <div class="text-[10px] app-muted">Autor: <strong>${escapeHtml(entry.actorName || 'Sistema')}</strong></div>
      </div>
    `
      )
      .join('');
  }

  function renderAll() {
    renderHeaderAndSidebarBadges();
    renderOverviewTab();
    renderCharactersTab();
    renderCatalogTab();
    renderShopTab();
    renderBestiaryTab();
    renderQuestsTab();
    renderAdminTab();
    renderBattleSidebar();
    refreshOpenModalsIfAny();
    refreshAllRemoteCursorsVisibility();
  }

  // ===========================================================================
  // Modais e Fluxos Interativos
  // ===========================================================================
  function openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
    refreshAllRemoteCursorsVisibility();
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
    if (id === 'modal-resistances') state.activeResistanceCharId = null;
    if (id === 'modal-buffs-nerfs') state.activeBuffsNerfsCharId = null;
    if (id === 'modal-char-sheet') state.activeSheetCharId = null;
    if (id === 'modal-char-inventory') state.activeInventoryCharId = null;
    refreshAllRemoteCursorsVisibility();
  }

  function refreshOpenModalsIfAny() {
    if (state.activeResistanceCharId) {
      const char = state.characters.find((c) => c.id === state.activeResistanceCharId);
      if (char) renderResistancesPanelContent(char);
      else {
        closeModal('modal-single-resistance');
        closeModal('modal-resistances');
      }
    }
    if (state.activeBuffsNerfsCharId) {
      const char = state.characters.find((c) => c.id === state.activeBuffsNerfsCharId);
      if (char) renderBuffsNerfsModalContent(char);
      else closeModal('modal-buffs-nerfs');
    }
    if (state.activeSheetCharId) {
      const char = state.characters.find((c) => c.id === state.activeSheetCharId);
      if (char) renderCharacterSheetModalContent(char);
      else closeModal('modal-char-sheet');
    }
    if (state.activeInventoryCharId) {
      const char = state.characters.find((c) => c.id === state.activeInventoryCharId);
      if (char) renderCharacterInventoryModalContent(char);
      else closeModal('modal-char-inventory');
    }
    const charFormModal = document.getElementById('modal-char-form');
    if (charFormModal && !charFormModal.classList.contains('hidden')) {
      const charFormId = document.getElementById('char-form-id')?.value;
      if (charFormId && !state.characters.some((c) => c.id === charFormId)) {
        closeModal('modal-char-form');
      }
    }
    const genSkillsModal = document.getElementById('modal-general-skills');
    if (genSkillsModal && !genSkillsModal.classList.contains('hidden')) {
      const genType = document.getElementById('general-skills-target-type')?.value;
      const genTargetId = document.getElementById('general-skills-target-id')?.value;
      if (genType === 'character' && genTargetId && !state.characters.some((c) => c.id === genTargetId)) {
        closeModal('modal-general-skills');
      }
    }
    const memberModal = document.getElementById('modal-member');
    if (memberModal && !memberModal.classList.contains('hidden') && state.editingMemberId) {
      const curPresetVal = document.getElementById('member-preset-select')?.value;
      renderMemberPresetDropdown(curPresetVal);
    }
  }

  function openConfirmModal({ icon, title, message, confirmText, onConfirm }) {
    document.getElementById('confirm-modal-icon').innerHTML = icon || '<iconify-icon icon="game-icons:hazard-sign"></iconify-icon>';
    document.getElementById('confirm-modal-title').textContent = title || 'CONFIRMAR';
    document.getElementById('confirm-modal-message').textContent = message || '';
    document.getElementById('btn-confirm-ok').innerHTML = confirmText || 'Confirmar';
    state.confirmCallback = onConfirm;
    openModal('modal-confirm');
  }

  // ---------------------------------------------------------------------------
  // Modal 1: Criar / Editar Personagem (Point Buy 57 + 7 Resistências + DEL)
  // ---------------------------------------------------------------------------
  function renderCharFormAttributesInputs(attrsObj) {
    const grid = document.getElementById('char-form-attributes-grid');
    if (!grid) return;

    let seenSeven = false;
    grid.innerHTML = CANONICAL_ATTRIBUTES.map((a) => {
      let val = Math.max(7, Number(attrsObj?.[a.key] ?? 8));
      if (val === 7) {
        if (seenSeven) val = 8;
        else seenSeven = true;
      }
      return `
        <div class="p-2 rounded-lg bg-black/30 border app-divider-border text-center">
          <label class="block text-[11px] font-bold gold-title mb-1">${a.icon} ${a.label}</label>
          <input
            type="number"
            min="7"
            max="99"
            step="1"
            data-attr-pb-input="${a.key}"
            value="${val}"
            class="w-full px-2 py-1 text-center font-mono font-black text-sm app-input"
          />
          <div class="text-[10px] font-mono app-muted mt-1" data-attr-pb-mod="${a.key}">Mod: 0</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-attr-pb-input]').forEach((inp) => {
      inp.addEventListener('input', (evt) => updatePointBuyLiveCounter(evt));
      inp.addEventListener('change', (evt) => updatePointBuyLiveCounter(evt));
    });
    updatePointBuyLiveCounter();
  }

  function updatePointBuyLiveCounter(evt) {
    const counter = document.getElementById('point-buy-counter');
    if (!counter) return;

    const inputs = Array.from(document.querySelectorAll('[data-attr-pb-input]'));
    const changedInp = evt?.target || null;

    if (changedInp && changedInp.value !== '') {
      let rawV = Math.round(Number(changedInp.value));
      if (Number.isFinite(rawV) && rawV < 7) {
        rawV = 7;
        changedInp.value = '7';
        showToast('O valor mínimo permitido para qualquer atributo é 7.');
      }
      const otherHasSeven = inputs.some((inp) => inp !== changedInp && Number(inp.value) <= 7);
      if (rawV === 7 && otherHasSeven) {
        changedInp.value = '8';
        showToast('Apenas UM atributo pode ficar em 7! Os demais devem ser no mínimo 8.');
      }
    }

    // Garantir que nunca existam dois atributos em 7 nem menores que 7
    let foundSevenInput = null;
    inputs.forEach((inp) => {
      let v = Math.round(Number(inp.value || 8));
      if (!Number.isFinite(v) || v < 7) {
        v = 7;
        inp.value = '7';
      }
      if (v === 7) {
        if (!foundSevenInput) {
          foundSevenInput = inp;
        } else {
          v = 8;
          inp.value = '8';
        }
      }
    });

    // Se já houver 1 atributo em 7, definir min="8" nos outros 4 inputs para travar as setas
    inputs.forEach((inp) => {
      if (foundSevenInput && inp !== foundSevenInput) {
        inp.min = '8';
      } else {
        inp.min = '7';
      }
    });

    let total = 0;
    let reducedCount = 0;
    let maxVal = 0;

    inputs.forEach((inp) => {
      const k = inp.getAttribute('data-attr-pb-input');
      const v = Math.max(7, Math.round(Number(inp.value || 8)));
      total += v;
      if (v === 7) reducedCount++;
      if (v > maxVal) maxVal = v;

      const modEl = document.querySelector(`[data-attr-pb-mod="${k}"]`);
      if (modEl) {
        const mod = getAttributeModifier(v);
        const dc = getPassiveAutoSuccessDc(v);
        modEl.textContent = `Mod: ${mod >= 0 ? '+' : ''}${mod}${dc ? ` • Auto DC≤${dc}` : ''}`;
      }
    });

    const remaining = 57 - total;
    const cap = reducedCount === 1 ? 19 : 18;
    const valid = remaining >= 0 && reducedCount <= 1 && maxVal <= cap;

    counter.textContent = `Restantes: ${remaining} pts (Soma: ${total}/57 • Teto: ${cap})`;
    counter.className = valid
      ? 'px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
      : 'px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40';
  }

  function updateCharFormSkillBadges() {
    const slots = [
      { key: 'PASSIVA', inputId: 'char-skill-passive', badgeId: 'form-skill-badge-PASSIVA' },
      { key: 'ATIVA', inputId: 'char-skill-active', badgeId: 'form-skill-badge-ATIVA' },
      { key: 'SUPREMA', inputId: 'char-skill-supreme', badgeId: 'form-skill-badge-SUPREMA' },
    ];
    for (const s of slots) {
      const txt = (document.getElementById(s.inputId)?.value || '').trim();
      const badge = document.getElementById(s.badgeId);
      if (badge) {
        if (txt.length > 0) {
          badge.innerHTML = `<span class="inline-flex items-center gap-1"><iconify-icon icon="game-icons:check-mark" style="color: #4ade80;"></iconify-icon> <span>Preenchida (${txt.length} car.)</span></span>`;
          badge.className = 'text-[10px] font-mono text-emerald-400 font-bold';
        } else {
          badge.textContent = 'Clique p/ editar';
          badge.className = 'text-[10px] font-mono app-muted';
        }
      }
    }
  }

  function renderCharFormResistanceInputs(resistancesObj) {
    const container = document.getElementById('char-form-resistances-grid');
    if (!container) return;
    container.innerHTML = RESISTANCE_TYPES.map((r) => {
      const maxVal = resistancesObj?.[r.name]?.max ?? 100;
      return `
        <div>
          <label class="block text-[11px] font-bold mb-1 ${r.textClass}">${r.icon} ${escapeHtml(r.name)}</label>
          <input
            type="number"
            min="0"
            step="1"
            data-res-max-input="${escapeHtml(r.name)}"
            value="${maxVal}"
            required
            class="w-full px-2.5 py-1.5 text-xs font-mono font-bold app-input"
          />
        </div>
      `;
    }).join('');
  }

  function renderCharFormElementalResistanceInputs(elemResObj) {
    const container = document.getElementById('char-form-elem-resistances-grid');
    if (!container) return;
    container.innerHTML = ELEMENTAL_RESISTANCE_TYPES.map((er) => {
      const val = Number.isFinite(Number(elemResObj?.[er.key])) ? Number(elemResObj[er.key]) : 0;
      return `
        <div>
          <label class="block text-[11px] font-bold mb-1 ${er.textClass}">${er.icon} ${escapeHtml(er.label)} (%)</label>
          <div class="relative">
            <input
              type="number"
              step="any"
              data-elem-res-input="${escapeHtml(er.key)}"
              value="${val}"
              required
              class="w-full px-2.5 py-1.5 pr-6 text-xs font-mono font-bold app-input"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono app-muted pointer-events-none">%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function openCreateCharacterModal() {
    if (!isEffectiveMaster() && !hasPermission('char_create')) {
      showToast('Você não possui permissão para criar novos personagens!', 'warning');
      return;
    }
    document.getElementById('char-form-id').value = '';
    document.getElementById('char-form-icon').innerHTML = '<iconify-icon icon="game-icons:sparkles"></iconify-icon>';
    document.getElementById('char-form-title').textContent = 'CRIAR PERSONAGEM';
    document.getElementById('char-name-input').value = '';
    document.getElementById('char-age-input').value = '';
    document.getElementById('char-height-input').value = '';
    document.getElementById('char-history-input').value = '';
    if (document.getElementById('char-skills-input')) document.getElementById('char-skills-input').value = '';
    if (document.getElementById('char-skill-passive')) document.getElementById('char-skill-passive').value = '';
    if (document.getElementById('char-skill-active')) document.getElementById('char-skill-active').value = '';
    if (document.getElementById('char-skill-supreme')) document.getElementById('char-skill-supreme').value = '';
    updateCharFormSkillBadges();

    // Padrões do prompt original + Limite de Peso padrão 27kg
    document.getElementById('char-max-hp').value = '100';
    document.getElementById('char-regen').value = '10';
    document.getElementById('char-max-armor').value = '10';
    document.getElementById('char-max-mana').value = '100';
    document.getElementById('char-defense').value = '0';
    document.getElementById('char-attack').value = '0';
    document.getElementById('char-arcana').value = '0';
    document.getElementById('char-santidade').value = '0';
    if (document.getElementById('char-max-weight')) document.getElementById('char-max-weight').value = '27';

    renderCharFormAttributesInputs({ FORCA: 8, DESTREZA: 8, INTELIGENCIA: 8, SABEDORIA: 8, LABIA: 8 });
    const defaultRes = {};
    for (const r of RESISTANCE_TYPES) defaultRes[r.name] = { current: 0, max: 100 };
    renderCharFormResistanceInputs(defaultRes);
    renderCharFormElementalResistanceInputs({});

    document.getElementById('btn-delete-char')?.classList.add('hidden');
    openModal('modal-char-form');
    setTimeout(() => document.getElementById('char-name-input')?.focus(), 50);
  }

  function openEditCharacterModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    if (!canEditCharacter(char)) {
      showToast('Você só pode editar fichas de personagens criados por você!');
      return;
    }

    document.getElementById('char-form-id').value = char.id;
    document.getElementById('char-form-icon').innerHTML = '<iconify-icon icon="game-icons:quill-ink"></iconify-icon>';
    document.getElementById('char-form-title').textContent = 'EDITAR PERSONAGEM';
    document.getElementById('char-name-input').value = char.name;
    document.getElementById('char-age-input').value = char.age || '';
    document.getElementById('char-height-input').value = char.height || '';
    document.getElementById('char-history-input').value = char.history || '';
    if (document.getElementById('char-skills-input')) {
      document.getElementById('char-skills-input').value = char.skillsDescription || '';
    }
    if (document.getElementById('char-skill-passive')) {
      document.getElementById('char-skill-passive').value = char.skillPassive || '';
    }
    if (document.getElementById('char-skill-active')) {
      document.getElementById('char-skill-active').value = char.skillActive || '';
    }
    if (document.getElementById('char-skill-supreme')) {
      document.getElementById('char-skill-supreme').value = char.skillSupreme || '';
    }
    updateCharFormSkillBadges();

    document.getElementById('char-max-hp').value = String(char.baseMaxHp ?? char.maxHp);
    document.getElementById('char-regen').value = String(char.baseRegen ?? char.regen);
    document.getElementById('char-max-armor').value = String(char.baseMaxArmor ?? char.maxArmor);
    document.getElementById('char-max-mana').value = String(char.baseMaxMana ?? char.maxMana);
    document.getElementById('char-defense').value = String(char.baseDefense ?? char.defense);
    document.getElementById('char-attack').value = String(char.baseAttack ?? char.attack ?? 0);
    document.getElementById('char-arcana').value = String(char.baseArcana ?? char.arcana ?? 0);
    document.getElementById('char-santidade').value = String(char.baseSantidade ?? char.santidade ?? 0);
    if (document.getElementById('char-max-weight')) {
      document.getElementById('char-max-weight').value = String(char.maxWeight ?? 27);
    }

    renderCharFormAttributesInputs(char.attributes);
    renderCharFormResistanceInputs(char.resistances);
    renderCharFormElementalResistanceInputs(char.elementalResistances);

    const canDel = isEffectiveMaster() || hasPermission('char_delete');
    document.getElementById('btn-delete-char')?.classList.toggle('hidden', !canDel);
    openModal('modal-char-form');
  }

  function handleCharacterFormSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('char-form-id').value.trim();
    if (charId) {
      const existingChar = state.characters.find((c) => c.id === charId);
      if (existingChar && !canEditCharacter(existingChar)) {
        showToast('Você não possui permissão para editar a ficha deste personagem!', 'warning');
        return;
      }
    } else {
      if (!isEffectiveMaster() && !hasPermission('char_create')) {
        showToast('Você não possui permissão para criar novos personagens!', 'warning');
        return;
      }
    }
    const rawName = document.getElementById('char-name-input').value.trim();
    const name = rawName || 'Sem nome';

    const maxHp = Math.max(0, Math.round(Number(document.getElementById('char-max-hp').value || 0)));
    const maxArmor = Math.max(0, Math.round(Number(document.getElementById('char-max-armor').value || 0)));
    const maxMana = Math.max(0, Math.round(Number(document.getElementById('char-max-mana').value || 0)));
    const regenRaw = Number(document.getElementById('char-regen').value);
    const regen = Number.isFinite(regenRaw) ? Math.max(0, regenRaw) : 10;
    const defense = Math.round(Number(document.getElementById('char-defense').value || 0));
    const attack = Math.round(Number(document.getElementById('char-attack').value || 0));
    const arcana = Math.round(Number(document.getElementById('char-arcana').value || 0));
    const santidade = Math.round(Number(document.getElementById('char-santidade').value || 0));
    const maxWeightRaw = Number(document.getElementById('char-max-weight')?.value ?? 27);
    const maxWeight = Number.isFinite(maxWeightRaw) && maxWeightRaw >= 0 ? Number(maxWeightRaw.toFixed(2)) : 27;

    const age = document.getElementById('char-age-input').value.trim();
    const height = document.getElementById('char-height-input').value.trim();
    const history = document.getElementById('char-history-input').value.trim();
    const skillsDescription = (document.getElementById('char-skills-input')?.value || '').trim();
    const skillPassive = (document.getElementById('char-skill-passive')?.value || '').trim();
    const skillActive = (document.getElementById('char-skill-active')?.value || '').trim();
    const skillSupreme = (document.getElementById('char-skill-supreme')?.value || '').trim();

    const attrs = {};
    let sevensCount = 0;
    document.querySelectorAll('[data-attr-pb-input]').forEach((inp) => {
      let v = Math.max(7, Math.round(Number(inp.value || 8)));
      if (v === 7) {
        sevensCount++;
        if (sevensCount > 1) v = 8;
      }
      attrs[inp.getAttribute('data-attr-pb-input')] = v;
    });

    const newResLimits = {};
    document.querySelectorAll('[data-res-max-input]').forEach((inp) => {
      newResLimits[inp.getAttribute('data-res-max-input')] = Math.max(0, Math.round(Number(inp.value || 0)));
    });

    const elemRes = {};
    for (const er of ELEMENTAL_RESISTANCE_TYPES) elemRes[er.key] = 0;
    document.querySelectorAll('[data-elem-res-input]').forEach((inp) => {
      const k = inp.getAttribute('data-elem-res-input');
      const v = Number(inp.value);
      elemRes[k] = Number.isFinite(v) ? Number(v.toFixed(1)) : 0;
    });

    const activeMem = getActiveMember();
    const creatorIp =
      activeMem?.ip ||
      state.localClientIp ||
      state.network?.preferred_ip ||
      window.location.hostname ||
      '127.0.0.1';
    const creatorMemberId = activeMem?.id || 'host_master';

    commitMutation(
      (st) => {
        if (!charId) {
          const resistances = {};
          const initialResistances = {};
          for (const r of RESISTANCE_TYPES) {
            const rMax = newResLimits[r.name] ?? 100;
            resistances[r.name] = { current: 0, max: rMax };
            initialResistances[r.name] = { current: 0, max: rMax };
          }
          const newChar = {
            id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name,
            ownerMemberId: creatorMemberId,
            ownerIp: creatorIp,
            age,
            height,
            history,
            skillsDescription,
            skillPassive,
            skillActive,
            skillSupreme,
            maxWeight,
            level: 1,
            xp: 0,
            xpNext: calculateXpRequiredForLevel(1),
            skillPoints: 0,
            pendingAttributePoints: 0,
            hp: maxHp,
            maxHp,
            baseMaxHp: maxHp,
            armor: maxArmor,
            maxArmor,
            baseMaxArmor: maxArmor,
            armorDegradation: 0,
            mana: maxMana,
            maxMana,
            baseMaxMana: maxMana,
            pa: 3,
            maxPa: 3,
            baseMaxPa: 3,
            regen,
            baseRegen: regen,
            defense,
            baseDefense: defense,
            attack,
            baseAttack: attack,
            arcana,
            baseArcana: arcana,
            santidade,
            baseSantidade: santidade,
            resistancePercent: 0,
            baseResistancePercent: 0,
            damageReductionPercent: 0,
            baseDamageReductionPercent: 0,
            gold: 0,
            isDead: maxHp === 0,
            attributes: attrs,
            resistances,
            elementalResistances: { ...elemRes },
            inventory: [],
            activeBuffs: [],
            talents: [],
            initial: {
              hp: maxHp,
              maxHp,
              armor: maxArmor,
              maxArmor,
              mana: maxMana,
              maxMana,
              pa: 3,
              maxPa: 3,
              regen,
              defense,
              attack,
              arcana,
              santidade,
              maxWeight,
              resistances: initialResistances,
              elementalResistances: { ...elemRes },
            },
          };
          recalculateCharacterDerived(newChar);
          newChar.hp = newChar.maxHp;
          newChar.armor = newChar.maxArmor;
          newChar.mana = newChar.maxMana;
          st.characters.push(newChar);

          // Vincular automaticamente o personagem criado ao Membro/IP criador
          const memInSt = (st.members || []).find(
            (m) => m.id === creatorMemberId || (creatorIp && m.ip === creatorIp)
          );
          if (memInSt) {
            memInSt.characterId = newChar.id;
          }
        } else {
          const target = st.characters.find((c) => c.id === charId);
          if (!target) return false;

          target.name = name;
          target.age = age;
          target.height = height;
          target.history = history;
          target.skillsDescription = skillsDescription;
          target.skillPassive = skillPassive;
          target.skillActive = skillActive;
          target.skillSupreme = skillSupreme;
          target.maxWeight = maxWeight;

          target.baseMaxHp = maxHp;
          target.baseMaxArmor = maxArmor;
          target.baseMaxMana = maxMana;
          target.baseRegen = regen;
          target.baseDefense = defense;
          target.baseAttack = attack;
          target.baseArcana = arcana;
          target.baseSantidade = santidade;
          target.attributes = attrs;
          target.elementalResistances = { ...elemRes };

          const initialResistances = {};
          for (const r of RESISTANCE_TYPES) {
            const rMax = newResLimits[r.name] ?? 100;
            const prevCur = target.resistances?.[r.name]?.current ?? 0;
            target.resistances[r.name] = {
              current: Math.max(0, Math.min(prevCur, rMax)),
              max: rMax,
            };
            initialResistances[r.name] = { current: 0, max: rMax };
          }

          recalculateCharacterDerived(target);
          // Clamping automático se o novo máximo for menor que o atual
          target.hp = Math.min(target.hp, target.maxHp);
          target.armor = Math.min(target.armor, target.maxArmor);
          target.mana = Math.min(target.mana, target.maxMana);

          target.initial = {
            hp: target.baseMaxHp,
            maxHp: target.baseMaxHp,
            armor: target.baseMaxArmor,
            maxArmor: target.baseMaxArmor,
            mana: target.baseMaxMana,
            maxMana: target.baseMaxMana,
            pa: target.baseMaxPa,
            maxPa: target.baseMaxPa,
            regen: target.baseRegen,
            defense: target.baseDefense,
            attack: target.baseAttack,
            arcana: target.baseArcana,
            santidade: target.baseSantidade,
            maxWeight: target.maxWeight,
            resistances: initialResistances,
            elementalResistances: { ...elemRes },
          };
        }
        return true;
      },
      {
        actionType: charId ? 'CHAR_EDIT' : 'CHAR_CREATE',
        targetEntity: `Personagem: ${name}`,
        summary: charId
          ? `Ficha de ${name} atualizada.`
          : `Personagem ${name} criado e vinculado automaticamente ao IP ${creatorIp}.`,
      }
    );

    closeModal('modal-char-form');
  }

  // ---------------------------------------------------------------------------
  // Modal 2: Aplicar Dano (Rápido/Real + Pipeline Tática ADR-012)
  // ---------------------------------------------------------------------------
  function setDamageModeUI(mode) {
    state.damageMode = mode;
    const btnSimple = document.getElementById('btn-dmg-mode-simple');
    const btnPipe = document.getElementById('btn-dmg-mode-pipeline');
    const boxSimple = document.getElementById('damage-simple-container');
    const boxPipe = document.getElementById('damage-pipeline-container');
    const breakdown = document.getElementById('damage-pipeline-breakdown');

    if (mode === 'simple') {
      btnSimple?.classList.add('active-op');
      btnPipe?.classList.remove('active-op');
      boxSimple?.classList.remove('hidden');
      boxPipe?.classList.add('hidden');
      breakdown?.classList.add('hidden');
    } else {
      btnPipe?.classList.add('active-op');
      btnSimple?.classList.remove('active-op');
      boxPipe?.classList.remove('hidden');
      boxSimple?.classList.add('hidden');
      breakdown?.classList.remove('hidden');
    }
    updateDamagePreview();
  }

  function computeCurrentModalDamageResult(char) {
    const isTrue = document.getElementById('damage-true-switch').checked;

    if (state.damageMode === 'simple') {
      const dmg = Math.max(0, Math.round(Number(document.getElementById('damage-amount-input').value || 0)));
      if (isTrue) {
        return {
          finalDamage: dmg,
          nextArmor: char.armor,
          armorDegradedBy: 0,
          nextHp: Math.max(0, char.hp - dmg),
          breakdownText: '',
        };
      }
      const absorbed = Math.min(char.armor, dmg);
      const nextArmor = char.armor - absorbed;
      const leftover = dmg - absorbed;
      const nextHp = Math.max(0, char.hp - leftover);
      return {
        finalDamage: dmg,
        nextArmor,
        armorDegradedBy: 0,
        nextHp,
        breakdownText: '',
      };
    }

    // Modo Pipeline Completa (ADR-012)
    const attacker = {
      baseDamage: Number(document.getElementById('pipe-base-dmg').value || 0),
      statusMultipliers: Number(document.getElementById('pipe-multipliers').value || 0),
      damageBonusPercent: Number(document.getElementById('pipe-bonus-pct').value || 0),
      lethalityPercent: Number(document.getElementById('pipe-lethality-pct').value || 0),
      penetrationPercent: Number(document.getElementById('pipe-penetration-pct').value || 0),
      rupturePercent: Number(document.getElementById('pipe-rupture-pct').value || 0),
    };
    const target = {
      defense: char.defense || 0,
      resistancePercent: char.resistancePercent || 0,
      damageReductionPercent: char.damageReductionPercent || 0,
      currentArmor: char.armor,
      maxArmor: char.maxArmor,
      currentHp: char.hp,
    };
    const overload = false;
    const res = evaluateDamagePipelineClient(attacker, target, isTrue);

    return {
      ...res,
      breakdownText: `Bruto: ${res.dRaw} → Pós-Def(${char.defense}): ${res.dAfterDefense} → Pós-Res(${char.resistancePercent || 0}%): ${res.dAfterResistance} → Dano Final: ${res.finalDamage}`,
    };
  }

  function updateDamagePreview() {
    const charId = document.getElementById('damage-char-id').value;
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;

    const outcome = computeCurrentModalDamageResult(char);
    const armorEl = document.getElementById('damage-preview-armor');
    const hpEl = document.getElementById('damage-preview-hp');
    const bdEl = document.getElementById('damage-pipeline-breakdown');

    if (bdEl && outcome.breakdownText) {
      bdEl.textContent = outcome.breakdownText;
    }
    if (armorEl) {
      armorEl.textContent = `${char.armor} → ${outcome.nextArmor} / ${char.maxArmor}`;
    }
    if (hpEl) {
      hpEl.innerHTML = `${char.hp} → ${outcome.nextHp} / ${char.maxHp}${outcome.nextHp === 0 ? ' (<iconify-icon icon="game-icons:crowned-skull"></iconify-icon> MORTO)' : ''}`;
    }
  }

  function openDamageModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;

    document.getElementById('damage-char-id').value = char.id;
    document.getElementById('damage-char-name').textContent = `${char.name} (DEF: ${char.defense} • Res: ${char.resistancePercent || 0}%)`;
    document.getElementById('damage-amount-input').value = '';
    document.getElementById('damage-true-switch').checked = false;
    const overloadEl = document.getElementById('pipe-overload-armor');
    if (overloadEl) overloadEl.checked = false;

    setDamageModeUI('simple');
    openModal('modal-damage');
    setTimeout(() => document.getElementById('damage-amount-input')?.focus(), 50);
  }

  function handleDamageFormSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('damage-char-id').value;
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;

    const outcome = computeCurrentModalDamageResult(char);

    commitMutation(
      (st, toasts) => {
        const target = st.characters.find((c) => c.id === charId);
        if (!target) return false;
        target.armor = outcome.nextArmor;
        target.hp = outcome.nextHp;
        if (target.hp === 0) {
          target.isDead = true;
          target.pa = 0;
          toasts.push(`${target.name} caiu em batalha (MORTO)!`);
          syncBattleQueueAliveState(st, toasts);
        }
        return true;
      },
      {
        actionType: 'DAMAGE_DEALT',
        targetEntity: `Personagem: ${char.name}`,
        summary: `${char.name} recebeu ${outcome.finalDamage} de dano (HP: ${outcome.nextHp}, Armadura: ${outcome.nextArmor}).`,
      }
    );

    closeModal('modal-damage');
  }

  // ---------------------------------------------------------------------------
  // Modal 3: Gerenciar Vida / Armadura / Mana (Com OVERFLOW)
  // ---------------------------------------------------------------------------
  const ATTR_META = {
    hp: { label: 'VIDA', icon: '<iconify-icon icon="game-icons:heart-bottle" class="icon-hp"></iconify-icon>', maxKey: 'maxHp' },
    armor: { label: 'ARMADURA', icon: '<iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon>', maxKey: 'maxArmor' },
    mana: { label: 'MANA', icon: '<iconify-icon icon="game-icons:crystal-bars" class="icon-mana"></iconify-icon>', maxKey: 'maxMana' },
  };

  function setAttrOpSelection(op) {
    state.activeAttrOp = op;
    document.querySelectorAll('#attr-op-group .attr-op-btn').forEach((btn) => {
      btn.classList.toggle('active-op', btn.getAttribute('data-op') === op);
    });
  }

  function openAttributeModal(charId, attrKey) {
    const char = state.characters.find((c) => c.id === charId);
    const meta = ATTR_META[attrKey];
    if (!char || !meta) return;

    document.getElementById('attr-char-id').value = char.id;
    document.getElementById('attr-type-key').value = attrKey;
    document.getElementById('attr-modal-icon').innerHTML = meta.icon;
    document.getElementById('attr-modal-title').textContent = `GERENCIAR ${meta.label}`;
    document.getElementById('attr-modal-subtitle').textContent = `${char.name} • Atual: ${char[attrKey]} / ${char[meta.maxKey]}`;
    document.getElementById('attr-value-input').value = '';
    document.getElementById('attr-overflow-switch').checked = false;

    setAttrOpSelection('add');
    openModal('modal-attribute');
    setTimeout(() => document.getElementById('attr-value-input')?.focus(), 50);
  }

  function handleAttributeFormSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('attr-char-id').value;
    const attrKey = document.getElementById('attr-type-key').value;
    const meta = ATTR_META[attrKey];
    if (!meta) return;

    const val = Math.max(0, Math.round(Number(document.getElementById('attr-value-input').value || 0)));
    const allowOverflow = document.getElementById('attr-overflow-switch').checked;
    const op = state.activeAttrOp;

    commitMutation((st, toasts) => {
      const target = st.characters.find((c) => c.id === charId);
      if (!target) return false;
      const cur = target[attrKey];
      const maxVal = target[meta.maxKey];
      let nextVal = cur;

      if (op === 'add') {
        nextVal = cur + val;
        if (!allowOverflow) nextVal = Math.min(maxVal, nextVal);
      } else if (op === 'sub') {
        nextVal = Math.max(0, cur - val);
      } else if (op === 'set') {
        nextVal = Math.max(0, val);
        if (!allowOverflow) nextVal = Math.min(maxVal, nextVal);
      }

      target[attrKey] = Math.max(0, nextVal);
      if (attrKey === 'hp') {
        target.isDead = target.hp === 0;
        if (target.isDead) {
          target.pa = 0;
          toasts.push(`${target.name} caiu em batalha (MORTO)!`);
          syncBattleQueueAliveState(st, toasts);
        }
      }
      return true;
    });

    closeModal('modal-attribute');
  }

  // ---------------------------------------------------------------------------
  // Ações Rápidas: Regeneração de Mana (REGEN) e Resetar (RESETAR)
  // ---------------------------------------------------------------------------
  function triggerInstantManaRegen(charId) {
    commitMutation((st) => {
      const target = st.characters.find((c) => c.id === charId);
      if (!target) return false;
      recalculateCharacterDerived(target);
      const recoveredMana = Math.round(target.maxMana * (target.regen / 100));
      if (target.mana < target.maxMana) {
        target.mana = Math.min(target.maxMana, target.mana + recoveredMana);
      }
      const regenVida = Number(target.derived?.effectiveRegenVida || 0);
      if (regenVida > 0 && target.hp < target.maxHp && !target.isDead) {
        target.hp = Math.min(target.maxHp, target.hp + regenVida);
      }
      const regenArmadura = Number(target.derived?.effectiveRegenArmadura || 0);
      if (regenArmadura > 0 && target.armor < target.maxArmor) {
        target.armor = Math.min(target.maxArmor, target.armor + regenArmadura);
      }
      return true;
    });
  }

  function requestResetCharacter(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;

    openConfirmModal({
      icon: '<iconify-icon icon="game-icons:sands-of-time"></iconify-icon>',
      title: `RESETAR ${char.name.toUpperCase()}?`,
      message:
        'Todos os atributos (Vida, Armadura, Mana, limites máximos, Defesa e Regen%) voltarão ao estado inicial configurado e todos os 7 acúmulos serão zerados.',
      confirmText: '<iconify-icon icon="game-icons:sands-of-time"></iconify-icon> <span>Resetar</span>',
      onConfirm: () => {
        commitMutation(
          (st) => {
            const target = st.characters.find((c) => c.id === charId);
            if (!target || !target.initial) return false;
            const init = deepClone(target.initial);

            target.baseMaxHp = init.maxHp;
            target.baseMaxArmor = init.maxArmor;
            target.baseMaxMana = init.maxMana;
            target.baseRegen = init.regen;
            target.baseDefense = init.defense;
            target.armorDegradation = 0;
            target.activeBuffs = [];
            target.isDead = false;
            if (init.elementalResistances) {
              target.elementalResistances = deepClone(init.elementalResistances);
            }

            recalculateCharacterDerived(target);
            target.hp = target.maxHp;
            target.armor = target.maxArmor;
            target.mana = target.maxMana;
            target.pa = target.maxPa;

            for (const r of RESISTANCE_TYPES) {
              const iMax = init.resistances?.[r.name]?.max ?? 100;
              target.resistances[r.name] = { current: 0, max: iMax };
            }
            return true;
          },
          {
            actionType: 'CHAR_RESET',
            targetEntity: `Personagem: ${char.name}`,
            summary: `${char.name} foi resetado para seus valores iniciais.`,
          }
        );
      },
    });
  }

  function requestDeleteCharacter() {
    const charId = document.getElementById('char-form-id').value;
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    if (!isEffectiveMaster() && !hasPermission('char_delete')) {
      showToast('Você não possui permissão para excluir personagens!', 'warning');
      return;
    }
    if (!canEditCharacter(char)) {
      showToast('Você não possui permissão para excluir a ficha deste personagem!', 'warning');
      return;
    }

    openConfirmModal({
      icon: '<iconify-icon icon="game-icons:crowned-skull"></iconify-icon>',
      title: `EXCLUIR ${char.name.toUpperCase()}?`,
      message: `Tem certeza que deseja excluir permanentemente o personagem "${char.name}"?`,
      confirmText: '<iconify-icon icon="game-icons:crowned-skull"></iconify-icon> <span>Excluir</span>',
      onConfirm: () => {
        commitMutation(
          (st) => {
            const idx = st.characters.findIndex((c) => c.id === charId);
            if (idx === -1) return false;
            st.characters.splice(idx, 1);
            if (st.battle && Array.isArray(st.battle.orderIds)) {
              st.battle.orderIds = st.battle.orderIds.filter((id) => id !== charId);
              if (st.battle.orderIds.length === 0) {
                st.battle.isActive = false;
                st.battle.roundNumber = 1;
                st.battle.currentTurnIndex = 0;
              } else if (st.battle.currentTurnIndex >= st.battle.orderIds.length) {
                st.battle.currentTurnIndex = Math.max(0, st.battle.orderIds.length - 1);
              }
            }
            return true;
          },
          {
            actionType: 'CHAR_DELETE',
            targetEntity: `Personagem: ${char.name}`,
            summary: `Personagem ${char.name} foi excluído permanentemente.`,
          }
        );
        closeModal('modal-char-form');
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Modal 4: Painel das 7 Resistências & Sub-modal Individual
  // ---------------------------------------------------------------------------
  function renderResistancesPanelContent(char) {
    const nameEl = document.getElementById('res-panel-char-name');
    const listEl = document.getElementById('resistances-list-container');
    if (!nameEl || !listEl) return;

    nameEl.textContent = char.name;
    listEl.innerHTML = RESISTANCE_TYPES.map((r) => {
      const entry = char.resistances?.[r.name] || { current: 0, max: 100 };
      const pct = calcPercentage(entry.current, entry.max);
      const isMax = entry.max > 0 && entry.current >= entry.max;

      return `
        <button
          type="button"
          data-open-single-res="${escapeHtml(r.name)}"
          data-char-id="${escapeHtml(char.id)}"
          class="resistance-row w-full p-3.5 rounded-xl text-left block group"
        >
          <div class="flex items-center justify-between text-xs font-bold mb-1.5">
            <span class="flex items-center gap-2 ${r.textClass}">
              <span class="text-base">${r.icon}</span>
              <span class="uppercase tracking-wider font-extrabold">${escapeHtml(r.name)}</span>
              ${isMax ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">MAX!</span>' : ''}
            </span>
            <span class="font-mono font-extrabold text-sm app-title">
              ${entry.current} <span class="opacity-50">/ ${entry.max}</span>
            </span>
          </div>
          <div class="stat-bar-track h-3 rounded-full">
            <div class="stat-bar-fill bg-gradient-to-r ${r.barClass}" style="width: ${pct}%"></div>
          </div>
        </button>
      `;
    }).join('');
  }

  function openResistancesPanelModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    state.activeResistanceCharId = char.id;
    renderResistancesPanelContent(char);
    openModal('modal-resistances');
  }

  function setSingleResOpSelection(op) {
    state.activeResOp = op;
    document.querySelectorAll('#single-res-op-group .res-op-btn').forEach((btn) => {
      btn.classList.toggle('active-op', btn.getAttribute('data-res-op') === op);
    });
  }

  function openSingleResistanceModal(charId, resName) {
    const char = state.characters.find((c) => c.id === charId);
    const meta = RESISTANCE_TYPES.find((r) => r.name === resName);
    if (!char || !meta) return;

    const entry = char.resistances?.[resName] || { current: 0, max: 100 };
    document.getElementById('single-res-char-id').value = char.id;
    document.getElementById('single-res-name').value = resName;
    document.getElementById('single-res-icon').innerHTML = meta.icon;
    document.getElementById('single-res-title').textContent = resName.toUpperCase();
    document.getElementById('single-res-subtitle').textContent = `${char.name} • Atual: ${entry.current} / ${entry.max}`;
    document.getElementById('single-res-value-input').value = '';

    setSingleResOpSelection('add');
    openModal('modal-single-resistance');
    setTimeout(() => document.getElementById('single-res-value-input')?.focus(), 50);
  }

  function handleSingleResistanceSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('single-res-char-id').value;
    const resName = document.getElementById('single-res-name').value;
    const val = Math.max(0, Math.round(Number(document.getElementById('single-res-value-input').value || 0)));
    const op = state.activeResOp;

    commitMutation((st, toasts) => {
      const target = st.characters.find((c) => c.id === charId);
      if (!target || !target.resistances?.[resName]) return false;

      const entry = target.resistances[resName];
      const oldVal = entry.current;
      const maxVal = entry.max;
      let nextVal = oldVal;

      if (op === 'add') nextVal = Math.min(maxVal, oldVal + val);
      else if (op === 'sub') nextVal = Math.max(0, oldVal - val);
      else if (op === 'set') nextVal = Math.max(0, Math.min(maxVal, val));

      entry.current = nextVal;

      if (maxVal > 0 && nextVal > oldVal && nextVal === maxVal) {
        triggerMaxAccumulationEffect(target, resName, maxVal, toasts);
        entry.current = 0;
      }
      return true;
    });

    closeModal('modal-single-resistance');
  }

  // ---------------------------------------------------------------------------
  // Modal: Buffs e Nerfs (Efeitos Ativos)
  // ---------------------------------------------------------------------------
  function openBuffsNerfsModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    state.activeBuffsNerfsCharId = char.id;
    renderBuffsNerfsModalContent(char);
    openModal('modal-buffs-nerfs');
  }

  function renderBuffsNerfsModalContent(char) {
    if (!char) return;
    const idInput = document.getElementById('buffs-nerfs-char-id');
    const nameEl = document.getElementById('buffs-nerfs-char-name');
    if (idInput) idInput.value = char.id;
    if (nameEl) nameEl.textContent = `${char.name} (Nível ${char.level || 1})`;

    const allEffects = Array.isArray(char.buffsNerfs) ? char.buffsNerfs : [];
    const buffs = allEffects.filter((e) => e.type === 'BUFF');
    const nerfs = allEffects.filter((e) => e.type === 'NERF');

    const buffsBadge = document.getElementById('buffs-count-badge');
    if (buffsBadge) buffsBadge.textContent = String(buffs.length);

    const nerfsBadge = document.getElementById('nerfs-count-badge');
    if (nerfsBadge) nerfsBadge.textContent = String(nerfs.length);

    const buffsContainer = document.getElementById('buffs-list-container');
    const nerfsContainer = document.getElementById('nerfs-list-container');
    const canManage = canEditCharacter(char) || isEffectiveMaster();

    if (buffsContainer) {
      if (buffs.length === 0) {
        buffsContainer.innerHTML = `
          <div class="py-2.5 px-3 rounded-lg bg-black/20 border border-emerald-500/15 text-emerald-400/50 text-[11px] italic font-mono text-center">
            Nenhum Buff ativo neste combatente.
          </div>
        `;
      } else {
        buffsContainer.innerHTML = buffs
          .map((b) => {
            const durLabel = b.duration && b.duration > 0
              ? `${b.duration} ${b.duration === 1 ? 'turno' : 'turnos'}`
              : 'Permanente';
            const paTag = b.paModifier > 0
              ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">+${b.paModifier} PA</span>`
              : '';
            return `
              <div class="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-2 buff-item-card transition hover:border-emerald-500/50">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-emerald-300 text-xs">${escapeHtml(b.name || b.description)}</span>
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">${durLabel}</span>
                    ${paTag}
                  </div>
                  ${
                    b.source
                      ? `<div class="text-[10px] font-mono text-emerald-400/70 mt-0.5 truncate">${escapeHtml(b.source)}</div>`
                      : ''
                  }
                </div>
                ${
                  canManage
                    ? `<button
                        type="button"
                        data-action="delete-buff-nerf"
                        data-char-id="${escapeHtml(char.id)}"
                        data-effect-id="${escapeHtml(b.id)}"
                        class="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400/70 hover:text-rose-400 hover:bg-rose-950/40 shrink-0 transition"
                        title="Remover Buff"
                      >
                        <iconify-icon icon="game-icons:trash-can"></iconify-icon>
                      </button>`
                    : ''
                }
              </div>
            `;
          })
          .join('');
      }
    }

    if (nerfsContainer) {
      if (nerfs.length === 0) {
        nerfsContainer.innerHTML = `
          <div class="py-2.5 px-3 rounded-lg bg-black/20 border border-rose-500/15 text-rose-400/50 text-[11px] italic font-mono text-center">
            Nenhum Nerf ativo neste combatente.
          </div>
        `;
      } else {
        nerfsContainer.innerHTML = nerfs
          .map((n) => {
            const durLabel = n.duration && n.duration > 0
              ? `${n.duration} ${n.duration === 1 ? 'turno' : 'turnos'}`
              : 'Permanente';
            const paTag = n.paModifier < 0
              ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">${n.paModifier} PA</span>`
              : '';
            return `
              <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between gap-2 nerf-item-card transition hover:border-rose-500/50">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-rose-300 text-xs">${escapeHtml(n.name || n.description)}</span>
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">${durLabel}</span>
                    ${paTag}
                  </div>
                  ${
                    n.source
                      ? `<div class="text-[10px] font-mono text-rose-400/70 mt-0.5 truncate">${escapeHtml(n.source)}</div>`
                      : ''
                  }
                </div>
                ${
                  canManage
                    ? `<button
                        type="button"
                        data-action="delete-buff-nerf"
                        data-char-id="${escapeHtml(char.id)}"
                        data-effect-id="${escapeHtml(n.id)}"
                        class="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400/70 hover:text-rose-300 hover:bg-rose-950/40 shrink-0 transition"
                        title="Remover Nerf"
                      >
                        <iconify-icon icon="game-icons:trash-can"></iconify-icon>
                      </button>`
                    : ''
                }
              </div>
            `;
          })
          .join('');
      }
    }
  }

  function removeBuffNerf(charId, effectId) {
    commitMutation((st, toasts) => {
      const char = st.characters.find((c) => c.id === charId);
      if (!char || !Array.isArray(char.buffsNerfs)) return false;
      const eff = char.buffsNerfs.find((e) => e.id === effectId);
      char.buffsNerfs = char.buffsNerfs.filter((e) => e.id !== effectId);
      if (eff) {
        toasts.push(`Efeito "${eff.name || eff.description}" removido de ${char.name}.`);
      }
      return true;
    });
  }

  function handleAddBuffNerfSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('buffs-nerfs-char-id')?.value;
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;

    const desc = document.getElementById('bn-effect-desc')?.value.trim();
    if (!desc) return;
    const type = document.getElementById('bn-effect-type')?.value || 'BUFF';
    const durRaw = document.getElementById('bn-effect-duration')?.value;
    const durNum = durRaw !== '' && !isNaN(Number(durRaw)) ? Number(durRaw) : null;
    const duration = durNum && durNum > 0 ? Math.round(durNum) : null;
    const paMod = Number(document.getElementById('bn-effect-pa-mod')?.value || 0);

    commitMutation((st, toasts) => {
      const target = st.characters.find((c) => c.id === charId);
      if (!target) return false;
      if (!Array.isArray(target.buffsNerfs)) target.buffsNerfs = [];

      target.buffsNerfs.push({
        id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        name: desc,
        description: desc,
        duration,
        source: 'Manual (Mestre/Jogador)',
        paModifier: paMod,
        createdAt: Date.now(),
      });

      if (paMod < 0) {
        const penalty = calculateCombatantPaPenalty(target);
        const maxAvail = Math.max(0, (target.baseMaxPa || 3) - penalty);
        if (target.pa > maxAvail) target.pa = maxAvail;
      }

      toasts.push(`${type === 'BUFF' ? 'Buff' : 'Nerf'} "${desc}" aplicado a ${target.name}.`);
      return true;
    });

    const descInput = document.getElementById('bn-effect-desc');
    const durInput = document.getElementById('bn-effect-duration');
    const paInput = document.getElementById('bn-effect-pa-mod');
    if (descInput) descInput.value = '';
    if (durInput) durInput.value = '';
    if (paInput) paInput.value = '0';
  }

  // ---------------------------------------------------------------------------
  // Modal 5: Ficha Completa, 5 Atributos, Talentos & Inventário P2P
  // ---------------------------------------------------------------------------
  function openCharacterSheetModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    if (!canViewCharacter(char)) {
      showToast('Você não possui permissão para visualizar a ficha deste personagem.', 'warning');
      return;
    }
    state.activeSheetCharId = char.id;
    renderCharacterSheetModalContent(char);
    openModal('modal-char-sheet');
  }

  function renderCharacterSheetModalContent(char) {
    const canEdit = canEditCharacter(char);
    const weight = char.derived?.totalWeight ?? 0;
    const maxWeight = Number.isFinite(Number(char.maxWeight)) ? Number(char.maxWeight) : 27;
    const isOverweight = weight > maxWeight;
    const ownerMem =
      (state.members || []).find(
        (m) => m.id === char.ownerMemberId || (char.ownerIp && m.ip === char.ownerIp) || m.characterId === char.id
      ) || null;
    const ownerLabel = ownerMem
      ? ownerMem.nickname?.trim() || ownerMem.name || ownerMem.ip
      : char.ownerIp || 'Mestre';

    document.getElementById('sheet-char-name').textContent = `${char.name} — Nível ${char.level || 1}${
      !canEdit ? ' (Somente Visualização)' : ''
    }`;
    document.getElementById('sheet-char-meta').innerHTML = `XP: ${char.xp || 0} / ${
      char.xpNext || 80
    } • <iconify-icon icon="game-icons:hooded-figure"></iconify-icon> Vinculado a: ${escapeHtml(ownerLabel)} • <iconify-icon icon="game-icons:weight"></iconify-icon> Carga: ${weight} / ${maxWeight} kg • ${escapeHtml(char.age || 'Idade n/d')} • ${
      escapeHtml(char.height || 'Altura n/d')
    }`;

    const body = document.getElementById('sheet-modal-body');
    if (!body) return;

    const effAttrs = char.derived?.effectiveAttributes || {};
    const pendingPts = Number(char.pendingAttributePoints || 0);

    const attrsCardsHtml = CANONICAL_ATTRIBUTES.map((a) => {
      const info = effAttrs[a.key] || {
        base: char.attributes?.[a.key] ?? 8,
        effective: char.attributes?.[a.key] ?? 8,
        modifier: getAttributeModifier(char.attributes?.[a.key] ?? 8),
        autoSuccessDc: getPassiveAutoSuccessDc(char.attributes?.[a.key] ?? 8),
      };
      return `
        <div class="p-3 rounded-xl bg-black/30 border app-divider-border flex flex-col justify-between gap-2 text-center">
          <div>
            <div class="text-xs font-serif-fantasy font-bold gold-title">${a.icon} ${a.label}</div>
            <div class="text-2xl font-mono font-black app-title mt-1">${info.effective}</div>
            <div class="text-[10px] font-mono app-muted">Base: ${info.base}</div>
          </div>
          <div class="space-y-1">
            <div class="px-2 py-0.5 rounded bg-amber-500/15 gold-title font-mono font-bold text-xs">
              Mod: ${info.modifier >= 0 ? '+' : ''}${info.modifier}
            </div>
            ${
              info.autoSuccessDc
                ? `<div class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">Auto-Sucesso DC ≤ ${info.autoSuccessDc}</div>`
                : '<div class="text-[10px] app-muted">Sem Auto-Sucesso</div>'
            }
          </div>
          ${
            canEdit && (pendingPts > 0 || isEffectiveMaster())
              ? `<div class="flex items-center justify-center gap-1 pt-1">
                  ${
                    isEffectiveMaster()
                      ? `<button type="button" data-sheet-attr-adj="${a.key}" data-delta="-1" class="w-6 h-6 rounded app-secondary-btn font-mono font-bold">－</button>`
                      : ''
                  }
                  <button type="button" data-sheet-attr-adj="${a.key}" data-delta="1" class="px-2 py-0.5 rounded btn-gold font-mono font-bold text-[11px]">＋1</button>
                </div>`
              : ''
          }
        </div>
      `;
    }).join('');

    const elemResCardsHtml = ELEMENTAL_RESISTANCE_TYPES.map((er) => {
      const baseRaw = Number(char.elementalResistances?.[er.key] ?? 0);
      const baseVal = Number.isFinite(baseRaw) ? Number(baseRaw.toFixed(1)) : 0;
      const effRaw = Number(char.derived?.effectiveElementalResistances?.[er.key] ?? baseVal);
      const val = Number.isFinite(effRaw) ? Number(effRaw.toFixed(1)) : baseVal;
      const bonus = Number((val - baseVal).toFixed(1));
      return `
        <div class="p-2.5 rounded-xl bg-black/30 border ${er.borderClass} text-center">
          <span class="block text-[10px] font-bold uppercase ${er.textClass}">${er.icon} ${escapeHtml(er.label)}</span>
          <strong class="block text-sm font-mono font-black app-title mt-0.5">${val}%</strong>
          ${
            bonus !== 0
              ? `<span class="block text-[9px] font-mono ${bonus > 0 ? 'text-emerald-400' : 'text-rose-400'}">Base: ${baseVal}% (${bonus > 0 ? '+' : ''}${bonus}%)</span>`
              : ''
          }
        </div>
      `;
    }).join('');

    const totalInvEntries = (char.inventory || []).length;
    const totalInvUnits = (char.inventory || []).reduce((acc, i) => acc + Math.max(1, Number(i.quantity || 1)), 0);
    const equippedCount = (char.inventory || []).filter((i) => i.isEquipped && i.status !== 'IN_ESCROW').length;

    const hasPassive = Boolean((char.skillPassive || '').trim());
    const hasActive = Boolean((char.skillActive || '').trim());
    const hasSupreme = Boolean((char.skillSupreme || '').trim());

    body.innerHTML = `
      <!-- 5 Atributos Canônicos -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="font-serif-fantasy font-extrabold uppercase gold-title">
            <iconify-icon icon="game-icons:dna1"></iconify-icon> <span>5 Atributos Canônicos, Modificadores &amp; Sucesso Passivo</span>
          </h4>
          ${
            pendingPts > 0
              ? `<span class="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1"><iconify-icon icon="game-icons:chest"></iconify-icon> <span>${pendingPts} Ponto(s) Pendente(s) p/ Distribuir!</span></span>`
              : ''
          }
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          ${attrsCardsHtml}
        </div>
      </div>

      <!-- Status Secundários de Combate (Sem RES. DANO e RED. FINAL) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-black/20 border app-divider-border text-center font-mono">
        <div><span class="block text-[10px] app-muted flex items-center justify-center gap-1"><iconify-icon icon="game-icons:gladius" class="icon-dmg"></iconify-icon> <span>ATAQUE</span></span><strong class="text-sm text-orange-400">${char.attack || 0}</strong></div>
        <div><span class="block text-[10px] app-muted flex items-center justify-center gap-1"><iconify-icon icon="game-icons:dragon-shield"></iconify-icon> <span>DEFESA</span></span><strong class="text-sm text-emerald-400">${char.defense || 0}</strong></div>
        <div><span class="block text-[10px] app-muted flex items-center justify-center gap-1"><iconify-icon icon="game-icons:crystal-ball"></iconify-icon> <span>ARCANA</span></span><strong class="text-sm text-purple-400">${char.arcana || 0}</strong></div>
        <div><span class="block text-[10px] app-muted flex items-center justify-center gap-1"><iconify-icon icon="game-icons:sparkles"></iconify-icon> <span>SANTIDADE</span></span><strong class="text-sm text-amber-300">${char.santidade || 0}</strong></div>
      </div>

      <!-- Resistências Visuais em Porcentagem (Físico, Mágico, Pyro, Cryo, Elétrico, Profano, Sacro) -->
      <div class="p-3.5 rounded-xl bg-black/25 border app-divider-border space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="font-serif-fantasy font-extrabold uppercase gold-title">
            <iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon> <span>Resistências da Ficha (%)</span>
          </h4>
          <span class="text-[11px] app-muted">Físico • Mágico • Pyro • Cryo • Elétrico • Profano • Sacro</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          ${elemResCardsHtml}
        </div>
      </div>

      <!-- 3 Botões de Habilidades (PASSIVA, ATIVA, SUPREMA) — Abre Modal Individual -->
      <div class="p-3.5 rounded-xl bg-black/25 border app-divider-border space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="font-serif-fantasy font-extrabold uppercase gold-title">
            <iconify-icon icon="game-icons:fairy-wand"></iconify-icon> <span>Habilidades Principais (Clique para Abrir Modal com o Texto)</span>
          </h4>
          <span class="text-[11px] app-muted">Os textos ficam guardados em seus respectivos modais.</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            data-open-sheet-skill="PASSIVA"
            class="py-3 px-3 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition flex flex-col items-center justify-center gap-1"
          >
            <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:dragon-shield"></iconify-icon> <span>PASSIVA</span></span>
            <span class="text-[10px] font-mono ${hasPassive ? 'text-emerald-400 font-bold' : 'app-muted'}">
              ${hasPassive ? (canEdit ? 'Ver / Editar Texto' : 'Visualizar Texto') : canEdit ? 'Vazia (Clique p/ escrever)' : 'Vazia'}
            </span>
          </button>
          <button
            type="button"
            data-open-sheet-skill="ATIVA"
            class="py-3 px-3 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition flex flex-col items-center justify-center gap-1"
          >
            <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:crossed-swords"></iconify-icon> <span>ATIVA</span></span>
            <span class="text-[10px] font-mono ${hasActive ? 'text-emerald-400 font-bold' : 'app-muted'}">
              ${hasActive ? (canEdit ? 'Ver / Editar Texto' : 'Visualizar Texto') : canEdit ? 'Vazia (Clique p/ escrever)' : 'Vazia'}
            </span>
          </button>
          <button
            type="button"
            data-open-sheet-skill="SUPREMA"
            class="py-3 px-3 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition flex flex-col items-center justify-center gap-1"
          >
            <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:ifrit" style="color: #f97316;"></iconify-icon> <span>SUPREMA</span></span>
            <span class="text-[10px] font-mono ${hasSupreme ? 'text-emerald-400 font-bold' : 'app-muted'}">
              ${hasSupreme ? (canEdit ? 'Ver / Editar Texto' : 'Visualizar Texto') : canEdit ? 'Vazia (Clique p/ escrever)' : 'Vazia'}
            </span>
          </button>
        </div>
      </div>

      <!-- Botão de Inventário Dedicado (Abre Modal 3x(Infinito) com Filtros e Pesquisa) -->
      <div class="p-3.5 rounded-xl bg-black/25 border app-divider-border flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <h4 class="font-serif-fantasy font-extrabold uppercase gold-title flex items-center gap-2">
            <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:knapsack"></iconify-icon> <span>Inventário &amp; Equipamentos</span></span>
            <span class="px-2 py-0.5 rounded text-[11px] font-mono ${
              isOverweight
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                : 'bg-amber-500/15 gold-title border border-amber-500/30'
            }">
              <iconify-icon icon="game-icons:weight"></iconify-icon> <span>${weight} / ${maxWeight} kg</span>
            </span>
          </h4>
          <p class="text-[11px] app-muted">
            ${totalInvEntries} tipo(s) de item (${totalInvUnits} unid. no total • ${equippedCount} equipado(s)). Abra o modal para filtrar, pesquisar${
              canEdit ? ', equipar ou enviar itens P2P.' : ' e visualizar os itens.'
            }
          </p>
        </div>
        <button
          type="button"
          id="btn-sheet-open-inventory"
          class="px-4 py-2.5 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider btn-gold flex items-center gap-2 shadow-lg"
        >
          <iconify-icon icon="game-icons:knapsack"></iconify-icon>
          <span>ABRIR INVENTÁRIO (${totalInvEntries})</span>
        </button>
      </div>

      <!-- Cockpit de Talentos / Pontos de Habilidade (+2 por Nível) -->
      <div class="p-3.5 rounded-xl bg-black/25 border app-divider-border space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="font-serif-fantasy font-extrabold uppercase gold-title">
            <iconify-icon icon="game-icons:spell-book"></iconify-icon> <span>Talentos de Nível (Pontos Disponíveis: <span class="text-purple-400 font-mono">${char.skillPoints || 0}</span>)</span>
          </h4>
        </div>
        <div class="space-y-1.5">
          ${
            (char.talents || []).map(
              (t) => `<div class="p-2 rounded bg-black/30 border app-divider-border"><strong><iconify-icon icon="game-icons:sparkles"></iconify-icon> ${escapeHtml(t.name)}:</strong> <span class="app-muted">${escapeHtml(t.description || '')}</span></div>`
            ).join('') || '<p class="app-muted italic">Nenhum talento adquirido ainda.</p>'
          }
        </div>
        ${
          canEdit && ((char.skillPoints || 0) > 0 || isEffectiveMaster())
            ? `<div class="flex flex-wrap gap-2 pt-1">
                <input id="sheet-new-talent-name" type="text" placeholder="Nome do Talento..." class="px-3 py-1.5 app-input flex-1" />
                <input id="sheet-new-talent-desc" type="text" placeholder="Efeito / Descrição..." class="px-3 py-1.5 app-input flex-1" />
                <button type="button" id="btn-sheet-add-talent" class="px-3 py-1.5 rounded-lg font-bold btn-gold">＋ Adquirir (-1 Pt)</button>
              </div>`
            : ''
        }
      </div>

      <!-- Biografia -->
      <div class="pt-2 border-t app-divider-border">
        <span class="font-bold uppercase gold-title flex items-center gap-1 mb-1"><iconify-icon icon="game-icons:book-cover"></iconify-icon> <span>História</span></span>
        <p class="app-muted whitespace-pre-line">${escapeHtml(char.history || 'Sem história registrada.')}</p>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Modal 14: Visualizar / Editar Habilidade (PASSIVA, ATIVA, SUPREMA)
  // ---------------------------------------------------------------------------
  const SKILL_SLOT_META = {
    PASSIVA: {
      icon: '<iconify-icon icon="game-icons:dragon-shield"></iconify-icon>',
      title: 'HABILIDADE PASSIVA',
      field: 'skillPassive',
      formInputId: 'char-skill-passive',
    },
    ATIVA: {
      icon: '<iconify-icon icon="game-icons:crossed-swords"></iconify-icon>',
      title: 'HABILIDADE ATIVA',
      field: 'skillActive',
      formInputId: 'char-skill-active',
    },
    SUPREMA: {
      icon: '<iconify-icon icon="game-icons:ifrit" style="color: #f97316;"></iconify-icon>',
      title: 'HABILIDADE SUPREMA',
      field: 'skillSupreme',
      formInputId: 'char-skill-supreme',
    },
  };

  function openSkillDetailModal(slot, context, charId = '') {
    const meta = SKILL_SLOT_META[slot];
    if (!meta) return;

    document.getElementById('skill-modal-context').value = context;
    document.getElementById('skill-modal-slot').value = slot;
    document.getElementById('skill-modal-char-id').value = charId || '';
    document.getElementById('skill-modal-icon').innerHTML = meta.icon;
    document.getElementById('skill-modal-title').textContent = meta.title;

    let currentText = '';
    let canEdit = true;
    if (context === 'form') {
      const charName = document.getElementById('char-name-input')?.value.trim() || 'Novo Personagem';
      document.getElementById('skill-modal-subtitle').textContent = `${charName} • Criação / Edição de Ficha`;
      currentText = document.getElementById(meta.formInputId)?.value || '';
    } else {
      const char = state.characters.find((c) => c.id === charId);
      if (!char) return;
      canEdit = canEditCharacter(char);
      document.getElementById('skill-modal-subtitle').textContent = `${char.name} — Nível ${char.level || 1}${
        !canEdit ? ' • Somente Visualização' : ''
      }`;
      currentText = char[meta.field] || '';
    }

    const textarea = document.getElementById('skill-modal-textarea');
    if (textarea) {
      textarea.value = currentText;
      textarea.readOnly = !canEdit;
    }

    const saveBtn = document.getElementById('btn-save-skill-detail');
    if (saveBtn) saveBtn.classList.toggle('hidden', !canEdit);

    const readonlyBadge = document.getElementById('skill-modal-readonly-badge');
    if (readonlyBadge) readonlyBadge.classList.toggle('hidden', canEdit);

    openModal('modal-skill-detail');
    if (canEdit) setTimeout(() => textarea?.focus(), 50);
  }

  function handleSkillDetailSubmit(e) {
    e.preventDefault();
    const context = document.getElementById('skill-modal-context').value;
    const slot = document.getElementById('skill-modal-slot').value;
    const charId = document.getElementById('skill-modal-char-id').value;
    const text = (document.getElementById('skill-modal-textarea')?.value || '').trim();
    const meta = SKILL_SLOT_META[slot];
    if (!meta) return;

    if (context === 'form') {
      const hiddenInput = document.getElementById(meta.formInputId);
      if (hiddenInput) hiddenInput.value = text;
      updateCharFormSkillBadges();
      showToast(`${meta.icon} Texto da habilidade ${slot} salvo no formulário!`);
      closeModal('modal-skill-detail');
      return;
    }

    const targetChar = state.characters.find((c) => c.id === charId);
    if (!targetChar || !canEditCharacter(targetChar)) {
      showToast('Você só pode editar habilidades de personagens criados por você!');
      return;
    }

    commitMutation(
      (st, toasts) => {
        const char = st.characters.find((c) => c.id === charId);
        if (!char) return false;
        char[meta.field] = text;
        toasts.push(`${meta.icon} Habilidade ${slot} de ${char.name} atualizada!`);
        return true;
      },
      {
        actionType: 'CHAR_SKILL_UPDATE',
        targetEntity: `Personagem ID: ${charId} (${slot})`,
        summary: `Texto da habilidade ${slot} atualizado.`,
      }
    );
    closeModal('modal-skill-detail');
  }

  // ---------------------------------------------------------------------------
  // Modal 15: Inventário Dedicado 3x(Infinito) com Filtros, Pesquisa e Peso
  // ---------------------------------------------------------------------------
  function openCharacterInventoryModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    if (!canViewInventory(char)) {
      showToast('Você não possui permissão para visualizar o inventário deste personagem.', 'warning');
      return;
    }
    state.activeInventoryCharId = char.id;
    state.invModalFilter = 'ALL';
    state.invModalSearchQuery = '';
    const searchInp = document.getElementById('inv-modal-search-input');
    if (searchInp) searchInp.value = '';
    document.querySelectorAll('#inv-modal-type-filters [data-inv-filter]').forEach((b) => {
      b.className =
        b.getAttribute('data-inv-filter') === 'ALL'
          ? 'px-3 py-1.5 rounded-lg text-xs font-bold btn-gold'
          : 'px-3 py-1.5 rounded-lg text-xs font-bold app-secondary-btn';
    });
    renderCharacterInventoryModalContent(char);
    openModal('modal-char-inventory');
  }

  function renderCharacterInventoryModalContent(char) {
    const canEdit = canEditInventory(char);
    const canTransfer = canTransferFromInventory(char);
    const weight = char.derived?.totalWeight ?? 0;
    const maxWeight = Number.isFinite(Number(char.maxWeight)) ? Number(char.maxWeight) : 27;
    const isOverweight = weight > maxWeight;

    const titleEl = document.getElementById('inv-modal-char-name');
    const metaEl = document.getElementById('inv-modal-char-meta');
    const weightBadge = document.getElementById('inv-modal-weight-badge');
    const maxWeightBox = document.getElementById('inv-modal-max-weight-box');
    const maxWeightInput = document.getElementById('inv-modal-max-weight-input');
    const gridEl = document.getElementById('inv-modal-grid');
    if (!gridEl) return;

    if (titleEl) {
      const modeSuffix = canEdit
        ? ''
        : canTransfer
        ? ' (TRANSFERÊNCIAS PERMITIDAS)'
        : ' (SOMENTE VISUALIZAÇÃO)';
      titleEl.textContent = `INVENTÁRIO — ${char.name.toUpperCase()}${modeSuffix}`;
    }
    if (metaEl) {
      metaEl.innerHTML = `<iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> ${char.gold || 0} ${escapeHtml(state.room?.currencyName || 'Golds')} • ${(char.inventory || []).length} tipo(s) de item na mochila`;
    }
    if (weightBadge) {
      weightBadge.innerHTML = `<iconify-icon icon="game-icons:weight"></iconify-icon> <span>${weight} / ${maxWeight} kg</span>`;
      weightBadge.className = isOverweight
        ? 'font-mono font-black text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
        : 'font-mono font-black text-xs px-2 py-0.5 rounded bg-amber-500/15 gold-title border border-amber-500/30';
    }
    if (maxWeightBox) {
      maxWeightBox.classList.toggle('hidden', !canEdit);
    }
    if (maxWeightInput && document.activeElement !== maxWeightInput) {
      maxWeightInput.value = String(maxWeight);
    }

    const itemsById = {};
    for (const it of state.itemsCatalog || []) itemsById[it.id] = it;

    const otherChars = state.characters.filter((c) => c.id !== char.id);
    const filterType = state.invModalFilter || 'ALL';
    const q = (state.invModalSearchQuery || '').trim().toLowerCase();

    const filteredInv = (char.inventory || []).filter((inv) => {
      const tpl = itemsById[inv.itemId];
      if (!tpl) return false;
      if (filterType === 'EQUIPPED' && !inv.isEquipped) return false;
      if (filterType !== 'ALL' && filterType !== 'EQUIPPED' && tpl.tipo !== filterType) return false;
      if (q) {
        const matchName = String(tpl.nome || '').toLowerCase().includes(q);
        const matchDesc = String(tpl.descricao || '').toLowerCase().includes(q);
        const matchType = String(tpl.tipo || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchType) return false;
      }
      return true;
    });

    if (filteredInv.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-3 p-10 text-center app-muted border border-dashed app-divider-border rounded-2xl">
          <div class="text-3xl mb-2 flex justify-center"><iconify-icon icon="game-icons:knapsack"></iconify-icon></div>
          <div class="font-bold text-sm app-title">Nenhum item encontrado</div>
          <p class="text-xs app-muted mt-1">
            ${
              (char.inventory || []).length === 0
                ? 'O inventário deste personagem está vazio. Compre itens na Loja ou receba do Mestre.'
                : 'Nenhum item corresponde ao filtro ou pesquisa atual.'
            }
          </p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filteredInv
      .map((inv) => {
        const tpl = itemsById[inv.itemId];
        if (!tpl) return '';
        const inEscrow = inv.status === 'IN_ESCROW';
        const qty = Math.max(1, Number(inv.quantity || 1));
        const totalItemWeight = Number((Number(tpl.peso || 0) * qty).toFixed(2));
        const effectsSummary =
          (tpl.effects || [])
            .map(
              (ef) =>
                `${formatEffectTargetLabel(ef.targetStat)}: ${ef.value >= 0 ? '+' : ''}${ef.value}${
                  ef.modifierType === 'PERCENT' ? '%' : ''
                }`
            )
            .join(' • ') || 'Sem efeitos se equipado';

        return `
          <div class="p-3.5 rounded-xl bg-black/30 border ${
            inv.isEquipped ? 'border-emerald-500/50' : 'app-divider-border'
          } flex flex-col justify-between gap-3">
            <div class="space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xl shrink-0 flex items-center">${ITEM_TYPE_ICONS[tpl.tipo] || '<iconify-icon icon="game-icons:knapsack"></iconify-icon>'}</span>
                  <div class="min-w-0">
                    <h5 class="font-bold text-sm app-title truncate" title="${escapeHtml(tpl.nome)}">
                      ${escapeHtml(tpl.nome)}
                    </h5>
                    <span class="text-[10px] font-mono app-muted">
                      ${escapeHtml(tpl.tipo)} • Qtd: <strong class="gold-title">x${qty}</strong>
                    </span>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  ${
                    inv.isEquipped
                      ? '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white">EQUIPADO</span>'
                      : ''
                  }
                  ${
                    inEscrow
                      ? '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-amber-600 text-white inline-flex items-center gap-1"><iconify-icon icon="game-icons:sands-of-time"></iconify-icon> <span>ESCROW</span></span>'
                      : ''
                  }
                </div>
              </div>

              ${
                tpl.descricao
                  ? `<p class="text-[11px] app-muted item-description">${escapeHtml(tpl.descricao)}</p>`
                  : ''
              }

              <div class="px-2 py-1 rounded bg-black/35 border app-divider-border text-[10px] font-mono gold-title truncate" title="${escapeHtml(effectsSummary)}">
                <iconify-icon icon="game-icons:sparkles"></iconify-icon> ${escapeHtml(effectsSummary)}
              </div>

              <div class="flex items-center justify-between text-[11px] font-mono app-muted pt-0.5">
                <span class="flex items-center gap-1"><iconify-icon icon="game-icons:weight"></iconify-icon> <span>${tpl.peso}kg un. (${totalItemWeight}kg)</span></span>
                <span class="flex items-center gap-1"><iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> <span>${tpl.preco} ${escapeHtml(state.room?.currencyName || 'Golds')}</span></span>
              </div>
            </div>

            ${
              canEdit || (canTransfer && otherChars.length > 0)
                ? `<div class="flex flex-wrap items-center gap-1.5 pt-2 border-t app-divider-border">
                    ${
                      canEdit && !inEscrow && tpl.equipavel
                        ? `<button type="button" data-inv-toggle-equip="${escapeHtml(inv.id)}" class="flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] ${
                            inv.isEquipped ? 'app-secondary-btn' : 'btn-gold'
                          }">${inv.isEquipped ? 'Desequipar' : 'Equipar'}</button>`
                        : ''
                    }
                    ${
                      canEdit && !inEscrow && tpl.tipo === 'CONSUMIVEL'
                        ? `<button type="button" data-inv-use-consumable="${escapeHtml(inv.id)}" class="flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1"><iconify-icon icon="game-icons:health-potion"></iconify-icon> <span>Usar</span></button>`
                        : ''
                    }
                    ${
                      canTransfer && !inEscrow && otherChars.length > 0
                        ? `<button type="button" data-inv-transfer="${escapeHtml(inv.id)}" class="py-1.5 px-2.5 rounded-lg font-bold text-[11px] btn-gold-outline flex items-center gap-1 hover:brightness-110 transition" title="Transferir este item para outro personagem da mesa"><iconify-icon icon="game-icons:trade"></iconify-icon> <span>Transferir</span></button>`
                        : ''
                    }
                    ${
                      canEdit && !inEscrow && (isEffectiveMaster() || hasPermission('shop_buy_sell') || hasPermission('canSellToShop'))
                        ? `<button type="button" data-inv-sell-escrow="${escapeHtml(inv.id)}" class="py-1.5 px-2.5 rounded-lg font-bold text-[11px] btn-gold-outline flex items-center gap-1" title="Solicitar venda para aprovação do Mestre"><iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> <span>Vender</span></button>`
                        : ''
                    }
                    ${
                      canEdit && !inEscrow
                        ? `<button type="button" data-inv-remove="${escapeHtml(inv.id)}" class="py-1.5 px-2 rounded-lg font-bold text-[11px] text-rose-400 app-secondary-btn flex items-center justify-center" title="Descartar item"><iconify-icon icon="game-icons:crowned-skull"></iconify-icon></button>`
                        : ''
                    }
                    ${
                      !canEdit && canTransfer
                        ? `<span class="ml-auto text-[10px] font-mono app-muted italic flex items-center gap-1"><iconify-icon icon="game-icons:eyeball"></iconify-icon> <span>Apenas Transferência</span></span>`
                        : ''
                    }
                  </div>`
                : `<div class="pt-2 border-t app-divider-border text-center">
                    <span class="text-[10px] font-mono app-muted italic flex items-center justify-center gap-1"><iconify-icon icon="game-icons:eyeball"></iconify-icon> <span>Somente visualização</span></span>
                  </div>`
            }
          </div>
        `;
      })
      .join('');
  }

  // ---------------------------------------------------------------------------
  // Modal 16: Escolher Destinatário de Item (Conceder do Catálogo ou Enviar P2P)
  // ---------------------------------------------------------------------------
  function openItemRecipientModal({ mode, itemId, senderCharId = '', invId = '' }) {
    const modeInput = document.getElementById('recipient-modal-mode');
    const itemInput = document.getElementById('recipient-modal-item-id');
    const senderInput =
      document.getElementById('recipient-modal-sender-char-id') ||
      document.getElementById('recipient-modal-sender-id');
    const invInput = document.getElementById('recipient-modal-inv-id');
    const selectEl = document.getElementById('recipient-char-select');
    const qtyInput = document.getElementById('recipient-item-qty');
    const qtyHint = document.getElementById('recipient-qty-hint');
    const titleEl = document.getElementById('recipient-modal-title');
    const subtitleEl = document.getElementById('recipient-modal-subtitle');
    const iconEl = document.getElementById('recipient-modal-icon');

    if (!selectEl || !qtyInput) return;

    if (modeInput) modeInput.value = mode;
    if (itemInput) itemInput.value = itemId || '';
    if (senderInput) senderInput.value = senderCharId || '';
    if (invInput) invInput.value = invId || '';

    if (mode === 'GRANT') {
      const item = state.itemsCatalog.find((i) => i.id === itemId);
      if (!item) return;
      if (state.characters.length === 0) {
        showToast('Crie pelo menos um personagem antes de conceder itens.');
        return;
      }
      if (iconEl) iconEl.innerHTML = '<iconify-icon icon="game-icons:chest" class="icon-gold"></iconify-icon>';
      if (titleEl) titleEl.textContent = 'CONCEDER ITEM A PERSONAGEM';
      if (subtitleEl) subtitleEl.textContent = `Item: ${item.nome} (${item.peso}kg)`;
      qtyInput.max = '999';
      qtyInput.value = '1';
      if (qtyHint) qtyHint.textContent = 'Defina quantas unidades serão concedidas.';

      selectEl.innerHTML = state.characters
        .map((c) => {
          const w = c.derived?.totalWeight ?? 0;
          const mw = c.maxWeight ?? 27;
          return `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} (Nv. ${c.level || 1} • Carga: ${w}/${mw}kg)</option>`;
        })
        .join('');
    } else {
      const sender = state.characters.find((c) => c.id === senderCharId);
      const inv = sender?.inventory?.find((i) => i.id === invId);
      const tpl = state.itemsCatalog.find((i) => i.id === inv?.itemId);
      const others = state.characters.filter((c) => c.id !== senderCharId);
      if (!sender || !inv || !tpl || others.length === 0) {
        showToast('Não há outros personagens disponíveis para receber este item.');
        return;
      }
      const maxQty = Math.max(1, Number(inv.quantity || 1));
      if (iconEl) iconEl.innerHTML = '<iconify-icon icon="game-icons:trade" class="icon-gold"></iconify-icon>';
      if (titleEl) titleEl.textContent = 'TRANSFERIR ITEM ENTRE INVENTÁRIOS';
      if (subtitleEl) subtitleEl.textContent = `Origem: ${sender.name} • Item: ${tpl.nome} (Disponível: x${maxQty})`;
      qtyInput.max = String(maxQty);
      qtyInput.value = '1';
      if (qtyHint) qtyHint.textContent = `Máximo disponível no inventário de ${sender.name}: ${maxQty} unid.`;

      selectEl.innerHTML = others
        .map((c) => {
          const w = c.derived?.totalWeight ?? 0;
          const mw = c.maxWeight ?? 27;
          return `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} (Nv. ${c.level || 1} • Carga: ${w}/${mw}kg)</option>`;
        })
        .join('');
    }

    openModal('modal-item-recipient');
  }

  function handleItemRecipientSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('recipient-modal-mode')?.value || 'GRANT';
    const itemId = document.getElementById('recipient-modal-item-id')?.value || '';
    const senderCharId =
      (
        document.getElementById('recipient-modal-sender-char-id') ||
        document.getElementById('recipient-modal-sender-id')
      )?.value || '';
    const invId = document.getElementById('recipient-modal-inv-id')?.value || '';
    const targetCharId = document.getElementById('recipient-char-select')?.value;
    const rawQty = Math.max(1, Math.round(Number(document.getElementById('recipient-item-qty')?.value || 1)));

    if (!targetCharId) return;

    if (mode === 'GRANT') {
      const item = state.itemsCatalog.find((i) => i.id === itemId);
      const targetChar = state.characters.find((c) => c.id === targetCharId);
      if (!item || !targetChar) return;

      commitMutation(
        (st, toasts) => {
          const target = st.characters.find((c) => c.id === targetCharId);
          if (!target) return false;
          addItemsToCharacterInventory(target, item, rawQty);
          toasts.push(`${rawQty}x ${item.nome} concedido(s) para ${target.name}!`);
          return true;
        },
        {
          actionType: 'ITEM_GRANTED',
          targetEntity: `${rawQty}x ${item.nome} → ${targetChar.name}`,
          summary: `Mestre concedeu ${rawQty}x ${item.nome} para ${targetChar.name}.`,
        }
      );
      closeModal('modal-item-recipient');
      return;
    }

    // Modo Transferência entre Inventários (P2P)
    const senderPreview = state.characters.find((c) => c.id === senderCharId);
    const receiverPreview = state.characters.find((c) => c.id === targetCharId);
    if (!senderPreview || !receiverPreview) return;

    if (!canTransferFromInventory(senderPreview)) {
      showToast('Você não possui permissão para transferir itens deste inventário.', 'warning');
      closeModal('modal-item-recipient');
      return;
    }

    commitMutation(
      (st, toasts) => {
        const sChar = st.characters.find((x) => x.id === senderCharId);
        const rChar = st.characters.find((x) => x.id === targetCharId);
        const idx = sChar?.inventory?.findIndex((i) => i.id === invId);
        if (!sChar || !rChar || idx === undefined || idx === -1) return false;

        const inv = sChar.inventory[idx];
        const tpl = st.itemsCatalog.find((it) => it.id === inv.itemId);
        if (!tpl) return false;
        const availableQty = Math.max(1, Number(inv.quantity || 1));
        const sendQty = Math.min(availableQty, rawQty);

        inv.isEquipped = false;
        addItemsToCharacterInventory(rChar, tpl, sendQty);

        if (availableQty > sendQty) {
          inv.quantity = availableQty - sendQty;
        } else {
          sChar.inventory.splice(idx, 1);
        }

        toasts.push(`${sendQty}x ${tpl?.nome || 'Item'} transferido(s) de ${sChar.name} para ${rChar.name}!`);
        return true;
      },
      {
        actionType: 'ITEM_TRANSFER',
        targetEntity: `${senderPreview.name} → ${receiverPreview.name}`,
        summary: `Item transferido entre inventários (${rawQty} unid.).`,
      }
    );
    closeModal('modal-item-recipient');
  }

  // ---------------------------------------------------------------------------
  // Modal 17: Solicitar Venda de Item com Preço Personalizado (Escrow)
  // ---------------------------------------------------------------------------
  function openSellEscrowModal(charId, invId) {
    const char = state.characters.find((c) => c.id === charId);
    const inv = char?.inventory?.find((i) => i.id === invId);
    const tpl = state.itemsCatalog.find((it) => it.id === inv?.itemId);
    if (!char || !inv || !tpl) return;

    const charIdInput = document.getElementById('sell-escrow-char-id');
    const invIdInput = document.getElementById('sell-escrow-inv-id');
    const subtitleEl = document.getElementById('sell-escrow-subtitle');
    const priceInput = document.getElementById('sell-escrow-price-input');
    const priceHint = document.getElementById('sell-escrow-price-hint');

    if (charIdInput) charIdInput.value = char.id;
    if (invIdInput) invIdInput.value = inv.id;
    if (subtitleEl) subtitleEl.textContent = `Item: ${tpl.nome} • Personagem: ${char.name}`;
    if (priceInput) priceInput.value = String(tpl.preco ?? 0);
    if (priceHint) {
      priceHint.textContent = `Valor padrão do item no catálogo: ${tpl.preco ?? 0} ${
        state.room?.currencyName || 'Ouro'
      }. Você pode definir qualquer preço para esta solicitação.`;
    }

    openModal('modal-sell-escrow');
    setTimeout(() => {
      priceInput?.focus();
      priceInput?.select?.();
    }, 50);
  }

  function handleSellEscrowSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('sell-escrow-char-id')?.value;
    const invId = document.getElementById('sell-escrow-inv-id')?.value;
    const priceRaw = Number(document.getElementById('sell-escrow-price-input')?.value ?? 0);
    const customSalePrice = Number.isFinite(priceRaw) && priceRaw >= 0 ? Math.round(priceRaw) : 0;

    if (!charId || !invId) return;

    commitMutation(
      (st, toasts) => {
        const c = st.characters.find((x) => x.id === charId);
        const inv = c?.inventory?.find((i) => i.id === invId);
        if (!c || !inv) return false;
        const tpl = st.itemsCatalog.find((it) => it.id === inv.itemId);
        if (!tpl) return false;

        inv.isEquipped = false;
        inv.status = 'IN_ESCROW';
        st.escrowSales = st.escrowSales || [];
        st.escrowSales.push({
          id: `escrow_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          charId: c.id,
          charName: c.name,
          invItemId: inv.id,
          itemId: tpl.id,
          itemName: tpl.nome,
          salePrice: customSalePrice,
        });
        toasts.push(
          `Solicitação de venda de ${tpl.nome} por ${customSalePrice} ${
            st.room?.currencyName || 'Ouro'
          } enviada para aprovação do Mestre!`
        );
        return true;
      },
      {
        actionType: 'SALE_ESCROW_REQUEST',
        targetEntity: `Personagem: ${charId}`,
        summary: `Item colocado em IN_ESCROW por ${customSalePrice} aguardando aprovação de venda.`,
      }
    );

    closeModal('modal-sell-escrow');
  }

  // ===========================================================================
  // Drag & Drop de Cards pelo Nome do Personagem
  // ===========================================================================
  const dragState = {
    active: false,
    sourceCharId: null,
    sourceCardEl: null,
    ghostEl: null,
    currentTargetCardEl: null,
    offsetX: 0,
    offsetY: 0,
  };

  function getPointCoords(evt) {
    if (evt.touches && evt.touches.length > 0) return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
    if (evt.changedTouches && evt.changedTouches.length > 0)
      return { x: evt.changedTouches[0].clientX, y: evt.changedTouches[0].clientY };
    return { x: evt.clientX, y: evt.clientY };
  }

  function startCardDrag(evt, handleEl) {
    if (evt.type === 'mousedown' && evt.button !== 0) return;
    if (!isEffectiveMaster() && !hasPermission('char_reorder')) return;
    const charId = handleEl.getAttribute('data-drag-char-id');
    const cardEl = handleEl.closest('.char-card');
    if (!charId || !cardEl) return;

    evt.preventDefault();
    const { x, y } = getPointCoords(evt);
    const rect = cardEl.getBoundingClientRect();

    dragState.active = true;
    dragState.sourceCharId = charId;
    dragState.sourceCardEl = cardEl;
    dragState.offsetX = x - rect.left;
    dragState.offsetY = y - rect.top;

    const ghost = cardEl.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${x - dragState.offsetX}px`;
    ghost.style.top = `${y - dragState.offsetY}px`;
    document.body.appendChild(ghost);

    dragState.ghostEl = ghost;
    cardEl.classList.add('dragging-source');
  }

  function moveCardDrag(evt) {
    if (!dragState.active || !dragState.ghostEl) return;
    if (evt.cancelable) evt.preventDefault();
    const { x, y } = getPointCoords(evt);
    dragState.ghostEl.style.left = `${x - dragState.offsetX}px`;
    dragState.ghostEl.style.top = `${y - dragState.offsetY}px`;

    const elUnder = document.elementFromPoint(x, y);
    const hoveredCard = elUnder ? elUnder.closest('.char-card') : null;

    if (dragState.currentTargetCardEl && dragState.currentTargetCardEl !== hoveredCard) {
      dragState.currentTargetCardEl.classList.remove('drop-target-active');
      dragState.currentTargetCardEl = null;
    }
    if (hoveredCard && hoveredCard !== dragState.sourceCardEl) {
      hoveredCard.classList.add('drop-target-active');
      dragState.currentTargetCardEl = hoveredCard;
    }
  }

  function endCardDrag() {
    if (!dragState.active) return;
    const sourceId = dragState.sourceCharId;
    const targetCard = dragState.currentTargetCardEl;
    const targetId = targetCard ? targetCard.getAttribute('data-char-id') : null;

    dragState.sourceCardEl?.classList.remove('dragging-source');
    targetCard?.classList.remove('drop-target-active');
    dragState.ghostEl?.remove();

    dragState.active = false;
    dragState.sourceCharId = null;
    dragState.sourceCardEl = null;
    dragState.ghostEl = null;
    dragState.currentTargetCardEl = null;

    if (sourceId && targetId && sourceId !== targetId) {
      commitMutation((st) => {
        const idxA = st.characters.findIndex((c) => c.id === sourceId);
        const idxB = st.characters.findIndex((c) => c.id === targetId);
        if (idxA === -1 || idxB === -1) return false;
        const tmp = st.characters[idxA];
        st.characters[idxA] = st.characters[idxB];
        st.characters[idxB] = tmp;
        return true;
      });
    }
  }

  // ===========================================================================
  // Gerenciamento do Bestiário, Invocação e Habilidades Gerais
  // ===========================================================================
  function openEnemyForm(enemyId = null) {
    const isEdit = Boolean(enemyId);
    const enemy = isEdit ? (state.bestiary || []).find((b) => b.id === enemyId) : null;

    document.getElementById('enemy-form-id').value = enemyId || '';
    document.getElementById('enemy-form-title').textContent = isEdit
      ? 'EDITAR INIMIGO (BESTIÁRIO)'
      : 'CRIAR INIMIGO (BESTIÁRIO)';

    document.getElementById('enemy-name-input').value = enemy ? enemy.name : '';
    document.getElementById('enemy-level-input').value = enemy ? (enemy.level || 1) : 1;
    document.getElementById('enemy-revealed-input').checked = enemy ? Boolean(enemy.reveladoParaJogadores) : false;

    document.getElementById('enemy-max-hp').value = enemy ? enemy.maxHp : 100;
    document.getElementById('enemy-max-armor').value = enemy ? enemy.maxArmor : 10;
    document.getElementById('enemy-max-mana').value = enemy ? enemy.maxMana : 50;
    document.getElementById('enemy-regen').value = enemy ? enemy.regen : 10;
    document.getElementById('enemy-defense').value = enemy ? enemy.defense : 0;
    document.getElementById('enemy-attack').value = enemy ? (enemy.attack || 0) : 0;
    document.getElementById('enemy-arcana').value = enemy ? (enemy.arcana || 0) : 0;
    document.getElementById('enemy-santidade').value = enemy ? (enemy.santidade || 0) : 0;

    const attrs = enemy ? (enemy.attributes || {}) : { FORCA: 10, DESTREZA: 10, INTELIGENCIA: 10, SABEDORIA: 10, LABIA: 10 };
    document.getElementById('enemy-attr-forca').value = attrs.FORCA ?? 10;
    document.getElementById('enemy-attr-destreza').value = attrs.DESTREZA ?? 10;
    document.getElementById('enemy-attr-inteligencia').value = attrs.INTELIGENCIA ?? 10;
    document.getElementById('enemy-attr-sabedoria').value = attrs.SABEDORIA ?? 10;
    document.getElementById('enemy-attr-labia').value = attrs.LABIA ?? 10;

    const resGrid = document.getElementById('enemy-resistances-grid');
    if (resGrid) {
      resGrid.innerHTML = RESISTANCE_TYPES.map((r) => {
        const curMax = enemy?.resistances?.[r.name]?.max ?? 100;
        return `
          <div>
            <label class="block font-bold mb-1 truncate text-[11px]" title="${escapeHtml(r.label)}">
              ${r.icon} <span>${escapeHtml(r.name)}</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              data-enemy-res="${escapeHtml(r.name)}"
              value="${curMax}"
              class="w-full px-2 py-1.5 font-mono font-bold app-input text-xs"
            />
          </div>
        `;
      }).join('');
    }

    document.getElementById('enemy-general-skills').value = enemy ? (enemy.generalSkills || '') : '';
    openModal('modal-enemy-form');
  }

  function toggleEnemyReveal(enemyId) {
    commitMutation(
      (st, toasts) => {
        const e = (st.bestiary || []).find((b) => b.id === enemyId);
        if (!e) return false;
        e.reveladoParaJogadores = !e.reveladoParaJogadores;
        // Sincroniza visibilidade nas instâncias ativas na mesa de fichas
        (st.characters || []).forEach((c) => {
          if (c.bestiaryId === enemyId) {
            c.reveladoParaJogadores = e.reveladoParaJogadores;
          }
        });
        toasts.push(
          e.reveladoParaJogadores
            ? `Inimigo "${e.name}" foi liberado para visualização dos jogadores!`
            : `Inimigo "${e.name}" foi ocultado dos jogadores.`
        );
        return true;
      },
      {
        actionType: 'BESTIARY_VISIBILITY',
        targetEntity: 'Bestiário',
        summary: 'Visibilidade de criatura alternada.',
      }
    );
    renderBestiaryTab();
    renderCharactersTab();
  }

  function deleteEnemy(enemyId) {
    const enemy = (state.bestiary || []).find((b) => b.id === enemyId);
    if (!enemy) return;

    openConfirmModal({
      icon: '<iconify-icon icon="game-icons:crowned-skull"></iconify-icon>',
      title: `EXCLUIR ${enemy.name.toUpperCase()}?`,
      message: `Tem certeza que deseja apagar "${enemy.name}" permanentemente do Bestiário?`,
      confirmText: '<iconify-icon icon="game-icons:crowned-skull"></iconify-icon> <span>Excluir Inimigo</span>',
      onConfirm: () => {
        commitMutation(
          (st, toasts) => {
            const idx = (st.bestiary || []).findIndex((b) => b.id === enemyId);
            if (idx === -1) return false;
            const removed = st.bestiary.splice(idx, 1)[0];
            toasts.push(`Inimigo "${removed.name}" foi excluído do Bestiário.`);
            return true;
          },
          {
            actionType: 'BESTIARY_DELETE',
            targetEntity: enemy.name,
            summary: `Inimigo ${enemy.name} excluído do Bestiário.`,
          }
        );
        renderBestiaryTab();
      },
    });
  }

  function renderSpawnEnemyList() {
    const container = document.getElementById('spawn-enemy-list');
    if (!container) return;

    const q = (document.getElementById('spawn-enemy-search')?.value || '').trim().toLowerCase();
    const enemies = (state.bestiary || []).filter((e) => (e.name || '').toLowerCase().includes(q));

    if (enemies.length === 0) {
      container.innerHTML = `
        <div class="text-center p-8 fantasy-card border-dashed app-muted text-xs space-y-2">
          <iconify-icon icon="game-icons:monster-grasp" class="text-3xl opacity-40"></iconify-icon>
          <p>Nenhum inimigo encontrado no Bestiário.</p>
          <button type="button" id="btn-goto-bestiary-create" class="btn-gold px-3 py-1.5 text-xs font-serif-fantasy uppercase">Ir ao Bestiário / Criar</button>
        </div>
      `;
      document.getElementById('btn-goto-bestiary-create')?.addEventListener('click', () => {
        closeModal('modal-spawn-enemy');
        switchTab('bestiary');
        openEnemyForm();
      });
      return;
    }

    container.innerHTML = enemies
      .map(
        (e) => `
        <div class="p-3 rounded-xl bg-black/40 border app-divider-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 text-lg shrink-0">
              <iconify-icon icon="game-icons:monster-grasp"></iconify-icon>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-serif-fantasy font-black gold-title text-sm">${escapeHtml(e.name)}</span>
                <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/15 gold-title border border-amber-500/30">NV. ${e.level || 1}</span>
                ${
                  e.reveladoParaJogadores
                    ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Liberado</span>'
                    : '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-black/50 text-neutral-400 border border-neutral-700">Oculto</span>'
                }
              </div>
              <div class="text-[11px] font-mono app-muted mt-0.5">
                ${e.maxHp} HP • ${e.maxArmor} ARM • ${e.maxMana} MP • DEF ${e.defense || 0} • REGEN ${e.regen || 10}%
              </div>
            </div>
          </div>
          <button
            type="button"
            data-spawn-from-modal="${escapeHtml(e.id)}"
            class="btn-gold px-3 py-1.5 text-xs font-serif-fantasy font-extrabold uppercase flex items-center gap-1.5"
          >
            <iconify-icon icon="game-icons:portal"></iconify-icon>
            <span>Trazer p/ Mesa</span>
          </button>
        </div>
      `
      )
      .join('');
  }

  function openSpawnEnemyModal() {
    const searchInput = document.getElementById('spawn-enemy-search');
    if (searchInput) searchInput.value = '';
    renderSpawnEnemyList();
    openModal('modal-spawn-enemy');
  }

  function spawnEnemyInstance(bestiaryEnemy) {
    const baseName = (bestiaryEnemy.name || 'Inimigo').trim();
    const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`^${escapedBase}(?: \\((\\d+)\\))?$`, 'i');

    commitMutation(
      (st, toasts) => {
        const existingMatches = (st.characters || []).filter(
          (c) => c.bestiaryId === bestiaryEnemy.id || nameRegex.test(c.name)
        );

        let newName = '';
        if (existingMatches.length === 0) {
          newName = `${baseName} (1)`;
        } else {
          if (
            existingMatches.length === 1 &&
            existingMatches[0].name.trim().toLowerCase() === baseName.toLowerCase()
          ) {
            existingMatches[0].name = `${baseName} (1)`;
          }
          let maxNum = 0;
          for (const em of existingMatches) {
            const m = em.name.match(nameRegex);
            if (m) {
              const num = m[1] ? parseInt(m[1], 10) : 1;
              if (num > maxNum) maxNum = num;
            }
          }
          newName = `${baseName} (${maxNum + 1})`;
        }

        const newInst = {
          id: `char_enemy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: newName,
          isEnemy: true,
          bestiaryId: bestiaryEnemy.id,
          reveladoParaJogadores: Boolean(bestiaryEnemy.reveladoParaJogadores),
          level: Number(bestiaryEnemy.level || 1),
          avatar: 'monster-grasp',
          ownerMemberId: 'host_master',
          ownerIp: state.localClientIp || '',
          age: '',
          height: '',
          history: '',
          maxWeight: 999,
          baseMaxHp: Number(bestiaryEnemy.maxHp || 100),
          maxHp: Number(bestiaryEnemy.maxHp || 100),
          hp: Number(bestiaryEnemy.maxHp || 100),
          baseMaxArmor: Number(bestiaryEnemy.maxArmor || 0),
          maxArmor: Number(bestiaryEnemy.maxArmor || 0),
          armor: Number(bestiaryEnemy.maxArmor || 0),
          baseMaxMana: Number(bestiaryEnemy.maxMana || 50),
          maxMana: Number(bestiaryEnemy.maxMana || 50),
          mana: Number(bestiaryEnemy.maxMana || 50),
          baseMaxPa: 3,
          maxPa: 3,
          pa: 3,
          baseRegen: Number(bestiaryEnemy.regen || 10),
          regen: Number(bestiaryEnemy.regen || 10),
          baseDefense: Number(bestiaryEnemy.defense || 0),
          defense: Number(bestiaryEnemy.defense || 0),
          attack: Number(bestiaryEnemy.attack || 0),
          arcana: Number(bestiaryEnemy.arcana || 0),
          santidade: Number(bestiaryEnemy.santidade || 0),
          generalSkills: String(bestiaryEnemy.generalSkills || ''),
          attributes: JSON.parse(JSON.stringify(bestiaryEnemy.attributes || { FORCA: 10, DESTREZA: 10, INTELIGENCIA: 10, SABEDORIA: 10, LABIA: 10 })),
          elementalResistances: JSON.parse(JSON.stringify(bestiaryEnemy.elementalResistances || {})),
          resistances: JSON.parse(JSON.stringify(bestiaryEnemy.resistances || {
            congelamento: { current: 0, max: 100 },
            choque: { current: 0, max: 100 },
            sangramento: { current: 0, max: 100 },
            chamas: { current: 0, max: 100 },
            veneno: { current: 0, max: 100 },
            atordoamento: { current: 0, max: 100 },
            cegueira: { current: 0, max: 100 },
          })),
          inventory: [],
          isDead: false,
          armorDegradation: 0,
        };

        st.characters.push(newInst);
        toasts.push(`Inimigo "${newName}" trazido para a mesa de combate!`);
        return true;
      },
      {
        actionType: 'ENEMY_SPAWNED',
        targetEntity: baseName,
        summary: `Inimigo ${baseName} instanciado na mesa de combate.`,
      }
    );

    closeModal('modal-spawn-enemy');
    switchTab('characters');
    renderCharactersTab();
  }

  function dismissEnemyInstance(charId) {
    const c = state.characters.find((x) => x.id === charId);
    if (!c || !c.isEnemy) return;

    openConfirmModal({
      icon: '<iconify-icon icon="game-icons:portal"></iconify-icon>',
      title: `DESPACHAR ${c.name.toUpperCase()}?`,
      message: `Tem certeza que deseja remover "${c.name}" da mesa de combate? A ficha será retirada da mesa sem excluir o modelo original salvo no Bestiário.`,
      confirmText: '<iconify-icon icon="game-icons:portal"></iconify-icon> <span>Despachar da Mesa</span>',
      onConfirm: () => {
        commitMutation(
          (st, toasts) => {
            const idx = (st.characters || []).findIndex((x) => x.id === charId);
            if (idx === -1) return false;
            const removed = st.characters.splice(idx, 1)[0];
            if (st.battle && Array.isArray(st.battle.orderIds)) {
              st.battle.orderIds = st.battle.orderIds.filter((id) => id !== charId);
              if (st.battle.orderIds.length === 0) {
                st.battle.isActive = false;
                st.battle.roundNumber = 1;
                st.battle.currentTurnIndex = 0;
              } else if (st.battle.currentTurnIndex >= st.battle.orderIds.length) {
                st.battle.currentTurnIndex = Math.max(0, st.battle.orderIds.length - 1);
              }
            }
            toasts.push(`Inimigo "${removed.name}" foi removido da mesa.`);
            return true;
          },
          {
            actionType: 'ENEMY_DISMISSED',
            targetEntity: c.name,
            summary: `Inimigo ${c.name} removido da mesa de combate.`,
          }
        );
        renderCharactersTab();
      },
    });
  }

  function openGeneralSkillsModal(targetId, targetType = 'bestiary') {
    const target =
      targetType === 'bestiary'
        ? (state.bestiary || []).find((b) => b.id === targetId)
        : state.characters.find((c) => c.id === targetId);

    if (!target) return;

    const isMaster = isEffectiveMaster();
    const isEnemy = targetType === 'bestiary' || Boolean(target.isEnemy);
    const bestiaryRef =
      targetType === 'bestiary'
        ? target
        : (state.bestiary || []).find((b) => b.id === target.bestiaryId);
    const isRevealed = bestiaryRef
      ? Boolean(bestiaryRef.reveladoParaJogadores)
      : Boolean(target.reveladoParaJogadores);

    if (!isMaster && !isRevealed) {
      showToast('As habilidades desta criatura estão ocultas pelo Mestre.', 'warning');
      return;
    }

    document.getElementById('general-skills-target-id').value = targetId;
    document.getElementById('general-skills-target-type').value = targetType;
    document.getElementById('general-skills-modal-title').textContent = `${target.name.toUpperCase()} • HABILIDADES GERAIS`;
    document.getElementById('general-skills-modal-subtitle').textContent = `Nível ${target.level || 1} • ${
      targetType === 'bestiary' ? 'Bestiário Modelo' : 'Instância de Combate'
    }`;

    const skillsText = target.generalSkills || 'Nenhuma habilidade cadastrada para esta criatura.';
    const readView = document.getElementById('general-skills-readonly-view');
    const editView = document.getElementById('general-skills-edit-view');
    const saveBtn = document.getElementById('btn-save-general-skills');
    const textarea = document.getElementById('general-skills-textarea');

    if (isMaster) {
      if (editView) editView.classList.remove('hidden');
      if (readView) readView.classList.add('hidden');
      if (saveBtn) saveBtn.classList.remove('hidden');
      if (textarea) textarea.value = target.generalSkills || '';
    } else {
      if (editView) editView.classList.add('hidden');
      if (readView) {
        readView.classList.remove('hidden');
        readView.textContent = skillsText;
      }
      if (saveBtn) saveBtn.classList.add('hidden');
    }

    openModal('modal-general-skills');
  }

  // ---------------------------------------------------------------------------
  // Modal de Permissões: Categorias & Toggle Switches Deslizantes
  // ---------------------------------------------------------------------------
  function updateDeleteCustomPresetButtonUI() {
    const select = document.getElementById('member-preset-select');
    const deleteBtn = document.getElementById('btn-delete-custom-preset');
    if (!select || !deleteBtn) return;
    const val = select.value;
    const isCustom = (state.customPermissionPresets || []).some((cp) => cp && cp.id === val);
    if (isCustom && isEffectiveMaster()) {
      deleteBtn.classList.remove('hidden');
    } else {
      deleteBtn.classList.add('hidden');
    }
  }

  function renderMemberPresetDropdown(selectedVal) {
    const select = document.getElementById('member-preset-select');
    if (!select) return;

    const customPresets = state.customPermissionPresets || [];
    let html = `
      <optgroup label="Perfis Padrão">
        <option value="JOGADOR_COMUM">Jogador Comum (Padrão)</option>
        <option value="SUB_MESTRE">Sub-Mestre / Ajudante</option>
        <option value="ESPECTADOR">Espectador</option>
      </optgroup>
      <optgroup label="Outro">
        ${customPresets.map((cp) => `
          <option value="${escapeHtml(cp.id)}">${escapeHtml(cp.name)}</option>
        `).join('')}
        <option value="PERSONALIZADO">Personalizado</option>
      </optgroup>
    `;

    select.innerHTML = html;
    if (selectedVal) {
      select.value = selectedVal;
    }
    updateDeleteCustomPresetButtonUI();
  }

  function renderMemberPermCategoryButtons() {
    const container = document.getElementById('member-perm-category-buttons');
    const totalBadge = document.getElementById('member-perms-total-badge');
    const presetSelect = document.getElementById('member-preset-select');
    if (!container) return;

    const perms = state.editingMemberPermissions || {};
    let totalActiveCount = 0;
    let totalPermsCount = 0;

    container.innerHTML = PERMISSION_CATEGORIES.map((cat) => {
      const catTotal = cat.permissions.length;
      totalPermsCount += catTotal;
      const catActive = cat.permissions.filter((p) => Boolean(perms[p.key])).length;
      totalActiveCount += catActive;
      const isFull = catActive === catTotal;
      const isNone = catActive === 0;

      return `
        <button
          type="button"
          data-open-perm-cat="${escapeHtml(cat.id)}"
          class="perm-cat-btn p-3 rounded-xl border flex flex-col justify-between gap-2.5 text-left transition ${
            catActive > 0
              ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-400'
              : 'border-app-divider-border bg-black/30 hover:border-amber-500/30'
          }"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-amber-500/30 bg-amber-500/15 text-amber-300 text-sm">
                <iconify-icon icon="${escapeHtml(cat.icon)}"></iconify-icon>
              </span>
              <div class="font-serif-fantasy font-black text-xs uppercase tracking-wider gold-title truncate">
                ${escapeHtml(cat.title)}
              </div>
            </div>
            <span class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
              isFull
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : isNone
                ? 'bg-neutral-800/80 text-neutral-400 border border-neutral-700'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            } shrink-0">
              ${catActive}/${catTotal}
            </span>
          </div>
          <div class="text-[10px] app-muted line-clamp-1 leading-snug">
            ${escapeHtml(cat.description)}
          </div>
        </button>
      `;
    }).join('');

    if (totalBadge) {
      totalBadge.textContent = `${totalActiveCount} de ${totalPermsCount} ativas`;
    }

    if (presetSelect) {
      presetSelect.value = detectMatchingPreset(perms);
      updateDeleteCustomPresetButtonUI();
    }
  }

  function openPermissionCategoryModal(catId) {
    state.activePermCategoryId = catId || 'characters';
    renderPermissionCategoryModalContent();
    openModal('modal-perm-category');
  }

  function renderPermissionCategoryModalContent() {
    const cat = PERMISSION_CATEGORIES.find((c) => c.id === state.activePermCategoryId) || PERMISSION_CATEGORIES[0];
    if (!cat) return;

    const iconEl = document.getElementById('perm-cat-modal-icon');
    const titleEl = document.getElementById('perm-cat-modal-title');
    const subtitleEl = document.getElementById('perm-cat-modal-subtitle');
    const countBadge = document.getElementById('perm-cat-modal-count-badge');
    const listEl = document.getElementById('perm-cat-switches-list');

    if (iconEl) iconEl.innerHTML = `<iconify-icon icon="${escapeHtml(cat.icon)}"></iconify-icon>`;
    if (titleEl) titleEl.textContent = cat.title;
    if (subtitleEl) subtitleEl.textContent = cat.description;

    const perms = state.editingMemberPermissions || {};
    const catTotal = cat.permissions.length;
    const catActive = cat.permissions.filter((p) => Boolean(perms[p.key])).length;

    if (countBadge) {
      countBadge.textContent = `${catActive} de ${catTotal} ativas`;
      countBadge.className = `text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
        catActive === catTotal
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          : catActive === 0
          ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
      }`;
    }

    if (listEl) {
      listEl.innerHTML = cat.permissions.map((p) => {
        const isChecked = Boolean(perms[p.key]);
        return `
          <div class="perm-row-card p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
            isChecked ? 'border-emerald-500/40 bg-emerald-950/15' : 'border-app-divider-border bg-black/25'
          }">
            <div class="min-w-0 flex-1">
              <div class="font-serif-fantasy font-black text-xs uppercase tracking-wide ${isChecked ? 'text-emerald-300' : 'app-title'}">
                ${escapeHtml(p.name)}
              </div>
              <p class="text-[11px] app-muted mt-0.5 leading-relaxed">
                ${escapeHtml(p.description)}
              </p>
            </div>
            <div class="shrink-0 flex items-center">
              <label class="fantasy-toggle" title="${isChecked ? 'Desativar permissão' : 'Ativar permissão'}">
                <input type="checkbox" data-perm-switch="${escapeHtml(p.key)}" ${isChecked ? 'checked' : ''} />
                <span class="fantasy-toggle-slider"></span>
              </label>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function handleTogglePermSwitch(permKey, checked) {
    if (!state.editingMemberPermissions) {
      state.editingMemberPermissions = getDefaultPermissionsForPreset('JOGADOR_COMUM');
    }
    state.editingMemberPermissions[permKey] = Boolean(checked);
    syncLegacyPermAliases(state.editingMemberPermissions);
    state.editingMemberPermissions.preset = detectMatchingPreset(state.editingMemberPermissions);
    renderPermissionCategoryModalContent();
    renderMemberPermCategoryButtons();
  }

  function setAllPermissionsInCategory(checked) {
    const cat = PERMISSION_CATEGORIES.find((c) => c.id === state.activePermCategoryId);
    if (!cat) return;
    if (!state.editingMemberPermissions) {
      state.editingMemberPermissions = getDefaultPermissionsForPreset('JOGADOR_COMUM');
    }
    cat.permissions.forEach((p) => {
      state.editingMemberPermissions[p.key] = Boolean(checked);
    });
    syncLegacyPermAliases(state.editingMemberPermissions);
    state.editingMemberPermissions.preset = detectMatchingPreset(state.editingMemberPermissions);
    renderPermissionCategoryModalContent();
    renderMemberPermCategoryButtons();
  }

  // ===========================================================================
  // Registro de Todos os Eventos de UI
  // ===========================================================================
  function bindEvents() {
    // Navegação Sidebar
    document.querySelectorAll('[data-nav-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-nav-tab')));
    });

    // Menu Mobile
    document.getElementById('btn-mobile-sidebar')?.addEventListener('click', () => {
      document.getElementById('app-sidebar')?.classList.toggle('-translate-x-full');
      document.getElementById('sidebar-mobile-backdrop')?.classList.toggle('hidden');
    });
    document.getElementById('sidebar-mobile-backdrop')?.addEventListener('click', () => {
      document.getElementById('app-sidebar')?.classList.add('-translate-x-full');
      document.getElementById('sidebar-mobile-backdrop')?.classList.add('hidden');
    });

    // Alternar Tema
    document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);

    // Alternar Simulação Mestre / Jogador (apenas para o Host)
    document.getElementById('btn-role-badge')?.addEventListener('click', () => {
      if (!state.isHost) {
        showToast('Apenas a máquina Host possui acesso de Mestre.', 'warning');
        return;
      }
      state.simulatingPlayer = !state.simulatingPlayer;
      showToast(
        state.simulatingPlayer
          ? 'Simulando visão de JOGADOR (Clique novamente para voltar ao Modo Mestre)'
          : 'Modo MESTRE ativado',
        'success'
      );
      renderAll();
    });

    // Undo / Redo
    document.getElementById('btn-undo')?.addEventListener('click', triggerUndo);
    document.getElementById('btn-redo')?.addEventListener('click', triggerRedo);

    // Copiar Link Radmin VPN na Visão Geral
    document.getElementById('btn-copy-invite-link')?.addEventListener('click', () => {
      const url = document.getElementById('overview-invite-url')?.textContent || window.location.origin;
      navigator.clipboard?.writeText(url);
      showToast(`Link copiado: ${url}`, 'success');
    });

    // Editar Sala rápida
    document.getElementById('btn-edit-room-info')?.addEventListener('click', () => switchTab('admin'));

    // Busca e filtro de Membros na Visão Geral
    document.getElementById('member-search-input')?.addEventListener('input', (e) => {
      state.memberSearchQuery = e.target.value || '';
      renderOverviewTab();
    });
    document.getElementById('member-role-filter')?.addEventListener('change', (e) => {
      state.memberRoleFilter = e.target.value || 'ALL';
      renderOverviewTab();
    });

    const renderMemberCursorColorSwatches = (selectedHex, isMasterRole = false) => {
      const picker = document.getElementById('member-cursor-color-picker');
      const colorInp = document.getElementById('member-cursor-color-input');
      const colorLbl = document.getElementById('member-cursor-color-label');
      const titleLbl = document.getElementById('member-cursor-color-title');

      if (isMasterRole) {
        if (titleLbl) titleLbl.textContent = 'Cursor do Mestre (Exclusivo)';
        if (colorInp) colorInp.value = 'RGB_CHROMA';
        if (colorLbl) {
          colorLbl.textContent = 'Transição RGB Suave Dinâmica';
          colorLbl.className = 'text-[10px] font-mono font-black rgb-text-animated';
          colorLbl.style.color = '';
        }
        if (!picker) return;
        picker.className = 'w-full p-0 rounded-xl overflow-hidden';
        picker.innerHTML = `
          <div class="w-full rgb-master-banner flex items-center justify-between p-3.5 rounded-xl border">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center bg-black/50 text-amber-300 text-xl border border-amber-400/40 shrink-0">
                <iconify-icon icon="game-icons:crown"></iconify-icon>
              </span>
              <div>
                <div class="font-serif-fantasy font-black text-xs uppercase tracking-wider rgb-text-animated">Cursor do Mestre: RGB Cromático</div>
                <div class="text-[10px] app-muted mt-0.5">Sem cor fixa. Transição dinâmica e suave em tempo real por todo o espectro de cores RGB.</div>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase rgb-badge-animated flex items-center gap-1.5 shrink-0">
              <iconify-icon icon="game-icons:sparkles"></iconify-icon>
              <span>RGB Ativo</span>
            </span>
          </div>
        `;
        return;
      }

      if (titleLbl) titleLbl.textContent = 'Cor Permanente do Cursor (10 Cores)';
      const normHex = normalizePaletteColor(selectedHex) || CURSOR_COLOR_PALETTE[0].hex;
      if (colorInp) colorInp.value = normHex;
      if (colorLbl) {
        colorLbl.className = 'text-[10px] font-mono font-bold app-muted';
        colorLbl.textContent = `${getColorNameByHex(normHex)} (${normHex})`;
        colorLbl.style.color = normHex;
      }
      if (!picker) return;
      picker.className = 'grid grid-cols-5 sm:grid-cols-10 gap-2 p-2.5 rounded-xl bg-black/25 border app-divider-border';

      picker.innerHTML = CURSOR_COLOR_PALETTE.map((c) => {
        const isSelected = c.hex.toUpperCase() === normHex.toUpperCase();
        return `
          <button
            type="button"
            data-pick-cursor-color="${escapeHtml(c.hex)}"
            title="${escapeHtml(c.name)} (${escapeHtml(c.hex)})"
            class="cursor-color-swatch ${isSelected ? 'active-swatch' : ''}"
            style="background-color: ${escapeHtml(c.hex)}; --swatch-color: ${escapeHtml(c.hex)};"
          >
            ${isSelected ? '<span class="text-[11px] font-black text-white flex items-center justify-center"><iconify-icon icon="game-icons:check-mark"></iconify-icon></span>' : ''}
          </button>
        `;
      }).join('');
    };

    document.getElementById('member-cursor-color-picker')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-cursor-color]');
      if (!btn) return;
      renderMemberCursorColorSwatches(btn.getAttribute('data-pick-cursor-color'), false);
    });

    // Abrir modal de Membro / Apelido por IP
    const openMemberModal = (memberId) => {
      const m = state.members.find((x) => x.id === memberId) || getActiveMember();
      if (!m) return;
      const hostIp = state.network?.preferred_ip || window.location.hostname || '127.0.0.1';
      const isMasterRole = m.role === 'MESTRE' || m.id === 'host_master';

      document.getElementById('member-form-id').value = m.id;
      document.getElementById('member-name-input').value = m.nickname || m.name || '';
      const ipInput = document.getElementById('member-ip-input');
      const ipHint = document.getElementById('member-ip-hint');
      if (ipInput) {
        ipInput.value = m.ip || (isMasterRole ? hostIp : '');
        ipInput.readOnly = isMasterRole || !isEffectiveMaster();
      }
      if (ipHint) {
        ipHint.textContent = isMasterRole
          ? 'IP Principal do Host (Sempre Mestre).'
          : 'IP do jogador na rede local / Radmin VPN.';
      }

      const assignedColor = isMasterRole ? 'RGB_CHROMA' : assignPermanentMemberCursorColor(m.id, m.cursorColor);
      m.cursorColor = assignedColor;
      renderMemberCursorColorSwatches(assignedColor, isMasterRole);

      const charSel = document.getElementById('member-char-select');
      charSel.innerHTML =
        `<option value="">Nenhum vinculado</option>` +
        state.characters
          .map((c) => `<option value="${escapeHtml(c.id)}" ${m.characterId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
          .join('');

      state.editingMemberId = m.id;
      const rawPerms = m.permissions && typeof m.permissions === 'object' ? deepClone(m.permissions) : {};
      const perms = { ...getDefaultPermissionsForPreset('JOGADOR_COMUM'), ...rawPerms };
      syncLegacyPermAliases(perms);
      perms.preset = detectMatchingPreset(perms);
      state.editingMemberPermissions = perms;

      renderMemberPresetDropdown(perms.preset);
      renderMemberPermCategoryButtons();

      const permSec = document.getElementById('member-permissions-section');
      const remBtn = document.getElementById('btn-remove-member');
      if (isEffectiveMaster() && !isMasterRole) {
        permSec?.classList.remove('hidden');
        remBtn?.classList.remove('hidden');
      } else {
        permSec?.classList.add('hidden');
        remBtn?.classList.add('hidden');
      }

      openModal('modal-member');
      setTimeout(() => document.getElementById('member-name-input')?.focus(), 50);
    };

    document.getElementById('btn-open-profile')?.addEventListener('click', () => {
      openMemberModal(getActiveMember()?.id);
    });

    document.getElementById('btn-add-member')?.addEventListener('click', () => {
      commitMutation((st) => {
        const idx = st.members.length;
        const placeholderIp = `26.0.0.${10 + idx}`;
        const newId = `ip_${placeholderIp}`;
        const usedColors = (st.members || []).map((x) => x.cursorColor).filter(Boolean);
        const assignedColor = assignPermanentMemberCursorColor(newId, null, usedColors);
        st.members.push({
          id: newId,
          ip: placeholderIp,
          nickname: `Jogador ${idx}`,
          name: `Jogador ${idx}`,
          title: `Jogador (${placeholderIp})`,
          role: 'JOGADOR',
          avatar: 'hooded-figure',
          characterId: null,
          cursorColor: assignedColor,
          online: false,
          connectionsCount: 0,
          permissions: getDefaultPermissionsForPreset('JOGADOR_COMUM'),
        });
        setTimeout(() => openMemberModal(newId), 60);
        return true;
      });
    });

    document.getElementById('members-table-body')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-edit-member]');
      if (btn) openMemberModal(btn.getAttribute('data-edit-member'));
    });

    document.getElementById('live-connected-ips-list')?.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-edit-member]');
      if (pill) openMemberModal(pill.getAttribute('data-edit-member'));
    });

    document.getElementById('member-preset-select')?.addEventListener('change', (e) => {
      const selectedPreset = e.target.value;
      if (selectedPreset === 'PERSONALIZADO') {
        if (state.editingMemberPermissions) {
          state.editingMemberPermissions.preset = 'PERSONALIZADO';
        }
        updateDeleteCustomPresetButtonUI();
        return;
      }
      state.editingMemberPermissions = getDefaultPermissionsForPreset(selectedPreset);
      renderMemberPermCategoryButtons();
      updateDeleteCustomPresetButtonUI();
      const modal = document.getElementById('modal-perm-category');
      if (modal && !modal.classList.contains('hidden')) {
        renderPermissionCategoryModalContent();
      }
    });

    document.getElementById('btn-save-as-preset')?.addEventListener('click', () => {
      if (!isEffectiveMaster()) {
        showToast('Apenas o Mestre pode criar novos perfis de permissão.', 'warning');
        return;
      }
      const inp = document.getElementById('custom-preset-name-input');
      if (inp) inp.value = '';
      openModal('modal-save-custom-preset');
      setTimeout(() => inp?.focus(), 60);
    });

    document.getElementById('form-save-custom-preset')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isEffectiveMaster()) {
        showToast('Apenas o Mestre pode salvar perfis de permissão.', 'warning');
        return;
      }
      const inp = document.getElementById('custom-preset-name-input');
      const name = (inp?.value || '').trim();
      if (!name) {
        showToast('Informe um nome válido para o perfil.', 'warning');
        return;
      }

      const cleanPerms = {};
      PERMISSION_CATEGORIES.forEach((cat) => {
        cat.permissions.forEach((p) => {
          cleanPerms[p.key] = Boolean(state.editingMemberPermissions?.[p.key]);
        });
      });

      let savedPresetId = null;
      commitMutation(
        (st, toasts) => {
          if (!Array.isArray(st.customPermissionPresets)) {
            st.customPermissionPresets = [];
          }
          const existingIdx = st.customPermissionPresets.findIndex(
            (cp) => cp && cp.name && cp.name.trim().toLowerCase() === name.toLowerCase()
          );
          if (existingIdx >= 0) {
            savedPresetId = st.customPermissionPresets[existingIdx].id;
            st.customPermissionPresets[existingIdx].permissions = deepClone(cleanPerms);
            toasts.push(`Perfil de permissão "${name}" foi atualizado!`);
          } else {
            savedPresetId = `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            st.customPermissionPresets.push({
              id: savedPresetId,
              name,
              permissions: deepClone(cleanPerms),
            });
            toasts.push(`Perfil de permissão "${name}" salvo com sucesso!`);
          }
          return true;
        },
        {
          actionType: 'CUSTOM_PRESET_SAVE',
          targetEntity: `Perfil: ${name}`,
          summary: `Perfil de permissões personalizado "${name}" salvo pelo Mestre.`,
        }
      );

      closeModal('modal-save-custom-preset');

      if (state.editingMemberPermissions && savedPresetId) {
        state.editingMemberPermissions.preset = savedPresetId;
      }
      renderMemberPresetDropdown(savedPresetId);
      renderMemberPermCategoryButtons();
    });

    document.getElementById('btn-delete-custom-preset')?.addEventListener('click', () => {
      if (!isEffectiveMaster()) {
        showToast('Apenas o Mestre pode excluir perfis de permissão.', 'warning');
        return;
      }
      const select = document.getElementById('member-preset-select');
      const val = select?.value;
      const targetPreset = (state.customPermissionPresets || []).find((cp) => cp && cp.id === val);
      if (!targetPreset) return;

      openConfirmModal({
        icon: '<iconify-icon icon="game-icons:trash-can" class="text-rose-400"></iconify-icon>',
        title: `EXCLUIR PRESET "${targetPreset.name.toUpperCase()}"?`,
        message: `Tem certeza que deseja apagar o perfil personalizado "${targetPreset.name}"? Os membros que já possuem estas permissões atribuídas não serão alterados, mas o perfil deixará de existir na lista de presets.`,
        confirmText: '<iconify-icon icon="game-icons:trash-can"></iconify-icon> <span>Excluir Preset</span>',
        onConfirm: () => {
          commitMutation(
            (st, toasts) => {
              st.customPermissionPresets = (st.customPermissionPresets || []).filter((cp) => cp && cp.id !== targetPreset.id);
              toasts.push(`Perfil de permissão "${targetPreset.name}" excluído.`);
              return true;
            },
            {
              actionType: 'CUSTOM_PRESET_DELETE',
              targetEntity: `Perfil: ${targetPreset.name}`,
              summary: `Perfil personalizado "${targetPreset.name}" excluído pelo Mestre.`,
            }
          );
          state.editingMemberPermissions = getDefaultPermissionsForPreset('JOGADOR_COMUM');
          renderMemberPresetDropdown('JOGADOR_COMUM');
          renderMemberPermCategoryButtons();
          const modal = document.getElementById('modal-perm-category');
          if (modal && !modal.classList.contains('hidden')) {
            renderPermissionCategoryModalContent();
          }
        },
      });
    });

    document.getElementById('member-perm-category-buttons')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-perm-cat]');
      if (!btn) return;
      openPermissionCategoryModal(btn.getAttribute('data-open-perm-cat'));
    });

    document.getElementById('perm-cat-switches-list')?.addEventListener('change', (e) => {
      const sw = e.target.closest('[data-perm-switch]');
      if (!sw) return;
      handleTogglePermSwitch(sw.getAttribute('data-perm-switch'), sw.checked);
    });

    document.getElementById('btn-perm-cat-enable-all')?.addEventListener('click', () => {
      setAllPermissionsInCategory(true);
    });

    document.getElementById('btn-perm-cat-disable-all')?.addEventListener('click', () => {
      setAllPermissionsInCategory(false);
    });

    document.getElementById('form-member')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const mid = document.getElementById('member-form-id').value;
      const newNickname = document.getElementById('member-name-input').value.trim();
      const newIpRaw = document.getElementById('member-ip-input')?.value.trim();
      const cid = document.getElementById('member-char-select').value || null;
      const chosenColorRaw = document.getElementById('member-cursor-color-input')?.value;

      commitMutation(
        (st, toasts) => {
          const m = st.members.find((x) => x.id === mid);
          if (!m) return false;
          const isMasterRole = m.role === 'MESTRE' || m.id === 'host_master';
          if (!isMasterRole && newIpRaw) {
            m.ip = newIpRaw;
            m.id = `ip_${newIpRaw}`;
          }
          m.nickname = newNickname || (isMasterRole ? 'Mestre' : '');
          m.name = m.nickname || (isMasterRole ? 'Mestre' : `Jogador (${m.ip})`);
          m.title = isMasterRole
            ? `IP Principal (Host): ${m.ip}`
            : m.nickname
            ? `IP: ${m.ip}`
            : `Jogador Conectado (${m.ip})`;
          m.characterId = cid;
          m.cursorColor = isMasterRole
            ? 'RGB_CHROMA'
            : assignPermanentMemberCursorColor(m.id, chosenColorRaw || m.cursorColor);
          if (isEffectiveMaster() && !isMasterRole) {
            const savedPerms = deepClone(state.editingMemberPermissions || getDefaultPermissionsForPreset('JOGADOR_COMUM'));
            syncLegacyPermAliases(savedPerms);
            savedPerms.preset = detectMatchingPreset(savedPerms);
            m.permissions = savedPerms;
          }
          toasts.push(
            isMasterRole
              ? `Dados do Mestre salvos com Cursor RGB Cromático Dinâmico!`
              : `Apelido "${m.name}" e cor ${getColorNameByHex(m.cursorColor)} salvos para o IP ${m.ip}!`
          );
          return true;
        },
        {
          actionType: 'MEMBER_NICKNAME_UPDATE',
          targetEntity: `IP: ${newIpRaw || mid}`,
          summary: `Apelido definido como "${newNickname || 'Jogador'}".`,
        }
      );
      closeModal('modal-member');
    });

    document.getElementById('btn-remove-member')?.addEventListener('click', () => {
      const mid = document.getElementById('member-form-id').value;
      commitMutation((st) => {
        st.members = st.members.filter((x) => x.id !== mid || x.role === 'MESTRE' || x.id === 'host_master');
        return true;
      });
      closeModal('modal-member');
    });

    // Gerenciar Moeda / Ouro
    document.getElementById('btn-manage-gold')?.addEventListener('click', () => {
      if (!isEffectiveMaster() && !hasPermission('gold_manage')) {
        showToast('Você não possui permissão para gerenciar o ouro do cofre!', 'warning');
        return;
      }
      document.getElementById('gold-amount-input').value = '';
      openModal('modal-gold');
      setTimeout(() => document.getElementById('gold-amount-input')?.focus(), 50);
    });
    document.querySelectorAll('#gold-op-group [data-gold-op]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeGoldOp = btn.getAttribute('data-gold-op');
        document.querySelectorAll('#gold-op-group [data-gold-op]').forEach((b) => {
          b.classList.toggle('active-op', b === btn);
        });
      });
    });
    document.getElementById('form-gold')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isEffectiveMaster() && !hasPermission('gold_manage')) {
        showToast('Você não possui permissão para gerenciar o ouro do cofre!', 'warning');
        return;
      }
      const val = Math.max(0, Math.round(Number(document.getElementById('gold-amount-input').value || 0)));
      const prevGold = state.room.sharedGold || 0;
      let nextGold = prevGold;
      if (state.activeGoldOp === 'add') nextGold = prevGold + val;
      else if (state.activeGoldOp === 'sub') nextGold = Math.max(0, prevGold - val);
      else if (state.activeGoldOp === 'set') nextGold = val;

      commitMutation(
        (st) => {
          st.room.sharedGold = nextGold;
          return true;
        },
        {
          actionType: 'GOLD_UPDATE',
          targetEntity: `Cofre (${state.room.currencyName})`,
          summary: `Saldo alterado de ${prevGold} para ${nextGold} ${state.room.currencyName}.`,
        }
      );
      closeModal('modal-gold');
    });

    // Busca em Tempo Real de Personagens (BUSCAR...)
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    searchInput?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value || '';
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', state.searchQuery.length === 0);
        clearSearchBtn.classList.toggle('flex', state.searchQuery.length > 0);
      }
      renderCharactersTab();
    });
    clearSearchBtn?.addEventListener('click', () => {
      if (!searchInput) return;
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      clearSearchBtn.classList.remove('flex');
      renderCharactersTab();
    });

    // Botão CRIAR Personagem + Preset Nível 1 Canônico + 3 Botões de Habilidade no Formulário
    document.getElementById('btn-create-char')?.addEventListener('click', openCreateCharacterModal);
    document.getElementById('btn-set-canonical-lvl1')?.addEventListener('click', () => {
      document.getElementById('char-max-hp').value = '80';
      document.getElementById('char-max-armor').value = '0';
      document.getElementById('char-max-mana').value = '100';
      document.getElementById('char-regen').value = '20';
      document.getElementById('char-defense').value = '0';
      if (document.getElementById('char-max-weight')) document.getElementById('char-max-weight').value = '27';
    });
    document.getElementById('btn-reset-res-defaults')?.addEventListener('click', () => {
      document.querySelectorAll('[data-res-max-input]').forEach((inp) => (inp.value = '100'));
    });
    document.getElementById('btn-reset-elem-res-defaults')?.addEventListener('click', () => {
      document.querySelectorAll('[data-elem-res-input]').forEach((inp) => (inp.value = '0'));
    });
    document.querySelectorAll('[data-open-form-skill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = btn.getAttribute('data-open-form-skill');
        openSkillDetailModal(slot, 'form');
      });
    });
    document.getElementById('form-skill-detail')?.addEventListener('submit', handleSkillDetailSubmit);
    document.getElementById('form-character')?.addEventListener('submit', handleCharacterFormSubmit);
    document.getElementById('btn-delete-char')?.addEventListener('click', requestDeleteCharacter);

    // Modal de Dano (Rápido vs Pipeline ADR-012)
    document.getElementById('btn-dmg-mode-simple')?.addEventListener('click', () => setDamageModeUI('simple'));
    document.getElementById('btn-dmg-mode-pipeline')?.addEventListener('click', () => setDamageModeUI('pipeline'));
    document.getElementById('form-damage')?.addEventListener('submit', handleDamageFormSubmit);
    [
      'damage-amount-input',
      'damage-true-switch',
      'pipe-base-dmg',
      'pipe-multipliers',
      'pipe-bonus-pct',
      'pipe-lethality-pct',
      'pipe-penetration-pct',
      'pipe-rupture-pct',
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', updateDamagePreview);
      document.getElementById(id)?.addEventListener('change', updateDamagePreview);
    });

    // Modal de Atributo (Vida / Armadura / Mana)
    document.getElementById('form-attribute')?.addEventListener('submit', handleAttributeFormSubmit);
    document.querySelectorAll('#attr-op-group .attr-op-btn').forEach((btn) => {
      btn.addEventListener('click', () => setAttrOpSelection(btn.getAttribute('data-op')));
    });

    // Painel de Resistências
    document.getElementById('resistances-list-container')?.addEventListener('click', (e) => {
      const row = e.target.closest('[data-open-single-res]');
      if (!row) return;
      openSingleResistanceModal(row.getAttribute('data-char-id'), row.getAttribute('data-open-single-res'));
    });
    document.getElementById('form-single-resistance')?.addEventListener('submit', handleSingleResistanceSubmit);
    document.querySelectorAll('#single-res-op-group .res-op-btn').forEach((btn) => {
      btn.addEventListener('click', () => setSingleResOpSelection(btn.getAttribute('data-res-op')));
    });

    // Modal de Buffs e Nerfs
    document.getElementById('form-add-buff-nerf')?.addEventListener('submit', handleAddBuffNerfSubmit);
    document.getElementById('modal-buffs-nerfs')?.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-action="delete-buff-nerf"]');
      if (delBtn) {
        const charId = delBtn.getAttribute('data-char-id');
        const effectId = delBtn.getAttribute('data-effect-id');
        if (charId && effectId) removeBuffNerf(charId, effectId);
      }
    });

    // Modal de Ressurreição (100%, 50%, Personalizado)
    document.querySelectorAll('#revive-mode-group [data-revive-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeReviveMode = btn.getAttribute('data-revive-mode');
        document.querySelectorAll('#revive-mode-group [data-revive-mode]').forEach((b) =>
          b.classList.toggle('active-op', b === btn)
        );
        document
          .getElementById('revive-custom-inputs')
          ?.classList.toggle('hidden', state.activeReviveMode !== 'CUSTOM');
      });
    });

    document.getElementById('form-revive')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const cid = document.getElementById('revive-char-id').value;
      const mode = state.activeReviveMode;
      commitMutation(
        (st, toasts) => {
          const target = st.characters.find((c) => c.id === cid);
          if (!target) return false;
          target.isDead = false;
          if (mode === '100') {
            target.hp = target.maxHp;
            target.armor = target.maxArmor;
          } else if (mode === '50') {
            target.hp = Math.max(1, applyRounding(target.maxHp * 0.5));
            target.armor = applyRounding(target.maxArmor * 0.5);
          } else {
            target.hp = Math.max(1, Number(document.getElementById('revive-custom-hp').value || 1));
            target.armor = Math.max(0, Number(document.getElementById('revive-custom-armor').value || 0));
          }
          target.pa = target.maxPa;
          toasts.push(`${target.name} foi ressuscitado (${target.hp} HP / ${target.armor} Armadura)!`);
          return true;
        },
        {
          actionType: 'CHAR_REVIVE',
          targetEntity: `Personagem ID: ${cid}`,
          summary: `Personagem revivido no modo ${mode}.`,
        }
      );
      closeModal('modal-revive');
    });

    // Helper compartilhado para ações de itens no Inventário
    const handleInventoryItemAction = (e, charId) => {
      if (!charId) return false;
      const targetChar = state.characters.find((x) => x.id === charId);
      if (!targetChar) return false;

      const transferBtn = e.target.closest('[data-inv-transfer]');
      if (transferBtn) {
        if (!canTransferFromInventory(targetChar)) {
          showToast('Você não possui permissão para transferir itens deste inventário!', 'warning');
          return true;
        }
        const invId = transferBtn.getAttribute('data-inv-transfer');
        openItemRecipientModal({ mode: 'P2P', senderCharId: charId, invId });
        return true;
      }

      if (!canEditInventory(targetChar)) return false;

      const equipBtn = e.target.closest('[data-inv-toggle-equip]');
      if (equipBtn) {
        const invId = equipBtn.getAttribute('data-inv-toggle-equip');
        commitMutation((st) => {
          const c = st.characters.find((x) => x.id === charId);
          const inv = c?.inventory?.find((i) => i.id === invId);
          if (!inv) return false;
          inv.isEquipped = !inv.isEquipped;
          return true;
        });
        return true;
      }

      const useBtn = e.target.closest('[data-inv-use-consumable]');
      if (useBtn) {
        const invId = useBtn.getAttribute('data-inv-use-consumable');
        commitMutation(
          (st, toasts) => {
            const c = st.characters.find((x) => x.id === charId);
            const idx = c?.inventory?.findIndex((i) => i.id === invId);
            if (idx === undefined || idx === -1) return false;
            const inv = c.inventory[idx];
            const tpl = st.itemsCatalog.find((it) => it.id === inv.itemId);
            if (!tpl) return false;

            const appliedSummary = [];
            (tpl.effects || []).forEach((ef) => {
              const stat = String(ef.targetStat || '').toUpperCase();
              const modType = String(ef.modifierType || 'FLAT').toUpperCase();
              const val = Number(ef.value || 0);
              if (!val) return;

              if (stat === 'REGEN_VIDA' || stat === 'VIDA') {
                const maxHp = Math.max(1, Number(c.maxHp ?? c.initial?.maxHp ?? 100));
                const delta = modType === 'PERCENT' ? Math.round(maxHp * (val / 100)) : Math.round(val);
                const before = Number(c.hp || 0);
                c.hp = Math.max(0, Math.min(maxHp, before + delta));
                if (c.hp > 0) c.isDead = false;
                appliedSummary.push(`+${c.hp - before} Vida`);
              } else if (stat === 'REGEN_ARMADURA' || stat === 'ARMADURA') {
                const maxArmor = Math.max(0, Number(c.maxArmor ?? c.initial?.maxArmor ?? 0));
                const delta = modType === 'PERCENT' ? Math.round(maxArmor * (val / 100)) : Math.round(val);
                const before = Number(c.armor || 0);
                c.armor = Math.max(0, Math.min(maxArmor, before + delta));
                appliedSummary.push(`+${c.armor - before} Armadura`);
              } else if (stat === 'REGEN_MANA' || stat === 'MANA') {
                const maxMana = Math.max(0, Number(c.maxMana ?? c.initial?.maxMana ?? 0));
                const delta = modType === 'PERCENT' ? Math.round(maxMana * (val / 100)) : Math.round(val);
                const before = Number(c.mana || 0);
                c.mana = Math.max(0, Math.min(maxMana, before + delta));
                appliedSummary.push(`+${c.mana - before} Mana`);
              } else if (stat === 'PA') {
                const maxPa = Math.max(1, Number(c.maxPa ?? 2));
                const delta = modType === 'PERCENT' ? Math.round(maxPa * (val / 100)) : Math.round(val);
                const before = Number(c.pa || 0);
                c.pa = Math.max(0, Math.min(maxPa, before + delta));
                appliedSummary.push(`+${c.pa - before} PA`);
              }
            });

            c.activeBuffs = [];

            if ((inv.quantity || 1) > 1) inv.quantity -= 1;
            else c.inventory.splice(idx, 1);

            const effectText = appliedSummary.length ? ` (${appliedSummary.join(', ')})` : '';
            toasts.push(`${c.name} usou ${tpl.nome}${effectText}!`);
            return true;
          },
          {
            actionType: 'CONSUMABLE_USED',
            targetEntity: `Personagem ID: ${charId}`,
            summary: 'Consumível utilizado com efeito imediato.',
          }
        );
        return true;
      }

      const sellBtn = e.target.closest('[data-inv-sell-escrow]');
      if (sellBtn) {
        if (!isEffectiveMaster() && !hasPermission('shop_buy_sell') && !hasPermission('canSellToShop')) {
          showToast('Você não possui permissão para solicitar venda no Escrow!', 'warning');
          return true;
        }
        const invId = sellBtn.getAttribute('data-inv-sell-escrow');
        openSellEscrowModal(charId, invId);
        return true;
      }

      const remBtn = e.target.closest('[data-inv-remove]');
      if (remBtn) {
        const invId = remBtn.getAttribute('data-inv-remove');
        commitMutation((st) => {
          const c = st.characters.find((x) => x.id === charId);
          if (!c) return false;
          c.inventory = (c.inventory || []).filter((i) => i.id !== invId);
          return true;
        });
        return true;
      }

      return false;
    };

    // Eventos dentro da Ficha Completa (#sheet-modal-body)
    document.getElementById('sheet-modal-body')?.addEventListener('click', (e) => {
      const charId = state.activeSheetCharId;
      if (!charId) return;

      const skillBtn = e.target.closest('[data-open-sheet-skill]');
      if (skillBtn) {
        const slot = skillBtn.getAttribute('data-open-sheet-skill');
        openSkillDetailModal(slot, 'sheet', charId);
        return;
      }

      if (e.target.closest('#btn-sheet-open-inventory')) {
        openCharacterInventoryModal(charId);
        return;
      }

      const targetChar = state.characters.find((x) => x.id === charId);
      if (!targetChar || !canEditCharacter(targetChar)) return;

      const attrBtn = e.target.closest('[data-sheet-attr-adj]');
      if (attrBtn) {
        const attrKey = attrBtn.getAttribute('data-sheet-attr-adj');
        const delta = Number(attrBtn.getAttribute('data-delta') || 1);
        commitMutation((st) => {
          const c = st.characters.find((x) => x.id === charId);
          if (!c) return false;
          if (delta > 0 && !isEffectiveMaster() && (c.pendingAttributePoints || 0) <= 0) return false;
          c.attributes[attrKey] = Math.max(7, (c.attributes[attrKey] || 8) + delta);
          if (delta > 0 && (c.pendingAttributePoints || 0) > 0) {
            c.pendingAttributePoints -= 1;
          }
          return true;
        });
        return;
      }

      if (e.target.closest('#btn-sheet-add-talent')) {
        const tName = document.getElementById('sheet-new-talent-name')?.value.trim();
        const tDesc = document.getElementById('sheet-new-talent-desc')?.value.trim();
        if (!tName) return;
        commitMutation((st) => {
          const c = st.characters.find((x) => x.id === charId);
          if (!c) return false;
          if ((c.skillPoints || 0) > 0) c.skillPoints -= 1;
          c.talents = c.talents || [];
          c.talents.push({ id: `tal_${Date.now()}`, name: tName, description: tDesc });
          return true;
        });
        return;
      }

      handleInventoryItemAction(e, charId);
    });

    // Eventos do Modal Dedicado de Inventário 3x(Infinito) (#modal-char-inventory)
    document.querySelectorAll('#inv-modal-type-filters [data-inv-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.invModalFilter = btn.getAttribute('data-inv-filter') || 'ALL';
        document.querySelectorAll('#inv-modal-type-filters [data-inv-filter]').forEach((b) => {
          b.className =
            b === btn
              ? 'px-3 py-1.5 rounded-lg text-xs font-bold btn-gold'
              : 'px-3 py-1.5 rounded-lg text-xs font-bold app-secondary-btn';
        });
        const char = state.characters.find((c) => c.id === state.activeInventoryCharId);
        if (char) renderCharacterInventoryModalContent(char);
      });
    });

    document.getElementById('inv-modal-search-input')?.addEventListener('input', (e) => {
      state.invModalSearchQuery = e.target.value || '';
      const char = state.characters.find((c) => c.id === state.activeInventoryCharId);
      if (char) renderCharacterInventoryModalContent(char);
    });

    document.getElementById('btn-save-inv-max-weight')?.addEventListener('click', () => {
      const charId = state.activeInventoryCharId;
      if (!charId) return;
      const targetChar = state.characters.find((x) => x.id === charId);
      if (!targetChar || !canEditCharacter(targetChar)) {
        showToast('Você só pode editar o limite de peso do seu próprio personagem!');
        return;
      }
      const raw = Number(document.getElementById('inv-modal-max-weight-input')?.value ?? 27);
      const nextMaxWeight = Number.isFinite(raw) && raw >= 0 ? Number(raw.toFixed(2)) : 27;
      commitMutation(
        (st, toasts) => {
          const c = st.characters.find((x) => x.id === charId);
          if (!c) return false;
          c.maxWeight = nextMaxWeight;
          if (c.initial) c.initial.maxWeight = nextMaxWeight;
          toasts.push(`Limite de peso de ${c.name} atualizado para ${nextMaxWeight} kg!`);
          return true;
        },
        {
          actionType: 'CHAR_WEIGHT_LIMIT_UPDATE',
          targetEntity: `Personagem ID: ${charId}`,
          summary: `Limite de peso alterado para ${nextMaxWeight} kg.`,
        }
      );
    });

    document.getElementById('inv-modal-grid')?.addEventListener('click', (e) => {
      handleInventoryItemAction(e, state.activeInventoryCharId);
    });

    document.getElementById('form-item-recipient')?.addEventListener('submit', handleItemRecipientSubmit);
    document.getElementById('form-sell-escrow')?.addEventListener('submit', handleSellEscrowSubmit);

    // Delegação nos Cards de Personagens (Grade Principal e Iniciativa)
    const handleCharActionClick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const charId = btn.getAttribute('data-char-id');
      if (!charId) return;

      if (action === 'open-edit') openEditCharacterModal(charId);
      else if (action === 'open-resistances') openResistancesPanelModal(charId);
      else if (action === 'open-buffs-nerfs') openBuffsNerfsModal(charId);
      else if (action === 'open-sheet') openCharacterSheetModal(charId);
      else if (action === 'open-inventory') openCharacterInventoryModal(charId);
      else if (action === 'open-revive') {
        const c = state.characters.find((x) => x.id === charId);
        if (!c) return;
        document.getElementById('revive-char-id').value = c.id;
        document.getElementById('revive-char-name').textContent = c.name;
        openModal('modal-revive');
      } else if (action === 'pill-damage') openDamageModal(charId);
      else if (action === 'pill-attr') openAttributeModal(charId, btn.getAttribute('data-attr'));
      else if (action === 'pill-regen') triggerInstantManaRegen(charId);
      else if (action === 'pill-reset') requestResetCharacter(charId);
      else if (action === 'spend-pa') adjustCharacterPa(charId, -1);
      else if (action === 'adjust-pa') {
        const delta = Number(btn.getAttribute('data-delta') || 0);
        if (delta !== 0) adjustCharacterPa(charId, delta);
      }
      else if (action === 'open-general-skills') openGeneralSkillsModal(charId, 'instance');
      else if (action === 'dismiss-enemy') dismissEnemyInstance(charId);
    };

    const grid = document.getElementById('characters-grid');
    if (grid) {
      grid.addEventListener('click', handleCharActionClick);
      grid.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.char-drag-handle');
        if (handle) startCardDrag(e, handle);
      });
      grid.addEventListener(
        'touchstart',
        (e) => {
          const handle = e.target.closest('.char-drag-handle');
          if (handle) startCardDrag(e, handle);
        },
        { passive: false }
      );
    }

    window.addEventListener('mousemove', moveCardDrag, { passive: false });
    window.addEventListener('touchmove', moveCardDrag, { passive: false });
    window.addEventListener('mouseup', endCardDrag);
    window.addEventListener('touchend', endCardDrag);
    window.addEventListener('touchcancel', endCardDrag);

    // -------------------------------------------------------------------------
    // Eventos do Catálogo de Itens
    // -------------------------------------------------------------------------
    document.querySelectorAll('#catalog-type-filters [data-item-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.catalogTypeFilter = btn.getAttribute('data-item-type');
        document.querySelectorAll('#catalog-type-filters [data-item-type]').forEach((b) => {
          b.className =
            b === btn
              ? 'px-3 py-1.5 rounded-lg text-xs font-bold btn-gold'
              : 'px-3 py-1.5 rounded-lg text-xs font-bold app-secondary-btn';
        });
        renderCatalogTab();
      });
    });

    document.getElementById('catalog-search-input')?.addEventListener('input', (e) => {
      state.catalogSearchQuery = e.target.value || '';
      renderCatalogTab();
    });

    const addEffectRowToModal = (eff = { targetStat: 'VIDA', modifierType: 'FLAT', value: 10 }) => {
      const list = document.getElementById('cat-item-effects-list');
      if (!list) return;
      const row = document.createElement('div');
      row.className = 'grid grid-cols-12 gap-2 items-center';
      row.innerHTML = `
        <select data-eff-target class="col-span-5 px-2 py-1.5 app-input font-bold">
          ${EFFECT_TARGET_OPTIONS.map(
            (o) => `<option value="${o.value}" ${eff.targetStat === o.value ? 'selected' : ''}>${o.label}</option>`
          ).join('')}
        </select>
        <select data-eff-type class="col-span-3 px-2 py-1.5 app-input font-bold">
          <option value="FLAT" ${eff.modifierType === 'FLAT' ? 'selected' : ''}>Fixo (FLAT)</option>
          <option value="PERCENT" ${eff.modifierType === 'PERCENT' ? 'selected' : ''}>Percentual (%)</option>
        </select>
        <input data-eff-val type="number" step="any" value="${eff.value ?? 10}" class="col-span-3 px-2 py-1.5 font-mono font-bold app-input" />
        <button type="button" class="col-span-1 py-1.5 rounded app-secondary-btn text-rose-400">✕</button>
      `;
      row.querySelector('button')?.addEventListener('click', () => row.remove());
      list.appendChild(row);
    };

    document.getElementById('btn-add-item-effect')?.addEventListener('click', () => addEffectRowToModal());

    document.getElementById('btn-new-catalog-item')?.addEventListener('click', () => {
      if (!isEffectiveMaster() && !hasPermission('item_manage_catalog')) {
        showToast('Você não possui permissão para cadastrar itens no catálogo!', 'warning');
        return;
      }
      document.getElementById('cat-item-id').value = '';
      document.getElementById('cat-item-name').value = '';
      document.getElementById('cat-item-type').value = 'ARMADURA';
      document.getElementById('cat-item-desc').value = '';
      document.getElementById('cat-item-weight').value = '1.0';
      document.getElementById('cat-item-price').value = '100';
      const atkInput = document.getElementById('cat-item-attack');
      if (atkInput) atkInput.value = '0';
      const arcInput = document.getElementById('cat-item-arcana');
      if (arcInput) arcInput.value = '0';
      document.getElementById('cat-item-equipable').checked = true;
      document.getElementById('cat-item-non-tradable').checked = false;
      document.getElementById('cat-item-visible').checked = true;
      document.getElementById('cat-item-effects-list').innerHTML = '';
      addEffectRowToModal({ targetStat: 'ARMADURA', modifierType: 'FLAT', value: 25 });
      openModal('modal-catalog-item');
    });

    document.getElementById('catalog-items-grid')?.addEventListener('click', (e) => {
      const grantBtn = e.target.closest('[data-grant-item]');
      if (grantBtn) {
        if (!isEffectiveMaster() && !hasPermission('inventory_edit_others')) {
          showToast('Você não possui permissão para conceder itens a outros!', 'warning');
          return;
        }
        const itemId = grantBtn.getAttribute('data-grant-item');
        openItemRecipientModal({ mode: 'GRANT', itemId });
        return;
      }

      const editBtn = e.target.closest('[data-edit-item]');
      if (editBtn) {
        if (!isEffectiveMaster() && !hasPermission('item_manage_catalog')) {
          showToast('Você não possui permissão para editar itens do catálogo!', 'warning');
          return;
        }
        const it = state.itemsCatalog.find((i) => i.id === editBtn.getAttribute('data-edit-item'));
        if (!it) return;
        document.getElementById('cat-item-id').value = it.id;
        document.getElementById('cat-item-name').value = it.nome;
        document.getElementById('cat-item-type').value = it.tipo;
        document.getElementById('cat-item-desc').value = it.descricao || '';
        document.getElementById('cat-item-weight').value = String(it.peso ?? 0);
        document.getElementById('cat-item-price').value = String(it.preco ?? 0);
        const atkInput = document.getElementById('cat-item-attack');
        if (atkInput) atkInput.value = String(it.attack ?? it.ataque ?? 0);
        const arcInput = document.getElementById('cat-item-arcana');
        if (arcInput) arcInput.value = String(it.arcana ?? 0);
        document.getElementById('cat-item-equipable').checked = Boolean(it.equipavel);
        document.getElementById('cat-item-non-tradable').checked = Boolean(it.naoNegociavel);
        document.getElementById('cat-item-visible').checked = it.visivelParaJogadores !== false;
        const list = document.getElementById('cat-item-effects-list');
        list.innerHTML = '';
        (it.effects || []).forEach((ef) => addEffectRowToModal(ef));
        openModal('modal-catalog-item');
        return;
      }

      const delBtn = e.target.closest('[data-delete-item]');
      if (delBtn) {
        if (!isEffectiveMaster() && !hasPermission('item_manage_catalog')) {
          showToast('Você não possui permissão para excluir itens do catálogo!', 'warning');
          return;
        }
        const itemId = delBtn.getAttribute('data-delete-item');
        commitMutation((st) => {
          st.itemsCatalog = st.itemsCatalog.filter((i) => i.id !== itemId);
          return true;
        });
      }
    });

    document.getElementById('form-catalog-item')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isEffectiveMaster() && !hasPermission('item_manage_catalog')) {
        showToast('Você não possui permissão para gerenciar itens no catálogo!', 'warning');
        return;
      }
      const id = document.getElementById('cat-item-id').value.trim();
      const nome = document.getElementById('cat-item-name').value.trim() || 'Item';
      const tipo = document.getElementById('cat-item-type').value;
      const descricao = document.getElementById('cat-item-desc').value ?? '';
      const peso = Math.max(0, Number(document.getElementById('cat-item-weight').value || 0));
      const preco = Math.max(0, Math.round(Number(document.getElementById('cat-item-price').value || 0)));
      const attack = Math.max(0, Math.round(Number(document.getElementById('cat-item-attack')?.value || 0)));
      const arcana = Math.max(0, Math.round(Number(document.getElementById('cat-item-arcana')?.value || 0)));
      const durationTurns = null;
      const equipavel = tipo === 'OUTRO' || tipo === 'CONSUMIVEL' ? false : document.getElementById('cat-item-equipable').checked;
      const naoNegociavel = document.getElementById('cat-item-non-tradable').checked;
      const visivelParaJogadores = document.getElementById('cat-item-visible').checked;

      const effects = [];
      if (tipo !== 'OUTRO') {
        document.querySelectorAll('#cat-item-effects-list > div').forEach((row) => {
          effects.push({
            targetStat: row.querySelector('[data-eff-target]').value,
            modifierType: row.querySelector('[data-eff-type]').value,
            value: Number(row.querySelector('[data-eff-val]').value || 0),
            durationTurns: null,
          });
        });
      }

      commitMutation(
        (st) => {
          if (!id) {
            st.itemsCatalog.push({
              id: `item_${Date.now()}`,
              nome,
              tipo,
              descricao,
              peso,
              preco,
              attack,
              ataque: attack,
              arcana,
              durationTurns,
              equipavel,
              naoNegociavel,
              precoIndefinido: false,
              visivelParaJogadores,
              effects,
            });
          } else {
            const target = st.itemsCatalog.find((i) => i.id === id);
            if (!target) return false;
            Object.assign(target, {
              nome,
              tipo,
              descricao,
              peso,
              preco,
              attack,
              ataque: attack,
              arcana,
              durationTurns,
              equipavel,
              naoNegociavel,
              visivelParaJogadores,
              effects,
            });
          }
          return true;
        },
        {
          actionType: id ? 'ITEM_EDIT' : 'ITEM_CREATE',
          targetEntity: `Item: ${nome}`,
          summary: `Item ${nome} (${tipo}) salvo no catálogo e propagado aos inventários.`,
        }
      );
      closeModal('modal-catalog-item');
    });

    // -------------------------------------------------------------------------
    // Eventos da Loja & Mercadores + Escrow
    // -------------------------------------------------------------------------
    document.getElementById('shop-buyer-char-select')?.addEventListener('change', (e) => {
      state.selectedBuyerCharId = e.target.value;
      renderShopTab();
    });

    const requestDeleteNpc = (npcId) => {
      const npc = (state.npcs || []).find((n) => n.id === npcId);
      if (!npc) return;

      openConfirmModal({
        icon: '<iconify-icon icon="game-icons:crowned-skull"></iconify-icon>',
        title: `EXCLUIR ${npc.name.toUpperCase()}?`,
        message: `Tem certeza que deseja excluir permanentemente o mercador NPC "${npc.name}" e a vitrine de loja dele?`,
        confirmText: '<iconify-icon icon="game-icons:crowned-skull"></iconify-icon> <span>Excluir NPC</span>',
        onConfirm: () => {
          commitMutation(
            (st, toasts) => {
              const idx = (st.npcs || []).findIndex((n) => n.id === npcId);
              if (idx === -1) return false;
              const removed = st.npcs[idx];
              st.npcs.splice(idx, 1);
              if (state.selectedShopNpcId === npcId) {
                state.selectedShopNpcId = st.npcs[0]?.id || null;
              }
              toasts.push(`Mercador "${removed.name}" foi excluído da sala.`);
              return true;
            },
            {
              actionType: 'NPC_DELETE',
              targetEntity: `Mercador: ${npc.name}`,
              summary: `Mercador NPC "${npc.name}" foi excluído permanentemente.`,
            }
          );
          closeModal('modal-npc');
        },
      });
    };

    const removeShopItemFromNpc = (npcId, itemId) => {
      const npc = (state.npcs || []).find((n) => n.id === npcId);
      const item = (state.itemsCatalog || []).find((i) => i.id === itemId);
      if (!npc) return;

      commitMutation(
        (st, toasts) => {
          const targetNpc = (st.npcs || []).find((n) => n.id === npcId);
          if (!targetNpc) return false;
          targetNpc.stock = (targetNpc.stock || []).filter((s) => s.itemId !== itemId);
          toasts.push(`"${item ? item.nome : itemId}" removido da loja de ${targetNpc.name}.`);
          return true;
        },
        {
          actionType: 'NPC_SHOP_ITEM_REMOVE',
          targetEntity: `Loja: ${npc.name}`,
          summary: `Item "${item ? item.nome : itemId}" removido da vitrine de ${npc.name}.`,
        }
      );
    };

    const applyNpcModalTypeFilter = (filterType = 'ALL') => {
      state.npcModalTypeFilter = filterType;
      document.querySelectorAll('#npc-modal-type-filters [data-npc-filter]').forEach((btn) => {
        const isActive = btn.getAttribute('data-npc-filter') === filterType;
        btn.className = isActive
          ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold btn-gold'
          : 'px-2.5 py-1 rounded-lg text-[11px] font-bold app-secondary-btn';
      });
      document.querySelectorAll('#npc-stock-checklist [data-npc-item-row-type]').forEach((row) => {
        const rowType = row.getAttribute('data-npc-item-row-type');
        row.classList.toggle('hidden', filterType !== 'ALL' && rowType !== filterType);
      });
    };

    document.querySelectorAll('#npc-modal-type-filters [data-npc-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyNpcModalTypeFilter(btn.getAttribute('data-npc-filter') || 'ALL');
      });
    });

    const openNpcModal = (npc = null) => {
      document.getElementById('npc-form-id').value = npc ? npc.id : '';
      document.getElementById('npc-name-input').value = npc ? npc.name : '';
      document.getElementById('npc-desc-input').value = npc ? npc.description || '' : '';
      const delBtn = document.getElementById('btn-delete-npc');
      if (delBtn) {
        delBtn.classList.toggle('hidden', !npc);
      }
      const stockMap = {};
      (npc?.stock || []).forEach((s) => (stockMap[s.itemId] = s));

      const checklist = document.getElementById('npc-stock-checklist');
      checklist.innerHTML = state.itemsCatalog
        .map((it) => {
          const st = stockMap[it.id];
          const hasCustom =
            st && st.customPrice !== undefined && st.customPrice !== null && String(st.customPrice).trim() !== '';
          return `
          <div data-npc-item-row-type="${escapeHtml(it.tipo)}" class="flex items-center justify-between gap-2 p-2 rounded bg-black/20 hover:bg-amber-500/10">
            <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
              <input type="checkbox" data-npc-item="${escapeHtml(it.id)}" ${st ? 'checked' : ''} />
              <span class="font-bold truncate flex items-center gap-1.5">${ITEM_TYPE_ICONS[it.tipo] || '<iconify-icon icon="game-icons:knapsack"></iconify-icon>'} <span>${escapeHtml(it.nome)}</span> <span class="text-[10px] font-mono app-muted">(Padrão: <iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> ${it.preco})</span></span>
            </label>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] font-bold app-muted flex items-center gap-1"><iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> <span>Preço NPC:</span></span>
              <input
                type="number"
                min="0"
                step="1"
                data-npc-item-price="${escapeHtml(it.id)}"
                value="${hasCustom ? escapeHtml(st.customPrice) : ''}"
                placeholder="${it.preco}"
                class="w-20 app-input px-2 py-1 rounded text-xs font-mono font-bold text-amber-300 text-right"
                title="Deixe vazio para usar o valor padrão do item (${it.preco})"
              />
            </div>
          </div>
        `;
        })
        .join('');
      applyNpcModalTypeFilter('ALL');
      openModal('modal-npc');
    };

    document.getElementById('shop-npcs-sidebar')?.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-delete-npc]');
      if (delBtn) {
        e.stopPropagation();
        requestDeleteNpc(delBtn.getAttribute('data-delete-npc'));
        return;
      }
      const editBtn = e.target.closest('[data-edit-npc]');
      if (editBtn) {
        e.stopPropagation();
        const npc = state.npcs.find((n) => n.id === editBtn.getAttribute('data-edit-npc'));
        if (!npc) return;
        openNpcModal(npc);
        return;
      }
      const card = e.target.closest('[data-select-npc]');
      if (card) {
        state.selectedShopNpcId = card.getAttribute('data-select-npc');
        renderShopTab();
      }
    });

    document.getElementById('btn-new-npc')?.addEventListener('click', () => openNpcModal(null));
    document.getElementById('btn-delete-npc')?.addEventListener('click', () => {
      const npcId = document.getElementById('npc-form-id').value.trim();
      if (npcId) requestDeleteNpc(npcId);
    });

    document.getElementById('form-npc')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('npc-form-id').value.trim();
      const name = document.getElementById('npc-name-input').value.trim() || 'Mercador';
      const description = document.getElementById('npc-desc-input').value.trim();
      const stock = [];
      document.querySelectorAll('#npc-stock-checklist [data-npc-item]:checked').forEach((cb) => {
        const itemId = cb.getAttribute('data-npc-item');
        const priceInp = document.querySelector(`#npc-stock-checklist [data-npc-item-price="${itemId}"]`);
        const rawPriceStr = priceInp ? priceInp.value.trim() : '';
        const customPrice =
          rawPriceStr !== '' && Number.isFinite(Number(rawPriceStr)) && Number(rawPriceStr) >= 0
            ? Math.round(Number(rawPriceStr))
            : null;
        stock.push({ itemId, infinite: true, quantity: 10, customPrice });
      });

      commitMutation((st) => {
        if (!id) {
          const newNpc = { id: `npc_${Date.now()}`, name, description, avatar: 'shop', stock };
          st.npcs.push(newNpc);
          state.selectedShopNpcId = newNpc.id;
        } else {
          const target = st.npcs.find((n) => n.id === id);
          if (target) Object.assign(target, { name, description, stock });
        }
        return true;
      });
      closeModal('modal-npc');
    });

    document.getElementById('shop-npc-showcase')?.addEventListener('change', (e) => {
      const priceInput = e.target.closest('[data-shop-custom-price]');
      if (!priceInput) return;
      if (!hasPermission('canManageShopNpcs')) return;
      const itemId = priceInput.getAttribute('data-shop-custom-price');
      const npcId = priceInput.getAttribute('data-npc-id');
      const rawStr = priceInput.value.trim();
      const nextCustomPrice =
        rawStr !== '' && Number.isFinite(Number(rawStr)) && Number(rawStr) >= 0 ? Math.round(Number(rawStr)) : null;

      commitMutation((st) => {
        const npc = st.npcs.find((n) => n.id === npcId);
        const stockEntry = npc?.stock?.find((s) => s.itemId === itemId);
        if (!stockEntry) return false;
        stockEntry.customPrice = nextCustomPrice;
        return true;
      });
    });

    document.getElementById('shop-npc-showcase')?.addEventListener('input', (e) => {
      const qtyInput = e.target.closest('[data-shop-buy-qty]');
      if (!qtyInput) return;
      const itemId = qtyInput.getAttribute('data-shop-buy-qty');
      const cardEl = qtyInput.closest('.fantasy-card');
      const buyBtn = cardEl?.querySelector(`[data-buy-item="${itemId}"]`);
      if (!buyBtn) return;

      const item = state.itemsCatalog.find((i) => i.id === itemId);
      const npcId = buyBtn.getAttribute('data-npc-id');
      const npcObj = state.npcs.find((n) => n.id === npcId);
      const stockObj = npcObj?.stock?.find((s) => s.itemId === itemId);
      if (!item) return;

      let unitPrice = Number(item.preco || 0);
      if (hasPermission('canManageShopNpcs')) {
        const inlinePriceInp = cardEl?.querySelector(`[data-shop-custom-price="${itemId}"]`);
        const inlineStr = inlinePriceInp ? inlinePriceInp.value.trim() : '';
        if (inlineStr !== '' && Number.isFinite(Number(inlineStr)) && Number(inlineStr) >= 0) {
          unitPrice = Math.round(Number(inlineStr));
        } else if (
          stockObj &&
          stockObj.customPrice !== undefined &&
          stockObj.customPrice !== null &&
          String(stockObj.customPrice).trim() !== ''
        ) {
          unitPrice = Math.max(0, Math.round(Number(stockObj.customPrice)));
        }
      } else if (
        stockObj &&
        stockObj.customPrice !== undefined &&
        stockObj.customPrice !== null &&
        String(stockObj.customPrice).trim() !== ''
      ) {
        unitPrice = Math.max(0, Math.round(Number(stockObj.customPrice)));
      }

      const rawQty = Math.floor(Number(qtyInput.value || 1));
      const maxStock = stockObj && !stockObj.infinite ? Math.max(1, Number(stockObj.quantity || 1)) : 999;
      const buyQty = Math.max(1, Math.min(maxStock, Number.isFinite(rawQty) ? rawQty : 1));
      const totalCost = unitPrice * buyQty;
      buyBtn.innerHTML = buyQty > 1 ? `<iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> Comprar (${buyQty}x • ${totalCost})` : `<iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> Comprar (${unitPrice})`;
    });

    document.getElementById('shop-npc-showcase')?.addEventListener('click', (e) => {
      const delNpcBtn = e.target.closest('[data-delete-npc]');
      if (delNpcBtn) {
        requestDeleteNpc(delNpcBtn.getAttribute('data-delete-npc'));
        return;
      }

      const editNpcBtn = e.target.closest('[data-edit-npc]');
      if (editNpcBtn) {
        const npc = state.npcs.find((n) => n.id === editNpcBtn.getAttribute('data-edit-npc'));
        if (npc) openNpcModal(npc);
        return;
      }

      const remItemBtn = e.target.closest('[data-remove-shop-item]');
      if (remItemBtn) {
        const itemId = remItemBtn.getAttribute('data-remove-shop-item');
        const npcId = remItemBtn.getAttribute('data-npc-id');
        removeShopItemFromNpc(npcId, itemId);
        return;
      }

      const buyBtn = e.target.closest('[data-buy-item]');
      if (!buyBtn) return;
      if (!isEffectiveMaster() && !hasPermission('shop_buy_sell') && !hasPermission('canBuyFromShop')) {
        showToast('Você não possui permissão para comprar itens na Loja!', 'warning');
        return;
      }
      const itemId = buyBtn.getAttribute('data-buy-item');
      const npcId = buyBtn.getAttribute('data-npc-id');
      const item = state.itemsCatalog.find((i) => i.id === itemId);
      const npcObj = state.npcs.find((n) => n.id === npcId);
      const stockObj = npcObj?.stock?.find((s) => s.itemId === itemId);
      const buyer = state.characters.find((c) => c.id === state.selectedBuyerCharId) || state.characters[0];
      if (!item || !buyer) {
        showToast('Crie ou selecione um personagem comprador primeiro!', 'warning');
        return;
      }
      if (!isEffectiveMaster() && !canEditCharacter(buyer) && !canEditInventory(buyer)) {
        showToast('Você só pode comprar itens para a sua própria ficha!', 'warning');
        return;
      }

      const cardEl = buyBtn.closest('.fantasy-card');
      const canManageShop = isEffectiveMaster() || hasPermission('shop_manage_npcs') || hasPermission('canManageShopNpcs');
      const inlinePriceInp = canManageShop ? cardEl?.querySelector(`[data-shop-custom-price="${itemId}"]`) : null;
      const inlineStr = inlinePriceInp ? inlinePriceInp.value.trim() : '';
      let finalUnitPrice = Number(item.preco || 0);
      if (canManageShop && inlineStr !== '' && Number.isFinite(Number(inlineStr)) && Number(inlineStr) >= 0) {
        finalUnitPrice = Math.round(Number(inlineStr));
      } else if (
        stockObj &&
        stockObj.customPrice !== undefined &&
        stockObj.customPrice !== null &&
        String(stockObj.customPrice).trim() !== ''
      ) {
        finalUnitPrice = Math.max(0, Math.round(Number(stockObj.customPrice)));
      }

      const qtyInp = cardEl?.querySelector(`[data-shop-buy-qty="${itemId}"]`);
      const rawQty = Math.floor(Number(qtyInp?.value || 1));
      const maxStock = stockObj && !stockObj.infinite ? Math.max(0, Number(stockObj.quantity || 0)) : 999;
      if (stockObj && !stockObj.infinite && maxStock <= 0) {
        showToast('Este item está esgotado neste mercador!', 'warning');
        return;
      }
      const buyQty = Math.max(1, Math.min(maxStock || 999, Number.isFinite(rawQty) && rawQty >= 1 ? rawQty : 1));
      const totalBuyPrice = finalUnitPrice * buyQty;

      const isShared = state.room.isSharedWallet !== false;
      const currentBalance = isShared ? state.room.sharedGold : buyer.gold || 0;
      if (currentBalance < totalBuyPrice) {
        showToast(`Saldo insuficiente! Necessário: ${totalBuyPrice} ${state.room.currencyName}.`, 'warning');
        return;
      }

      openConfirmModal({
        icon: '<iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon>',
        title: 'CONFIRMAR COMPRA NA LOJA',
        message: `Deseja comprar ${buyQty}x "${item.nome}" para ${buyer.name} por ${totalBuyPrice} ${state.room.currencyName} (${finalUnitPrice} cada)?`,
        confirmText: `<iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> <span>Comprar ${buyQty}x Agora</span>`,
        onConfirm: () => {
          commitMutation(
            (st, toasts) => {
              const bChar = st.characters.find((c) => c.id === buyer.id);
              const npc = st.npcs.find((n) => n.id === npcId);
              if (!bChar) return false;

              if (st.room.isSharedWallet !== false) {
                if (st.room.sharedGold < totalBuyPrice) return false;
                st.room.sharedGold -= totalBuyPrice;
              } else {
                if ((bChar.gold || 0) < totalBuyPrice) return false;
                bChar.gold -= totalBuyPrice;
              }

              const stockEntry = npc?.stock?.find((s) => s.itemId === item.id);
              if (stockEntry) {
                if (canManageShop && inlineStr !== '' && Number.isFinite(Number(inlineStr)) && Number(inlineStr) >= 0) {
                  stockEntry.customPrice = finalUnitPrice;
                }
                if (!stockEntry.infinite) {
                  stockEntry.quantity = Math.max(0, (stockEntry.quantity || 1) - buyQty);
                }
              }

              addItemsToCharacterInventory(bChar, item, buyQty);

              toasts.push(`${bChar.name} comprou ${buyQty}x ${item.nome} por ${totalBuyPrice} ${state.room.currencyName}!`);
              return true;
            },
            {
              actionType: 'ITEM_PURCHASE',
              targetEntity: `${buyer.name} ⬅ ${buyQty}x ${item.nome}`,
              summary: `${buyer.name} comprou ${buyQty}x ${item.nome} por ${totalBuyPrice} ${state.room.currencyName}.`,
            }
          );
        },
      });
    });

    // Aprovar / Recusar Vendas em Escrow (Apenas Mestre / quem possui permissão shop_approve_escrow / canApproveSales)
    document.getElementById('escrow-sales-list')?.addEventListener('click', (e) => {
      if (!isEffectiveMaster() && !hasPermission('shop_approve_escrow') && !hasPermission('canApproveSales')) return;
      const appBtn = e.target.closest('[data-approve-escrow]');
      const rejBtn = e.target.closest('[data-reject-escrow]');
      if (!appBtn && !rejBtn) return;

      const escrowId = (appBtn || rejBtn).getAttribute(appBtn ? 'data-approve-escrow' : 'data-reject-escrow');
      const approved = Boolean(appBtn);

      commitMutation(
        (st, toasts) => {
          const idx = (st.escrowSales || []).findIndex((s) => s.id === escrowId);
          if (idx === -1) return false;
          const sale = st.escrowSales[idx];
          const char = st.characters.find((c) => c.id === sale.charId);

          if (approved) {
            if (char) {
              char.inventory = (char.inventory || []).filter((i) => i.id !== sale.invItemId);
            }
            if (st.room.isSharedWallet !== false) {
              st.room.sharedGold = (st.room.sharedGold || 0) + (sale.salePrice || 0);
            } else if (char) {
              char.gold = (char.gold || 0) + (sale.salePrice || 0);
            }
            toasts.push(`Venda de ${sale.itemName} aprovada (+${sale.salePrice} ${st.room.currencyName})!`);
          } else {
            const inv = char?.inventory?.find((i) => i.id === sale.invItemId);
            if (inv) inv.status = 'IN_INVENTORY';
            toasts.push(`↩️ Venda de ${sale.itemName} recusada; item devolvido ao inventário.`);
          }

          st.escrowSales.splice(idx, 1);
          return true;
        },
        {
          actionType: approved ? 'ESCROW_APPROVED' : 'ESCROW_REJECTED',
          targetEntity: `Escrow ID: ${escrowId}`,
          summary: approved ? 'Venda aprovada e ouro creditado.' : 'Venda recusada pelo Mestre.',
        }
      );
    });

    // -------------------------------------------------------------------------
    // Eventos do Bestiário & Invocação de Inimigos
    // -------------------------------------------------------------------------
    document.getElementById('btn-create-enemy')?.addEventListener('click', () => {
      if (!isEffectiveMaster() && !hasPermission('bestiary_manage')) {
        showToast('Você não possui permissão para criar criaturas no Bestiário!', 'warning');
        return;
      }
      openEnemyForm();
    });

    document.getElementById('bestiary-search-input')?.addEventListener('input', (e) => {
      state.bestiarySearchQuery = e.target.value;
      state.bestiaryPage = 1;
      const clearBtn = document.getElementById('bestiary-clear-search-btn');
      if (clearBtn) {
        if (state.bestiarySearchQuery) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }
      renderBestiaryTab();
    });

    document.getElementById('bestiary-clear-search-btn')?.addEventListener('click', () => {
      const input = document.getElementById('bestiary-search-input');
      if (input) input.value = '';
      state.bestiarySearchQuery = '';
      state.bestiaryPage = 1;
      document.getElementById('bestiary-clear-search-btn')?.classList.add('hidden');
      renderBestiaryTab();
    });

    document.getElementById('btn-bestiary-prev')?.addEventListener('click', () => {
      if (state.bestiaryPage > 1) {
        state.bestiaryPage--;
        renderBestiaryTab();
      }
    });

    document.getElementById('btn-bestiary-next')?.addEventListener('click', () => {
      const isMaster = isEffectiveMaster();
      const canSeeHidden = isMaster || hasPermission('bestiary_view_hidden');
      const canSeeRevealed = isMaster || hasPermission('bestiary_view_revealed') || canSeeHidden;
      const visible = canSeeHidden
        ? (state.bestiary || [])
        : canSeeRevealed
        ? (state.bestiary || []).filter((b) => b.reveladoParaJogadores)
        : [];
      const q = (state.bestiarySearchQuery || '').trim().toLowerCase();
      const filtered = visible.filter((e) => (e.name || '').toLowerCase().includes(q));
      const totalPages = Math.max(1, Math.ceil(filtered.length / 6));
      if (state.bestiaryPage < totalPages) {
        state.bestiaryPage++;
        renderBestiaryTab();
      }
    });

    document.getElementById('bestiary-grid')?.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-toggle-reveal]');
      if (toggleBtn) {
        if (!isEffectiveMaster() && !hasPermission('bestiary_manage')) {
          showToast('Você não possui permissão para alterar a visibilidade de criaturas!', 'warning');
          return;
        }
        const id = toggleBtn.getAttribute('data-toggle-reveal');
        toggleEnemyReveal(id);
        return;
      }

      const spawnBtn = e.target.closest('[data-spawn-enemy]');
      if (spawnBtn) {
        if (!isEffectiveMaster() && !hasPermission('bestiary_summon')) {
          showToast('Você não possui permissão para trazer inimigos para a mesa!', 'warning');
          return;
        }
        const id = spawnBtn.getAttribute('data-spawn-enemy');
        const enemy = (state.bestiary || []).find((b) => b.id === id);
        if (enemy) spawnEnemyInstance(enemy);
        return;
      }

      const editBtn = e.target.closest('[data-edit-enemy]');
      if (editBtn) {
        if (!isEffectiveMaster() && !hasPermission('bestiary_manage')) {
          showToast('Você não possui permissão para editar criaturas do Bestiário!', 'warning');
          return;
        }
        const id = editBtn.getAttribute('data-edit-enemy');
        openEnemyForm(id);
        return;
      }

      const delBtn = e.target.closest('[data-delete-enemy]');
      if (delBtn) {
        if (!isEffectiveMaster() && !hasPermission('bestiary_manage')) {
          showToast('Você não possui permissão para excluir criaturas do Bestiário!', 'warning');
          return;
        }
        const id = delBtn.getAttribute('data-delete-enemy');
        deleteEnemy(id);
        return;
      }

      const skillsBtn = e.target.closest('[data-open-general-skills]');
      if (skillsBtn) {
        const id = skillsBtn.getAttribute('data-open-general-skills');
        const targetType = skillsBtn.getAttribute('data-target-type') || 'bestiary';
        openGeneralSkillsModal(id, targetType);
        return;
      }
    });

    // Botão "TRAZER INIMIGO" na aba Personagens
    document.getElementById('btn-spawn-enemy')?.addEventListener('click', () => {
      if (!isEffectiveMaster() && !hasPermission('bestiary_summon')) {
        showToast('Você não possui permissão para trazer inimigos para a mesa!', 'warning');
        return;
      }
      openSpawnEnemyModal();
    });

    // Controle de Batalha & Fila de Turnos
    document.getElementById('btn-battle-toggle')?.addEventListener('click', () => {
      handleBattleToggleClick();
    });

    document.getElementById('btn-battle-advance-turn')?.addEventListener('click', () => {
      advanceBattleTurn();
    });

    document.getElementById('btn-battle-sidebar-toggle-collapse')?.addEventListener('click', () => {
      state.battleSidebarCollapsed = true;
      renderBattleSidebar();
    });

    document.getElementById('btn-battle-sidebar-dock-tab')?.addEventListener('click', () => {
      state.battleSidebarCollapsed = false;
      renderBattleSidebar();
    });

    document.getElementById('btn-battle-charge-sub')?.addEventListener('click', () => {
      adjustBattleCharges(-1);
    });

    document.getElementById('btn-battle-charge-add')?.addEventListener('click', () => {
      adjustBattleCharges(1);
    });

    document.getElementById('btn-battle-edit-order')?.addEventListener('click', () => {
      openBattleOrderModal();
    });

    document.getElementById('btn-battle-add-all')?.addEventListener('click', () => {
      const queuedSet = new Set(battleOrderWorkingQueue);
      (state.characters || []).forEach((c) => {
        if (!queuedSet.has(c.id)) {
          battleOrderWorkingQueue.push(c.id);
        }
      });
      renderBattleOrderModalContent();
    });

    document.getElementById('btn-battle-clear-queue')?.addEventListener('click', () => {
      battleOrderWorkingQueue = [];
      renderBattleOrderModalContent();
    });

    document.getElementById('btn-confirm-battle-order')?.addEventListener('click', () => {
      handleConfirmBattleOrder();
    });

    // Pesquisa no modal de Trazer Inimigo
    document.getElementById('spawn-enemy-search')?.addEventListener('input', () => {
      renderSpawnEnemyList();
    });

    document.getElementById('spawn-enemy-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-spawn-from-modal]');
      if (btn) {
        const id = btn.getAttribute('data-spawn-from-modal');
        const enemy = (state.bestiary || []).find((b) => b.id === id);
        if (enemy) spawnEnemyInstance(enemy);
      }
    });

    // Submissão do Formulário de Inimigo (Criar / Editar)
    document.getElementById('form-enemy')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const enemyId = document.getElementById('enemy-form-id').value;
      const isEdit = Boolean(enemyId);

      const name = document.getElementById('enemy-name-input').value.trim();
      if (!name) {
        showToast('Informe o nome do inimigo!', 'warning');
        return;
      }

      const level = Math.max(1, parseInt(document.getElementById('enemy-level-input').value, 10) || 1);
      const reveladoParaJogadores = document.getElementById('enemy-revealed-input').checked;

      const maxHp = Math.max(1, parseInt(document.getElementById('enemy-max-hp').value, 10) || 100);
      const maxArmor = Math.max(0, parseInt(document.getElementById('enemy-max-armor').value, 10) || 0);
      const maxMana = Math.max(0, parseInt(document.getElementById('enemy-max-mana').value, 10) || 0);
      const regen = parseFloat(document.getElementById('enemy-regen').value) || 0;
      const defense = parseInt(document.getElementById('enemy-defense').value, 10) || 0;
      const attack = parseInt(document.getElementById('enemy-attack').value, 10) || 0;
      const arcana = parseInt(document.getElementById('enemy-arcana').value, 10) || 0;
      const santidade = parseInt(document.getElementById('enemy-santidade').value, 10) || 0;

      const attributes = {
        FORCA: Math.max(1, parseInt(document.getElementById('enemy-attr-forca').value, 10) || 10),
        DESTREZA: Math.max(1, parseInt(document.getElementById('enemy-attr-destreza').value, 10) || 10),
        INTELIGENCIA: Math.max(1, parseInt(document.getElementById('enemy-attr-inteligencia').value, 10) || 10),
        SABEDORIA: Math.max(1, parseInt(document.getElementById('enemy-attr-sabedoria').value, 10) || 10),
        LABIA: Math.max(1, parseInt(document.getElementById('enemy-attr-labia').value, 10) || 10),
      };

      const resistances = {};
      document.querySelectorAll('#enemy-resistances-grid [data-enemy-res]').forEach((input) => {
        const rName = input.getAttribute('data-enemy-res');
        const rMax = Math.max(0, parseInt(input.value, 10) || 100);
        resistances[rName] = { current: 0, max: rMax };
      });

      const generalSkills = document.getElementById('enemy-general-skills').value.trim();

      commitMutation(
        (st, toasts) => {
          if (!st.bestiary) st.bestiary = [];

          if (isEdit) {
            const idx = st.bestiary.findIndex((b) => b.id === enemyId);
            if (idx === -1) return false;
            st.bestiary[idx] = {
              ...st.bestiary[idx],
              name,
              level,
              reveladoParaJogadores,
              maxHp,
              maxArmor,
              maxMana,
              regen,
              defense,
              attack,
              arcana,
              santidade,
              attributes,
              resistances,
              generalSkills,
            };
            // Sincroniza reveladoParaJogadores e generalSkills para instâncias ativas na mesa
            (st.characters || []).forEach((c) => {
              if (c.bestiaryId === enemyId) {
                c.reveladoParaJogadores = reveladoParaJogadores;
                c.generalSkills = generalSkills;
              }
            });
            toasts.push(`Inimigo "${name}" atualizado no Bestiário.`);
          } else {
            const newEnemy = {
              id: `bestiary_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name,
              level,
              reveladoParaJogadores,
              maxHp,
              maxArmor,
              maxMana,
              regen,
              defense,
              attack,
              arcana,
              santidade,
              attributes,
              resistances,
              generalSkills,
            };
            st.bestiary.push(newEnemy);
            toasts.push(`Inimigo "${name}" cadastrado no Bestiário!`);
          }
          return true;
        },
        {
          actionType: isEdit ? 'BESTIARY_EDIT' : 'BESTIARY_CREATE',
          targetEntity: name,
          summary: `Inimigo ${name} ${isEdit ? 'atualizado' : 'criado'} no Bestiário.`,
        }
      );

      closeModal('modal-enemy-form');
      renderBestiaryTab();
    });

    // Salvar Habilidades Gerais no Modal
    document.getElementById('btn-save-general-skills')?.addEventListener('click', () => {
      const targetId = document.getElementById('general-skills-target-id').value;
      const targetType = document.getElementById('general-skills-target-type').value;
      const newText = (document.getElementById('general-skills-textarea').value || '').trim();

      commitMutation(
        (st, toasts) => {
          if (targetType === 'bestiary') {
            const e = (st.bestiary || []).find((b) => b.id === targetId);
            if (!e) return false;
            e.generalSkills = newText;
            toasts.push(`Habilidades Gerais de "${e.name}" atualizadas.`);
            (st.characters || []).forEach((c) => {
              if (c.bestiaryId === targetId) c.generalSkills = newText;
            });
            return true;
          } else {
            const c = (st.characters || []).find((x) => x.id === targetId);
            if (!c) return false;
            c.generalSkills = newText;
            toasts.push(`Habilidades Gerais de "${c.name}" atualizadas.`);
            return true;
          }
        },
        {
          actionType: 'SKILLS_UPDATE',
          targetEntity: 'Habilidades Gerais',
          summary: 'Habilidades Gerais de criatura atualizadas.',
        }
      );

      closeModal('modal-general-skills');
      renderBestiaryTab();
      renderCharactersTab();
    });

    // Rolador de Dados
    document.querySelectorAll('[data-roll-die]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sides = Number(btn.getAttribute('data-roll-die') || 20);
        const roll = Math.floor(Math.random() * sides) + 1;
        const box = document.getElementById('dice-roller-result');
        if (box) {
          box.innerHTML = `<iconify-icon icon="game-icons:rolling-dices"></iconify-icon> <strong>1d${sides}</strong> → Resultado: <span class="text-lg font-black gold-title">${roll}</span>`;
        }
      });
    });

    // -------------------------------------------------------------------------
    // Eventos de Missões & Recompensas em Lote
    // -------------------------------------------------------------------------
    const openBulkRewardModal = () => {
      if (!isEffectiveMaster() && !hasPermission('char_grant_xp')) {
        showToast('Você não possui permissão para conceder XP / Atributos em lote!', 'warning');
        return;
      }
      const box = document.getElementById('bulk-chars-checkboxes');
      if (box) {
        box.innerHTML = state.characters
          .map(
            (c) => `
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" data-bulk-char="${escapeHtml(c.id)}" checked />
            <span class="font-bold">${escapeHtml(c.name)} (Nv. ${c.level || 1})</span>
          </label>
        `
          )
          .join('');
      }
      openModal('modal-bulk-reward');
    };

    document.getElementById('btn-bulk-rewards')?.addEventListener('click', openBulkRewardModal);
    document.getElementById('btn-quests-bulk-xp')?.addEventListener('click', openBulkRewardModal);
    document.getElementById('btn-bulk-select-all')?.addEventListener('click', () => {
      document.querySelectorAll('#bulk-chars-checkboxes [data-bulk-char]').forEach((cb) => (cb.checked = true));
    });

    document.getElementById('form-bulk-reward')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isEffectiveMaster() && !hasPermission('char_grant_xp')) {
        showToast('Você não possui permissão para conceder XP / Atributos em lote!', 'warning');
        return;
      }
      const selectedIds = [];
      document.querySelectorAll('#bulk-chars-checkboxes [data-bulk-char]:checked').forEach((cb) => {
        selectedIds.push(cb.getAttribute('data-bulk-char'));
      });
      const xpVal = Math.max(0, Math.round(Number(document.getElementById('bulk-xp-input').value || 0)));
      const attrPts = Math.max(0, Math.round(Number(document.getElementById('bulk-attr-pts-input').value || 0)));
      const skillPts = Math.max(0, Math.round(Number(document.getElementById('bulk-skill-pts-input').value || 0)));
      const goldVal = Math.max(0, Math.round(Number(document.getElementById('bulk-gold-input').value || 0)));

      commitMutation(
        (st, toasts) => {
          if (goldVal > 0) {
            st.room.sharedGold = (st.room.sharedGold || 0) + goldVal;
          }
          for (const cid of selectedIds) {
            const c = st.characters.find((x) => x.id === cid);
            if (!c) continue;
            if (xpVal > 0) {
              const lvls = grantXpToCharacter(c, xpVal);
              if (lvls > 0) {
                toasts.push(`${c.name} subiu para o Nível ${c.level} (+${lvls * 2} Pts de Habilidade)!`);
              }
            }
            if (attrPts > 0) c.pendingAttributePoints = (c.pendingAttributePoints || 0) + attrPts;
            if (skillPts > 0) c.skillPoints = (c.skillPoints || 0) + skillPts;
          }
          toasts.push('Recompensas em lote entregues com sucesso!');
          return true;
        },
        {
          actionType: 'BULK_REWARD',
          targetEntity: `${selectedIds.length} Personagem(ns)`,
          summary: `Concedido +${xpVal} XP, +${attrPts} Pts Atributo, +${skillPts} Pts Hab e +${goldVal} ${state.room.currencyName}.`,
        }
      );
      closeModal('modal-bulk-reward');
    });

    const addQuestRewardItemRow = (container, itemId = '', qty = 1) => {
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'quest-reward-item-row flex items-center gap-2 p-2 rounded-lg bg-black/25 border app-divider-border';

      const optionsHtml = (state.itemsCatalog || [])
        .map((it) => `<option value="${escapeHtml(it.id)}" ${it.id === itemId ? 'selected' : ''}>${escapeHtml(it.nome)} (${it.tipo})</option>`)
        .join('');

      row.innerHTML = `
        <div class="flex-1 min-w-0">
          <select class="quest-reward-item-select w-full px-2.5 py-1.5 text-xs app-input">
            <option value="">Selecione um item...</option>
            ${optionsHtml}
          </select>
        </div>
        <div class="w-24 shrink-0">
          <div class="flex items-center gap-1">
            <span class="text-[10px] font-bold app-muted">Qtd:</span>
            <input type="number" min="1" step="1" value="${Math.max(1, Number(qty || 1))}" class="quest-reward-item-qty w-full px-2 py-1 text-xs font-mono font-bold app-input" />
          </div>
        </div>
        <button type="button" class="btn-remove-quest-reward-item w-7 h-7 rounded flex items-center justify-center app-secondary-btn text-rose-400 hover:bg-rose-500/20 shrink-0" title="Remover item">
          ✕
        </button>
      `;

      row.querySelector('.btn-remove-quest-reward-item')?.addEventListener('click', () => {
        row.remove();
      });

      container.appendChild(row);
    };

    const openQuestModal = (questId = null) => {
      const idInput = document.getElementById('quest-form-id');
      const titleInput = document.getElementById('quest-title-input');
      const descInput = document.getElementById('quest-desc-input');
      const goldInput = document.getElementById('quest-reward-gold');
      const xpInput = document.getElementById('quest-reward-xp');
      const attrInput = document.getElementById('quest-reward-attr');
      const skillInput = document.getElementById('quest-reward-skill');
      const container = document.getElementById('quest-reward-items-container');

      if (container) container.innerHTML = '';

      if (questId) {
        const q = (state.quests || []).find((x) => x.id === questId);
        if (!q) return;
        if (idInput) idInput.value = q.id;
        if (titleInput) titleInput.value = q.title || '';
        if (descInput) descInput.value = q.description || '';
        const rw = q.rewards || {};
        if (goldInput) goldInput.value = String(rw.gold ?? 0);
        if (xpInput) xpInput.value = String(rw.xp ?? 0);
        if (attrInput) attrInput.value = String(rw.attributePoints ?? 0);
        if (skillInput) skillInput.value = String(rw.skillPoints ?? 0);

        if (Array.isArray(rw.items) && rw.items.length > 0) {
          rw.items.forEach((it) => addQuestRewardItemRow(container, it.itemId, it.quantity));
        } else if (Array.isArray(rw.itemIds)) {
          rw.itemIds.forEach((id) => addQuestRewardItemRow(container, id, 1));
        }
      } else {
        if (idInput) idInput.value = '';
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        if (goldInput) goldInput.value = '200';
        if (xpInput) xpInput.value = '80';
        if (attrInput) attrInput.value = '0';
        if (skillInput) skillInput.value = '0';
      }

      openModal('modal-quest');
    };

    document.getElementById('btn-new-quest')?.addEventListener('click', () => {
      if (!isEffectiveMaster() && !hasPermission('mission_manage')) {
        showToast('Você não possui permissão para criar missões!', 'warning');
        return;
      }
      openQuestModal(null);
    });
    document.getElementById('btn-add-quest-reward-item')?.addEventListener('click', () => {
      addQuestRewardItemRow(document.getElementById('quest-reward-items-container'));
    });

    document.getElementById('form-quest')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isEffectiveMaster() && !hasPermission('mission_manage')) {
        showToast('Você não possui permissão para gerenciar missões!', 'warning');
        return;
      }
      const questId = document.getElementById('quest-form-id').value.trim();
      const title = document.getElementById('quest-title-input').value.trim() || 'Missão';
      const description = document.getElementById('quest-desc-input').value.trim();
      const gold = Math.max(0, Number(document.getElementById('quest-reward-gold').value || 0));
      const xp = Math.max(0, Number(document.getElementById('quest-reward-xp').value || 0));
      const attributePoints = Math.max(0, Number(document.getElementById('quest-reward-attr').value || 0));
      const skillPoints = Math.max(0, Number(document.getElementById('quest-reward-skill').value || 0));

      const rewardItems = [];
      document.querySelectorAll('#quest-reward-items-container .quest-reward-item-row').forEach((row) => {
        const sel = row.querySelector('.quest-reward-item-select');
        const qtyInput = row.querySelector('.quest-reward-item-qty');
        const itemId = sel?.value;
        const quantity = Math.max(1, Math.round(Number(qtyInput?.value || 1)));
        if (itemId) {
          rewardItems.push({ itemId, quantity });
        }
      });

      commitMutation(
        (st) => {
          if (questId) {
            const target = (st.quests || []).find((x) => x.id === questId);
            if (!target) return false;
            target.title = title;
            target.description = description;
            target.rewards = {
              gold,
              xp,
              attributePoints,
              skillPoints,
              items: rewardItems,
              itemIds: rewardItems.map((i) => i.itemId),
            };
          } else {
            st.quests = st.quests || [];
            st.quests.unshift({
              id: `quest_${Date.now()}`,
              title,
              description,
              status: 'PENDENTE',
              assignedCharacterIds: [],
              acceptedByCharacterId: null,
              acceptedByCharacterName: null,
              rewards: {
                gold,
                xp,
                attributePoints,
                skillPoints,
                items: rewardItems,
                itemIds: rewardItems.map((i) => i.itemId),
              },
              rewarded: false,
              createdAt: new Date().toLocaleString('pt-BR'),
            });
          }
          return true;
        },
        {
          actionType: questId ? 'QUEST_EDIT' : 'QUEST_CREATE',
          targetEntity: `Missão: ${title}`,
          summary: questId
            ? `Missão "${title}" atualizada com ${rewardItems.length} item(ns) de recompensa.`
            : `Missão "${title}" cadastrada no quadro com ${rewardItems.length} item(ns) de recompensa.`,
        }
      );
      closeModal('modal-quest');
      renderQuestsTab();
    });

    document.getElementById('btn-confirm-accept-quest')?.addEventListener('click', () => {
      if (!isEffectiveMaster() && !hasPermission('mission_accept') && !hasPermission('canAcceptQuests')) {
        showToast('Você não possui permissão para aceitar missões!', 'warning');
        return;
      }
      const qid = document.getElementById('accept-quest-id').value;
      const charId = document.getElementById('accept-quest-char-select').value;
      const selectedChar = (state.characters || []).find((c) => c.id === charId);
      if (!qid || !selectedChar) return;
      if (!isEffectiveMaster() && !isCharacterOwner(selectedChar) && !hasPermission('char_edit_others')) {
        showToast('Você só pode aceitar missões com o seu próprio personagem!', 'warning');
        return;
      }

      commitMutation(
        (st, toasts) => {
          const q = (st.quests || []).find((x) => x.id === qid);
          if (!q) return false;
          if (q.acceptedByCharacterId) {
            toasts.push('Esta missão já foi aceita anteriormente por outro personagem!');
            return false;
          }
          q.status = 'ACEITA';
          q.acceptedByCharacterId = selectedChar.id;
          q.acceptedByCharacterName = selectedChar.name;
          q.assignedCharacterIds = [selectedChar.id];
          toasts.push(`Missão "${q.title}" aceita por ${selectedChar.name}!`);
          return true;
        },
        {
          actionType: 'QUEST_ACCEPT',
          targetEntity: `Missão: ${document.getElementById('accept-quest-title').textContent}`,
          summary: `Missão aceita pelo personagem ${selectedChar.name}.`,
        }
      );
      closeModal('modal-accept-quest');
      renderQuestsTab();
    });

    const applyQuestStatusChange = (questId, newStatus) => {
      if (newStatus === 'CONCLUIDA') {
        if (!isEffectiveMaster() && !hasPermission('mission_approve')) {
          showToast('Você não possui permissão para concluir/aprovar missões!', 'warning');
          return;
        }
      } else {
        if (!isEffectiveMaster() && !hasPermission('mission_manage')) {
          showToast('Você não possui permissão para alterar o status desta missão!', 'warning');
          return;
        }
      }

      commitMutation(
        (st, toasts) => {
          const q = st.quests.find((x) => x.id === questId);
          if (!q) return false;
          q.status = newStatus;

          if (newStatus === 'PENDENTE') {
            q.acceptedByCharacterId = null;
            q.acceptedByCharacterName = null;
            q.assignedCharacterIds = [];
          }

          if (newStatus === 'CONCLUIDA' && !q.rewarded) {
            q.rewarded = true;
            const rw = q.rewards || {};

            // 1. Ouro: se compartilhado vai para a sala, senão reparte entre os jogadores
            if (rw.gold > 0) {
              if (st.room.isSharedWallet !== false) {
                st.room.sharedGold = (st.room.sharedGold || 0) + rw.gold;
              } else {
                const playerChars = (st.characters || []).filter((c) => !c.isEnemy);
                if (playerChars.length > 0) {
                  const split = Math.floor(rw.gold / playerChars.length);
                  playerChars.forEach((c) => {
                    c.gold = (c.gold || 0) + split;
                  });
                }
              }
            }

            // 2. XP e Pontos: vão para todos os personagens não-inimigos
            const allPlayerChars = (st.characters || []).filter((c) => !c.isEnemy);
            for (const c of allPlayerChars) {
              if (rw.xp > 0) grantXpToCharacter(c, rw.xp);
              if (rw.attributePoints > 0) c.pendingAttributePoints = (c.pendingAttributePoints || 0) + rw.attributePoints;
              if (rw.skillPoints > 0) c.skillPoints = (c.skillPoints || 0) + rw.skillPoints;
            }

            // 3. Itens: entregues diretamente ao inventário de quem aceitou a missão
            const acceptingChar = (st.characters || []).find((c) => c.id === q.acceptedByCharacterId) || allPlayerChars[0];

            const rewardItems = [];
            if (Array.isArray(rw.items) && rw.items.length > 0) {
              rw.items.forEach((it) => {
                if (it && it.itemId) rewardItems.push({ itemId: it.itemId, quantity: Math.max(1, Number(it.quantity || 1)) });
              });
            } else if (Array.isArray(rw.itemIds)) {
              rw.itemIds.forEach((id) => {
                if (id) rewardItems.push({ itemId: id, quantity: 1 });
              });
            }

            const deliveredSummary = [];
            if (acceptingChar) {
              acceptingChar.inventory = acceptingChar.inventory || [];
              for (const ri of rewardItems) {
                const tpl = (st.itemsCatalog || []).find((it) => it.id === ri.itemId);
                const count = Math.max(1, Math.round(Number(ri.quantity || 1)));
                if (!tpl) continue;

                // Regra de Empilhamento (Stacking)
                const existing = acceptingChar.inventory.find(
                  (inv) => inv.itemId === tpl.id && !inv.isEquipped && inv.status === 'IN_INVENTORY'
                );
                if (existing) {
                  existing.quantity = Math.max(1, Number(existing.quantity || 1)) + count;
                } else {
                  acceptingChar.inventory.push({
                    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${Math.random().toString(36).slice(2, 4)}`,
                    itemId: tpl.id,
                    quantity: count,
                    isEquipped: false,
                    status: 'IN_INVENTORY',
                  });
                }
                deliveredSummary.push(`${count}x ${tpl.nome}`);
              }
            }

            const itemsMsg = deliveredSummary.length > 0 ? ` Itens entregues a ${acceptingChar?.name || 'personagem'}: ${deliveredSummary.join(', ')}.` : '';
            toasts.push(`Missão "${q.title}" concluída! Recompensas entregues ao grupo.${itemsMsg}`);
          }
          return true;
        },
        {
          actionType: 'MISSION_REWARD',
          targetEntity: `Missão: ${questId}`,
          summary: `Status da missão alterado para ${newStatus}.`,
        }
      );
    };

    document.getElementById('quests-list-grid')?.addEventListener('click', (e) => {
      // Aceitar Missão
      const acceptBtn = e.target.closest('[data-action="open-accept-quest"]');
      if (acceptBtn) {
        if (!isEffectiveMaster() && !hasPermission('mission_accept') && !hasPermission('canAcceptQuests')) {
          showToast('Você não possui permissão para aceitar missões!', 'warning');
          return;
        }
        const qid = acceptBtn.getAttribute('data-quest-id');
        const q = (state.quests || []).find((x) => x.id === qid);
        if (!q) return;

        if (q.acceptedByCharacterId) {
          showToast(`Esta missão já foi aceita por ${q.acceptedByCharacterName || 'outro personagem'}.`, 'warning');
          return;
        }

        const playerChars = (state.characters || []).filter((c) => !c.isEnemy);
        if (playerChars.length === 0) {
          showToast('Nenhum personagem disponível para aceitar missões.', 'warning');
          return;
        }

        document.getElementById('accept-quest-id').value = q.id;
        document.getElementById('accept-quest-title').textContent = q.title;
        document.getElementById('accept-quest-desc').textContent = q.description;

        const charSelect = document.getElementById('accept-quest-char-select');
        const activeMem = getActiveMember();
        const myCharId = activeMem?.characterId;

        charSelect.innerHTML = playerChars
          .map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === myCharId ? 'selected' : ''}>${escapeHtml(c.name)} (Nível ${c.level || 1})</option>`)
          .join('');

        openModal('modal-accept-quest');
        return;
      }

      // Editar Missão
      const editBtn = e.target.closest('[data-edit-quest]');
      if (editBtn) {
        if (!isEffectiveMaster() && !hasPermission('mission_manage')) {
          showToast('Você não possui permissão para editar missões!', 'warning');
          return;
        }
        openQuestModal(editBtn.getAttribute('data-edit-quest'));
        return;
      }

      // Concluir ou alterar status via botão direto
      const stBtn = e.target.closest('[data-quest-status]');
      if (stBtn) {
        applyQuestStatusChange(stBtn.getAttribute('data-quest-status'), stBtn.getAttribute('data-status'));
        return;
      }

      // Excluir Missão
      const delBtn = e.target.closest('[data-delete-quest]');
      if (delBtn) {
        if (!isEffectiveMaster() && !hasPermission('mission_manage')) {
          showToast('Você não possui permissão para excluir missões!', 'warning');
          return;
        }
        const qid = delBtn.getAttribute('data-delete-quest');
        commitMutation((st) => {
          st.quests = st.quests.filter((q) => q.id !== qid);
          return true;
        });
      }
    });

    document.getElementById('quests-list-grid')?.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-quest-select-status]');
      if (sel) {
        applyQuestStatusChange(sel.getAttribute('data-quest-select-status'), sel.value);
      }
    });

    // Filtros de Auditoria Perpétua
    document.getElementById('audit-filter-type')?.addEventListener('change', (e) => {
      state.auditFilterType = e.target.value;
      renderAdminTab();
    });

    document.getElementById('audit-filter-user')?.addEventListener('change', (e) => {
      state.auditFilterUser = e.target.value;
      renderAdminTab();
    });

    document.getElementById('audit-filter-search')?.addEventListener('input', (e) => {
      state.auditFilterSearch = e.target.value;
      renderAdminTab();
    });

    document.getElementById('btn-audit-clear-filters')?.addEventListener('click', () => {
      state.auditFilterType = 'ALL';
      state.auditFilterUser = 'ALL';
      state.auditFilterSearch = '';
      const s = document.getElementById('audit-filter-search');
      if (s) s.value = '';
      renderAdminTab();
    });

    // -------------------------------------------------------------------------
    // Eventos de Administração & Configurações da Sala
    // -------------------------------------------------------------------------
    document.getElementById('form-room-settings')?.addEventListener('submit', (e) => {
      e.preventDefault();
      commitMutation(
        (st, toasts) => {
          st.room.name = document.getElementById('cfg-room-name').value.trim() || 'SALA1';
          st.room.subtitle = document.getElementById('cfg-room-subtitle').value.trim();
          st.room.currencyName = document.getElementById('cfg-currency-name').value.trim() || 'Ouro';
          st.room.isSharedWallet = document.getElementById('cfg-wallet-mode').value === 'SHARED';
          st.room.statModifierPrecedence = document.getElementById('cfg-precedence').value;
          st.room.roundingMode = document.getElementById('cfg-rounding').value;
          st.room.unlimitedInventory = document.getElementById('cfg-inv-unlimited').value === 'true';
          st.room.inventoryLimit = Math.max(1, Number(document.getElementById('cfg-inv-limit').value || 10));
          st.room.quote = document.getElementById('cfg-room-quote').value;
          toasts.push('Configurações da campanha salvas e aplicadas!');
          return true;
        },
        {
          actionType: 'ROOM_SETTINGS',
          targetEntity: 'Configurações da Sala',
          summary: 'Configurações matemáticas e gerais da campanha atualizadas.',
        }
      );
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(state.room?.name || 'cmrpg').toLowerCase()}_backup.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Fechar modais e confirmação
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
    });
    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
      bd.addEventListener('mousedown', (e) => {
        if (e.target === bd) closeModal(bd.id);
      });
    });

    document.getElementById('btn-confirm-cancel')?.addEventListener('click', () => {
      state.confirmCallback = null;
      closeModal('modal-confirm');
    });
    document.getElementById('btn-confirm-ok')?.addEventListener('click', () => {
      const cb = state.confirmCallback;
      state.confirmCallback = null;
      closeModal('modal-confirm');
      if (typeof cb === 'function') cb();
    });

    // Atalhos de Teclado (Ctrl+Z, Ctrl+Y, Escape)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!document.getElementById('modal-confirm')?.classList.contains('hidden')) {
          closeModal('modal-confirm');
          return;
        }
        if (!document.getElementById('modal-single-resistance')?.classList.contains('hidden')) {
          closeModal('modal-single-resistance');
          return;
        }
        document.querySelectorAll('.modal-backdrop').forEach((m) => closeModal(m.id));
      }

      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        triggerUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        triggerRedo();
      }
    });
  }

  // ===========================================================================
  // Inicialização
  // ===========================================================================
  function init() {
    initTheme();
    loadInitialLocalFallback();
    bindEvents();
    initMultiplayerCursorsTracking();
    renderAll();
    updateHistoryButtonsUI();
    connectWebSocket();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

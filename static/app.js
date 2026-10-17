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
    { name: 'Cegueira', icon: '<iconify-icon icon="game-icons:blindfold" style="color: #94a3b8;"></iconify-icon>', barClass: 'from-slate-500 to-zinc-400', textClass: 'text-slate-400' },
  ];

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

    // UI Filters & Selections
    searchQuery: '',
    memberSearchQuery: '',
    memberRoleFilter: 'ALL',
    catalogTypeFilter: 'ALL',
    catalogSearchQuery: '',
    npcModalTypeFilter: 'ALL',
    selectedShopNpcId: null,
    selectedBuyerCharId: null,

    // Modals & Operations state
    activeResistanceCharId: null,
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
    char.armorDegradation = Math.max(0, Number(char.armorDegradation || 0));

    const effMaxHp = Math.max(1, computeStatWithModifiers(char.baseMaxHp, flatMods.VIDA, pctMods.VIDA));
    const effMaxArmorRaw = Math.max(0, computeStatWithModifiers(char.baseMaxArmor, flatMods.ARMADURA, pctMods.ARMADURA));
    const effMaxArmor = Math.max(0, effMaxArmorRaw - char.armorDegradation);
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

  function evaluateDamagePipelineClient(attacker, target, isTrueDamage, degradeArmorOnOverload) {
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
      if (degradeArmorOnOverload && maxArmor > 0) {
        armorDegradedBy = Math.min(maxArmor, overflow);
      }
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
          permissions: { preset: 'JOGADOR_COMUM', canCreateCharacters: true, canViewOtherInventories: true },
        }
      );
    }
    return (
      state.members.find((m) => m.id === state.localMemberId || (state.localClientIp && m.ip === state.localClientIp)) ||
      state.members.find((m) => m.role === 'JOGADOR') ||
      state.members[0]
    );
  }

  function hasPermission(permKey) {
    if (isEffectiveMaster()) return true;
    const member = getActiveMember();
    return Boolean(member?.permissions?.[permKey]);
  }

  function canEditCharacter(char) {
    if (!char) return false;
    if (isEffectiveMaster()) return true;
    if (hasPermission('canEditOtherCharacters')) return true;

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
        permissions: {
          preset: 'MESTRE_TOTAL',
          canCreateCharacters: true,
          canEditOtherCharacters: true,
          canManageItemsCatalog: true,
          canManageShopNpcs: true,
          canApproveSales: true,
          canManageGold: true,
          canManageQuests: true,
          canViewOtherInventories: true,
        },
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
        permissions: {
          preset: 'MESTRE_TOTAL',
          canCreateCharacters: true,
          canEditOtherCharacters: true,
          canManageItemsCatalog: true,
          canManageShopNpcs: true,
          canApproveSales: true,
          canManageGold: true,
          canManageQuests: true,
          canViewOtherInventories: true,
        },
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
      battle: state.battle,
      quests: state.quests,
    });
  }

  function restoreCoreState(snap) {
    for (const k of ['room', 'members', 'characters', 'itemsCatalog', 'npcs', 'escrowSales', 'battle', 'quests']) {
      if (snap[k] !== undefined) state[k] = deepClone(snap[k]);
    }
    state.characters.forEach(recalculateCharacterDerived);
  }

  function updateHistoryButtonsUI() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const canUndo = state.wsConnected ? state.serverCanUndo : state.undoStack.length > 0;
    const canRedo = state.wsConnected ? state.serverCanRedo : state.redoStack.length > 0;
    if (btnUndo) btnUndo.disabled = !canUndo;
    if (btnRedo) btnRedo.disabled = !canRedo;
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
          battle: state.battle,
          quests: state.quests,
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
    return CURSOR_COLOR_PALETTE.some((c) => c.hex.toUpperCase() === upper);
  }

  function normalizePaletteColor(hex) {
    if (!hex) return null;
    const upper = String(hex).trim().toUpperCase();
    const found = CURSOR_COLOR_PALETTE.find((c) => c.hex.toUpperCase() === upper);
    return found ? found.hex : null;
  }

  function getColorNameByHex(hex) {
    const norm = normalizePaletteColor(hex);
    const found = CURSOR_COLOR_PALETTE.find((c) => c.hex === norm);
    return found ? found.name : 'Cor Personalizada';
  }

  function assignPermanentMemberCursorColor(memberKey, preferredHex = null, usedHexList = []) {
    const key = String(memberKey || 'player').trim();
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

    let baseIdx = 0;
    if (key === 'host_master') {
      baseIdx = 3; // Amarelo Ouro (#F59E0B) por padrão para o Mestre
    } else {
      let h = 0;
      for (let i = 0; i < key.length; i++) {
        h = (h * 31 + key.charCodeAt(i)) >>> 0;
      }
      baseIdx = h % CURSOR_COLOR_PALETTE.length;
    }

    const usedSet = new Set((usedHexList || []).map((c) => String(c || '').toUpperCase()));
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
      const key = m.id || (m.ip ? `ip_${m.ip}` : 'host_master');
      const assigned = assignPermanentMemberCursorColor(key, m.cursorColor, used);
      m.cursorColor = assigned;
      used.push(assigned);
    }
  }

  function getLocalPlayerCursorIdentity() {
    const activeMem = getActiveMember();
    const memberKey = activeMem?.id || state.localMemberId || `ip_${state.localClientIp}`;
    const color = assignPermanentMemberCursorColor(memberKey, activeMem?.cursorColor);
    if (activeMem && !activeMem.cursorColor) {
      activeMem.cursorColor = color;
    }
    const isMaster = isEffectiveMaster();
    const rawNick = (activeMem?.nickname || activeMem?.name || '').trim();
    const nickname = rawNick || (isMaster ? 'Mestre' : `Jogador (${state.localClientIp})`);
    return {
      clientId: getOrAssignLocalCursorClientId(),
      memberId: memberKey,
      nickname,
      color,
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

    let el = cursor.el;
    if (!el || !layer.contains(el)) {
      el = document.createElement('div');
      el.className = 'remote-cursor cursor-hidden';
      el.setAttribute('data-cursor-id', cursor.cursorId);
      el.innerHTML = `
        <svg class="remote-cursor-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            class="remote-cursor-arrow-path"
            d="M4.2 2.6L19.8 11.1C20.7 11.6 20.5 13.0 19.5 13.2L12.6 14.7L9.3 20.9C8.8 21.8 7.4 21.6 7.2 20.6L3.0 4.0C2.8 2.9 3.4 2.1 4.2 2.6Z"
            fill="${escapeHtml(cursor.color)}"
            stroke="#FFFFFF"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
        <div class="remote-cursor-badge">
          <span class="remote-cursor-badge-dot"></span>
          <span class="remote-cursor-badge-name"></span>
        </div>
      `;
      layer.appendChild(el);
      cursor.el = el;
    }

    el.style.setProperty('--cursor-color', cursor.color);
    const arrowPath = el.querySelector('.remote-cursor-arrow-path');
    if (arrowPath) arrowPath.setAttribute('fill', cursor.color);
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
        .map(
          (c) => `
          <span
            class="sidebar-cursor-pill"
            style="--cursor-color: ${escapeHtml(c.color)}"
            title="${escapeHtml(c.nickname)} está em ${TAB_TITLES[tabId] || tabId}"
          >
            <span class="sidebar-cursor-pill-dot"></span>
            <span>${escapeHtml(c.nickname)}</span>
          </span>
        `
        )
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
        if (mem.nickname && mem.nickname.trim()) {
          cursor.nickname = mem.nickname.trim();
        }
        if (mem.cursorColor) {
          cursor.color = normalizePaletteColor(mem.cursorColor) || cursor.color;
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
    const resolvedColor =
      normalizePaletteColor(memberObj?.cursorColor) ||
      normalizePaletteColor(data.color) ||
      assignPermanentMemberCursorColor(data.memberId || cursorId);
    const resolvedNickname =
      (memberObj?.nickname && memberObj.nickname.trim()) ||
      String(data.nickname || '').trim() ||
      (data.isHost ? 'Mestre' : `Jogador (${data.ip || ''})`);

    let existing = state.remoteCursors.get(cursorId);
    if (!existing) {
      existing = {
        cursorId,
        connId: data.connId || '',
        memberId: data.memberId || '',
        ip: data.ip || '',
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
            if (data.battle) state.battle = data.battle;
            if (Array.isArray(data.quests)) state.quests = data.quests;
            if (Array.isArray(data.auditLog)) state.auditLog = data.auditLog;

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
    combat: 'COMBATE & TURNOS',
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
              <span class="w-2.5 h-2.5 rounded-full shrink-0 border border-white/50" style="background-color: ${escapeHtml(cursorColor)}" title="Cor do Cursor: ${escapeHtml(getColorNameByHex(cursorColor))}"></span>
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
                  ? 'bg-amber-500/20 border-amber-400/60'
                  : 'bg-amber-500/10 border-amber-500/30'
              } border flex items-center justify-center text-base shrink-0" style="box-shadow: 0 0 0 2px ${escapeHtml(memberCursorColor)}44;">
                ${isMasterRole ? '<iconify-icon icon="game-icons:crown" class="gold-title"></iconify-icon>' : '<iconify-icon icon="game-icons:hooded-figure"></iconify-icon>'}
              </div>
              <div>
                <div class="font-bold text-sm app-title flex flex-wrap items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-white/50" style="background-color: ${escapeHtml(memberCursorColor)}" title="Cor do Cursor: ${escapeHtml(getColorNameByHex(memberCursorColor))}"></span>
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
      return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    grid.classList.remove('hidden');

    grid.innerHTML = filtered
      .map((char) => {
        const hpPct = calcPercentage(char.hp, char.maxHp);
        const armorPct = calcPercentage(char.armor, char.maxArmor);
        const manaPct = calcPercentage(char.mana, char.maxMana);
        const xpPct = calcPercentage(char.xp, char.xpNext || 80);

        const hpOverflow = char.hp > char.maxHp;
        const armorOverflow = char.armor > char.maxArmor;
        const manaOverflow = char.mana > char.maxMana;

        let activeResCount = 0;
        let maxedResCount = 0;
        const activeResBadges = [];
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

        const resChipsHtml =
          activeResBadges.length > 0
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
          Number(char.pendingAttributePoints || 0) > 0
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
                <span>PERSONAGEM MORTO (0 HP)</span>
              </span>
              ${
                isEffectiveMaster()
                  ? `<button type="button" data-action="open-revive" data-char-id="${escapeHtml(char.id)}" class="px-2.5 py-1 rounded text-[11px] font-extrabold btn-gold flex items-center gap-1"><iconify-icon icon="game-icons:sparkles"></iconify-icon> <span>Reviver</span></button>`
                  : ''
              }
            </div>`
          : '';

        const weight = char.derived?.totalWeight ?? 0;
        const maxWeight = Number.isFinite(Number(char.maxWeight)) ? Number(char.maxWeight) : 27;
        const isOverweight = weight > maxWeight;
        const canEdit = canEditCharacter(char);
        const ownerMem =
          (state.members || []).find(
            (m) => m.id === char.ownerMemberId || (char.ownerIp && m.ip === char.ownerIp) || m.characterId === char.id
          ) || null;
        const ownerLabel = ownerMem
          ? ownerMem.nickname?.trim() || ownerMem.name || ownerMem.ip
          : char.ownerIp || 'Mestre';

        return `
        <article
          class="char-card p-4 sm:p-5 flex flex-col justify-between gap-3.5 relative ${char.isDead ? 'border-red-500/50 opacity-90' : ''}"
          data-char-id="${escapeHtml(char.id)}"
        >
          <!-- Topo: Nome Arrastável + Nível/XP + Botões Flutuantes (Histórico, Inventário, Consumíveis, Editar) -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <div
                  class="char-drag-handle inline-flex items-center gap-2 px-2 py-0.5 -ml-2 rounded-lg hover:bg-amber-500/10 transition group max-w-full"
                  data-drag-char-id="${escapeHtml(char.id)}"
                  title="Clique e segure no nome para arrastar e reordenar"
                >
                  <span class="text-xs opacity-40 group-hover:opacity-90 shrink-0">⠿</span>
                  <h2 class="font-serif-fantasy text-lg sm:text-xl font-black tracking-wide truncate app-title">
                    ${escapeHtml(char.name)}
                  </h2>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-amber-500/15 gold-title border border-amber-500/30 shrink-0">
                  NV. ${char.level || 1}
                </span>
              </div>

              <!-- Barra compacta de XP + Dono/IP -->
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

              <!-- Indicadores Táticos: PA, Defesa, Regen, Ataque, Carga -->
              <div class="flex flex-wrap items-center gap-1.5 mt-2">
                <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  <iconify-icon icon="game-icons:lightning-branches"></iconify-icon> PA: ${char.pa}/${char.maxPa}
                </span>
                <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <iconify-icon icon="game-icons:dragon-shield"></iconify-icon> DEF: ${char.defense}
                </span>
                <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/25">
                  <iconify-icon icon="game-icons:fairy-wand" class="icon-mana"></iconify-icon> REGEN: ${char.regen}%
                </span>
                <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  isOverweight
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                    : 'bg-black/25 app-muted border app-divider-border'
                }">
                  <iconify-icon icon="game-icons:weight"></iconify-icon> ${weight}/${maxWeight}kg
                </span>
              </div>
            </div>

            <!-- Botões Flutuantes no Canto Superior Direito -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-action="open-sheet"
                data-char-id="${escapeHtml(char.id)}"
                title="${canEdit ? 'Abrir Ficha Completa, 5 Atributos e Habilidades' : 'Visualizar Ficha do Personagem'}"
                class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn transition"
              >
                <iconify-icon icon="game-icons:tied-scroll"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="open-inventory"
                data-char-id="${escapeHtml(char.id)}"
                title="${canEdit ? 'Abrir Inventário 3x(Infinito) com Filtros e Pesquisa' : 'Visualizar Inventário'}"
                class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn transition"
              >
                <iconify-icon icon="game-icons:knapsack"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="open-resistances"
                data-char-id="${escapeHtml(char.id)}"
                title="Painel das 7 Resistências"
                class="relative w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn transition"
              >
                <iconify-icon icon="game-icons:alembic"></iconify-icon>
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
                      class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn transition"
                    >
                      <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
                    </button>`
                  : ''
              }
            </div>
          </div>

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
                  ${char.hp} <span class="opacity-50">/ ${char.maxHp}</span>
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
                  ${
                    char.armorDegradation > 0
                      ? `<span class="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40" title="Armadura Máxima degradada por sobrecarga até o fim da batalha">-${char.armorDegradation} DEGRAD.</span>`
                      : ''
                  }
                  ${armorOverflow ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/40">OVERFLOW</span>' : ''}
                </span>
                <span class="font-mono font-extrabold text-sm ${armorOverflow ? 'text-amber-400' : 'app-title'}">
                  ${char.armor} <span class="opacity-50">/ ${char.maxArmor}</span>
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
                  ${char.mana} <span class="opacity-50">/ ${char.maxMana}</span>
                </span>
              </div>
              <div class="stat-bar-track h-3 rounded-full ${manaOverflow ? 'stat-overflow-glow' : ''}">
                <div class="stat-bar-fill stat-bar-mana" style="width: ${manaPct}%"></div>
              </div>
            </div>

            ${resChipsHtml}
          </div>

          <!-- 6 Botões Rápidos (Action Pills) -->
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
        </article>
      `;
      })
      .join('');
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

    const canManage = hasPermission('canManageItemsCatalog');

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

            <p class="text-xs app-muted leading-relaxed">${escapeHtml(it.descricao || 'Sem descrição.')}</p>

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
              canManage
                ? `
              <button type="button" data-grant-item="${escapeHtml(it.id)}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold btn-gold-outline">
                <iconify-icon icon="game-icons:chest"></iconify-icon> <span>Conceder Item</span>
              </button>
              <div class="flex items-center gap-1">
                <button type="button" data-edit-item="${escapeHtml(it.id)}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold app-secondary-btn"><iconify-icon icon="game-icons:quill-ink"></iconify-icon></button>
                <button type="button" data-delete-item="${escapeHtml(it.id)}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-400 app-secondary-btn"><iconify-icon icon="game-icons:crowned-skull"></iconify-icon></button>
              </div>
            `
                : `<span class="text-[11px] app-muted">Catálogo da Campanha</span>`
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
            <p class="text-xs app-muted mt-2">${escapeHtml(item.descricao || '')}</p>
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
  // ABA 5: COMBATE & TURNOS
  // ---------------------------------------------------------------------------
  function renderCombatTab() {
    const b = state.battle || {};
    const statusPill = document.getElementById('battle-status-pill');
    const toggleBtn = document.getElementById('btn-toggle-battle');

    if (statusPill) {
      if (b.isActive) {
        statusPill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white animate-pulse';
        statusPill.innerHTML = '<iconify-icon icon="game-icons:ifrit" style="color: #f97316;"></iconify-icon> <span>EM BATALHA</span>';
      } else {
        statusPill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-600';
        statusPill.textContent = 'FORA DE COMBATE';
      }
    }

    if (toggleBtn) {
      toggleBtn.innerHTML = b.isActive ? '<iconify-icon icon="game-icons:white-flag"></iconify-icon> <span>Encerrar Combate (Restaurar Armaduras)</span>' : '<iconify-icon icon="game-icons:crossed-swords"></iconify-icon> <span>Iniciar Combate</span>';
      toggleBtn.className = b.isActive
        ? 'master-only-el px-4 py-2.5 rounded-lg font-serif-fantasy font-extrabold text-xs uppercase tracking-wider bg-amber-700 hover:bg-amber-600 text-white border border-amber-400/50 shadow-lg transition'
        : 'master-only-el px-4 py-2.5 rounded-lg font-serif-fantasy font-extrabold text-xs uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white border border-red-400/50 shadow-lg transition';
      if (!isEffectiveMaster()) toggleBtn.classList.add('hidden');
    }

    const setTxt = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(v);
    };
    setTxt('battle-round-num', b.roundNumber || 1);
    setTxt('battle-total-turns', b.totalTurnsCount || 0);
    setTxt('battle-master-turns', b.masterTurnsCount || 0);
    setTxt('battle-group-charges', b.groupCharges || 0);

    const listEl = document.getElementById('initiative-list-container');
    if (!listEl) return;

    const order = b.participantsOrder || [];
    const charsById = {};
    for (const c of state.characters) charsById[c.id] = c;

    listEl.innerHTML = order
      .map((p, idx) => {
        const isCurrentTurn = b.isActive && idx === (b.currentTurnIndex || 0);
        const charObj = !p.isMaster ? charsById[p.id] : null;
        const isDead = charObj ? charObj.isDead : Boolean(p.isDead);

        return `
        <div class="p-3.5 rounded-xl border transition flex flex-wrap items-center justify-between gap-3 ${
          isCurrentTurn
            ? 'bg-amber-500/15 border-amber-400 shadow-lg'
            : 'bg-black/25 app-divider-border'
        } ${isDead ? 'opacity-60 border-red-500/40' : ''}">
          <div class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
              isCurrentTurn ? 'bg-amber-400 text-black' : 'bg-black/40 app-muted'
            }">
              #${idx + 1}
            </span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-serif-fantasy font-bold text-sm app-title">
                  ${p.isMaster ? '<iconify-icon icon="game-icons:crown"></iconify-icon> ' : '<iconify-icon icon="game-icons:crossed-swords"></iconify-icon> '}${escapeHtml(charObj ? charObj.name : p.name)}
                </span>
                ${
                  isCurrentTurn
                    ? '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-black uppercase">▶ VEZ ATIVA</span>'
                    : ''
                }
                ${isDead ? '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white flex items-center gap-1"><iconify-icon icon="game-icons:crowned-skull"></iconify-icon> MORTO</span>' : ''}
              </div>
              <div class="text-[11px] font-mono app-muted mt-0.5">
                Iniciativa: <strong>${p.initiativeRoll ?? '-'}</strong> • Turnos Jogados: <strong>${p.turnsTaken || 0}</strong>
                ${
                  charObj
                    ? ` • <iconify-icon icon="game-icons:heart-bottle" class="icon-hp"></iconify-icon> ${charObj.hp}/${charObj.maxHp} • <iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon> ${charObj.armor}/${charObj.maxArmor} • <iconify-icon icon="game-icons:lightning-branches"></iconify-icon> PA ${charObj.pa}/${charObj.maxPa}`
                    : ''
                }
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            ${
              charObj && !isDead
                ? `<button type="button" data-spend-pa="${escapeHtml(charObj.id)}" class="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500/15 gold-title border border-amber-500/30" title="Gastar 1 Ponto de Ação (PA)">-1 PA</button>`
                : ''
            }
            ${
              charObj
                ? `<button type="button" data-action="pill-damage" data-char-id="${escapeHtml(charObj.id)}" class="px-2.5 py-1 rounded text-[11px] font-bold action-pill-damage flex items-center gap-1"><iconify-icon icon="game-icons:broadsword" class="icon-dmg"></iconify-icon> <span>Dano</span></button>`
                : ''
            }
            ${
              charObj && isDead && isEffectiveMaster()
                ? `<button type="button" data-action="open-revive" data-char-id="${escapeHtml(charObj.id)}" class="px-2.5 py-1 rounded text-[11px] font-bold btn-gold flex items-center gap-1"><iconify-icon icon="game-icons:sparkles"></iconify-icon> <span>Reviver</span></button>`
                : ''
            }
            ${
              isEffectiveMaster()
                ? `
              <button type="button" data-move-init="${idx}" data-dir="-1" class="w-7 h-7 rounded app-icon-btn text-xs" title="Subir na iniciativa">↑</button>
              <button type="button" data-move-init="${idx}" data-dir="1" class="w-7 h-7 rounded app-icon-btn text-xs" title="Descer na iniciativa">↓</button>
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

    const canManage = hasPermission('canManageQuests');
    const itemsById = {};
    for (const it of state.itemsCatalog) itemsById[it.id] = it;

    if ((state.quests || []).length === 0) {
      grid.innerHTML = `<div class="col-span-full py-12 text-center app-muted">Nenhuma missão cadastrada.</div>`;
      return;
    }

    grid.innerHTML = state.quests
      .map((q) => {
        const rw = q.rewards || {};
        const rewardItemNames = (rw.itemIds || [])
          .map((id) => itemsById[id]?.nome)
          .filter(Boolean)
          .join(', ');

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
                q.status === 'PENDENTE'
                  ? `<button type="button" data-quest-status="${escapeHtml(q.id)}" data-status="ACEITA" class="px-3 py-1.5 rounded-lg font-bold btn-gold">Aceitar Missão</button>`
                  : ''
              }
              ${
                canManage && q.status !== 'CONCLUIDA'
                  ? `<button type="button" data-quest-status="${escapeHtml(q.id)}" data-status="CONCLUIDA" class="px-3 py-1.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"><iconify-icon icon="game-icons:check-mark"></iconify-icon> <span>Concluir &amp; Premiar</span></button>`
                  : ''
              }
            </div>

            ${
              canManage
                ? `
              <div class="flex items-center gap-1.5">
                <select data-quest-select-status="${escapeHtml(q.id)}" class="px-2 py-1 app-input text-[11px] font-bold">
                  ${['PENDENTE', 'ACEITA', 'EM_PROGRESSO', 'PAUSADA', 'CONCLUIDA', 'RECUSADA', 'CANCELADA']
                    .map((st) => `<option value="${st}" ${q.status === st ? 'selected' : ''}>${st}</option>`)
                    .join('')}
                </select>
                <button type="button" data-delete-quest="${escapeHtml(q.id)}" class="px-2 py-1 rounded app-secondary-btn text-rose-400"><iconify-icon icon="game-icons:crowned-skull"></iconify-icon></button>
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
  // ABA 7: ADMINISTRAÇÃO & AUDITORIA PERPÉTUA
  // ---------------------------------------------------------------------------
  function renderAdminTab() {
    const r = state.room || {};
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = String(v ?? '');
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

    const logEl = document.getElementById('audit-log-container');
    if (!logEl) return;

    const logs = state.auditLog || [];
    if (logs.length === 0) {
      logEl.innerHTML = `<div class="p-6 text-center app-muted">Nenhum evento auditado ainda.</div>`;
      return;
    }

    logEl.innerHTML = logs
      .map(
        (entry) => `
      <div class="p-3 rounded-xl bg-black/25 border app-divider-border text-xs space-y-1">
        <div class="flex items-center justify-between">
          <span class="font-mono font-bold gold-title">[${escapeHtml(entry.actionType)}] ${escapeHtml(entry.targetEntity || '')}</span>
          <span class="text-[10px] font-mono app-muted">${escapeHtml(entry.createdAt || '')}</span>
        </div>
        <p class="app-label">${escapeHtml(entry.summary || '')}</p>
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
    renderCombatTab();
    renderQuestsTab();
    renderAdminTab();
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

    document.getElementById('btn-delete-char')?.classList.remove('hidden');
    openModal('modal-char-form');
  }

  function handleCharacterFormSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('char-form-id').value.trim();
    if (charId) {
      const existingChar = state.characters.find((c) => c.id === charId);
      if (existingChar && !canEditCharacter(existingChar)) {
        showToast('Você só pode editar fichas de personagens criados por você!');
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
    const overload = document.getElementById('pipe-overload-armor').checked;
    const res = evaluateDamagePipelineClient(attacker, target, isTrue, overload);

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
      armorEl.textContent = `${char.armor} → ${outcome.nextArmor} / ${char.maxArmor}${
        outcome.armorDegradedBy > 0 ? ` (Sobrecarga: -${outcome.armorDegradedBy} Máx)` : ''
      }`;
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
    document.getElementById('pipe-overload-armor').checked = Boolean(state.battle?.isActive);

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
        if (outcome.armorDegradedBy > 0) {
          target.armorDegradation = (target.armorDegradation || 0) + outcome.armorDegradedBy;
        }
        if (target.hp === 0) {
          target.isDead = true;
          target.pa = 0;
          toasts.push(`${target.name} caiu em batalha (MORTO)!`);
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

    commitMutation((st) => {
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
        'Todos os atributos (Vida, Armadura, Mana, limites máximos, Defesa e Regen%) voltarão ao estado inicial configurado e todas as 7 resistências serão zeradas.',
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
    if (!canEditCharacter(char)) {
      showToast('Você só pode excluir personagens criados por você!');
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
        toasts.push(`${target.name} MAX ${resName}!`);
      }
      return true;
    });

    closeModal('modal-single-resistance');
  }

  // ---------------------------------------------------------------------------
  // Modal 5: Ficha Completa, 5 Atributos, Talentos & Inventário P2P
  // ---------------------------------------------------------------------------
  function openCharacterSheetModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
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
    const canEdit = canEditCharacter(char);
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
      titleEl.textContent = `INVENTÁRIO — ${char.name.toUpperCase()}${!canEdit ? ' (SOMENTE VISUALIZAÇÃO)' : ''}`;
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
                  ? `<p class="text-[11px] app-muted line-clamp-2">${escapeHtml(tpl.descricao)}</p>`
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
              canEdit
                ? `<div class="flex flex-wrap items-center gap-1.5 pt-2 border-t app-divider-border">
                    ${
                      !inEscrow && tpl.equipavel
                        ? `<button type="button" data-inv-toggle-equip="${escapeHtml(inv.id)}" class="flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] ${
                            inv.isEquipped ? 'app-secondary-btn' : 'btn-gold'
                          }">${inv.isEquipped ? 'Desequipar' : 'Equipar'}</button>`
                        : ''
                    }
                    ${
                      !inEscrow && tpl.tipo === 'CONSUMIVEL'
                        ? `<button type="button" data-inv-use-consumable="${escapeHtml(inv.id)}" class="flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1"><iconify-icon icon="game-icons:health-potion"></iconify-icon> <span>Usar</span></button>`
                        : ''
                    }
                    ${
                      !inEscrow && !tpl.naoNegociavel && otherChars.length > 0
                        ? `<button type="button" data-inv-transfer="${escapeHtml(inv.id)}" class="py-1.5 px-2.5 rounded-lg font-bold text-[11px] app-secondary-btn flex items-center gap-1" title="Escolher personagem para enviar este item"><iconify-icon icon="game-icons:knapsack"></iconify-icon> <span>P2P</span></button>`
                        : ''
                    }
                    ${
                      !inEscrow && !tpl.naoNegociavel
                        ? `<button type="button" data-inv-sell-escrow="${escapeHtml(inv.id)}" class="py-1.5 px-2.5 rounded-lg font-bold text-[11px] btn-gold-outline flex items-center gap-1" title="Solicitar venda para aprovação do Mestre"><iconify-icon icon="game-icons:two-coins" class="icon-gold"></iconify-icon> <span>Vender</span></button>`
                        : ''
                    }
                    ${
                      !inEscrow
                        ? `<button type="button" data-inv-remove="${escapeHtml(inv.id)}" class="py-1.5 px-2 rounded-lg font-bold text-[11px] text-rose-400 app-secondary-btn flex items-center justify-center" title="Descartar item"><iconify-icon icon="game-icons:crowned-skull"></iconify-icon></button>`
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
      if (iconEl) iconEl.innerHTML = '<iconify-icon icon="game-icons:knapsack"></iconify-icon>';
      if (titleEl) titleEl.textContent = 'ENVIAR ITEM (P2P)';
      if (subtitleEl) subtitleEl.textContent = `De: ${sender.name} • Item: ${tpl.nome} (Disponível: x${maxQty})`;
      qtyInput.max = String(maxQty);
      qtyInput.value = '1';
      if (qtyHint) qtyHint.textContent = `Máximo disponível na mochila de ${sender.name}: ${maxQty} unid.`;

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

    // Modo P2P
    const senderPreview = state.characters.find((c) => c.id === senderCharId);
    const receiverPreview = state.characters.find((c) => c.id === targetCharId);
    if (!senderPreview || !receiverPreview) return;

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

        toasts.push(`${sendQty}x ${tpl?.nome || 'Item'} enviado(s) de ${sChar.name} para ${rChar.name}!`);
        return true;
      },
      {
        actionType: 'ITEM_TRANSFER_P2P',
        targetEntity: `${senderPreview.name} → ${receiverPreview.name}`,
        summary: `Transferência P2P realizada (${rawQty} unid.).`,
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
  // Rotina de Combate & Avanço de Turno (05-combate-e-turnos.md)
  // ===========================================================================
  function advanceBattleTurn() {
    commitMutation(
      (st, toasts) => {
        const b = st.battle;
        if (!b.participantsOrder || b.participantsOrder.length === 0) return false;

        if (!b.isActive) {
          b.isActive = true;
          b.roundNumber = 1;
          b.totalTurnsCount = 0;
          b.masterTurnsCount = 0;
          b.currentTurnIndex = 0;
        }

        const currentParticipant = b.participantsOrder[b.currentTurnIndex || 0];
        if (currentParticipant) {
          currentParticipant.turnsTaken = (currentParticipant.turnsTaken || 0) + 1;
          b.totalTurnsCount = (b.totalTurnsCount || 0) + 1;
          if (currentParticipant.isMaster) {
            b.masterTurnsCount = (b.masterTurnsCount || 0) + 1;
          } else {
            // Decrementa duração de consumíveis ativos ao fim do turno do personagem (Seção 8)
            const charDone = st.characters.find((c) => c.id === currentParticipant.id);
            if (charDone && Array.isArray(charDone.activeBuffs)) {
              charDone.activeBuffs.forEach((bf) => {
                bf.remainingTurns = Math.max(0, Number(bf.remainingTurns || 0) - 1);
              });
              charDone.activeBuffs = charDone.activeBuffs.filter((bf) => bf.remainingTurns > 0);
            }
          }
        }

        // Avança cursor
        let nextIdx = ((b.currentTurnIndex || 0) + 1) % b.participantsOrder.length;
        if (nextIdx === 0) {
          b.roundNumber = (b.roundNumber || 1) + 1;
        }
        b.currentTurnIndex = nextIdx;

        // Rotina automática de início de turno do próximo participante (Seção 2.1)
        const nextP = b.participantsOrder[nextIdx];
        if (nextP && !nextP.isMaster) {
          const nextChar = st.characters.find((c) => c.id === nextP.id);
          if (nextChar && !nextChar.isDead && nextChar.hp > 0) {
            recalculateCharacterDerived(nextChar);
            // 1. Recarrega PA para o máximo (3 PA ou máximo ativo)
            nextChar.pa = nextChar.maxPa;
            // 2. Regenera Mana (padrão 20% da Mana Máxima, respeitando teto) + Regenerar Vida/Armadura de itens
            const manaRec = applyRounding(nextChar.maxMana * ((nextChar.regen || 20) / 100));
            if (nextChar.mana < nextChar.maxMana) {
              nextChar.mana = Math.min(nextChar.maxMana, nextChar.mana + manaRec);
            }
            const regenVida = Number(nextChar.derived?.effectiveRegenVida || 0);
            if (regenVida > 0 && nextChar.hp < nextChar.maxHp) {
              nextChar.hp = Math.min(nextChar.maxHp, nextChar.hp + regenVida);
            }
            const regenArmadura = Number(nextChar.derived?.effectiveRegenArmadura || 0);
            if (regenArmadura > 0 && nextChar.armor < nextChar.maxArmor) {
              nextChar.armor = Math.min(nextChar.maxArmor, nextChar.armor + regenArmadura);
            }
            // 3. Incrementa +1 Carga no Pool Compartilhado do Grupo
            b.groupCharges = (b.groupCharges || 0) + 1;
            toasts.push(`Turno de ${nextChar.name}: PA recarregado, +${manaRec} Mana e +1 Carga do Grupo!`);
          }
        }
        return true;
      },
      {
        actionType: 'TURN_ADVANCE',
        targetEntity: 'Combate',
        summary: 'Turno avançado na ordem de iniciativa.',
      }
    );
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

    const renderMemberCursorColorSwatches = (selectedHex) => {
      const picker = document.getElementById('member-cursor-color-picker');
      const colorInp = document.getElementById('member-cursor-color-input');
      const colorLbl = document.getElementById('member-cursor-color-label');
      const normHex = normalizePaletteColor(selectedHex) || CURSOR_COLOR_PALETTE[0].hex;
      if (colorInp) colorInp.value = normHex;
      if (colorLbl) {
        colorLbl.textContent = `${getColorNameByHex(normHex)} (${normHex})`;
        colorLbl.style.color = normHex;
      }
      if (!picker) return;

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
            ${isSelected ? '<span class="text-[11px] font-black text-white drop-shadow flex items-center justify-center"><iconify-icon icon="game-icons:check-mark"></iconify-icon></span>' : ''}
          </button>
        `;
      }).join('');
    };

    document.getElementById('member-cursor-color-picker')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-cursor-color]');
      if (!btn) return;
      renderMemberCursorColorSwatches(btn.getAttribute('data-pick-cursor-color'));
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

      const assignedColor = assignPermanentMemberCursorColor(m.id, m.cursorColor);
      m.cursorColor = assignedColor;
      renderMemberCursorColorSwatches(assignedColor);

      const charSel = document.getElementById('member-char-select');
      charSel.innerHTML =
        `<option value="">Nenhum vinculado</option>` +
        state.characters
          .map((c) => `<option value="${escapeHtml(c.id)}" ${m.characterId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
          .join('');

      const perms = m.permissions || {};
      document.getElementById('member-preset-select').value = perms.preset || 'JOGADOR_COMUM';
      document.querySelectorAll('#member-perm-checkboxes [data-perm]').forEach((cb) => {
        const k = cb.getAttribute('data-perm');
        cb.checked = Boolean(perms[k]);
      });

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
          permissions: { preset: 'JOGADOR_COMUM', canCreateCharacters: true, canViewOtherInventories: true },
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
      const p = e.target.value;
      const map = {
        JOGADOR_COMUM: ['canCreateCharacters', 'canViewOtherInventories'],
        MODERADOR: ['canCreateCharacters', 'canEditOtherCharacters', 'canManageQuests', 'canViewOtherInventories'],
        GERENTE_LOJA: ['canCreateCharacters', 'canManageItemsCatalog', 'canManageShopNpcs', 'canViewOtherInventories'],
        GERENTE_INVENTARIO: ['canCreateCharacters', 'canApproveSales', 'canViewOtherInventories'],
      };
      if (map[p]) {
        document.querySelectorAll('#member-perm-checkboxes [data-perm]').forEach((cb) => {
          cb.checked = map[p].includes(cb.getAttribute('data-perm'));
        });
      }
    });

    document.getElementById('form-member')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const mid = document.getElementById('member-form-id').value;
      const newNickname = document.getElementById('member-name-input').value.trim();
      const newIpRaw = document.getElementById('member-ip-input')?.value.trim();
      const cid = document.getElementById('member-char-select').value || null;
      const chosenColorRaw = document.getElementById('member-cursor-color-input')?.value;
      const preset = document.getElementById('member-preset-select').value;
      const perms = { preset };
      document.querySelectorAll('#member-perm-checkboxes [data-perm]').forEach((cb) => {
        perms[cb.getAttribute('data-perm')] = cb.checked;
      });

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
          m.cursorColor = assignPermanentMemberCursorColor(m.id, chosenColorRaw || m.cursorColor);
          if (isEffectiveMaster() && !isMasterRole) {
            m.permissions = perms;
          }
          toasts.push(
            `Apelido "${m.name}" e cor ${getColorNameByHex(m.cursorColor)} salvos para o IP ${m.ip}!`
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
      'pipe-overload-armor',
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
      if (!targetChar || !canEditCharacter(targetChar)) return false;

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
        const invId = sellBtn.getAttribute('data-inv-sell-escrow');
        openSellEscrowModal(charId, invId);
        return true;
      }

      const transferBtn = e.target.closest('[data-inv-transfer]');
      if (transferBtn) {
        const invId = transferBtn.getAttribute('data-inv-transfer');
        openItemRecipientModal({ mode: 'P2P', senderCharId: charId, invId });
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
      document.getElementById('cat-item-id').value = '';
      document.getElementById('cat-item-name').value = '';
      document.getElementById('cat-item-type').value = 'ARMADURA';
      document.getElementById('cat-item-desc').value = '';
      document.getElementById('cat-item-weight').value = '1.0';
      document.getElementById('cat-item-price').value = '100';
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
        const itemId = grantBtn.getAttribute('data-grant-item');
        openItemRecipientModal({ mode: 'GRANT', itemId });
        return;
      }

      const editBtn = e.target.closest('[data-edit-item]');
      if (editBtn) {
        const it = state.itemsCatalog.find((i) => i.id === editBtn.getAttribute('data-edit-item'));
        if (!it) return;
        document.getElementById('cat-item-id').value = it.id;
        document.getElementById('cat-item-name').value = it.nome;
        document.getElementById('cat-item-type').value = it.tipo;
        document.getElementById('cat-item-desc').value = it.descricao || '';
        document.getElementById('cat-item-weight').value = String(it.peso ?? 0);
        document.getElementById('cat-item-price').value = String(it.preco ?? 0);
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
        const itemId = delBtn.getAttribute('data-delete-item');
        commitMutation((st) => {
          st.itemsCatalog = st.itemsCatalog.filter((i) => i.id !== itemId);
          return true;
        });
      }
    });

    document.getElementById('form-catalog-item')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('cat-item-id').value.trim();
      const nome = document.getElementById('cat-item-name').value.trim() || 'Item';
      const tipo = document.getElementById('cat-item-type').value;
      const descricao = document.getElementById('cat-item-desc').value.trim();
      const peso = Math.max(0, Number(document.getElementById('cat-item-weight').value || 0));
      const preco = Math.max(0, Math.round(Number(document.getElementById('cat-item-price').value || 0)));
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

      const cardEl = buyBtn.closest('.fantasy-card');
      const canManageShop = hasPermission('canManageShopNpcs');
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

    // Aprovar / Recusar Vendas em Escrow (Apenas Mestre / quem possui permissão canApproveSales)
    document.getElementById('escrow-sales-list')?.addEventListener('click', (e) => {
      if (!hasPermission('canApproveSales')) return;
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
    // Eventos de Combate & Turnos
    // -------------------------------------------------------------------------
    document.getElementById('btn-toggle-battle')?.addEventListener('click', () => {
      commitMutation(
        (st, toasts) => {
          const b = st.battle;
          b.isActive = !b.isActive;
          if (b.isActive) {
            b.roundNumber = 1;
            b.totalTurnsCount = 0;
            b.masterTurnsCount = 0;
            b.currentTurnIndex = 0;
            // Sincroniza personagens na iniciativa se vazia
            if (!b.participantsOrder || b.participantsOrder.length === 0) {
              b.participantsOrder = st.characters.map((c) => ({
                id: c.id,
                name: c.name,
                isMaster: false,
                isDead: c.isDead,
                turnsTaken: 0,
                initiativeRoll: 10,
              }));
              b.participantsOrder.push({
                id: 'MESTRE',
                name: 'Mestre da Mesa',
                isMaster: true,
                isDead: false,
                turnsTaken: 0,
                initiativeRoll: 15,
              });
            }
            toasts.push('Modo de Combate iniciado!');
          } else {
            // Restaura integralmente a Armadura Máxima degradada por sobrecarga durante a batalha (Seção 6.3)
            st.characters.forEach((c) => {
              c.armorDegradation = 0;
              c.activeBuffs = [];
            });
            toasts.push('Combate encerrado! Degradações de armadura foram restauradas.');
          }
          return true;
        },
        {
          actionType: 'BATTLE_TOGGLE',
          targetEntity: 'Estado de Batalha',
          summary: state.battle?.isActive ? 'Combate encerrado.' : 'Combate iniciado.',
        }
      );
    });

    document.getElementById('btn-end-turn')?.addEventListener('click', advanceBattleTurn);
    document.getElementById('btn-force-turn')?.addEventListener('click', advanceBattleTurn);

    document.getElementById('btn-charge-inc')?.addEventListener('click', () => {
      commitMutation((st) => {
        st.battle.groupCharges = (st.battle.groupCharges || 0) + 1;
        return true;
      });
    });
    document.getElementById('btn-charge-dec')?.addEventListener('click', () => {
      commitMutation((st) => {
        st.battle.groupCharges = Math.max(0, (st.battle.groupCharges || 0) - 1);
        return true;
      });
    });

    document.getElementById('btn-sync-initiative-chars')?.addEventListener('click', () => {
      commitMutation((st) => {
        const existingIds = new Set((st.battle.participantsOrder || []).map((p) => p.id));
        for (const c of st.characters) {
          if (!existingIds.has(c.id)) {
            st.battle.participantsOrder.push({
              id: c.id,
              name: c.name,
              isMaster: false,
              isDead: c.isDead,
              turnsTaken: 0,
              initiativeRoll: 10,
            });
          }
        }
        if (!existingIds.has('MESTRE')) {
          st.battle.participantsOrder.push({
            id: 'MESTRE',
            name: 'Mestre da Mesa',
            isMaster: true,
            isDead: false,
            turnsTaken: 0,
            initiativeRoll: 15,
          });
        }
        return true;
      });
    });

    document.getElementById('btn-roll-all-initiative')?.addEventListener('click', () => {
      commitMutation(
        (st, toasts) => {
          (st.battle.participantsOrder || []).forEach((p) => {
            p.initiativeRoll = Math.floor(Math.random() * 20) + 1;
          });
          st.battle.participantsOrder.sort((a, b) => (b.initiativeRoll || 0) - (a.initiativeRoll || 0));
          st.battle.currentTurnIndex = 0;
          toasts.push('Iniciativa 1d20 rolada e ordenada para todos os participantes!');
          return true;
        },
        {
          actionType: 'INITIATIVE_ROLL',
          targetEntity: 'Fila de Iniciativa',
          summary: 'Iniciativa 1d20 rolada e reordenada.',
        }
      );
    });

    document.getElementById('initiative-list-container')?.addEventListener('click', (e) => {
      handleCharActionClick(e);

      const paBtn = e.target.closest('[data-spend-pa]');
      if (paBtn) {
        const cid = paBtn.getAttribute('data-spend-pa');
        commitMutation((st) => {
          const c = st.characters.find((x) => x.id === cid);
          if (!c) return false;
          c.pa = Math.max(0, (c.pa || 0) - 1);
          return true;
        });
        return;
      }

      const moveBtn = e.target.closest('[data-move-init]');
      if (moveBtn) {
        const idx = Number(moveBtn.getAttribute('data-move-init'));
        const dir = Number(moveBtn.getAttribute('data-dir'));
        commitMutation((st) => {
          const arr = st.battle.participantsOrder || [];
          const targetIdx = idx + dir;
          if (targetIdx < 0 || targetIdx >= arr.length) return false;
          const tmp = arr[idx];
          arr[idx] = arr[targetIdx];
          arr[targetIdx] = tmp;
          return true;
        });
      }
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

    document.getElementById('btn-new-quest')?.addEventListener('click', () => {
      document.getElementById('quest-form-id').value = '';
      document.getElementById('quest-title-input').value = '';
      document.getElementById('quest-desc-input').value = '';
      const sel = document.getElementById('quest-reward-item');
      sel.innerHTML =
        `<option value="">Nenhum item</option>` +
        state.itemsCatalog.map((it) => `<option value="${escapeHtml(it.id)}">${escapeHtml(it.nome)}</option>`).join('');
      openModal('modal-quest');
    });

    document.getElementById('form-quest')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('quest-title-input').value.trim() || 'Missão';
      const description = document.getElementById('quest-desc-input').value.trim();
      const gold = Math.max(0, Number(document.getElementById('quest-reward-gold').value || 0));
      const xp = Math.max(0, Number(document.getElementById('quest-reward-xp').value || 0));
      const attributePoints = Math.max(0, Number(document.getElementById('quest-reward-attr').value || 0));
      const skillPoints = Math.max(0, Number(document.getElementById('quest-reward-skill').value || 0));
      const itemId = document.getElementById('quest-reward-item').value;

      commitMutation(
        (st) => {
          st.quests.unshift({
            id: `quest_${Date.now()}`,
            title,
            description,
            status: 'PENDENTE',
            assignedCharacterIds: st.characters.map((c) => c.id),
            rewards: {
              gold,
              xp,
              attributePoints,
              skillPoints,
              itemIds: itemId ? [itemId] : [],
            },
            rewarded: false,
            createdAt: new Date().toLocaleString('pt-BR'),
          });
          return true;
        },
        {
          actionType: 'QUEST_CREATE',
          targetEntity: `Missão: ${title}`,
          summary: `Missão "${title}" cadastrada no quadro.`,
        }
      );
      closeModal('modal-quest');
    });

    const applyQuestStatusChange = (questId, newStatus) => {
      commitMutation(
        (st, toasts) => {
          const q = st.quests.find((x) => x.id === questId);
          if (!q) return false;
          q.status = newStatus;

          if (newStatus === 'CONCLUIDA' && !q.rewarded) {
            q.rewarded = true;
            const rw = q.rewards || {};
            if (rw.gold > 0) {
              st.room.sharedGold = (st.room.sharedGold || 0) + rw.gold;
            }
            const targets =
              (q.assignedCharacterIds || []).length > 0
                ? st.characters.filter((c) => q.assignedCharacterIds.includes(c.id))
                : st.characters;

            for (const c of targets) {
              if (rw.xp > 0) grantXpToCharacter(c, rw.xp);
              if (rw.attributePoints > 0) c.pendingAttributePoints = (c.pendingAttributePoints || 0) + rw.attributePoints;
              if (rw.skillPoints > 0) c.skillPoints = (c.skillPoints || 0) + rw.skillPoints;
              for (const itemId of rw.itemIds || []) {
                const tpl = st.itemsCatalog.find((it) => it.id === itemId);
                if (tpl) {
                  addItemsToCharacterInventory(c, tpl, 1);
                } else {
                  c.inventory = c.inventory || [];
                  c.inventory.push({
                    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                    itemId,
                    quantity: 1,
                    isEquipped: false,
                    status: 'IN_INVENTORY',
                  });
                }
              }
            }
            toasts.push(`Missão "${q.title}" concluída! Recompensas entregues ao grupo.`);
          }
          return true;
        },
        {
          actionType: 'QUEST_STATUS',
          targetEntity: `Missão ID: ${questId}`,
          summary: `Status da missão alterado para ${newStatus}.`,
        }
      );
    };

    document.getElementById('quests-list-grid')?.addEventListener('click', (e) => {
      const stBtn = e.target.closest('[data-quest-status]');
      if (stBtn) {
        applyQuestStatusChange(stBtn.getAttribute('data-quest-status'), stBtn.getAttribute('data-status'));
        return;
      }
      const delBtn = e.target.closest('[data-delete-quest]');
      if (delBtn) {
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

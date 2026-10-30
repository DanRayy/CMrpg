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
      const maxVal = resistancesObj?.[r.name]?.baseMax ?? resistancesObj?.[r.name]?.max ?? 100;
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

  function normalizeElementalResistances(elemResObj) {
    const res = {};
    for (const er of ELEMENTAL_RESISTANCE_TYPES) res[er.key] = 0;
    if (!elemResObj || typeof elemResObj !== 'object') return res;
    for (const er of ELEMENTAL_RESISTANCE_TYPES) {
      const rawVal = elemResObj[er.key] ?? elemResObj[er.label] ?? elemResObj[er.key.toLowerCase()] ?? 0;
      const num = Number(rawVal);
      res[er.key] = Number.isFinite(num) ? Number(num.toFixed(1)) : 0;
    }
    return res;
  }

  function renderCharFormElementalResistanceInputs(elemResObj) {
    const container = document.getElementById('char-form-elem-resistances-grid');
    if (!container) return;
    const norm = normalizeElementalResistances(elemResObj);
    container.innerHTML = ELEMENTAL_RESISTANCE_TYPES.map((er) => {
      const val = norm[er.key];
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

  function renderEnemyFormElementalResistanceInputs(elemResObj) {
    const container = document.getElementById('enemy-form-elem-resistances-grid');
    if (!container) return;
    const norm = normalizeElementalResistances(elemResObj);
    container.innerHTML = ELEMENTAL_RESISTANCE_TYPES.map((er) => {
      const val = norm[er.key];
      return `
        <div>
          <label class="block text-[11px] font-bold mb-1 ${er.textClass}">${er.icon} ${escapeHtml(er.label)} (%)</label>
          <div class="relative">
            <input
              type="number"
              step="any"
              data-enemy-elem-res-input="${escapeHtml(er.key)}"
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
      document.getElementById('char-max-weight').value = String(char.baseMaxWeight ?? char.maxWeight ?? 27);
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
            resistances[r.name] = { current: 0, max: rMax, baseMax: rMax };
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
            baseMaxWeight: maxWeight,
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
          target.baseMaxWeight = maxWeight;
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
              baseMax: rMax,
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
    if (!isEffectiveMaster() && !isCharacterOwner(char) && !hasPermission('char_combat_adjust_others')) {
      showToast('Você não possui permissão para resetar este personagem!', 'warning');
      return;
    }

    openConfirmModal({
      icon: '<iconify-icon icon="game-icons:sands-of-time"></iconify-icon>',
      title: `RESETAR ${char.name.toUpperCase()}?`,
      message:
        'Todos os atributos (Vida, Armadura, Mana, limites máximos, Defesa e Regen%) voltarão ao estado inicial configurado e todos os 7 acúmulos serão zerados. Buffs e Nerfs permanentes serão mantidos.',
      confirmText: '<iconify-icon icon="game-icons:sands-of-time"></iconify-icon> <span>Resetar</span>',
      onConfirm: () => {
        commitMutation(
          (st) => {
            const target = st.characters.find((c) => c.id === charId);
            if (!target) return false;
            if (!target.initial) {
              target.initial = {
                hp: target.baseMaxHp ?? target.maxHp ?? 80,
                maxHp: target.baseMaxHp ?? target.maxHp ?? 80,
                armor: target.baseMaxArmor ?? target.maxArmor ?? 0,
                maxArmor: target.baseMaxArmor ?? target.maxArmor ?? 0,
                mana: target.baseMaxMana ?? target.maxMana ?? 100,
                maxMana: target.baseMaxMana ?? target.maxMana ?? 100,
                pa: target.baseMaxPa ?? target.maxPa ?? 3,
                maxPa: target.baseMaxPa ?? target.maxPa ?? 3,
                regen: target.baseRegen ?? target.regen ?? 20,
                defense: target.baseDefense ?? target.defense ?? 0,
                attack: target.baseAttack ?? target.attack ?? 0,
                arcana: target.baseArcana ?? target.arcana ?? 0,
                santidade: target.baseSantidade ?? target.santidade ?? 0,
                maxWeight: target.maxWeight ?? 27,
                resistances: deepClone(target.resistances || {}),
                elementalResistances: deepClone(target.elementalResistances || {}),
              };
            }
            const init = deepClone(target.initial);

            target.baseMaxHp = init.maxHp;
            target.baseMaxArmor = init.maxArmor;
            target.baseMaxMana = init.maxMana;
            target.baseRegen = init.regen;
            target.baseDefense = init.defense;
            if (init.attack !== undefined) target.baseAttack = init.attack;
            if (init.arcana !== undefined) target.baseArcana = init.arcana;
            if (init.santidade !== undefined) target.baseSantidade = init.santidade;
            if (init.maxPa !== undefined) target.baseMaxPa = init.maxPa;
            else if (init.pa !== undefined) target.baseMaxPa = init.pa;
            target.armorDegradation = 0;
            target.activeBuffs = (target.activeBuffs || []).filter(isBuffEffectPermanent);
            target.buffsNerfs = (target.buffsNerfs || []).filter(isBuffEffectPermanent);
            target.buffsNerfs.forEach((b) => {
              b.isPermanent = true;
              b.duration = null;
            });
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
              target.resistances[r.name] = { current: 0, max: iMax, baseMax: iMax };
            }
            return true;
          },
          {
            actionType: 'CHAR_RESET',
            targetEntity: `Personagem: ${char.name}`,
            summary: `${char.name} foi resetado para seus valores iniciais, preservando efeitos permanentes.`,
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
      const isImmune = r.name === 'Congelamento' && (char.buffsNerfs || []).some(
        (b) => b.statusKey === 'IMUNIDADE_CONGELAMENTO' || b.name?.toLowerCase().includes('imunidade a congelamento')
      );

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
              ${isImmune ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-800 text-cyan-200 border border-cyan-500/40">IMUNE (1t)</span>' : isMax ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">MAX!</span>' : ''}
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
    const isImmune = resName === 'Congelamento' && (char.buffsNerfs || []).some(
      (b) => b.statusKey === 'IMUNIDADE_CONGELAMENTO' || b.name?.toLowerCase().includes('imunidade a congelamento')
    );

    document.getElementById('single-res-char-id').value = char.id;
    document.getElementById('single-res-name').value = resName;
    document.getElementById('single-res-icon').innerHTML = meta.icon;
    document.getElementById('single-res-title').textContent = resName.toUpperCase();
    document.getElementById('single-res-subtitle').textContent = `${char.name} • Atual: ${entry.current} / ${entry.max}${isImmune ? ' • [IMUNE A CONGELAMENTO]' : ''}`;
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
      const oldVal = Number(entry.current || 0);
      const maxVal = Number(entry.max || 100);
      let nextVal = oldVal;

      if (op === 'add') nextVal = oldVal + val;
      else if (op === 'sub') nextVal = Math.max(0, oldVal - val);
      else if (op === 'set') nextVal = Math.max(0, val);

      // Checagem de Imunidade a Congelamento:
      // Enquanto imune, pode receber acúmulos normalmente, mas eles travam no máximo até a imunidade cessar
      const isImmuneToFreeze =
        resName === 'Congelamento' &&
        (target.buffsNerfs || []).some(
          (b) => b.statusKey === 'IMUNIDADE_CONGELAMENTO' || b.name?.toLowerCase().includes('imunidade a congelamento')
        );

      if (isImmuneToFreeze) {
        if (maxVal > 0 && nextVal >= maxVal) {
          entry.current = maxVal;
          toasts.push(
            `${target.name} atingiu o limite de acúmulos de Congelamento (${maxVal}/${maxVal}), mas está IMUNE! O efeito será ativado assim que a imunidade expirar.`
          );
        } else {
          entry.current = nextVal;
        }
        return true;
      }

      // Rollover / Overflow: dispara efeito se atingir ou ultrapassar o teto e mantém o resto
      if (maxVal > 0 && nextVal >= maxVal) {
        const triggers = Math.floor(nextVal / maxVal);
        const remainder = nextVal % maxVal;

        for (let i = 0; i < triggers; i++) {
          applyAccumulationTrigger(target, resName, maxVal, toasts, st);
        }
        entry.current = remainder;
      } else {
        entry.current = nextVal;
      }
      return true;
    });

    closeModal('modal-single-resistance');
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Modal: Buffs e Nerfs (Efeitos Ativos, Modificadores, Permanência e Toggle)
  // ---------------------------------------------------------------------------
  function openBuffsNerfsModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    state.activeBuffsNerfsCharId = char.id;
    resetBnForm();
    renderBuffsNerfsModalContent(char);
    openModal('modal-buffs-nerfs');
  }

  function addBnModifierRow(mod = { targetStat: 'VIDA', modifierType: 'FLAT', value: 10 }) {
    const list = document.getElementById('bn-modifiers-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-1.5 items-center bn-modifier-row';
    const currentTarget = mod.targetStat || mod.stat || 'VIDA';
    const currentType = String(mod.modifierType || mod.mode || 'FLAT').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FLAT';
    row.innerHTML = `
      <select data-mod-target class="col-span-6 px-2 py-1.5 app-input font-bold text-xs">
        ${renderEffectTargetOptionsHtml(currentTarget)}
      </select>
      <select data-mod-type class="col-span-3 px-2 py-1.5 app-input font-bold text-xs">
        <option value="FLAT" ${currentType === 'FLAT' ? 'selected' : ''}>Fixo (+/-)</option>
        <option value="PERCENT" ${currentType === 'PERCENT' ? 'selected' : ''}>Porcento (%)</option>
      </select>
      <input data-mod-val type="number" step="any" value="${mod.value ?? 10}" class="col-span-2 px-2 py-1.5 font-mono font-bold app-input text-xs" />
      <button type="button" class="col-span-1 py-1.5 rounded app-secondary-btn text-rose-400 hover:text-rose-300 text-xs flex items-center justify-center font-bold" title="Remover modificador">✕</button>
    `;
    row.querySelector('button')?.addEventListener('click', () => row.remove());
    list.appendChild(row);
  }

  function resetBnForm() {
    const editingInput = document.getElementById('bn-editing-id');
    const descInput = document.getElementById('bn-effect-desc');
    const typeSelect = document.getElementById('bn-effect-type');
    const permCheck = document.getElementById('bn-effect-is-permanent');
    const durInput = document.getElementById('bn-effect-duration');
    const durContainer = document.getElementById('bn-duration-container');
    const modifiersList = document.getElementById('bn-modifiers-list');
    const formTitle = document.getElementById('bn-form-title');
    const cancelBtn = document.getElementById('btn-cancel-edit-bn');
    const submitBtnText = document.getElementById('btn-bn-submit-text');

    if (editingInput) editingInput.value = '';
    if (descInput) descInput.value = '';
    if (typeSelect) typeSelect.value = 'BUFF';
    if (permCheck) permCheck.checked = false;
    if (durInput) {
      durInput.value = '';
      durInput.disabled = false;
      durInput.placeholder = 'Ex: 3';
    }
    if (durContainer) durContainer.classList.remove('opacity-40');
    if (modifiersList) modifiersList.innerHTML = '';
    if (formTitle) formTitle.innerHTML = '<iconify-icon icon="game-icons:quill-ink"></iconify-icon> <span>Adicionar Novo Efeito</span>';
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (submitBtnText) submitBtnText.textContent = '+ Adicionar Efeito';
  }

  function editBuffNerf(charId, effectId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char || !Array.isArray(char.buffsNerfs)) return;
    const eff = char.buffsNerfs.find((e) => e.id === effectId);
    if (!eff) return;

    const editingInput = document.getElementById('bn-editing-id');
    const descInput = document.getElementById('bn-effect-desc');
    const typeSelect = document.getElementById('bn-effect-type');
    const permCheck = document.getElementById('bn-effect-is-permanent');
    const durInput = document.getElementById('bn-effect-duration');
    const durContainer = document.getElementById('bn-duration-container');
    const modifiersList = document.getElementById('bn-modifiers-list');
    const formTitle = document.getElementById('bn-form-title');
    const cancelBtn = document.getElementById('btn-cancel-edit-bn');
    const submitBtnText = document.getElementById('btn-bn-submit-text');

    if (editingInput) editingInput.value = eff.id;
    if (descInput) descInput.value = eff.name || eff.description || '';
    if (typeSelect) typeSelect.value = eff.type || 'BUFF';
    const isPerm = isBuffEffectPermanent(eff);
    if (permCheck) permCheck.checked = isPerm;
    if (durInput) {
      durInput.value = isPerm ? '' : (eff.duration ?? '');
      durInput.disabled = isPerm;
      durInput.placeholder = isPerm ? 'Permanente' : 'Ex: 3';
    }
    if (durContainer) {
      durContainer.classList.toggle('opacity-40', isPerm);
    }
    if (modifiersList) {
      modifiersList.innerHTML = '';
      if (Array.isArray(eff.modifiers) && eff.modifiers.length > 0) {
        eff.modifiers.forEach((m) => addBnModifierRow(m));
      } else if (eff.paModifier) {
        addBnModifierRow({ targetStat: 'PA', modifierType: 'FLAT', value: eff.paModifier });
      }
    }
    if (formTitle) {
      formTitle.innerHTML = `<iconify-icon icon="game-icons:quill-ink"></iconify-icon> <span>Editar Efeito: ${escapeHtml(eff.name || eff.description)}</span>`;
    }
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    if (submitBtnText) submitBtnText.textContent = '✓ Salvar Alterações';

    document.getElementById('container-form-buff-nerf')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function toggleBuffNerf(charId, effectId) {
    commitMutation((st, toasts) => {
      const char = st.characters.find((c) => c.id === charId);
      if (!char || !Array.isArray(char.buffsNerfs)) return false;
      const eff = char.buffsNerfs.find((e) => e.id === effectId);
      if (!eff) return false;
      eff.enabled = eff.enabled === false ? true : false;
      recalculateCharacterDerived(char);
      toasts.push(`Efeito "${eff.name || eff.description}" foi ${eff.enabled ? 'ativado' : 'desativado'}.`);
      return true;
    });
    const char = state.characters.find((c) => c.id === charId);
    if (char) renderBuffsNerfsModalContent(char);
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
    const canManage = isEffectiveMaster() || isCharacterOwner(char) || hasPermission('combat_manage_accumulations_others') || canEditCharacter(char);

    const formContainer = document.getElementById('container-form-buff-nerf');
    if (formContainer) {
      formContainer.classList.toggle('hidden', !canManage);
    }

    const renderEffectCard = (eff, isNerf) => {
      const isEnabled = eff.enabled !== false;
      const isPerm = isBuffEffectPermanent(eff);
      const durLabel = isPerm
        ? 'Permanente'
        : `${eff.duration} ${eff.duration === 1 ? 'turno' : 'turnos'}`;

      const durBadgeClass = isPerm
        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
        : isNerf
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

      const statusBadge = !isEnabled
        ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">DESATIVADO</span>`
        : '';

      const mods = Array.isArray(eff.modifiers) ? eff.modifiers : [];
      let modsHtml = mods
        .map((m) => {
          const isPct = String(m.modifierType || m.mode || 'FLAT').toUpperCase() === 'PERCENT';
          const valNum = Number(m.value || 0);
          const sign = valNum > 0 ? '+' : '';
          const statLabel = formatEffectTargetLabel(m.targetStat || m.stat);
          const pillColor = isNerf
            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
          return `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${pillColor}">${sign}${valNum}${isPct ? '%' : ''} ${statLabel}</span>`;
        })
        .join(' ');

      if (!modsHtml && eff.paModifier) {
        const sign = eff.paModifier > 0 ? '+' : '';
        const pillColor = isNerf
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        modsHtml = `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${pillColor}">${sign}${eff.paModifier} PA</span>`;
      }

      const cardBg = !isEnabled
        ? 'bg-neutral-900/50 border-neutral-800 opacity-60'
        : isNerf
        ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
        : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50';

      const textColor = !isEnabled
        ? 'text-neutral-400'
        : isNerf
        ? 'text-rose-300'
        : 'text-emerald-300';

      const toggleHtml = canManage
        ? `
          <label class="fantasy-toggle fantasy-toggle-sm" title="${isEnabled ? 'Desativar este efeito' : 'Ativar este efeito'}">
            <input type="checkbox" data-action="toggle-buff-nerf" data-char-id="${escapeHtml(char.id)}" data-effect-id="${escapeHtml(eff.id)}" ${isEnabled ? 'checked' : ''} />
            <span class="fantasy-toggle-slider"></span>
          </label>
        `
        : `
          <span class="text-[9px] font-mono font-bold ${isEnabled ? 'text-emerald-400' : 'text-neutral-500'}">
            ${isEnabled ? 'ATIVO' : 'DESAT.'}
          </span>
        `;

      const actionsHtml = canManage
        ? `
          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-action="edit-buff-nerf"
              data-char-id="${escapeHtml(char.id)}"
              data-effect-id="${escapeHtml(eff.id)}"
              class="w-7 h-7 rounded-lg flex items-center justify-center text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/40 shrink-0 transition"
              title="Editar Efeito"
            >
              <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
            </button>
            <button
              type="button"
              data-action="delete-buff-nerf"
              data-char-id="${escapeHtml(char.id)}"
              data-effect-id="${escapeHtml(eff.id)}"
              class="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 shrink-0 transition"
              title="Remover Efeito"
            >
              <iconify-icon icon="game-icons:trash-can"></iconify-icon>
            </button>
          </div>
        `
        : '';

      return `
        <div class="p-2.5 rounded-xl border flex items-center justify-between gap-3 buff-item-card transition ${cardBg}">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            ${toggleHtml}
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold ${textColor} text-xs">${escapeHtml(eff.name || eff.description)}</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${durBadgeClass}">${durLabel}</span>
                ${statusBadge}
              </div>
              ${
                modsHtml
                  ? `<div class="flex items-center gap-1 flex-wrap mt-1">${modsHtml}</div>`
                  : ''
              }
              ${
                eff.source
                  ? `<div class="text-[10px] font-mono text-neutral-500 mt-0.5 truncate">${escapeHtml(eff.source)}</div>`
                  : ''
              }
            </div>
          </div>
          ${actionsHtml}
        </div>
      `;
    };

    if (buffsContainer) {
      if (buffs.length === 0) {
        buffsContainer.innerHTML = `
          <div class="py-2.5 px-3 rounded-lg bg-black/20 border border-emerald-500/15 text-emerald-400/50 text-[11px] italic font-mono text-center">
            Nenhum Buff ativo neste combatente.
          </div>
        `;
      } else {
        buffsContainer.innerHTML = buffs.map((b) => renderEffectCard(b, false)).join('');
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
        nerfsContainer.innerHTML = nerfs.map((n) => renderEffectCard(n, true)).join('');
      }
    }
  }

  function removeBuffNerf(charId, effectId) {
    commitMutation((st, toasts) => {
      const char = st.characters.find((c) => c.id === charId);
      if (!char || !Array.isArray(char.buffsNerfs)) return false;
      const eff = char.buffsNerfs.find((e) => e.id === effectId);
      char.buffsNerfs = char.buffsNerfs.filter((e) => e.id !== effectId);
      recalculateCharacterDerived(char);
      if (eff) {
        toasts.push(`Efeito "${eff.name || eff.description}" removido de ${char.name}.`);
        if (eff.statusKey === 'IMUNIDADE_CONGELAMENTO' || eff.name?.toLowerCase().includes('imunidade a congelamento')) {
          checkPendingFreezeTrigger(char, toasts, st);
        }
      }
      return true;
    });
  }

  function handleAddBuffNerfSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('buffs-nerfs-char-id')?.value;
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;

    const editingId = document.getElementById('bn-editing-id')?.value.trim();
    const desc = document.getElementById('bn-effect-desc')?.value.trim();
    if (!desc) return;
    const type = document.getElementById('bn-effect-type')?.value || 'BUFF';
    const permChecked = Boolean(document.getElementById('bn-effect-is-permanent')?.checked);
    const durRaw = document.getElementById('bn-effect-duration')?.value;
    const durNum = durRaw !== '' && !isNaN(Number(durRaw)) ? Number(durRaw) : null;
    const isPermanent = permChecked || !durNum || durNum <= 0;
    const duration = isPermanent ? null : Math.round(durNum);

    const modifiers = [];
    document.querySelectorAll('#bn-modifiers-list .bn-modifier-row').forEach((row) => {
      const targetStat = row.querySelector('[data-mod-target]')?.value;
      const modifierType = row.querySelector('[data-mod-type]')?.value || 'FLAT';
      const valRaw = row.querySelector('[data-mod-val]')?.value;
      const value = Number(valRaw || 0);
      if (targetStat && !isNaN(value)) {
        modifiers.push({ targetStat, modifierType, value });
      }
    });

    const paModEntry = modifiers.find((m) => (m.targetStat || m.stat) === 'PA');
    const paMod = paModEntry ? Number(paModEntry.value || 0) : 0;

    commitMutation((st, toasts) => {
      const target = st.characters.find((c) => c.id === charId);
      if (!target) return false;
      if (!Array.isArray(target.buffsNerfs)) target.buffsNerfs = [];

      if (editingId) {
        const existing = target.buffsNerfs.find((b) => b.id === editingId);
        if (existing) {
          existing.type = type;
          existing.name = desc;
          existing.description = desc;
          existing.duration = duration;
          existing.isPermanent = isPermanent;
          existing.modifiers = modifiers;
          existing.paModifier = paMod;
          toasts.push(`Efeito "${desc}" atualizado em ${target.name}.`);
        } else {
          target.buffsNerfs.push({
            id: editingId,
            type,
            name: desc,
            description: desc,
            duration,
            isPermanent,
            enabled: true,
            modifiers,
            paModifier: paMod,
            source: 'Manual (Mestre/Jogador)',
            createdAt: Date.now(),
          });
          toasts.push(`${type === 'BUFF' ? 'Buff' : 'Nerf'} "${desc}" salvo em ${target.name}.`);
        }
      } else {
        target.buffsNerfs.push({
          id: `bn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type,
          name: desc,
          description: desc,
          duration,
          isPermanent,
          enabled: true,
          modifiers,
          paModifier: paMod,
          source: 'Manual (Mestre/Jogador)',
          createdAt: Date.now(),
        });
        toasts.push(`${type === 'BUFF' ? 'Buff' : 'Nerf'} "${desc}" aplicado a ${target.name}.`);
      }

      recalculateCharacterDerived(target);

      if (paMod < 0) {
        const penalty = calculateCombatantPaPenalty(target);
        const maxAvail = Math.max(0, (target.baseMaxPa || 3) - penalty);
        if (target.pa > maxAvail) target.pa = maxAvail;
      }

      return true;
    });

    resetBnForm();
    const updatedChar = state.characters.find((c) => c.id === charId);
    if (updatedChar) renderBuffsNerfsModalContent(updatedChar);
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
    const isEnemy = Boolean(char.isEnemy);
    const canEdit = canEditCharacter(char);
    const weight = char.derived?.totalWeight ?? 0;
    const maxWeight = Number.isFinite(Number(char.maxWeight)) ? Number(char.maxWeight) : 27;
    const isOverweight = !isEnemy && weight > maxWeight;
    const ownerMem =
      (state.members || []).find(
        (m) => m.id === char.ownerMemberId || (char.ownerIp && m.ip === char.ownerIp) || m.characterId === char.id
      ) || null;
    const ownerLabel = ownerMem
      ? ownerMem.nickname?.trim() || ownerMem.name || ownerMem.ip
      : char.ownerIp || 'Mestre';

    document.getElementById('sheet-char-name').textContent = `${char.name} — Nível ${char.level || 1}${
      isEnemy ? ' (Ficha da Criatura)' : !canEdit ? ' (Somente Visualização)' : ''
    }`;
    if (isEnemy) {
      document.getElementById('sheet-char-meta').innerHTML = `<iconify-icon icon="game-icons:monster-grasp" class="text-rose-400"></iconify-icon> Criatura Hostil • Modelo do Bestiário • <iconify-icon icon="game-icons:heart-bottle" class="icon-hp"></iconify-icon> ${char.hp}/${char.maxHp} HP • <iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon> ${char.armor}/${char.maxArmor} ARM • <iconify-icon icon="game-icons:crystal-bars" class="icon-mana"></iconify-icon> ${char.mana}/${char.maxMana} MP`;
    } else {
      document.getElementById('sheet-char-meta').innerHTML = `XP: ${char.xp || 0} / ${
        char.xpNext || 80
      } • <iconify-icon icon="game-icons:hooded-figure"></iconify-icon> Vinculado a: ${escapeHtml(ownerLabel)} • <iconify-icon icon="game-icons:weight"></iconify-icon> Carga: ${weight} / ${maxWeight} kg • ${escapeHtml(char.age || 'Idade n/d')} • ${
        escapeHtml(char.height || 'Altura n/d')
      }`;
    }

    const sheetActions = document.getElementById('sheet-header-actions');
    if (sheetActions) {
      sheetActions.innerHTML = canEdit ? `
        <button
          type="button"
          data-action="sheet-reset-char"
          data-char-id="${escapeHtml(char.id)}"
          class="px-2.5 py-1 rounded-lg text-xs font-serif-fantasy font-bold border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1.5"
          title="Resetar Personagem (mantendo buffs permanentes)"
        >
          <iconify-icon icon="game-icons:sands-of-time"></iconify-icon>
          <span class="hidden sm:inline">Resetar</span>
        </button>
      ` : '';
    }

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
            !isEnemy && canEdit && (pendingPts > 0 || isEffectiveMaster())
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
        <div class="p-2.5 rounded-xl ${er.bgClass} border text-center">
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

    if (isEnemy) {
      body.innerHTML = `
        <!-- 5 Atributos Canônicos -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="font-serif-fantasy font-extrabold uppercase gold-title">
              <iconify-icon icon="game-icons:dna1"></iconify-icon> <span>5 Atributos Canônicos, Modificadores &amp; Sucesso Passivo</span>
            </h4>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            ${attrsCardsHtml}
          </div>
        </div>

        <!-- Status Secundários de Combate -->
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

        <!-- HABILIDADES GERAIS -->
        <div class="p-3.5 rounded-xl bg-purple-950/25 border border-purple-500/40 space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="font-serif-fantasy font-extrabold uppercase text-purple-300 flex items-center gap-1.5 text-xs">
              <iconify-icon icon="game-icons:scroll-unfurled"></iconify-icon>
              <span>HABILIDADES GERAIS</span>
            </h4>
            <button
              type="button"
              data-open-general-skills="${escapeHtml(char.id)}"
              data-target-type="character"
              class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 transition flex items-center gap-1"
            >
              <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
              <span>${isEffectiveMaster() ? 'Editar Habilidades' : 'Visualizar Detalhes'}</span>
            </button>
          </div>
          <div class="p-3 rounded-lg bg-black/40 border border-purple-500/20 font-mono text-xs text-purple-200/90 whitespace-pre-wrap leading-relaxed">
            ${escapeHtml(char.generalSkills || 'Nenhuma habilidade cadastrada para esta criatura.')}
          </div>
        </div>
      `;
      return;
    }

    const totalInvEntries = (char.inventory || []).length;
    const totalInvUnits = (char.inventory || []).reduce((acc, i) => acc + Math.max(1, Number(i.quantity || 1)), 0);
    const equippedCount = (char.inventory || []).filter((i) => i.isEquipped && i.status !== 'IN_ESCROW').length;

    const hasPassive = Boolean((char.skillPassive || '').trim());
    const hasActive = Boolean((char.skillActive || '').trim());
    const hasSupreme = Boolean((char.skillSupreme || '').trim());

    const treePassives = getCharacterAcquiredTreeSkillsByCategory(char, 'PASSIVA');
    const treeActives = getCharacterAcquiredTreeSkillsByCategory(char, 'ATIVA');
    const treeSupremes = getCharacterAcquiredTreeSkillsByCategory(char, 'SUPREMA');
    const treeTalents = getCharacterAcquiredTreeSkillsByCategory(char, 'TALENTO');

    const activeTreePassivesCount = treePassives.filter((s) => s.nodeState.enabled).length;
    const activeTreeActivesCount = treeActives.filter((s) => s.nodeState.enabled).length;
    const activeTreeSupremesCount = treeSupremes.filter((s) => s.nodeState.enabled).length;

    const allAcquiredTreeNodes = [...treeSupremes, ...treeActives, ...treePassives, ...treeTalents];
    const visibleTrees = getVisibleSkillTrees();
    const completedTreesList = visibleTrees.filter((t) => computeSkillTreeProgress(char, t).isComplete);

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

      <!-- 3 Botões de Habilidades (PASSIVA, ATIVA, SUPREMA) — Abre Modal Individual Integrado com Árvore -->
      <div class="p-3.5 rounded-xl bg-black/25 border app-divider-border space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="font-serif-fantasy font-extrabold uppercase gold-title">
            <iconify-icon icon="game-icons:fairy-wand"></iconify-icon> <span>Habilidades Principais (Clique para Abrir Modal com o Texto)</span>
          </h4>
          <span class="text-[11px] app-muted">Exibe anotações manuais e habilidades adquiridas nas Árvores.</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            data-open-sheet-skill="PASSIVA"
            class="py-3 px-3 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition flex flex-col items-center justify-center gap-1"
          >
            <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:dragon-shield"></iconify-icon> <span>PASSIVA</span></span>
            <span class="text-[10px] font-mono ${hasPassive || treePassives.length > 0 ? 'text-emerald-400 font-bold' : 'app-muted'}">
              ${hasPassive ? (canEdit ? 'Ver / Editar Texto' : 'Visualizar Texto') : treePassives.length > 0 ? 'Ver Habilidades da Árvore' : canEdit ? 'Vazia (Clique p/ escrever)' : 'Vazia'}
            </span>
            ${
              treePassives.length > 0
                ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-sky-500/25 text-sky-200 border border-sky-400/40">${activeTreePassivesCount} da Árvore${treePassives.length > activeTreePassivesCount ? ` (${treePassives.length} total)` : ''}</span>`
                : `<span class="text-[9px] font-mono app-muted">0 da Árvore</span>`
            }
          </button>
          <button
            type="button"
            data-open-sheet-skill="ATIVA"
            class="py-3 px-3 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition flex flex-col items-center justify-center gap-1"
          >
            <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:crossed-swords"></iconify-icon> <span>ATIVA</span></span>
            <span class="text-[10px] font-mono ${hasActive || treeActives.length > 0 ? 'text-emerald-400 font-bold' : 'app-muted'}">
              ${hasActive ? (canEdit ? 'Ver / Editar Texto' : 'Visualizar Texto') : treeActives.length > 0 ? 'Ver Habilidades da Árvore' : canEdit ? 'Vazia (Clique p/ escrever)' : 'Vazia'}
            </span>
            ${
              treeActives.length > 0
                ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/25 text-amber-200 border border-amber-400/40">${activeTreeActivesCount} da Árvore${treeActives.length > activeTreeActivesCount ? ` (${treeActives.length} total)` : ''}</span>`
                : `<span class="text-[9px] font-mono app-muted">0 da Árvore</span>`
            }
          </button>
          <button
            type="button"
            data-open-sheet-skill="SUPREMA"
            class="py-3 px-3 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition flex flex-col items-center justify-center gap-1"
          >
            <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:ifrit" style="color: #f97316;"></iconify-icon> <span>SUPREMA</span></span>
            <span class="text-[10px] font-mono ${hasSupreme || treeSupremes.length > 0 ? 'text-emerald-400 font-bold' : 'app-muted'}">
              ${hasSupreme ? (canEdit ? 'Ver / Editar Texto' : 'Visualizar Texto') : treeSupremes.length > 0 ? 'Ver Habilidades da Árvore' : canEdit ? 'Vazia (Clique p/ escrever)' : 'Vazia'}
            </span>
            ${
              treeSupremes.length > 0
                ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500/25 text-rose-200 border border-rose-400/40">${activeTreeSupremesCount} da Árvore${treeSupremes.length > activeTreeSupremesCount ? ` (${treeSupremes.length} total)` : ''}</span>`
                : `<span class="text-[9px] font-mono app-muted">0 da Árvore</span>`
            }
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

      <!-- Árvore de Habilidades & Talentos de Nível -->
      <div class="p-3.5 rounded-xl bg-black/25 border app-divider-border space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <h4 class="font-serif-fantasy font-extrabold uppercase gold-title flex flex-wrap items-center gap-2">
              <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:family-tree"></iconify-icon> <span>Árvore de Habilidades &amp; Talentos</span></span>
              <span class="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/40 font-mono text-[11px]">
                Pontos Disponíveis: <strong class="text-purple-300">${char.skillPoints || 0}</strong>
              </span>
              ${
                isEffectiveMaster()
                  ? `<span class="inline-flex items-center gap-1">
                      <button type="button" data-sheet-skill-pt-adj="-1" class="w-5 h-5 rounded bg-black/50 hover:bg-black/80 border border-purple-500/40 text-purple-200 font-mono font-bold text-[10px]" title="Remover 1 Ponto de Talento">-1</button>
                      <button type="button" data-sheet-skill-pt-adj="1" class="w-5 h-5 rounded bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[10px]" title="Conceder +1 Ponto de Talento">+1</button>
                    </span>`
                  : ''
              }
            </h4>
            <p class="text-[11px] app-muted">
              ${allAcquiredTreeNodes.length} habilidade(s)/talento(s) desbloqueado(s) nas árvores${
                completedTreesList.length > 0 ? ` • ${completedTreesList.length} árvore(s) 100% completa(s)` : ''
              }.
            </p>
          </div>
          <button
            type="button"
            data-open-char-skill-tree="${escapeHtml(char.id)}"
            class="px-4 py-2.5 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider btn-gold flex items-center gap-2 shadow-lg"
          >
            <iconify-icon icon="game-icons:family-tree"></iconify-icon>
            <span>ABRIR ÁRVORE DE HABILIDADES</span>
          </button>
        </div>

        ${
          completedTreesList.length > 0
            ? `<div class="flex flex-wrap gap-2">
                ${completedTreesList
                  .map((t) => {
                    const compEffStr = (t.completionEffects || [])
                      .map((ef) => `${formatEffectTargetLabel(ef.targetStat)} ${ef.value >= 0 ? '+' : ''}${ef.value}${ef.modifierType === 'PERCENT' ? '%' : ''}`)
                      .join(' • ');
                    return `<div class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/25 border border-amber-400/60 text-amber-200 text-[11px] font-bold flex items-center gap-1.5 shadow">
                      <iconify-icon icon="game-icons:laurel-crown" class="text-amber-300 text-sm"></iconify-icon>
                      <span>100% ${escapeHtml(t.name)}</span>
                      ${compEffStr ? `<span class="font-mono text-[10px] text-amber-300">(${escapeHtml(compEffStr)})</span>` : ''}
                    </div>`;
                  })
                  .join('')}
              </div>`
            : ''
        }

        <div class="space-y-1.5">
          ${
            allAcquiredTreeNodes.length > 0
              ? allAcquiredTreeNodes
                  .map(({ tree, node, nodeState }) => {
                    const cat = String(node.category || 'TALENTO').toUpperCase();
                    const isTalent = cat === 'TALENTO';
                    const rankBadge = isTalent
                      ? `Nível ${nodeState.rank}/${nodeState.maxRanks}`
                      : nodeState.maxUpgrades > 0
                      ? `Melhoria ${nodeState.upgrades}/${nodeState.maxUpgrades}`
                      : 'Liberada';
                    const mult = isTalent ? nodeState.rank : 1;
                    const effectsStr = (node.effects || [])
                      .map((ef) => {
                        const totalVal = Number((Number(ef.value || 0) * mult).toFixed(2));
                        return `${formatEffectTargetLabel(ef.targetStat)} ${totalVal >= 0 ? '+' : ''}${totalVal}${ef.modifierType === 'PERCENT' ? '%' : ''}`;
                      })
                      .join(' • ');
                    return `
                      <div class="p-2.5 rounded-xl bg-black/35 border ${
                        nodeState.enabled ? 'border-amber-500/35' : 'border-slate-700/50 opacity-60'
                      } flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-1.5">
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/15 gold-title border border-amber-500/30">${escapeHtml(cat)}${node.subtype ? ` - ${escapeHtml(node.subtype.toUpperCase())}` : ''}</span>
                            <strong class="font-serif-fantasy font-bold app-title">${escapeHtml(node.name)}</strong>
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-200 border border-purple-500/35">${escapeHtml(rankBadge)}</span>
                            <span class="text-[10px] font-mono app-muted">(${escapeHtml(tree.name)})</span>
                          </div>
                          <p class="text-[11px] app-muted mt-0.5">${escapeHtml(node.description || '')}</p>
                          ${effectsStr ? `<div class="text-[10px] font-mono text-emerald-300 mt-0.5"><iconify-icon icon="game-icons:lightning-branches"></iconify-icon> ${escapeHtml(effectsStr)}</div>` : ''}
                        </div>
                        ${
                          canEdit
                            ? `<label class="inline-flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                                <input type="checkbox" data-toggle-skill-node="${escapeHtml(node.id)}" data-char-id="${escapeHtml(char.id)}" ${nodeState.enabled ? 'checked' : ''} class="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                                <span class="text-[10px] font-mono font-bold ${nodeState.enabled ? 'text-emerald-300' : 'text-slate-400'}">${nodeState.enabled ? 'Ativa' : 'Inativa'}</span>
                              </label>`
                            : `<span class="text-[10px] font-mono font-bold ${nodeState.enabled ? 'text-emerald-300' : 'text-slate-400'}">${nodeState.enabled ? 'Ativa' : 'Inativa'}</span>`
                        }
                      </div>
                    `;
                  })
                  .join('')
              : ''
          }
          ${
            (char.talents || []).map(
              (t) => `<div class="p-2 rounded bg-black/30 border app-divider-border"><strong><iconify-icon icon="game-icons:sparkles"></iconify-icon> ${escapeHtml(t.name)}:</strong> <span class="app-muted">${escapeHtml(t.description || '')}</span></div>`
            ).join('')
          }
          ${
            allAcquiredTreeNodes.length === 0 && (char.talents || []).length === 0
              ? '<p class="app-muted italic text-xs">Nenhuma habilidade ou talento adquirido nas árvores ainda. Clique em "Abrir Árvore de Habilidades" para explorar e liberar nós.</p>'
              : ''
          }
        </div>
      </div>

      <!-- Biografia -->
      <div class="pt-2 border-t app-divider-border">
        <span class="font-bold uppercase gold-title flex items-center gap-1 mb-1"><iconify-icon icon="game-icons:book-cover"></iconify-icon> <span>História</span></span>
        <p class="app-muted whitespace-pre-line">${escapeHtml(char.history || 'Sem história registrada.')}</p>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Modal 20, 21 & 22: Árvore de Habilidades (Constelação 96vw x 92vh, Ranks, 100%, Drag & Drop)
  // ---------------------------------------------------------------------------
  function openSkillTreeModal(charId = null, treeId = null) {
    const heroes = (state.characters || []).filter((c) => !c.isEnemy);
    let targetCharId = charId;
    if (!targetCharId) {
      const myChar = getMyLinkedCharacter();
      if (myChar && !myChar.isEnemy) {
        targetCharId = myChar.id;
      } else if (state.activeSheetCharId) {
        targetCharId = state.activeSheetCharId;
      } else if (heroes.length > 0) {
        targetCharId = heroes[0].id;
      }
    }
    state.activeSkillTreeCharId = targetCharId || null;

    const visibleTrees = getVisibleSkillTrees();
    if (treeId && visibleTrees.some((t) => t.id === treeId)) {
      state.activeSkillTreeId = treeId;
    } else if (!state.activeSkillTreeId || !visibleTrees.some((t) => t.id === state.activeSkillTreeId)) {
      state.activeSkillTreeId = visibleTrees[0]?.id || null;
    }

    renderSkillTreeConstellationModal();
    openModal('modal-skill-tree');
  }

  function renderSkillTreeConstellationModal() {
    const charSelect = document.getElementById('skill-tree-modal-char-select');
    const ptsBadge = document.getElementById('skill-tree-modal-points-badge');
    const masterPtsBtns = document.getElementById('skill-tree-modal-master-pts-btns');
    const masterToolbar = document.getElementById('skill-tree-modal-master-toolbar');
    const tabsContainer = document.getElementById('skill-tree-modal-tabs');
    const bodyContainer = document.getElementById('skill-tree-modal-body');
    if (!bodyContainer || !tabsContainer) return;

    const isMaster = isEffectiveMaster();
    const heroes = (state.characters || []).filter((c) => !c.isEnemy);

    if (charSelect) {
      if (heroes.length === 0) {
        charSelect.innerHTML = `<option value="">Sem personagens na mesa</option>`;
      } else {
        if (!state.activeSkillTreeCharId || !heroes.some((h) => h.id === state.activeSkillTreeCharId)) {
          const myChar = getMyLinkedCharacter();
          state.activeSkillTreeCharId = (myChar && !myChar.isEnemy ? myChar.id : heroes[0]?.id) || null;
        }
        charSelect.innerHTML = heroes
          .map(
            (h) =>
              `<option value="${escapeHtml(h.id)}" ${h.id === state.activeSkillTreeCharId ? 'selected' : ''}>${escapeHtml(
                h.name
              )} (NV ${h.level || 1} • ${h.skillPoints || 0} pts)</option>`
          )
          .join('');
      }
    }

    const activeChar = heroes.find((h) => h.id === state.activeSkillTreeCharId) || null;
    const canEditChar = activeChar ? canEditCharacter(activeChar) : isMaster;

    if (ptsBadge) {
      ptsBadge.textContent = String(activeChar ? activeChar.skillPoints || 0 : 0);
    }
    if (masterPtsBtns) {
      masterPtsBtns.classList.toggle('hidden', !(isMaster && activeChar));
    }
    if (masterToolbar) {
      masterToolbar.classList.toggle('hidden', !isMaster);
    }

    const visibleTrees = getVisibleSkillTrees();
    if (!state.activeSkillTreeId || !visibleTrees.some((t) => t.id === state.activeSkillTreeId)) {
      state.activeSkillTreeId = visibleTrees[0]?.id || null;
    }
    const activeTree = visibleTrees.find((t) => t.id === state.activeSkillTreeId) || null;

    const editTreeBtn = document.getElementById('btn-st-modal-edit-tree');
    const addNodeBtn = document.getElementById('btn-st-modal-add-node');
    if (editTreeBtn) editTreeBtn.classList.toggle('hidden', !activeTree);
    if (addNodeBtn) addNodeBtn.classList.toggle('hidden', !activeTree);

    // Abas de árvores
    if (visibleTrees.length === 0) {
      tabsContainer.innerHTML = `<span class="text-xs app-muted italic">Nenhuma árvore disponível no momento.</span>`;
      bodyContainer.innerHTML = `
        <div class="p-12 text-center app-muted border border-dashed app-divider-border rounded-2xl max-w-xl mx-auto my-8">
          <div class="text-4xl mb-3 flex justify-center gold-title"><iconify-icon icon="game-icons:family-tree"></iconify-icon></div>
          <h4 class="font-serif-fantasy font-bold text-base app-title">Nenhuma Árvore de Habilidades Disponível</h4>
          <p class="text-xs app-muted mt-1">
            ${
              isMaster
                ? 'Clique em "Exemplo (Geomancia)" ou "Nova Árvore" no topo para criar uma árvore de habilidades.'
                : 'O Mestre ainda não liberou árvores de habilidades visíveis para os jogadores.'
            }
          </p>
        </div>
      `;
      return;
    }

    tabsContainer.innerHTML = visibleTrees
      .map((t) => {
        const isSelected = t.id === activeTree?.id;
        const prog = activeChar ? computeSkillTreeProgress(activeChar, t) : { percent: 0, isComplete: false };
        return `
          <button
            type="button"
            data-st-modal-select-tree="${escapeHtml(t.id)}"
            class="px-3.5 py-2 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shrink-0 ${
              isSelected
                ? 'btn-gold shadow-lg'
                : 'bg-black/45 text-amber-200/80 border border-amber-500/25 hover:border-amber-500/50 hover:text-amber-100'
            }"
          >
            <iconify-icon icon="${prog.isComplete ? 'game-icons:laurel-crown' : 'game-icons:family-tree'}"></iconify-icon>
            <span>${escapeHtml(t.name)}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
              prog.isComplete
                ? 'bg-amber-300 text-black'
                : isSelected
                ? 'bg-black/30 text-amber-200'
                : 'bg-amber-500/15 text-amber-300'
            }">${prog.percent}%</span>
            ${
              t.hiddenForPlayers
                ? '<iconify-icon icon="game-icons:eyeball" class="text-rose-300" title="Oculta para jogadores"></iconify-icon>'
                : ''
            }
          </button>
        `;
      })
      .join('');

    if (!activeTree) return;

    const progress = activeChar
      ? computeSkillTreeProgress(activeChar, activeTree)
      : { acquiredSteps: 0, totalSteps: 0, percent: 0, isComplete: false };

    const completionEffectsBadges = (activeTree.completionEffects || [])
      .map(
        (ef) =>
          `<span class="px-2.5 py-1 rounded-lg text-xs font-mono font-black ${
            progress.isComplete
              ? 'bg-amber-400/25 text-amber-100 border border-amber-300/60 shadow'
              : 'bg-black/45 text-amber-300/80 border border-amber-500/30'
          }">
            <iconify-icon icon="game-icons:sparkles"></iconify-icon>
            ${escapeHtml(formatEffectTargetLabel(ef.targetStat))}: ${ef.value >= 0 ? '+' : ''}${ef.value}${
            ef.modifierType === 'PERCENT' ? '%' : ''
          }
          </span>`
      )
      .join('');

    const nodes = Array.isArray(activeTree.nodes) ? activeTree.nodes : [];
    const tierOrder = [
      {
        key: 'SUPREMA',
        title: 'Constelação de Supremas',
        subtitle: 'Habilidades definitivas de alto impacto e poder',
        icon: 'game-icons:ifrit',
        accentClass: 'text-rose-300 border-rose-500/40 bg-rose-950/20',
      },
      {
        key: 'ATIVA',
        title: 'Constelação de Habilidades Ativas',
        subtitle: 'Posturas, feitiços, técnicas e ataques com melhorias progressivas',
        icon: 'game-icons:crossed-swords',
        accentClass: 'text-amber-300 border-amber-500/40 bg-amber-950/20',
      },
      {
        key: 'PASSIVA',
        title: 'Constelação de Habilidades Passivas',
        subtitle: 'Efeitos permanentes ou condicionais de combate com ativação rápida',
        icon: 'game-icons:dragon-shield',
        accentClass: 'text-sky-300 border-sky-500/40 bg-sky-950/20',
      },
      {
        key: 'TALENTO',
        title: 'Constelação de Talentos (Multi-Rank)',
        subtitle: 'Aprimoramentos empilháveis por nível que fortalecem diretamente a ficha',
        icon: 'game-icons:sparkles',
        accentClass: 'text-purple-300 border-purple-500/40 bg-purple-950/20',
      },
    ];

    const tiersHtml = tierOrder
      .map((tier) => {
        const catNodes = nodes.filter((n) => String(n.category || 'TALENTO').toUpperCase() === tier.key);
        if (catNodes.length === 0 && !isMaster) return '';
        return `
          <div class="constellation-tier-section p-4 sm:p-5 rounded-2xl space-y-3.5">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b app-divider-border">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl border ${tier.accentClass} flex items-center justify-center text-lg">
                  <iconify-icon icon="${tier.icon}"></iconify-icon>
                </span>
                <div>
                  <h5 class="font-serif-fantasy font-black text-xs sm:text-sm uppercase tracking-wider gold-title">
                    ${escapeHtml(tier.title)} (${catNodes.length})
                  </h5>
                  <p class="text-[11px] app-muted">${escapeHtml(tier.subtitle)}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${
                  isMaster
                    ? `<span class="text-[10px] font-mono app-muted hidden sm:inline">Arraste os cards para reordenar</span>
                       <button
                         type="button"
                         data-st-add-node-cat="${escapeHtml(tier.key)}"
                         data-tree-id="${escapeHtml(activeTree.id)}"
                         class="px-2.5 py-1 rounded-lg text-[10px] font-serif-fantasy font-bold uppercase btn-gold-outline flex items-center gap-1"
                       >
                         <iconify-icon icon="game-icons:plus"></iconify-icon>
                         <span>＋ ${escapeHtml(tier.key)}</span>
                       </button>`
                    : ''
                }
              </div>
            </div>

            ${
              catNodes.length === 0
                ? `<div class="p-4 text-center text-xs app-muted italic border border-dashed app-divider-border rounded-xl">
                    Nenhum nó na categoria ${escapeHtml(tier.key)}. Clique em "＋ ${escapeHtml(tier.key)}" para adicionar.
                  </div>`
                : `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 constellation-nodes-grid" data-tree-id="${escapeHtml(
                    activeTree.id
                  )}">
                    ${catNodes
                      .map((node) => renderConstellationNodeCardHtml(activeChar, activeTree, node, canEditChar, isMaster))
                      .join('')}
                  </div>`
            }
          </div>
        `;
      })
      .join('');

    bodyContainer.innerHTML = `
      <!-- Cabeçalho da Árvore + Progresso (X% Completa) + Efeito de Árvore Completa (100%) -->
      <div class="skill-tree-completion-banner ${
        progress.isComplete ? 'completion-active-gold' : ''
      } p-4 sm:p-5 rounded-2xl space-y-3.5 transition-all">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-1 max-w-3xl">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="font-serif-fantasy font-black text-base sm:text-xl uppercase gold-title tracking-wider flex items-center gap-2">
                <iconify-icon icon="game-icons:family-tree"></iconify-icon>
                <span>${escapeHtml(activeTree.name)}</span>
              </h4>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                progress.isComplete
                  ? 'bg-amber-400 text-black shadow-lg'
                  : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
              }">
                ${progress.percent}% Completa (${progress.acquiredSteps}/${progress.totalSteps})
              </span>
              ${
                progress.isComplete
                  ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-serif-fantasy font-black uppercase bg-gradient-to-r from-amber-300 to-yellow-500 text-black flex items-center gap-1 shadow">
                      <iconify-icon icon="game-icons:laurel-crown"></iconify-icon>
                      <span>ÁRVORE 100% COMPLETA ATIVA!</span>
                    </span>`
                  : ''
              }
            </div>
            <p class="text-xs app-muted leading-relaxed">
              ${escapeHtml(activeTree.description || 'Adquira talentos, passivas, ativas e supremas livremente em qualquer ordem.')}
            </p>
          </div>

          <!-- Barra Visual de Progresso -->
          <div class="w-full sm:w-64 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-mono">
              <span class="app-muted uppercase">Progresso da Árvore</span>
              <strong class="${progress.isComplete ? 'text-amber-300' : 'gold-title'}">${progress.percent}%</strong>
            </div>
            <div class="w-full h-3 rounded-full bg-black/60 border border-amber-500/35 overflow-hidden p-0.5">
              <div
                class="h-full rounded-full transition-all duration-300 ${
                  progress.isComplete
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                    : 'bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400'
                }"
                style="width: ${Math.min(100, Math.max(0, progress.percent))}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Bloco EFEITO DE ÁRVORE COMPLETA (100%) -->
        <div class="p-3.5 rounded-xl ${
          progress.isComplete
            ? 'bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/25 border border-amber-300/70'
            : 'bg-black/45 border border-amber-500/25'
        } flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-1.5">
              <iconify-icon icon="game-icons:laurel-crown" class="${
                progress.isComplete ? 'text-amber-300 text-base animate-pulse' : 'gold-title text-sm'
              }"></iconify-icon>
              <span class="font-serif-fantasy font-black text-xs uppercase ${
                progress.isComplete ? 'text-amber-200' : 'gold-title'
              }">
                EFEITO DE ÁRVORE COMPLETA (100%):
              </span>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                progress.isComplete
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50'
                  : 'bg-slate-800 text-slate-400'
              }">
                ${progress.isComplete ? 'ATIVO NA FICHA' : 'BLOQUEADO (Requer 100%)'}
              </span>
            </div>
            ${
              activeTree.completionDescription
                ? `<p class="text-xs ${progress.isComplete ? 'text-amber-100 font-semibold' : 'app-muted'}">${escapeHtml(
                    activeTree.completionDescription
                  )}</p>`
                : ''
            }
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${
              completionEffectsBadges ||
              '<span class="text-[11px] font-mono app-muted italic">Nenhum modificador configurado</span>'
            }
          </div>
        </div>
      </div>

      <!-- As 4 Constelações da Árvore -->
      <div class="space-y-5">
        ${tiersHtml}
      </div>
    `;
  }

  function renderConstellationNodeCardHtml(char, tree, node, canEditChar, isMaster) {
    const cat = String(node.category || 'TALENTO').toUpperCase();
    const isTalent = cat === 'TALENTO';
    const ns = char
      ? getCharacterSkillNodeState(char, node)
      : {
          isTalent,
          rank: 0,
          maxRanks: Math.max(1, Number(node.maxRanks || 1)),
          costPerRank: Math.max(0, Number(node.costPerRank ?? 1)),
          unlocked: false,
          upgrades: 0,
          maxUpgrades: Math.max(0, Number(node.maxUpgrades || 0)),
          unlockCost: Math.max(0, Number(node.unlockCost ?? 1)),
          upgradeCost: Math.max(0, Number(node.upgradeCost ?? 1)),
          enabled: true,
          isAcquired: false,
          isMaxed: false,
        };

    const availablePts = Number(char?.skillPoints || 0);

    // Subtipo/Tag (ex: [ATIVA - POSTURA])
    const catHeaderLabel = node.subtype
      ? `[${cat} - ${String(node.subtype).toUpperCase()}]`
      : `[${cat}]`;

    const badgeColorMap = {
      SUPREMA: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      ATIVA: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      PASSIVA: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      TALENTO: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    };
    const catBadgeClass = badgeColorMap[cat] || badgeColorMap.TALENTO;

    // Indicador de Rank / Melhoria
    const progressLabel = isTalent
      ? `Nível ${ns.rank}/${ns.maxRanks}`
      : ns.unlocked
      ? ns.maxUpgrades > 0
        ? `Melhoria ${ns.upgrades}/${ns.maxUpgrades}`
        : 'Liberada (Máx)'
      : `Bloqueada${ns.maxUpgrades > 0 ? ` (0/${ns.maxUpgrades} Melhorias)` : ''}`;

    // Efeitos matemáticos
    const mult = isTalent ? Math.max(1, ns.rank) : 1;
    const effectsHtml = (node.effects || [])
      .map((ef) => {
        const baseVal = Number(ef.value || 0);
        const totalVal = Number((baseVal * mult).toFixed(2));
        const unit = ef.modifierType === 'PERCENT' ? '%' : '';
        return `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          ${escapeHtml(formatEffectTargetLabel(ef.targetStat))}: ${baseVal >= 0 ? '+' : ''}${baseVal}${unit}${
          isTalent && ns.rank > 1 ? ` (Total: ${totalVal >= 0 ? '+' : ''}${totalVal}${unit})` : ''
        }
        </span>`;
      })
      .join('');

    // Metadados modulares de combate via função isolada renderSkillCombatTags(node)
    const combatTagsHtml = renderSkillCombatTags(node);

    // Botões de ação do jogador/mestre (Liberar, + Melhorar, - Reembolsar)
    let actionButtonsHtml = '';
    if (char && canEditChar) {
      if (isTalent) {
        const canBuyNext = ns.rank < ns.maxRanks && (availablePts >= ns.costPerRank || isMaster);
        const nextBtnLabel =
          ns.rank === 0
            ? `Liberar (-${ns.costPerRank} pt${ns.costPerRank !== 1 ? 's' : ''}) [${ns.rank}/${ns.maxRanks}]`
            : `＋ Melhorar (-${ns.costPerRank} pt${ns.costPerRank !== 1 ? 's' : ''}) [${ns.rank}/${ns.maxRanks}]`;

        actionButtonsHtml = `
          <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t app-divider-border">
            ${
              ns.rank < ns.maxRanks
                ? `<button
                    type="button"
                    data-skill-node-buy="${escapeHtml(node.id)}"
                    data-tree-id="${escapeHtml(tree.id)}"
                    data-char-id="${escapeHtml(char.id)}"
                    ${!canBuyNext ? 'disabled' : ''}
                    class="flex-1 py-1.5 px-2.5 rounded-xl font-serif-fantasy font-extrabold text-[11px] uppercase tracking-wider ${
                      canBuyNext ? 'btn-gold' : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                    } transition"
                  >
                    ${escapeHtml(nextBtnLabel)}
                  </button>`
                : `<span class="flex-1 py-1.5 px-2.5 rounded-xl font-serif-fantasy font-black text-[11px] uppercase text-center bg-amber-500/20 text-amber-200 border border-amber-400/50">
                    <iconify-icon icon="game-icons:laurel-crown"></iconify-icon> Nível Máximo (${ns.rank}/${ns.maxRanks})
                  </span>`
            }
            ${
              ns.rank > 0
                ? `<button
                    type="button"
                    data-skill-node-refund="${escapeHtml(node.id)}"
                    data-tree-id="${escapeHtml(tree.id)}"
                    data-char-id="${escapeHtml(char.id)}"
                    class="py-1.5 px-2.5 rounded-xl font-mono font-bold text-[11px] bg-rose-950/50 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition"
                    title="Reembolsar 1 nível (+${ns.costPerRank} pt)"
                  >
                    － Reembolsar
                  </button>`
                : ''
            }
          </div>
        `;
      } else {
        // PASSIVA, ATIVA ou SUPREMA
        if (!ns.unlocked) {
          const canUnlock = availablePts >= ns.unlockCost || isMaster;
          actionButtonsHtml = `
            <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t app-divider-border">
              <button
                type="button"
                data-skill-node-buy="${escapeHtml(node.id)}"
                data-tree-id="${escapeHtml(tree.id)}"
                data-char-id="${escapeHtml(char.id)}"
                ${!canUnlock ? 'disabled' : ''}
                class="w-full py-2 px-3 rounded-xl font-serif-fantasy font-extrabold text-xs uppercase tracking-wider ${
                  canUnlock ? 'btn-gold' : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                } transition flex items-center justify-center gap-1.5"
              >
                <iconify-icon icon="game-icons:padlock-open"></iconify-icon>
                <span>Liberar (-${ns.unlockCost} pt${ns.unlockCost !== 1 ? 's' : ''})</span>
              </button>
            </div>
          `;
        } else {
          const hasUpgradesLeft = ns.upgrades < ns.maxUpgrades;
          const canUpgrade = hasUpgradesLeft && (availablePts >= ns.upgradeCost || isMaster);
          const refundPts = ns.upgrades > 0 ? ns.upgradeCost : ns.unlockCost;
          actionButtonsHtml = `
            <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t app-divider-border">
              ${
                hasUpgradesLeft
                  ? `<button
                      type="button"
                      data-skill-node-buy="${escapeHtml(node.id)}"
                      data-tree-id="${escapeHtml(tree.id)}"
                      data-char-id="${escapeHtml(char.id)}"
                      ${!canUpgrade ? 'disabled' : ''}
                      class="flex-1 py-1.5 px-2.5 rounded-xl font-serif-fantasy font-extrabold text-[11px] uppercase tracking-wider ${
                        canUpgrade ? 'btn-gold' : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                      } transition"
                    >
                      ＋ Melhorar (-${ns.upgradeCost} pt${ns.upgradeCost !== 1 ? 's' : ''}) [${ns.upgrades}/${ns.maxUpgrades}]
                    </button>`
                  : `<span class="flex-1 py-1.5 px-2.5 rounded-xl font-serif-fantasy font-black text-[11px] uppercase text-center bg-amber-500/20 text-amber-200 border border-amber-400/50">
                      <iconify-icon icon="game-icons:check-mark"></iconify-icon> ${
                        ns.maxUpgrades > 0 ? `Melhoria Máx (${ns.upgrades}/${ns.maxUpgrades})` : 'Habilidade Liberada'
                      }
                    </span>`
              }
              <button
                type="button"
                data-skill-node-refund="${escapeHtml(node.id)}"
                data-tree-id="${escapeHtml(tree.id)}"
                data-char-id="${escapeHtml(char.id)}"
                class="py-1.5 px-2.5 rounded-xl font-mono font-bold text-[11px] bg-rose-950/50 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition"
                title="Reembolsar (+${refundPts} pts)"
              >
                － Reembolsar
              </button>
            </div>
          `;
        }
      }
    }

    const cardStateClasses = [
      'constellation-node-card p-4 rounded-2xl flex flex-col justify-between gap-3 relative',
      ns.isAcquired ? 'node-unlocked' : '',
      ns.isMaxed ? 'node-maxed' : '',
      ns.isAcquired && !ns.enabled ? 'node-disabled-toggle' : '',
      isMaster ? 'cursor-grab active:cursor-grabbing' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return `
      <div
        class="${cardStateClasses}"
        data-skill-node-card="${escapeHtml(node.id)}"
        data-tree-id="${escapeHtml(tree.id)}"
        ${isMaster ? 'draggable="true"' : ''}
      >
        <div class="space-y-2.5">
          <!-- Topo: Categoria/Subtipo + Rank/Melhoria + Switch Ativa/Inativa + Botões Mestre -->
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1 min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase border ${catBadgeClass}">
                  ${escapeHtml(catHeaderLabel)}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  ns.isMaxed
                    ? 'bg-amber-400 text-black'
                    : ns.isAcquired
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-black/45 text-slate-400 border border-slate-700'
                }">
                  ${escapeHtml(progressLabel)}
                </span>
              </div>
              <h6 class="font-serif-fantasy font-black text-sm sm:text-base app-title leading-snug">
                ${escapeHtml(node.name)}
              </h6>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              ${
                ns.isAcquired && char && canEditChar
                  ? `<label class="inline-flex items-center gap-1 cursor-pointer select-none px-2 py-1 rounded-lg bg-black/45 border app-divider-border" title="Ativar/Desativar efeito sem reembolsar pontos">
                      <input
                        type="checkbox"
                        data-toggle-skill-node="${escapeHtml(node.id)}"
                        data-char-id="${escapeHtml(char.id)}"
                        ${ns.enabled ? 'checked' : ''}
                        class="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
                      />
                      <span class="text-[10px] font-mono font-bold ${
                        ns.enabled ? 'text-emerald-300' : 'text-slate-400'
                      }">${ns.enabled ? 'Ativa' : 'Inativa'}</span>
                    </label>`
                  : ''
              }
              ${
                isMaster
                  ? `<button
                      type="button"
                      data-edit-skill-node="${escapeHtml(node.id)}"
                      data-tree-id="${escapeHtml(tree.id)}"
                      class="w-7 h-7 rounded-lg app-icon-btn flex items-center justify-center text-xs"
                      title="Editar Nó (Mestre)"
                    >
                      <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
                    </button>
                    <button
                      type="button"
                      data-delete-skill-node="${escapeHtml(node.id)}"
                      data-tree-id="${escapeHtml(tree.id)}"
                      class="w-7 h-7 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center text-xs"
                      title="Excluir Nó (Mestre)"
                    >
                      <iconify-icon icon="game-icons:trash-can"></iconify-icon>
                    </button>`
                  : ''
              }
            </div>
          </div>

          <!-- Tags Modulares de Combate (Mana, PA, Usos, Cooldown) -->
          ${combatTagsHtml}

          <!-- Descrição Completa -->
          <p class="text-xs app-muted leading-relaxed whitespace-pre-line">${escapeHtml(node.description || '')}</p>

          <!-- Descrição da Melhoria (se houver) -->
          ${
            !isTalent && (node.maxUpgrades > 0 || node.upgradeDescription)
              ? `<div class="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/30 text-[11px]">
                  <div class="flex items-center justify-between font-mono font-bold text-amber-300 mb-0.5">
                    <span><iconify-icon icon="game-icons:upgrade"></iconify-icon> Melhoria (${ns.upgrades}/${ns.maxUpgrades})</span>
                    <span>Custo: ${ns.upgradeCost} pt${ns.upgradeCost !== 1 ? 's' : ''}/nível</span>
                  </div>
                  ${
                    node.upgradeDescription
                      ? `<p class="text-amber-100/90">${escapeHtml(node.upgradeDescription)}</p>`
                      : ''
                  }
                </div>`
              : ''
          }

          <!-- Efeitos Matemáticos na Ficha -->
          ${
            effectsHtml
              ? `<div class="flex flex-wrap gap-1.5 pt-0.5">${effectsHtml}</div>`
              : ''
          }
        </div>

        ${actionButtonsHtml}
      </div>
    `;
  }

  function handleSkillNodePurchaseOrUpgrade(charId, treeId, nodeId) {
    const char = state.characters.find((c) => c.id === charId);
    const tree = (state.skillTrees || []).find((t) => t.id === treeId);
    const node = (tree?.nodes || []).find((n) => n.id === nodeId);
    if (!char || !tree || !node) return;

    if (!canEditCharacter(char)) {
      showToast('Você só pode adquirir habilidades para o seu próprio personagem!', 'warning');
      return;
    }

    commitMutation(
      (st, toasts) => {
        const c = st.characters.find((x) => x.id === charId);
        const tr = (st.skillTrees || []).find((x) => x.id === treeId);
        const nd = (tr?.nodes || []).find((x) => x.id === nodeId);
        if (!c || !tr || !nd) return false;

        if (!c.skillTreeProgress || typeof c.skillTreeProgress !== 'object') {
          c.skillTreeProgress = {};
        }

        const wasCompleteBefore = computeSkillTreeProgress(c, tr).isComplete;
        const ns = getCharacterSkillNodeState(c, nd);
        const availPts = Number(c.skillPoints || 0);

        if (ns.isTalent) {
          if (ns.rank >= ns.maxRanks) {
            showToast('Este talento já atingiu o nível máximo!', 'warning');
            return false;
          }
          if (availPts < ns.costPerRank && !isEffectiveMaster()) {
            showToast(`Pontos de Talento insuficientes! Necessário: ${ns.costPerRank} pt(s).`, 'warning');
            return false;
          }
          c.skillPoints = Math.max(0, availPts - ns.costPerRank);
          const nextRank = ns.rank + 1;
          c.skillTreeProgress[nd.id] = {
            ...(c.skillTreeProgress[nd.id] || {}),
            rank: nextRank,
            enabled: c.skillTreeProgress[nd.id]?.enabled !== false,
          };
          toasts.push(`✨ Talento "${nd.name}" aprimorado para Nível ${nextRank}/${ns.maxRanks} em ${c.name}!`);
        } else {
          if (!ns.unlocked) {
            if (availPts < ns.unlockCost && !isEffectiveMaster()) {
              showToast(`Pontos de Talento insuficientes para liberar! Necessário: ${ns.unlockCost} pt(s).`, 'warning');
              return false;
            }
            c.skillPoints = Math.max(0, availPts - ns.unlockCost);
            c.skillTreeProgress[nd.id] = {
              unlocked: true,
              upgrades: 0,
              enabled: true,
            };
            toasts.push(`🔓 Habilidade "${nd.name}" liberada para ${c.name}!`);
          } else {
            if (ns.upgrades >= ns.maxUpgrades) {
              showToast('Esta habilidade já atingiu o limite máximo de melhorias!', 'warning');
              return false;
            }
            if (availPts < ns.upgradeCost && !isEffectiveMaster()) {
              showToast(`Pontos de Talento insuficientes para melhorar! Necessário: ${ns.upgradeCost} pt(s).`, 'warning');
              return false;
            }
            c.skillPoints = Math.max(0, availPts - ns.upgradeCost);
            const nextUpgrades = ns.upgrades + 1;
            c.skillTreeProgress[nd.id] = {
              ...(c.skillTreeProgress[nd.id] || {}),
              unlocked: true,
              upgrades: nextUpgrades,
              enabled: c.skillTreeProgress[nd.id]?.enabled !== false,
            };
            toasts.push(`⬆️ Habilidade "${nd.name}" melhorada (${nextUpgrades}/${ns.maxUpgrades}) em ${c.name}!`);
          }
        }

        recalculateCharacterDerived(c);
        const isCompleteNow = computeSkillTreeProgress(c, tr).isComplete;
        if (!wasCompleteBefore && isCompleteNow) {
          toasts.push(`👑 Árvore "${tr.name}" 100% COMPLETA! Bônus de conclusão ativado em dourado na ficha de ${c.name}!`);
        }
        return true;
      },
      {
        actionType: 'SKILL_TREE_BUY',
        targetEntity: `${char.name} -> ${node.name}`,
        summary: `Aquisição/Melhoria do nó "${node.name}" na árvore "${tree.name}".`,
      }
    );
  }

  function handleSkillNodeRefund(charId, treeId, nodeId) {
    const char = state.characters.find((c) => c.id === charId);
    const tree = (state.skillTrees || []).find((t) => t.id === treeId);
    const node = (tree?.nodes || []).find((n) => n.id === nodeId);
    if (!char || !tree || !node) return;

    if (!canEditCharacter(char)) {
      showToast('Você só pode reembolsar habilidades do seu próprio personagem!', 'warning');
      return;
    }

    commitMutation(
      (st, toasts) => {
        const c = st.characters.find((x) => x.id === charId);
        const tr = (st.skillTrees || []).find((x) => x.id === treeId);
        const nd = (tr?.nodes || []).find((x) => x.id === nodeId);
        if (!c || !tr || !nd) return false;
        if (!c.skillTreeProgress || typeof c.skillTreeProgress !== 'object') return false;

        const wasCompleteBefore = computeSkillTreeProgress(c, tr).isComplete;
        const ns = getCharacterSkillNodeState(c, nd);

        if (ns.isTalent) {
          if (ns.rank <= 0) return false;
          const nextRank = ns.rank - 1;
          c.skillPoints = Number(c.skillPoints || 0) + ns.costPerRank;
          if (nextRank <= 0) {
            delete c.skillTreeProgress[nd.id];
          } else {
            c.skillTreeProgress[nd.id] = {
              ...(c.skillTreeProgress[nd.id] || {}),
              rank: nextRank,
            };
          }
          toasts.push(`↩️ 1 nível de "${nd.name}" reembolsado (+${ns.costPerRank} pt) para ${c.name}.`);
        } else {
          if (!ns.unlocked) return false;
          if (ns.upgrades > 0) {
            const nextUpgrades = ns.upgrades - 1;
            c.skillPoints = Number(c.skillPoints || 0) + ns.upgradeCost;
            c.skillTreeProgress[nd.id] = {
              ...(c.skillTreeProgress[nd.id] || {}),
              unlocked: true,
              upgrades: nextUpgrades,
            };
            toasts.push(`↩️ 1 melhoria de "${nd.name}" reembolsada (+${ns.upgradeCost} pts) para ${c.name}.`);
          } else {
            c.skillPoints = Number(c.skillPoints || 0) + ns.unlockCost;
            delete c.skillTreeProgress[nd.id];
            toasts.push(`↩️ Liberação de "${nd.name}" reembolsada (+${ns.unlockCost} pts) para ${c.name}.`);
          }
        }

        recalculateCharacterDerived(c);
        c.hp = Math.min(c.hp, c.maxHp);
        c.armor = Math.min(c.armor, c.maxArmor);
        c.mana = Math.min(c.mana, c.maxMana);

        const isCompleteNow = computeSkillTreeProgress(c, tr).isComplete;
        if (wasCompleteBefore && !isCompleteNow) {
          toasts.push(`⚠️ Árvore "${tr.name}" caiu abaixo de 100%. O Efeito de Árvore Completa foi desativado.`);
        }
        return true;
      },
      {
        actionType: 'SKILL_TREE_REFUND',
        targetEntity: `${char.name} -> ${node.name}`,
        summary: `Reembolso no nó "${node.name}" da árvore "${tree.name}".`,
      }
    );
  }

  function handleSkillNodeToggleEnabled(charId, nodeId, enabled) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char || !canEditCharacter(char)) {
      showToast('Sem permissão para alterar habilidades deste personagem.', 'warning');
      return;
    }

    commitMutation(
      (st, toasts) => {
        const c = st.characters.find((x) => x.id === charId);
        if (!c || !c.skillTreeProgress || !c.skillTreeProgress[nodeId]) return false;
        c.skillTreeProgress[nodeId].enabled = Boolean(enabled);
        recalculateCharacterDerived(c);
        c.hp = Math.min(c.hp, c.maxHp);
        c.armor = Math.min(c.armor, c.maxArmor);
        c.mana = Math.min(c.mana, c.maxMana);
        toasts.push(`Habilidade ${enabled ? 'ativada' : 'desativada'} na ficha de ${c.name}.`);
        return true;
      },
      {
        actionType: 'SKILL_TREE_TOGGLE',
        targetEntity: `${char.name} (${nodeId})`,
        summary: `Habilidade da árvore ${enabled ? 'ativada' : 'desativada'}.`,
      }
    );
  }

  function handleAdjustCharacterSkillPoints(charId, delta) {
    if (!isEffectiveMaster()) return;
    commitMutation(
      (st, toasts) => {
        const c = st.characters.find((x) => x.id === charId);
        if (!c) return false;
        c.skillPoints = Math.max(0, Number(c.skillPoints || 0) + Number(delta || 0));
        toasts.push(
          `Pontos de Talento de ${c.name}: ${c.skillPoints} (${delta >= 0 ? '+' : ''}${delta}).`
        );
        return true;
      },
      {
        actionType: 'SKILL_POINTS_ADJUST',
        targetEntity: `Personagem ID: ${charId}`,
        summary: `Ajuste de Pontos de Talento (${delta >= 0 ? '+' : ''}${delta}).`,
      }
    );
  }

  function seedGeomanciaSkillTree() {
    if (!isEffectiveMaster()) {
      showToast('Apenas o Mestre pode carregar templates de Árvore de Habilidades!', 'warning');
      return;
    }
    commitMutation(
      (st, toasts) => {
        if (!Array.isArray(st.skillTrees)) st.skillTrees = [];
        const tpl = buildGeomanciaSkillTreeTemplate();
        const existingIdx = st.skillTrees.findIndex(
          (t) => t.id === 'tree_geomancia' || String(t.name || '').toLowerCase() === 'geomancia'
        );
        if (existingIdx >= 0) {
          tpl.id = st.skillTrees[existingIdx].id;
          st.skillTrees[existingIdx] = tpl;
          state.activeSkillTreeId = tpl.id;
          toasts.push('🪨 Árvore de Exemplo "Geomancia" restaurada/atualizada com sucesso!');
        } else {
          st.skillTrees.push(tpl);
          state.activeSkillTreeId = tpl.id;
          toasts.push('🪨 Árvore de Exemplo "Geomancia" adicionada com sucesso!');
        }
        for (const c of st.characters || []) {
          recalculateCharacterDerived(c);
        }
        return true;
      },
      {
        actionType: 'SKILL_TREE_SEED_GEOMANCIA',
        targetEntity: 'Árvore: Geomancia',
        summary: 'Árvore de exemplo Geomancia carregada.',
      }
    );
  }

  function createSkillTreeCompletionEffectRowElement(mod = {}) {
    const row = document.createElement('div');
    row.className = 'st-completion-effect-row grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded-lg bg-black/40 border border-amber-500/25';
    const currentTarget = mod.targetStat || 'CAPACIDADE_PESO';
    const currentType = mod.modifierType || 'FLAT';
    const currentVal = mod.value ?? 10;

    row.innerHTML = `
      <div class="sm:col-span-6">
        <select data-st-comp-target class="w-full px-2.5 py-1.5 text-xs font-bold app-input">
          ${renderEffectTargetSelectOptions(currentTarget)}
        </select>
      </div>
      <div class="sm:col-span-3">
        <select data-st-comp-type class="w-full px-2.5 py-1.5 text-xs font-mono font-bold app-input">
          <option value="FLAT" ${currentType === 'FLAT' ? 'selected' : ''}>FLAT (+ / -)</option>
          <option value="PERCENT" ${currentType === 'PERCENT' ? 'selected' : ''}>PORCENTAGEM (%)</option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <input type="number" step="any" data-st-comp-val value="${currentVal}" class="w-full px-2.5 py-1.5 text-xs font-mono font-black app-input text-center" />
      </div>
      <div class="sm:col-span-1 flex justify-end">
        <button type="button" data-remove-st-comp-effect class="w-7 h-7 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center text-xs" title="Remover Efeito">✕</button>
      </div>
    `;
    row.querySelector('[data-remove-st-comp-effect]')?.addEventListener('click', () => row.remove());
    return row;
  }

  function openSkillTreeFormModal(treeId = null) {
    if (!isEffectiveMaster()) {
      showToast('Apenas o Mestre pode configurar Árvores de Habilidades!', 'warning');
      return;
    }
    const existing = treeId ? (state.skillTrees || []).find((t) => t.id === treeId) : null;
    document.getElementById('st-form-id').value = existing ? existing.id : '';
    document.getElementById('skill-tree-form-modal-title').textContent = existing
      ? `Editar Árvore: ${existing.name}`
      : 'Nova Árvore de Habilidades';
    document.getElementById('st-form-name').value = existing ? existing.name || '' : '';
    document.getElementById('st-form-desc').value = existing ? existing.description || '' : '';
    document.getElementById('st-form-hidden').checked = Boolean(existing?.hiddenForPlayers);
    document.getElementById('st-form-completion-desc').value = existing ? existing.completionDescription || '' : '';

    const listEl = document.getElementById('st-completion-effects-list');
    if (listEl) {
      listEl.innerHTML = '';
      const effects = Array.isArray(existing?.completionEffects) ? existing.completionEffects : [];
      effects.forEach((ef) => listEl.appendChild(createSkillTreeCompletionEffectRowElement(ef)));
    }

    const delBtn = document.getElementById('btn-delete-skill-tree');
    if (delBtn) delBtn.classList.toggle('hidden', !existing);

    openModal('modal-skill-tree-form');
  }

  function handleSkillTreeFormSubmit(e) {
    e.preventDefault();
    if (!isEffectiveMaster()) return;

    const treeId = document.getElementById('st-form-id')?.value.trim();
    const name = document.getElementById('st-form-name')?.value.trim() || 'Árvore Sem Nome';
    const description = document.getElementById('st-form-desc')?.value.trim() || '';
    const hiddenForPlayers = Boolean(document.getElementById('st-form-hidden')?.checked);
    const completionDescription = document.getElementById('st-form-completion-desc')?.value.trim() || '';

    const completionEffects = [];
    document.querySelectorAll('#st-completion-effects-list .st-completion-effect-row').forEach((row) => {
      const targetStat = row.querySelector('[data-st-comp-target]')?.value;
      const modifierType = row.querySelector('[data-st-comp-type]')?.value || 'FLAT';
      const valRaw = Number(row.querySelector('[data-st-comp-val]')?.value || 0);
      if (targetStat && Number.isFinite(valRaw) && valRaw !== 0) {
        completionEffects.push({ targetStat, modifierType, value: valRaw });
      }
    });

    commitMutation(
      (st, toasts) => {
        if (!Array.isArray(st.skillTrees)) st.skillTrees = [];
        if (treeId) {
          const target = st.skillTrees.find((t) => t.id === treeId);
          if (!target) return false;
          target.name = name;
          target.description = description;
          target.hiddenForPlayers = hiddenForPlayers;
          target.completionDescription = completionDescription;
          target.completionEffects = completionEffects;
          toasts.push(`Árvore "${name}" atualizada!`);
        } else {
          const newTree = {
            id: `tree_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name,
            description,
            hiddenForPlayers,
            completionDescription,
            completionEffects,
            nodes: [],
          };
          st.skillTrees.push(newTree);
          state.activeSkillTreeId = newTree.id;
          toasts.push(`Árvore "${name}" criada com sucesso!`);
        }
        for (const c of st.characters || []) {
          recalculateCharacterDerived(c);
        }
        return true;
      },
      {
        actionType: treeId ? 'SKILL_TREE_UPDATE' : 'SKILL_TREE_CREATE',
        targetEntity: `Árvore: ${name}`,
        summary: `Árvore de Habilidades "${name}" salva.`,
      }
    );

    closeModal('modal-skill-tree-form');
  }

  function deleteSkillTree(treeId) {
    if (!isEffectiveMaster()) return;
    const tree = (state.skillTrees || []).find((t) => t.id === treeId);
    if (!tree) return;

    commitMutation(
      (st, toasts) => {
        st.skillTrees = (st.skillTrees || []).filter((t) => t.id !== treeId);
        if (state.activeSkillTreeId === treeId) {
          state.activeSkillTreeId = st.skillTrees[0]?.id || null;
        }
        for (const c of st.characters || []) {
          recalculateCharacterDerived(c);
        }
        toasts.push(`Árvore "${tree.name}" removida.`);
        return true;
      },
      {
        actionType: 'SKILL_TREE_DELETE',
        targetEntity: `Árvore: ${tree.name}`,
        summary: `Árvore "${tree.name}" excluída.`,
      }
    );
    closeModal('modal-skill-tree-form');
  }

  function createSkillNodeEffectRowElement(mod = {}) {
    const row = document.createElement('div');
    row.className = 'sn-effect-row grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded-lg bg-black/40 border app-divider-border';
    const currentTarget = mod.targetStat || 'ARMADURA_MAX';
    const currentType = mod.modifierType || 'FLAT';
    const currentVal = mod.value ?? 1;

    row.innerHTML = `
      <div class="sm:col-span-6">
        <select data-sn-eff-target class="w-full px-2.5 py-1.5 text-xs font-bold app-input">
          ${renderEffectTargetSelectOptions(currentTarget)}
        </select>
      </div>
      <div class="sm:col-span-3">
        <select data-sn-eff-type class="w-full px-2.5 py-1.5 text-xs font-mono font-bold app-input">
          <option value="FLAT" ${currentType === 'FLAT' ? 'selected' : ''}>FLAT (+ / -)</option>
          <option value="PERCENT" ${currentType === 'PERCENT' ? 'selected' : ''}>PORCENTAGEM (%)</option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <input type="number" step="any" data-sn-eff-val value="${currentVal}" class="w-full px-2.5 py-1.5 text-xs font-mono font-black app-input text-center" />
      </div>
      <div class="sm:col-span-1 flex justify-end">
        <button type="button" data-remove-sn-effect class="w-7 h-7 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center text-xs" title="Remover Efeito">✕</button>
      </div>
    `;
    row.querySelector('[data-remove-sn-effect]')?.addEventListener('click', () => row.remove());
    return row;
  }

  function syncSkillNodeFormCategoryUI() {
    const cat = String(document.getElementById('sn-form-category')?.value || 'TALENTO').toUpperCase();
    const isTalent = cat === 'TALENTO';
    const isActiveOrSupreme = cat === 'ATIVA' || cat === 'SUPREMA';

    document.getElementById('sn-talent-ranks-section')?.classList.toggle('hidden', !isTalent);
    document.getElementById('sn-unlock-upgrades-section')?.classList.toggle('hidden', isTalent);
    document.getElementById('sn-combat-metadata-section')?.classList.toggle('hidden', !isActiveOrSupreme);

    const effTitleEl = document.getElementById('sn-effects-builder-title');
    const effHintEl = document.getElementById('sn-effects-builder-hint');
    if (effTitleEl) {
      effTitleEl.innerHTML = isTalent
        ? `<iconify-icon icon="game-icons:lightning-branches"></iconify-icon> <span>EFEITOS POR NÍVEL (FLAT / %)</span>`
        : `<iconify-icon icon="game-icons:lightning-branches"></iconify-icon> <span>EFEITOS SE ADQUIRIDA (FLAT / % — OPCIONAL)</span>`;
    }
    if (effHintEl) {
      effHintEl.textContent = isTalent
        ? 'Multiplicados automaticamente pelo nível atual adquirido (NívelAtual × ValorDoEfeito).'
        : 'Aplicados na ficha quando a habilidade estiver liberada e com o switch Ativa ligado (opcional).';
    }
  }

  function openSkillNodeFormModal(treeId, nodeId = null, defaultCategory = 'TALENTO') {
    if (!isEffectiveMaster()) {
      showToast('Apenas o Mestre pode criar ou editar nós da Árvore de Habilidades!', 'warning');
      return;
    }
    const tree = (state.skillTrees || []).find((t) => t.id === treeId);
    if (!tree) return;
    const existing = nodeId ? (tree.nodes || []).find((n) => n.id === nodeId) : null;

    document.getElementById('sn-form-tree-id').value = tree.id;
    document.getElementById('sn-form-node-id').value = existing ? existing.id : '';
    document.getElementById('skill-node-form-modal-title').textContent = existing
      ? `Editar Nó: ${existing.name}`
      : `Novo Nó em ${tree.name}`;

    const cat = existing ? String(existing.category || 'TALENTO').toUpperCase() : defaultCategory;
    document.getElementById('sn-form-category').value = cat;
    document.getElementById('sn-form-name').value = existing ? existing.name || '' : '';
    document.getElementById('sn-form-subtype').value = existing ? existing.subtype || '' : '';
    document.getElementById('sn-form-desc').value = existing ? existing.description || '' : '';

    document.getElementById('sn-form-max-ranks').value = String(existing?.maxRanks ?? 5);
    document.getElementById('sn-form-cost-per-rank').value = String(existing?.costPerRank ?? 1);

    document.getElementById('sn-form-unlock-cost').value = String(existing?.unlockCost ?? 4);
    document.getElementById('sn-form-max-upgrades').value = String(existing?.maxUpgrades ?? 0);
    document.getElementById('sn-form-upgrade-cost').value = String(existing?.upgradeCost ?? 2);
    document.getElementById('sn-form-upgrade-desc').value = existing ? existing.upgradeDescription || '' : '';

    document.getElementById('sn-form-mana-cost').value = existing ? existing.manaCost || '' : '';
    document.getElementById('sn-form-pa-cost').value = existing ? existing.paCost || '' : '';
    document.getElementById('sn-form-uses').value = existing ? existing.uses || '' : '';
    document.getElementById('sn-form-cooldown').value = existing ? existing.cooldown || '' : '';

    const effListEl = document.getElementById('sn-effects-list');
    if (effListEl) {
      effListEl.innerHTML = '';
      const effects = Array.isArray(existing?.effects) ? existing.effects : [];
      effects.forEach((ef) => effListEl.appendChild(createSkillNodeEffectRowElement(ef)));
    }

    const delBtn = document.getElementById('btn-delete-skill-node');
    if (delBtn) delBtn.classList.toggle('hidden', !existing);

    syncSkillNodeFormCategoryUI();
    openModal('modal-skill-node-form');
  }

  function handleSkillNodeFormSubmit(e) {
    e.preventDefault();
    if (!isEffectiveMaster()) return;

    const treeId = document.getElementById('sn-form-tree-id')?.value.trim();
    const nodeId = document.getElementById('sn-form-node-id')?.value.trim();
    const category = String(document.getElementById('sn-form-category')?.value || 'TALENTO').toUpperCase();
    const name = document.getElementById('sn-form-name')?.value.trim() || 'Habilidade Sem Nome';
    const subtype = document.getElementById('sn-form-subtype')?.value.trim() || '';
    const description = document.getElementById('sn-form-desc')?.value.trim() || '';

    const maxRanks = Math.max(1, Math.round(Number(document.getElementById('sn-form-max-ranks')?.value || 1)));
    const costPerRank = Math.max(0, Math.round(Number(document.getElementById('sn-form-cost-per-rank')?.value ?? 1)));

    const unlockCost = Math.max(0, Math.round(Number(document.getElementById('sn-form-unlock-cost')?.value ?? 1)));
    const maxUpgrades = Math.max(0, Math.round(Number(document.getElementById('sn-form-max-upgrades')?.value || 0)));
    const upgradeCost = Math.max(0, Math.round(Number(document.getElementById('sn-form-upgrade-cost')?.value ?? 1)));
    const upgradeDescription = document.getElementById('sn-form-upgrade-desc')?.value.trim() || '';

    const manaCost = document.getElementById('sn-form-mana-cost')?.value.trim() || '';
    const paCost = document.getElementById('sn-form-pa-cost')?.value.trim() || '';
    const uses = document.getElementById('sn-form-uses')?.value.trim() || '';
    const cooldown = document.getElementById('sn-form-cooldown')?.value.trim() || '';

    const effects = [];
    document.querySelectorAll('#sn-effects-list .sn-effect-row').forEach((row) => {
      const targetStat = row.querySelector('[data-sn-eff-target]')?.value;
      const modifierType = row.querySelector('[data-sn-eff-type]')?.value || 'FLAT';
      const valRaw = Number(row.querySelector('[data-sn-eff-val]')?.value || 0);
      if (targetStat && Number.isFinite(valRaw) && valRaw !== 0) {
        effects.push({ targetStat, modifierType, value: valRaw });
      }
    });

    commitMutation(
      (st, toasts) => {
        const tree = (st.skillTrees || []).find((t) => t.id === treeId);
        if (!tree) return false;
        if (!Array.isArray(tree.nodes)) tree.nodes = [];

        const nodePayload = {
          id: nodeId || `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          category,
          name,
          subtype,
          description,
          maxRanks: category === 'TALENTO' ? maxRanks : 1,
          costPerRank: category === 'TALENTO' ? costPerRank : unlockCost,
          unlockCost: category === 'TALENTO' ? costPerRank : unlockCost,
          maxUpgrades: category === 'TALENTO' ? 0 : maxUpgrades,
          upgradeCost: category === 'TALENTO' ? 0 : upgradeCost,
          upgradeDescription: category === 'TALENTO' ? '' : upgradeDescription,
          manaCost,
          paCost,
          uses,
          cooldown,
          effects,
        };

        if (nodeId) {
          const idx = tree.nodes.findIndex((n) => n.id === nodeId);
          if (idx >= 0) {
            nodePayload.order = tree.nodes[idx].order ?? idx;
            tree.nodes[idx] = nodePayload;
          } else {
            tree.nodes.push(nodePayload);
          }
          toasts.push(`Nó "${name}" atualizado em ${tree.name}!`);
        } else {
          nodePayload.order = tree.nodes.length;
          tree.nodes.push(nodePayload);
          toasts.push(`Nó "${name}" adicionado à árvore ${tree.name}!`);
        }

        for (const c of st.characters || []) {
          recalculateCharacterDerived(c);
        }
        return true;
      },
      {
        actionType: nodeId ? 'SKILL_NODE_UPDATE' : 'SKILL_NODE_CREATE',
        targetEntity: `${name} (${category})`,
        summary: `Nó "${name}" salvo na árvore.`,
      }
    );

    closeModal('modal-skill-node-form');
  }

  function deleteSkillNode(treeId, nodeId) {
    if (!isEffectiveMaster()) return;
    const tree = (state.skillTrees || []).find((t) => t.id === treeId);
    const node = (tree?.nodes || []).find((n) => n.id === nodeId);
    if (!tree || !node) return;

    commitMutation(
      (st, toasts) => {
        const tr = (st.skillTrees || []).find((t) => t.id === treeId);
        if (!tr || !Array.isArray(tr.nodes)) return false;
        tr.nodes = tr.nodes.filter((n) => n.id !== nodeId);
        for (const c of st.characters || []) {
          if (c.skillTreeProgress && c.skillTreeProgress[nodeId]) {
            delete c.skillTreeProgress[nodeId];
          }
          recalculateCharacterDerived(c);
        }
        toasts.push(`Nó "${node.name}" removido de ${tr.name}.`);
        return true;
      },
      {
        actionType: 'SKILL_NODE_DELETE',
        targetEntity: `Nó: ${node.name}`,
        summary: `Nó "${node.name}" excluído da árvore "${tree.name}".`,
      }
    );
    closeModal('modal-skill-node-form');
  }

  function reorderSkillTreeNodes(treeId, draggedNodeId, targetNodeId) {
    if (!isEffectiveMaster() || !draggedNodeId || !targetNodeId || draggedNodeId === targetNodeId) return;
    commitMutation(
      (st) => {
        const tree = (st.skillTrees || []).find((t) => t.id === treeId);
        if (!tree || !Array.isArray(tree.nodes)) return false;
        const fromIdx = tree.nodes.findIndex((n) => n.id === draggedNodeId);
        const toIdx = tree.nodes.findIndex((n) => n.id === targetNodeId);
        if (fromIdx < 0 || toIdx < 0) return false;
        const [moved] = tree.nodes.splice(fromIdx, 1);
        tree.nodes.splice(toIdx, 0, moved);
        tree.nodes.forEach((n, idx) => {
          n.order = idx;
        });
        return true;
      },
      {
        actionType: 'SKILL_NODE_REORDER',
        targetEntity: `Árvore ID: ${treeId}`,
        summary: 'Reordenação visual de nós na Árvore de Habilidades.',
      }
    );
  }



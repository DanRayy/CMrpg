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
              target.resistances[r.name] = { current: 0, max: iMax };
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
        ${EFFECT_TARGET_OPTIONS.map(
          (o) => `<option value="${o.value}" ${currentTarget === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
        ).join('')}
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


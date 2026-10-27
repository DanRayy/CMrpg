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
                data-action="open-sheet"
                data-char-id="${escapeHtml(char.id)}"
                title="Abrir Ficha Completa do Inimigo (Atributos, Resistências e Habilidades)"
                class="w-9 h-9 rounded-lg flex items-center justify-center text-base app-icon-btn shrink-0 transition"
              >
                <iconify-icon icon="game-icons:tied-scroll"></iconify-icon>
              </button>
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
            <div class="flex items-center gap-2 pt-2 border-t app-divider-border">
              <div class="flex-1 p-2 rounded-lg bg-black/20 border app-divider-border text-center text-xs font-mono ${isEnemy ? 'text-emerald-300/80' : 'text-amber-200/80'} flex items-center justify-center gap-1.5">
                <iconify-icon icon="${isEnemy ? 'game-icons:eyeball' : 'game-icons:tied-scroll'}" style="color: ${isEnemy ? '#4ade80' : '#f59e0b'};"></iconify-icon>
                <span>${isEnemy ? 'Criatura Revelada (Controle do Mestre)' : 'Ficha de Aliado (Somente Visualização)'}</span>
              </div>
              <button
                type="button"
                data-action="pill-notes"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill action-pill-notes py-2 px-3 rounded-lg font-extrabold text-[11px] tracking-tight flex items-center justify-center gap-1 shrink-0"
                title="Anotações e Bloco de Notas"
              >
                <span>NOTAS</span>
                <iconify-icon icon="game-icons:quill-ink" class="shrink-0"></iconify-icon>
              </button>
            </div>
          `;
        } else {
          bottomActionsHtml = `
            <div class="grid grid-cols-3 gap-2 pt-2 border-t app-divider-border">
              <button
                type="button"
                data-action="pill-damage"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill action-pill-damage py-2 px-1 rounded-lg font-extrabold text-[11px] tracking-tight flex items-center justify-center gap-1"
                title="Aplicar Dano"
              >
                <span>DANO</span>
                <iconify-icon icon="game-icons:broadsword" class="icon-dmg shrink-0"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-attr"
                data-attr="hp"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill py-2 px-1 rounded-lg font-extrabold text-[11px] tracking-tight flex items-center justify-center gap-1"
                title="Gerenciar Vida"
              >
                <span>VIDA</span>
                <iconify-icon icon="game-icons:heart-bottle" class="icon-hp shrink-0"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-attr"
                data-attr="armor"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill py-2 px-1 rounded-lg font-extrabold text-[11px] tracking-tight flex items-center justify-center gap-1"
                title="Gerenciar Armadura"
              >
                <span>ARMADURA</span>
                <iconify-icon icon="game-icons:breastplate" class="icon-armor shrink-0"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-attr"
                data-attr="mana"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill py-2 px-1 rounded-lg font-extrabold text-[11px] tracking-tight flex items-center justify-center gap-1"
                title="Gerenciar Mana"
              >
                <span>MANA</span>
                <iconify-icon icon="game-icons:crystal-bars" class="icon-mana shrink-0"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-reset"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill py-2 px-1 rounded-lg font-extrabold text-[11px] tracking-tight flex items-center justify-center gap-1"
                title="Resetar Personagem"
              >
                <span>RESETAR</span>
                <iconify-icon icon="game-icons:sands-of-time" class="shrink-0"></iconify-icon>
              </button>
              <button
                type="button"
                data-action="pill-notes"
                data-char-id="${escapeHtml(char.id)}"
                class="action-pill action-pill-notes py-2 px-1 rounded-lg font-extrabold text-[11px] tracking-tight flex items-center justify-center gap-1"
                title="Anotações e Bloco de Notas"
              >
                <span>NOTAS</span>
                <iconify-icon icon="game-icons:quill-ink" class="shrink-0"></iconify-icon>
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

            ${
              it.descricao
                ? (it.descricao.length > 70
                    ? `<div class="mt-1">
                        <p id="cat-desc-${escapeHtml(it.id)}" class="text-xs app-muted leading-relaxed item-description line-clamp-1">${escapeHtml(it.descricao)}</p>
                        <button type="button" data-toggle-desc="cat-desc-${escapeHtml(it.id)}" class="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-0.5" title="Ver descrição completa">
                          <iconify-icon icon="game-icons:magnifying-glass" class="text-xs"></iconify-icon> <span>Ver descrição</span>
                        </button>
                      </div>`
                    : `<p class="text-xs app-muted leading-relaxed item-description">${escapeHtml(it.descricao)}</p>`)
                : '<p class="text-xs app-muted italic">Sem descrição.</p>'
            }

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
            ${
              item.descricao
                ? (item.descricao.length > 70
                    ? `<div class="mt-2">
                        <p id="shop-desc-${escapeHtml(item.id)}" class="text-xs app-muted item-description line-clamp-1 leading-relaxed">${escapeHtml(item.descricao)}</p>
                        <button type="button" data-toggle-desc="shop-desc-${escapeHtml(item.id)}" class="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-0.5" title="Ver descrição completa">
                          <iconify-icon icon="game-icons:magnifying-glass" class="text-xs"></iconify-icon> <span>Ver descrição</span>
                        </button>
                      </div>`
                    : `<p class="text-xs app-muted mt-2 item-description leading-relaxed">${escapeHtml(item.descricao)}</p>`)
                : ''
            }
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

          const normElemRes = normalizeElementalResistances(e.elementalResistances);
          const elemResChips = ELEMENTAL_RESISTANCE_TYPES.map((er) => {
            const val = normElemRes[er.key];
            return `
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${er.bgClass} ${er.textClass}" title="Resistência a Dano ${escapeHtml(er.label)}: ${val}%">
                ${er.icon} <span>${escapeHtml(er.label)}: ${val}%</span>
              </span>
            `;
          }).join('');

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

            <!-- 7 Resistências a Dano Visuais (%) -->
            <div class="space-y-1">
              <span class="text-[10px] uppercase font-bold tracking-wider gold-title flex items-center gap-1">
                <iconify-icon icon="game-icons:breastplate" class="icon-armor"></iconify-icon> <span>Resistências a Dano (%)</span>
              </span>
              <div class="flex flex-wrap gap-1">
                ${elemResChips}
              </div>
            </div>

            <!-- 7 Resistências de Status -->
            <div class="space-y-1">
              <span class="text-[10px] uppercase font-bold tracking-wider app-muted flex items-center gap-1">
                <iconify-icon icon="game-icons:round-bottom-flask"></iconify-icon> <span>Limites de Acúmulo</span>
              </span>
              <div class="flex flex-wrap gap-1">
                ${resChips}
              </div>
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
    if (id === 'modal-notes') {
      if (typeof flushCurrentTabContent === 'function') flushCurrentTabContent();
      if (typeof executeNotesAutoSave === 'function') executeNotesAutoSave();
    }
    document.getElementById(id)?.classList.add('hidden');
    if (id === 'modal-resistances') state.activeResistanceCharId = null;
    if (id === 'modal-buffs-nerfs') {
      state.activeBuffsNerfsCharId = null;
      if (typeof resetBnForm === 'function') resetBnForm();
    }
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


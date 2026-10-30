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

    // Toggle de Descrições Longas de Itens
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-toggle-desc]');
      if (!btn) return;
      const targetId = btn.getAttribute('data-toggle-desc');
      const p = document.getElementById(targetId);
      if (!p) return;
      const isClamped = p.classList.contains('line-clamp-1');
      if (isClamped) {
        p.classList.remove('line-clamp-1');
        btn.innerHTML = '<iconify-icon icon="game-icons:plain-arrow" class="text-xs rotate-180"></iconify-icon> <span>Ocultar descrição</span>';
      } else {
        p.classList.add('line-clamp-1');
        btn.innerHTML = '<iconify-icon icon="game-icons:magnifying-glass" class="text-xs"></iconify-icon> <span>Ver descrição</span>';
      }
    });

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
    document.getElementById('btn-reset-enemy-elem-res-defaults')?.addEventListener('click', () => {
      document.querySelectorAll('[data-enemy-elem-res-input]').forEach((inp) => (inp.value = '0'));
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

    // Modal de Buffs e Nerfs (Edição, Modificadores, Toggle Switch e Permanência)
    document.getElementById('form-add-buff-nerf')?.addEventListener('submit', handleAddBuffNerfSubmit);
    document.getElementById('btn-add-bn-modifier')?.addEventListener('click', () => {
      addBnModifierRow({ targetStat: 'VIDA', modifierType: 'FLAT', value: 10 });
    });
    document.getElementById('btn-cancel-edit-bn')?.addEventListener('click', () => {
      resetBnForm();
    });
    document.getElementById('bn-effect-is-permanent')?.addEventListener('change', (e) => {
      const durContainer = document.getElementById('bn-duration-container');
      const durInput = document.getElementById('bn-effect-duration');
      if (e.target.checked) {
        if (durContainer) durContainer.classList.add('opacity-40');
        if (durInput) {
          durInput.disabled = true;
          durInput.value = '';
          durInput.placeholder = 'Permanente';
        }
      } else {
        if (durContainer) durContainer.classList.remove('opacity-40');
        if (durInput) {
          durInput.disabled = false;
          durInput.placeholder = 'Ex: 3';
        }
      }
    });

    document.getElementById('modal-buffs-nerfs')?.addEventListener('click', (e) => {
      const toggleSwitch = e.target.closest('[data-action="toggle-buff-nerf"]');
      if (toggleSwitch) {
        const charId = toggleSwitch.getAttribute('data-char-id');
        const effectId = toggleSwitch.getAttribute('data-effect-id');
        if (charId && effectId) toggleBuffNerf(charId, effectId);
        return;
      }

      const editBtn = e.target.closest('[data-action="edit-buff-nerf"]');
      if (editBtn) {
        const charId = editBtn.getAttribute('data-char-id');
        const effectId = editBtn.getAttribute('data-effect-id');
        if (charId && effectId) editBuffNerf(charId, effectId);
        return;
      }

      const delBtn = e.target.closest('[data-action="delete-buff-nerf"]');
      if (delBtn) {
        const charId = delBtn.getAttribute('data-char-id');
        const effectId = delBtn.getAttribute('data-effect-id');
        if (charId && effectId) {
          removeBuffNerf(charId, effectId);
          const updatedChar = state.characters.find((c) => c.id === charId);
          if (updatedChar) renderBuffsNerfsModalContent(updatedChar);
        }
        return;
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

      const openTreeBtn = e.target.closest('[data-open-char-skill-tree]');
      if (openTreeBtn) {
        openSkillTreeModal(openTreeBtn.getAttribute('data-open-char-skill-tree') || charId);
        return;
      }

      const ptAdjBtn = e.target.closest('[data-sheet-skill-pt-adj]');
      if (ptAdjBtn && isEffectiveMaster()) {
        const delta = Number(ptAdjBtn.getAttribute('data-sheet-skill-pt-adj') || 0);
        if (delta !== 0) handleAdjustCharacterSkillPoints(charId, delta);
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

    document.getElementById('sheet-modal-body')?.addEventListener('change', (e) => {
      const toggleInp = e.target.closest('[data-toggle-skill-node]');
      if (toggleInp) {
        const nodeId = toggleInp.getAttribute('data-toggle-skill-node');
        const charId = toggleInp.getAttribute('data-char-id') || state.activeSheetCharId;
        if (charId && nodeId) {
          handleSkillNodeToggleEnabled(charId, nodeId, toggleInp.checked);
        }
      }
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
          c.baseMaxWeight = nextMaxWeight;
          c.maxWeight = nextMaxWeight;
          if (c.initial) c.initial.maxWeight = nextMaxWeight;
          recalculateCharacterDerived(c);
          toasts.push(`Limite de peso base de ${c.name} atualizado para ${nextMaxWeight} kg (Total efetivo: ${c.maxWeight} kg)!`);
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
      else if (action === 'pill-reset' || action === 'sheet-reset-char') requestResetCharacter(charId);
      else if (action === 'pill-notes') openNotesModal(charId);
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
          ${renderEffectTargetOptionsHtml(eff.targetStat)}
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

    const applyNpcModalFilters = () => {
      const filterType = state.npcModalTypeFilter || 'ALL';
      const searchInput = document.getElementById('npc-item-search-input');
      const query = (searchInput?.value || '').trim().toLowerCase();
      const clearBtn = document.getElementById('btn-npc-item-search-clear');
      if (clearBtn) clearBtn.classList.toggle('hidden', !query);

      document.querySelectorAll('#npc-modal-type-filters [data-npc-filter]').forEach((btn) => {
        const isActive = btn.getAttribute('data-npc-filter') === filterType;
        btn.className = isActive
          ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold btn-gold'
          : 'px-2.5 py-1 rounded-lg text-[11px] font-bold app-secondary-btn';
      });

      document.querySelectorAll('#npc-stock-checklist [data-npc-item-row-type]').forEach((row) => {
        const rowType = row.getAttribute('data-npc-item-row-type');
        const rowName = (row.getAttribute('data-npc-item-name') || '').toLowerCase();
        const matchesType = filterType === 'ALL' || rowType === filterType;
        const matchesSearch = !query || rowName.includes(query);
        row.classList.toggle('hidden', !(matchesType && matchesSearch));
      });
    };

    document.querySelectorAll('#npc-modal-type-filters [data-npc-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.npcModalTypeFilter = btn.getAttribute('data-npc-filter') || 'ALL';
        applyNpcModalFilters();
      });
    });

    const npcItemSearchInput = document.getElementById('npc-item-search-input');
    npcItemSearchInput?.addEventListener('input', applyNpcModalFilters);
    document.getElementById('btn-npc-item-search-clear')?.addEventListener('click', () => {
      if (npcItemSearchInput) npcItemSearchInput.value = '';
      applyNpcModalFilters();
      npcItemSearchInput?.focus();
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
          <div data-npc-item-row-type="${escapeHtml(it.tipo)}" data-npc-item-name="${escapeHtml((it.nome || '').toLowerCase())}" class="flex items-center justify-between gap-2 p-2 rounded bg-black/20 hover:bg-amber-500/10">
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
      state.npcModalTypeFilter = 'ALL';
      if (npcItemSearchInput) npcItemSearchInput.value = '';
      applyNpcModalFilters();
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
      if (e.target.id === 'shop-search-input') {
        state.shopSearchQuery = e.target.value;
        renderShopTab();
        const searchInputAfter = document.getElementById('shop-search-input');
        if (searchInputAfter) {
          searchInputAfter.focus();
          const len = searchInputAfter.value.length;
          searchInputAfter.setSelectionRange(len, len);
        }
        return;
      }

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
      const shopTypeBtn = e.target.closest('[data-shop-item-type]');
      if (shopTypeBtn) {
        state.shopTypeFilter = shopTypeBtn.getAttribute('data-shop-item-type') || 'ALL';
        renderShopTab();
        return;
      }

      const clearShopBtn = e.target.closest('[data-action="clear-shop-filters"]');
      if (clearShopBtn) {
        state.shopSearchQuery = '';
        state.shopTypeFilter = 'ALL';
        renderShopTab();
        return;
      }

      const switchNpcBtn = e.target.closest('[data-switch-to-npc]');
      if (switchNpcBtn) {
        const targetNpcId = switchNpcBtn.getAttribute('data-switch-to-npc');
        if (targetNpcId) {
          state.selectedShopNpcId = targetNpcId;
          renderShopTab();
        }
        return;
      }

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
      const buyer = (state.characters || []).find((c) => c.id === state.selectedBuyerCharId);
      if (!buyer) {
        showToast('Nenhuma ficha de personagem vinculada a você foi selecionada como compradora!', 'warning');
        return;
      }
      if (buyer.isEnemy || buyer.type === 'enemy' || buyer.bestiaryId) {
        showToast('Inimigos não podem comprar itens na loja!', 'error');
        return;
      }
      if (!isEffectiveMaster() && !isCharacterOwner(buyer)) {
        showToast('Você só pode comprar itens para a sua própria ficha vinculada!', 'warning');
        return;
      }
      if (!item) {
        showToast('Item não encontrado no catálogo!', 'warning');
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

      const elementalResistances = {};
      for (const er of ELEMENTAL_RESISTANCE_TYPES) elementalResistances[er.key] = 0;
      document.querySelectorAll('#enemy-form-elem-resistances-grid [data-enemy-elem-res-input]').forEach((input) => {
        const k = input.getAttribute('data-enemy-elem-res-input');
        const v = Number(input.value);
        elementalResistances[k] = Number.isFinite(v) ? Number(v.toFixed(1)) : 0;
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
              elementalResistances,
              generalSkills,
            };
            // Sincroniza reveladoParaJogadores, generalSkills e elementalResistances para instâncias ativas na mesa
            (st.characters || []).forEach((c) => {
              if (c.bestiaryId === enemyId) {
                c.reveladoParaJogadores = reveladoParaJogadores;
                c.generalSkills = generalSkills;
                c.elementalResistances = { ...elementalResistances };
                recalculateCharacterDerived(c);
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
              elementalResistances,
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

    document.getElementById('quests-search-input')?.addEventListener('input', (e) => {
      state.questsSearchQuery = e.target.value;
      renderQuestsTab();
    });

    document.getElementById('quests-status-filter')?.addEventListener('change', (e) => {
      state.questsStatusFilter = e.target.value;
      renderQuestsTab();
    });

    document.getElementById('btn-quests-clear-filters')?.addEventListener('click', () => {
      state.questsSearchQuery = '';
      state.questsStatusFilter = 'ALL';
      renderQuestsTab();
    });

    document.getElementById('quests-list-grid')?.addEventListener('click', (e) => {
      const clearQuestsBtn = e.target.closest('[data-action="clear-quests-filters"]');
      if (clearQuestsBtn) {
        state.questsSearchQuery = '';
        state.questsStatusFilter = 'ALL';
        renderQuestsTab();
        return;
      }

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

    // -------------------------------------------------------------------------
    // Eventos do Sistema de Árvore de Habilidades (Host Tab, Modal 96vw x 92vh, Forms e Drag & Drop)
    // -------------------------------------------------------------------------
    const confirmAndDeleteSkillTree = (treeId) => {
      const tree = (state.skillTrees || []).find((t) => t.id === treeId);
      if (!tree) return;
      openConfirmModal({
        icon: '<iconify-icon icon="game-icons:trash-can"></iconify-icon>',
        title: `EXCLUIR ÁRVORE "${tree.name.toUpperCase()}"?`,
        message: `Tem certeza que deseja excluir permanentemente a árvore "${tree.name}" e todos os seus ${(tree.nodes || []).length} nós?`,
        confirmText: '<iconify-icon icon="game-icons:trash-can"></iconify-icon> <span>Excluir Árvore</span>',
        onConfirm: () => deleteSkillTree(treeId),
      });
    };

    const confirmAndDeleteSkillNode = (treeId, nodeId) => {
      const tree = (state.skillTrees || []).find((t) => t.id === treeId);
      const node = (tree?.nodes || []).find((n) => n.id === nodeId);
      if (!tree || !node) return;
      openConfirmModal({
        icon: '<iconify-icon icon="game-icons:trash-can"></iconify-icon>',
        title: `EXCLUIR NÓ "${node.name.toUpperCase()}"?`,
        message: `Tem certeza que deseja remover a habilidade/talento "${node.name}" da árvore "${tree.name}"?`,
        confirmText: '<iconify-icon icon="game-icons:trash-can"></iconify-icon> <span>Excluir Nó</span>',
        onConfirm: () => deleteSkillNode(treeId, nodeId),
      });
    };

    // Botões na Aba Exclusiva do Host (#tab-skill-trees)
    document.getElementById('btn-seed-geomancia-tree')?.addEventListener('click', () => seedGeomanciaSkillTree());
    document.getElementById('btn-open-fullscreen-skill-tree-master')?.addEventListener('click', () => {
      openSkillTreeModal(null, state.activeSkillTreeId);
    });
    document.getElementById('btn-create-skill-tree')?.addEventListener('click', () => openSkillTreeFormModal(null));

    // Busca e filtros em tempo real na aba de criação do Host (#tab-skill-trees)
    document.getElementById('host-skill-tree-search-input')?.addEventListener('input', (e) => {
      state.hostSkillTreeSearchQuery = e.target.value || '';
      renderSkillTreesTab();
    });
    document.getElementById('btn-host-skill-tree-search-clear')?.addEventListener('click', () => {
      state.hostSkillTreeSearchQuery = '';
      const inp = document.getElementById('host-skill-tree-search-input');
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      renderSkillTreesTab();
    });
    document.getElementById('host-skill-tree-filter-pills')?.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-host-st-filter]');
      if (!pill) return;
      state.hostSkillTreeCategoryFilter = pill.getAttribute('data-host-st-filter') || 'ALL';
      renderSkillTreesTab();
    });

    document.getElementById('skill-trees-host-container')?.addEventListener('click', (e) => {
      if (e.target.closest('[data-host-seed-geomancia]')) {
        seedGeomanciaSkillTree();
        return;
      }
      if (e.target.closest('[data-host-create-tree]')) {
        openSkillTreeFormModal(null);
        return;
      }

      const selectTreeBtn = e.target.closest('[data-host-select-tree]');
      if (selectTreeBtn) {
        state.activeSkillTreeId = selectTreeBtn.getAttribute('data-host-select-tree');
        renderSkillTreesTab();
        return;
      }

      const cloneTreeBtn = e.target.closest('[data-host-clone-tree]');
      if (cloneTreeBtn) {
        duplicateSkillTree(cloneTreeBtn.getAttribute('data-host-clone-tree'));
        return;
      }

      const editTreeBtn = e.target.closest('[data-host-edit-tree]');
      if (editTreeBtn) {
        openSkillTreeFormModal(editTreeBtn.getAttribute('data-host-edit-tree'));
        return;
      }

      const delTreeBtn = e.target.closest('[data-host-delete-tree]');
      if (delTreeBtn) {
        confirmAndDeleteSkillTree(delTreeBtn.getAttribute('data-host-delete-tree'));
        return;
      }

      const addNodeBtn = e.target.closest('[data-host-add-node]');
      if (addNodeBtn) {
        const treeId = addNodeBtn.getAttribute('data-host-add-node') || state.activeSkillTreeId;
        const cat = addNodeBtn.getAttribute('data-host-node-cat') || 'TALENTO';
        openSkillNodeFormModal(treeId, null, cat);
        return;
      }

      const cloneNodeBtn = e.target.closest('[data-host-clone-node]');
      if (cloneNodeBtn) {
        const treeId = cloneNodeBtn.getAttribute('data-host-node-tree') || state.activeSkillTreeId;
        const nodeId = cloneNodeBtn.getAttribute('data-host-clone-node');
        duplicateSkillNode(treeId, nodeId);
        return;
      }

      const editNodeBtn = e.target.closest('[data-host-edit-node]');
      if (editNodeBtn) {
        const treeId = editNodeBtn.getAttribute('data-host-node-tree') || state.activeSkillTreeId;
        const nodeId = editNodeBtn.getAttribute('data-host-edit-node');
        openSkillNodeFormModal(treeId, nodeId);
        return;
      }

      const delNodeBtn = e.target.closest('[data-host-delete-node]');
      if (delNodeBtn) {
        const treeId = delNodeBtn.getAttribute('data-host-node-tree') || state.activeSkillTreeId;
        const nodeId = delNodeBtn.getAttribute('data-host-delete-node');
        confirmAndDeleteSkillNode(treeId, nodeId);
      }
    });

    // Modal 14 (#modal-skill-detail): Integração com Habilidades Principais da Ficha
    document.getElementById('btn-open-tree-from-skill-modal')?.addEventListener('click', () => {
      const charId = document.getElementById('skill-modal-char-id')?.value || state.activeSheetCharId;
      openSkillTreeModal(charId || null);
    });

    document.getElementById('skill-modal-tree-skills-list')?.addEventListener('change', (e) => {
      const toggleInp = e.target.closest('[data-toggle-skill-node]');
      if (toggleInp) {
        const nodeId = toggleInp.getAttribute('data-toggle-skill-node');
        const charId = toggleInp.getAttribute('data-char-id') || document.getElementById('skill-modal-char-id')?.value;
        if (charId && nodeId) {
          handleSkillNodeToggleEnabled(charId, nodeId, toggleInp.checked);
        }
      }
    });

    // Modal 20 (#modal-skill-tree — Constelação 96vw x 92vh)
    document.getElementById('skill-tree-modal-char-select')?.addEventListener('change', (e) => {
      state.activeSkillTreeCharId = e.target.value || null;
      renderSkillTreeConstellationModal();
    });

    document.getElementById('btn-st-modal-sub-pt')?.addEventListener('click', () => {
      if (state.activeSkillTreeCharId) handleAdjustCharacterSkillPoints(state.activeSkillTreeCharId, -1);
    });
    document.getElementById('btn-st-modal-add-pt')?.addEventListener('click', () => {
      if (state.activeSkillTreeCharId) handleAdjustCharacterSkillPoints(state.activeSkillTreeCharId, 1);
    });
    document.getElementById('btn-st-modal-seed-geomancia')?.addEventListener('click', () => seedGeomanciaSkillTree());
    document.getElementById('btn-st-modal-new-tree')?.addEventListener('click', () => openSkillTreeFormModal(null));
    document.getElementById('btn-st-modal-edit-tree')?.addEventListener('click', () => {
      if (state.activeSkillTreeId) openSkillTreeFormModal(state.activeSkillTreeId);
    });
    document.getElementById('btn-st-modal-clone-tree')?.addEventListener('click', () => {
      if (state.activeSkillTreeId) duplicateSkillTree(state.activeSkillTreeId);
    });
    document.getElementById('btn-st-modal-delete-tree')?.addEventListener('click', () => {
      if (state.activeSkillTreeId) confirmAndDeleteSkillTree(state.activeSkillTreeId);
    });
    document.getElementById('btn-st-modal-add-node')?.addEventListener('click', () => {
      if (state.activeSkillTreeId) openSkillNodeFormModal(state.activeSkillTreeId, null, 'TALENTO');
    });

    // Busca e filtros rápidos em tempo real no Modal da Árvore de Habilidades (#modal-skill-tree)
    document.getElementById('st-modal-search-input')?.addEventListener('input', (e) => {
      state.skillTreeSearchQuery = e.target.value || '';
      renderSkillTreeConstellationModal();
    });
    document.getElementById('btn-st-modal-search-clear')?.addEventListener('click', () => {
      state.skillTreeSearchQuery = '';
      const inp = document.getElementById('st-modal-search-input');
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      renderSkillTreeConstellationModal();
    });
    document.getElementById('st-modal-filter-pills')?.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-st-filter]');
      if (!pill) return;
      state.skillTreeCategoryFilter = pill.getAttribute('data-st-filter') || 'ALL';
      renderSkillTreeConstellationModal();
    });

    document.getElementById('skill-tree-modal-tabs')?.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-st-modal-select-tree]');
      if (tabBtn) {
        state.activeSkillTreeId = tabBtn.getAttribute('data-st-modal-select-tree');
        renderSkillTreeConstellationModal();
      }
    });

    document.getElementById('skill-tree-modal-body')?.addEventListener('click', (e) => {
      const buyBtn = e.target.closest('[data-skill-node-buy]');
      if (buyBtn) {
        handleSkillNodePurchaseOrUpgrade(
          buyBtn.getAttribute('data-char-id') || state.activeSkillTreeCharId,
          buyBtn.getAttribute('data-tree-id') || state.activeSkillTreeId,
          buyBtn.getAttribute('data-skill-node-buy')
        );
        return;
      }

      const refundBtn = e.target.closest('[data-skill-node-refund]');
      if (refundBtn) {
        handleSkillNodeRefund(
          refundBtn.getAttribute('data-char-id') || state.activeSkillTreeCharId,
          refundBtn.getAttribute('data-tree-id') || state.activeSkillTreeId,
          refundBtn.getAttribute('data-skill-node-refund')
        );
        return;
      }

      const addCatBtn = e.target.closest('[data-st-add-node-cat]');
      if (addCatBtn) {
        openSkillNodeFormModal(
          addCatBtn.getAttribute('data-tree-id') || state.activeSkillTreeId,
          null,
          addCatBtn.getAttribute('data-st-add-node-cat') || 'TALENTO'
        );
        return;
      }

      const cloneNodeBtn = e.target.closest('[data-clone-skill-node]');
      if (cloneNodeBtn) {
        duplicateSkillNode(
          cloneNodeBtn.getAttribute('data-tree-id') || state.activeSkillTreeId,
          cloneNodeBtn.getAttribute('data-clone-skill-node')
        );
        return;
      }

      const editNodeBtn = e.target.closest('[data-edit-skill-node]');
      if (editNodeBtn) {
        openSkillNodeFormModal(
          editNodeBtn.getAttribute('data-tree-id') || state.activeSkillTreeId,
          editNodeBtn.getAttribute('data-edit-skill-node')
        );
        return;
      }

      const delNodeBtn = e.target.closest('[data-delete-skill-node]');
      if (delNodeBtn) {
        confirmAndDeleteSkillNode(
          delNodeBtn.getAttribute('data-tree-id') || state.activeSkillTreeId,
          delNodeBtn.getAttribute('data-delete-skill-node')
        );
      }
    });

    document.getElementById('skill-tree-modal-body')?.addEventListener('change', (e) => {
      const toggleInp = e.target.closest('[data-toggle-skill-node]');
      if (toggleInp) {
        const nodeId = toggleInp.getAttribute('data-toggle-skill-node');
        const charId = toggleInp.getAttribute('data-char-id') || state.activeSkillTreeCharId;
        if (charId && nodeId) {
          handleSkillNodeToggleEnabled(charId, nodeId, toggleInp.checked);
        }
      }
    });

    // Drag & Drop de Nós pelo Mestre (tanto no Modal de Constelação quanto no Editor da Aba)
    const bindSkillNodeDragAndDrop = (containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.addEventListener('dragstart', (e) => {
        if (!isEffectiveMaster()) return;
        const card = e.target.closest('[data-skill-node-card]');
        if (!card) return;
        state.draggingSkillNodeId = card.getAttribute('data-skill-node-card');
        state.draggingSkillNodeTreeId =
          card.getAttribute('data-tree-id') || card.getAttribute('data-skill-tree-id') || state.activeSkillTreeId;
        card.classList.add('skill-node-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', state.draggingSkillNodeId || '');
        }
      });

      container.addEventListener('dragover', (e) => {
        if (!isEffectiveMaster() || !state.draggingSkillNodeId) return;
        const overCard = e.target.closest('[data-skill-node-card]');
        if (!overCard) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        container.querySelectorAll('.skill-node-drop-over').forEach((el) => {
          if (el !== overCard) el.classList.remove('skill-node-drop-over');
        });
        if (overCard.getAttribute('data-skill-node-card') !== state.draggingSkillNodeId) {
          overCard.classList.add('skill-node-drop-over');
        }
      });

      container.addEventListener('dragleave', (e) => {
        const overCard = e.target.closest('[data-skill-node-card]');
        if (overCard && !overCard.contains(e.relatedTarget)) {
          overCard.classList.remove('skill-node-drop-over');
        }
      });

      container.addEventListener('drop', (e) => {
        if (!isEffectiveMaster() || !state.draggingSkillNodeId) return;
        const targetCard = e.target.closest('[data-skill-node-card]');
        container.querySelectorAll('.skill-node-drop-over, .skill-node-dragging').forEach((el) => {
          el.classList.remove('skill-node-drop-over', 'skill-node-dragging');
        });
        if (!targetCard) return;
        e.preventDefault();
        const targetNodeId = targetCard.getAttribute('data-skill-node-card');
        const treeId =
          targetCard.getAttribute('data-tree-id') ||
          targetCard.getAttribute('data-skill-tree-id') ||
          state.draggingSkillNodeTreeId ||
          state.activeSkillTreeId;
        const draggedId = state.draggingSkillNodeId;
        state.draggingSkillNodeId = null;
        state.draggingSkillNodeTreeId = null;
        if (treeId && draggedId && targetNodeId && draggedId !== targetNodeId) {
          reorderSkillTreeNodes(treeId, draggedId, targetNodeId);
        }
      });

      container.addEventListener('dragend', () => {
        state.draggingSkillNodeId = null;
        state.draggingSkillNodeTreeId = null;
        container.querySelectorAll('.skill-node-drop-over, .skill-node-dragging').forEach((el) => {
          el.classList.remove('skill-node-drop-over', 'skill-node-dragging');
        });
      });
    };

    bindSkillNodeDragAndDrop('skill-tree-modal-body');
    bindSkillNodeDragAndDrop('skill-trees-host-container');

    // Modal 21 (#modal-skill-tree-form) & Modal 22 (#modal-skill-node-form)
    document.getElementById('btn-add-st-completion-effect')?.addEventListener('click', () => {
      document
        .getElementById('st-completion-effects-list')
        ?.appendChild(createSkillTreeCompletionEffectRowElement());
    });
    document.getElementById('form-skill-tree')?.addEventListener('submit', handleSkillTreeFormSubmit);
    document.getElementById('btn-delete-skill-tree')?.addEventListener('click', () => {
      const treeId = document.getElementById('st-form-id')?.value.trim();
      if (treeId) confirmAndDeleteSkillTree(treeId);
    });

    document.getElementById('sn-form-category')?.addEventListener('change', syncSkillNodeFormCategoryUI);
    document.getElementById('btn-add-sn-effect')?.addEventListener('click', () => {
      document.getElementById('sn-effects-list')?.appendChild(createSkillNodeEffectRowElement());
    });
    document.getElementById('form-skill-node')?.addEventListener('submit', handleSkillNodeFormSubmit);
    document.getElementById('btn-delete-skill-node')?.addEventListener('click', () => {
      const treeId = document.getElementById('sn-form-tree-id')?.value.trim();
      const nodeId = document.getElementById('sn-form-node-id')?.value.trim();
      if (treeId && nodeId) confirmAndDeleteSkillNode(treeId, nodeId);
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

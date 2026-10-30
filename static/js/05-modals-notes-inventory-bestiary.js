  // ---------------------------------------------------------------------------
  // Modal: Bloco de Notas & Diário da Ficha (Auto-save + Undo/Redo + Múltiplas Abas)
  // ---------------------------------------------------------------------------
  let currentNotesCharId = null;
  let currentNotesActivePageId = null;
  let currentNotesPages = [];
  let notesAutoSaveTimer = null;
  let notesToolbarInitialized = false;

  function generateNotePageId() {
    return 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function updateNotesCounters() {
    const editor = document.getElementById('notes-content-editor');
    if (!editor) return;
    const text = editor.innerText || '';
    const trimmed = text.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    const charCount = text.length;
    const counterEl = document.getElementById('notes-word-char-counter');
    if (counterEl) {
      counterEl.textContent = `${wordCount} palavras • ${charCount} caracteres`;
    }
  }

  function flushCurrentTabContent() {
    if (!currentNotesActivePageId) return;
    const page = currentNotesPages.find((p) => p.id === currentNotesActivePageId);
    if (!page) return;
    const editor = document.getElementById('notes-content-editor');
    if (editor) {
      page.content = editor.innerHTML;
      page.updatedAt = new Date().toISOString();
    }
  }

  function saveCurrentEditorToPage() {
    flushCurrentTabContent();
  }

  function scheduleNotesAutoSave(delayMs = 600) {
    const statusEl = document.getElementById('notes-save-status');
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-amber-400 flex items-center gap-1 font-bold animate-pulse">● Salvando...</span>';
    }
    if (notesAutoSaveTimer) clearTimeout(notesAutoSaveTimer);
    notesAutoSaveTimer = setTimeout(() => {
      executeNotesAutoSave();
    }, delayMs);
  }

  function executeNotesAutoSave() {
    if (notesAutoSaveTimer) {
      clearTimeout(notesAutoSaveTimer);
      notesAutoSaveTimer = null;
    }
    if (!currentNotesCharId) return;
    const char = state.characters.find((c) => c.id === currentNotesCharId);
    if (!char) return;
    const canEdit = isEffectiveMaster() || isCharacterOwner(char);
    if (!canEdit) return;

    flushCurrentTabContent();

    commitMutation(
      (st) => {
        const target = st.characters.find((c) => c.id === currentNotesCharId);
        if (!target) return false;
        const permitted = isEffectiveMaster() || isCharacterOwner(target);
        if (!permitted) return false;

        target.notesPages = JSON.parse(JSON.stringify(currentNotesPages));
        return true;
      },
      { action: 'AUTOSAVE_CHARACTER_NOTES', charId: currentNotesCharId }
    );

    const statusEl = document.getElementById('notes-save-status');
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-emerald-400 flex items-center gap-1 font-bold"><iconify-icon icon="game-icons:check-mark"></iconify-icon> Salvo</span>';
    }
  }

  function loadActiveNotePage(pageId, canEdit) {
    const page = currentNotesPages.find((p) => p.id === pageId) || currentNotesPages[0];
    if (!page) return;
    currentNotesActivePageId = page.id;
    const editor = document.getElementById('notes-content-editor');
    if (!editor) return;
    editor.innerHTML = page.content || '';

    // Sincronizar checkboxes interativos no DOM
    editor.querySelectorAll('.note-checkbox').forEach((cb) => {
      cb.checked = cb.hasAttribute('checked');
      cb.disabled = !canEdit;
    });

    updateNotesCounters();
    renderNotesTabs(canEdit);
  }

  function renderNotesTabs(canEdit) {
    const container = document.getElementById('notes-tabs-container');
    if (!container) return;
    container.innerHTML = currentNotesPages
      .map((p) => {
        const isActive = p.id === currentNotesActivePageId;
        return `
          <div class="notes-tab-item flex items-center rounded-t-lg transition border-t border-x ${
            isActive
              ? 'notes-tab-btn-active'
              : 'bg-black/40 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
          }">
            <button
              type="button"
              data-notes-tab-id="${escapeHtml(p.id)}"
              class="px-3 py-1.5 text-xs truncate max-w-[130px] sm:max-w-[180px] text-left"
              title="${escapeHtml(p.title)}"
            >
              ${escapeHtml(p.title)}
            </button>
            ${
              canEdit
                ? `
              <div class="flex items-center pr-1.5 gap-0.5">
                <button
                  type="button"
                  data-rename-note-id="${escapeHtml(p.id)}"
                  class="text-neutral-500 hover:text-amber-400 p-0.5 text-[11px] transition"
                  title="Renomear página"
                >
                  <iconify-icon icon="game-icons:quill-ink"></iconify-icon>
                </button>
                ${
                  currentNotesPages.length > 1
                    ? `<button
                        type="button"
                        data-delete-note-id="${escapeHtml(p.id)}"
                        class="text-neutral-500 hover:text-rose-400 p-0.5 text-[11px] transition"
                        title="Excluir página"
                      >✕</button>`
                    : ''
                }
              </div>
            `
                : ''
            }
          </div>
        `;
      })
      .join('');
  }

  function openNewNotePageModal() {
    const char = state.characters.find((c) => c.id === currentNotesCharId);
    const canEdit = isEffectiveMaster() || isCharacterOwner(char);
    if (!canEdit) return;

    flushCurrentTabContent();

    const input = document.getElementById('new-note-page-name-input');
    const errorEl = document.getElementById('new-note-page-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }

    if (input) {
      let count = currentNotesPages.length + 1;
      while (currentNotesPages.some((p) => (p.title || '').trim().toLowerCase() === `página ${count}`.toLowerCase())) {
        count++;
      }
      input.value = `Página ${count}`;
    }

    openModal('modal-new-note-page');
    setTimeout(() => {
      if (input) {
        input.focus();
        input.select();
      }
    }, 60);
  }

  function handleNewNotePageSubmit(e) {
    if (e) e.preventDefault();
    const char = state.characters.find((c) => c.id === currentNotesCharId);
    const canEdit = isEffectiveMaster() || isCharacterOwner(char);
    if (!canEdit) return;

    const input = document.getElementById('new-note-page-name-input');
    const errorEl = document.getElementById('new-note-page-error');
    const title = (input?.value || '').trim();

    if (!title) {
      if (errorEl) {
        errorEl.innerHTML = '<iconify-icon icon="game-icons:cancel"></iconify-icon> <span>O título da página não pode ficar em branco.</span>';
        errorEl.classList.remove('hidden');
      }
      input?.focus();
      return;
    }

    const exists = currentNotesPages.some(
      (p) => (p.title || '').trim().toLowerCase() === title.toLowerCase()
    );

    if (exists) {
      if (errorEl) {
        errorEl.innerHTML = `<iconify-icon icon="game-icons:cancel"></iconify-icon> <span>Já existe uma página chamada "${escapeHtml(title)}". Escolha outro nome.</span>`;
        errorEl.classList.remove('hidden');
      }
      input?.focus();
      input?.select();
      return;
    }

    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }

    closeModal('modal-new-note-page');

    flushCurrentTabContent();
    const newPage = {
      id: generateNotePageId(),
      title,
      content: '',
      updatedAt: new Date().toISOString(),
    };
    currentNotesPages.push(newPage);
    currentNotesActivePageId = newPage.id;
    executeNotesAutoSave();
    renderNotesTabs(true);
    loadActiveNotePage(newPage.id, true);
    document.getElementById('notes-content-editor')?.focus();
    showToast(`Página "${title}" criada com sucesso!`);
  }

  function createNewNotePage() {
    openNewNotePageModal();
  }

  function initNotesToolbar() {
    // Comandos de estilo básicos, listas, desfazer e refazer
    document.querySelectorAll('#notes-toolbar [data-cmd]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) {
          document.execCommand(cmd, false, null);
          scheduleNotesAutoSave(300);
          updateNotesCounters();
        }
      });
    });

    // Comandos de blocos (H1, H2, P, BLOCKQUOTE)
    document.querySelectorAll('#notes-toolbar [data-block]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        const block = btn.getAttribute('data-block');
        if (block) {
          document.execCommand('formatBlock', false, `<${block}>`);
          scheduleNotesAutoSave(300);
          updateNotesCounters();
        }
      });
    });

    // Checklist interativa
    const taskBtn = document.getElementById('btn-notes-insert-task');
    taskBtn?.addEventListener('mousedown', (e) => e.preventDefault());
    taskBtn?.addEventListener('click', () => {
      const editor = document.getElementById('notes-content-editor');
      if (!editor) return;
      editor.focus();
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);

      const taskDiv = document.createElement('div');
      taskDiv.className = 'note-task flex items-start gap-2 my-1';
      taskDiv.innerHTML = `<input type="checkbox" class="note-checkbox mt-1 w-4 h-4 rounded cursor-pointer accent-amber-500" /> <span class="note-task-text flex-1 outline-none" contenteditable="true">Nova tarefa</span>`;
      range.deleteContents();
      range.insertNode(taskDiv);

      const span = taskDiv.querySelector('.note-task-text');
      if (span && sel) {
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }

      scheduleNotesAutoSave(200);
      updateNotesCounters();
    });

    // Popover de Cor do Texto
    const colorBtn = document.getElementById('btn-notes-color-menu');
    const colorPopover = document.getElementById('notes-color-popover');
    const hlBtn = document.getElementById('btn-notes-hl-menu');
    const hlPopover = document.getElementById('notes-hl-popover');

    colorBtn?.addEventListener('mousedown', (e) => e.preventDefault());
    colorBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      hlPopover?.classList.add('hidden');
      colorPopover?.classList.toggle('hidden');
    });

    hlBtn?.addEventListener('mousedown', (e) => e.preventDefault());
    hlBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      colorPopover?.classList.add('hidden');
      hlPopover?.classList.toggle('hidden');
    });

    document.querySelectorAll('#notes-color-popover [data-color]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        if (color) {
          document.execCommand('foreColor', false, color);
          colorPopover?.classList.add('hidden');
          scheduleNotesAutoSave(300);
        }
      });
    });

    document.querySelectorAll('#notes-hl-popover [data-hl]').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        const hl = btn.getAttribute('data-hl');
        if (hl) {
          document.execCommand('hiliteColor', false, hl);
          hlPopover?.classList.add('hidden');
          scheduleNotesAutoSave(300);
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#btn-notes-color-menu') && !e.target.closest('#notes-color-popover')) {
        colorPopover?.classList.add('hidden');
      }
      if (!e.target.closest('#btn-notes-hl-menu') && !e.target.closest('#notes-hl-popover')) {
        hlPopover?.classList.add('hidden');
      }
    });

    // Busca Interna na Nota
    const notesSearchInput = document.getElementById('notes-search-input');
    const notesSearchNext = document.getElementById('btn-notes-search-next');
    const doNotesSearch = (backwards = false) => {
      const query = (notesSearchInput?.value || '').trim();
      const statusEl = document.getElementById('notes-search-status');
      if (!query) {
        if (statusEl) statusEl.textContent = '';
        return;
      }
      const editor = document.getElementById('notes-content-editor');
      if (!editor) return;
      if (typeof window.find === 'function') {
        let found = window.find(query, false, backwards, true, false, false, false);
        if (!found) {
          const sel = window.getSelection();
          if (sel) {
            const r = document.createRange();
            r.selectNodeContents(editor);
            r.collapse(!backwards);
            sel.removeAllRanges();
            sel.addRange(r);
          }
          found = window.find(query, false, backwards, true, false, false, false);
          if (statusEl) statusEl.textContent = found ? '' : '0/0';
        } else {
          if (statusEl) statusEl.textContent = '';
        }

        if (found) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    };

    notesSearchInput?.addEventListener('input', () => {
      const query = (notesSearchInput?.value || '').trim();
      const statusEl = document.getElementById('notes-search-status');
      if (!query && statusEl) statusEl.textContent = '';
    });
    notesSearchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doNotesSearch(e.shiftKey);
        notesSearchInput.focus();
      }
    });
    notesSearchNext?.addEventListener('mousedown', (e) => e.preventDefault());
    notesSearchNext?.addEventListener('click', () => doNotesSearch(false));

    // Editor: eventos de clique em checkbox, tecla Enter na checklist e digitação
    const editor = document.getElementById('notes-content-editor');
    editor?.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('note-checkbox')) {
        const char = state.characters.find((c) => c.id === currentNotesCharId);
        const canEdit = isEffectiveMaster() || isCharacterOwner(char);
        if (!canEdit) {
          e.preventDefault();
          return;
        }
        if (e.target.checked) {
          e.target.setAttribute('checked', 'checked');
          e.target.closest('.note-task')?.classList.add('is-done');
        } else {
          e.target.removeAttribute('checked');
          e.target.closest('.note-task')?.classList.remove('is-done');
        }
        flushCurrentTabContent();
        scheduleNotesAutoSave(100);
        updateNotesCounters();
      }
    });

    editor?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const sel = window.getSelection();
        const task = sel?.anchorNode?.parentElement?.closest('.note-task');
        if (task) {
          e.preventDefault();
          const newTask = document.createElement('div');
          newTask.className = 'note-task flex items-start gap-2 my-1';
          newTask.innerHTML = `<input type="checkbox" class="note-checkbox mt-1 w-4 h-4 rounded cursor-pointer accent-amber-500" /> <span class="note-task-text flex-1 outline-none" contenteditable="true">&nbsp;</span>`;
          task.after(newTask);
          const span = newTask.querySelector('.note-task-text');
          if (span && sel) {
            const r = document.createRange();
            r.selectNodeContents(span);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
          }
          flushCurrentTabContent();
          scheduleNotesAutoSave(200);
          updateNotesCounters();
        }
      }
    });

    editor?.addEventListener('input', () => {
      flushCurrentTabContent();
      scheduleNotesAutoSave(600);
      updateNotesCounters();
    });

    editor?.addEventListener('keyup', () => {
      flushCurrentTabContent();
    });

    // Formulário de Nova Página de Notas (Modal)
    document.getElementById('form-new-note-page')?.addEventListener('submit', handleNewNotePageSubmit);
    document.getElementById('new-note-page-name-input')?.addEventListener('input', () => {
      const errorEl = document.getElementById('new-note-page-error');
      if (errorEl && !errorEl.classList.contains('hidden')) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
      }
    });

    // Botão de nova página
    document.getElementById('btn-notes-new-page')?.addEventListener('click', openNewNotePageModal);

    // Delegação de eventos nas abas (troca, renomear, excluir)
    const tabsContainer = document.getElementById('notes-tabs-container');
    tabsContainer?.addEventListener('click', (e) => {
      const char = state.characters.find((c) => c.id === currentNotesCharId);
      const canEdit = isEffectiveMaster() || isCharacterOwner(char);

      const tabBtn = e.target.closest('[data-notes-tab-id]');
      if (tabBtn) {
        const targetId = tabBtn.getAttribute('data-notes-tab-id');
        if (targetId && targetId !== currentNotesActivePageId) {
          flushCurrentTabContent();
          if (canEdit) executeNotesAutoSave();
          loadActiveNotePage(targetId, canEdit);
        }
        return;
      }

      const renameBtn = e.target.closest('[data-rename-note-id]');
      if (renameBtn && canEdit) {
        flushCurrentTabContent();
        const pageId = renameBtn.getAttribute('data-rename-note-id');
        const page = currentNotesPages.find((p) => p.id === pageId);
        if (!page) return;

        const tabItem = renameBtn.closest('.notes-tab-item');
        if (tabItem) {
          tabItem.innerHTML = `
            <input
              type="text"
              id="inline-note-rename-input"
              value="${escapeHtml(page.title)}"
              class="px-2 py-1 text-xs bg-black/80 border border-amber-500/70 rounded text-amber-200 outline-none w-28 sm:w-36 font-bold"
            />
          `;
          const input = document.getElementById('inline-note-rename-input');
          if (input) {
            input.focus();
            input.select();
            let finished = false;
            const finishRename = () => {
              if (finished) return;
              finished = true;
              const newTitle = input.value.trim();
              if (newTitle && newTitle !== page.title) {
                const duplicate = currentNotesPages.some(
                  (p) => p.id !== page.id && (p.title || '').trim().toLowerCase() === newTitle.toLowerCase()
                );
                if (duplicate) {
                  showToast(`Já existe uma página chamada "${newTitle}".`, 'warning');
                  renderNotesTabs(canEdit);
                  return;
                }
                page.title = newTitle;
                page.updatedAt = new Date().toISOString();
                executeNotesAutoSave();
              }
              renderNotesTabs(canEdit);
            };
            input.addEventListener('blur', finishRename);
            input.addEventListener('keydown', (ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                finishRename();
              } else if (ev.key === 'Escape') {
                finished = true;
                renderNotesTabs(canEdit);
              }
            });
          }
        }
        return;
      }

      const deleteBtn = e.target.closest('[data-delete-note-id]');
      if (deleteBtn && canEdit) {
        const pageId = deleteBtn.getAttribute('data-delete-note-id');
        if (currentNotesPages.length <= 1) {
          showToast('Você deve manter pelo menos uma página de anotações.', 'warning');
          return;
        }
        flushCurrentTabContent();
        const page = currentNotesPages.find((p) => p.id === pageId);
        if (!page) return;
        openConfirmModal({
          icon: '<iconify-icon icon="game-icons:trash-can" class="text-rose-500"></iconify-icon>',
          title: 'EXCLUIR PÁGINA DE NOTAS',
          message: `Tem certeza que deseja excluir a página "${page.title}"? Todo o conteúdo dela será removido.`,
          confirmText: 'Excluir Página',
          onConfirm: () => {
            const delIdx = currentNotesPages.findIndex((p) => p.id === pageId);
            currentNotesPages = currentNotesPages.filter((p) => p.id !== pageId);
            if (currentNotesActivePageId === pageId) {
              const nextIdx = Math.max(0, delIdx - 1);
              currentNotesActivePageId = currentNotesPages[nextIdx]?.id || currentNotesPages[0].id;
            }
            executeNotesAutoSave();
            renderNotesTabs(canEdit);
            loadActiveNotePage(currentNotesActivePageId, canEdit);
          },
        });
      }
    });
  }

  function openNotesModal(charId) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;

    currentNotesCharId = charId;
    const canEdit = isEffectiveMaster() || isCharacterOwner(char);

    document.getElementById('notes-char-name').textContent = char.name;
    const badge = document.getElementById('notes-permission-badge');
    if (badge) {
      if (canEdit) {
        badge.className =
          'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/70 border border-emerald-500/40 text-emerald-300';
        badge.textContent = isEffectiveMaster() ? 'Modo Mestre (Edição)' : 'Dono da Ficha (Edição)';
      } else {
        badge.className =
          'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-950/70 border border-sky-500/40 text-sky-300';
        badge.textContent = 'Modo Somente Leitura';
      }
    }

    document.getElementById('notes-toolbar')?.classList.toggle('hidden', !canEdit);
    document.getElementById('btn-notes-new-page')?.classList.toggle('hidden', !canEdit);

    const editor = document.getElementById('notes-content-editor');
    if (editor) {
      editor.setAttribute('contenteditable', canEdit ? 'true' : 'false');
    }

    if (Array.isArray(char.notesPages) && char.notesPages.length > 0) {
      currentNotesPages = JSON.parse(JSON.stringify(char.notesPages)).map((p, idx) => ({
        id: p.id || generateNotePageId(),
        title: p.title || `Página ${idx + 1}`,
        content: p.content || '',
        updatedAt: p.updatedAt || new Date().toISOString(),
      }));
    } else {
      const legacy = (char.notes || '').trim();
      currentNotesPages = [
        {
          id: generateNotePageId(),
          title: 'Geral',
          content: legacy ? `<p>${escapeHtml(legacy).replace(/\n/g, '<br>')}</p>` : '',
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    if (!currentNotesActivePageId || !currentNotesPages.some((p) => p.id === currentNotesActivePageId)) {
      currentNotesActivePageId = currentNotesPages[0].id;
    }

    const statusEl = document.getElementById('notes-save-status');
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-emerald-400 flex items-center gap-1 font-bold"><iconify-icon icon="game-icons:check-mark"></iconify-icon> Salvo</span>';
    }

    const searchInput = document.getElementById('notes-search-input');
    if (searchInput) searchInput.value = '';
    const searchStatus = document.getElementById('notes-search-status');
    if (searchStatus) searchStatus.textContent = '';

    renderNotesTabs(canEdit);
    loadActiveNotePage(currentNotesActivePageId, canEdit);

    if (!notesToolbarInitialized) {
      initNotesToolbar();
      notesToolbarInitialized = true;
    }

    openModal('modal-notes');
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

    renderSkillDetailTreeSkillsSection();

    openModal('modal-skill-detail');
    if (canEdit) setTimeout(() => textarea?.focus(), 50);
  }

  function renderSkillDetailTreeSkillsSection() {
    const context = document.getElementById('skill-modal-context')?.value || 'sheet';
    const slot = String(document.getElementById('skill-modal-slot')?.value || 'PASSIVA').toUpperCase();
    const charId = document.getElementById('skill-modal-char-id')?.value || '';
    const sectionEl = document.getElementById('skill-modal-tree-skills-section');
    const countBadge = document.getElementById('skill-modal-tree-skills-count');
    const listEl = document.getElementById('skill-modal-tree-skills-list');
    if (!sectionEl || !listEl) return;

    const targetCharId = charId || (context === 'form' ? document.getElementById('char-form-id')?.value || '' : '');
    const char = state.characters.find((c) => c.id === targetCharId) || null;
    if (!char) {
      sectionEl.classList.add('hidden');
      return;
    }

    sectionEl.classList.remove('hidden');
    const canEdit = canEditCharacter(char);
    const acquiredList = getCharacterAcquiredTreeSkillsByCategory(char, slot);
    const activeCount = acquiredList.filter((item) => item.nodeState.enabled).length;

    if (countBadge) {
      countBadge.textContent = `${activeCount}/${acquiredList.length}`;
    }

    if (acquiredList.length === 0) {
      listEl.innerHTML = `
        <div class="p-3.5 rounded-xl bg-black/30 border border-dashed app-divider-border text-center text-xs app-muted italic">
          Nenhuma habilidade <strong>${escapeHtml(slot)}</strong> adquirida nas Árvores de Habilidades para ${escapeHtml(char.name)}.
        </div>
      `;
      return;
    }

    listEl.innerHTML = acquiredList
      .map(({ tree, node, nodeState }) => {
        const cat = String(node.category || slot).toUpperCase();
        const subtypeTag = node.subtype ? `[${cat} - ${String(node.subtype).toUpperCase()}]` : `[${cat}]`;
        const upgradeBadge =
          nodeState.maxUpgrades > 0
            ? `Melhoria ${nodeState.upgrades}/${nodeState.maxUpgrades}`
            : 'Nível Base (Liberada)';
        const combatTagsHtml = renderSkillCombatTags(node);
        const effectsHtml = (node.effects || [])
          .map(
            (ef) =>
              `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ${escapeHtml(formatEffectTargetLabel(ef.targetStat))}: ${ef.value >= 0 ? '+' : ''}${ef.value}${
                ef.modifierType === 'PERCENT' ? '%' : ''
              }
              </span>`
          )
          .join('');

        return `
          <div class="p-3.5 rounded-xl bg-black/45 border ${
            nodeState.enabled ? 'border-amber-500/40' : 'border-slate-700/50 opacity-65'
          } space-y-2">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="space-y-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ${escapeHtml(subtypeTag)}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-200 border border-purple-500/35">
                    <iconify-icon icon="game-icons:family-tree"></iconify-icon> ${escapeHtml(tree.name)}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ${escapeHtml(upgradeBadge)}
                  </span>
                </div>
                <h5 class="font-serif-fantasy font-black text-sm app-title">${escapeHtml(node.name)}</h5>
              </div>

              ${
                canEdit
                  ? `<label class="inline-flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1 rounded-lg bg-black/50 border app-divider-border shrink-0" title="Ativar/Desativar sem reembolsar pontos">
                      <input
                        type="checkbox"
                        data-toggle-skill-node="${escapeHtml(node.id)}"
                        data-char-id="${escapeHtml(char.id)}"
                        ${nodeState.enabled ? 'checked' : ''}
                        class="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <span class="text-[10px] font-mono font-bold ${
                        nodeState.enabled ? 'text-emerald-300' : 'text-slate-400'
                      }">${nodeState.enabled ? 'Ativa' : 'Inativa'}</span>
                    </label>`
                  : `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      nodeState.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }">${nodeState.enabled ? 'Ativa' : 'Inativa'}</span>`
              }
            </div>

            ${combatTagsHtml}

            <p class="text-xs app-muted leading-relaxed whitespace-pre-line">${escapeHtml(node.description || '')}</p>

            ${
              nodeState.maxUpgrades > 0 || node.upgradeDescription
                ? `<div class="p-2 rounded-lg bg-amber-950/25 border border-amber-500/30 text-[11px] text-amber-200">
                    <strong class="font-mono uppercase text-[10px] text-amber-300">Melhoria (${nodeState.upgrades}/${nodeState.maxUpgrades}):</strong>
                    <span>${escapeHtml(node.upgradeDescription || 'Aprimoramento progressivo da habilidade.')}</span>
                  </div>`
                : ''
            }

            ${effectsHtml ? `<div class="flex flex-wrap gap-1.5 pt-0.5">${effectsHtml}</div>` : ''}
          </div>
        `;
      })
      .join('');
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
      maxWeightInput.value = String(char.baseMaxWeight ?? maxWeight);
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
                  ? (tpl.descricao.length > 60
                      ? `<div class="mt-1">
                          <p id="inv-desc-${escapeHtml(inv.id)}" class="text-[11px] app-muted item-description line-clamp-1 leading-relaxed">${escapeHtml(tpl.descricao)}</p>
                          <button type="button" data-toggle-desc="inv-desc-${escapeHtml(inv.id)}" class="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-0.5" title="Ver descrição completa">
                            <iconify-icon icon="game-icons:magnifying-glass" class="text-xs"></iconify-icon> <span>Ver descrição</span>
                          </button>
                        </div>`
                      : `<p class="text-[11px] app-muted item-description leading-relaxed">${escapeHtml(tpl.descricao)}</p>`)
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
    if (!char) return;
    if (char.isEnemy || char.type === 'enemy' || char.bestiaryId) {
      showToast('Inimigos não podem vender itens na loja!', 'error');
      return;
    }
    if (!isEffectiveMaster() && !isCharacterOwner(char)) {
      showToast('Você só pode solicitar venda de itens da sua própria ficha vinculada!', 'warning');
      return;
    }
    const inv = char?.inventory?.find((i) => i.id === invId);
    const tpl = state.itemsCatalog.find((it) => it.id === inv?.itemId);
    if (!inv || !tpl) return;

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
        if (c.isEnemy || c.type === 'enemy' || c.bestiaryId) {
          toasts.push({ message: 'Inimigos não podem vender itens!', variant: 'error' });
          return false;
        }
        if (!isEffectiveMaster() && !isCharacterOwner(c)) {
          toasts.push({ message: 'Você só pode vender itens da sua própria ficha vinculada!', variant: 'warning' });
          return false;
        }
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
        const curMax = enemy?.resistances?.[r.name]?.baseMax ?? enemy?.resistances?.[r.name]?.max ?? 100;
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

    renderEnemyFormElementalResistanceInputs(enemy ? enemy.elementalResistances : {});
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
          elementalResistances: normalizeElementalResistances(bestiaryEnemy.elementalResistances),
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

        newInst.initial = {
          hp: newInst.baseMaxHp,
          maxHp: newInst.baseMaxHp,
          armor: newInst.baseMaxArmor,
          maxArmor: newInst.baseMaxArmor,
          mana: newInst.baseMaxMana,
          maxMana: newInst.baseMaxMana,
          pa: 3,
          maxPa: 3,
          regen: newInst.baseRegen,
          defense: newInst.baseDefense,
          attack: newInst.attack,
          arcana: newInst.arcana,
          santidade: newInst.santidade,
          maxWeight: 999,
          resistances: JSON.parse(JSON.stringify(newInst.resistances)),
          elementalResistances: JSON.parse(JSON.stringify(newInst.elementalResistances)),
        };
        recalculateCharacterDerived(newInst);

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


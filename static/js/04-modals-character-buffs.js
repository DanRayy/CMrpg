  // ---------------------------------------------------------------------------
  // Sistema de Upload e Modal de Edição de Imagem Circular (Crop, Zoom, Rotação)
  // ---------------------------------------------------------------------------
  const imageCropperState = {
    img: null,
    rawFile: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotationDeg: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    startPanX: 0,
    startPanY: 0,
    category: 'personagens',
    itemType: '',
    onComplete: null,
    isUploading: false,
  };

  function updateFormImagePreviewUI({ inputId, avatarInputId, previewId, clearBtnId, imageUrl, avatarUrl, fallbackIconHtml }) {
    const hiddenInput = document.getElementById(inputId);
    const hiddenAvatarInput = avatarInputId
      ? document.getElementById(avatarInputId)
      : (inputId ? document.getElementById(inputId.replace('-image-url', '-avatar-url')) : null);
    const previewEl = document.getElementById(previewId);
    const clearBtn = document.getElementById(clearBtnId);
    const cleanUrl = imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : '';
    const cleanAvatarUrl = avatarUrl && String(avatarUrl).trim() ? String(avatarUrl).trim() : '';

    if (hiddenInput) hiddenInput.value = cleanUrl;
    if (hiddenAvatarInput) hiddenAvatarInput.value = cleanAvatarUrl;
    if (clearBtn) clearBtn.classList.toggle('hidden', !cleanUrl && !cleanAvatarUrl);
    if (previewEl) {
      const displayUrl = cleanAvatarUrl || cleanUrl;
      if (displayUrl) {
        previewEl.innerHTML = `<img src="${escapeHtml(displayUrl)}" alt="Preview" class="w-full h-full object-cover rounded-full" />`;
      } else {
        previewEl.innerHTML =
          fallbackIconHtml ||
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7 text-amber-300/85"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      }
    }
  }

  function getCropperBaseScale(img, circleRadius) {
    if (!img || !img.width || !img.height) return 1;
    const minSide = Math.min(img.width, img.height);
    return (circleRadius * 2) / Math.max(1, minSide);
  }

  function drawCircularCropperCanvas() {
    const canvas = document.getElementById('cropper-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const cx = cw / 2;
    const cy = ch / 2;
    const radius = 108;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(0, 0, cw, ch);

    const img = imageCropperState.img;
    if (img && img.complete && img.width > 0) {
      const baseScale = getCropperBaseScale(img, radius);
      const effectiveScale = baseScale * Number(imageCropperState.zoom || 1);
      const rad = (Number(imageCropperState.rotationDeg || 0) * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx + imageCropperState.panX, cy + imageCropperState.panY);
      ctx.rotate(rad);
      ctx.scale(effectiveScale, effectiveScale);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }

    // Máscara escura semi-transparente externa ao círculo
    ctx.save();
    ctx.fillStyle = 'rgba(16, 17, 20, 0.66)';
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();

    // Borda circular branca nítida no centro
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function openCircularImageCropperModal(file, opts = {}) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        imageCropperState.img = img;
        imageCropperState.rawFile = file;
        imageCropperState.zoom = 1;
        imageCropperState.panX = 0;
        imageCropperState.panY = 0;
        imageCropperState.rotationDeg = 0;
        imageCropperState.isDragging = false;
        imageCropperState.category = opts.category || 'personagens';
        imageCropperState.itemType = opts.itemType || '';
        imageCropperState.onComplete = typeof opts.onComplete === 'function' ? opts.onComplete : null;

        const slider = document.getElementById('cropper-zoom-slider');
        if (slider) slider.value = '1';

        openModal('modal-image-cropper');
        requestAnimationFrame(() => drawCircularCropperCanvas());
      };
      img.onerror = () => {
        showToast('Não foi possível carregar o arquivo de imagem selecionado.', 'warning');
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  }

  async function applyCircularImageCrop() {
    if (imageCropperState.isUploading || !imageCropperState.img) return;
    const img = imageCropperState.img;
    const applyBtn = document.getElementById('btn-cropper-apply');

    const outSize = 300;
    const outHalf = outSize / 2;
    const previewRadius = 108;
    const ratio = outHalf / previewRadius;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outSize;
    outCanvas.height = outSize;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.clearRect(0, 0, outSize, outSize);
    outCtx.save();
    outCtx.beginPath();
    outCtx.arc(outHalf, outHalf, outHalf, 0, Math.PI * 2);
    outCtx.closePath();
    outCtx.clip();

    const baseScale = getCropperBaseScale(img, previewRadius);
    const effectiveScale = baseScale * Number(imageCropperState.zoom || 1) * ratio;
    const rad = (Number(imageCropperState.rotationDeg || 0) * Math.PI) / 180;

    outCtx.translate(outHalf + imageCropperState.panX * ratio, outHalf + imageCropperState.panY * ratio);
    outCtx.rotate(rad);
    outCtx.scale(effectiveScale, effectiveScale);
    outCtx.drawImage(img, -img.width / 2, -img.height / 2);
    outCtx.restore();

    imageCropperState.isUploading = true;
    if (applyBtn) {
      applyBtn.disabled = true;
      applyBtn.textContent = 'Salvando...';
    }

    try {
      const blob = await new Promise((resolve) => outCanvas.toBlob(resolve, 'image/png', 0.95));
      if (!blob) throw new Error('Falha ao gerar imagem recortada');

      const formData = new FormData();
      formData.append('category', imageCropperState.category || 'personagens');
      if (imageCropperState.itemType) {
        formData.append('itemType', imageCropperState.itemType);
      }
      formData.append('file', blob, 'cropped.png');
      if (imageCropperState.rawFile) {
        formData.append('original_file', imageCropperState.rawFile, imageCropperState.rawFile.name || 'original.png');
      }

      const resp = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok || (!data?.url && !data?.avatarUrl)) {
        throw new Error(data?.error || 'Falha no upload da imagem');
      }

      if (typeof imageCropperState.onComplete === 'function') {
        imageCropperState.onComplete(data);
      }
      closeModal('modal-image-cropper');
      showToast('Imagem recortada e aplicada com sucesso!');
    } catch (err) {
      showToast(err?.message || 'Erro ao enviar imagem para o servidor.', 'warning');
    } finally {
      imageCropperState.isUploading = false;
      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Aplicar';
      }
    }
  }

  function initCircularImageCropperEvents() {
    const stage = document.getElementById('cropper-stage');
    const slider = document.getElementById('cropper-zoom-slider');
    const rotateBtn = document.getElementById('btn-cropper-rotate');
    const resetBtn = document.getElementById('btn-cropper-reset');
    const cancelBtn = document.getElementById('btn-cropper-cancel');
    const applyBtn = document.getElementById('btn-cropper-apply');

    if (stage) {
      stage.addEventListener('pointerdown', (e) => {
        if (!imageCropperState.img) return;
        imageCropperState.isDragging = true;
        imageCropperState.dragStartX = e.clientX;
        imageCropperState.dragStartY = e.clientY;
        imageCropperState.startPanX = imageCropperState.panX;
        imageCropperState.startPanY = imageCropperState.panY;
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (_) {}
      });

      stage.addEventListener('pointermove', (e) => {
        if (!imageCropperState.isDragging) return;
        const rect = stage.getBoundingClientRect();
        const canvas = document.getElementById('cropper-canvas');
        const scaleX = canvas && rect.width > 0 ? canvas.width / rect.width : 1;
        const scaleY = canvas && rect.height > 0 ? canvas.height / rect.height : 1;
        imageCropperState.panX = imageCropperState.startPanX + (e.clientX - imageCropperState.dragStartX) * scaleX;
        imageCropperState.panY = imageCropperState.startPanY + (e.clientY - imageCropperState.dragStartY) * scaleY;
        drawCircularCropperCanvas();
      });

      const stopDrag = (e) => {
        if (!imageCropperState.isDragging) return;
        imageCropperState.isDragging = false;
        try {
          stage.releasePointerCapture(e.pointerId);
        } catch (_) {}
      };
      stage.addEventListener('pointerup', stopDrag);
      stage.addEventListener('pointercancel', stopDrag);

      stage.addEventListener(
        'wheel',
        (e) => {
          if (!imageCropperState.img) return;
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          const nextZoom = Math.max(1, Math.min(3, Number((imageCropperState.zoom + delta).toFixed(2))));
          imageCropperState.zoom = nextZoom;
          if (slider) slider.value = String(nextZoom);
          drawCircularCropperCanvas();
        },
        { passive: false }
      );
    }

    slider?.addEventListener('input', (e) => {
      imageCropperState.zoom = Math.max(1, Math.min(3, Number(e.target.value || 1)));
      drawCircularCropperCanvas();
    });

    rotateBtn?.addEventListener('click', () => {
      imageCropperState.rotationDeg = (Number(imageCropperState.rotationDeg || 0) + 90) % 360;
      drawCircularCropperCanvas();
    });

    resetBtn?.addEventListener('click', () => {
      imageCropperState.zoom = 1;
      imageCropperState.panX = 0;
      imageCropperState.panY = 0;
      imageCropperState.rotationDeg = 0;
      if (slider) slider.value = '1';
      drawCircularCropperCanvas();
    });

    cancelBtn?.addEventListener('click', () => {
      closeModal('modal-image-cropper');
    });

    applyBtn?.addEventListener('click', () => {
      applyCircularImageCrop();
    });
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

  function syncCharacterFormSubraceOptions(selectedRaceId, preferredSubraceId = '') {
    const subraceSelect = document.getElementById('char-subrace-select');
    if (!subraceSelect) return;
    const races = Array.isArray(state.races) && state.races.length > 0 ? state.races : buildDefaultRacesTemplate();
    const subraces = selectedRaceId
      ? races.filter((r) => r && Boolean(r.isSubrace) && r.parentRaceId === selectedRaceId)
      : [];
    if (subraces.length === 0) {
      subraceSelect.innerHTML = `<option value="">${selectedRaceId ? 'Nenhuma Sub-raça cadastrada para esta Raça' : 'Selecione uma Raça Base primeiro'}</option>`;
      subraceSelect.value = '';
      subraceSelect.disabled = true;
    } else {
      subraceSelect.disabled = false;
      subraceSelect.innerHTML =
        `<option value="">Sem Sub-raça (Padrão da Raça Base)</option>` +
        subraces
          .map(
            (sr) =>
              `<option value="${escapeHtml(sr.id)}" ${sr.id === preferredSubraceId ? 'selected' : ''}>${escapeHtml(sr.name)}</option>`
          )
          .join('');
    }
  }

  function updateCharacterFormOriginPreview() {
    const previewEl = document.getElementById('char-origin-vocation-preview');
    if (!previewEl) return;
    const raceId = (document.getElementById('char-race-select')?.value || '').trim();
    const subraceId = (document.getElementById('char-subrace-select')?.value || '').trim();
    const classId = (document.getElementById('char-class-select')?.value || '').trim();
    const subclassId = (document.getElementById('char-subclass-select')?.value || '').trim();

    const races = Array.isArray(state.races) && state.races.length > 0 ? state.races : buildDefaultRacesTemplate();
    const classes = getVisibleClasses();

    const baseRace = raceId ? races.find((r) => r && r.id === raceId && !r.isSubrace) : null;
    const subRace = subraceId && baseRace ? races.find((r) => r && r.id === subraceId && r.isSubrace && r.parentRaceId === baseRace.id) : null;
    const baseCls = classId ? classes.find((c) => c && c.id === classId && !c.isSubclass) : null;
    const subCls = subclassId ? classes.find((c) => c && c.id === subclassId && Boolean(c.isSubclass)) : null;

    const lines = [];
    const fmtMods = (effs) =>
      (effs || [])
        .map(
          (ef) =>
            `${ef.value >= 0 ? '+' : ''}${ef.value}${ef.modifierType === 'PERCENT' ? '%' : ''} ${formatEffectTargetLabel(ef.targetStat)}`
        )
        .join(' • ');

    if (baseRace) {
      const mStr = fmtMods(baseRace.effects || baseRace.modifiers);
      const bPts = Math.max(0, Number(baseRace.bonusSkillPoints || 0));
      lines.push(
        `<div><strong class="gold-title">Raça (${escapeHtml(baseRace.name)}):</strong> ${
          bPts > 0 ? `<span class="text-purple-300 font-mono font-bold">[+${bPts} Pts de Talento]</span> ` : ''
        }${mStr ? `<span class="text-emerald-300 font-mono font-bold">[${escapeHtml(mStr)}]</span> ` : ''}<span class="app-muted">${escapeHtml(baseRace.description || '')}</span></div>`
      );
    }
    if (subRace) {
      const mStr = fmtMods(subRace.effects || subRace.modifiers);
      const bPts = Math.max(0, Number(subRace.bonusSkillPoints || 0));
      lines.push(
        `<div><strong class="gold-title">Sub-raça (${escapeHtml(subRace.name)}):</strong> ${
          bPts > 0 ? `<span class="text-purple-300 font-mono font-bold">[+${bPts} Pts de Talento]</span> ` : ''
        }${mStr ? `<span class="text-emerald-300 font-mono font-bold">[${escapeHtml(mStr)}]</span> ` : ''}<span class="app-muted">${escapeHtml(subRace.description || '')}</span></div>`
      );
    }
    if (baseCls) {
      const mStr = fmtMods(baseCls.completionEffects || baseCls.classEffects);
      lines.push(
        `<div><strong class="text-sky-300">Efeito de Classe (${escapeHtml(baseCls.name)}):</strong> ${
          mStr ? `<span class="text-emerald-300 font-mono font-bold">[${escapeHtml(mStr)}]</span> ` : ''
        }<span class="app-muted">${escapeHtml(baseCls.completionDescription || baseCls.description || 'Ativo imediatamente ao escolher.')}</span></div>`
      );
    }
    if (subCls) {
      const mStr = fmtMods(subCls.completionEffects || subCls.classEffects);
      lines.push(
        `<div><strong class="text-purple-300">Efeito de Subclasse (${escapeHtml(subCls.name)}):</strong> ${
          mStr ? `<span class="text-emerald-300 font-mono font-bold">[${escapeHtml(mStr)}]</span> ` : ''
        }<span class="app-muted">${escapeHtml(subCls.completionDescription || subCls.description || 'Ativo imediatamente no Nível 15+.')}</span></div>`
      );
    }

    if (lines.length === 0) {
      previewEl.classList.add('hidden');
      previewEl.innerHTML = '';
    } else {
      previewEl.classList.remove('hidden');
      previewEl.innerHTML = lines.join('');
    }
  }

  function populateCharacterFormOriginAndVocationSelects({
    raceId = '',
    subraceId = '',
    classId = '',
    subclassId = '',
    level = 1,
  } = {}) {
    const charLvl = Math.max(1, Number(level || 1));
    const lvlBadge = document.getElementById('char-form-level-badge');
    if (lvlBadge) lvlBadge.textContent = `Nível ${charLvl}`;

    const races = Array.isArray(state.races) && state.races.length > 0 ? state.races : buildDefaultRacesTemplate();
    const baseRaces = races.filter((r) => r && !r.isSubrace);
    const raceSelect = document.getElementById('char-race-select');
    if (raceSelect) {
      raceSelect.innerHTML =
        `<option value="">Sem Raça Selecionada</option>` +
        baseRaces
          .map((r) => {
            const bPts = Math.max(0, Number(r.bonusSkillPoints || 0));
            const mods = (r.effects || [])
              .map((ef) => `${ef.value >= 0 ? '+' : ''}${ef.value}${ef.modifierType === 'PERCENT' ? '%' : ''} ${formatEffectTargetLabel(ef.targetStat)}`)
              .join(', ');
            const suffix = bPts > 0 ? ` (+${bPts} Pts Talento)` : mods ? ` (${mods})` : '';
            return `<option value="${escapeHtml(r.id)}" ${r.id === raceId ? 'selected' : ''}>${escapeHtml(r.name)}${escapeHtml(suffix)}</option>`;
          })
          .join('');
    }

    syncCharacterFormSubraceOptions(raceId, subraceId);

    const visibleClasses = getVisibleClasses();
    const baseClasses = visibleClasses.filter((c) => c && !c.isSubclass);
    const subclasses = visibleClasses.filter((c) => c && Boolean(c.isSubclass));

    const classSelect = document.getElementById('char-class-select');
    if (classSelect) {
      classSelect.innerHTML =
        `<option value="">Sem Classe Base</option>` +
        baseClasses
          .map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === classId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
          .join('');
    }

    const subclassSelect = document.getElementById('char-subclass-select');
    const lockHint = document.getElementById('char-subclass-lock-hint');
    if (subclassSelect) {
      if (charLvl < 15) {
        subclassSelect.disabled = true;
        subclassSelect.innerHTML = `<option value="">🔒 Desbloqueia no Nível 15 (Atual: Nv. ${charLvl})</option>`;
        if (lockHint) {
          lockHint.textContent = '🔒 Desbloqueia no Nível 15';
          lockHint.className = 'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/50 text-amber-300/80 border border-amber-500/30';
        }
      } else {
        subclassSelect.disabled = false;
        subclassSelect.innerHTML =
          `<option value="">Sem Subclasse Selecionada</option>` +
          subclasses
            .map((sc) => `<option value="${escapeHtml(sc.id)}" ${sc.id === subclassId ? 'selected' : ''}>${escapeHtml(sc.name)}</option>`)
            .join('');
        if (lockHint) {
          lockHint.textContent = '🔓 Liberado (Nível 15+)';
          lockHint.className = 'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35';
        }
      }
    }

    updateCharacterFormOriginPreview();
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
    updateFormImagePreviewUI({
      inputId: 'char-image-url',
      avatarInputId: 'char-avatar-url',
      previewId: 'char-image-preview',
      clearBtnId: 'btn-char-clear-image',
      imageUrl: '',
      avatarUrl: '',
    });
    if (document.getElementById('char-image-file')) document.getElementById('char-image-file').value = '';
    if (document.getElementById('char-skills-input')) document.getElementById('char-skills-input').value = '';
    if (document.getElementById('char-skill-passive')) document.getElementById('char-skill-passive').value = '';
    if (document.getElementById('char-skill-active')) document.getElementById('char-skill-active').value = '';
    if (document.getElementById('char-skill-supreme')) document.getElementById('char-skill-supreme').value = '';
    updateCharFormSkillBadges();
    populateCharacterFormOriginAndVocationSelects({
      raceId: '',
      subraceId: '',
      classId: '',
      subclassId: '',
      level: 1,
    });

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
    updateFormImagePreviewUI({
      inputId: 'char-image-url',
      avatarInputId: 'char-avatar-url',
      previewId: 'char-image-preview',
      clearBtnId: 'btn-char-clear-image',
      imageUrl: char.image || '',
      avatarUrl: char.avatar || '',
    });
    if (document.getElementById('char-image-file')) document.getElementById('char-image-file').value = '';
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
    populateCharacterFormOriginAndVocationSelects({
      raceId: char.raceId || '',
      subraceId: char.subraceId || '',
      classId: char.classId || '',
      subclassId: char.subclassId || '',
      level: char.level || 1,
    });

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
    const rawCharImage = (document.getElementById('char-image-url')?.value || '').trim();
    const rawCharAvatar = (document.getElementById('char-avatar-url')?.value || '').trim();
    const charImage = rawCharImage ? rawCharImage : null;
    const charAvatar = rawCharAvatar ? rawCharAvatar : null;
    const skillsDescription = (document.getElementById('char-skills-input')?.value || '').trim();
    const skillPassive = (document.getElementById('char-skill-passive')?.value || '').trim();
    const skillActive = (document.getElementById('char-skill-active')?.value || '').trim();
    const skillSupreme = (document.getElementById('char-skill-supreme')?.value || '').trim();

    const raceId = (document.getElementById('char-race-select')?.value || '').trim() || null;
    const subraceId = (document.getElementById('char-subrace-select')?.value || '').trim() || null;
    const classId = (document.getElementById('char-class-select')?.value || '').trim() || null;
    const subclassId = (document.getElementById('char-subclass-select')?.value || '').trim() || null;

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

    const executeSaveCharacter = () => {
      commitMutation(
        (st, toasts) => {
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
              image: charImage,
              avatar: charAvatar,
              mesaCompact: false,
              isCompact: false,
              age,
              height,
              history,
              skillsDescription,
              skillPassive,
              skillActive,
              skillSupreme,
              raceId,
              subraceId,
              classId,
              subclassId: null,
              appliedRaceBonusPoints: 0,
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
              skillTreeProgress: {},
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

            const prevClassId = target.classId || null;
            const prevSubclassId = target.subclassId || null;
            const nextSubclassId = Number(target.level || 1) >= 15 ? subclassId : prevSubclassId;

            if (prevClassId && prevClassId !== classId) {
              const oldCls = (st.classes || []).find((c) => c && c.id === prevClassId);
              if (oldCls) {
                const refCls = refundAndResetContainerNodes(target, oldCls);
                if (refCls.refundedPoints > 0 || refCls.resetNodesCount > 0) {
                  toasts.push(
                    `🔄 Classe anterior "${oldCls.name}" resetada (+${refCls.refundedPoints} pt(s) de talento devolvidos a ${name}).`
                  );
                }
              }
            }

            if (prevSubclassId && prevSubclassId !== nextSubclassId) {
              const oldSub = (st.classes || []).find((c) => c && c.id === prevSubclassId);
              if (oldSub) {
                const refSub = refundAndResetContainerNodes(target, oldSub);
                toasts.push(
                  `🔄 Subclasse anterior "${oldSub.name}" resetada (+${refSub.refundedPoints} pt(s) devolvidos e habilidades/passivas desequipadas em ${name}).`
                );
              }
            }

            target.name = name;
            target.image = charImage;
            target.avatar = charAvatar;
            target.age = age;
            target.height = height;
            target.history = history;
            target.skillsDescription = skillsDescription;
            target.skillPassive = skillPassive;
            target.skillActive = skillActive;
            target.skillSupreme = skillSupreme;
            target.raceId = raceId;
            target.subraceId = subraceId;
            target.classId = classId;
            target.subclassId = nextSubclassId;
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
    };

    if (charId) {
      const existingChar = state.characters.find((c) => c.id === charId);
      const prevSubId = existingChar?.subclassId || null;
      const nextSubId = Number(existingChar?.level || 1) >= 15 ? subclassId : prevSubId;
      if (existingChar && prevSubId && prevSubId !== nextSubId) {
        const oldSub = (state.classes || []).find((c) => c && c.id === prevSubId);
        const newSub = nextSubId ? (state.classes || []).find((c) => c && c.id === nextSubId) : null;
        const prog = oldSub ? computeSkillTreeProgress(existingChar, oldSub) : { spentPoints: 0 };
        openConfirmModal({
          icon: '<iconify-icon icon="game-icons:cycle"></iconify-icon>',
          title: 'CONFIRMAR TROCA DE SUBCLASSE?',
          message: `Ao trocar da Subclasse "${oldSub?.name || 'Anterior'}" para "${newSub?.name || 'Nenhuma'}": 1) A Subclasse anterior será resetada, devolvendo 100% dos Pontos de Talento gastos nela (+${prog.spentPoints} pt(s)) para ${existingChar.name}; 2) Todas as habilidades e passivas ativas da Subclasse antiga serão desequipadas; 3) O antigo Efeito de Subclasse será removido e o novo aplicado imediatamente. Deseja confirmar?`,
          confirmText: '<iconify-icon icon="game-icons:check-mark"></iconify-icon> <span>Confirmar Troca e Reset</span>',
          onConfirm: executeSaveCharacter,
        });
        return;
      }
    }

    executeSaveCharacter();
  }

  function handleSheetChangeCharacterVocation(charId, kind, newIdRaw) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char || !canEditCharacter(char)) {
      showToast('Você não tem permissão para alterar a Classe/Subclasse desta ficha.', 'warning');
      return;
    }
    const newId = String(newIdRaw || '').trim() || null;
    const isSub = kind === 'SUBCLASS';
    if (isSub && Number(char.level || 1) < 15) {
      showToast('Subclasse desbloqueia apenas no Nível 15!', 'warning');
      renderAll();
      return;
    }

    const prevId = isSub ? char.subclassId || null : char.classId || null;
    if (prevId === newId) return;

    const oldObj = prevId ? (state.classes || []).find((c) => c && c.id === prevId) : null;
    const newObj = newId ? (state.classes || []).find((c) => c && c.id === newId) : null;
    const prog = oldObj ? computeSkillTreeProgress(char, oldObj) : { spentPoints: 0 };

    const doCommit = () => {
      commitMutation(
        (st, toasts) => {
          const target = st.characters.find((c) => c.id === charId);
          if (!target) return false;
          const oldCls = prevId ? (st.classes || []).find((c) => c && c.id === prevId) : null;
          let refunded = 0;
          if (oldCls) {
            const res = refundAndResetContainerNodes(target, oldCls);
            refunded = res.refundedPoints;
          }
          if (isSub) {
            target.subclassId = newId;
          } else {
            target.classId = newId;
          }
          recalculateCharacterDerived(target);
          target.hp = Math.min(target.hp, target.maxHp);
          target.armor = Math.min(target.armor, target.maxArmor);
          target.mana = Math.min(target.mana, target.maxMana);
          if (oldCls) {
            toasts.push(
              `🔄 ${isSub ? 'Subclasse' : 'Classe'} "${oldCls.name}" resetada (+${refunded} pt(s) devolvidos) e ${
                newObj ? `"${newObj.name}" ativada` : 'removida'
              } em ${target.name}!`
            );
          } else if (newObj) {
            toasts.push(`✨ ${isSub ? 'Subclasse' : 'Classe'} "${newObj.name}" ativada na ficha de ${target.name}!`);
          }
          return true;
        },
        {
          actionType: isSub ? 'CHAR_SUBCLASS_SWAP' : 'CHAR_CLASS_SWAP',
          targetEntity: `${char.name} -> ${newObj?.name || 'Nenhuma'}`,
          summary: `Troca de ${isSub ? 'Subclasse' : 'Classe Base'} em ${char.name}.`,
        }
      );
    };

    if (oldObj && (isSub || prog.spentPoints > 0)) {
      openConfirmModal({
        icon: '<iconify-icon icon="game-icons:cycle"></iconify-icon>',
        title: isSub ? 'CONFIRMAR TROCA DE SUBCLASSE?' : 'CONFIRMAR TROCA DE CLASSE BASE?',
        message: `Ao trocar de "${oldObj.name}" para "${newObj?.name || 'Nenhuma'}": 1) "${oldObj.name}" será resetada e 100% dos Pontos de Talento gastos nela (+${prog.spentPoints} pt(s)) serão devolvidos a ${char.name}; 2) Todas as habilidades/passivas adquiridas nela serão desequipadas; 3) O efeito antigo será removido e o novo aplicado imediatamente.`,
        confirmText: '<iconify-icon icon="game-icons:check-mark"></iconify-icon> <span>Confirmar Troca</span>',
        onConfirm: doCommit,
      });
      renderAll();
      return;
    }

    doCommit();
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
    if (!canApplyCombatActions(char)) {
      showToast('Você não possui permissão para aplicar dano a este combatente!', 'warning');
      return;
    }

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
    if (!canApplyCombatActions(char)) {
      showToast('Você não possui permissão para aplicar dano a este combatente!', 'warning');
      return;
    }

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
    if (!canApplyCombatActions(char)) {
      showToast('Você não possui permissão para alterar os atributos de combate deste personagem!', 'warning');
      return;
    }

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
    const char = state.characters.find((c) => c.id === charId);
    if (!char || !canApplyCombatActions(char)) {
      showToast('Você não possui permissão para alterar os atributos de combate deste personagem!', 'warning');
      return;
    }

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
    const char = state.characters.find((c) => c.id === charId);
    if (!char || !canApplyCombatActions(char)) {
      showToast('Você não possui permissão para usar ações rápidas neste personagem!', 'warning');
      return;
    }
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
    if (!canApplyCombatActions(char) && !canEditCharacter(char)) {
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
    if (!canManageAccumulations(char) && !canEditCharacter(char)) {
      showToast('Você não possui permissão para alterar acúmulos deste combatente!', 'warning');
      return;
    }

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
    const char = state.characters.find((c) => c.id === charId);
    if (!char || (!canManageAccumulations(char) && !canEditCharacter(char))) {
      showToast('Você não possui permissão para alterar acúmulos deste combatente!', 'warning');
      return;
    }

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
      ${renderCustomModifierDropdownHtml(currentTarget, 'data-mod-target', 'col-span-6')}
      <select data-mod-type class="col-span-3 px-2 py-1.5 app-input font-bold text-xs">
        <option value="FLAT" ${currentType === 'FLAT' ? 'selected' : ''}>Fixo (+/-)</option>
        <option value="PERCENT" ${currentType === 'PERCENT' ? 'selected' : ''}>Porcento (%)</option>
      </select>
      <input data-mod-val type="number" step="any" value="${mod.value ?? 10}" class="col-span-2 px-2 py-1.5 font-mono font-bold app-input text-xs" />
      <button type="button" data-remove-bn-modifier class="col-span-1 py-1.5 rounded app-secondary-btn text-rose-400 hover:text-rose-300 text-xs flex items-center justify-center font-bold" title="Remover modificador">✕</button>
    `;
    row.querySelector('[data-remove-bn-modifier]')?.addEventListener('click', () => row.remove());
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
    if (!canManageAccumulations(char) && !canEditCharacter(char)) {
      showToast('Você não possui permissão para editar efeitos deste combatente!', 'warning');
      return;
    }
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
    const checkChar = state.characters.find((c) => c.id === charId);
    if (!checkChar || (!canManageAccumulations(checkChar) && !canEditCharacter(checkChar))) {
      showToast('Você não possui permissão para alterar efeitos deste combatente!', 'warning');
      renderAll();
      return;
    }
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
    const canManage = canManageAccumulations(char) || canEditCharacter(char);

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
    const checkChar = state.characters.find((c) => c.id === charId);
    if (!checkChar || (!canManageAccumulations(checkChar) && !canEditCharacter(checkChar))) {
      showToast('Você não possui permissão para remover efeitos deste combatente!', 'warning');
      return;
    }
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
    if (document.getElementById('bn-editing-id')?.value === effectId) {
      resetBnForm();
    }
    const updatedChar = state.characters.find((c) => c.id === charId);
    if (updatedChar) renderBuffsNerfsModalContent(updatedChar);
  }

  function handleAddBuffNerfSubmit(e) {
    e.preventDefault();
    const charId = document.getElementById('buffs-nerfs-char-id')?.value;
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    if (!canManageAccumulations(char) && !canEditCharacter(char)) {
      showToast('Você não possui permissão para adicionar efeitos neste combatente!', 'warning');
      return;
    }

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

    const { race: sheetRace, subrace: sheetSubrace } = getCharacterRaceAndSubrace(char);
    const visibleClasses = getVisibleClasses();
    const baseClassesList = visibleClasses.filter((c) => c && !c.isSubclass);
    const subclassesList = visibleClasses.filter((c) => c && Boolean(c.isSubclass));
    const sheetBaseClass = char.classId ? (state.classes || []).find((c) => c && c.id === char.classId && !c.isSubclass) || null : null;
    const charLvl = Math.max(1, Number(char.level || 1));
    const sheetSubclass =
      charLvl >= 15 && char.subclassId
        ? (state.classes || []).find((c) => c && c.id === char.subclassId && Boolean(c.isSubclass)) || null
        : null;

    const formatModPillsHtml = (effs) =>
      (effs || [])
        .map(
          (ef) =>
            `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-500/35"><iconify-icon icon="game-icons:lightning-branches"></iconify-icon> ${ef.value >= 0 ? '+' : ''}${ef.value}${ef.modifierType === 'PERCENT' ? '%' : ''} ${escapeHtml(formatEffectTargetLabel(ef.targetStat))}</span>`
        )
        .join('');

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

      <!-- Origem & Vocação: Raça, Sub-raça, Classe Base e Subclasse (Nível 15+) -->
      <div class="p-3.5 rounded-xl bg-black/25 border app-divider-border space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="font-serif-fantasy font-extrabold uppercase gold-title flex items-center gap-1.5">
            <iconify-icon icon="game-icons:crested-helmet"></iconify-icon>
            <span>Raça, Sub-raça, Classe Base &amp; Subclasse (Nível 15+)</span>
          </h4>
          <span class="text-[11px] app-muted">Modificadores raciais e Efeitos de Classe/Subclasse ativos imediatamente na ficha.</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <!-- Card Raça & Sub-raça -->
          <div class="p-3 rounded-xl bg-black/35 border app-divider-border space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] font-serif-fantasy font-extrabold uppercase gold-title flex items-center gap-1.5">
                <iconify-icon icon="game-icons:dna1"></iconify-icon>
                <span>Raça &amp; Sub-raça</span>
              </span>
              ${
                sheetRace
                  ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 gold-title border border-amber-500/35">${escapeHtml(sheetRace.name)}${sheetSubrace ? ` • ${escapeHtml(sheetSubrace.name)}` : ''}</span>`
                  : `<span class="px-2 py-0.5 rounded text-[10px] font-mono app-muted bg-black/40 border app-divider-border">Não definida</span>`
              }
            </div>
            ${
              sheetRace
                ? `<div class="space-y-1.5 text-xs">
                    ${
                      Number(sheetRace.bonusSkillPoints || 0) + Number(sheetSubrace?.bonusSkillPoints || 0) > 0
                        ? `<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-200 border border-purple-500/40"><iconify-icon icon="game-icons:sparkles"></iconify-icon> +${Number(sheetRace.bonusSkillPoints || 0) + Number(sheetSubrace?.bonusSkillPoints || 0)} Pontos de Talento Iniciais</div>`
                        : ''
                    }
                    <p class="text-[11px] app-label leading-relaxed">${escapeHtml(sheetRace.description || '')}</p>
                    ${
                      sheetSubrace && sheetSubrace.description
                        ? `<p class="text-[11px] text-amber-200/90 leading-relaxed"><strong class="gold-title">${escapeHtml(sheetSubrace.name)}:</strong> ${escapeHtml(sheetSubrace.description)}</p>`
                        : ''
                    }
                    ${
                      formatModPillsHtml([...(sheetRace.effects || []), ...(sheetSubrace?.effects || [])])
                        ? `<div class="flex flex-wrap gap-1.5 pt-1">${formatModPillsHtml([...(sheetRace.effects || []), ...(sheetSubrace?.effects || [])])}</div>`
                        : ''
                    }
                  </div>`
                : `<p class="text-[11px] app-muted italic">Nenhuma Raça selecionada. Edite o personagem para escolher uma Raça e Sub-raça.</p>`
            }
          </div>

          <!-- Card Classe Base & Subclasse (Nível 15+) -->
          <div class="p-3 rounded-xl bg-black/35 border app-divider-border space-y-2.5">
            <!-- Classe Base -->
            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[11px] font-serif-fantasy font-extrabold uppercase text-sky-300 flex items-center gap-1.5">
                  <iconify-icon icon="game-icons:crested-helmet"></iconify-icon>
                  <span>Classe Base</span>
                </span>
                <div class="flex items-center gap-1.5">
                  ${
                    canEdit
                      ? `<select data-sheet-change-class="${escapeHtml(char.id)}" class="px-2 py-1 text-[11px] font-bold app-input">
                          <option value="">Sem Classe Base</option>
                          ${baseClassesList
                            .map(
                              (c) =>
                                `<option value="${escapeHtml(c.id)}" ${c.id === char.classId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
                            )
                            .join('')}
                        </select>`
                      : `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-200 border border-sky-500/35">${escapeHtml(sheetBaseClass?.name || 'Nenhuma')}</span>`
                  }
                  ${
                    sheetBaseClass
                      ? `<button type="button" data-open-char-class-tree="${escapeHtml(sheetBaseClass.id)}" data-char-id="${escapeHtml(char.id)}" class="px-2.5 py-1 rounded-lg text-[10px] font-serif-fantasy font-extrabold uppercase btn-gold flex items-center gap-1" title="Abrir árvore radial de 4 quadrantes da Classe ${escapeHtml(sheetBaseClass.name)}">
                          <iconify-icon icon="game-icons:compass"></iconify-icon>
                          <span>Abrir Classe</span>
                        </button>`
                      : ''
                  }
                </div>
              </div>
              ${
                sheetBaseClass
                  ? `<div class="p-2 rounded-lg bg-black/40 border border-sky-500/25 space-y-1">
                      <div class="flex items-center justify-between text-[10px] font-mono">
                        <span class="font-bold gold-title">EFEITO DE CLASSE (ATIVO)</span>
                        <span class="text-sky-300">${computeSkillTreeProgress(char, sheetBaseClass).spentPoints} pts nos nós</span>
                      </div>
                      ${
                        sheetBaseClass.completionDescription
                          ? `<p class="text-[11px] app-label leading-snug">${escapeHtml(sheetBaseClass.completionDescription)}</p>`
                          : ''
                      }
                      ${
                        formatModPillsHtml(sheetBaseClass.completionEffects)
                          ? `<div class="flex flex-wrap gap-1 pt-0.5">${formatModPillsHtml(sheetBaseClass.completionEffects)}</div>`
                          : ''
                      }
                    </div>`
                  : ''
              }
            </div>

            <!-- Subclasse (Nível 15+) -->
            <div class="pt-2 border-t app-divider-border space-y-1.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[11px] font-serif-fantasy font-extrabold uppercase text-purple-300 flex items-center gap-1.5">
                  <iconify-icon icon="game-icons:crowned-heart"></iconify-icon>
                  <span>Subclasse</span>
                </span>
                ${
                  charLvl < 15
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/50 text-amber-300/80 border border-amber-500/30">🔒 Desbloqueia no Nível 15 (Atual: Nv. ${charLvl})</span>`
                    : `<div class="flex items-center gap-1.5">
                        ${
                          canEdit
                            ? `<select data-sheet-change-subclass="${escapeHtml(char.id)}" class="px-2 py-1 text-[11px] font-bold app-input">
                                <option value="">Sem Subclasse</option>
                                ${subclassesList
                                  .map(
                                    (sc) =>
                                      `<option value="${escapeHtml(sc.id)}" ${sc.id === char.subclassId ? 'selected' : ''}>${escapeHtml(sc.name)}</option>`
                                  )
                                  .join('')}
                              </select>`
                            : `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-200 border border-purple-500/35">${escapeHtml(sheetSubclass?.name || 'Nenhuma')}</span>`
                        }
                        ${
                          sheetSubclass
                            ? `<button type="button" data-open-char-class-tree="${escapeHtml(sheetSubclass.id)}" data-char-id="${escapeHtml(char.id)}" class="px-2.5 py-1 rounded-lg text-[10px] font-serif-fantasy font-extrabold uppercase btn-gold flex items-center gap-1" title="Abrir árvore radial de 4 quadrantes da Subclasse ${escapeHtml(sheetSubclass.name)}">
                                <iconify-icon icon="game-icons:compass"></iconify-icon>
                                <span>Abrir Subclasse</span>
                              </button>`
                            : ''
                        }
                      </div>`
                }
              </div>
              ${
                charLvl >= 15 && sheetSubclass
                  ? `<div class="p-2 rounded-lg bg-black/40 border border-purple-500/25 space-y-1">
                      <div class="flex items-center justify-between text-[10px] font-mono">
                        <span class="font-bold gold-title">EFEITO DE SUBCLASSE (ATIVO)</span>
                        <span class="text-purple-300">${computeSkillTreeProgress(char, sheetSubclass).spentPoints} pts nos nós</span>
                      </div>
                      ${
                        sheetSubclass.completionDescription
                          ? `<p class="text-[11px] app-label leading-snug">${escapeHtml(sheetSubclass.completionDescription)}</p>`
                          : ''
                      }
                      ${
                        formatModPillsHtml(sheetSubclass.completionEffects)
                          ? `<div class="flex flex-wrap gap-1 pt-0.5">${formatModPillsHtml(sheetSubclass.completionEffects)}</div>`
                          : ''
                      }
                    </div>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Árvore de Habilidades & Talentos de Nível -->
      <div class="p-3.5 rounded-xl bg-black/25 border app-divider-border space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <h4 class="font-serif-fantasy font-extrabold uppercase gold-title flex flex-wrap items-center gap-2">
              <span class="flex items-center gap-1.5"><iconify-icon icon="game-icons:family-tree"></iconify-icon> <span>Árvore de Habilidades</span></span>
              <span class="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/40 font-mono text-[11px]">
                Pontos Disponíveis: <strong class="text-purple-300">${char.skillPoints || 0}</strong>
              </span>
              <span class="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-200 border border-sky-500/40 font-mono text-[11px]">
                Passivas Ativas: <strong class="text-sky-300">${countCharacterActiveTreePassives(char)} / ${MAX_ACTIVE_TREE_PASSIVES}</strong>
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
  function getAvailableRadialContainersForCharacter(char) {
    const visibleTrees = getVisibleSkillTrees();
    const visibleClasses = getVisibleClasses();
    const canManage = canManageSkillTrees();
    const eqClasses = char ? getCharacterEquippedClasses(char) : [];
    const classesToInclude = canManage ? visibleClasses : eqClasses.length > 0 ? eqClasses : visibleClasses;
    const seen = new Set();
    const combined = [];
    for (const c of classesToInclude) {
      if (c && c.id && !seen.has(c.id)) {
        seen.add(c.id);
        combined.push(c);
      }
    }
    for (const t of visibleTrees) {
      if (t && t.id && !seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }
    return combined;
  }

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
    const activeChar = heroes.find((h) => h.id === state.activeSkillTreeCharId) || null;

    const availableContainers = getAvailableRadialContainersForCharacter(activeChar);
    const visibleTrees = getVisibleSkillTrees();
    if (treeId && findProgressionContainerById(treeId)) {
      state.activeSkillTreeId = treeId;
    } else if (!state.activeSkillTreeId || !availableContainers.some((t) => t.id === state.activeSkillTreeId)) {
      state.activeSkillTreeId = (visibleTrees[0] || availableContainers[0])?.id || null;
    }

    state.skillTreeSelectedNodeId = null;
    state.skillTreeDropdownOpen = false;
    skResetPages();
    renderSkillTreeConstellationModal();
    openModal('modal-skill-tree');
    requestAnimationFrame(() => {
      layoutSkillTreeConnectors();
      positionSkillInspector();
    });
  }

  // --- Layout Radial (v1.14.0): 4 quadrantes + Núcleo Central de progresso ---
  const SK_SLOTS_PER_PAGE = 6;
  const SK_QUADRANTS = [
    { key: 'PASSIVA', title: 'Passivas', icon: 'game-icons:dragon-shield', cls: 'sk-quad-passiva', pos: 'sk-pos-tl', empty: 'Nenhum nó cadastrado' },
    { key: 'TALENTO', title: 'Talentos', icon: 'game-icons:sparkles', cls: 'sk-quad-talento', pos: 'sk-pos-tr', empty: 'Nenhum nó cadastrado' },
    { key: 'ATIVA', title: 'Ativas', icon: 'game-icons:fire-spell-cast', cls: 'sk-quad-ativa', pos: 'sk-pos-bl', empty: 'Nenhum nó cadastrado' },
    { key: 'SUPREMA', title: 'Supremas', icon: 'game-icons:ifrit', cls: 'sk-quad-suprema', pos: 'sk-pos-br', empty: 'Nenhum nó cadastrado' },
  ];

  function skGetPage(cat) {
    if (!state.skillTreePages || typeof state.skillTreePages !== 'object') state.skillTreePages = {};
    return Math.max(0, Math.floor(Number(state.skillTreePages[cat] || 0)));
  }

  function skResetPages() {
    state.skillTreePages = {};
  }

  function skSetDropdownOpen(open) {
    state.skillTreeDropdownOpen = Boolean(open);
    document.getElementById('skill-tree-modal-tabs')?.classList.toggle('hidden', !state.skillTreeDropdownOpen);
    document.getElementById('st-tree-dd-trigger')?.setAttribute('aria-expanded', state.skillTreeDropdownOpen ? 'true' : 'false');
  }

  function skFormatSignedValue(value, modifierType) {
    const num = Number(Number(value || 0).toFixed(2));
    return `${num >= 0 ? '+' : ''}${num}${modifierType === 'PERCENT' ? '%' : ''}`;
  }

  function skCombatTagsHtml(node) {
    const items = [
      ['Mana', node?.manaCost],
      ['PA', node?.paCost],
      ['Usos', node?.uses],
      ['Recarga', node?.cooldown],
      ['Cargas', node?.charges],
    ]
      .map(([label, raw]) => [label, String(raw ?? '').trim()])
      .filter(([, v]) => v !== '' && v !== '0');
    if (items.length === 0) return '';
    return `<div class="sk-chip-row">${items
      .map(([label, v]) => `<span class="sk-chip">${escapeHtml(label)}: ${escapeHtml(v)}</span>`)
      .join('')}</div>`;
  }

  function skRenderSlotHtml(tree, node, ns, isSelected, canManageTrees) {
    const cat = String(node.category || 'TALENTO').toUpperCase();
    const quad = SK_QUADRANTS.find((q) => q.key === cat) || SK_QUADRANTS[1];
    let meta = '';
    if (cat === 'TALENTO') {
      const segs =
        ns.maxRanks <= 8
          ? `<span class="sk-segs">${Array.from({ length: ns.maxRanks }, (_, i) => `<i class="${i < ns.rank ? 'on' : ''}"></i>`).join('')}</span>`
          : '';
      meta = `${segs}<span class="sk-meta-num">${ns.rank}/${ns.maxRanks}</span>`;
    } else if (cat === 'PASSIVA') {
      meta = !ns.unlocked
        ? '<span class="sk-state sk-state-locked">Bloqueada</span>'
        : ns.enabled
        ? '<span class="sk-state sk-state-on">Ativa</span>'
        : '<span class="sk-state sk-state-off">Inativa</span>';
      if (ns.maxUpgrades > 0) meta += `<span class="sk-meta-num" title="Melhorias">${ns.upgrades}/${ns.maxUpgrades}</span>`;
    } else {
      const sub = node.subtype ? `<span class="sk-tag">${escapeHtml(node.subtype)}</span>` : '';
      const stateTxt = !ns.unlocked
        ? '<span class="sk-state sk-state-locked">Bloqueada</span>'
        : !ns.enabled
        ? '<span class="sk-state sk-state-off">Inativa</span>'
        : '';
      const upg = ns.maxUpgrades > 0 ? `<span class="sk-meta-num" title="Melhorias">${ns.upgrades}/${ns.maxUpgrades}</span>` : '';
      meta = `${sub}${stateTxt}${upg}`;
    }

    const cls = [
      'sk-slot',
      ns.isAcquired ? 'is-acquired' : 'is-locked',
      ns.isMaxed ? 'is-maxed' : '',
      isSelected ? 'is-selected' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return `
      <div
        class="${cls}"
        role="button"
        tabindex="0"
        data-st-slot="${escapeHtml(node.id)}"
        data-skill-node-card="${escapeHtml(node.id)}"
        data-tree-id="${escapeHtml(tree.id)}"
        ${canManageTrees ? 'draggable="true"' : ''}
      >
        <span class="sk-slot-ic"><iconify-icon icon="${quad.icon}"></iconify-icon></span>
        <span class="sk-slot-body">
          <span class="sk-slot-name" title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</span>
          <span class="sk-slot-meta">${meta}</span>
        </span>
      </div>
    `;
  }

  function skRenderQuadrantHtml(quad, catNodes, ctx) {
    const { char, tree, canManageTrees, searchQ, selectedId } = ctx;
    const totalPages = Math.max(1, Math.ceil(catNodes.length / SK_SLOTS_PER_PAGE));
    const page = Math.min(skGetPage(quad.key), totalPages - 1);
    state.skillTreePages[quad.key] = page;
    const pageNodes = catNodes.slice(page * SK_SLOTS_PER_PAGE, (page + 1) * SK_SLOTS_PER_PAGE);

    const tabStart = Math.max(0, Math.min(page - 1, totalPages - 3));
    const tabEnd = Math.min(totalPages, tabStart + 3);
    const tabs = [];
    for (let i = tabStart; i < tabEnd; i++) {
      tabs.push(
        `<button type="button" class="sk-pg-tab ${i === page ? 'is-active' : ''}" data-st-page-set="${i}" data-st-page-cat="${quad.key}">ABA ${i + 1}</button>`
      );
    }

    const slots = [];
    for (let i = 0; i < SK_SLOTS_PER_PAGE; i++) {
      const node = pageNodes[i];
      if (node) {
        const ns = getCharacterSkillNodeState(char, node);
        slots.push(skRenderSlotHtml(tree, node, ns, node.id === selectedId, canManageTrees));
      } else if (i === 0 && catNodes.length === 0) {
        slots.push(
          `<div class="sk-slot sk-slot-empty">${searchQ ? 'Nenhum resultado' : escapeHtml(quad.empty)}</div>`
        );
      } else {
        slots.push('<div class="sk-slot sk-slot-empty"></div>');
      }
    }

    return `
      <section class="sk-quad ${quad.cls} ${quad.pos}" data-sk-quad="${quad.key}">
        <div class="sk-quad-head">
          <div class="sk-quad-title">
            <iconify-icon icon="${quad.icon}"></iconify-icon>
            <strong>${quad.title}</strong>
            <span class="sk-quad-count">(${catNodes.length})</span>
            ${
              canManageTrees
                ? `<button type="button" class="sk-quad-add" data-st-add-node-cat="${quad.key}" data-tree-id="${escapeHtml(tree.id)}" title="Adicionar nó em ${quad.title}">+</button>`
                : ''
            }
          </div>
          <div class="sk-pager">
            <button type="button" class="sk-pg-arrow" data-st-page-nav="-1" data-st-page-cat="${quad.key}" ${page <= 0 ? 'disabled' : ''} title="Página anterior">&lt;</button>
            ${tabs.join('')}
            <button type="button" class="sk-pg-arrow" data-st-page-nav="1" data-st-page-cat="${quad.key}" ${page >= totalPages - 1 ? 'disabled' : ''} title="Próxima página">&gt;</button>
          </div>
        </div>
        <div class="sk-slots">${slots.join('')}</div>
      </section>
    `;
  }

  function skRenderCoreHtml(tree, progress, activeChar = null) {
    const C = 2 * Math.PI * 62;
    const pct = Math.max(0, Math.min(100, progress.percent));
    const offset = (C * (1 - pct / 100)).toFixed(2);
    const isCls = isClassContainer(tree);
    const isSub = Boolean(tree.isSubclass);
    const isEquippedOnChar = activeChar
      ? isSub
        ? activeChar.subclassId === tree.id && Number(activeChar.level || 1) >= 15
        : activeChar.classId === tree.id
      : true;
    const isCoreEffectActive = isCls ? isEquippedOnChar : progress.isComplete;
    const coreTitle = isCls
      ? isSub
        ? 'Efeito de Subclasse'
        : 'Efeito de Classe'
      : 'Efeito de Árvore Completa (100%)';
    const coreBadgeText = isCls
      ? isEquippedOnChar
        ? 'ATIVO NA FICHA'
        : isSub && Number(activeChar?.level || 1) < 15
        ? 'REQUER NV. 15'
        : 'AO ESCOLHER'
      : progress.isComplete
      ? 'ATIVO'
      : 'BLOQUEADO';
    const subLabel = isCls ? (isSub ? 'SUBCLASSE' : 'CLASSE') : 'COMPLETA';

    const effects = (tree.completionEffects || [])
      .map(
        (ef) =>
          `<span class="sk-mod">${escapeHtml(formatEffectTargetLabel(ef.targetStat))}: ${skFormatSignedValue(ef.value, ef.modifierType)}</span>`
      )
      .join('');
    return `
      <div class="sk-core">
        <div class="sk-core-medallion ${isCoreEffectActive ? 'is-complete' : ''}">
          <svg class="sk-ring" viewBox="0 0 160 160" aria-hidden="true">
            <circle class="sk-ring-outer" cx="80" cy="80" r="76"></circle>
            <circle class="sk-ring-track" cx="80" cy="80" r="62"></circle>
            <circle class="sk-ring-progress" cx="80" cy="80" r="62" transform="rotate(-90 80 80)" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${offset}"></circle>
            <circle class="sk-ring-inner" cx="80" cy="80" r="52"></circle>
            <polygon class="sk-ring-gem" points="80,0 85,6 80,12 75,6"></polygon>
            <polygon class="sk-ring-gem" points="160,80 154,85 148,80 154,75"></polygon>
            <polygon class="sk-ring-gem" points="80,160 75,154 80,148 85,154"></polygon>
            <polygon class="sk-ring-gem" points="0,80 6,75 12,80 6,85"></polygon>
          </svg>
          <div class="sk-core-text">
            <span class="sk-core-pct">${pct}%</span>
            <span class="sk-core-sub">${subLabel}</span>
          </div>
        </div>
        <div class="sk-core-effect ${isCoreEffectActive ? 'is-active' : ''}">
          <div class="sk-core-effect-head">
            <span class="sk-core-effect-title">${coreTitle}</span>
            <span class="sk-badge ${isCoreEffectActive ? '' : 'sk-badge-muted'}">${coreBadgeText}</span>
          </div>
          ${tree.completionDescription ? `<div class="sk-core-effect-desc">${escapeHtml(tree.completionDescription)}</div>` : ''}
          ${
            effects
              ? `<div class="sk-mod-list">${effects}</div>`
              : !tree.completionDescription
              ? '<div class="sk-core-effect-empty">Nenhum efeito configurado.</div>'
              : ''
          }
          <div class="sk-core-progress">${progress.acquiredSteps}/${progress.totalSteps} etapas • ${progress.spentPoints} pts investidos</div>
        </div>
      </div>
    `;
  }

  function skRenderInspectorHtml(char, tree, node, canEditChar, canManageTrees) {
    const cat = String(node.category || 'TALENTO').toUpperCase();
    const isTalent = cat === 'TALENTO';
    const ns = getCharacterSkillNodeState(char, node);
    const availablePts = Number(char?.skillPoints || 0);
    const masterFreePts = isEffectiveMaster();
    const mult = isTalent ? Math.max(1, ns.rank) : 1;

    const effectsHtml = (node.effects || [])
      .map((ef) => {
        const base = Number(ef.value || 0);
        const total = Number((base * mult).toFixed(2));
        const extra = isTalent && ns.rank > 1 ? ` (Total: ${skFormatSignedValue(total, ef.modifierType)})` : '';
        return `<span class="sk-chip">${escapeHtml(formatEffectTargetLabel(ef.targetStat))}: ${skFormatSignedValue(base, ef.modifierType)}${extra}</span>`;
      })
      .join('');

    const progressLabel = isTalent
      ? `Nível ${ns.rank}/${ns.maxRanks} • ${ns.costPerRank} pt(s) por nível`
      : ns.unlocked
      ? ns.maxUpgrades > 0
        ? `Liberada • Melhoria ${ns.upgrades}/${ns.maxUpgrades}`
        : 'Liberada'
      : `Bloqueada • Liberação: ${ns.unlockCost} pt(s)${ns.maxUpgrades > 0 ? ` • ${ns.maxUpgrades} melhoria(s)` : ''}`;

    // Ações respeitando permissões do dono da ficha / Mestre
    const isClsContainer = isClassContainer(tree);
    const isSubContainer = Boolean(tree.isSubclass);
    const isEquippedClassOnChar = !isClsContainer
      ? true
      : char
      ? isSubContainer
        ? char.subclassId === tree.id && Number(char.level || 1) >= 15
        : char.classId === tree.id
      : false;

    let actionsHtml = '';
    if (char && canEditChar && !isEquippedClassOnChar) {
      actionsHtml = `<div class="sk-insp-actions"><div class="sk-act-note">${
        isSubContainer && Number(char.level || 1) < 15
          ? 'Subclasse desbloqueia apenas no Nível 15.'
          : `Selecione esta ${isSubContainer ? 'Subclasse' : 'Classe'} na ficha de ${escapeHtml(char.name)} para adquirir seus nós.`
      }</div></div>`;
    } else if (char && canEditChar) {
      const idAttrs = `data-tree-id="${escapeHtml(tree.id)}" data-char-id="${escapeHtml(char.id)}"`;
      const buttons = [];
      let refundPts = 0;
      let canRefund = false;

      if (isTalent) {
        const canBuy = ns.rank < ns.maxRanks && (availablePts >= ns.costPerRank || masterFreePts);
        if (ns.rank < ns.maxRanks) {
          buttons.push(
            `<button type="button" class="sk-act-btn" data-skill-node-buy="${escapeHtml(node.id)}" ${idAttrs} ${canBuy ? '' : 'disabled'}>${
              ns.rank === 0 ? 'Liberar' : '+ Melhorar'
            } (-${ns.costPerRank} pt${ns.costPerRank !== 1 ? 's' : ''})</button>`
          );
        } else {
          buttons.push('<div class="sk-act-note">Nível máximo atingido</div>');
        }
        canRefund = ns.rank > 0;
        refundPts = ns.costPerRank;
      } else if (!ns.unlocked) {
        const canUnlock = availablePts >= ns.unlockCost || masterFreePts;
        buttons.push(
          `<button type="button" class="sk-act-btn" data-skill-node-buy="${escapeHtml(node.id)}" ${idAttrs} ${canUnlock ? '' : 'disabled'}>Liberar (-${ns.unlockCost} pt${ns.unlockCost !== 1 ? 's' : ''})</button>`
        );
      } else {
        const hasUpgradesLeft = ns.upgrades < ns.maxUpgrades;
        const canUpgrade = hasUpgradesLeft && (availablePts >= ns.upgradeCost || masterFreePts);
        if (hasUpgradesLeft) {
          buttons.push(
            `<button type="button" class="sk-act-btn" data-skill-node-buy="${escapeHtml(node.id)}" ${idAttrs} ${canUpgrade ? '' : 'disabled'}>+ Melhorar (-${ns.upgradeCost} pt${ns.upgradeCost !== 1 ? 's' : ''}) [${ns.upgrades}/${ns.maxUpgrades}]</button>`
          );
        } else {
          buttons.push(`<div class="sk-act-note">${ns.maxUpgrades > 0 ? 'Melhoria máxima atingida' : 'Habilidade liberada'}</div>`);
        }
        canRefund = true;
        refundPts = ns.upgrades > 0 ? ns.upgradeCost : ns.unlockCost;
      }

      if (canRefund) {
        buttons.push(
          `<button type="button" class="sk-act-btn is-ghost" data-skill-node-refund="${escapeHtml(node.id)}" ${idAttrs} title="Devolver +${refundPts} pt(s)">- Reembolsar</button>`
        );
      }

      const isPassive = cat === 'PASSIVA';
      const toggleHtml = ns.isAcquired
        ? `<div class="sk-toggle-row">
            <span>${isPassive ? 'Passiva' : 'Habilidade'} ${ns.enabled ? 'Ativa' : 'Inativa'}
              ${isPassive ? `<small>Passivas ativas na ficha: ${countCharacterActiveTreePassives(char)} / ${MAX_ACTIVE_TREE_PASSIVES}</small>` : '<small>Ativar/desativar sem reembolsar pontos</small>'}
            </span>
            <label class="fantasy-toggle" title="Ativar/Desativar">
              <input type="checkbox" data-toggle-skill-node="${escapeHtml(node.id)}" data-char-id="${escapeHtml(char.id)}" ${ns.enabled ? 'checked' : ''} />
              <span class="fantasy-toggle-slider"></span>
            </label>
          </div>`
        : '';

      actionsHtml = `<div class="sk-insp-actions">${toggleHtml}${buttons.join('')}</div>`;
    }

    const toolsHtml = canManageTrees
      ? `<div class="sk-insp-tools">
          <button type="button" class="sk-btn" data-clone-skill-node="${escapeHtml(node.id)}" data-tree-id="${escapeHtml(tree.id)}" title="Duplicar nó"><iconify-icon icon="game-icons:files"></iconify-icon><span>Duplicar</span></button>
          <button type="button" class="sk-btn" data-edit-skill-node="${escapeHtml(node.id)}" data-tree-id="${escapeHtml(tree.id)}" title="Editar nó"><iconify-icon icon="game-icons:quill-ink"></iconify-icon><span>Editar</span></button>
          <button type="button" class="sk-btn sk-btn-danger" data-delete-skill-node="${escapeHtml(node.id)}" data-tree-id="${escapeHtml(tree.id)}" title="Excluir nó"><iconify-icon icon="game-icons:trash-can"></iconify-icon><span>Excluir</span></button>
        </div>`
      : '';

    return `
      <div class="sk-insp-head">
        <div class="min-w-0">
          <div class="sk-insp-cat">
            <span class="sk-badge">${escapeHtml(cat)}</span>
            ${node.subtype ? `<span class="sk-badge sk-badge-muted">${escapeHtml(String(node.subtype).toUpperCase())}</span>` : ''}
          </div>
          <div class="sk-insp-name">${escapeHtml(node.name)}</div>
          <div class="sk-insp-tree">${isClsContainer ? (isSubContainer ? 'Subclasse' : 'Classe') : 'Árvore'}: ${escapeHtml(tree.name)}</div>
        </div>
        <button type="button" class="sk-insp-close" data-st-inspector-close title="Fechar painel">✕</button>
      </div>
      <div class="sk-insp-section sk-insp-progress">${escapeHtml(progressLabel)}</div>
      ${skCombatTagsHtml(node) ? `<div class="sk-insp-section">${skCombatTagsHtml(node)}</div>` : ''}
      ${
        node.description
          ? `<div class="sk-insp-section"><div class="sk-insp-label">Descrição</div><div class="sk-insp-desc">${escapeHtml(node.description)}</div></div>`
          : ''
      }
      ${
        !isTalent && (node.maxUpgrades > 0 || node.upgradeDescription)
          ? `<div class="sk-insp-section"><div class="sk-insp-label">Melhoria (${ns.upgrades}/${ns.maxUpgrades}) • ${ns.upgradeCost} pt(s)/nível</div><div class="sk-insp-upgrade">${escapeHtml(node.upgradeDescription || 'Aprimoramento progressivo da habilidade.')}</div></div>`
          : ''
      }
      ${
        effectsHtml
          ? `<div class="sk-insp-section"><div class="sk-insp-label">${isTalent ? 'Modificadores por nível' : 'Modificadores concedidos'}</div><div class="sk-chip-row">${effectsHtml}</div></div>`
          : ''
      }
      ${actionsHtml}
      ${toolsHtml}
    `;
  }

  function skBuildTooltipHtml(node) {
    const tree = findProgressionContainerById(state.activeSkillTreeId);
    if (!tree) return '';
    const char = (state.characters || []).find((c) => c.id === state.activeSkillTreeCharId) || null;
    const ns = getCharacterSkillNodeState(char, node);
    const cat = String(node.category || 'TALENTO').toUpperCase();
    const cost =
      cat === 'TALENTO'
        ? `Custo: ${ns.costPerRank} pt(s)/nível • Nível ${ns.rank}/${ns.maxRanks}`
        : `Liberação: ${ns.unlockCost} pt(s)${ns.maxUpgrades > 0 ? ` • Melhoria: ${ns.upgradeCost} pt(s) (${ns.upgrades}/${ns.maxUpgrades})` : ''}`;
    const desc = String(node.description || '');
    const short = desc.length > 150 ? `${desc.slice(0, 150).trim()}…` : desc;
    return `
      <div class="sk-tip-name">${escapeHtml(node.name)}</div>
      <div class="sk-tip-sub">${escapeHtml(cat)}${node.subtype ? ` • ${escapeHtml(node.subtype)}` : ''}${node.charges ? ` • Cargas: ${escapeHtml(node.charges)}` : ''}</div>
      <div class="sk-tip-cost">${escapeHtml(cost)}</div>
      ${short ? `<div class="sk-tip-desc">${escapeHtml(short)}</div>` : ''}
      <div class="sk-tip-hint">Clique para ver detalhes e ações</div>
    `;
  }

  function showSkillTooltip(slotEl) {
    const tip = document.getElementById('st-tooltip');
    const wrap = document.getElementById('skill-tree-modal-wrap');
    if (!tip || !wrap || !slotEl) return;
    const nodeId = slotEl.getAttribute('data-st-slot');
    if (nodeId === state.skillTreeSelectedNodeId) {
      tip.classList.add('hidden');
      return;
    }
    if (tip.dataset.nodeId !== nodeId || tip.classList.contains('hidden')) {
      const tree = findProgressionContainerById(state.activeSkillTreeId);
      const node = (tree?.nodes || []).find((n) => n.id === nodeId);
      if (!node) return;
      tip.innerHTML = skBuildTooltipHtml(node);
      tip.dataset.nodeId = nodeId;
    }
    tip.classList.remove('hidden');
    const wr = wrap.getBoundingClientRect();
    const sr = slotEl.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = sr.left - wr.left + sr.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, wr.width - tw - 8));
    let top = sr.bottom - wr.top + 6;
    if (top + th > wr.height - 8) top = sr.top - wr.top - th - 6;
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  }

  function hideSkillTooltip() {
    const tip = document.getElementById('st-tooltip');
    if (!tip) return;
    tip.classList.add('hidden');
    tip.dataset.nodeId = '';
  }

  function positionSkillInspector() {
    const insp = document.getElementById('st-inspector');
    const wrap = document.getElementById('skill-tree-modal-wrap');
    if (!insp || !wrap) return;
    const nodeId = state.skillTreeSelectedNodeId;
    if (!nodeId || !insp.innerHTML.trim()) {
      insp.classList.add('hidden');
      return;
    }
    const slot = wrap.querySelector(`[data-st-slot="${CSS.escape(nodeId)}"]`);
    if (!slot) {
      insp.classList.add('hidden');
      return;
    }
    insp.classList.remove('hidden');
    const wr = wrap.getBoundingClientRect();
    const sr = slot.getBoundingClientRect();
    insp.style.maxHeight = `${Math.max(120, wr.height - 16)}px`;
    if (wr.width < 1000) {
      insp.style.left = '8px';
      insp.style.right = '8px';
      insp.style.width = 'auto';
      insp.style.top = 'auto';
      insp.style.bottom = '8px';
      return;
    }
    insp.style.right = 'auto';
    insp.style.bottom = 'auto';
    insp.style.width = '';
    const iw = insp.offsetWidth;
    const ih = insp.offsetHeight;
    const gap = 10;
    const sl = sr.left - wr.left;
    const st = sr.top - wr.top;
    let left;
    if (sl + sr.width + gap + iw <= wr.width - 8) left = sl + sr.width + gap;
    else if (sl - gap - iw >= 8) left = sl - gap - iw;
    else left = Math.max(8, (wr.width - iw) / 2);
    let top = Math.min(st, wr.height - ih - 8);
    top = Math.max(8, top);
    insp.style.left = `${left}px`;
    insp.style.top = `${top}px`;
  }

  function layoutSkillTreeConnectors() {
    const stage = document.getElementById('skill-tree-modal-body');
    const svg = stage?.querySelector('.sk-connectors');
    const core = stage?.querySelector('.sk-core-medallion');
    if (!stage || !svg || !core) return;
    const sr = stage.getBoundingClientRect();
    if (sr.width === 0 || sr.height === 0) return;
    const cr = core.getBoundingClientRect();
    const cx = cr.left + cr.width / 2 - sr.left;
    const cy = cr.top + cr.height / 2 - sr.top;
    svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    let html = '';
    stage.querySelectorAll('.sk-quad').forEach((q) => {
      const r = q.getBoundingClientRect();
      const isLeft = r.left + r.width / 2 < cr.left + cr.width / 2;
      const px = (isLeft ? r.right : r.left) - sr.left;
      const py = r.top + r.height / 2 - sr.top;
      html += `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}"></line>`;
      html += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5"></circle>`;
    });
    svg.innerHTML = html;
  }

  function renderSkillTreeConstellationModal() {
    const charSelect = document.getElementById('skill-tree-modal-char-select');
    const ptsBadge = document.getElementById('skill-tree-modal-points-badge');
    const masterPtsBtns = document.getElementById('skill-tree-modal-master-pts-btns');
    const masterToolbar = document.getElementById('skill-tree-modal-master-toolbar');
    const ddMenu = document.getElementById('skill-tree-modal-tabs');
    const ddLabel = document.getElementById('st-tree-dd-label');
    const stage = document.getElementById('skill-tree-modal-body');
    const inspector = document.getElementById('st-inspector');
    const refundTreeBtn = document.getElementById('btn-st-modal-refund-tree');
    if (!stage || !ddMenu) return;

    const isMaster = isEffectiveMaster();
    const canManageTrees = canManageSkillTrees();
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
              `<option value="${escapeHtml(h.id)}" ${h.id === state.activeSkillTreeCharId ? 'selected' : ''}>${escapeHtml(h.name)} • Nv. ${h.level || 1}</option>`
          )
          .join('');
      }
    }

    const activeChar = heroes.find((h) => h.id === state.activeSkillTreeCharId) || null;
    const canEditChar = activeChar ? canEditCharacter(activeChar) : isMaster;

    if (ptsBadge) ptsBadge.textContent = String(activeChar ? activeChar.skillPoints || 0 : 0);
    const passivesBadge = document.getElementById('skill-tree-modal-passives-badge');
    const passivesPill = document.getElementById('skill-tree-modal-passives-pill');
    const activePassivesCount = activeChar ? countCharacterActiveTreePassives(activeChar) : 0;
    if (passivesBadge) passivesBadge.textContent = `${activePassivesCount} / ${MAX_ACTIVE_TREE_PASSIVES}`;
    if (passivesPill) passivesPill.classList.toggle('is-full', activePassivesCount >= MAX_ACTIVE_TREE_PASSIVES);
    if (masterPtsBtns) masterPtsBtns.classList.toggle('hidden', !(isMaster && activeChar));
    if (masterToolbar) masterToolbar.classList.toggle('hidden', !canManageTrees);

    const availableContainers = getAvailableRadialContainersForCharacter(activeChar);
    if (!state.activeSkillTreeId || !availableContainers.some((t) => t.id === state.activeSkillTreeId)) {
      state.activeSkillTreeId = availableContainers[0]?.id || null;
    }
    const activeTree = availableContainers.find((t) => t.id === state.activeSkillTreeId) || null;

    ['btn-st-modal-edit-tree', 'btn-st-modal-clone-tree', 'btn-st-modal-delete-tree', 'btn-st-modal-add-node'].forEach((id) => {
      document.getElementById(id)?.classList.toggle('hidden', !activeTree);
    });

    // Busca em tempo real
    const searchBarWrap = document.getElementById('skill-tree-modal-search-bar');
    const searchInput = document.getElementById('st-modal-search-input');
    const searchClearBtn = document.getElementById('btn-st-modal-search-clear');
    const searchQ = String(state.skillTreeSearchQuery || '');
    if (searchBarWrap) searchBarWrap.classList.toggle('hidden', availableContainers.length === 0);
    if (searchInput && document.activeElement !== searchInput && searchInput.value !== searchQ) searchInput.value = searchQ;
    if (searchClearBtn) searchClearBtn.classList.toggle('hidden', !searchQ.trim());

    hideSkillTooltip();

    // Sem árvores ou classes disponíveis
    if (availableContainers.length === 0 || !activeTree) {
      if (ddLabel) ddLabel.textContent = 'Nenhuma árvore';
      ddMenu.innerHTML = '<div class="sk-dd-empty">Nenhuma árvore ou classe disponível.</div>';
      skSetDropdownOpen(false);
      if (refundTreeBtn) refundTreeBtn.classList.add('hidden');
      state.skillTreeSelectedNodeId = null;
      if (inspector) {
        inspector.innerHTML = '';
        inspector.classList.add('hidden');
      }
      stage.innerHTML = `
        <div class="sk-empty-stage">
          <iconify-icon icon="game-icons:family-tree"></iconify-icon>
          <h4 class="font-serif-fantasy font-bold text-base app-title">Nenhuma Árvore de Habilidades ou Classe Disponível</h4>
          <p class="text-xs max-w-md">
            ${
              canManageTrees
                ? 'Clique em "Nova Árvore" no topo para criar uma árvore de habilidades.'
                : 'O Mestre ainda não liberou árvores de habilidades visíveis para os jogadores.'
            }
          </p>
        </div>
      `;
      return;
    }

    const progress = computeSkillTreeProgress(activeChar, activeTree);
    const activeIsCls = isClassContainer(activeTree);
    const activeTypePrefix = activeIsCls ? (activeTree.isSubclass ? 'Subclasse: ' : 'Classe: ') : '';

    // Dropdown de árvores e classes/subclasses
    if (ddLabel) ddLabel.textContent = `${activeTypePrefix}${activeTree.name} — ${progress.percent}%`;
    ddMenu.innerHTML = availableContainers
      .map((t) => {
        const prog = computeSkillTreeProgress(activeChar, t);
        const matchCount = searchQ.trim() ? countMatchingNodesInTree(t, activeChar, searchQ, 'ALL') : 0;
        const isSel = t.id === activeTree.id;
        const tIsCls = isClassContainer(t);
        const tIcon = tIsCls
          ? t.isSubclass
            ? 'game-icons:crowned-heart'
            : 'game-icons:crested-helmet'
          : prog.isComplete
          ? 'game-icons:laurel-crown'
          : 'game-icons:family-tree';
        const tTypeBadge = tIsCls
          ? `<span class="sk-badge">${t.isSubclass ? 'SUBCLASSE' : 'CLASSE'}</span>`
          : '';
        return `
          <button type="button" role="option" aria-selected="${isSel}" class="sk-dd-item ${isSel ? 'is-selected' : ''}" data-st-modal-select-tree="${escapeHtml(t.id)}">
            <span class="sk-dd-item-main">
              <iconify-icon icon="${tIcon}"></iconify-icon>
              <span class="sk-dd-item-name">${escapeHtml(t.name)}</span>
              ${tTypeBadge}
              ${t.hiddenForPlayers ? '<span class="sk-badge sk-badge-muted">OCULTA</span>' : ''}
              ${searchQ.trim() && matchCount > 0 ? `<span class="sk-badge">${matchCount} encontrado${matchCount !== 1 ? 's' : ''}</span>` : ''}
            </span>
            <span class="sk-dd-item-meta">${prog.spentPoints} pts • ${prog.percent}%</span>
          </button>
        `;
      })
      .join('');
    skSetDropdownOpen(Boolean(state.skillTreeDropdownOpen));

    if (refundTreeBtn) {
      refundTreeBtn.classList.toggle('hidden', !(progress.spentPoints > 0 && activeChar && canEditChar));
    }

    // Nós ordenados + filtrados pela busca
    const allNodes = Array.isArray(activeTree.nodes)
      ? [...activeTree.nodes].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      : [];
    const nodes = allNodes.filter((n) => doesSkillNodeMatchFilter(n, activeChar, searchQ, 'ALL'));

    if (state.skillTreeSelectedNodeId && !allNodes.some((n) => n.id === state.skillTreeSelectedNodeId)) {
      state.skillTreeSelectedNodeId = null;
    }

    const ctx = {
      char: activeChar,
      tree: activeTree,
      canManageTrees,
      searchQ: searchQ.trim(),
      selectedId: state.skillTreeSelectedNodeId,
    };
    const quadsHtml = SK_QUADRANTS.map((q) =>
      skRenderQuadrantHtml(q, nodes.filter((n) => String(n.category || 'TALENTO').toUpperCase() === q.key), ctx)
    ).join('');

    stage.innerHTML = `<svg class="sk-connectors" aria-hidden="true"></svg>${quadsHtml}${skRenderCoreHtml(activeTree, progress, activeChar)}`;

    // Painel de inspeção
    const selNode = allNodes.find((n) => n.id === state.skillTreeSelectedNodeId) || null;
    if (inspector) {
      inspector.innerHTML = selNode ? skRenderInspectorHtml(activeChar, activeTree, selNode, canEditChar, canManageTrees) : '';
      if (!selNode) inspector.classList.add('hidden');
    }

    layoutSkillTreeConnectors();
    positionSkillInspector();
    requestAnimationFrame(() => {
      layoutSkillTreeConnectors();
      positionSkillInspector();
    });
  }

  function handleRefundWholeSkillTree(charId, treeId) {
    const char = state.characters.find((c) => c.id === charId);
    const tree = findProgressionContainerById(treeId);
    if (!char || !tree) return;
    if (!canEditCharacter(char)) {
      showToast('Você só pode reembolsar a árvore do seu próprio personagem!', 'warning');
      return;
    }
    const prog = computeSkillTreeProgress(char, tree);
    if (prog.spentPoints <= 0) return;

    openConfirmModal({
      icon: '<iconify-icon icon="game-icons:cycle"></iconify-icon>',
      title: `REEMBOLSAR "${tree.name.toUpperCase()}"?`,
      message: `Todos os ${prog.spentPoints} ponto(s) investidos em "${tree.name}" serão devolvidos a ${char.name} e as habilidades voltarão a ficar bloqueadas.`,
      confirmText: '<iconify-icon icon="game-icons:cycle"></iconify-icon> <span>Reembolsar Pontos</span>',
      onConfirm: () => {
        commitMutation(
          (st, toasts) => {
            const c = st.characters.find((x) => x.id === charId);
            const tr = findProgressionContainerById(treeId, st);
            if (!c || !tr || !c.skillTreeProgress) return false;
            const res = refundAndResetContainerNodes(c, tr);
            if (res.refundedPoints <= 0) return false;
            recalculateCharacterDerived(c);
            c.hp = Math.min(c.hp, c.maxHp);
            c.armor = Math.min(c.armor, c.maxArmor);
            c.mana = Math.min(c.mana, c.maxMana);
            toasts.push(`↩️ "${tr.name}" reembolsada (+${res.refundedPoints} pts) para ${c.name}.`);
            return true;
          },
          {
            actionType: 'SKILL_TREE_REFUND_ALL',
            targetEntity: `${char.name} -> ${tree.name}`,
            summary: `Reembolso completo de "${tree.name}".`,
          }
        );
      },
    });
  }

  function handleSkillNodePurchaseOrUpgrade(charId, treeId, nodeId) {
    const char = state.characters.find((c) => c.id === charId);
    const tree = findProgressionContainerById(treeId);
    const node = (tree?.nodes || []).find((n) => n.id === nodeId);
    if (!char || !tree || !node) return;

    if (!canEditCharacter(char)) {
      showToast('Você só pode adquirir habilidades para o seu próprio personagem!', 'warning');
      return;
    }

    const isCls = isClassContainer(tree);
    if (isCls) {
      const isSub = Boolean(tree.isSubclass);
      if (isSub && Number(char.level || 1) < 15) {
        showToast('Subclasses exigem Nível 15 ou superior!', 'warning');
        return;
      }
      const equipped = isSub ? char.subclassId === tree.id : char.classId === tree.id;
      if (!equipped) {
        showToast(`Selecione "${tree.name}" como sua ${isSub ? 'Subclasse' : 'Classe'} na ficha antes de liberar nós nela!`, 'warning');
        return;
      }
    }

    commitMutation(
      (st, toasts) => {
        const c = st.characters.find((x) => x.id === charId);
        const tr = findProgressionContainerById(treeId, st);
        const nd = (tr?.nodes || []).find((x) => x.id === nodeId);
        if (!c || !tr || !nd) return false;

        if (!c.skillTreeProgress || typeof c.skillTreeProgress !== 'object') {
          c.skillTreeProgress = {};
        }

        const trIsCls = isClassContainer(tr, st);
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
            const isPassiveNode = String(nd.category || '').toUpperCase() === 'PASSIVA';
            const currentActivePassives = isPassiveNode ? countCharacterActiveTreePassives(c) : 0;
            const shouldEnableInitial = !(isPassiveNode && currentActivePassives >= MAX_ACTIVE_TREE_PASSIVES);
            c.skillPoints = Math.max(0, availPts - ns.unlockCost);
            c.skillTreeProgress[nd.id] = {
              unlocked: true,
              upgrades: 0,
              enabled: shouldEnableInitial,
              active: shouldEnableInitial,
            };
            if (isPassiveNode && !shouldEnableInitial) {
              toasts.push(
                `🔓 Passiva "${nd.name}" desbloqueada como INATIVA para ${c.name} (limite de 3/3 Passivas Ativas já atingido).`
              );
            } else {
              toasts.push(`🔓 Habilidade "${nd.name}" liberada para ${c.name}!`);
            }
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
        if (!trIsCls && !wasCompleteBefore && isCompleteNow) {
          toasts.push(`👑 Árvore "${tr.name}" 100% COMPLETA! Bônus de conclusão ativado em dourado na ficha de ${c.name}!`);
        }
        return true;
      },
      {
        actionType: 'SKILL_TREE_BUY',
        targetEntity: `${char.name} -> ${node.name}`,
        summary: `Aquisição/Melhoria do nó "${node.name}" em "${tree.name}".`,
      }
    );
  }

  function handleSkillNodeRefund(charId, treeId, nodeId) {
    const char = state.characters.find((c) => c.id === charId);
    const tree = findProgressionContainerById(treeId);
    const node = (tree?.nodes || []).find((n) => n.id === nodeId);
    if (!char || !tree || !node) return;

    if (!canEditCharacter(char)) {
      showToast('Você só pode reembolsar habilidades do seu próprio personagem!', 'warning');
      return;
    }

    commitMutation(
      (st, toasts) => {
        const c = st.characters.find((x) => x.id === charId);
        const tr = findProgressionContainerById(treeId, st);
        const nd = (tr?.nodes || []).find((x) => x.id === nodeId);
        if (!c || !tr || !nd) return false;
        if (!c.skillTreeProgress || typeof c.skillTreeProgress !== 'object') return false;

        const trIsCls = isClassContainer(tr, st);
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
        if (!trIsCls && wasCompleteBefore && !isCompleteNow) {
          toasts.push(`⚠️ Árvore "${tr.name}" caiu abaixo de 100%. O Efeito de Árvore Completa foi desativado.`);
        }
        return true;
      },
      {
        actionType: 'SKILL_TREE_REFUND',
        targetEntity: `${char.name} -> ${node.name}`,
        summary: `Reembolso no nó "${node.name}" de "${tree.name}".`,
      }
    );
  }

  function handleSkillNodeToggleEnabled(charId, nodeId, enabled) {
    const char = state.characters.find((c) => c.id === charId);
    if (!char || !canEditCharacter(char)) {
      showToast('Sem permissão para alterar habilidades deste personagem.', 'warning');
      renderAll();
      return;
    }

    let targetNode = null;
    for (const tr of [...(state.classes || []), ...(state.skillTrees || [])]) {
      const found = (tr?.nodes || []).find((n) => n && n.id === nodeId);
      if (found) {
        targetNode = found;
        break;
      }
    }

    const isPassive = String(targetNode?.category || '').toUpperCase() === 'PASSIVA';
    const curNodeState = targetNode ? getCharacterSkillNodeState(char, targetNode) : null;
    if (
      Boolean(enabled) &&
      isPassive &&
      (!curNodeState || !curNodeState.enabled) &&
      countCharacterActiveTreePassives(char) >= MAX_ACTIVE_TREE_PASSIVES
    ) {
      showToast(
        'Limite atingido: Cada ficha só pode manter até 3 Passivas de Árvores/Classes ativas ao mesmo tempo (3/3). Desative uma passiva antes de ativar outra.',
        'warning'
      );
      renderAll();
      return;
    }

    commitMutation(
      (st, toasts) => {
        const c = st.characters.find((x) => x.id === charId);
        if (!c || !c.skillTreeProgress || !c.skillTreeProgress[nodeId]) return false;
        if (Boolean(enabled) && isPassive) {
          const alreadyEnabled = c.skillTreeProgress[nodeId].enabled !== false;
          if (!alreadyEnabled && countCharacterActiveTreePassives(c) >= MAX_ACTIVE_TREE_PASSIVES) {
            showToast(
              'Limite atingido: Cada ficha só pode manter até 3 Passivas de Árvores/Classes ativas ao mesmo tempo (3/3). Desative uma passiva antes de ativar outra.',
              'warning'
            );
            return false;
          }
        }
        c.skillTreeProgress[nodeId].enabled = Boolean(enabled);
        c.skillTreeProgress[nodeId].active = Boolean(enabled);
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
        summary: `Habilidade ${enabled ? 'ativada' : 'desativada'}.`,
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
    if (!canManageSkillTrees()) {
      showToast('Você não tem permissão para carregar templates de Árvore de Habilidades!', 'warning');
      return;
    }
    commitMutation(
      (st, toasts) => {
        if (!Array.isArray(st.skillTrees)) st.skillTrees = [];
        const tpl = buildGeomanciaSkillTreeTemplate();
        const existingIdx = st.skillTrees.findIndex(
          (t) =>
            t.id === 'tree_geomancia' ||
            t.id === 'tree_geomancia_exemplo' ||
            String(t.name || '').toLowerCase() === 'geomancia'
        );
        if (existingIdx >= 0) {
          tpl.id = 'tree_geomancia_exemplo';
          st.skillTrees[existingIdx] = tpl;
          state.activeSkillTreeId = tpl.id;
          toasts.push('🪨 Árvore de Exemplo "Geomancia" restaurada/atualizada com sucesso!');
        } else {
          tpl.id = 'tree_geomancia_exemplo';
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
        ${renderCustomModifierDropdownHtml(currentTarget, 'data-st-comp-target', 'w-full')}
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

  function openSkillTreeFormModal(treeId = null, forceClassMode = null) {
    if (!canManageSkillTrees()) {
      showToast('Você não tem permissão para configurar Árvores ou Classes!', 'warning');
      return;
    }
    const existing = treeId ? findProgressionContainerById(treeId) : null;
    const isClassMode =
      forceClassMode !== null
        ? Boolean(forceClassMode)
        : existing
        ? isClassContainer(existing)
        : state.hostProgressionSubTab === 'CLASSES';

    document.getElementById('st-form-id').value = existing ? existing.id : '';
    const isClsInput = document.getElementById('st-form-is-class-mode');
    if (isClsInput) isClsInput.value = isClassMode ? 'true' : 'false';

    document.getElementById('skill-tree-form-modal-title').textContent = existing
      ? `Editar ${isClassMode ? (existing.isSubclass ? 'Subclasse' : 'Classe') : 'Árvore'}: ${existing.name}`
      : isClassMode
      ? 'Nova Classe / Subclasse'
      : 'Nova Árvore de Habilidades';

    const nameLabel = document.getElementById('st-form-name-label');
    if (nameLabel) nameLabel.textContent = isClassMode ? 'Nome da Classe / Subclasse' : 'Nome da Árvore';
    const hiddenLabel = document.getElementById('st-form-hidden-label');
    if (hiddenLabel) hiddenLabel.textContent = isClassMode ? 'Ocultar Classe para Jogadores' : 'Ocultar Árvore para Jogadores';
    const descLabel = document.getElementById('st-form-desc-label');
    if (descLabel) descLabel.textContent = isClassMode ? 'Descrição / Tema da Classe' : 'Descrição / Tema da Árvore';

    const subWrap = document.getElementById('st-form-subclass-wrap');
    const subCheck = document.getElementById('st-form-is-subclass');
    if (subWrap) subWrap.classList.toggle('hidden', !isClassMode);
    if (subCheck) subCheck.checked = Boolean(existing?.isSubclass);

    const coreTitle = document.getElementById('st-form-core-title');
    const coreSubtitle = document.getElementById('st-form-core-subtitle');
    const coreBtnLabel = document.getElementById('st-form-core-btn-label');
    const coreDescLabel = document.getElementById('st-form-core-desc-label');
    const coreModsLabel = document.getElementById('st-form-core-mods-label');
    if (coreTitle) {
      coreTitle.textContent = isClassMode ? 'EFEITO DE CLASSE / SUBCLASSE' : 'EFEITO DE ÁRVORE COMPLETA (100%)';
    }
    if (coreSubtitle) {
      coreSubtitle.textContent = isClassMode
        ? 'Aplicado automaticamente na ficha assim que o personagem escolhe esta Classe ou Subclasse (não precisa completar 100% dos nós).'
        : 'Ativado automaticamente em dourado quando o personagem adquirir 100% de todos os nós e todas as melhorias desta árvore.';
    }
    if (coreBtnLabel) {
      coreBtnLabel.textContent = isClassMode ? '＋ Modificador de Classe' : '＋ Efeito se Completa';
    }
    if (coreDescLabel) {
      coreDescLabel.textContent = isClassMode
        ? 'Descrição Textual do Efeito de Classe / Subclasse (Opcional)'
        : 'Descrição Textual do Bônus de 100% (Opcional)';
    }
    if (coreModsLabel) {
      coreModsLabel.textContent = isClassMode ? 'EFEITOS DE CLASSE (FLAT / %)' : 'EFEITOS SE COMPLETA (FLAT / %)';
    }

    const delLabel = document.getElementById('btn-delete-skill-tree-label');
    const saveLabel = document.getElementById('btn-save-skill-tree-label');
    if (delLabel) delLabel.textContent = isClassMode ? 'Excluir Classe' : 'Excluir Árvore';
    if (saveLabel) saveLabel.textContent = isClassMode ? 'Salvar Classe' : 'Salvar Árvore';

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
    if (!canManageSkillTrees()) return;

    const treeId = document.getElementById('st-form-id')?.value.trim();
    const isClassMode = document.getElementById('st-form-is-class-mode')?.value === 'true';
    const isSubclass = isClassMode && Boolean(document.getElementById('st-form-is-subclass')?.checked);
    const name =
      document.getElementById('st-form-name')?.value.trim() ||
      (isClassMode ? 'Classe Sem Nome' : 'Árvore Sem Nome');
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
        if (!Array.isArray(st.classes)) st.classes = [];
        const collection = isClassMode ? st.classes : st.skillTrees;
        const label = isClassMode ? (isSubclass ? 'Subclasse' : 'Classe') : 'Árvore';

        if (treeId) {
          const target = findProgressionContainerById(treeId, st);
          if (!target) return false;
          target.name = name;
          target.description = description;
          target.hiddenForPlayers = hiddenForPlayers;
          if (isClassContainer(target, st)) {
            target.isClassEntity = true;
            target.isSubclass = isSubclass;
          }
          target.completionDescription = completionDescription;
          target.completionEffects = completionEffects;
          toasts.push(`${label} "${name}" atualizada!`);
        } else {
          const prefix = isClassMode ? 'class' : 'tree';
          const newEntry = {
            id: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name,
            description,
            hiddenForPlayers,
            isClassEntity: isClassMode,
            isSubclass: isClassMode ? isSubclass : false,
            completionDescription,
            completionEffects,
            nodes: [],
          };
          collection.push(newEntry);
          state.activeSkillTreeId = newEntry.id;
          toasts.push(`${label} "${name}" criada com sucesso!`);
        }
        for (const c of st.characters || []) {
          recalculateCharacterDerived(c);
        }
        return true;
      },
      {
        actionType: treeId
          ? isClassMode
            ? 'CLASS_UPDATE'
            : 'SKILL_TREE_UPDATE'
          : isClassMode
          ? 'CLASS_CREATE'
          : 'SKILL_TREE_CREATE',
        targetEntity: `${isClassMode ? 'Classe' : 'Árvore'}: ${name}`,
        summary: `${isClassMode ? 'Classe/Subclasse' : 'Árvore de Habilidades'} "${name}" salva.`,
      }
    );

    closeModal('modal-skill-tree-form');
  }

  function deleteSkillTree(treeId) {
    if (!canManageSkillTrees()) return;
    const tree = findProgressionContainerById(treeId);
    if (!tree) return;
    const isCls = isClassContainer(tree);

    commitMutation(
      (st, toasts) => {
        if (isCls) {
          st.classes = (st.classes || []).filter((c) => c.id !== treeId);
          for (const ch of st.characters || []) {
            if (ch.classId === treeId) ch.classId = null;
            if (ch.subclassId === treeId) ch.subclassId = null;
          }
        } else {
          st.skillTrees = (st.skillTrees || []).filter((t) => t.id !== treeId);
        }
        if (state.activeSkillTreeId === treeId) {
          const list = isCls ? st.classes : st.skillTrees;
          state.activeSkillTreeId = list[0]?.id || st.skillTrees[0]?.id || st.classes[0]?.id || null;
        }
        for (const c of st.characters || []) {
          recalculateCharacterDerived(c);
        }
        toasts.push(`${isCls ? 'Classe' : 'Árvore'} "${tree.name}" removida.`);
        return true;
      },
      {
        actionType: isCls ? 'CLASS_DELETE' : 'SKILL_TREE_DELETE',
        targetEntity: `${isCls ? 'Classe' : 'Árvore'}: ${tree.name}`,
        summary: `${isCls ? 'Classe' : 'Árvore'} "${tree.name}" excluída.`,
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
        ${renderCustomModifierDropdownHtml(currentTarget, 'data-sn-eff-target', 'w-full')}
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
    const isSupreme = cat === 'SUPREMA';

    document.getElementById('sn-talent-ranks-section')?.classList.toggle('hidden', !isTalent);
    document.getElementById('sn-unlock-upgrades-section')?.classList.toggle('hidden', isTalent);
    document.getElementById('sn-combat-metadata-section')?.classList.toggle('hidden', !isActiveOrSupreme);
    document.getElementById('sn-charges-field-wrap')?.classList.toggle('hidden', !isSupreme);

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
    if (!canManageSkillTrees()) {
      showToast('Você não tem permissão para criar ou editar nós!', 'warning');
      return;
    }
    const tree = findProgressionContainerById(treeId);
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
    if (document.getElementById('sn-form-charges')) {
      document.getElementById('sn-form-charges').value = existing ? existing.charges || '' : '';
    }

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
    if (!canManageSkillTrees()) return;

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
    const charges = category === 'SUPREMA' ? document.getElementById('sn-form-charges')?.value.trim() || '' : '';

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
        const tree = findProgressionContainerById(treeId, st);
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
          charges,
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
          toasts.push(`Nó "${name}" adicionado em ${tree.name}!`);
        }

        for (const c of st.characters || []) {
          recalculateCharacterDerived(c);
        }
        return true;
      },
      {
        actionType: nodeId ? 'SKILL_NODE_UPDATE' : 'SKILL_NODE_CREATE',
        targetEntity: `${name} (${category})`,
        summary: `Nó "${name}" salvo.`,
      }
    );

    closeModal('modal-skill-node-form');
  }

  function deleteSkillNode(treeId, nodeId) {
    if (!canManageSkillTrees()) return;
    const tree = findProgressionContainerById(treeId);
    const node = (tree?.nodes || []).find((n) => n.id === nodeId);
    if (!tree || !node) return;

    commitMutation(
      (st, toasts) => {
        const tr = findProgressionContainerById(treeId, st);
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
        summary: `Nó "${node.name}" excluído de "${tree.name}".`,
      }
    );
    closeModal('modal-skill-node-form');
  }

  function reorderSkillTreeNodes(treeId, draggedNodeId, targetNodeId) {
    if (!canManageSkillTrees() || !draggedNodeId || !targetNodeId || draggedNodeId === targetNodeId) return;
    commitMutation(
      (st) => {
        const tree = findProgressionContainerById(treeId, st);
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
        targetEntity: `ID: ${treeId}`,
        summary: 'Reordenação visual de nós.',
      }
    );
  }

  function duplicateSkillTree(treeId) {
    if (!canManageSkillTrees()) {
      showToast('Você não tem permissão para duplicar Árvores ou Classes!', 'warning');
      return;
    }
    const origTree = findProgressionContainerById(treeId);
    if (!origTree) return;
    const isCls = isClassContainer(origTree);
    const label = isCls ? (origTree.isSubclass ? 'Subclasse' : 'Classe') : 'Árvore';

    const clonedTreeName = `${origTree.name || `${label} Sem Nome`} (Cópia)`;

    commitMutation(
      (st, toasts) => {
        if (!Array.isArray(st.skillTrees)) st.skillTrees = [];
        if (!Array.isArray(st.classes)) st.classes = [];
        const src = findProgressionContainerById(treeId, st);
        if (!src) return false;
        const srcIsCls = isClassContainer(src, st);
        const collection = srcIsCls ? st.classes : st.skillTrees;

        // Cópia profunda (Deep Clone) da árvore/classe inteira
        const cloned = JSON.parse(JSON.stringify(src));
        const now = Date.now();
        cloned.id = `${srcIsCls ? 'class' : 'tree'}_${now}_${Math.random().toString(36).slice(2, 6)}`;
        cloned.name = `${src.name || `${label} Sem Nome`} (Cópia)`;

        // Regenera IDs únicos para TODOS os nós dentro da árvore/classe clonada (100% independente)
        if (Array.isArray(cloned.nodes)) {
          cloned.nodes = cloned.nodes.map((nd, idx) => ({
            ...nd,
            id: `node_${now}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            order: idx,
          }));
        } else {
          cloned.nodes = [];
        }

        collection.push(cloned);
        state.activeSkillTreeId = cloned.id;
        toasts.push(
          `📋 ${label} "${src.name}" duplicada como "${cloned.name}" com ${cloned.nodes.length} nó(s) independentes!`
        );
        return true;
      },
      {
        actionType: isCls ? 'CLASS_CLONE' : 'SKILL_TREE_CLONE',
        targetEntity: `${label}: ${clonedTreeName}`,
        summary: `${label} "${origTree.name}" clonada como "${clonedTreeName}" com ${(origTree.nodes || []).length} nó(s) e novos IDs únicos.`,
      }
    );
  }

  function duplicateSkillNode(treeId, nodeId) {
    if (!canManageSkillTrees()) {
      showToast('Você não tem permissão para duplicar nós!', 'warning');
      return;
    }
    const tree = findProgressionContainerById(treeId);
    const origNode = (tree?.nodes || []).find((n) => n.id === nodeId);
    if (!tree || !origNode) return;

    const clonedNodeName = `${origNode.name || 'Habilidade Sem Nome'} (Cópia)`;

    commitMutation(
      (st, toasts) => {
        const tr = findProgressionContainerById(treeId, st);
        if (!tr || !Array.isArray(tr.nodes)) return false;
        const srcIdx = tr.nodes.findIndex((n) => n.id === nodeId);
        if (srcIdx < 0) return false;

        const srcNode = tr.nodes[srcIdx];
        const clonedNode = JSON.parse(JSON.stringify(srcNode));
        clonedNode.id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        clonedNode.name = `${srcNode.name || 'Habilidade Sem Nome'} (Cópia)`;

        tr.nodes.splice(srcIdx + 1, 0, clonedNode);
        tr.nodes.forEach((n, idx) => {
          n.order = idx;
        });

        toasts.push(`📋 Nó "${srcNode.name}" duplicado como "${clonedNode.name}" em ${tr.name}!`);
        return true;
      },
      {
        actionType: 'SKILL_NODE_CLONE',
        targetEntity: `${clonedNodeName} (${tree.name})`,
        summary: `Nó "${origNode.name}" duplicado como "${clonedNodeName}" em "${tree.name}".`,
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Modal 23: Criar / Editar Raças Base e Sub-raças (state.races)
  // ---------------------------------------------------------------------------
  function createRaceEffectRowElement(mod = {}) {
    const row = document.createElement('div');
    row.className = 'race-effect-row grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded-lg bg-black/40 border app-divider-border';
    const currentTarget = mod.targetStat || 'FORCA';
    const currentType = mod.modifierType || 'FLAT';
    const currentVal = mod.value ?? 1;

    row.innerHTML = `
      <div class="sm:col-span-6">
        ${renderCustomModifierDropdownHtml(currentTarget, 'data-race-eff-target', 'w-full')}
      </div>
      <div class="sm:col-span-3">
        <select data-race-eff-type class="w-full px-2.5 py-1.5 text-xs font-mono font-bold app-input">
          <option value="FLAT" ${currentType === 'FLAT' ? 'selected' : ''}>FLAT (+ / -)</option>
          <option value="PERCENT" ${currentType === 'PERCENT' ? 'selected' : ''}>PORCENTAGEM (%)</option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <input type="number" step="any" data-race-eff-val value="${currentVal}" class="w-full px-2.5 py-1.5 text-xs font-mono font-black app-input text-center" />
      </div>
      <div class="sm:col-span-1 flex justify-end">
        <button type="button" data-remove-race-effect class="w-7 h-7 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center text-xs" title="Remover Modificador">✕</button>
      </div>
    `;
    row.querySelector('[data-remove-race-effect]')?.addEventListener('click', () => row.remove());
    return row;
  }

  function syncRaceFormTypeUI(preferredParentId = null) {
    const typeVal = document.getElementById('race-form-type')?.value || 'BASE';
    const isSubrace = typeVal === 'SUBRACE';
    const parentWrap = document.getElementById('race-form-parent-wrap');
    const parentSelect = document.getElementById('race-form-parent-id');
    const editingId = document.getElementById('race-form-id')?.value.trim();

    if (parentWrap) parentWrap.classList.toggle('hidden', !isSubrace);
    if (parentSelect) {
      const races = Array.isArray(state.races) && state.races.length > 0 ? state.races : buildDefaultRacesTemplate();
      const baseRaces = races.filter((r) => r && !r.isSubrace && r.id !== editingId);
      const curParent = preferredParentId !== null ? preferredParentId : parentSelect.value;
      parentSelect.innerHTML =
        baseRaces
          .map(
            (br) =>
              `<option value="${escapeHtml(br.id)}" ${br.id === curParent ? 'selected' : ''}>${escapeHtml(br.name)}</option>`
          )
          .join('') || `<option value="">Nenhuma Raça Base disponível</option>`;
    }
  }

  function openRaceFormModal(raceId = null, defaultParentRaceId = null) {
    if (!canManageSkillTrees()) {
      showToast('Você não tem permissão para criar ou editar Raças e Sub-raças!', 'warning');
      return;
    }
    const races = Array.isArray(state.races) && state.races.length > 0 ? state.races : buildDefaultRacesTemplate();
    const existing = raceId ? races.find((r) => r && r.id === raceId) : null;
    const isSubrace = existing ? Boolean(existing.isSubrace) : Boolean(defaultParentRaceId);

    document.getElementById('race-form-id').value = existing ? existing.id : '';
    document.getElementById('race-form-modal-title').textContent = existing
      ? `Editar ${existing.isSubrace ? 'Sub-raça' : 'Raça Base'}: ${existing.name}`
      : isSubrace
      ? 'Nova Sub-raça'
      : 'Nova Raça Base';

    document.getElementById('race-form-name').value = existing ? existing.name || '' : '';
    document.getElementById('race-form-type').value = isSubrace ? 'SUBRACE' : 'BASE';
    document.getElementById('race-form-bonus-pts').value = String(existing?.bonusSkillPoints ?? 0);
    document.getElementById('race-form-desc').value = existing ? existing.description || '' : '';

    syncRaceFormTypeUI(existing ? existing.parentRaceId || '' : defaultParentRaceId || '');

    const listEl = document.getElementById('race-effects-list');
    if (listEl) {
      listEl.innerHTML = '';
      const effs = Array.isArray(existing?.effects) ? existing.effects : [];
      effs.forEach((ef) => listEl.appendChild(createRaceEffectRowElement(ef)));
    }

    document.getElementById('btn-delete-race')?.classList.toggle('hidden', !existing);
    openModal('modal-race-form');
  }

  function handleRaceFormSubmit(e) {
    e.preventDefault();
    if (!canManageSkillTrees()) return;

    const raceId = document.getElementById('race-form-id')?.value.trim();
    const name = document.getElementById('race-form-name')?.value.trim() || 'Raça Sem Nome';
    const isSubrace = document.getElementById('race-form-type')?.value === 'SUBRACE';
    const parentRaceId = isSubrace ? document.getElementById('race-form-parent-id')?.value.trim() || null : null;
    const bonusSkillPoints = Math.max(0, Math.round(Number(document.getElementById('race-form-bonus-pts')?.value || 0)));
    const description = document.getElementById('race-form-desc')?.value.trim() || '';

    if (isSubrace && !parentRaceId) {
      showToast('Selecione uma Raça Base pai para esta Sub-raça!', 'warning');
      return;
    }

    const effects = [];
    document.querySelectorAll('#race-effects-list .race-effect-row').forEach((row) => {
      const targetStat = row.querySelector('[data-race-eff-target]')?.value;
      const modifierType = row.querySelector('[data-race-eff-type]')?.value || 'FLAT';
      const valRaw = Number(row.querySelector('[data-race-eff-val]')?.value || 0);
      if (targetStat && Number.isFinite(valRaw) && valRaw !== 0) {
        effects.push({ targetStat, modifierType, value: valRaw });
      }
    });

    commitMutation(
      (st, toasts) => {
        if (!Array.isArray(st.races) || st.races.length === 0) {
          st.races = buildDefaultRacesTemplate();
        }
        const payload = {
          id: raceId || `race_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name,
          isSubrace,
          parentRaceId,
          bonusSkillPoints,
          description,
          effects,
        };
        if (raceId) {
          const idx = st.races.findIndex((r) => r && r.id === raceId);
          if (idx >= 0) st.races[idx] = payload;
          else st.races.push(payload);
          toasts.push(`${isSubrace ? 'Sub-raça' : 'Raça'} "${name}" atualizada!`);
        } else {
          st.races.push(payload);
          toasts.push(`${isSubrace ? 'Sub-raça' : 'Raça'} "${name}" criada com sucesso!`);
        }
        for (const c of st.characters || []) {
          recalculateCharacterDerived(c);
        }
        return true;
      },
      {
        actionType: raceId ? 'RACE_UPDATE' : 'RACE_CREATE',
        targetEntity: `${isSubrace ? 'Sub-raça' : 'Raça'}: ${name}`,
        summary: `${isSubrace ? 'Sub-raça' : 'Raça Base'} "${name}" salva.`,
      }
    );

    closeModal('modal-race-form');
  }

  function deleteRace(raceId) {
    if (!canManageSkillTrees()) return;
    const races = Array.isArray(state.races) ? state.races : [];
    const target = races.find((r) => r && r.id === raceId);
    if (!target) return;

    commitMutation(
      (st, toasts) => {
        st.races = (st.races || []).filter((r) => r && r.id !== raceId && r.parentRaceId !== raceId);
        for (const c of st.characters || []) {
          if (c.raceId === raceId) {
            c.raceId = null;
            c.subraceId = null;
          } else if (c.subraceId === raceId) {
            c.subraceId = null;
          }
          recalculateCharacterDerived(c);
        }
        toasts.push(`${target.isSubrace ? 'Sub-raça' : 'Raça'} "${target.name}" removida.`);
        return true;
      },
      {
        actionType: 'RACE_DELETE',
        targetEntity: `Raça: ${target.name}`,
        summary: `Raça/Sub-raça "${target.name}" excluída.`,
      }
    );
    closeModal('modal-race-form');
  }




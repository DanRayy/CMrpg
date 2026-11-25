# Design System & Catálogo Visual Completo — CMrpg

Este documento é o **catálogo visual definitivo e exaustivo** de toda a interface do **CMrpg**, auditado linha por linha a partir de `static/index.html`, `static/styles.css` e dos módulos `static/js/01-core-state.js` a `static/js/06-events-init.js` (incluindo `05b-mesa-board.js`).

> **Identidade Visual:** Superfícies sólidas e foscas em **carvão profundo** combinadas com acentos em **ouro mate envelhecido**, tipografia clássica serifada para cabeçalhos e leitura monoespaçada para métricas de jogo.

---

## 1. Fundamentos Visuais, Tokens CSS e Regras Globais

### 1.1 Diretriz Fosca (Anti-Glow & Bloqueio de Estilos Nativos)
Toda a interface segue rigorosamente o padrão **escuro fosco de alto contraste**:
1. **Superfícies Sólidas e Foscas:** fundos utilizam tons opacos de carvão (`#0a0908` a `#241f19` e `#12100d` / `#181512`) separados por bordas finas (`1px`) em bege translúcido ou ouro mate, sem superfícies cintilantes.
2. **Proibição de Efeitos Luminosos (Anti-Glow / Anti-Neon):**
   - **Zero `text-shadow` brilhante** em textos, badges, botões, menus e títulos.
   - **Zero `box-shadow` luminoso/glow** em cards, controles, estados de overflow ou seleções ativas: classes como `.stat-overflow-glow`, `.card-active-turn`, `.action-pill-notes`, `.fantasy-dropdown-*` e toda a suíte radial `.sk-*` forçam `box-shadow: none` / `text-shadow: none` e comunicam estado apenas via cor de borda sólida e contraste tonal.
   - Sombras permitidas são exclusivamente **sombras de elevação pretas** (`rgba(0, 0, 0, 0.4–0.95)`) para profundidade de camadas (modais, dropdowns e cards sobre a Mesa).
3. **Bloqueio de Estilos Nativos do Navegador:**
   - **Foco sem azul nativo:** `.app-input:focus`, `.fantasy-dropdown-trigger:focus-visible` e botões desabilitam `outline` azul padrão do navegador (`outline: none`), aplicando borda em ouro mate (`var(--gold-primary)` ou `#c8aa6e99`).
   - **Inputs numéricos limpos:** o padrão visual para campos numéricos compactos (`QTD`, `Valor no NPC`, Point Buy, custos e modificadores) rejeita setas de spin intrusivas (`::-webkit-inner-spin-button`, `::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }` e `-moz-appearance: textfield`), mantendo números limpos em `JetBrains Mono`.
   - **Selects estilizados:** nunca exibir dropdown padrão claro do sistema operacional; usar `.app-input` com fundo `#0d0b09` ou o componente customizado fosco `.fantasy-dropdown-wrapper` / `.sk-dd`.
4. **Única Exceção Controlada:** o efeito contínuo **RGB Chroma** (`.cursor-master-rgb`, keyframes `rgb-smooth-*` em ciclo linear de `6s`) é restrito **exclusivamente** ao cursor colaborativo e indicadores de presença do **Mestre (Host)**.

### 1.2 Paleta Completa de Cores (`:root` e Tokens de Componentes)

#### A. Fundos e Superfícies
| Token / Classe | Valor Exato | Onde é Aplicado |
| :--- | :--- | :--- |
| `--bg-obsidian` | `#0a0908` | Fundo de maior profundidade, trilha da scrollbar e viewport da Mesa (`.mesa-viewport`) |
| `--bg-sidebar` | `#0e0c0a` | Sidebar esquerda (`.app-sidebar`), sidebar de batalha direita (`.battle-sidebar`), dock tab e cabeçalhos de modais (`.app-modal-header`) |
| `--bg-main` | `#110f0c` | Fundo principal do `<body>` |
| Carvão Fosco Base | `#12100d` | Painéis modernos (`modal-preferences`, `modal-purchase-proposals`, `modal-create-proposal`, `modal-subclass-inheritance`), `.fantasy-dropdown-trigger`, `.fantasy-dropdown-menu`, `.sk-shell`, `.sk-wrap`, `.sk-stage`, `.sk-chip`, `.sk-mod`, `.sk-toggle-row` |
| Cabeçalho Radial | `#14110e` | `.sk-header` no topo do modal de Árvore de Habilidades |
| `--bg-card` | `#171410` | Superfície padrão de `.fantasy-card`, `.char-card`, `.modal-panel` e `.topbar-wallet-pill` |
| Painéis Internos Radial | `#181512` | `.sk-title-icon`, `.sk-dd-trigger`, `.sk-dd-menu`, `.sk-pill`, `.sk-btn`, `.sk-core-effect`, `.sk-inspector`, `.sk-tooltip` |
| `--bg-card-elevated` | `#1e1a15` | Hover de `.topbar-wallet-pill` e elevações intermediárias |
| `--bg-card-hover` | `#241f19` | Hover de superfícies elevadas |
| `--bg-input` | `#0d0b09` | Campos `.app-input` e linhas `.resistance-row` |
| `--bg-pill` | `#211c16` | Botões neutros (`.app-secondary-btn`, `.app-icon-btn`, `.action-pill`, `.attr-op-btn`, `.res-op-btn`) |
| `--bg-pill-hover` | `#2c251d` | Hover de botões neutros e action pills |
| `--bar-track` | `#090807` | Fundo de trilha das barras de progresso (`.stat-bar-track`) |
| Fundo Editor de Notas | `#0c0d12` | Área `contenteditable` (`#notes-content-editor`) e aba ativa `.notes-tab-btn-active` |
| Topbar Translúcida | `rgba(14, 12, 10, 0.88)` | `.app-topbar` com `backdrop-filter: blur(10px)` |
| Backdrop de Modais | `rgba(5, 4, 3, 0.78)` | `.modal-backdrop` com `backdrop-filter: blur(6px)` (`bg-black/80` em modais mais recentes, `bg-black/90` em `modal-image-viewer`) |
| Superfície do Cropper | `#2b2d31` / `#1e1f22` / `#232428` | Exclusivo do `modal-image-cropper` (painel, palco do canvas e rodapé neutro para julgamento fiel de cor de fotos) |

#### B. Ouro Mate, Bordas e Textos
| Token / Uso | Valor Exato | Aplicação |
| :--- | :--- | :--- |
| `--gold-primary` | `#d4a853` | `.gold-title`, borda de foco `.app-input:focus`, barra lateral ativa da sidebar, borda `.stat-overflow-glow` |
| `--gold-bright` | `#f0c674` | Hover de `.app-icon-btn`, texto de `.btn-gold-outline`, borda de `.btn-gold`, anel de avatar de heróis |
| Ouro Mate Radial | `#c8aa6e` | Acentos, conectores SVG, anel central `.sk-ring-progress`, botões `.sk-btn-gold`/`.sk-act-btn` e chevrons de `.fantasy-dropdown-*` |
| Ouro Mate Hover | `#d4b97f` | Hover de `.sk-btn-gold` e `.sk-act-btn` |
| `--gold-muted` | `#9a7836` | Divisores ornamentais `.gold-diamond-divider` |
| `--gold-border` | `rgba(212, 168, 83, 0.22)` | Bordas de cards no hover, banner da sala, modais e badges da sidebar |
| `--gold-border-strong` | `rgba(212, 168, 83, 0.48)` | Bordas de `.btn-gold-outline`, `.topbar-role-pill` e `.mesa-viewport` |
| `--border-subtle` | `rgba(255, 244, 224, 0.08)` | `.app-divider-border`, divisores de tabela, borda padrão de cards |
| `--border-medium` | `rgba(255, 244, 224, 0.14)` | Bordas de `.app-input` e `.app-secondary-btn` |
| `--text-primary` | `#f5efe6` | Textos principais (`.app-title`, valores em inputs e títulos) |
| `--text-secondary` | `#d6cbb9` | Rótulos (`.app-label`) e textos secundários |
| `--text-muted` | `#8c8273` | Subtítulos, breadcrumbs, metadados e textos auxiliares (`.app-muted`) |
| `--shadow-card` | `0 14px 34px -8px rgba(0, 0, 0, 0.72)` | Sombra escura de elevação dos cards e banner |

#### C. Cores Semânticas, Barras Vitais e Estados
| Elemento | Valor / Gradiente | Uso |
| :--- | :--- | :--- |
| Vida (`.stat-bar-hp`) | `linear-gradient(90deg, #b91c1c 0%, #ef4444 65%, #f87171 100%)` | Barra de HP; ícone `.icon-hp`: `#e11d48` |
| Armadura (`.stat-bar-armor`) | `linear-gradient(90deg, #0369a1 0%, #0ea5e9 65%, #7dd3fc 100%)` | Barra de Armadura; ícone `.icon-armor`: `#60a5fa` |
| Mana (`.stat-bar-mana`) | `linear-gradient(90deg, #4338ca 0%, #6366f1 65%, #a855f7 100%)` | Barra de Mana; ícone `.icon-mana`: `#38bdf8` |
| Experiência (`.stat-bar-xp`) | `linear-gradient(90deg, #b45309 0%, #d97706 60%, #fbbf24 100%)` | Mini barra de XP nos cards de heróis |
| Ouro / Dano | `.icon-gold: #fbbf24` / `.icon-dmg: #f97316` | Ícones de moedas e poder ofensivo |
| Carmesim / Combate | `--crimson-bg: rgba(153, 27, 27, 0.22)`, `--crimson-border: rgba(220, 38, 38, 0.45)`, `--crimson-text: #fca5a5` | Botões de combate, dano e alertas destrutivos |
| Ataque / Arcana | `.stat-badge-attack` (`#ef4444` / `rgba(239, 68, 68, 0.12)`) e `.stat-badge-arcana` (`#3b82f6` / `rgba(59, 130, 246, 0.12)`) | Badges táticos nos cards |
| Buffs / Nerfs | `.buff-item-card` (`rgba(6, 78, 59, 0.2)`, borda `rgba(16, 185, 129, 0.35)`, título `#22c55e`) vs `.nerf-item-card` (`rgba(136, 19, 55, 0.2)`, borda `rgba(244, 63, 94, 0.35)`, título `#ef4444`) | Cards de efeitos em `modal-buffs-nerfs` |
| Botão Notas (`.action-pill-notes`) | Fundo `#064e3b`, borda `#059669`, texto `#a7f3d0` (hover `#065f46` / `#10b981` / `#ecfdf5`) | Ação rápida `NOTAS` nos cards |
| Toggle Ativo (`.fantasy-toggle`) | Trilho `rgba(16, 185, 129, 0.35) → rgba(5, 150, 105, 0.5)`, borda `#10b981`, pino `#6ee7b7 → #10b981` | Switches de permissões, preferências, buffs e passivas |

#### D. Os 4 Quadrantes Foscos da Árvore de Habilidades (`modal-skill-tree`)
| Quadrante | Classe | Posição Grid | Fundo (`--q-bg`) | Borda (`--q-border`) | Acento (`--q-accent`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Passivas** | `.sk-quad-passiva` | Superior Esquerdo (`sk-pos-tl`) | `#131b24` | `#2a3f54` | `#8aaccc` |
| **Talentos** | `.sk-quad-talento` | Superior Direito (`sk-pos-tr`) | `#1f1a12` | `#4a3c23` | `#c8aa6e` |
| **Ativas** | `.sk-quad-ativa` | Inferior Esquerdo (`sk-pos-bl`) | `#1b1424` | `#3d2b54` | `#b394d6` |
| **Supremas** | `.sk-quad-suprema` | Inferior Direito (`sk-pos-br`) | `#241315` | `#54282d` | `#d08c93` |

### 1.3 Tipografia e Hierarquia de Fontes

Fontes carregadas via Google Fonts e configuradas no `tailwind.config`:

| Família | Classe / Regra | Pesos Carregados | Escala Típica (`px`/`rem`) e `letter-spacing` | Aplicação |
| :--- | :--- | :--- | :--- | :--- |
| **`Cinzel`** | `.font-serif-fantasy` (`font-serif`) | `600`, `700`, `800`, `900` | Hero: `1.875rem–2.25rem` (`text-3xl`/`4xl`, `tracking-wider`); Títulos de seção/modal: `0.875rem–1.125rem` (`14–18px`, `tracking-wider`); Itens da sidebar: `11px` (`0.08em` uppercase); Quadrantes `.sk-quad-title`: `13px` (`0.08em`); Medalhão `.sk-core-pct`: `28px` (`font-weight: 800`); Badges de cargo: `10px` (`0.06em`) | Nomes de sala, cabeçalhos de seção e modais, navegação lateral, nomes de fichas, botões primários uppercase e rótulos de zonas da Mesa |
| **`Inter`** | Padrão do `body` (`font-sans`) | `400`, `500`, `600`, `700`, `800`, `900` | Corpo padrão: `12px` (`text-xs`) a `14px` (`text-sm`); Labels/descrições: `11px`–`12px` (`leading-relaxed`); Editor de Notas: `14px` (`leading-relaxed`); Micro-legendas: `10px` | Formulários, descrições de itens e habilidades, corpo de modais, toasts, tooltips, botões neutros e listas |
| **`JetBrains Mono`** | `font-mono` | `500`, `700` | Inputs numéricos destacados: `1.25rem` (`text-xl`, `font-black`); Valores de status/IP/preço: `11px`–`14px`; Badges/contadores/tags: `9px`–`11px` | HP/Armadura/Mana/PA, atributos, modificadores (`+3`), custos, pesos (`kg`), preços em ouro, endereços IP, contadores de página e auditoria |

### 1.4 Iconografia Híbrida (`Iconify 2.1.0`)
Regra global em `styles.css`: `iconify-icon { display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; font-size: 1.2em; line-height: 1; flex-shrink: 0; }`.

- **`lucide:*` (Controles Limpos de UI):** usado para controles utilitários de sistema e preferências:
  - `lucide:settings` (botão de Preferências na Topbar e cabeçalho do `modal-preferences`)
  - `lucide:bell` / `lucide:bell-off` (estado das notificações)
  - `lucide:volume-2` (controle de Volume Geral Master)
- **`game-icons:*` (Elementos Temáticos de RPG):** usado na navegação, fichas, combate, itens, economia e bestiário:
  - Navegação: `castle`, `tabletop-players`, `character`, `knapsack`, `shop`, `monster-grasp`, `tied-scroll`, `family-tree`, `cog-lock`, `hamburger-menu`.
  - Status & Combate: `heart-bottle`, `breastplate`, `crystal-bars`, `lightning-branches`, `dragon-shield`, `broadsword`, `gladius`, `crystal-wand`, `crystal-ball`, `crossed-swords`, `crowned-skull`, `pierced-heart`, `arrows-shield`, `fast-forward-button`, `battery-75`.
  - Atributos & Acúmulos: `biceps`, `bow-arrow`, `spell-book`, `owl`, `conversation`, `ice-cube`, `bleeding-wound`, `ifrit`, `poison-bottle`, `knockout`, `round-bottom-flask`.
  - Economia, Origem & Ações: `two-coins`, `coins`, `trade`, `chest`, `scales`, `crown`, `quill-ink`, `magnifying-glass`, `compass`, `expand`, `sparkles`, `weight`, `dna1`, `dna2`, `crested-helmet`, `crowned-heart`, `portal`, `eyeball`, `blindfold`, `trash-can`, `files`, `save`, `check-mark`, `cancel`, `sands-of-time`, `laurel-crown`, `portrait`, `move`, `hand`.
- **SVGs Inline Pontuais:** setas de expandir/recolher do Modo Compacto, chevrons de dropdown (`.fantasy-dropdown-chevron`, `.sk-dd-chevron`), ícone fallback de silhueta de avatar, seta do cursor remoto (`.remote-cursor-svg`) e controles do `modal-image-cropper` (imagens pequena/grande e rotação 90°).

### 1.5 Escala de Camadas (`z-index`)
| Camada | `z-index` | Elementos |
| :--- | :---: | :--- |
| Palco interno da Mesa / Árvore | `1` – `25` | Zonas de batalha (`1`), cantos (`2`), divisória (`3`), tokens (`4`/`10`), inspector radial (`20`), tooltip radial (`25`), HUD hint (`20`), avatares (`25`), toolbar de notas (`30`) |
| Estrutura fixa do Shell | `30` – `50` | Topbar (`z-30`), backdrop mobile / battle sidebar / dock tab / `modal-resistances` (`z-40`), sidebar esquerda (`z-50`), modais padrão (`z-50`), token remoto (`55`), token em arraste (`60`) |
| Sub-modais Empilhados | `60` – `95` | `modal-perm-category` (`60`), `modal-char-inventory` e `modal-notes` (`65`), `modal-skill-detail`, `modal-general-skills`, `modal-save-custom-preset` (`70`), `modal-skill-tree` (`72`), `modal-item-recipient`, `modal-sell-escrow`, `modal-purchase-proposals`, `modal-subclass-inheritance`, `modal-new-note-page` (`75`), `modal-create-proposal`, `modal-confirm`, `modal-skill-tree-form` (`80`), `modal-skill-node-form` (`82`), `modal-race-form` (`84`), `modal-image-cropper` (`95`) |
| Sobreposições Globais | `100` – `9999` | `.fantasy-dropdown-menu` (`100`), `#toast-container` (`120`), `modal-image-viewer` (`150` / botão fechar `155`), `.multiplayer-cursors-layer` / `.remote-cursor` / `.drag-ghost` / popovers de cor do Bloco de Notas (`9999`) |

---

## 2. Catálogo Completo de Controles de Formulário

### 2.1 Inputs de Texto, Busca, `textarea` e Editor Rico
- **Input Padrão (`.app-input`):**
  - Visual: `background-color: #0d0b09`, `color: #f5efe6`, `border: 1px solid rgba(255, 244, 224, 0.14)`, `border-radius: 8px`, padding típico `px-3 py-2` (`text-xs` ou `text-sm`).
  - Estados: `:focus` aplica `border-color: #d4a853; outline: none`; `:disabled` reduz interatividade (usado em `cfg-*` para não-Mestres e selects bloqueados).
- **Barras de Busca com Ícone e Limpar (`X`):**
  - Wrapper `relative` com `<iconify-icon icon="game-icons:magnifying-glass">` absoluto à esquerda (`left-3` ou `left-3.5`), input `.app-input` com `pl-8`/`pl-9` e `pr-7`/`pr-8`, e botão limpar (`✕`, `w-5 h-5`, `.hidden` quando vazio) absoluto à direita (`right-2` ou `right-2.5`).
  - Instâncias: `#member-search-input`, `#search-input` (Mesa), `#fichas-search-input`, `#catalog-search-input`, `#shop-search-input`, `#bestiary-search-input`, `#quests-search-input`, `#host-skill-tree-search-input`, `#audit-filter-search`, `#inv-modal-search-input`, `#npc-item-search-input`, `#spawn-enemy-search`, `#st-modal-search-input` e busca inline `#notes-search-input` (transparente com botão `↓` e status de ocorrências).
- **`textarea` Redimensionável:**
  - Mesma classe `.app-input`, preservando quebras de linha em descrições de itens (`.item-description { white-space: pre-wrap; word-break: break-word; }`), habilidades gerais (monoespaçada `rows="6"` / `rows="10"`), lore e justificativas (`resize-none` em `#prop-message`, `resize-y` em `#skill-modal-textarea`).
- **Editor `contenteditable` do Bloco de Notas (`#notes-content-editor`):**
  - Fundo `#0c0d12`, `min-h-[320px]`, `outline-none`, `text-sm leading-relaxed`. Placeholder CSS via `.notes-editor-body:empty:before { content: attr(placeholder); color: rgba(163, 163, 163, 0.4); }`. Estiliza `h1` (`1.45rem`, `#fbbf24`, borda inferior dourada), `h2` (`1.2rem`, `#f3f4f6`), `blockquote` (borda esquerda `3px solid #f59e0b`, fundo `rgba(245, 158, 11, 0.08)`), `ul`/`ol`, `.note-task` (checklist interativo com riscado `.is-done`) e tabelas `.notes-table` (`border: 1px solid #3f3f46`, `th` em `#1f1f23` com texto `#fbbf24`).

### 2.2 Campos Numéricos, Steppers Acoplados e Sliders (`range`)
- **Inputs Numéricos Destacados (Modais de Ação Rápida):**
  - `#damage-amount-input`, `#attr-value-input`, `#single-res-value-input`, `#gold-amount-input`, `#sell-escrow-price-input`: largura total, `px-4 py-3 text-xl font-mono font-black text-center app-input`.
- **Inputs Numéricos Compactos e de Tabela:**
  - Quantidade na Loja (`data-shop-buy-qty`): `w-14 app-input px-1.5 py-0.5 rounded text-xs font-mono font-bold text-center` dentro de pílula `Qtd:`.
  - Preço Customizado no NPC (`data-shop-custom-price`): `w-24 app-input px-2 py-1 rounded-lg text-xs font-mono font-bold text-amber-300 text-right`.
  - Limite de Peso no Inventário (`#inv-modal-max-weight-input`): `w-16 px-2 py-1 text-center font-mono font-black text-xs app-input`.
  - Point Buy, Pipeline de Dano (`#pipe-*`), Ranks/Custos de Nós (`#sn-form-*`), Propostas (`#prop-qty`, `#prop-gold` com sufixo absoluto `OURO`), Recompensas (`#bulk-*`, `#quest-reward-*`) e Modificadores (`[data-mod-val]`, `[data-eff-val]`, `[data-st-comp-val]`, `[data-sn-eff-val]`, `[data-race-eff-val]`): todos em `font-mono font-bold app-input` (diretriz sem setas nativas de spin).
- **Controles Numéricos com Botões Acoplados (`-` / `+`):**
  - **Pontos de Ação (`PA`) no Card:** pílula `bg-amber-500/10 border-amber-500/25` contendo botão `-` (`w-4 h-4`), texto clicável `PA: X/Y` (gasta 1 PA) e botão `+` (`w-4 h-4`).
  - **Cargas de Batalha na Sidebar:** badge `Cargas: N` + par de botões `-` / `+` (`w-5 h-5 rounded app-icon-btn text-cyan-300`).
  - **Pontos de Talento (Mestre):** em `modal-skill-tree` (`.sk-mini-btn` `24×24px` `-1` e `.sk-mini-btn-gold` `+1`) e em `modal-char-sheet` (`w-5 h-5` `-1` / `+1` roxo).
  - **Ajuste de Atributos na Ficha (`modal-char-sheet`):** botões `－` (`w-6 h-6 app-secondary-btn`) e `＋1` (`px-2 py-0.5 btn-gold`) abaixo de cada um dos 5 atributos.
- **Sliders de Alcance (`input[type="range"]`):**
  - **Zoom do Recortador Circular (`#cropper-zoom-slider`, `.cropper-zoom-range`):** `min="1" max="3" step="0.01"`, trilha `5px` `#4e5058`, thumb circular `16×16px` `#ffffff` (escala `1.12` no hover).
  - **Volumes no Modal de Preferências (`#pref-volume-master`, `#pref-volume-buy`, `#pref-volume-equip`, `#pref-volume-move`, `#pref-volume-hover`):** `min="0" max="100" step="1"`, Master `h-2` e individuais `h-1.5`, `rounded-lg appearance-none bg-stone-800 accent-amber-500`, acompanhados de leitura percentual `font-mono` e botão de teste `▶` (`w-6 h-6`).

### 2.3 Dropdowns e Seletores
1. **Dropdown Customizado Fosco (`.fantasy-dropdown-wrapper` — gerado por `renderCustomModifierDropdownHtml`):**
   - Usado nos construtores de modificadores de Itens, Buffs/Nerfs, Árvores, Nós e Raças.
   - **Estrutura:** `<input type="hidden" class="fantasy-dropdown-input">` + `<button class="fantasy-dropdown-trigger">` + `<div class="fantasy-dropdown-menu hidden">`.
   - **Estilo do Trigger:** fundo `#12100d`, borda `1px solid #c8aa6e33`, texto `#e6dcc8`, `padding: 6px 10px`, `font-size: 11px`, `border-radius: 7px`, `box-shadow: none`, `text-shadow: none`. Hover: `#1c1813` e borda `#c8aa6e66`. Chevron `.fantasy-dropdown-chevron` (`14×14px`, `#c8aa6e`) rotaciona `180deg` quando `aria-expanded="true"`.
   - **Posicionamento Dinâmico (Acima / Abaixo):** ao abrir (`06-events-init.js`), calcula `spaceAbove = rect.top` e `spaceBelow = window.innerHeight - rect.bottom`. Se `spaceAbove < 160 && spaceBelow > spaceAbove`, abre abaixo (`top: calc(100% + 4px)`); caso contrário, abre acima (`bottom: calc(100% + 4px)`).
   - **Menu Interno:** `min-width: 240px`, `max-width: 340px`, `max-height: 240px`, scrollbar fina `6px` (`#3d352a` sobre `#12100d`). Grupos usam `.fantasy-dropdown-group-header` (`10px`, uppercase, `#a89470`, separador `#c8aa6e1a`). Itens `.fantasy-dropdown-item` (`6px 12px`, `#e6dcc8`, hover `#241f18`); item selecionado `.is-selected` (`#1e1913`, texto `#ffd88a` + ícone SVG check `#c8aa6e`). Fecha automaticamente ao clicar fora ou pressionar `Esc`.
2. **Dropdown de Árvores/Classes no Modal Radial (`.sk-dd`):**
   - Trigger `.sk-dd-trigger` (`min-width: 210px`, `max-width: 320px`, `#181512`, borda `#c8aa6e40`, `border-radius: 10px`, texto `#e6d9bb`), exibindo nome da árvore/classe e porcentagem concluída.
   - Menu `.sk-dd-menu` (`min-width: 340px`, `max-height: 60vh`, `z-index: 50`, `#181512`), listando itens `.sk-dd-item` com badges `.sk-badge` (ex.: `CLASSE`, `SUBCLASSE`, `OCULTA`), contador de resultados de busca e progresso percentual em `JetBrains Mono` (`.sk-dd-item-meta`).
3. **Selects Nativos Estilizados (`.app-input`):**
   - Usados em filtros e formulários: `#member-role-filter`, `#shop-buyer-char-select`, `#quests-status-filter`, `#cfg-wallet-mode`, `#cfg-precedence`, `#cfg-rounding`, `#cfg-inv-unlimited`, `#audit-filter-type`, `#audit-filter-user`, `#char-race-select`, `#char-subrace-select`, `#char-class-select`, `#char-subclass-select`, `#bn-effect-type`, `#cat-item-type`, `#accept-quest-char-select`, `#member-char-select`, `#member-preset-select`, `#recipient-char-select`, `#subclass-inh-*`, `#skill-tree-modal-char-select`, `#sn-form-category`, `#race-form-type`, `#race-form-parent-id`, seletores `FLAT`/`PERCENT` e status inline de missões.

### 2.4 Toggle Switches e Checkboxes
- **Toggle Switch Padrão (`.fantasy-toggle`):** `44 × 24 px`, trilho `.fantasy-toggle-slider` (`rgba(24, 24, 27, 0.9)`, borda `rgba(255, 255, 255, 0.15)`, pino `16×16px` cinza metálico `#a1a1aa → #71717a`). Quando marcado, trilho esmeralda (`#10b981`) e pino desloca `translateX(20px)` (`#6ee7b7 → #10b981`). Foco acessível: `outline: 2px solid #d4af37; outline-offset: 2px`. Usado em `modal-perm-category`, `modal-preferences` e `.sk-toggle-row`.
- **Toggle Switch Compacto (`.fantasy-toggle-sm`):** `32 × 18 px`, pino `12×12px`, deslocamento `translateX(14px)`. Usado em cada card da lista de Buffs e Nerfs (`modal-buffs-nerfs`).
- **Toggles Peer Tailwind (`sr-only peer`):** `w-11 h-6` (`44 × 24 px`), usados em `#damage-true-switch` (vermelho `peer-checked:bg-rose-600`), `#attr-overflow-switch` (dourado `peer-checked:bg-amber-500`) e `#enemy-revealed-input` (verde `peer-checked:bg-emerald-600`).
- **Checkboxes:**
  - Checklist do Bloco de Notas (`.note-checkbox`): `accent-color: #f59e0b`, `1.05rem × 1.05rem`; quando marcado aplica `.is-done` (tachado + `opacity: 0.5`).
  - Checkboxes de formulário: `w-4 h-4 rounded` com `accent-purple-500` (`#bn-effect-is-permanent`), `accent-amber-500` (`#st-form-hidden`, `#st-form-is-subclass`), seleção em lote (`#bulk-chars-checkboxes`), flags do catálogo (`#cat-item-equipable`, `#cat-item-non-tradable`, `#cat-item-visible`) e estoque de NPC (`#npc-stock-checklist`).

---

## 3. Catálogo Completo de Botões, Badges e Micro-componentes

### 3.1 Hierarquia Principal de Botões (Raio Padrão `8px` / `rounded-lg`)
| Nível | Classe(s) | Visual Base | Hover / Active / Disabled | Uso |
| :--- | :--- | :--- | :--- | :--- |
| **Primário** | `.btn-gold` | `linear-gradient(180deg, #deb562, #c4963c)`, texto `#14100a`, borda `#f0c674`, `font-weight: 800`, `border-radius: 8px`, sombra `0 2px 4px rgba(0,0,0,0.4)` | Hover: `#eac474 → #d1a347` + `translateY(-1px)`; Active: `scale(0.98)`; Disabled: `opacity-40`/`50` | Ações principais (`CRIAR`, `COPIAR LINK`, `INICIAR BATALHA`, `Salvar`, `Comprar`, `AVANÇAR TURNO`) |
| **Secundário** | `.btn-gold-outline` | `rgba(212, 168, 83, 0.1)`, texto `#f0c674`, borda `rgba(212, 168, 83, 0.48)`, `font-weight: 700`, `border-radius: 8px` | Hover: `rgba(212, 168, 83, 0.2)` | Ações secundárias relevantes (`Editar Sala`, `XP em Lote`, `Transferir`, `Vender`, `Salvar Preset`, `＋ Modificador`) |
| **Neutro** | `.app-secondary-btn` | `#211c16`, borda `rgba(255, 244, 224, 0.14)`, texto `#d6cbb9` | Hover: `#2c251d`, texto `#f5efe6`; Disabled: `opacity-35 pointer-events-none` | `Cancelar`, `Fechar`, filtros inativos, `DESFAZER`/`REFAZER`, controles de câmera, `Proposta` |
| **Ícone Quadrado** | `.app-icon-btn` | `#211c16`, borda `rgba(255, 244, 224, 0.08)`, texto `#d6cbb9`, tamanhos `w-7 h-7`, `w-8 h-8` ou `w-9 h-9`, `rounded-lg` | Hover: `#2c251d`, borda `var(--gold-border)`, texto `#f0c674` | Fechar modais (`✕`), ações no topo do card (Ficha, Inventário, Acúmulos, Editar, Buffs/Nerfs, Despachar) |
| **Perigo / Exclusão** | `bg-rose-600/20 text-rose-400 border-rose-500/40`, `bg-rose-950/60`, `.sk-btn-danger` | Carmesim fosco (`#6b3036` / `rose-500/40`), texto `#fca5a5`/`#d89aa0` | Hover: preenchimento `bg-rose-600 text-white` ou `#261417` com borda `#a14a52` | `DEL`, `Excluir`, `Recusar`, `TRAZER INIMIGO`, `Aplicar Dano` (gradiente `from-rose-700 to-red-600`) |

### 3.2 Botões Específicos de Interface
- **Navegação da Sidebar (`.sidebar-nav-item`):** `padding: 10px 14px`, `border-radius: 8px`, `Cinzel 11px bold uppercase`. Estado `.active`: texto `#f0c674`, gradiente horizontal suave `rgba(212,168,83,0.16) → 0.04`, borda `--gold-border` e barra vertical esquerda `3px` em `#d4a853` (`::before`). Contadores circulares `.sidebar-badge` (`min-width: 20px`, `height: 20px`, `rounded-full`).
- **Pills da Topbar:**
  - `.topbar-wallet-pill`: `#171410`, borda `--gold-border`, `rounded-lg`, `padding: 6px 12px`, exibe saldo em `JetBrains Mono` + nome da moeda + divisor vertical + botão `Gerenciar Moeda` (Mestre).
  - `.topbar-role-pill`: dourado (`rgba(212,168,83,0.1)`, borda `--gold-border-strong`, texto `#f0c674`) para `MODO MESTRE`; variante `.role-player` (`rgba(56,189,248,0.1)`, borda `rgba(56,189,248,0.35)`, texto `#7dd3fc`) para `MODO JOGADOR` / simulação.
  - Botão de Preferências (`#btn-open-preferences`): `w-9 h-9 rounded-lg border-amber-500/40 bg-amber-500/10 text-amber-300` com `lucide:settings`.
- **Action Pills dos Cards de Personagem (Grade `3×2` no rodapé):**
  - `.action-pill`: `py-2 px-1 rounded-lg font-extrabold text-[11px]` — `VIDA`, `ARMADURA`, `MANA`, `RESETAR`.
  - `.action-pill-damage`: `DANO` (`rgba(185,28,28,0.18)`, borda `rgba(239,68,68,0.35)`, texto `#fca5a5`).
  - `.action-pill-notes`: `NOTAS` (`#064e3b`, borda `#059669`, texto `#a7f3d0`, `box-shadow: none`).
- **Botões de Operação em Modais (`.attr-op-btn`, `.res-op-btn`):**
  - Estado padrão: `#211c16`, texto `#d6cbb9`.
  - Estado selecionado (`.active-op`): gradiente dourado mate `#deb562 → #c4963c`, texto `#14100a`, borda `#f0c674`. Usados em `modal-damage`, `modal-attribute`, `modal-single-resistance`, `modal-gold` e `modal-revive`.
- **Botões do Modo Compacto na Mesa:**
  - `.btn-toggle-compact-mode` (rodapé do card completo): `padding: 4px 14px`, `border-radius: 0 0 10px 10px`, `rgba(20,16,11,0.92)`, borda `--gold-border`, `Cinzel 10px`.
  - `.btn-expand-full-mode` (sob o token circular): `44 × 22 px`, `border-radius: 0 0 8px 8px`, chevron para baixo.
- **Botões do Modal Radial de Habilidades (`.sk-*`):**
  - `.sk-btn` (`padding: 6px 10px`, `border-radius: 9px`, `#181512`, borda `#c8aa6e40`), `.sk-btn-gold` (`#c8aa6e`, texto `#12100d`), `.sk-btn-danger` (`border #6b3036`, texto `#d89aa0`).
  - `.sk-mini-btn` (`24×24px`, `border-radius: 6px`, `-1`/`+1`).
  - Paginador de quadrantes: `.sk-pg-arrow` (`22×22px`) e `.sk-pg-tab` (`height: 22px`, `padding: 0 8px`, `JetBrains Mono 10px`, estado `.is-active` com fundo `var(--q-border)` e borda `var(--q-accent)`).
  - Botão de adicionar nó no quadrante: `.sk-quad-add` (`22×22px`).
  - Botões do Inspector: `.sk-act-btn` (ouro mate `#c8aa6e`, disabled `#221e17`/`#6f6656`) e `.sk-act-btn.is-ghost` (reembolsar, contorno `#6b3036`).

### 3.3 Badges, Barras de Progresso, Toasts e Cursores Colaborativos
- **Barras de Progresso:** `.stat-bar-track` (`#090807`, `h-3 rounded-full` para vitais, `h-1.5 w-20` para XP) + `.stat-bar-fill` (transição `width 0.3s cubic-bezier(0.22, 1, 0.36, 1)` + leve reflexo superior `rgba(255,255,255,0.2)`). Em overflow, a trilha recebe `.stat-overflow-glow` (`border: 2px solid #d4a853; box-shadow: none`) acompanhada da tag `OVERFLOW`.
- **Badges de Cargo e Status:**
  - `.role-badge-master` (ouro mate) e `.role-badge-player` (`rgba(56,189,248,0.1)`, texto `#93c5fd`).
  - Badges de status de Missão (`QUEST_STATUS_BADGES`): `PENDENTE` (`amber`), `ACEITA` (`sky`), `EM_PROGRESSO` (`indigo`), `PAUSADA` (`slate`), `CONCLUIDA` (`emerald`), `RECUSADA` (`rose`), `CANCELADA` (`zinc`).
  - Tags de combate nos nós de habilidade (`.sk-chip` / `renderSkillCombatTags`): `Custo de Mana` (`indigo`), `Custo de PA` (`amber`), `Usos` (`emerald`), `Recarga` (`purple`), `Cargas` (`rose`, exclusivo de Supremas).
  - Contadores flutuantes sobre botões do card: badge circular `min-w-[18px] h-[18px]` no canto `-top-1.5 -right-1.5` (`bg-amber-600` ou `bg-rose-600 animate-bounce` para acúmulos; `bg-purple-600 animate-pulse` para buffs/nerfs).
- **Toasts Flutuantes (`#toast-container`, `.toast-item`):**
  - Posição fixa `top-4 right-4 z-[120] max-w-sm`. Duração automática `4800 ms` com deduplicação de `550 ms` e animações `toastSlideIn` (`0.26s`) / `toastSlideOut` (`0.2s`).
  - Variantes: `success` (`from-emerald-700 to-teal-700 border-emerald-400/50`) e padrão/warning (`from-rose-700 via-amber-700 to-orange-700 border-amber-300/60`), com botão fechar `✕` (`w-6 h-6`).
- **Cursores Colaborativos (`.multiplayer-cursors-layer`):**
  - **Jogadores:** seta SVG `22×22px` + `.remote-cursor-badge` (`rgba(12,10,8,0.92)`, `border: 1.5px solid var(--cursor-color)`) + indicador na sidebar `.sidebar-cursor-pill` (`max-width: 84px`, `9px`). Paleta fixa permanente de 10 cores: `#FF595E`, `#3B82F6`, `#10B981`, `#F59E0B`, `#A855F7`, `#06B6D4`, `#F97316`, `#EC4899`, `#84CC16`, `#818CF8`.
  - **Mestre (`.cursor-master-rgb` / `.pill-master-rgb`):** animação linear contínua de `6s` ciclando `#ff2255 → #ff7700 → #ffcc00 → #00ee66 → #00b4d8 → #9d4edd → #ff2255` (`rgb-smooth-fill`, `rgb-smooth-color`, `rgb-smooth-bg`, `rgb-smooth-text`, `rgb-smooth-glow`).

---

## 4. Anatomia Detalhada do Shell e de Todas as 9 Abas

### 4.0 Layout Base (Shell da Aplicação)
- **Sidebar Esquerda (`#app-sidebar`):** fixa em desktop (`lg:sticky w-64 h-screen`, `#0e0c0a`, borda direita `--border-subtle`) e gaveta deslizante em mobile (`-translate-x-full`, backdrop `#sidebar-mobile-backdrop`).
  - Topo: nome da sala (`#sidebar-room-name`, `Cinzel text-xl`), subtítulo (`#sidebar-room-subtitle`, `10px tracking-[0.2em]`) e divisor losango `.gold-diamond-divider` (`◇`).
  - Navegação: 9 botões `[data-nav-tab]` com ícone `game-icons:*`, pílulas de cursores ativos na aba (`[data-nav-cursors]`) e contador `.sidebar-badge`.
  - Rodapé: grid 2 colunas `↩ DESFAZER` (`#btn-undo`) / `REFAZER ↪` (`#btn-redo`) + barra de status WebSocket (`#ws-status-dot` + `#ws-status-text`) e link `Perfil` (`#btn-open-profile`).
- **Topbar Superior (`.app-topbar`):** `sticky top-0 z-30 px-4 sm:px-8 py-3`.
  - Esquerda: botão hambúrguer mobile (`#btn-mobile-sidebar`) + breadcrumb `SALAS / <SALA> / <ABA>`.
  - Direita: `.topbar-wallet-pill` (saldo + `Gerenciar Moeda`), `.topbar-role-pill` (`MODO MESTRE` / `MODO JOGADOR`) e botão engrenagem `#btn-open-preferences` (`lucide:settings`).
- **Sidebar Direita de Batalha (`#battle-sidebar` + `#btn-battle-sidebar-dock-tab`):**
  - Painel `w-[300px] h-screen fixed lg:sticky right-0 z-40`, oculto fora de combate.
  - Topo: título `Fila de Batalha`, botão recolher `▶`, badge `Rodada N` (`amber`), badge `Cargas: N` (`cyan`) com botões `-`/`+` e divisor `◇`.
  - Ação: botão full-width `.btn-gold` `AVANÇAR TURNO` (`#btn-battle-advance-turn`) + dica contextual `#battle-turn-hint`.
  - Lista scrollável (`#battle-queue-list`): cards ordenados com posição `1º`, ícone (`crowned-skull` morto, `monster-grasp` inimigo, `hooded-figure` jogador), badge `VEZ` ou `0 HP (MORTO)`, badge `Turno X/Y` (multi-turno), contagem `Ações Feitas: N` e controles de reordenação.
  - Rodapé: botão `Editar Ordem` (`.btn-gold-outline`).
  - Quando recolhida (`.sidebar-collapsed`), exibe a aba lateral fixa `#btn-battle-sidebar-dock-tab` (`fixed right-0 top-28 rounded-l-xl`, texto vertical `Batalha`, mini badge `C:N` e seta `◀`).

### 4.1 Aba 1 — Visão Geral (`#tab-overview`)
1. **Hero Banner (`.room-hero-banner`):** `min-height: 215px`, `rounded-[12px]`, gradiente quente âmbar/carvão com decoração `candlebright`, `beer-stein` e `quill` à direita (`opacity: 0.42`). Contém nome da sala (`text-3xl sm:text-4xl Cinzel`), botão `Editar Sala` (Mestre), subtítulo, divisor `◇` e frase da sala (`whitespace-pre-line`).
2. **Card de Convite & IPs Ao Vivo:** texto explicativo da regra Host = Mestre, pílula verde com `animate-ping` (`Host Mestre: <IP>`), botão `.btn-gold` `COPIAR LINK`, caixa `ENDEREÇO: http://<IP>:8000` e seção inferior `IPs CONECTADOS NO MOMENTO (N)` (`#live-connected-ips-list`).
3. **Tabela de Membros da Sala:** cabeçalho com contador, busca `#member-search-input`, select `#member-role-filter` e botão `＋ Pré-Cadastrar IP` (Mestre). Tabela dentro de `.fantasy-card` com 5 colunas: `APELIDO / IDENTIFICAÇÃO`, `ENDEREÇO IP & STATUS`, `CARGO`, `PERSONAGEM VINCULADO` e `AÇÕES`.

### 4.2 Aba 2 — Mesa (`#tab-mesa`)
- Ativa modo full-bleed no container principal (`#app-main-container.mesa-fullbleed`, `height: calc(100vh - 3.5rem)`).
- **Barra de Ferramentas Superior:**
  - Esquerda: localizador `#search-input` (`LOCALIZAR NA MESA (ENTER)...`) com botão limpar `✕` e contador `#char-count-label`.
  - Centro: pílula de câmera com `Centralizar`, `Ver Tudo`, separador vertical, `−`, leitura `#mesa-zoom-label` (`75%`), `＋` e `Padrão`.
  - Direita: indicador `BATALHA ATIVA` (`rose`, `animate-pulse`), `TRAZER INIMIGO`, `INICIAR BATALHA`, `XP em Lote` e `＋ CRIAR`.
- **Viewport e Mundo (`.mesa-viewport` / `#mesa-world`):**
  - Tabuleiro `4800 × 3000 px` com borda `3px solid rgba(212, 168, 83, 0.68)`, `border-radius: 18px` e 4 cantoneiras ornamentais `.mesa-world-corner` (`28×28px`).
  - **Modo de Batalha:** `.mesa-zone-enemies` (`top: 0`, `height: 1500px`, tom carmesim sutil + marca d'água superior), `.mesa-zone-heroes` (`top: 1500px`, `height: 1500px`, tom âmbar sutil + marca d'água inferior) e divisória central `.mesa-battle-divider` em `top: 1500px` com badge `FRONTEIRA DE COMBATE • INIMIGOS ACIMA / HERÓIS ABAIXO`.
  - **Camada de Cards (`.mesa-tokens-layer`):** cards completos (`.mesa-token`, largura `420px`) ou tokens compactos (`.mesa-token-compact`, `72 × 96 px` com círculo `68×68px`, botão expandir `44×22px` e etiqueta `.compact-token-label`). Estados visuais: `.mesa-token-dragging` (borda ouro), `.mesa-token-colliding` (borda `#fb7185`), `.mesa-token-remote-dragging` (borda `#38bdf8` + badge flutuante `"Arrastando: <Nome>"`), `.mesa-token-search-match` e `.mesa-token-search-dim` (`opacity: 0.28`).
  - **HUD Inferior (`.mesa-hud-hint`):** pílula fixa no canto inferior esquerdo lembrando atalhos (`Roda do mouse: Zoom`, `Botão do meio ou Espaço + Arrastar: Câmera`, `Arraste os cards livremente`).

### 4.3 Aba 3 — Fichas (`#tab-characters`)
- **Barra de Ferramentas:** busca `#fichas-search-input` + limpar `✕` + contador `#fichas-count-label`; botões `TRAZER INIMIGO`, `INICIAR BATALHA`, `Conceder XP / Atributos em Lote` e `＋ CRIAR`.
- **Dica de Reordenação:** linha auxiliar instruindo arraste pelo nome do personagem.
- **Grid de Cards (`#characters-grid`):** `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5`.
  - **Anatomia do Card Completo (`.char-card.character-card-with-avatar`):**
    1. **Avatar Circular Flutuante:** `64 × 64 px` em `top: -32px left: 50%` (`.char-card-top-avatar-wrap`, borda `2.5px` ouro ou `#fb7185` para inimigos; clicável com `.image-viewer-trigger`).
    2. **Cabeçalho (`.char-card-header`):** alça arrastável `⠿` + nome (`Cinzel text-lg sm:text-xl`), badges (`INIMIGO`, `NV. X`, `X Turnos/Rodada`, `Turnos: N`) e coluna direita `.char-top-actions` (até 4 botões `.app-icon-btn` `36×36px`: Ficha, Inventário, Acúmulos com badge contador, Editar/Despachar + botão inferior Buffs & Nerfs com contador roxo).
    3. **Metadados:** mini barra de XP, `XP atual/próximo`, dono vinculado, badges de Raça/Sub-raça (`amber`), Classe/Subclasse (`sky`) e `+N Hab` (`purple`). Em inimigos ocultos para jogadores, exibe `Informações Ocultas pelo Mestre` e mascaramento `?`.
    4. **Grade Tática:** pílulas de `PA` (com `-`/`+`), `DEF` (`emerald`), `Ataque` (`red`) ou `Arcana` (`blue`, exibindo o maior), `REGEN %` (`violet`) e `Peso kg` (`rose` em sobrecarga).
    5. **Banners Condicionais:** `TURNO ATUAL` (`amber`, `animate-pulse`), banner de morte (`PERSONAGEM MORTO (0 HP)` + botão `Reviver` para Mestre) e banner verde de `+N Ponto(s) de Atributo Pendente(s)!`.
    6. **Barras Vitais & Acúmulos:** barras `Vida`, `Armadura` e `Mana` (`h-3`) + chips de acúmulos ativos (`> 0`, pulsando em `rose` no máximo).
    7. **Rodapé:** banner roxo `HABILIDADES GERAIS` (inimigos revelados) e grade `3×2` de Action Pills (`DANO`, `VIDA`, `ARMADURA`, `MANA`, `RESETAR`, `NOTAS`).
- **Estado Vazio (`#empty-search-state`):** card com borda tracejada, lupa `text-5xl` e título `NENHUM CHAR ENCONTRADO`.

### 4.4 Aba 4 — Catálogo de Itens (`#tab-catalog`)
- **Cabeçalho:** título `Catálogo Canônico de Itens da Sala`, subtítulo e botão `＋ Novo Item no Catálogo` (Mestre).
- **Filtros:** 6 pílulas de categoria (`Todos`, `Armaduras`, `Armas`, `Acessórios`, `Consumíveis`, `Outros`) + input `#catalog-search-input` (`w-56`).
- **Grid (`#catalog-items-grid`):** `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`. Cada card contém thumbnail circular `36×36px` (`renderItemThumbnailHtml`), nome + tipo, badge de preço (ou `Preço Indef.`), descrição truncada em 1 linha com botão expansível `Ver descrição`, chips dourados de efeitos, metadados de peso/equipável/flags (`Não Negociável`, `Oculto p/ Jogadores`) e rodapé com `Conceder Item`, editar e excluir.

### 4.5 Aba 5 — Loja & Mercadores (`#tab-shop`)
- **Cabeçalho:** título `Loja & NPCs Mercadores`, select `#shop-buyer-char-select` (`Comprador:`), botão `Solicitações de Compras` com badge `#badge-pending-proposals` e botão `＋ Novo Mercador (NPC)`.
- **Painel de Escrow (`#escrow-approvals-box`):** oculto quando vazio; quando há pendências, lista cada venda com botões `Aprovar` (`emerald-600`) e `Recusar` (`rose-600`) para aprovadores ou selo `Aguardando aprovação do Mestre`.
- **Layout 1:3 (`grid-cols-1 lg:grid-cols-4 gap-5`):**
  - **Sidebar de NPCs (`#shop-npcs-sidebar`, 1 col):** cards clicáveis de mercadores (ativo com `border-amber-400 bg-amber-500/10`) com botões de editar/excluir.
  - **Vitrine (`#shop-npc-showcase`, 3 cols):** banner do NPC selecionado + barra de filtros por categoria e busca `#shop-search-input` (com **busca cruzada** que sugere botões `Ir para <Outro NPC>` se o item só existir em outro mercador) + grid `md:grid-cols-2` de cards alinhados verticalmente contendo: cabeçalho com thumbnail, peso/estoque e preço; descrição expansível; linha `Valor no NPC` (input `w-24` visível ao Mestre/gestores); e rodapé alinhado `[Qtd: w-14] [Comprar (.btn-gold flex-1)] [Proposta (.app-secondary-btn)]`.

### 4.6 Aba 6 — Bestiário (`#tab-bestiary`)
- **Barra de Ferramentas:** ícone em container carmesim `w-10 h-10`, título + pill `#bestiary-count-pill` (`N MONSTRO(S)`), campo `#bestiary-search-input` com botão limpar `✕` e botão `CRIAR INIMIGO`.
- **Grid Paginado Estrito (`#bestiary-grid`):** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` (**máx. 6 cards por página** — `PAGE_SIZE = 6`).
  - Cada card (`.character-card-with-avatar`) traz avatar circular com anel carmesim, miniatura quadrada `32×32px`, nome, `NV. X`, `X Turnos/Rodada`, botão toggle `Liberado` (`emerald`) / `Oculto` (`neutral`), bloco de vitais (`HP`, `ARM`, `MP`, `DEF`, `REGEN`, `ATQ`), chips das 7 resistências elementais (%), chips dos 7 limites de acúmulo, botão roxo `HABILIDADES GERAIS` e rodapé `Trazer p/ Mesa`, editar e excluir.
- **Estado Vazio (`#empty-bestiary-state`)** e **Paginação Inferior (`#bestiary-pagination`)** com `← Anterior`, `Página X de Y` e `Próxima →`.

### 4.7 Aba 7 — Missões (`#tab-quests`)
- **Cabeçalho:** título `Quadro de Missões & Contratos` + botões `Recompensa em Lote` (`.btn-gold-outline`) e `＋ Nova Missão` (`.btn-gold`).
- **Barra de Filtros:** busca `#quests-search-input`, select `#quests-status-filter` (Todos + 7 status) e botão `Limpar Filtros`.
- **Grid (`#quests-list-grid`):** `grid-cols-1 md:grid-cols-2 gap-4`. Cada card exibe título, badge de status colorido, descrição, pílula `Aceita por: <Nome>`, caixa `Pacote de Recompensas` (Ouro, XP, Pts Atrib., Pts Hab., Itens + indicação `JÁ ENTREGUE`) e rodapé com `Aceitar Missão`, `Concluir & Premiar` (`emerald-600`), editar, select de mudança rápida de status e excluir.

### 4.8 Aba 8 — Árvore de Habilidades, Classes & Raças (`#tab-skill-trees`)
- Visível apenas para Mestre ou portadores de `manageSkillTrees`.
- **Topo:** grupo de **3 Sub-abas** (`#host-progression-subtabs`): `Árvores`, `Classes & Subclasses` e `Raças & Sub-raças` (cada qual com contador em `JetBrains Mono`) + botão contextual `＋ Nova Árvore` / `＋ Nova Classe / Subclasse` / `＋ Nova Raça / Sub-raça`.
- **Barra de Busca e Filtros (`#host-skill-tree-search-bar`):** input `#host-skill-tree-search-input` com limpar `✕` + 5 pílulas de filtro (`Todos`, `Supremas`, `Ativas`, `Passivas`, `Talentos`, ocultas na sub-aba Raças).
- **Sub-abas Árvores e Classes:** seletor de abas das árvores/classes cadastradas (com badges `CLASSE BASE`, `SUBCLASSE NV.15+`, `N nós`, `N encontrados`, `OCULTA`), barra de ações (`Abrir 4 Quadrantes`, `Editar`, `Duplicar`, `Excluir`, `Adicionar Nó`), banner do **Efeito Central** (`100%` ou `Efeito Imediato`) e 4 seções `.constellation-tier-section` contendo cards `.constellation-node-card` arrastáveis (Drag & Drop) com tags de combate, descrição, melhoria, modificadores e botões `Duplicar`, editar e excluir.
- **Sub-aba Raças:** cards de `RAÇA BASE` com bônus de pontos de talento, descrição, chips verdes de modificadores, ações (`＋ Sub-raça`, `Editar`, `Excluir`) e sub-grid `md:grid-cols-2` listando todas as `SUB-RAÇA` vinculadas.

### 4.9 Aba 9 — Administração (`#tab-admin`)
Layout em **2 colunas** (`grid-cols-1 lg:grid-cols-2 gap-5`):
1. **Coluna Esquerda — Configurações da Campanha (`#form-room-settings`):** inputs para `Nome da Sala`, `Subtítulo`, `Nome da Moeda`, selects `Modo da Carteira` (`SHARED`/`INDIVIDUAL`), `Precedência de Modificadores` (`FLAT_FIRST`/`PERCENT_FIRST`), `Modo de Arredondamento` (`ROUND_DOWN`/`ROUND_UP`), `Capacidade de Inventário` (`Ilimitado`/`Limitado`), input `Limite de Slots`, textarea `Frase do Banner`, botão `Exportar Backup JSON` e `Salvar Configurações`.
2. **Coluna Direita — Histórico de Auditoria Perpétuo (`max-h-[640px]`):** cabeçalho com contador `#audit-log-counter`, barra de filtros em grid 12 colunas (`#audit-filter-search` 5 cols, `#audit-filter-type` 3 cols, `#audit-filter-user` 3 cols, botão limpar `#btn-audit-clear-filters` 1 col) e lista scrollável `#audit-log-container` com cards exibindo `[actionType] targetEntity`, timestamp `font-mono`, resumo e autor.

---

## 5. Catálogo Exaustivo de Todos os 38 Modais do Sistema

Todos os modais compartilham o padrão de overlay `.modal-backdrop` (`fixed inset-0 flex items-center justify-center`), painel `.modal-panel` (`rounded-2xl`, borda `--gold-border`, animação `scaleUp` `0.16s`), cabeçalho `.app-modal-header` com ícone + título em `Cinzel` + botão `✕` (`data-close-modal`), corpo com scroll interno (`overflow-y-auto`) e rodapé com ações alinhadas à direita (e ações destrutivas à esquerda quando aplicável).

| # | ID do Modal | Dimensões & `z-index` | Estrutura, Campos e Botões Internos |
| :-: | :--- | :--- | :--- |
| **1** | `modal-char-form` | `max-w-2xl`, `max-h-[92vh]`, `z-50` | **Criar / Editar Personagem:** Upload de Avatar Circular (`w-16 h-16` preview + `Escolher Imagem` / `Remover`); Identificação (`Nome`, `Idade`, `Altura`, `Limite de Peso kg`); Origem & Vocação (`Raça Base`, `Sub-raça`, `Classe Base`, `Subclasse Nv.15+` com selo de bloqueio e preview dinâmico); Recursos Vitais & Status Base (8 inputs + atalho `Padrão Nível 1 Canônico`); 5 Atributos Canônicos com contador ao vivo Point Buy (`#point-buy-counter`); 7 Resistências Elementais % (`Zerar 0%`); 7 Limites de Acúmulo (`Padrão 100`); 3 botões `PASSIVA`/`ATIVA`/`SUPREMA` (abrem `modal-skill-detail`); textarea `História`; rodapé `DEL` (em edição), `Cancelar`, `Salvar Personagem`. |
| **2** | `modal-damage` | `max-w-lg`, `max-h-[92vh]`, `z-50` | **Aplicar Dano:** Seletor 2 colunas `.attr-op-btn` (`Dano Direto / Rápido` vs `Pipeline Tática`); Modo 1: `#damage-amount-input` (`text-xl`); Modo 2: 6 inputs (`Dano Base`, `Multiplicadores`, `Bônus Dano %`, `Letalidade %`, `Perfuração %`, `Ruptura %`); Switch `DANO REAL` (`#damage-true-switch`, `rose-600`); Caixa de Prévia (`breakdown`, `Armadura: X → Y`, `Vida: X → Y`); rodapé `Cancelar` e `Aplicar Dano` (gradiente vermelho). |
| **3** | `modal-attribute` | `max-w-md`, `z-50` | **Gerenciar Vida / Armadura / Mana:** 3 botões `.attr-op-btn` (`＋ Adicionar`, `－ Subtrair`, `＝ Setar`); input numérico `#attr-value-input` (`text-xl`); switch `OVERFLOW` (`#attr-overflow-switch`, `amber-500`); `Cancelar` e `Confirmar`. |
| **4** | `modal-resistances` | `max-w-lg`, `max-h-[90vh]`, `z-40` | **Painel dos 7 Acúmulos:** Lista clicável de 7 linhas `.resistance-row` (cada linha mostra ícone, nome do acúmulo, valor `atual / máx` e barra colorida); clique abre `modal-single-resistance`; rodapé `Fechar`. |
| **5** | `modal-single-resistance` | `max-w-sm`, `z-50` | **Ajustar Acúmulo Individual:** Cabeçalho com ícone/título dinâmico do status; 3 botões `.res-op-btn` (`ADICIONAR`, `SUBTRAIR`, `SETAR`); input `#single-res-value-input` (`text-xl`); nota de clamp `0..máx`; `Cancelar` e `Aplicar`. |
| **6** | `modal-buffs-nerfs` | `max-w-2xl`, `max-h-[92vh]`, `z-50` | **Buffs e Nerfs:** Duas seções com contadores (`Buffs` `#22c55e` e `Nerfs` `#ef4444`), cada efeito em card com toggle `.fantasy-toggle-sm`, badge de duração/permanente, pills de modificadores e botões editar/excluir; formulário inferior `Adicionar Novo Efeito` (nome, tipo `BUFF`/`NERF`, checkbox `Efeito Permanente`, `Duração`, construtor dinâmico de modificadores usando `.fantasy-dropdown-wrapper` + `FLAT`/`PERCENT` + valor, botão `＋ Adicionar Efeito`). |
| **7** | `modal-char-sheet` | `max-w-4xl`, `max-h-[92vh]`, `z-50` | **Ficha Completa (Personagem ou Criatura):** Cabeçalho com nome, nível, metadados e botão `Resetar`; corpo dinâmico com: grade 5 colunas dos Atributos Canônicos (efetivo, base, modificador, auto-sucesso DC e botões `－`/`＋1`); 4 status de combate (`ATAQUE`, `DEFESA`, `ARCANA`, `SANTIDADE`); grade 7 colunas das Resistências Elementais (%); 3 botões de Habilidades (`PASSIVA`, `ATIVA`, `SUPREMA` com contagem da árvore); card `Inventário & Equipamentos` (`ABRIR INVENTÁRIO`); cards `Raça & Sub-raça` e `Classe Base & Subclasse` (selects inline + botões `Abrir Classe`, `Abrir Subclasse` e `Herança Opcional`); bloco `Árvore de Habilidades` (pontos disponíveis, passivas `X/3`, controles `-1`/`+1` do Mestre e botão `ABRIR ÁRVORE DE HABILIDADES`). Para inimigos, exibe os atributos, status, resistências e caixa roxa `HABILIDADES GERAIS`. |
| **8** | `modal-gold` | `max-w-md`, `z-50` | **Gerenciar Cofre & Moeda:** 3 botões `.attr-op-btn` (`＋ Adicionar`, `－ Reduzir`, `＝ Definir`); input `#gold-amount-input` (`text-xl`); `Cancelar` e `Confirmar`. |
| **9** | `modal-revive` | `max-w-md`, `z-50` | **Ressurreição de Personagem:** 3 modos `.attr-op-btn` (`100% Total`, `50% Rápido`, `Personalizado`); inputs condicionais (`Vida Restaurada` `min=1`, `Armadura Restaurada` `min=0`); `Cancelar` e `Reviver Personagem`. |
| **10** | `modal-catalog-item` | `max-w-xl`, `max-h-[92vh]`, `z-50` | **Cadastrar / Editar Item no Catálogo:** Upload de imagem circular `w-14 h-14`; `Nome do Item`, `Tipo de Item` (5 categorias), `Descrição` (`rows=4`), `Peso (kg)`, `Preço (Ouro)`, bônus opcionais `Ataque` e `Arcana`, 3 checkboxes (`Equipável`, `Não Negociável`, `Visível para Jogadores`), construtor `Efeitos do Item se Equipado` (`＋ Adicionar Efeito` com `.fantasy-dropdown-wrapper`); `Cancelar` e `Salvar Item`. |
| **11** | `modal-bulk-reward` | `max-w-lg`, `z-50` | **Conceder Recompensas em Lote:** Lista `grid-cols-2` de checkboxes de personagens + link `Marcar Todos`; 4 campos numéricos (`XP`, `Pontos de Atributo Extras`, `Pontos de Habilidade`, `Ouro p/ o Grupo`); `Cancelar` e `Conceder Recompensa`. |
| **12** | `modal-quest` | `max-w-lg`, `z-50` | **Cadastrar / Editar Missão:** `Título`, `Descrição e Objetivos`, 4 campos de recompensa (`Ouro`, `XP`, `Pts Atrib.`, `Pts Hab.`), lista dinâmica `Itens de Recompensa` (`+ Adicionar Item`); `Cancelar` e `Salvar Missão`. |
| **13** | `modal-accept-quest` | `max-w-md`, `z-50` | **Aceitar Missão:** Cartão resumo (título/descrição), select `#accept-quest-char-select` para vincular a ficha, texto informativo sobre entrega de itens; `Cancelar` e `Confirmar & Aceitar`. |
| **14** | `modal-member` | `max-w-2xl`, `max-h-[94vh]`, `z-50` | **Apelido & Permissões do IP:** Inputs `Apelido` e `Endereço IP`; select `Personagem Vinculado`; seletor visual das 10 cores permanentes do cursor (`.cursor-color-swatch`, grid `5`/`10` cols); seção de permissões com select de Preset (`JOGADOR_COMUM`, `SUB_MESTRE`, `ESPECTADOR`, `PERSONALIZADO` e customizados), botão excluir preset customizado, botão `＋ Salvar Preset` e grid `sm:grid-cols-2 md:grid-cols-3` com os 7 cards `.perm-cat-btn` das categorias; rodapé `Remover da Lista`, `Cancelar`, `Salvar Apelido / Dados`. |
| **15** | `modal-perm-category` | `max-w-xl`, `max-h-[92vh]`, `z-[60]` | **Detalhes de Permissões por Categoria:** Cabeçalho com ícone/nome da categoria; barra rápida `Ativar Todas` (`emerald`), `Desativar Todas` (`rose`) e badge `X de Y ativas`; lista de linhas `.perm-row-card` cada uma com nome, descrição e switch `.fantasy-toggle`; rodapé `Concluir / Voltar`. |
| **16** | `modal-save-custom-preset` | `max-w-sm`, `z-[70]` | **Salvar Novo Preset de Permissão:** Input `Nome do Preset` (`maxlength=40`), explicação de disponibilidade global; `Cancelar` e `Salvar Preset`. |
| **17** | `modal-npc` | `max-w-xl`, `max-h-[92vh]`, `z-50` | **Cadastrar / Editar Mercador (NPC):** `Nome`, `Descrição`, busca `#npc-item-search-input` com limpar `✕`, 6 filtros por tipo (`#npc-modal-type-filters`), checklist `#npc-stock-checklist` (checkbox, estoque infinito/quantidade e preço customizado por item); rodapé `Excluir Mercador`, `Cancelar`, `Salvar Mercador`. |
| **18** | `modal-skill-detail` | `w-[95vw] max-w-5xl`, `h-[86vh] max-h-[90vh]`, `z-[70]` | **Detalhes de Habilidade (Passiva / Ativa / Suprema):** Seção superior `Habilidades Adquiridas nas Árvores` (contador, badge `Passivas Ativas: X / 3`, botão `Abrir Árvore de Habilidades` e grid `md:grid-cols-2` dos nós adquiridos); seção inferior `Anotação Manual` com badge `Somente Visualização` (quando aplicável) e `textarea` redimensionável; `Fechar` e `Salvar Anotação Manual`. |
| **19** | `modal-char-inventory` | `w-[96vw] max-w-7xl`, `max-h-[92vh]`, `z-[65]` | **Inventário Dedicado 3×:** Cabeçalho com nome, badge de peso, resumo de ouro/itens e caixa editável `Limite Peso` (`w-16` + `Salvar`); barra de 7 filtros (`Todos`, `Equipados`, 5 categorias) + busca `#inv-modal-search-input`; grid `lg:grid-cols-3` de cards de item (thumbnail, nome, tipo/qtd, selos `EQUIPADO`/`ESCROW`, descrição expansível, linha de efeitos, peso/preço e ações `Equipar`/`Desequipar`, `Usar`, `Transferir`, `Vender`, `Descartar`). |
| **20** | `modal-item-recipient` | `max-w-md`, `z-[75]` | **Escolher Destinatário de Item (Conceder / P2P):** Select `#recipient-char-select`, input numérico `#recipient-item-qty` (`text-base text-center`) com dica de saldo disponível; `Cancelar` e `Confirmar`. |
| **21** | `modal-sell-escrow` | `max-w-md`, `z-[75]` | **Solicitar Venda de Item (Escrow):** Subtítulo com item/ficha, input `#sell-escrow-price-input` (`text-xl`) e dica de preço sugerido; `Cancelar` e `Enviar Solicitação de Venda`. |
| **22** | `modal-purchase-proposals` | `max-w-3xl`, `max-h-[90vh]`, `z-[75]` | **Solicitações de Compras (Barganhas):** Superfície `#12100d`; barra de filtros (`Todas`, `Pendentes`, `Aceitas`, `Recusadas`) + contador; lista de cards exibindo ícone, qtd + item, comprador/mercador, badge de status, horário, preço de tabela riscado vs oferta + `%` de diferença, mensagem opcional e (exclusivo do Mestre em `PENDENTE`) botões `Recusar` e `Aceitar Proposta`; rodapé `Fechar`. |
| **23** | `modal-create-proposal` | `max-w-md`, `z-[80]` | **Fazer Proposta de Compra (Barganha):** Superfície `#12100d`; cartão resumo (item, preço unitário padrão, mercador, comprador); grid 2 colunas `Quantidade (QTD)` e `Valor Total Proposto` (com sufixo `OURO`); textarea `Justificativa / Mensagem Opcional`; `Cancelar` e `Enviar Proposta`. |
| **24** | `modal-subclass-inheritance` | `max-w-2xl`, `max-h-[90vh]`, `z-[75]` | **Herança Opcional de Classe (Subclasse — Nível 15+):** Superfície `#12100d`; select `Outra Classe Base`; Seção 1 (`Troca Opcional de Efeito 1 por 1`: selects `Efeito da Sua Classe` e `Novo Efeito da Outra Classe`); Seção 2 (`Habilidade Herdada Opcional`: select de 1 nó `Talento`/`Ativa`/`Passiva`, excluindo Supremas); `Cancelar` e `Salvar Herança`. |
| **25** | `modal-preferences` | `max-w-lg`, `max-h-[92vh]`, `z-50` | **Preferências & Áudio:** Superfície `#12100d`, ícone `lucide:settings`; Seção 1 (`lucide:bell`): switch `.fantasy-toggle` `Notificações na Tela`; Seção 2 (`lucide:volume-2`): slider `Volume Geral (Master)` (padrão `25%`) + 4 sliders individuais (`Compra de Item`, `Equipar / Desequipar`, `Transferir / Mover`, `Hover em Botões e Menus`, padrão `100%`) cada um com percentual `font-mono` e botão teste `▶`; rodapé `Restaurar Padrão (25%)` e `Fechar`. |
| **26** | `modal-enemy-form` | `max-w-2xl`, `max-h-[92vh]`, `z-50` | **Criar / Editar Inimigo (Bestiário):** `Nome`, `Nível`, `Turnos / Rodada`; upload de avatar circular (`w-14 h-14`); switch `Liberar para Jogadores` (`emerald-600`); 8 campos de Vitais & Combate; 5 Atributos Básicos; 7 Resistências Elementais % (`Zerar 0%`); 7 Limites de Acúmulo; bloco roxo `HABILIDADES GERAIS` (`textarea rows=6`); `Cancelar` e `Salvar Inimigo`. |
| **27** | `modal-spawn-enemy` | `max-w-xl`, `max-h-[85vh]`, `z-50` | **Trazer Inimigo para a Mesa:** Barra de busca `#spawn-enemy-search`; lista scrollável de criaturas do Bestiário com botão de invocação rápida; rodapé `Fechar`. |
| **28** | `modal-general-skills` | `max-w-2xl`, `max-h-[90vh]`, `z-[70]` | **Habilidades Gerais do Inimigo:** Visualização somente leitura em bloco `font-mono whitespace-pre-line` (jogadores) ou `textarea rows=10` editável (Mestre); `Fechar` e `Salvar Alterações`. |
| **29** | `modal-battle-order` | `max-w-4xl`, `max-h-[90vh]`, `z-50` | **Ordem de Iniciativa da Batalha:** Grid 2 colunas (`Disponíveis na Mesa` com `+ Adicionar Todos` à esquerda vs `Fila de Batalha (1º ao Último)` com `Limpar Fila` e itens arrastáveis + setas à direita); rodapé com dica, `Cancelar` e `CONFIRMAR E INICIAR BATALHA`. |
| **30** | `modal-confirm` | `max-w-sm`, `z-[80]` | **Confirmação Genérica:** Ícone centralizado `w-14 h-14 rounded-2xl`, título uppercase em `Cinzel`, mensagem descritiva; rodapé `Cancelar` e `Confirmar`. |
| **31** | `modal-notes` | `max-w-4xl`, `max-h-[92vh]`, `z-[65]` | **Bloco de Notas & Diário:** Cabeçalho esmeralda com nome da ficha e badge de permissão; faixa horizontal de abas `#notes-tabs-container` (com renomear/excluir inline) + botão tracejado `+ Nova Página`; toolbar `#notes-toolbar` em 6 grupos (`B/I/U/S`, `H1/H2/P/Citação/Linha`, listas + `Checklist`, popovers de 8 cores de texto e 6 destaques + `Tx`, `Undo`/`Redo`, e busca interna com `↓`); corpo `#notes-content-editor` (`#0c0d12`); rodapé com contador `palavras • caracteres` e status `Salvando...` / `Salvo`. |
| **32** | `modal-new-note-page` | `max-w-sm`, `z-[75]` | **Nova Página de Notas:** Borda `emerald-500/40`; input `Título da Página` (`maxlength=40`), mensagem de erro inline; `Cancelar` e `Criar Página`. |
| **33** | `modal-skill-tree` | `w-[96vw] h-[92vh]`, `z-[72]` | **Árvore de Habilidades — Layout Radial 4 Quadrantes (`.sk-shell`):** Cabeçalho `.sk-header` com ícone `.sk-title-icon`, título, select de personagem, dropdown `.sk-dd` de árvores/classes, busca `#st-modal-search-input`, pílula `Passivas Ativas: X / 3`, pílula `Pontos de Talento` (com `-1`/`+1` do Mestre), `Reembolsar Árvore` e toolbar de gestão (`Nova Árvore`, `Editar`, `Duplicar`, `Excluir`, `Novo Nó`). Palco `.sk-stage` em grid 3 colunas (`1fr | 240–300px | 1fr`) × 2 linhas: 4 quadrantes coloridos (grade `2×3` de slots `.sk-slot` com barras segmentadas `.sk-segs` + paginador `ABA 1/2/3`), conectores SVG `.sk-connectors` e núcleo central `.sk-core` (medalhão SVG `160×160px` + cartão `.sk-core-effect` abaixo). Empilha em coluna única abaixo de `1000px`. **Painéis Flutuantes:** `.sk-inspector` (`width: 360px`, `z-index: 20`, posicionado dinamicamente ao lado do slot ou ancorado na base em `<1000px`, com badges, progresso, tags de combate, descrição, melhoria, modificadores, switch `.fantasy-toggle`, `Liberar`/`+ Melhorar`/`- Reembolsar` e ferramentas do Mestre) e `.sk-tooltip` (`width: 250px`, `z-index: 25`, preview rápido no hover). |
| **34** | `modal-skill-tree-form` | `max-w-2xl`, `max-h-[92vh]`, `z-[80]` | **Criar / Editar Árvore ou Classe/Subclasse:** `Nome`, checkboxes `Ocultar para Jogadores` e `É uma Subclasse? (Nível 15+)`, `Descrição`, seção dourada `Efeito de Árvore Completa (100%)` / `Efeito de Classe` (`Descrição Textual` + lista dinâmica de modificadores `FLAT`/`%`); rodapé `Excluir`, `Cancelar`, `Salvar`. |
| **35** | `modal-skill-node-form` | `max-w-2xl`, `max-h-[92vh]`, `z-[82]` | **Criar / Editar Nó da Árvore:** Select `Categoria` (`TALENTO`, `PASSIVA`, `ATIVA`, `SUPREMA`); `Nome` + `Subtipo / Tag`; `Descrição Completa`; seção condicional para `TALENTO` (`Ranks Máximos` e `Custo por Nível`) ou para `PASSIVA`/`ATIVA`/`SUPREMA` (`Custo de Liberação`, `Qtd. Melhorias Extras`, `Custo por Melhoria`, `Descrição da Melhoria`); bloco índigo `Metadados de Combate` (`Custo de Mana`, `Custo de PA`, `Usos`, `Recarga`, e campo exclusivo `Cargas` visível apenas em `SUPREMA`); construtor `Efeitos Matemáticos` (`.fantasy-dropdown-wrapper`); rodapé `Excluir Nó`, `Cancelar`, `Salvar Nó`. |
| **36** | `modal-race-form` | `max-w-2xl`, `max-h-[92vh]`, `z-[84]` | **Criar / Editar Raça ou Sub-raça:** `Nome`, select `Tipo` (`Raça Base`/`Sub-raça`), `Bônus Inicial (Pts de Talento)`, select condicional `Raça Base Vinculada (Pai)`, textarea `Descrição / Traços Narrativos`, construtor `Modificadores Matemáticos da Raça (FLAT / %)`; rodapé `Excluir Raça`, `Cancelar`, `Salvar Raça`. |
| **37** | `modal-image-cropper` | `max-w-md`, `z-[95]` | **Editor de Imagem Circular:** Painel neutro `#2b2d31`, palco `#cropper-stage` (`h-[320px]`, `#1e1f22`, canvas `360×320px` com arraste livre e máscara circular), barra de controle com slider `.cropper-zoom-range` (`1x–3x`) + botão girar 90° (`#btn-cropper-rotate`); rodapé `#232428` com `Redefinir`, `Cancelar` (`#383a40`) e `Aplicar` (`#5865f2`). |
| **38** | `modal-image-viewer` | Tela cheia (`max-w-[90vw] max-h-[82vh]`), `z-[150]` | **Visualizador de Arte em Tela Cheia:** Fundo `bg-black/90 backdrop-blur-md` com fade-in `0.18s`, botão circular fechar `✕` fixo no canto superior direito (`w-11 h-11 rounded-full z-[155]`), imagem centralizada com borda dourada (`border-amber-500/40`) e legenda em pílula `Cinzel` (`#image-viewer-caption`). Fecha por clique fora ou tecla `ESC`. |

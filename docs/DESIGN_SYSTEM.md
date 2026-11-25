# Design System — CMrpg (Dark Fantasy Medieval Fosco)

Este documento registra todos os tokens visuais, paleta de cores, tipografia, componentes, padrões de interação e iconografia extraídos diretamente de `static/styles.css`, `static/index.html` e dos módulos em `static/js/`.

---

## 1. Identidade Visual & Diretriz Fosca

O **CMrpg** adota estética **Dark Fantasy Medieval** construída sobre superfícies em **carvão profundo** e acentos em **ouro mate envelhecido**, priorizando legibilidade prolongada em sessões longas de RPG de mesa.

### Proibição Estrita de Efeitos Luminosos
Para evitar poluição visual e fadiga ocular, a diretriz do projeto **proíbe efeitos luminosos / neon** em componentes de interface:
- **Zero neon e zero `text-shadow` brilhante:** títulos, labels, badges e itens de menu mantêm `text-shadow: none`.
- **Zero `box-shadow` luminoso (glow):** classes críticas como `.stat-overflow-glow`, `.card-active-turn`, `.action-pill-notes`, toda a suíte `.fantasy-dropdown-*` e toda a interface `.sk-*` da Árvore Radial forçam `box-shadow: none` e substituem brilhos por **bordas sólidas em ouro mate** ou variação tonal de fundo.
- **Zero contornos azuis nativos de navegador:** inputs, selects, dropdowns customizados e botões removem o `outline` padrão azul do browser (`outline: none`) e aplicam foco exclusivamente via borda dourada mate (`var(--gold-primary)` / `#c8aa6e99`).
- **Única Exceção Controlada:** o efeito contínuo **RGB Chroma** (`.cursor-master-rgb`, keyframes `rgb-smooth-*` em ciclo linear de `6s`) é reservado **exclusivamente** ao cursor colaborativo e indicador de presença do **Mestre (Host)**.

---

## 2. Paleta de Cores Completa (Tokens CSS e Hexadecimais Reais)

### 2.1 Fundos e Superfícies (`:root`, `html[data-theme="dark"]` e Componentes)
| Token / Uso | Valor Real | Aplicação Principal |
| :--- | :--- | :--- |
| `--bg-obsidian` | `#0a0908` | Fundo mais profundo, trilha da scrollbar e viewport da Mesa |
| `--bg-sidebar` | `#0e0c0a` | Sidebar esquerda, sidebar de batalha direita e cabeçalhos de modais (`.app-modal-header`) |
| `--bg-main` | `#110f0c` | Fundo principal do `<body>` e área de conteúdo |
| Carvão Fosco Base | `#12100d` | Painel de modais modernos (`modal-preferences`), `.fantasy-dropdown-trigger`, `.fantasy-dropdown-menu` e `.sk-shell`/`.sk-stage` |
| Cabeçalho Árvore | `#14110e` | `.sk-header` |
| `--bg-card` | `#171410` | Superfície padrão de `.fantasy-card`, `.char-card` e `.modal-panel` |
| Painéis Internos Árvore | `#181512` | `.sk-title-icon`, `.sk-dd-trigger`, `.sk-dd-menu`, `.sk-pill`, `.sk-btn`, `.sk-core-effect`, `.sk-inspector`, `.sk-tooltip` |
| `--bg-card-elevated` | `#1e1a15` | Hover em pills da topbar (`.topbar-wallet-pill:hover`) e superfícies elevadas |
| `--bg-card-hover` | `#241f19` | Estado hover de superfícies de card |
| `--bg-input` | `#0d0b09` | Fundo de campos `.app-input` e linhas `.resistance-row` |
| `--bg-pill` | `#211c16` | Botões neutros (`.app-secondary-btn`, `.app-icon-btn`, `.action-pill`, `.attr-op-btn`) |
| `--bg-pill-hover` | `#2c251d` | Estado hover de botões neutros e action pills |
| `--bar-track` | `#090807` | Trilha vazia das barras de progresso (`.stat-bar-track`) |
| Backdrop de Modais | `rgba(5, 4, 3, 0.78)` | `.modal-backdrop` com `backdrop-filter: blur(6px)` |
| Topbar Translúcida | `rgba(14, 12, 10, 0.88)` | `.app-topbar` com `backdrop-filter: blur(10px)` |

### 2.2 Destaques em Ouro Mate e Bordas
| Token | Valor Real | Aplicação |
| :--- | :--- | :--- |
| `--gold-primary` | `#d4a853` | Títulos dourados (`.gold-title`), foco de inputs, indicador ativo na sidebar, badges |
| `--gold-bright` | `#f0c674` | Hover de ícones/links, texto de `.btn-gold-outline`, bordas de avatar circular |
| Ouro Mate Radial | `#c8aa6e` | Paleta da Árvore Radial (`.sk-*`), conectores SVG, dropdown `.fantasy-dropdown-*` |
| `--gold-muted` | `#9a7836` | Divisores ornamentais (`.gold-diamond-divider`) e metadados secundários |
| `--gold-border` | `rgba(212, 168, 83, 0.22)` | Bordas sutis de cards, banner e modais |
| `--gold-border-strong` | `rgba(212, 168, 83, 0.48)` | Bordas de botões outline, topbar pills e viewport da Mesa |
| `--border-subtle` | `rgba(255, 244, 224, 0.08)` | Divisores internos (`.app-divider-border`), bordas de cards em repouso |
| `--border-medium` | `rgba(255, 244, 224, 0.14)` | Bordas de `.app-input` e `.app-secondary-btn` |

### 2.3 Tipografia de Texto
| Token | Valor Real | Uso |
| :--- | :--- | :--- |
| `--text-primary` | `#f5efe6` | Títulos principais, inputs e dados primários |
| `--text-secondary` | `#d6cbb9` | Labels (`.app-label`) e textos de apoio |
| `--text-muted` | `#8c8273` | Subtítulos, breadcrumbs, metadados e placeholders |

### 2.4 Cores Semânticas, Barras de Progresso e Status
- **Vida (`.stat-bar-hp`):** `linear-gradient(90deg, #b91c1c 0%, #ef4444 65%, #f87171 100%)` | ícone `.icon-hp`: `#e11d48`
- **Armadura (`.stat-bar-armor`):** `linear-gradient(90deg, #0369a1 0%, #0ea5e9 65%, #7dd3fc 100%)` | ícone `.icon-armor`: `#60a5fa`
- **Mana (`.stat-bar-mana`):** `linear-gradient(90deg, #4338ca 0%, #6366f1 65%, #a855f7 100%)` | ícone `.icon-mana`: `#38bdf8`
- **XP (`.stat-bar-xp`):** `linear-gradient(90deg, #b45309 0%, #d97706 60%, #fbbf24 100%)`
- **Ouro / Dano:** `.icon-gold`: `#fbbf24` | `.icon-dmg`: `#f97316`
- **Carmesim / Combate / Perigo:** `--crimson-bg: rgba(153, 27, 27, 0.22)`, `--crimson-border: rgba(220, 38, 38, 0.45)`, `--crimson-text: #fca5a5`
- **Ataque vs. Arcana:** `.stat-badge-attack` (`#ef4444` sobre `rgba(239, 68, 68, 0.12)`) | `.stat-badge-arcana` (`#3b82f6` sobre `rgba(59, 130, 246, 0.12)`)
- **Buffs vs. Nerfs:** `.buff-item-card` (`rgba(6, 78, 59, 0.2)`, borda `rgba(16, 185, 129, 0.35)`) | `.nerf-item-card` (`rgba(136, 19, 55, 0.2)`, borda `rgba(244, 63, 94, 0.35)`)
- **Botão de Notas (`.action-pill-notes`):** fundo `#064e3b`, borda `#059669`, texto `#a7f3d0` (hover `#065f46` / `#10b981` / `#ecfdf5`, sem sombra)

### 2.5 As 4 Paletas Foscas dos Quadrantes da Árvore de Habilidades
| Quadrante | Posição | Fundo (`--q-bg`) | Borda (`--q-border`) | Acento (`--q-accent`) |
| :--- | :--- | :--- | :--- | :--- |
| **Passivas** (`.sk-quad-passiva`) | Superior Esquerdo | `#131b24` | `#2a3f54` | `#8aaccc` |
| **Talentos** (`.sk-quad-talento`) | Superior Direito | `#1f1a12` | `#4a3c23` | `#c8aa6e` |
| **Ativas** (`.sk-quad-ativa`) | Inferior Esquerdo | `#1b1424` | `#3d2b54` | `#b394d6` |
| **Supremas** (`.sk-quad-suprema`) | Inferior Direito | `#241315` | `#54282d` | `#d08c93` |

---

## 3. Tipografia e Escala

Carregada via Google Fonts em `static/index.html` e mapeada no `tailwind.config`:

| Família | Classe / Uso | Pesos | Aplicação |
| :--- | :--- | :--- | :--- |
| **`Cinzel`** | `.font-serif-fantasy` / `font-serif` | `600`, `700`, `800`, `900` | Títulos da sala, cabeçalhos de seção, links da sidebar (`11px`, uppercase, `letter-spacing: 0.08em`), títulos de modais, nomes de personagens, cabeçalhos dos 4 quadrantes (`.sk-quad-title`), medalhão central (`.sk-core-pct` `28px`) e botões primários uppercase. |
| **`Inter`** | Padrão do `body` / `font-sans` | `400`–`900` | Rótulos de formulário, descrições de itens/habilidades, corpo do Bloco de Notas, textos auxiliares, tooltips e itens de dropdown. |
| **`JetBrains Mono`** | `font-mono` | `500`, `700` | Atributos numéricos, HP/Armadura/Mana/PA, badges de nível (`NV.`), preços em ouro, pesos (`kg`), endereços IP, contadores de página, modificadores (`.sk-mod`, `.sk-chip`) e badges de status. |

---

## 4. Biblioteca de Componentes e Padrões de Interação

### 4.1 Hierarquia de Botões (Raio Padrão `8px` / `rounded-lg`)
Todos os botões principais adotam **`border-radius: 8px`** (`rounded-lg`), organizados em **3 níveis hierárquicos + variante destrutiva**:

1. **Nível 1 — Primário (`.btn-gold` / `.sk-btn-gold`):**
   - `.btn-gold`: gradiente dourado mate `linear-gradient(180deg, #deb562 0%, #c4963c 100%)`, texto escuro `#14100a`, borda `#f0c674`, `font-weight: 800`, `border-radius: 8px`.
   - `.sk-btn-gold` / `.sk-act-btn`: versão plana fosca `#c8aa6e` com texto `#12100d` na Árvore Radial.
   - Uso: ação principal da tela ou confirmação de modal (`CRIAR`, `COPIAR LINK`, `INICIAR BATALHA`, `Salvar`, `Aceitar Proposta`).
2. **Nível 2 — Secundário (`.btn-gold-outline`):**
   - Fundo `rgba(212, 168, 83, 0.1)`, texto `--gold-bright`, borda `var(--gold-border-strong)`, `border-radius: 8px`.
   - Uso: ações relevantes não-primárias (`Editar Sala`, `XP em Lote`, `Transferir`, `Vender`, `Pré-Cadastrar IP`).
3. **Nível 3 — Neutro (`.app-secondary-btn` e `.app-icon-btn`):**
   - `.app-secondary-btn`: fundo `var(--bg-pill)` (`#211c16`), borda `var(--border-medium)`, texto `var(--text-secondary)`.
   - `.app-icon-btn`: botões quadrados de ação rápida (`w-9 h-9 rounded-lg`).
   - Uso: `Cancelar`, `Fechar`, filtros inativos, navegação de câmera da Mesa, `Desfazer`/`Refazer`, paginação.
4. **Variante Danger / Destrutivo:**
   - `.action-pill-damage` (`rgba(185, 28, 28, 0.18)`, borda `rgba(239, 68, 68, 0.35)`, texto `#fca5a5`), `.sk-btn-danger` (`border #6b3036`, texto `#d89aa0`) e controles `rose-*` (`Recusar`, `Despachar Inimigo`, `Excluir`, `Trazer Inimigo`).

### 4.2 Inputs, Campos Numéricos e Dropdowns Customizados
- **`.app-input`:** fundo `var(--bg-input)` (`#0d0b09`), texto `var(--text-primary)`, borda `var(--border-medium)`, `border-radius: 8px`. No foco, altera apenas a borda para `var(--gold-primary)` com `outline: none`.
- **Inputs Numéricos:** seguem estilo limpo em `font-mono` alinhado ao centro ou à direita (ex.: quantidade na loja `w-14 text-center`, preço customizado `w-24 text-right`), com foco sem contornos azuis nativos.
- **Dropdown Customizado Fosco (`.fantasy-dropdown-wrapper`):**
  - Substitui selects nativos em contextos estilizados com trigger `.fantasy-dropdown-trigger` (`#12100d`, borda `#c8aa6e33`, `border-radius: 7px`, `box-shadow: none`, `text-shadow: none`) e chevron SVG rotacionável (`180deg` quando `aria-expanded="true"`).
  - **Posicionamento Dinâmico (Acima ou Abaixo):** o manipulador global em `06-events-init.js` mede `spaceAbove` e `spaceBelow` em relação à viewport: se `spaceAbove < 160 && spaceBelow > spaceAbove`, abre o `.fantasy-dropdown-menu` para baixo (`top: calc(100% + 4px)`); caso contrário, abre para cima (`bottom: calc(100% + 4px)`).
  - Suporta cabeçalhos de grupo (`.fantasy-dropdown-group-header`), rolagem fina personalizada (`6px`) e item selecionado `.is-selected` (`#1e1913`, texto `#ffd88a` com ícone de check).

### 4.3 Cards e Containers
- **Card de Personagem / Inimigo (`.char-card.character-card-with-avatar`):**
  - Container `border-radius: 12px`, fundo `var(--bg-card)`, padding superior ampliado (`padding-top: 36px`, `margin-top: 32px`) para acomodar o **avatar circular no topo (`64 × 64 px`)** posicionado em `top: -32px` centralizado (`left: 50%`, `translateX(-50%)`).
  - Anel do avatar: `2.5px solid var(--gold-bright)` para heróis e `.enemy-avatar-ring` (`#fb7185`) para inimigos; possui `.image-viewer-trigger` (`cursor: zoom-in`).
  - Cabeçalho: nome arrastável (`.char-drag-handle`), badges (`INIMIGO`, `NV. X`, `Turnos/Rodada`, `Turnos: N`) e botões rápidos no canto superior direito (`.char-top-actions`).
  - Metadados: mini barra de XP, proprietário, badges de Raça/Sub-raça e Classe/Subclasse, pontos de habilidade livres.
  - Grade de Status Táticos: pílulas compactas para `PA` (com botões `-`/`+`), `DEF`, `Ataque`/`Arcana`, `REGEN %` e `Peso kg`.
  - Barras de Progresso: `Vida`, `Armadura` e `Mana` (`h-3 rounded-full`), com classe `.stat-overflow-glow` (`border: 2px solid var(--gold-primary); box-shadow: none`) quando atual > máximo.
  - Rodapé de 5 ações rápidas (`Dano`, `Vida`, `Armadura`, `Mana`, `Resetar`) + botões `Notas`, `Inventário` e `Ficha`.
- **Modo Compacto na Mesa (`.card-compact-mode` / `.mesa-token-compact`):**
  - Caixa fixa de **`72 × 96 px`** sem área fantasma transparente capturando cliques indevidos.
  - Token circular `.compact-token-circle` (`68 × 68 px`), botão inferior `.btn-expand-full-mode` (`44 × 22 px`) e etiqueta `.compact-token-label` abaixo do círculo.
- **Cards da Loja e Bestiário:**
  - **Loja:** cards alinhados verticalmente com `flex-col justify-between`, thumbnail `36×36` (`.w-9.h-9`), badge de preço e estoque, campo de preço customizado (Mestre) e rodapé unificado (`Qtd` + `Comprar` + `Fazer Proposta`).
  - **Bestiário:** grade de até 6 criaturas por página com avatar circular superior em anel carmesim, badge `Liberado`/`Oculto`, chips das 7 resistências elementais e dos 7 acúmulos.

### 4.4 Modais, Painéis Flutuantes, Toasts, Toggles e Cursores
- **Modais:** `.modal-backdrop` (`rgba(5, 4, 3, 0.78)` + `blur(6px)`), `.modal-panel` (`border: 1px solid var(--gold-border)`, animação `scaleUp` de `0.16s`) e `.app-modal-header` (`--bg-sidebar`).
- **Painel de Inspeção e Tooltip da Árvore:**
  - `.sk-inspector`: painel flutuante de `360px` (`#181512`, borda `#c8aa6e80`, `border-radius: 12px`).
  - `.sk-tooltip`: tooltip rápido de `250px` (`#181512`, borda `#c8aa6e66`, `border-radius: 10px`, `pointer-events: none`).
- **Toasts (`.toast-item`):** exibidos no canto superior direito (`#toast-container`, `z-[120]`, `max-w-sm`), com animações `toastSlideIn` (`0.26s`) e `toastSlideOut` (`0.2s`).
- **Toggle Switches (`.fantasy-toggle`):**
  - Padrão `44 × 24 px` (e variante densa `.fantasy-toggle-sm` `32 × 18 px` usada em Buffs/Nerfs).
  - Estado inativo: trilho escuro `rgba(24, 24, 27, 0.9)`, pino metálico `#a1a1aa → #71717a`.
  - Estado ativo: trilho esmeralda `rgba(16, 185, 129, 0.35) → rgba(5, 150, 105, 0.5)`, borda `#10b981`, pino `#6ee7b7 → #10b981`.
- **Cursores Colaborativos (`.multiplayer-cursors-layer`):**
  - Seta SVG (`22 × 22 px`) + badge arredondado (`.remote-cursor-badge`) + pílulas na sidebar (`.sidebar-cursor-pill`).
  - Jogadores usam 1 das **10 cores permanentes** (`#FF595E`, `#3B82F6`, `#10B981`, `#F59E0B`, `#A855F7`, `#06B6D4`, `#F97316`, `#EC4899`, `#84CC16`, `#818CF8`); o Mestre usa `.cursor-master-rgb` com animação contínua de 6 segundos.

---

## 5. Iconografia Híbrida (`Iconify 2.1.0`)

A interface combina dois conjuntos de ícones via `<iconify-icon>` para separar controles de sistema da ambientação medieval:

- **`lucide:*` — Controles Limpos de UI:**
  - Utilizado em configurações, notificações e controles de interface utilitários: `lucide:settings`, `lucide:bell`, `lucide:bell-off`, `lucide:volume-2`.
- **`game-icons:*` — Elementos Temáticos de RPG:**
  - Utilizado em navegação, atributos, combate, itens, economia e bestiário:
    - Navegação: `game-icons:castle`, `game-icons:tabletop-players`, `game-icons:character`, `game-icons:knapsack`, `game-icons:shop`, `game-icons:monster-grasp`, `game-icons:tied-scroll`, `game-icons:family-tree`, `game-icons:cog-lock`.
    - Status & Combate: `game-icons:heart-bottle`, `game-icons:breastplate`, `game-icons:crystal-bars`, `game-icons:lightning-branches`, `game-icons:dragon-shield`, `game-icons:broadsword`, `game-icons:crystal-wand`, `game-icons:crossed-swords`, `game-icons:crowned-skull`.
    - Atributos & Acúmulos: `game-icons:biceps`, `game-icons:bow-arrow`, `game-icons:spell-book`, `game-icons:owl`, `game-icons:conversation`, `game-icons:ice-cube`, `game-icons:bleeding-wound`, `game-icons:ifrit`, `game-icons:poison-bottle`, `game-icons:knockout`.
    - Economia, Árvore & Utilidades: `game-icons:two-coins`, `game-icons:trade`, `game-icons:chest`, `game-icons:crown`, `game-icons:quill-ink`, `game-icons:magnifying-glass`, `game-icons:compass`, `game-icons:expand`, `game-icons:sparkles`, `game-icons:weight`, `game-icons:dna1`, `game-icons:crested-helmet`.

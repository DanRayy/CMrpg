# ADR-010: Frontend Modular em Vanilla JS (`01` a `06`), Cache Local e Web Audio API

- **Status:** Aceito (Em Produção)

## Contexto

O cliente do CMrpg precisa abrir instantaneamente em qualquer navegador conectado via Radmin VPN sem exigir Node.js, Webpack/Vite ou etapa de compilação na máquina do Mestre, mantendo organização de código legível e suporte a efeitos sonoros com reprodução reversa.

## Decisão

1. **Módulos JavaScript Ordenados sem Bundler (`static/js/`):**
   - `01-core-state.js`: constantes, `AudioManager`, 32 permissões, motor cliente de derivados e estado global.
   - `02-websocket-combat.js`: conexão WebSocket `/ws`, cursores colaborativos, rotina de turnos e sidebar de batalha.
   - `03-tabs-renderers.js`: renderização das abas (`overview`, `characters`, `catalog`, `shop`, `bestiary`, `quests`, `skill-trees`, `admin`) e cards completos/compactos.
   - `04-modals-character-buffs.js`: fichas, Point Buy, recorte circular de avatar, dano, buffs/nerfs, árvores radiais, classes/subclasses (Herança Nv.15+) e raças.
   - `05-modals-notes-inventory-bestiary.js`: Bloco de Notas multi-páginas com autosave, inventário 3×, transferências, Escrow, propostas de barganha, bestiário e modal de permissões.
   - `05b-mesa-board.js`: tabuleiro virtual compartilhado (`4800 × 3000 px`), colisão AABB, câmera e interpolação 60 FPS.
   - `06-events-init.js`: binding global de eventos, dropdowns dinâmicos `.fantasy-dropdown-*`, preferências e inicialização (`init()`).
2. **Resiliência Local:** fallback de cache em `localStorage` (`cmrpg_full_state_v2`), preferências de notificações e áudio isoladas localmente e reconexão automática do WebSocket.
3. **`AudioManager` com Web Audio API:** reprodução dos arquivos em `static/sounds/` (Master padrão `25%`) e síntese reversa em memória (`AudioContext` + inversão de `AudioBuffer`) ao desequipar itens.

## Consequências

- **Positivas:** deploy imediato sem build step, edição direta de arquivos estáticos e zero dependências npm em produção.
- **Negativas:** ordem de carregamento das tags `<script>` em `static/index.html` deve ser preservada.

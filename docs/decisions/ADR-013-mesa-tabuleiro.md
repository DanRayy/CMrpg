# ADR-013: Arquitetura da Aba "Mesa" — Tabuleiro Virtual, Modo Compacto e Colisão AABB

- **Status:** Aceito (Em Produção)

## Contexto

O CMrpg precisava de um tabuleiro virtual compartilhado em tempo real (`#tab-mesa`) que mantivesse 100% dos controles ricos dos cards HTML sem reescrever fichas em `<canvas>`, oferecendo câmera individual, colisão física determinística, tokens compactos para batalhas com muitos combatentes, arraste remoto suave a 60 FPS e divisão automática de zonas em combate.

## Decisão

1. **DOM Real com Transformações CSS (`translate3d` + `scale`):**
   - `#mesa-world` (`4800 × 3000 px`) hospeda tokens `.mesa-token` renderizados com `buildCharacterCardHtml(..., { forMesa: true })` e monitorados por `ResizeObserver`.
   - A câmera individual (`x`, `y`, `zoom` entre `0.25` e `1.50`, padrão `0.75`) é persistida em `localStorage` e em `state.table.views[memberId]`, com qualidade de renderização ajustável (`1x`, `1.5x`, `2x`).
2. **Motor de Geometria e Colisão AABB Simétrico (`table_engine.py` ↔ `05b-mesa-board.js`):**
   - Funções idênticas no servidor e no cliente (`get_allowed_region`, `clamp_to_region`, `rects_overlap`, `slide_move`, `nearest_free`, `resolve_move`) validadas por `tests/test_table_engine.py`, `tests/test_table_ws.py` e `tests/mesa-geometry.test.mjs` usando `tests/fixtures/collision_cases.json`.
   - Movimentação livre na Mesa para participantes conectados (`can_move_card`), com autoridade final de limites e colisão no servidor e revisão incremental (`table.rev`).
3. **Modo Compacto (`72 × 96 px`) e Interpolação a 60 FPS:**
   - Cada card na Mesa possui toggle para **Modo Compacto** (`char.mesaCompact`), reduzindo o token para círculo de `68 × 68 px` em caixa `72 × 96 px` e atualizando imediatamente a hitbox em `resolve_char_size`.
   - O arraste remoto usa pacotes leves `REMOTE_CARD_DRAG` (throttle `35 ms`) interpolados via `requestAnimationFrame` (`LERP_FACTOR = 0.22`) com watchdog de `400 ms`.
4. **Modo de Batalha (`y = 1500`) e `graveyard`:**
   - `enter_battle` divide o tabuleiro em `y = 1500` (Inimigos acima, Heróis abaixo), realocando apenas cards fora de sua região ou em colisão.
   - `state.table.graveyard` preserva até `50` posições de fichas excluídas para recuperação exata em operações `Undo`.

## Consequências

- **Positivas:** zero duplicação de interface de fichas, 60 FPS durante arraste simultâneo, paridade matemática garantida por testes automatizados em Python e Node.js.
- **Negativas:** requer manutenção espelhada entre `table_engine.py` e `05b-mesa-board.js` sempre que regras geométricas forem alteradas.

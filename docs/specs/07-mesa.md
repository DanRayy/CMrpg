# Especificação 07: Aba "Mesa" (Tabuleiro Virtual Compartilhado)

## 1. Visão Geral do Tabuleiro

A aba **Mesa** (`#tab-mesa`) implementa um **tabuleiro virtual compartilhado em tempo real** (`4800 × 3000 px`) sobre DOM + CSS `translate3d` / `scale`, preservando dentro do próprio tabuleiro todas as fichas de personagens e instâncias de inimigos com seus controles completos, além de suportar **Modo Compacto**, **câmera individual**, **interpolação fluida a 60 FPS**, **colisão física AABB determinística** e **divisão automática de batalha**.

---

## 2. Mundo, Dimensões e Paridade de Colisão AABB

O motor de geometria é implementado de forma simétrica em **`table_engine.py`** (servidor) e **`static/js/05b-mesa-board.js`** (cliente), validado contra a mesma suíte de cenários em `tests/fixtures/collision_cases.json` (`pytest` + `node --test`):

- **Dimensões do Mundo:** `4800 × 3000 px` (`DEFAULT_WORLD_WIDTH`, `DEFAULT_WORLD_HEIGHT`), sem grade rígida.
- **Dimensões dos Cards:**
  - **Modo Completo:** largura padrão `420 px` (`DEFAULT_CARD_WIDTH`) × altura dinâmica monitorada via `ResizeObserver` (fallback `468 px`, sanitizado entre `64..720` × `64..1200`).
  - **Modo Compacto:** dimensões fixas **`72 × 96 px`** (`COMPACT_CARD_WIDTH`, `COMPACT_CARD_HEIGHT`).
- **Limites e Não-Sobreposição Estrita (AABB):**
  - Limiar de `4 px` (`MESA_DRAG_THRESHOLD_PX`) distingue cliques em botões internos do card de operações de arraste.
  - Nenhum card pode ultrapassar as bordas do mundo (`0 <= x <= world.w - w`, `0 <= y <= world.h - h`).
  - Durante o arraste e no drop (`resolve_move` / `mesaResolveMove`), o motor aplica deslizamento pelos eixos X e Y (`slide_move`) quando em movimento contínuo próximo a obstáculos, ou projeta para a posição livre mais próxima (`nearest_free` com Nível 1 nas bordas, Nível 2 nos cantos e varredura em grade como fallback), impedindo sobreposição.
- **Autoridade do Servidor:** todo drop (`table_move` / `REMOTE_CARD_DROP`) é revalidado no servidor (`state_manager.move_table_card`), incrementando `state.table.rev` e propagando `table_update` (ou `table_move_rejected` em caso de erro).
- **Movimentação na Mesa:** todos os participantes conectados podem posicionar e arrastar livremente fichas e inimigos pela Mesa (`can_move_card` / `canMoveCharacterOnMesa`), respeitando os limites físicos e as zonas de batalha quando ativas.

---

## 3. Câmera e Zoom Individuais

A câmera (`x`, `y`, `zoom`) é estritamente **individual por usuário** — mover ou dar zoom nunca afeta a tela de outro jogador:
- **Faixa de Zoom:** **`25%` (`0.25`) a `150%` (`1.50`)**, padrão **`75%` (`0.75`)**.
- **Navegação:**
  - `Roda do mouse` (`wheel`): zoom ancorado exatamente na posição do cursor.
  - `Botão do meio` ou `Espaço + arrastar` com botão esquerdo: pan livre pela Mesa.
- **Barra de Ferramentas da Mesa:** botões **Centralizar** (`#btn-mesa-center`, foca nas fichas do usuário), **Ver Tudo** (`#btn-mesa-fit`, enquadra todos os cards na tela), **`−`**, **`+`** e **Padrão** (`75%`).
- **Qualidade Gráfica:** suporte a níveis de renderização `1x`, `1.5x` e `2x` (`updateTableRenderQuality`) com re-rasterização automática ao finalizar zoom para manter nitidez de texto e bordas.
- **Persistência Individual:** salva em `localStorage` e sincronizada no servidor por `memberId` em `state.table.views[memberId]` via mensagem WebSocket `table_view`.

---

## 4. Modo Compacto (Tokens Circulares `72 × 96 px`)

Exclusivo da aba **Mesa** (`char.mesaCompact`):
- Na parte inferior de cada card completo na Mesa há o botão **Modo Compacto** (`.btn-toggle-compact-mode`).
- Ao recolher, o card assume formato de **Token Circular** de **`72 × 96 px`** (`.card-compact-mode` / `.mesa-token-compact`), composto por:
  - Círculo de **`68 × 68 px`** (`.compact-token-circle`) com o avatar recortado (borda dourada para heróis, `#fb7185` para inimigos, `#ef4444` dessaturado quando morto e destaque dourado no turno atual).
  - Botão inferior retrátil (`.btn-expand-full-mode`, `44 × 22 px`) para retornar ao **Modo Completo**.
  - Tag flutuante inferior (`.compact-token-label`) exibindo nome e nível (ou nome do inimigo).
- A alternância (`toggleCharacterCompactMode`) ajusta imediatamente a hitbox AABB no cliente e no servidor (`resolve_char_size`) sem área fantasma invisível.

---

## 5. Interpolação Fluida de Arraste Remoto a 60 FPS

Para proporcionar feedback visual contínuo sem sobrecarregar disco ou rede:
1. Enquanto um participante arrasta um card na Mesa, o cliente envia pacotes leves `REMOTE_CARD_DRAG` com throttle de **`35 ms`** (`MESA_DRAG_THROTTLE_MS`) e delta mínimo de `2 px`.
2. O servidor valida o preview em memória (`preview_table_drag`, sem gravar em `state.json`) e repassa via `broadcast_except` para os demais participantes.
3. Os clientes remotos aplicam interpolação linear (`LERP_FACTOR = 0.22`, `MIN_DELTA = 0.2`) em loop `requestAnimationFrame` (`stepMesaInterpolations`), exibindo borda azul (`.mesa-token-remote-dragging`) e o badge flutuante `"Arrastando: <Usuário>"` com watchdog de **`400 ms`**.
4. Ao soltar o card, `REMOTE_CARD_DROP` confirma a posição definitiva no servidor.

---

## 6. Modo de Batalha e Divisão Horizontal (`y = 1500`)

- **Ao Iniciar Batalha (`enter_battle`):**
  - `state.table.battle.active` passa para `true`, salvando um `snapshot` pré-batalha e dividindo o tabuleiro horizontalmente em **`y = 1500`** (`world_h // 2`):
    - **Região Superior (`0 <= y <= 1500 - h`):** exclusiva para **Inimigos** (`isEnemy: true`).
    - **Região Inferior (`1500 <= y <= 3000 - h`):** exclusiva para **Personagens dos Jogadores** (`!isEnemy`).
  - Cards já posicionados no lado correto e sem colisão permanecem imóveis; apenas cards fora de sua metade ou em conflito são realocados para a posição livre mais próxima dentro de sua respectiva região.
  - Durante a batalha, o motor de colisão impede que um card atravesse a fronteira central (`#mesa-battle-divider`).
- **Ao Encerrar Batalha (`exit_battle`):**
  - Restaura a movimentação livre por todo o tabuleiro (`4800 × 3000 px`), preservando as posições alcançadas pelos personagens e inimigos.

---

## 7. Permanência Offline e Recuperação no `Undo/Redo`

- **Permanência Offline:** a desconexão de um jogador nunca remove sua ficha da Mesa. Um card só sai do tabuleiro quando a ficha é excluída permanentemente ou quando uma instância de inimigo é despachada.
- **Recuperação via Cemitério de Posições (`state.table.graveyard`):** ao excluir uma ficha, sua última posição `(x, y)` e tamanho `(w, h)` são guardados em `graveyard[charId]` (limite circular de **`50` entradas**). Se o Mestre acionar **Desfazer (Undo)**, `reconcile` restaura automaticamente o card na sua posição e dimensão anteriores (ou no ponto livre mais próximo caso o espaço tenha sido ocupado).

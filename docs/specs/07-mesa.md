# 07 — Aba "Mesa" (Tabuleiro Virtual Compartilhado)

## 1. Visão Geral

A aba **Mesa** (`#tab-mesa`) substitui a antiga seção de listagem estática de fichas por um **tabuleiro virtual compartilhado** com posicionamento livre no mundo (`4800 × 3000 px`), colisão física AABB determinística entre cards, câmera individual por usuário (zoom na posição do cursor + movimentação por botão do meio ou `Espaço + arrastar`), sincronização em tempo real via WebSockets e divisão horizontal automática durante o **Modo de Batalha**.

---

## 2. Regras de Negócio e Comportamento

### 2.1 Presença Automática e Permanência dos Personagens
- Todos os personagens existentes em `state.characters` aparecem automaticamente na Mesa usando seus IDs originais (`char.id`), sem duplicação de dados ou estado paralelo.
- Personagens criados são posicionados automaticamente na primeira região livre disponível sem sobrepor outros cards.
- **Permanência Offline:** A desconexão de um jogador nunca remove, oculta ou reseta a posição de seu personagem na Mesa. Um card só deixa a Mesa quando a ficha é **completamente excluída** (ou quando uma instância de inimigo é despachada).
- **Recuperação via Undo/Redo:** Quando uma ficha é excluída, sua última posição e dimensão são preservadas em `state.table.graveyard[charId]`. Caso a exclusão seja desfeita via `Undo`, o card retorna à sua posição anterior (ou à posição livre mais próxima).

### 2.2 Integração com o Bestiário
- Inimigos são trazidos à Mesa a partir do Bestiário (`spawnEnemyInstance`), gerando instâncias independentes (`isEnemy: true`, `bestiaryId`, ID único `char_enemy_...`) com vida, armadura, mana e efeitos próprios.
- Remover/despachar uma instância da Mesa (`dismissEnemyInstance`) não altera nem exclui a criatura original no Bestiário.

### 2.3 Sistema de Câmera e Zoom Individual
- **Dimensões do Mundo:** `4800 × 3000 px` (sem grade e sem células discretas).
- **Zoom:** `0.25` (25%) a `1.50` (150%), padrão `0.75` (75%), ancorado na posição do cursor do mouse (`wheel`).
- **Pan (Movimentação da Câmera):** Arraste com botão do meio do mouse (`button === 1`) ou `Espaço + arraste` com botão esquerdo em qualquer ponto da Mesa.
- **Controles Auxiliares:** Centralizar visualização (`#btn-mesa-center`), Enquadrar todos os cards (`#btn-mesa-fit`), Zoom `-` / `100%` / `+`.
- **Isolamento:** A câmera (`x`, `y`, `zoom`) é individual por usuário, persistida em `localStorage` e em `state.table.views[memberId]` no servidor, nunca sendo transmitida para alterar a câmera de outros participantes.

### 2.4 Arraste, Caixa de Colisão Real e Validação Server-Side
- Cada card é renderizado dentro de um container `.mesa-token` (`width: 420px`, altura dinâmica monitorada via `ResizeObserver`).
- Limiar de arraste de `4px` distingue cliques em botões do card (`Dano`, `Vida`, `Armadura`, `Mana`, `Reset`, `Notas`, `Inventário`, `Ficha`) do movimento de arraste.
- **Não-sobreposição estrita (AABB):**
  - Nenhum card pode ultrapassar os limites físicos da Mesa (`0 <= x <= world.w - w`, `0 <= y <= world.h - h`).
  - Durante o arraste e ao soltar o card, `mesaResolveMove` / `table_engine.resolve_move` aplica deslizamento por eixo (`slide_move`) ou projeção para a borda livre mais próxima (`nearest_free`), impedindo qualquer interseção entre caixas de colisão.
- **Autoridade do Servidor:** O servidor valida permissões, limites e colisões em todo `table_move` / `table_drag`, incrementando `state.table.rev` e transmitindo o estado definitivo para todos os clientes conectados.

### 2.5 Permissões de Movimentação
- **Mestre (Host):** Pode mover **qualquer** card na Mesa a qualquer momento (personagens próprios, personagens de jogadores e inimigos).
- **Jogador:** Pode mover **apenas** os personagens vinculados a ele (`isCharacterOwner`) e **nunca** pode mover inimigos.

### 2.6 Modo de Batalha e Divisão Horizontal (`y = 1500`)
- Ao iniciar uma batalha:
  - `state.table.battle.active = true`, dividindo o mundo horizontalmente em `y = 1500`.
  - **Região Superior (`0 <= y <= 1500 - h`):** exclusiva para inimigos (`isEnemy: true`).
  - **Região Inferior (`1500 <= y <= 3000 - h`):** exclusiva para personagens dos jogadores (`!isEnemy`).
  - Cards já posicionados em sua região válida e sem colisão permanecem onde estão; apenas cards fora da sua região (ou em colisão) são reposicionados automaticamente para a posição livre mais próxima dentro de sua respectiva metade.
- Ao encerrar uma batalha:
  - `state.table.battle.active = false`, restaurando a movimentação livre no mundo inteiro.
  - Os inimigos e as posições atingidas durante o combate **permanecem na Mesa** sem alterações de HP, mana ou atributos.

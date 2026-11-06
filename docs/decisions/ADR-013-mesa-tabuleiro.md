# ADR-013: Arquitetura da Aba "Mesa" — Tabuleiro Virtual Compartilhado em DOM + CSS Transforms e Colisão AABB Determinística

- **Status:** Aceito (v1.11.0)
- **Data:** 2026-11-05

## Contexto

O CMrpg necessitava substituir a antiga aba de grade estática ("Personagens & Fichas") por uma aba **Mesa**, funcionando como um tabuleiro virtual compartilhado em tempo real onde personagens da sessão e instâncias de inimigos do Bestiário pudessem ser posicionados livremente, mantendo 100% dos controles ricos já existentes nos cards HTML, com câmera e zoom independentes por participante, colisão física real sem sobreposição e divisão regional automática em Modo de Batalha.

## Decisão

1. **DOM Real com Transformações CSS (`translate3d` + `scale`) em vez de `<canvas>` 2D:**
   - Reutilizamos integralmente o HTML e os delegadores de eventos dos cards existentes (`buildCharacterCardHtml`) dentro de elementos `.mesa-token` posicionados via `transform: translate3d(x, y, 0)` dentro de `#mesa-world` (`4800 × 3000 px`), cuja câmera aplica `translate3d(camX, camY, 0) scale(zoom)` no cliente.
   - Um `ResizeObserver` acompanha a altura real renderizada de cada card conforme atributos, resistências, equipamentos ou modo oculto de inimigos alteram suas dimensões.

2. **Motor de Geometria e Colisão AABB Simétrico (`table_engine.py` e `static/js/05b-mesa-board.js`):**
   - Implementamos funções puras idênticas no cliente e no servidor (`get_allowed_region`, `clamp_to_region`, `rects_overlap`, `slide_move`, `nearest_free`, `resolve_move`) validadas pela mesma suíte de fixtures (`tests/fixtures/collision_cases.json`).
   - O servidor detém a autoridade final sobre permissões e colisões concorrentes, numerando revisões com `table.rev`.

3. **Persistência Unificada em `state.json`:**
   - O estado da Mesa reside em `state["table"]` (`world`, `positions`, `sizes`, `battle`, `views`, `graveyard`, `rev`), aproveitando a gravação atômica (`_write_state_atomic_sync`) e o sistema de `Undo/Redo` já existentes no `StateManager`.

## Consequências

- **Positivas:**
  - Zero duplicação de lógica de fichas: alterações de HP, armadura, mana, PA, notas, inventário e buffs refletem imediatamente no card sobre a Mesa.
  - Desempenho superior a 60 FPS durante o arraste (< 0.1ms por frame no cálculo de colisão para 30+ cards).
  - Paridade matemática garantida por testes automatizados entre Python (`pytest`) e Node.js (`node --test`).
- **Limitações Conhecidas:**
  - Como a identificação de Mestre (`is_client_host_master`) baseia-se no IP da máquina Host (`127.0.0.1` / IPs locais), qualquer navegador aberto na própria máquina Host recebe identidade de Mestre no servidor (exceto quando o botão "Simular Jogador" está ativo na UI local).

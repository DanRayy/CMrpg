# ADR-006: Sincronização em Tempo Real via WebSockets Nativos e Canais Voláteis em Memória

- **Status:** Aceito (Em Produção)

## Contexto

A interface do CMrpg exige sincronização instantânea entre Mestre e jogadores para mutações de campanha, arraste de cards na Mesa a 60 FPS e cursores colaborativos a ~25 FPS, sem gerar I/O de disco desnecessário durante eventos contínuos de ponteiro.

## Decisão

Utilizar o suporte nativo a **WebSockets** do FastAPI/Starlette no endpoint `/ws` (`ConnectionManager` em `main.py`) com dois fluxos distintos de mensagens:

1. **Fluxo Persistente de Estado (`update_state`, `table_move`, `table_sizes`, `table_view`, `undo`, `redo`):**
   - Protegido por `state_manager.lock` (`asyncio.Lock`), recalcula derivados em `rules_engine.py`, reconcilia a Mesa em `table_engine.py`, agenda gravação atômica com debounce (`0.3s`) e faz broadcast `state_sync` / `table_update` / `table_sync` injetando `identity` e `table_view` individual por conexão.
2. **Fluxo Volátil em Memória (`cursor_move`, `cursor_disconnect`, `REMOTE_CARD_DRAG`):**
   - Encaminhado imediatamente via `ws_manager.broadcast_except(sender_ws, ...)` **sem gravação em `state.json`** e sem alterar `undo_stack`.
   - O cliente aplica throttle (`40 ms` para cursores, `35 ms` para drag na Mesa) e interpolação suave via `requestAnimationFrame`.
3. **Heartbeat e Reconexão:**
   - Suporte a mensagens `ping`/`pong` e reconexão automática no cliente (`02-websocket-combat.js`), atualizando em tempo real a lista de IPs conectados (`connected_ips`).

## Consequências

- **Positivas:** latência sub-milissegundo em rede local/Radmin VPN, zero custo por mensagem e separação limpa entre telemetria efêmera e estado persistido.
- **Negativas:** clientes desconectados dependem do `state_sync` completo na reconexão (mitigado pelo snapshot único compacto e cache local em `localStorage`).

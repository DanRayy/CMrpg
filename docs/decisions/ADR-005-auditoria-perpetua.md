# ADR-005: Auditoria de Ações e Histórico Temporal (`Undo/Redo` de 6 Estados)

- **Status:** Aceito (Em Produção)

## Contexto

Sessões colaborativas em tempo real frequentemente sofrem cliques acidentais (aplicação de dano errado, exclusão de ficha, troca equivocada de turno ou item). É necessário rastrear o histórico de mutações da campanha e permitir reversão rápida e segura.

## Decisão

1. **Log de Auditoria (`state["auditLog"]`):**
   - `StateManager.add_audit_entry` insere no topo de `auditLog` registros com `id`, `actorName`, `actionType`, `targetEntity`, `summary` e `createdAt`, mantendo uma janela dos **`250` eventos mais recentes** em `state.json`.
   - A visibilidade da aba/painel respeita a permissão `system_view_audit_log`.
2. **Histórico Temporal `Undo/Redo` (`HISTORY_LIMIT = 6`):**
   - Antes de aplicar uma mutação com `record_history: true`, `StateManager` empilha um snapshot completo do núcleo da campanha (`_snapshot_core`: `room`, `members`, `characters`, `itemsCatalog`, `npcs`, `escrowSales`, `purchaseProposals`, `battle`, `quests`, `bestiary`, `customPermissionPresets`, `skillTrees`, `classes`, `races`) em `undo_stack`, limitando a **`6` estados** e limpando `redo_stack`.
   - Mensagens WebSocket `undo` e `redo` (restritas ao Mestre ou permissão `system_undo_redo`) restauram o snapshot via `_restore_core`, executam `_recalculate_all()` (incluindo reconciliação de posições na Mesa via `graveyard`) e propagam o novo estado para toda a sala.

## Consequências

- **Positivas:** recuperação instantânea de erros operacionais sem reiniciar o servidor ou restaurar backups manualmente.
- **Negativas:** limite fixo de 6 passos para manter o arquivo `state.json` enxuto e ágil na serialização.

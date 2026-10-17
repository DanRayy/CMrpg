# ADR-005: Auditoria Perpétua e Imutável por Sala

## Status
Aceito

## Contexto
Toda movimentação relevante na sala (alteração de ouro, compras na loja, movimentação de itens, mudanças de permissão, concessão de dano ou XP) precisa ser auditável para manter a transparência entre Mestre e Jogadores. Os registros de histórico devem ser permanentes e nunca excluídos.

## Decisão
1. **Tabela Append-Only:** Implementação da tabela `RoomAuditLog`. Não haverá operações de `UPDATE` ou `DELETE` nesta tabela.
2. **Estrutura do Registro:**
   - `id`: UUID
   - `roomId`: UUID (isolamento por sala)
   - `actorUserId`: UUID (quem disparou a ação)
   - `actionType`: String (ex: `GOLD_UPDATE`, `ITEM_PURCHASE`, `DAMAGE_DEALT`, `PERMISSION_CHANGE`)
   - `targetEntity`: String opcional (ex: `Character:Guerreiro`, `Item:Espada`)
   - `previousValue`: JSON opcional (estado anterior)
   - `newValue`: JSON opcional (novo estado)
   - `createdAt`: Timestamp
3. **Retenção:** Os registros são mantidos indefinidamente (para sempre).

## Consequências
- Total rastreabilidade e histórico de auditoria.
- Consultas no frontend serão paginadas para evitar sobrecarga de payload.

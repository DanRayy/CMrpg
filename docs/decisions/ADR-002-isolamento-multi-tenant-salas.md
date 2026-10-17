# ADR-002: Isolamento Multi-Tenant por Sala

## Status
Aceito

## Contexto
Cada sala criada representa uma campanha de RPG completamente independente. Um jogador pode participar de múltiplas salas diferentes. Os itens, fichas, NPCs, missões, moedas e configurações de uma sala nunca devem vazar ou ser acessíveis por integrantes de outra sala.

## Decisão
1. **Isolamento de Banco:** Toda e qualquer entidade de domínio (`Item`, `Character`, `InventoryItem`, `Quest`, `Transaction`, `AuditLog`, `NPC`, `RoomSettings`) conterá obrigatoriamente uma chave estrangeira `roomId`.
2. **Filtragem Rígida:** Todos os endpoints e consultas do Prisma devem receber o `roomId` validado na sessão do usuário e filtrar rigidamente `where: { roomId }`.
3. **Limites de Sala:** Cada conta de usuário pode criar e manter no máximo **10 salas ativas** como Mestre.
4. **Links de Convite Temporários:** Cada sala possui um token de convite único com tempo de vida (TTL) de **1 hora (60 minutos)**. Ao expirar ou mediante ação do Mestre, um novo token é gerado invalidando o anterior imediatamente.

## Consequências
- **Positivas:** Segurança estrita de dados, escalabilidade simples e independência total para o Mestre customizar sua mesa.
- **Atenção:** Middleware de autorização precisa sempre validar se o `userId` autenticado é membro ativo daquele `roomId` antes de processar qualquer requisição.

# ADR-004: Modelo de Itens (Catálogo Canônico vs. Instância de Inventário)

## Status
Aceito

## Contexto
O Mestre precisa ter poder de criar e editar itens na sala. Quando um item for editado pelo Mestre, a alteração deve se propagar automaticamente para a loja e para os inventários de todos os personagens daquela sala. Além disso, os jogadores não possuem permissão de personalizar ou renomear itens (sem runas ou anotações próprias).

## Decisão
Adota-se uma separação em duas entidades:
1. `Item` (Catálogo / Template):
   - Pertence à sala (`roomId`).
   - Define nome, tipo (`ARMADURA`, `ARMA`, `ACESSORIO`, `CONSUMIVEL`, `OUTRO`), equipável (`boolean`), peso, preço, descrição e efeitos.
   - É a única fonte da verdade para dados do item.
2. `InventoryItem` (Instância de Posse):
   - Representa a posse de um item por um personagem (`characterId`) ou NPC.
   - Contém apenas `id`, `characterId`, `itemId`, `quantity`, `isEquipped: boolean`, e `status: 'IN_INVENTORY' | 'IN_ESCROW'`.
3. **Propagação Automática:** Como o `InventoryItem` apenas referencia `itemId`, qualquer alteração no `Item` pelo Mestre é refletida imediatamente em todos os inventários sem redundância de dados.

## Consequências
- Consistência total de dados e integridade referencial.
- Evita mutações descontroladas nos inventários dos jogadores.

# Especificação 04: Economia, Carteira e Loja

## 1. Ouro e Moeda da Sala
1. **Nome da Moeda:** O padrão é "Ouro", mas pode ser renomeado livremente pelo Mestre para qualquer termo de ambientação da campanha.
2. **Moeda Compartilhada vs. Individual:**
   * **Modo Compartilhado (Padrão):** O grupo possui uma carteira única (`RoomWallet`). O saldo total é visível para todos os jogadores no cabeçalho e em todas as telas.
   * **Modo Individual:** Cada personagem possui sua própria carteira (`CharacterWallet`).
3. **Poderes do Mestre sobre a Moeda:**
   * Aumentar saldo em um valor específico.
   * Reduzir saldo em um valor específico.
   * Definir diretamente o saldo para uma quantia arbitrária.
   * Todas as alterações manuais do Mestre exigem registro imediato no histórico de auditoria com o valor anterior e o novo valor.

---

## 2. A Loja e NPCs Negociantes
1. A área de loja reúne comerciantes criados pelo Mestre.
2. **NPCs Negociantes:**
   * Nome e Descrição.
   * Lista de seleção de quais itens do catálogo da sala aquele comerciante vende.
3. **Navegação:**
   * Os jogadores entram na loja e selecionam o NPC com quem desejam interagir.
   * O catálogo de itens daquele NPC específico é exibido com nomes, descrições, pesos e preços.

---

## 3. Mecânica de Compra de Itens
1. O jogador clica no botão "Comprar" ao lado do item desejado.
2. O sistema verifica se o saldo da carteira é $\ge$ preço do item.
3. Se houver saldo suficiente:
   * Um modal de confirmação é apresentado ao comprador.
4. Após confirmação do comprador:
   * A operação roda dentro de uma **transação atômica** no PostgreSQL para evitar concorrência/saldo negativo.
   * O ouro é descontado.
   * O item é instanciado no inventário do comprador (`InventoryItem`).
   * A compra é registrada no histórico da loja e na auditoria geral.
   * O evento de atualização de saldo e inventário é emitido via Pusher.

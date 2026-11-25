# Especificação 04: Economia, Mercadores (NPCs), Barganha e Escrow

## 1. Mercadores (NPCs) e Estoque (`state.npcs`)

Na aba **Loja & Mercadores** (`#tab-shop`), o Mestre (ou membro com `shop_manage_npcs`) gerencia os NPCs vendedores da campanha por meio do modal `modal-npc`:

- **Dados do Mercador:** `id`, `name`, `description`, `avatar` e lista `stock[]`.
- **Estoque Finito e Infinito:** cada entrada em `npc.stock[]` referencia um `itemId` do `itemsCatalog` com:
  - `infinite: true` (estoque ilimitado) ou `infinite: false` com `quantity >= 0` (exibindo `Esgotado` quando chegar a `0`).
- **Preços Customizados por NPC (`customPrice`):**
  - Na vitrine da loja, usuários com `shop_manage_npcs` podem sobrescrever o preço padrão do catálogo especificamente para aquele mercador (`data-shop-custom-price`).
  - Se o campo estiver vazio, o sistema usa automaticamente o `item.preco` do catálogo canônico.
- **Visibilidade:** itens marcados no catálogo com `visivelParaJogadores: false` não aparecem na loja para jogadores comuns (ficam visíveis apenas para o Mestre / gestores da loja).

---

## 2. Fluxo de Compra Direta

1. No topo da aba **Loja & Mercadores**, o usuário seleciona a **ficha compradora** (`#shop-buyer-char-select`).
   - Inimigos (`isEnemy`) são excluídos da lista de compradores.
   - Jogadores só visualizam fichas vinculadas a si (`isCharacterOwner`); o Mestre pode selecionar qualquer ficha de personagem.
2. O jogador escolhe a quantidade desejada (`data-shop-buy-qty`, limitada ao estoque disponível quando finito) e clica em **Comprar** (`data-buy-item`).
3. O sistema valida:
   - Permissão `shop_buy_sell` (ou Mestre).
   - Estoque suficiente (`infinite || quantity >= qtdSolicitada`).
   - Saldo suficiente na carteira ativa (`room.sharedGold` se `isSharedWallet === true`, ou `buyer.gold` se carteira individual).
   - Limite de inventário (quando `unlimitedInventory === false`).
4. Confirmada a compra:
   - Deduz o valor total (`effectivePrice × qtd`) da carteira.
   - Decrementa `stockEntry.quantity` se o estoque não for infinito.
   - Adiciona os itens ao inventário do comprador (respeitando não-empilhamento de equipáveis e empilhamento de consumíveis).
   - Executa `AudioManager.play('buy')` e grava entrada em `auditLog`.

---

## 3. Sistema de Barganha ("Fazer Proposta" e "Solicitações de Compras")

Quando um jogador deseja negociar desconto, pagar um valor diferente do tabelado ou solicitar itens com preço negociável/indefinido, utiliza o fluxo de **Barganha** (`state.purchaseProposals`):

### Envio da Proposta (`modal-create-proposal`)
1. No card do item na loja, o jogador clica em **Fazer Proposta** (`data-propose-buy`).
2. O modal exibe: nome do item, preço unitário padrão do NPC, mercador e comprador selecionado.
3. O jogador preenche:
   - **Quantidade (`#prop-qty`):** limitada ao estoque finito (ou até `999` se infinito). Ao alterar a quantidade, o valor sugerido é recalculado automaticamente (`qty × unitPrice`), podendo ser editado livremente.
   - **Valor Total Ofertado (`#prop-gold`):** quantia em moedas proposta pelo comprador (`>= 0`).
   - **Mensagem / Justificativa (`#prop-message`):** argumento de interpretação ou teste de Lábia.
4. Ao enviar, é criado um registro em `state.purchaseProposals` com `status: "PENDENTE"`, `originalUnitPrice`, `quantity`, `proposedGold`, `charId`, `merchantId` e `createdAt`.
5. O botão **Solicitações de Compras** (`#btn-open-purchase-proposals`) no cabeçalho da loja atualiza em tempo real o badge numérico `#badge-pending-proposals` com o total de propostas pendentes.

### Gestão e Aprovação Exclusiva do Mestre (`modal-purchase-proposals`)
- Todos podem abrir o modal e filtrar solicitações por status (`ALL`, `PENDENTE`, `ACEITA`, `RECUSADA`), visualizando o preço de tabela riscado ao lado da oferta e a diferença percentual (`diffPct`).
- Apenas o **Mestre** (`isEffectiveMaster()`) visualiza e pode acionar os botões de decisão em propostas `PENDENTE`:
  - **Aceitar Proposta (`handleAcceptPurchaseProposal`):** revalida se o comprador/item existem, se há saldo para pagar `proposedGold` e se há estoque finito suficiente; debita `proposedGold` da carteira compartilhada ou individual, decrementa o estoque finito do NPC, entrega os itens ao comprador, marca `status = "ACEITA"`, toca `AudioManager.play('buy')` e audita como `PROPOSAL_ACCEPTED`.
  - **Recusar (`handleRejectPurchaseProposal`):** altera `status = "RECUSADA"` sem movimentar ouro ou estoque e audita como `PROPOSAL_REJECTED`.

---

## 4. Fluxo de Venda Assistida (`IN_ESCROW`)

Para evitar geração indevida de ouro sem supervisão do narrador, vendas de inventário passam por custódia (`state.escrowSales`):

1. No inventário da ficha, o jogador clica em **Vender** (`data-inv-sell-escrow`), abrindo `modal-sell-escrow` para informar o valor pretendido e confirmar.
2. O item no inventário recebe `status = "IN_ESCROW"` (e é desequipado, se aplicável), exibindo o selo `ESCROW`:
   - Enquanto estiver em `IN_ESCROW`, o item fica bloqueado para equipar, usar, transferir ou descartar, e não contribui para peso nem status derivados (`rules_engine.py` ignora entradas `IN_ESCROW`).
3. Uma solicitação é adicionada a `state.escrowSales` e exibida na bandeja `#escrow-approvals-box` na aba **Loja & Mercadores**.
4. O Mestre (ou membro com permissão `shop_approve_escrow`) decide:
   - **Aprovar:** remove o item (ou reduz quantidade da pilha) do inventário, credita o valor combinado na carteira (`sharedGold` ou `char.gold`), remove a pendência de `escrowSales` e registra na auditoria.
   - **Recusar:** devolve o status do item para `IN_INVENTORY` e remove a pendência de `escrowSales`.

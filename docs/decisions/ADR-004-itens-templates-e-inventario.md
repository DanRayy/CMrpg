# ADR-004: Catálogo Canônico de Itens, Instâncias de Inventário, Barganha e Escrow

- **Status:** Aceito (Em Produção)

## Contexto

Duplicar dados de itens dentro de cada inventário impede o balanceamento centralizado pelo Mestre. Além disso, o jogo exige que itens equipáveis sejam rastreados individualmente (enquanto consumíveis empilham) e que negociações com mercadores e vendas de jogadores sejam auditadas.

## Decisão

1. **Separação Catálogo Canônico vs. Instância de Inventário:**
   - `state["itemsCatalog"]` detém a definição única de cada item (`nome`, `descricao`, `tipo`, `equipavel`, `peso`, `preco`, `visivelParaJogadores`, `effects[]`).
   - Cada personagem armazena em `char["inventory"]` apenas referências (`id`, `itemId`, `quantity`, `isEquipped`, `status`).
2. **Regras de Empilhamento e Peso Seletivo:**
   - `normalize_character` (`main.py`) garante que itens com `equipavel: true` nunca empilhem (`quantity: 1` por entrada). Consumíveis e outros itens não-equipáveis empilham em `quantity`.
   - `compute_character_derived_stats` (`rules_engine.py`) soma ao `totalWeight` apenas itens com `equipavel: true`, `isEquipped: true` e `status != "IN_ESCROW"`.
3. **Economia Assistida (`IN_ESCROW` e `purchaseProposals`):**
   - Vendas de inventário colocam a entrada em `status: "IN_ESCROW"` (desativando efeitos e bloqueando ações) dentro de `state["escrowSales"]` até aprovação ou recusa do Mestre.
   - Negociações de preço na loja criam propostas em `state["purchaseProposals"]` (`PENDENTE` → `ACEITA` / `RECUSADA`) com aprovação exclusiva do Mestre.

## Consequências

- **Positivas:** editar um item no catálogo atualiza imediatamente todas as fichas e mercadores; economia protegida contra fraudes ou erros acidentais.
- **Negativas:** exige lookup `items_by_id` durante normalização e renderização.

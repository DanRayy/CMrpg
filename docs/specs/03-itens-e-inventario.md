# Especificação 03: Catálogo de Itens, Motor de Efeitos e Inventário

## 1. Catálogo Canônico da Sala (`state.itemsCatalog`)

Todos os itens do jogo são definidos uma única vez no catálogo central da sala. Alterações de nome, descrição, peso, preço ou efeitos em um item do catálogo atualizam automaticamente a Loja de todos os mercadores e os inventários de todos os personagens.

### Os 5 Tipos de Itens (`ITEM_TYPES`)
1. `ARMADURA` — Armaduras, elmos e escudos (`static/img/itens/armaduras/`)
2. `ARMA` — Espadas, cajados, arcos e armas (`static/img/itens/armas/`)
3. `ACESSORIO` — Anéis, amuletos e relíquias (`static/img/itens/acessorios/`)
4. `CONSUMIVEL` — Poções, elixires e pergaminhos (`static/img/itens/consumiveis/`)
5. `OUTRO` — Chaves, troféus e itens de história (`static/img/itens/outros/`)

### Estrutura do Template de Item
Cada item do catálogo armazena:
- `id`, `nome`, `descricao` (com preservação de quebras de linha `.item-description`), `tipo`, `equipavel` (`bool`), `peso` (`float` unitário em kg), `preco` (`int`), `icone` / imagem local (`/static/img/itens/...`), `naoNegociavel`, `precoIndefinido`, `visivelParaJogadores` (`bool`) e lista `effects[]`.

---

## 2. Regras de Empilhamento e Peso Seletivo

### Não-Empilhamento de Equipáveis vs. Empilhamento de Consumíveis
- **Itens Equipáveis (`equipavel: true`):** nunca empilham no inventário. Em `normalize_character` (`main.py`), qualquer entrada com `quantity > 1` de um item equipável é automaticamente desdobrada em instâncias individuais (`quantity: 1`, cada qual com seu próprio `id` `inv_<hex>` e `isEquipped` independente).
- **Consumíveis e Não-Equipáveis (`equipavel: false`):** empilham automaticamente em uma única entrada no inventário somando `quantity`.

### Cálculo Seletivo de Peso (`compute_character_derived_stats`)
- Apenas itens com **`equipavel: true`**, marcados como **`isEquipped: true`** e com status diferente de **`IN_ESCROW`** somam ao peso carregado (`totalWeight`) do personagem.
- Itens guardados na mochila (`isEquipped: false`), consumíveis e itens em processo de venda (`IN_ESCROW`) **não** somam peso equipado.
- Quando `totalWeight > maxWeight`, o badge de carga no card e no modal de inventário entra em alerta visual de sobrecarga.

---

## 3. Motor de Efeitos de Itens (`VALID_EFFECT_TARGETS`)

Os modificadores configurados em `item.effects[]` usam `modifierType` (`FLAT` ou `PERCENT`) e podem atuar sobre qualquer um dos **33 alvos canônicos** de `rules_engine.py`:

| Grupo | Alvos (`targetStat`) |
| :--- | :--- |
| **Vitais & Carga (5)** | `VIDA`, `ARMADURA`, `MANA`, `PA`, `CAPACIDADE_PESO` |
| **Regeneração (3)** | `REGEN_VIDA`, `REGEN_ARMADURA`, `REGEN_MANA` |
| **Combate (4)** | `DEFESA`, `ATAQUE`, `ARCANA`, `SANTIDADE` |
| **Resistências Elementais (8)** | `RES_GERAL`, `RES_FISICO`, `RES_MAGICO`, `RES_PYRO`, `RES_CRYO`, `RES_ELETRICO`, `RES_PROFANO`, `RES_SACRO` |
| **Limites de Acúmulos (8)** | `ACUMULO_GERAL`, `ACUMULO_CONGELAMENTO`, `ACUMULO_CHOQUE`, `ACUMULO_SANGRAMENTO`, `ACUMULO_CHAMAS`, `ACUMULO_VENENO`, `ACUMULO_ATORDOAMENTO`, `ACUMULO_CEGUEIRA` |
| **Atributos Canônicos (5)** | `FORCA`, `DESTREZA`, `INTELIGENCIA`, `SABEDORIA`, `LABIA` |

- **Equipáveis:** aplicam seus efeitos continuamente enquanto `isEquipped: true` e `status != "IN_ESCROW"`.
- **Consumíveis:** ao clicar em **Usar**, aplicam efeito instantâneo (como `REGEN_VIDA` ou `REGEN_MANA` em valor fixo ou percentual sobre o máximo, consumindo `1` unidade da pilha).

---

## 4. Inventário Dedicado em Grade 3× e Transferências P2P

O modal `modal-char-inventory` exibe a mochila do personagem em uma grade responsiva de **3 colunas** (`#inv-modal-grid`):

- **Filtros e Busca:** abas rápidas (`Todos`, `Equipados`, `Armaduras`, `Armas`, `Acessórios`, `Consumíveis`, `Outros`) e campo de busca por nome, descrição ou tipo.
- **Ações por Item:**
  - `Equipar` / `Desequipar` (equipáveis): aciona `AudioManager.play('equip')` ao equipar e `AudioManager.play('unequip')` (reprodução reversa) ao desequipar.
  - `Usar` (consumíveis): aplica o efeito imediato e reduz `quantity` em 1 (removendo a entrada se zerar).
  - `Transferir` (P2P): abre `modal-item-recipient` para enviar o item (ou quantidade escolhida no caso de pilhas) para qualquer outro personagem da sala, desde que o membro possua `inventory_transfer_any` (ou controle de edição) e o item não esteja `IN_ESCROW`. Toca `AudioManager.play('move')`.
  - `Vender` (Escrow): abre `modal-sell-escrow` para submeter o item à aprovação do Mestre.
  - `Descartar`: remove o item do inventário após confirmação.
- **Ajuste de Capacidade de Carga:** jogadores com permissão de edição podem ajustar `baseMaxWeight` diretamente no cabeçalho do modal.

---

## 5. Carteira Compartilhada vs. Individual e Limite de Inventário

Configuráveis pelo Mestre na aba **Administração** (`state.room`):
- **Carteira (`isSharedWallet`):**
  - `true` (padrão): todas as compras e vendas aprovadas movimentam o cofre compartilhado `state.room.sharedGold`.
  - `false`: cada personagem possui e movimenta seu próprio saldo individual `char.gold`.
- **Limite de Inventário (`unlimitedInventory` / `inventoryLimit`):**
  - `unlimitedInventory: true` (padrão): não há restrição de quantidade de slots na mochila.
  - `unlimitedInventory: false`: limita o inventário ao número de entradas definido em `inventoryLimit` (padrão `10`).

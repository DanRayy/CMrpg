# Especificação 03: Itens, Equipamentos e Inventário

## 1. Tipos de Itens
Existem 5 tipos de itens cadastráveis pelo Mestre:

1. `ARMADURA`: Item equipável com peso e suporte a efeitos contínuos de status.
2. `ARMA`: Item equipável com peso e suporte a efeitos contínuos de status.
3. `ACESSORIO`: Item equipável com peso e suporte a efeitos contínuos de status.
4. `CONSUMIVEL`: Item não equipável, com efeitos de status temporários com contagem de turnos.
5. `OUTRO`: Itens utilitários simples (ex: Pedra, Tocha, Chave). Possuem apenas Nome e Descrição, sem efeitos mecânicos.

---

## 2. Propriedades e Flags do Item
* `nome`: String
* `descricao`: String
* `tipo`: `ARMADURA` | `ARMA` | `ACESSORIO` | `CONSUMIVEL` | `OUTRO`
* `equipavel`: Boolean (`true` ou `false`)
* `peso`: Number / Float
* `preco`: Integer (valor em Ouro)
* **Flags Especiais:**
  * `naoNegociavel`: Não pode ser vendido para loja ou trocado.
  * `precoIndefinido`: Não possui preço de mercado fixado.
  * `visivelParaJogadores`: Se `false`, o item é visível apenas para o Mestre.

---

## 3. Regra de Cálculo Seletivo de Peso
* O valor de `peso` de um item só é somado à carga do personagem se o item for do tipo `equipavel === true` e estiver com o status marcado como **EQUIPADO** (`isEquipped: true`).
* Itens guardados no inventário ou itens não-equipáveis não geram peso/estorvo na carga.

---

## 4. Motor de Efeitos de Itens (Item Effects)
Itens dos tipos `ARMADURA`, `ARMA`, `ACESSORIO` e `CONSUMIVEL` podem conter **0, 1 ou múltiplos efeitos** configuráveis.

Cada efeito possui:
* **Alvo (`targetStat`):**
  * Recursos Vitais: `VIDA` | `ARMADURA` | `MANA` | `PA` | `REGEN_MANA`
  * Combate: `DEFESA` | `ATAQUE` | `ARCANA` | `SANTIDADE`
  * Atributos Canônicos: `FORCA` | `DESTREZA` | `INTELIGENCIA` | `SABEDORIA` | `LABIA`
* **Tipo (`modifierType`):**
  * `FLAT` (Fixo): Adiciona ou subtrai um número inteiro (ex: $+70$, $-2$).
  * `PERCENT` (Percentual): Adiciona ou subtrai uma porcentagem (ex: $+50\%$, $-10\%$).
* **Duração em Turnos (`durationTurns`):**
  * Itens equipáveis: `null` (efeito ativo enquanto equipado).
  * Consumíveis: inteiro positivo indicando quantos turnos o efeito perdura no combate.

---

## 5. Inventário dos Jogadores & Transferências
1. **Capacidade:** Ilimitada por padrão (ou 10 slots se configurado na sala).
2. **Transferência P2P:** Um jogador pode enviar diretamente qualquer item não-bloqueado de seu inventário para outro jogador da mesma sala.
3. **Sem Edição por Jogador:** O jogador não pode renomear itens nem aplicar runas/anotações próprias.

---

## 6. Fluxo de Venda de Itens e Escrow (`IN_ESCROW`)
1. Quando um jogador decide vender um item do seu inventário:
   * Uma solicitação de venda é criada.
   * O item entra em estado `IN_ESCROW` (bloqueado para transferências, uso ou exclusão) e exibe um ícone visual de venda.
2. O Mestre analisa a solicitação no seu painel de pendências:
   * **Se Aceitar:** O item é removido definitivamente do inventário, o ouro do grupo é creditado e a ação é auditada.
   * **Se Recusar:** O item volta ao estado normal `IN_INVENTORY`.

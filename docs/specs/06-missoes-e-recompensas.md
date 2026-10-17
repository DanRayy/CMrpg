# Especificação 06: Missões e Sistema de Recompensas

## 1. Status das Missões
O ciclo de vida de uma missão no sistema percorre os seguintes estados:
* `PENDENTE`: Criada, aguardando resposta ou aceitação do grupo.
* `ACEITA`: Aceita pelos jogadores ou designada pelo Mestre.
* `EM_PROGRESSO`: O grupo está executando os objetivos da missão.
* `RECUSADA`: Os jogadores ou o Mestre recusaram a missão.
* `CANCELADA`: Missão abortada antes da conclusão.
* `CONCLUIDA`: Objetivos cumpridos e recompensas liberadas.

O Mestre pode alterar arbitrariamente o status de qualquer missão (inclusive retornar missões recusadas, canceladas ou concluídas para o estado pendente).

---

## 2. Criação de Missão
Ao cadastrar uma missão, informa-se:
* Título / Nome da Missão.
* Descrição dos objetivos e contexto da narrativa.
* **Pacote de Recompensas:**
  * **Ouro:** Quantia em dinheiro creditada na carteira do grupo.
  * **Itens:** Seleção de itens do catálogo entregues para um jogador específico, vários jogadores selecionados ou para o grupo.
  * **Pontos de Experiência (XP):** Quantidade de XP concedida para um jogador, vários jogadores selecionados ou para todo o grupo.
  * **Pontos de Atributos:** Pontos extras de atributos a serem distribuídos para jogadores específicos ou grupo.

---

## 3. Concessão de Experiência e Recompensas em Lote
1. **Regra de Segurança Inviolável:** Apenas o Mestre pode conceder pontos de Experiência (XP). Essa permissão não pode ser delegada sob nenhuma hipótese.
2. **Interface em Lote (Bulk Actions):**
   * O Mestre possui uma tela dedicada com checkboxes ao lado de todos os jogadores da sala.
   * O Mestre pode digitar um valor de XP e clicar em "Conceder a Todos" ou selecionar apenas os participantes de um encontro específico.
3. **Auditoria:** Toda entrega de recompensa ou concessão de XP é gravada permanentemente no log da sala.

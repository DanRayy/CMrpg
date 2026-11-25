# Especificação 06: Quadro de Missões e Concessão de Recompensas

## 1. Quadro de Missões (`#tab-quests` / `state.quests`)

A aba **Missões** centraliza os contratos, objetivos secundários e missões principais da campanha.

### Os 7 Status Oficiais (`QUEST_STATUS_BADGES`)
Cada missão transita entre os seguintes estados com badges semânticos dedicados:
1. `PENDENTE` — Disponível no mural aguardando aceite (`amber`).
2. `ACEITA` — Reivindicada por um personagem (`sky`).
3. `EM_PROGRESSO` — Em andamento ativo (`indigo`).
4. `PAUSADA` — Temporariamente suspensa (`slate`).
5. `CONCLUIDA` — Finalizada e recompensas entregues (`emerald`).
6. `RECUSADA` — Recusada pelo grupo ou pelo Mestre (`rose`).
7. `CANCELADA` — Encerrada sem conclusão (`zinc`).

### Criação e Edição (`modal-quest`)
Usuários com permissão `mission_manage` (ou o Mestre) criam e editam missões definindo:
- **Título e Descrição.**
- **Recompensas Configuradas (`quest.rewards`):**
  - `gold`: moedas creditadas na carteira compartilhada (`sharedGold`) ou divididas/entregues ao personagem vinculado (`char.gold`).
  - `xp`: experiência concedida (processando level-up e `+2` Pontos de Talento por nível).
  - `attributePoints`: pontos de atributo pendentes (`pendingAttributePoints`).
  - `skillPoints`: Pontos de Talento diretos (`skillPoints`).
  - `items[]`: lista de `{ itemId, quantity }` do catálogo canônico.

---

## 2. Vínculo de Personagem ao Aceitar Missão (`modal-accept-quest`)

- Jogadores com permissão `mission_accept` (ou Mestre) visualizam o botão **Aceitar Missão** nas missões em estado `PENDENTE` sem responsável.
- Ao clicar, abre `modal-accept-quest` para selecionar **qual ficha** está assumindo o contrato.
- A confirmação registra `acceptedByCharacterId` (e inclui na lista `assignedCharacterIds[]`), transicionando o status para `ACEITA` e exibindo no card da missão o nome do personagem responsável.

---

## 3. Conclusão e Entrega Automática de Recompensas

- Usuários com `mission_approve` (ou Mestre) podem alterar o status da missão ou clicar em **Concluir Missão** (`data-status="CONCLUIDA"`).
- Ao transicionar para `CONCLUIDA` pela primeira vez (`rewarded === false`), o sistema dispara automaticamente a entrega de todas as recompensas configuradas para os personagens vinculados (`assignedCharacterIds` / `acceptedByCharacterId`):
  1. **Ouro:** soma à carteira compartilhada (`room.sharedGold`) ou ao saldo individual (`char.gold`) dos participantes.
  2. **XP:** executa `process_xp_and_level_up` para cada participante, subindo níveis e concedendo `+2 skillPoints` por nível ganho.
  3. **Pontos de Atributo:** incrementa `pendingAttributePoints` (exibindo banner verde de pontos pendentes no card do personagem).
  4. **Pontos de Talento:** incrementa `skillPoints`.
  5. **Itens:** adiciona os `items[]` ao inventário do personagem responsável respeitando as regras de empilhamento.
- A trava `quest.rewarded = true` impede entrega duplicada caso o status seja consultado ou alternado posteriormente, e toda conclusão é gravada no `auditLog`.

---

## 4. Concessão de Recompensas em Lote (`modal-bulk-reward`)

Acessível pelo botão **XP em Lote** (abas **Mesa** e **Fichas**) para o Mestre ou membros com `char_grant_xp`:
- Permite selecionar múltiplos personagens via checkboxes (com opção rápida de marcar todos).
- Aplica simultaneamente **XP** (com processamento automático de múltiplos level-ups), **Pontos de Atributo Pendentes** e/ou **Pontos de Talento**.
- Emite notificação em tempo real para toda a sala e grava o resumo no histórico de auditoria.

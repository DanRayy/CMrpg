# Casos de Uso do Sistema (Use Cases)

Este documento descreve os fluxos operacionais principais que guiarão o desenvolvimento e os testes automatizados (TDD/E2E).

---

### UC-01: Criação de Sala e Geração de Convite
* **Ator Principal:** Usuário (Futuro Mestre).
* **Pré-condição:** Autenticado com Discord.
* **Fluxo:**
  1. O usuário clica em "Criar Nova Sala".
  2. Informa Nome, Descrição, Nome da Moeda e preferências (Moeda compartilhada, Inventário ilimitado).
  3. O backend valida se o usuário possui menos de 10 salas ativas.
  4. A sala é criada no PostgreSQL e o usuário é registrado como membro com papel `MESTRE`.
  5. Um token de convite com TTL de 3600 segundos (1 hora) é gerado e retornado.
  6. O Mestre copia o link de convite e compartilha no Discord.

---

### UC-02: Entrada de Jogador por Link de Convite
* **Ator Principal:** Usuário Convidado.
* **Pré-condição:** Autenticado com Discord e de posse do link.
* **Fluxo:**
  1. O usuário acessa a URL `https://.../invite/[token]`.
  2. O backend valida se o token existe e não está expirado.
  3. O usuário é vinculado à sala como membro com papel `JOGADOR` (sem permissões administrativas por padrão).
  4. O usuário é redirecionado para a tela principal da sala.
  5. Um evento é disparado via Pusher anunciando a chegada do novo membro.

---

### UC-03: Criação de Personagem com Validação de Atributos
* **Ator Principal:** Jogador.
* **Fluxo:**
  1. O jogador abre o formulário de criação de personagem dentro da sala.
  2. Os 5 atributos (Força, Destreza, Inteligência, Sabedoria, Lábia) iniciam em 8.
  3. O sistema exibe o contador "17 pontos restantes".
  4. O jogador pode reduzir no máximo 1 atributo para 7 (ganhando 1 ponto extra, totalizando 18 pontos a distribuir).
  5. O jogador aloca os pontos. O sistema recalcula dinamicamente modificadores e sucessos automáticos passivos na tela.
  6. O jogador clica em "Salvar Personagem".
  7. O backend executa a validação formal da soma e invariantes: se válido, salva no banco; se inválido, rejeita com erro explícito.

---

### UC-04: Cadastro de Item com Efeitos pelo Mestre
* **Ator Principal:** Mestre.
* **Fluxo:**
  1. O Mestre acessa o painel de Itens da sala e clica em "Novo Item".
  2. Define Nome, Descrição, Tipo (`ARMADURA`, `ARMA`, `ACESSORIO`, `CONSUMIVEL` ou `OUTRO`), Equipável, Peso e Preço.
  3. Se o tipo suportar efeitos, o Mestre clica em "Adicionar Efeito".
  4. Configura: Alvo (ex: Vida), Tipo (Fixo ou %), Valor (ex: +70) e Duração em turnos (caso seja consumível).
  5. O Mestre salva o item.
  6. O item fica disponível no catálogo da sala e pode ser associado a NPCs da loja ou entregue a jogadores.

---

### UC-05: Compra de Item na Loja
* **Ator Principal:** Jogador.
* **Fluxo:**
  1. O jogador entra na Loja e seleciona um NPC Negociante.
  2. Escolhe um item e clica em "Comprar".
  3. O sistema exibe modal de confirmação: *"Deseja comprar [Item] por [X] [Moeda]?"*.
  4. O jogador confirma.
  5. O backend inicia uma transação atômica (`prisma.$transaction`):
     - Valida saldo na carteira compartilhada da sala (`saldo >= preco`).
     - Deduz o preço do saldo.
     - Cria um `InventoryItem` vinculado ao personagem do comprador.
     - Grava o log na tabela `RoomAuditLog`.
  6. A transação é comitada.
  7. O Pusher emite o evento de atualização de ouro e inventário em tempo real para a sala.

---

### UC-06: Solicitação e Aprovação de Venda de Item
* **Atores:** Jogador e Mestre.
* **Fluxo:**
  1. No inventário, o jogador clica em "Vender" em um item.
  2. O backend altera o status do item para `IN_ESCROW`.
  3. O item exibe um ícone de "Em Processo de Venda" e é bloqueado para ações.
  4. Na interface do Mestre, a solicitação surge na bandeja de pendências.
  5. O Mestre clica em "Aprovar":
     - Transação atômica remove o item do inventário.
     - Saldo de ouro do grupo é incrementado com o valor de venda.
     - Registro é salvo na auditoria da sala.
  6. Ambos os clientes atualizam suas telas via Pusher.

---

### UC-07: Aplicação de Dano e Sobrecarga de Armadura
* **Ator Principal:** Mestre.
* **Alvo:** Jogador.
* **Fluxo:**
  1. No painel de combate, o Mestre seleciona um jogador, digita o Dano (ex: 20) e clica em "Aplicar Dano".
  2. O backend compara o dano com a Armadura atual do personagem (ex: 15):
     - Como $20 > 15$, a Armadura Máxima é degradada/reduzida temporariamente até o fim da batalha.
     - O excedente de dano afeta a Vida do personagem.
  3. Se a Vida chegar a zero, o status do personagem muda automaticamente para `MORTO`.
  4. O Pusher propaga a alteração de vida/armadura para a mesa inteira instantaneamente.

---

### UC-08: Gerenciamento de Turnos, Cargas do Grupo e Estatísticas
* **Atores:** Mestre e Jogadores.
* **Fluxo:**
  1. O Mestre ativa o modo de batalha e define a ordem sequencial de participantes (`[Jogador 1, Mestre, Jogador 2]`).
  2. A batalha inicia:
     - Os contadores de telemetria são inicializados (`totalTurns = 0`, `round = 1`, `masterTurns = 0`, turnos individuais = 0, `groupCharges = 0`).
  3. O turno inicia no `Jogador 1`:
     - O sistema recarrega os Pontos de Ação (`pa`) do jogador para **3 PA**.
     - O sistema regenera **20% da Mana Máxima** do jogador (limitado ao teto de Mana).
     - O sistema incrementa automaticamente o pool compartilhado de cargas do grupo (`groupCharges`) em $+1$.
     - O `Jogador 1` gasta PA para suas ações, gasta cargas da reserva coletiva do grupo clicando em `[ - ]` ou as ajusta livremente.
     - Ele executa suas ações e clica em "Finalizar Turno".
     - O contador de turnos do `Jogador 1` e os turnos totais da batalha são incrementados em $+1$.
  4. O cursor avança para o `Mestre`:
     - **Não** há recarga de PA, regeneração de mana ou acúmulo de cargas no turno do Mestre.
     - O Mestre narra, aplica dano nos jogadores e clica em "Finalizar Turno".
     - O contador `masterTurns` e os turnos totais são incrementados em $+1$.
  5. O cursor avança para o `Jogador 2`:
     - O pool de cargas do grupo (`groupCharges`) é incrementado novamente em $+1$.
     - Se o `Jogador 2` estiver com Vida 0 (`MORTO`), o turno chega nele, mas sua interface só permite clicar em "Avançar Turno".
     - Se o jogador demorar, o Mestre clica em "Forçar Avanço", passando a vez imediatamente.
  6. Ao completar o ciclo de todos os participantes, o contador `roundNumber` é incrementado em $+1$.

---

### UC-09: Ressurreição de Jogador Caído
* **Ator:** Mestre.
* **Alvo:** Jogador com status `MORTO`.
* **Fluxo:**
  1. O Mestre clica no botão "Reviver" no card do personagem.
  2. Escolhe a modalidade:
     - `100%`: restaura todos os valores máximos.
     - `50%`: restaura metade dos valores (obedecendo a regra de arredondamento da sala).
     - `Personalizado`: digita os valores exatos (ex: 33 de Vida e 2 de Armadura).
  3. O backend aplica os valores, altera o status para `ATIVO` e audita a ação.
  4. A interface do jogador é desbloqueada via evento do Pusher.

---

### UC-10: Concessão de XP e Atributos em Lote
* **Ator:** Mestre.
* **Fluxo:**
  1. O Mestre abre o painel de Recompensas.
  2. Marca os checkboxes dos jogadores que participaram do desafio (ou clica em "Marcar Todos").
  3. Digita o valor de XP (ex: 200) e/ou pontos de atributos extras (ex: 1).
  4. Clica em "Conceder Recompensa".
  5. O backend executa o update em lote para todos os selecionados e registra no histórico de auditoria.

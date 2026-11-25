# Casos de Uso do Sistema (Fluxos Principais)

Este documento descreve os fluxos operacionais completos do **CMrpg** com base na implementação atual (FastAPI + WebSockets + `state.json` + Frontend modular Vanilla JS).

---

### UC-01: Inicialização do Servidor Local e Conexão via Radmin VPN
* **Atores:** Mestre (Host) e Jogadores (Rede Radmin VPN / LAN).
* **Fluxo:**
  1. O Mestre executa `iniciar_servidor.bat`, que valida a presença do Python 3.10+ e inicia `launcher.py`.
  2. No menu interativo ANSI, o Mestre escolhe `Iniciar` (ou `Instalar atualizacoes e iniciar` para atualizar via Git/zipball preservando `state.json`).
  3. O `launcher.py` configura a regra `"CMrpg Server"` no Firewall (porta `8000`), valida o ambiente virtual `venv/`, exibe o IP do Radmin VPN (`26.x.x.x`), cria backup rotativo em `backups/` (máx. 15 arquivos) e sobe o Uvicorn em `0.0.0.0:8000`.
  4. O navegador do Mestre abre `http://localhost:8000` e o servidor atribui automaticamente a identidade `host_master` (`MESTRE`).
  5. Os jogadores acessam `http://<IP_RADMIN>:8000` em seus navegadores; o servidor os identifica automaticamente pelo IP como `JOGADOR` (`ip_<IP>`) e transmite o estado completo via WebSocket (`/ws`).

---

### UC-02: Gestão de Membros por IP, Cursores Colaborativos e 32 Permissões
* **Atores:** Mestre e Jogadores.
* **Fluxo:**
  1. Na aba **Visão Geral**, todos os participantes visualizam o painel ao vivo de IPs conectados e a tabela **Membros da Sala**.
  2. Cada jogador recebe automaticamente uma cor permanente dentre as **10 cores** da paleta de cursores colaborativos; o Mestre exibe transição contínua **RGB Chroma** (exclusiva do Host).
  3. O Mestre edita o membro (`modal-member`) para definir um apelido, vincular uma ficha (`characterId`), escolher um preset (`JOGADOR_COMUM`, `SUB_MESTRE`, `ESPECTADOR`) ou ajustar individualmente qualquer uma das **32 permissões em 7 categorias** (`modal-perm-category`), podendo salvar o conjunto como um **Preset Customizado**.
  4. O Mestre pode clicar no badge `MODO MESTRE` no topo para ativar temporariamente o modo **Simular Jogador** e testar restrições de interface.

---

### UC-03: Criação de Personagem (Point Buy, Raça, Classe e Avatar Circular)
* **Atores:** Jogador (com `char_create`) ou Mestre.
* **Fluxo:**
  1. Na aba **Mesa** ou **Fichas**, o usuário clica em `＋ CRIAR` (`modal-char-form`).
  2. Distribui os **5 Atributos Canônicos** (`FORCA`, `DESTREZA`, `INTELIGENCIA`, `SABEDORIA`, `LABIA`) partindo de `8` com `+17` pontos (total `57`), podendo aplicar a **Regra do 1 Ponto** (reduzir 1 atributo para `7` para liberar teto `19` em outro).
  3. Seleciona **Raça Base** (ex.: `Dragão`, `Humano`, `Elfo`, `Orc`, `Xituiara`), eventual **Sub-raça** e **Classe Base** (cujo Efeito de Classe entra em vigor imediatamente).
  4. Opcionalmente envia uma imagem para o **Recortador Circular** (`modal-image-cropper`), que envia a imagem original e o token circular para `POST /api/upload-image` (`static/img/fichas/personagens/`).
  5. Ao salvar, `normalize_character` aplica bônus de raça (ex.: `+8` Pontos de Talento do Humano), calcula derivados e posiciona o card automaticamente na **Mesa** sem colisões.

---

### UC-04: Uso da Aba Mesa (Câmera, Arraste AABB, Modo Compacto e Batalha `y = 1500`)
* **Atores:** Mestre e Jogadores.
* **Fluxo:**
  1. O participante navega pela Mesa (`4800 × 3000 px`) ajustando zoom individual (`25%` a `150%`, padrão `75%`) com a roda do mouse e movendo a câmera com botão do meio ou `Espaço + arrastar`, usando **Centralizar** ou **Ver Tudo** quando desejar.
  2. Ao arrastar um card na Mesa, `REMOTE_CARD_DRAG` envia prévias a cada `35 ms` para os demais clientes interpolarem o movimento a **60 FPS**; ao soltar (`REMOTE_CARD_DROP`), `table_engine.py` valida colisão AABB determinística, atualiza `table.rev` e sincroniza a posição final.
  3. O participante pode recolher qualquer card na Mesa para o **Modo Compacto** (token circular **`72 × 96 px`**), ajustando sua caixa de colisão instantaneamente.
  4. O Mestre invoca monstros do **Bestiário** (`TRAZER INIMIGO`) e inicia o **Modo de Batalha**: a Mesa se divide horizontalmente em `y = 1500` (Inimigos acima, Heróis abaixo), realocando apenas quem estiver fora de sua metade ou sobreposto.

---

### UC-05: Catálogo de Itens, Inventário 3×, Peso Seletivo e Transferência P2P
* **Atores:** Mestre e Jogadores.
* **Fluxo:**
  1. Na aba **Catálogo de Itens**, o Mestre (ou membro com `item_manage_catalog`) cadastra itens entre os 5 tipos (`ARMADURA`, `ARMA`, `ACESSORIO`, `CONSUMIVEL`, `OUTRO`), define peso, preço, visibilidade e efeitos sobre os 33 alvos de `VALID_EFFECT_TARGETS`.
  2. Ao abrir a mochila de uma ficha (`modal-char-inventory`, grade `3×`), apenas itens equipáveis marcados como `isEquipped: true` somam ao peso carregado; equipáveis ocupam slots individuais enquanto consumíveis empilham.
  3. Ao clicar em **Equipar**, o `AudioManager` toca `equip_item.mp3` e aplica os bônus na ficha; ao clicar em **Desequipar**, reproduz o mesmo áudio **de trás para frente** via Web Audio API.
  4. Para enviar itens a outro personagem, o usuário clica em **Transferir** (`modal-item-recipient`), escolhe destinatário e quantidade (tocando `move_item_to_player.mp3`).

---

### UC-06: Loja, Barganha ("Fazer Proposta") e Venda em Custódia (`IN_ESCROW`)
* **Atores:** Jogador e Mestre.
* **Fluxo:**
  1. Na aba **Loja & Mercadores**, o jogador seleciona sua ficha compradora e um NPC Mercador.
  2. **Compra Direta:** define a quantidade e clica em **Comprar**; o sistema valida saldo (`sharedGold` ou `char.gold`) e estoque (infinito ou finito), entrega o item, toca `buy_item.mp3` e registra na auditoria.
  3. **Barganha:** o jogador clica em **Fazer Proposta** (`modal-create-proposal`), informa quantidade, valor em ouro ofertado e justificativa. A solicitação entra em `purchaseProposals` (`PENDENTE`). O Mestre abre **Solicitações de Compras** (`modal-purchase-proposals`) e decide entre **Aceitar Proposta** (debita valor negociado, reduz estoque se finito e entrega o item) ou **Recusar**.
  4. **Venda Assistida (`IN_ESCROW`):** no inventário, o jogador clica em **Vender** (`modal-sell-escrow`); o item muda para `IN_ESCROW` (ficando bloqueado e sem efeitos). O Mestre aprova ou recusa na bandeja da Loja, creditando o ouro na carteira caso aprovado.

---

### UC-07: Combate por Turnos, Cargas do Grupo, Pipeline de Dano e Ressurreição
* **Atores:** Mestre e Jogadores.
* **Fluxo:**
  1. O Mestre inicia a batalha definindo a ordem na fila de iniciativa (`modal-battle-order`), onde inimigos/chefes com `turnsPerRound > 1` aparecem múltiplas vezes.
  2. No início do turno de cada jogador vivo: aplica-se dano de `Veneno` (se houver), gera-se **`+1` Carga do Grupo**, recarrega-se `PA` descontando penalidades (`Atordoamento`), expiram buffs/nerfs temporários e regeneram-se Mana/Vida/Armadura percentualmente.
  3. Durante as ações, ataques podem usar o modal de dano (`modal-damage`) no modo **Simples** ou **Pipeline Tática** (Dano Base + Multiplicadores + Bônus %, Letalidade % vs Defesa, Perfuração % vs Resistência %, Ruptura % vs Redução %, ou Dano Real).
  4. Ao atingir o máximo de um dos 7 acúmulos (`Congelamento`, `Choque`, `Sangramento`, `Chamas`, `Veneno`, `Atordoamento`, `Cegueira`), o gatilho automático é disparado; ao encerrar o turno, `Chamas` aplica e escala seu dano de combustão; combatentes com `0 HP` ou `Congelamento` são pulados automaticamente na fila.
  5. Para reerguer um combatente caído (`0 HP`), o Mestre clica em **Reviver** (`modal-revive`) escolhendo `100% Total`, `50% Rápido` ou valores `Personalizados`.

---

### UC-08: Árvores de Habilidades Radiais (4 Quadrantes e Limite `3/3` Passivas)
* **Atores:** Mestre (configuração) e Jogador (evolução).
* **Fluxo:**
  1. O Mestre (ou membro com `manageSkillTrees`) cria árvores na aba **Árvore de Habilidades**, cadastrando nós nos 4 quadrantes (**Passivas**, **Talentos**, **Ativas**, **Supremas** — com campo exclusivo de `Cargas` em Supremas) e configurando o **Efeito de Árvore Completa (`100%`)**.
  2. Na ficha do personagem, o jogador abre a Árvore Radial (`modal-skill-tree`), navega pelas sub-abas (`2 × 3` slots por página) e inspeciona nós no painel flutuante `.sk-inspector`.
  3. Ao investir Pontos de Talento (`skillPoints`), Talentos escalam por múltiplos ranks (`valor × rank`) e Ativas/Supremas/Passivas desbloqueiam e recebem melhorias extras.
  4. Ao ativar Passivas, o sistema impõe o limite global de **`3 / 3` passivas ativas** por ficha; ao atingir `100%` dos passos da árvore, o efeito central de completude ativa automaticamente.
  5. O jogador pode reembolsar um nó individualmente ou clicar em **Resetar Árvore** para recuperar 100% dos pontos gastos nela.

---

### UC-09: Evolução de Nível, Subclasse no Nível 15+, Herança e Troca de Vocação
* **Atores:** Jogador e Mestre.
* **Fluxo:**
  1. Ao acumular XP (`80 XP` base + `+8%` composto por nível), a ficha sobe de nível automaticamente recebendo **`+2 Pontos de Talento`** por nível.
  2. Ao atingir o **Nível 15+**, o seletor de **Subclasse** é desbloqueado na ficha do personagem, aplicando imediatamente o Efeito de Subclasse e liberando seus nós no motor radial.
  3. Com Subclasse ativa no Nível 15+, o jogador pode abrir **Herança de Classe** (`modal-subclass-inheritance`) para escolher outra Classe Base, substituir opcionalmente 1 efeito de sua Classe Base e/ou herdar 1 habilidade (`TALENTO`, `ATIVA` ou `PASSIVA`; `SUPREMA` excluída).
  4. Ao trocar de Classe Base ou Subclasse, o sistema solicita confirmação, reseta os nós da vocação anterior (e nó herdado), devolve `100%` dos pontos gastos e ativa imediatamente a nova vocação.

---

### UC-10: Quadro de Missões e Concessão de Recompensas em Lote
* **Atores:** Mestre e Jogadores.
* **Fluxo:**
  1. O Mestre cadastra uma missão na aba **Missões** (`modal-quest`) com título, descrição e recompensas (Ouro, XP, Pontos de Atributo, Pontos de Talento e Itens).
  2. Um jogador com `mission_accept` aceita a missão vinculando seu personagem (`modal-accept-quest`), mudando o status para `ACEITA` (ou o Mestre altera entre `PENDENTE`, `ACEITA`, `EM_PROGRESSO`, `PAUSADA`, `CONCLUIDA`, `RECUSADA`, `CANCELADA`).
  3. Quando o Mestre (ou `mission_approve`) conclui a missão (`CONCLUIDA`), todas as recompensas são entregues automaticamente uma única vez (`rewarded: true`).
  4. Para recompensas fora do mural, o Mestre usa **XP em Lote** (`modal-bulk-reward`) para distribuir XP, Pontos de Atributo e Pontos de Talento simultaneamente para os personagens selecionados.

---

### UC-11: Bloco de Notas Multi-Páginas, Bestiário, Preferências de Áudio e Undo/Redo
* **Atores:** Mestre e Jogadores.
* **Fluxo:**
  1. Ao clicar em **Notas** no card de uma ficha, o proprietário (ou Mestre) gerencia múltiplas abas nomeadas (`modal-notes`) com editor rico, checklists interativos e tabelas; o **autosave de `600 ms`** persiste isoladamente em `char.notesPages` e sincroniza via WebSocket.
  2. Na aba **Bestiário**, o Mestre cadastra criaturas e alterna entre `Oculto` e `Liberado`; criaturas ocultas só ficam visíveis ao Mestre e a membros com `bestiary_view_hidden`.
  3. Clicando na engrenagem (`#btn-open-preferences`) no topo, qualquer usuário configura individualmente em seu navegador o toggle de **Notificações na Tela**, o **Volume Geral (padrão `25%`)** e os 4 canais individuais (`buy`, `equip`, `move`, `hover`) com botão de teste `▶`.
  4. Caso ocorra um erro de operação, o Mestre (ou `system_undo_redo`) clica em **DESFAZER (`Ctrl+Z`)** ou **REFAZER (`Ctrl+Y`)** no rodapé da sidebar para navegar pelos últimos **`6` snapshots** de estado da campanha, recuperando inclusive cards excluídos na Mesa via `graveyard`.

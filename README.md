# ⚔️ CMrpg — Sistema Completo de Gestão de RPG & Combate em Tempo Real (Radmin VPN)

Aplicação web local em tempo real para gerenciamento completo de campanhas de RPG de mesa (fichas, atributos Point Buy, catálogo de itens com motor de efeitos, loja de mercadores NPC, vendas em escrow, combate por turnos com cargas do grupo, missões e auditoria perpétua), projetada para rodar em rede local virtual via **Radmin VPN** sem necessidade de contas externas ou login de Discord.

---

## 👑 Modelo de Acesso Local (`Host = Mestre` / `Rede = Jogador`)

- **Sem Login de Discord ou Senhas:** Pensado para uso pessoal entre amigos na mesma rede do Radmin VPN.
- **Mestre Automático (Host):** Quem acessa pelo computador que está executando o servidor (`http://localhost:8000` ou o próprio IP da máquina Host) recebe automaticamente o cargo **`👑 MODO MESTRE`** (com opção de clicar no badge no topo para simular a visão de Jogador).
- **Jogadores Automáticos (Convidados na Rede):** Qualquer amigo que acessar pelo IP do Radmin VPN (`http://26.x.x.x:8000`) entra automaticamente como **`👤 MODO JOGADOR`**, podendo escolher seu apelido e vincular seu personagem na tabela de membros.

---

## 🚀 Passo a Passo de Uso com Radmin VPN

1. **Conecte-se à rede no Radmin VPN** com seus amigos.
2. Na pasta do projeto `CMrpg`, dê **2 cliques** em **`iniciar_servidor.bat`**.
3. O script verificará e liberará automaticamente a porta `8000` no Firewall do Windows (`profile=any`), criará o `venv`, instalará as dependências e abrirá `http://localhost:8000`.
4. Na tela inicial (**Visão Geral**), clique no botão dourado **`📋 COPIAR LINK`** na faixa *"Convide seus Jogadores"* e envie o link (`http://26.x.x.x:8000`) para os jogadores!

---

## 🏰 Seções da Interface (Dark Fantasy Medieval)

1. **🏠 Visão Geral:**
   - Banner temático da campanha com título, subtítulo e mensagem de boas-vindas editáveis.
   - Faixa de conexão Radmin VPN com cópia de link em 1 clique.
   - Tabela **Membros da Sala** com busca, filtro de cargos e configuração de permissões individuais por jogador (`Jogador Comum`, `Moderador`, `Gerente de Loja`, `Gerente de Inventário`, `Personalizado`).
2. **👤 Personagens & Fichas:**
   - Cards táticos com **Drag & Drop** (arraste pelo nome do personagem no topo do card), busca instantânea (`BUSCAR...`), barras de **Vida ❤️**, **Armadura 🛡️** e **Mana ✨** (com suporte a `OVERFLOW`).
   - **Ficha Completa (`📜`):**
     - **5 Atributos Canônicos** (`Força`, `Destreza`, `Inteligência`, `Sabedoria`, `Lábia`) com validação **Point Buy (Base 8 + 17 pts = 57 total + Regra do 1 Ponto)**, tabela de modificadores (`-5` a `+7`) e **Sucesso Automático Passivo** ($\ge 15 \rightarrow \text{DC } 5$, $\ge 17 \rightarrow \text{DC } 8$, $\ge 19 \rightarrow \text{DC } 11$).
     - **Progressão de Nível e XP (+8% composto por nível):** Inicia em `0 / 80 XP` e concede automaticamente **$+2$ Pontos de Habilidade (Talentos)** a cada nível alcançado.
     - **Inventário & Peso Seletivo:** Apenas itens equipáveis marcados como `EQUIPADO` somam peso na carga. Suporta transferência P2P entre jogadores, uso de consumíveis por turno e venda em `IN_ESCROW`.
   - **Painel das 7 Resistências (`💊`):** *Congelamento, Choque, Sangramento, Chamas, Veneno, Atordoamento e Cegueira*, disparando alerta Toast para toda a sala ao atingir o máximo (`"[Nome] MAX [Resistência]!"`).
3. **📦 Catálogo de Itens:**
   - 5 Tipos (`ARMADURA`, `ARMA`, `ACESSORIO`, `CONSUMIVEL`, `OUTRO`) com **Motor de Efeitos** (`FLAT` e `PERCENT`) que recalcula automaticamente os atributos de todos os personagens que possuem o item equipado.
4. **🛍️ Loja & Mercadores:**
   - Cadastro de NPCs negociantes pelo Mestre, compra atômica usando o Cofre Compartilhado (ou Carteira Individual) e **Central de Aprovação de Vendas em Escrow (`IN_ESCROW`)**.
5. **⚔️ Combate & Turnos:**
   - Controle de estado `EM BATALHA`, fila de iniciativa com rolador `1d20`, contadores de `Rounds`, `Turnos Totais`, `Turnos do Mestre` e **Pool Compartilhado de Cargas do Grupo (`groupCharges`)**.
   - **Rotina Automática de Início de Turno:** No turno de cada jogador vivo, recarrega `PA`, regenera Mana e soma **$+1$ Carga do Grupo**.
   - **Calculadora de Dano Dupla:** Modo Rápido/Dano Real e **Pipeline Completa** (`Dano Base`, `Multiplicadores`, `Bônus %`, `Letalidade %`, `Perfuração %`, `Ruptura %` e **Sobrecarga Temporária de Armadura Máxima**).
   - **Morte e Ressurreição:** Personagens com `0 HP` entram em estado `MORTO` e podem ser revividos pelo Mestre em **100%**, **50%** ou **Valores Personalizados**.
6. **📜 Missões:**
   - Quadro de missões com pacotes de recompensas (`Ouro`, `XP`, `Pontos de Atributo`, `Pontos de Habilidade` e `Itens`) entregues automaticamente ao concluir, além de **Concessão em Lote (`Bulk Actions`)**.
7. **⚙️ Administração:**
   - Configurações matemáticas da campanha (`FLAT_FIRST` vs `PERCENT_FIRST`, `ROUND_DOWN` vs `ROUND_UP`), exportação de backup JSON e **Histórico de Auditoria Perpétuo (`RoomAuditLog`)**.

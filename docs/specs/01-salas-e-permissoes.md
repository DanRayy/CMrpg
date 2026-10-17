# Especificação 01: Salas, Acesso e Permissões

## 1. Regras de Salas Privadas
1. **Criação:**
   - Qualquer usuário autenticado via Discord pode criar uma sala.
   - O criador da sala torna-se automaticamente o **Mestre**.
   - Cada usuário pode ser Mestre de no máximo **10 salas ativas** simultaneamente.
2. **Dados Obrigatórios na Criação:**
   - Nome da Sala
   - Descrição
   - Nome da Moeda (Padrão: "Ouro")
   - Quantidade inicial de moeda do grupo
   - Moeda Compartilhada: Sim/Não (Default: Sim)
   - Inventário Ilimitado: Sim/Não (Se Não: limite padrão de 10 itens por jogador)
3. **Links de Convite:**
   - O sistema gera um link com token único no formato: `https://.../invite/[token]`.
   - Validade padrão do link: **1 hora (60 minutos)**.
   - Quando o link expira ou quando o Mestre revoga, um novo link/token é gerado imediatamente.
   - O Mestre pode configurar se o convite é de uso único ou de múltiplos usos.
4. **Membros e Moderação:**
   - O Mestre pode expulsar um membro (pode retornar com convite válido).
   - O Mestre pode banir temporariamente ou permanentemente um membro.
   - O Mestre pode alterar o apelido/nome exibido de qualquer membro dentro da sala.

---

## 2. Sistema de Permissões Granulares

### 2.1 Papéis Base
* **MESTRE:** Dono da sala. Acesso total e absoluto.
* **JOGADOR:** Membro comum. Possui apenas permissões padrão básicas.

### 2.2 Lista de Permissões Configuráveis por Jogador
O Mestre pode ativar ou desativar individualmente para cada jogador:
* **Sala:** Visualizar configurações, alterar nome/descrição, gerenciar convites, visualizar histórico geral.
* **Jogadores:** Visualizar membros, expulsar, banir, gerenciar permissões de outros.
* **Personagens:** Criar personagens, editar o próprio, editar personagens de terceiros, visualizar outros personagens, deletar, importar/exportar.
* **Inventário:** Visualizar próprio inventário, visualizar inventário de terceiros, adicionar itens, remover, deletar, enviar/receber, solicitar venda, aprovar vendas.
* **Loja:** Visualizar loja, comprar itens, vender itens, criar/editar/deletar itens e NPCs, gerenciar itens vendidos por NPCs.
* **Moeda:** Visualizar saldo, alterar quantidade, adicionar/remover moeda.
* **Missões:** Visualizar, criar, editar, deletar, aceitar, recusar, cancelar, concluir missões.

### 2.3 Perfis Rápidos de Permissão (Presets)
O Mestre pode aplicar e reutilizar perfis pré-configurados em lote:
* **Jogador Comum:** Permissões básicas estritas.
* **Moderador:** Gestão de membros e missões.
* **Gerente de Loja:** Criação e manutenção de itens, preços e NPCs.
* **Gerente de Inventário:** Gestão e aprovação de vendas de itens.
* **Personalizado:** Combinação livre de checkboxes.

### 2.4 Permissões Não-Delegáveis (Exclusivas do Mestre)
* Conceder pontos de Experiência (XP).
* Transferir propriedade da sala.
* Excluir permanentemente a sala.
* Remover o próprio acesso de Mestre.

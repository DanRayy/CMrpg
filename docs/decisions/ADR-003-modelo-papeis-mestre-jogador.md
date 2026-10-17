# ADR-003: Modelo de Papéis (Mestre vs. Jogador) e Permissões

## Status
Aceito

## Contexto
O sistema necessita de controle de acesso para garantir que apenas o Mestre execute ações críticas da mesa, permitindo ao mesmo tempo delegar tarefas operacionais (como cadastrar itens ou gerenciar missões) para jogadores de confiança.

## Decisão
1. **Apenas 2 Papéis Base:**
   - `MESTRE`: Criador e proprietário da sala. Possui acesso total e irrestrito (bypass em checagens).
   - `JOGADOR`: Integrante comum que entrou via convite. Recebe por padrão apenas as permissões básicas da sala.
2. **Permissões Granulares e Overrides:**
   - As permissões são modeladas como flags booleanas (ex: `canCreateItems`, `canManageQuests`, `canViewOtherInventories`).
   - Por padrão, o Jogador não possui nenhuma permissão administrativa.
   - O Mestre pode conceder ou revogar permissões individualmente para qualquer jogador.
3. **Ações Não-Delegáveis (Exclusivas do Mestre):**
   - Conceder pontos de Experiência (XP).
   - Transferir a propriedade da sala.
   - Excluir permanentemente a sala.
   - Alterar o próprio nível de permissão (proteção contra auto-bloqueio).

## Consequências
- Simplifica a modelagem relacional eliminando hierarquias intermediárias rígidas (como Admin/Mod fixos).
- O backend valida permissões em nível de rota/serviço através de middlewares declarativos.

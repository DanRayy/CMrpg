# ADR-010: Validação de Contratos com Zod, Resiliência de Conexão e Padrões de UX

## Status
Aceito

## Contexto
A experiência ao vivo em uma sessão de RPG pelo Discord é dinâmica e propensa a erros humanos (cliques acidentais, compras erradas, instabilidades momentâneas de internet ou envio de dados malformados). Para mitigar esses problemas sem sobrecarregar a arquitetura, definem-se padrões rígidos de UX, resiliência e contratos de dados.

## Decisão
1. **Contratos com Zod no Pacote Compartilhado (`@rpg/types`):**
   - Todos os payloads de entrada (criação de personagem, mutações de saldo, dano de combate, criação de itens) são validados via schemas Zod.
   - O Frontend usa os schemas para validação em tempo real e formulários.
   - O Backend usa os mesmos schemas em middlewares do Express, bloqueando requisições inválidas no perímetro da API.
2. **Prevenção de Cliques Duplos (Zero Double-Click):**
   - Botões de ações críticas de mutação entram em estado de bloqueio imediato (`disabled`) no primeiro clique do usuário, impedindo disparos concorrentes duplicados no navegador.
3. **Reconexão Suave com Auto-Refetch:**
   - O cliente monitora o canal do Pusher. Caso ocorra queda de conexão, exibe badge não-bloqueante de *"Reconectando..."* e, após o restabelecimento da conexão, dispara um `GET /api/rooms/:id/sync` para atualizar o estado completo da sala.
4. **Design Mobile-First para Jogadores:**
   - A ficha do jogador é otimizada para visualização vertical em smartphones (a partir de 360px de largura), priorizando Vida, Armadura, Turno e Ações Rápidas sem exigir scrolls excessivos.
5. **Auditoria com Snapshot para Rollback:**
   - O log de auditoria armazena o snapshot do estado anterior de entidades críticas, permitindo ao Mestre desfazer mutações acidentais com 1 clique.

## Consequências
- Máxima robustez, tolerância a falhas na sessão ao vivo e blindagem completa contra dados inválidos.

# ADR-006: Tempo Real Gratuito com Pusher Channels na Vercel

## Status
Aceito

## Contexto
O sistema requer atualização instantânea de dados (avaliação de turnos, aplicação de dano, atualização de vida/armadura, compras na loja e inventário) sem exigir que o jogador atualize a página manualmente (F5). A Vercel opera sob o paradigma Serverless (onde funções são efêmeras e não mantêm conexões WebSockets nativas abertas continuamente).

## Decisão
Utilizaremos o serviço gerenciado **Pusher Channels** no plano gratuito perpétuo integrado à Vercel:
1. **Topologia de Canais:** Cada sala ativa terá um canal privado ou de presença: `presence-room-${roomId}`.
2. **Ciclo de Atualização:**
   - O Frontend (React) dispara mutações HTTP REST para o Backend (Express na Vercel).
   - O Backend persiste as mudanças no PostgreSQL (Neon) dentro de transações seguras.
   - O Backend despacha o evento correspondente para a API REST do Pusher.
   - O Pusher transmite o evento via WebSocket seguro para todos os clientes conectados na sala em menos de 50ms.
3. **Limites do Free Tier:** 100 conexões simultâneas e 200.000 mensagens/dia, mais do que suficiente para o público-alvo (até 10 jogadores por mesa).
4. **Benefício de Zero Cold Start:** A aplicação responde imediatamente, eliminando o problema de "servidor dormindo" presente em provedores de containers gratuitos (como Render).

## Consequências
- Alta estabilidade, latência mínima e custo zero de infraestrutura.

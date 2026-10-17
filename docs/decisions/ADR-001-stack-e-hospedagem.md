# ADR-001: Definição da Stack Tecnológica e Hospedagem

## Status
Aceito

## Contexto
O projeto consiste em um sistema web de apoio para mesas de RPG jogadas via Discord. O sistema precisa atender inicialmente até 10 jogadores por mesa, com suporte a múltiplas salas privadas, regras próprias (homebrew), inventário, combate por turnos e economia, mantendo custo zero de infraestrutura e alta manutenibilidade.

## Decisão
Adotamos a seguinte stack tecnológica:
1. **Linguagem:** TypeScript (Fullstack) para compartilhamento seguro de tipos e regras matemáticas.
2. **Backend:** Node.js com Express para construção das APIs REST e middlewares de autenticação/autorização.
3. **Frontend:** React (Vite SPA) componentizado e responsivo (Desktop para o Mestre, Mobile-first para os Jogadores).
4. **ORM:** Prisma ORM para modelagem relacional tipada e controle de migrações.
5. **Banco de Dados:** Neon PostgreSQL (Serverless) aproveitando o plano gratuito, escalabilidade a zero e o recurso de Database Branching para testes.
6. **Autenticação:** Discord OAuth2, integrando nativamente a identidade dos jogadores com seus usuários do Discord.
7. **Arquitetura de Repositório:** Monorepo (pnpm workspaces / Turborepo) com separação em `apps/web`, `apps/api` e pacotes compartilhados (`packages/rules-engine`, `packages/types`, `packages/database`).
8. **Hospedagem:** Vercel para o Frontend e APIs Serverless.
9. **Metodologias:** Spec-Driven Development (SDD) e Test-Driven Development (TDD) para o motor de regras.

## Consequências
- **Positivas:** Custo zero de hospedagem e banco de dados, compartilhamento direto de tipos e regras entre front e back, sem necessidade de implementar gestão de senhas/recuperação de e-mail.
- **Limitações:** Por ser hospedado na Vercel (ambiente Serverless), WebSockets nativos persistentes não são suportados diretamente na infraestrutura da Vercel, demandando um serviço pub/sub externo compatível (ver ADR-006).

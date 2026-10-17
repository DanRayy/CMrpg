# 🗺️ Cronograma do Projeto (Roadmap)

Este documento registra as fases de desenvolvimento do Sistema de Gestão de RPG para Discord, seu status atual e o planejamento das próximas entregas.

---

## Status Geral: FASE 7 CONCLUÍDA (Missões, Auditoria Perpétua & Painel Administrativo)

```text
========================================================================================
[x] FASE 1: Concepção, Documentação e Especificação Técnica (SDD) - CONCLUÍDA
    ├── [x] Definição da stack tecnológica e viabilidade gratuita na Vercel
    ├── [x] Definição do modelo de arquitetura multi-tenant por sala
    ├── [x] Definição do sistema de permissões simplificado (Mestre x Jogador + Overrides)
    ├── [x] Especificação do motor matemático de ficha e atributos (Base 8, 17pts, Regra do 1 Ponto)
    ├── [x] Especificação dos 5 tipos de itens e motor de efeitos (Flat e %)
    ├── [x] Especificação do combate por turnos, participação do Mestre, armadura e ressurreição
    ├── [x] Escolha da infraestrutura de tempo real (Pusher Channels Free Tier)
    ├── [x] Definição dos status iniciais e curva de progressão de XP (+8%) e habilidades (+2/nível)
    ├── [x] Especificação da pipeline modular de cálculo de dano, mitigações e penetrações (%)
    ├── [x] Geração dos arquivos de especificação (.md), ADRs (001 a 012) e Use Cases
    ├── [x] Criação do arquivo de governança rules.md (Zero Suposições, TDD, Zonas de Risco e UX)
    └── [ ] Desenho do Schema do Prisma (PostgreSQL / Neon)

[x] FASE 2: Core Domain & Engine de Regras (TDD)
    ├── [x] Setup inicial do Monorepo (pnpm workspaces v12)
    ├── [x] Criação do pacote `@rpg/types` com schemas Zod completos
    ├── [x] Criação do pacote `@rpg/rules-engine` (TypeScript Puro)
    ├── [x] Testes unitários para distribuição de pontos de atributos e regra de 1 redução (100% passando)
    ├── [x] Testes unitários para tabela de modificadores e sucessos automáticos passivos (100% passando)
    ├── [x] Testes unitários para curva de progressão de XP (+8%) e pontos de habilidade (100% passando)
    ├── [x] Testes unitários para cálculo de efeitos de status (Precedência Fixo vs % e Arredondamento)
    └── [x] Testes unitários para a pipeline modular de dano (Letalidade, Perfuração, Ruptura e Armadura)

[x] FASE 3: Infraestrutura, Banco de Dados & Autenticação - CONCLUÍDA
    ├── [x] Configuração do Prisma ORM com adapter do Neon PostgreSQL
    ├── [x] Modelagem do Schema com 12 entidades e regras relacionais
    ├── [x] Autenticação com Discord OAuth2 (Session / JWT) e Dev-Login
    ├── [x] Sistema de criação e limite de 10 salas por usuário
    ├── [x] Sistema de links de convite (expiração de 1h e regeneração)
    ├── [x] Middleware multi-inquilino de isolamento e bloqueio por ban
    ├── [x] Testes de integração de Auth e Rooms (14/14 passando)
    └── [x] Frontend Base (React + Vite + Tailwind + Dark Fantasy Design)

[x] FASE 4: Gestão de Personagens & Inventário Base - CONCLUÍDA
    ├── [x] Interface e endpoints para criação de ficha dentro da sala
    ├── [x] Validação server-side estrita das regras de atributos via Schemas Zod (Point Buy 57 pts)
    ├── [x] Atribuição automática de status Nível 1 canônicos (HP 80, PA 3, Mana 100, Regen 20%)
    ├── [x] Catálogo de itens do Mestre (CRUD de itens com 5 tipos e efeitos múltiplos)
    ├── [x] Inventário de jogadores com envio P2P atômico entre personagens da sala
    └── [x] Cálculo dinâmico de carga baseado apenas em itens equipáveis

[x] FASE 5: Economia, Loja & Sistema de Aprovação - CONCLUÍDA
    ├── [x] Carteira compartilhada da sala com controle de concorrência e gerenciamento de moeda
    ├── [x] Widget do cofre integrado na barra superior com saldo em tempo real
    ├── [x] NPCs negociantes com CRUD e suporte a Estoque Infinito e Finito
    ├── [x] Solicitação de compra com retenção atômica de ouro no cofre
    ├── [x] Central unificada de aprovação do Mestre para compras e vendas em escrow
    ├── [x] Regra de estorno automático integral de ouro em recusa ou cancelamento
    ├── [x] Restrição estrita de compra na loja exigindo personagem criado (inclusive Mestre)
    └── [x] Máquina de estados para venda de itens com aprovação/recusa do Mestre (`IN_ESCROW`)

[x] FASE 6: Combate por Turnos & Tempo Real - CONCLUÍDA
    ├── [x] Integração do Pusher Channels no Backend (Express) e Frontend (React) com fallback gracioso
    ├── [x] Controle de estado de combate (`EM_BATALHA`), ordens de iniciativa customizáveis e rolador 1d20
    ├── [x] Turno ativo compartilhado, rotina de início de turno (3 PA, +20% Mana, +1 Carga) e avanço forçado Anti-AFK
    ├── [x] Painel de Cargas do Grupo compartilhadas com controles instantâneos (+ / -)
    ├── [x] Aplicação de dano tático (Direto e Pipeline Completa com Letalidade, Perfuração, Ruptura e Sobrecarga)
    ├── [x] Degradação temporária de Armadura Máxima por sobrecarga e restauração integral ao fim do combate
    ├── [x] Morte de personagem (`isDead: true`, HP 0, PA 0) e Modal de Ressurreição (100%, 50%, Personalizado)
    └── [x] Cockpit tático responsivo na aba "Combate & Turnos" com badges visuais dinâmicos

[x] FASE 7: Missões, Auditoria Perpétua & Painel Administrativo - CONCLUÍDA
    ├── [x] Sistema de missões com múltiplos status (Pendente, Aceita, Em Progresso, Pausada, Concluída, Recusada, Cancelada)
    ├── [x] Recompensas variadas de missões (Ouro, XP, Atributos e Pontos de Talento)
    ├── [x] Cockpit de talentos na ficha gerenciado pelo dono e ganho automático de +2 talentos por nível
    ├── [x] Banner de atributos pendentes com histórico de origem e aplicação direta nos atributos
    ├── [x] Concessão de XP e Atributos em lote exclusiva do Mestre (`BulkRewardModal`)
    ├── [x] Stream e visualização do histórico de auditoria perpétuo (`RoomAuditLog`) com Rollback atômico
    └── [x] Painel visual para o Mestre ativar/desativar permissões individuais por jogador (`MemberPermissionsModal`)
========================================================================================
```

# ADR-008: Máquina de Estados de Batalha por Turnos, Cargas do Grupo e Telemetria

## Status
Aceito

## Contexto
O combate da mesa é gerenciado em tempo real por uma fila de turnos. O Mestre participa ativamente da iniciativa. O grupo de jogadores compartilha uma reserva de recursos coletiva (Cargas do Grupo) que se acumula no início do turno de cada jogador, e o sistema necessita de contadores estatísticos (turnos totais, turnos do mestre, turnos individuais por jogador) para transparência de combate.

## Decisão
1. **Estado de Batalha:** Controlado exclusivamente pelo Mestre (`EM_BATALHA: true | false`).
2. **Ordem de Iniciativa Configurável:** O Mestre define e reordena a lista sequencial de participantes (Jogadores + Mestre).
3. **Participação do Mestre:** O Mestre ocupa um ou mais slots na ordem de iniciativa. Durante o seu turno, ele executa aplicações de dano e ações narrativas.
4. **Contador de Cargas Compartilhado pelo Grupo (`groupCharges`):**
   - As cargas são um recurso do **grupo** (pool comum da equipe).
   - No início do turno de qualquer jogador, o campo `groupCharges` da batalha é incrementado automaticamente em $+1$.
   - O Mestre **não** adiciona cargas no seu turno.
   - Qualquer jogador em seu turno pode consumir ou ajustar a reserva de cargas compartilhada.
5. **Telemetria e Métricas de Combate:**
   - O estado da batalha acumula: `totalTurnsCount`, `roundNumber`, `masterTurnsCount`, e `turnsTaken` individualmente por participante.
6. **Morte de Jogadores:**
   - Personagens com Vida 0 entram no estado `MORTO`.
   - Na sua vez da iniciativa, o turno chega até ele normalmente, mas a interface do jogador fica bloqueada com apenas um botão permitido: **"Avançar Turno"**.
7. **Avanço Forçado pelo Mestre:** O Mestre possui a permissão de forçar o avanço do turno a qualquer instante (para contornar jogadores ausentes ou AFK).
8. **Ressurreição pelo Mestre:** O Mestre pode reviver qualquer jogador caído a qualquer momento, escolhendo entre restauração de 100%, 50% rápida ou valores manuais/personalizados de Vida e Armadura.

## Modelo de Dados do Estado de Batalha
```typescript
interface BattleState {
  roomId: string;
  isActive: boolean;
  roundNumber: number;
  totalTurnsCount: number;
  masterTurnsCount: number;
  currentTurnIndex: number;
  groupCharges: number; // Reserva/Pool compartilhado de cargas de todo o grupo
  participantsOrder: Array<{
    id: string; // ID do personagem ou 'MESTRE'
    name: string;
    isMaster: boolean;
    isDead: boolean;
    turnsTaken: number;
  }>;
}
```

## Consequências
- Fomenta cooperação tática, permitindo que a equipe combine o uso de uma reserva comum de cargas de combate.

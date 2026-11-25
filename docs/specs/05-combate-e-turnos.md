# Especificação 05: Combate, Fila de Iniciativa, Cargas e Pipeline de Dano

## 1. Fila de Iniciativa e Sidebar Direita (`#battle-sidebar`)

O estado de combate reside em `state.battle` (`isActive`, `roundNumber`, `currentTurnIndex`, `charges`, `orderIds[]`, `turnCounts{}`) e é exibido na sidebar direita retrátil (`#battle-sidebar`, `300px` de largura):

- **Configuração da Ordem (`modal-battle-order`):**
  - Ao clicar em **INICIAR BATALHA** (`#btn-battle-toggle` / `#btn-fichas-battle-toggle`, protegido por `combat_manage_battle`), o Mestre define e ordena os combatentes participantes em `orderIds`.
  - **Múltiplos Turnos por Rodada (`turnsPerRound`):** inimigos e chefes configurados com `turnsPerRound > 1` são inseridos múltiplas vezes na fila `orderIds`. Durante a ação do chefe, a interface exibe o contador de ação (`Ação X/Y`, ex.: `1/2`, `2/2`).
- **Avanço de Turno e Autoridade:**
  - Botão de **Avançar Turno** verifica `canCurrentMemberAdvanceTurn()`: Mestre ou permissão `combat_advance_any_turn` avançam qualquer turno (inclusive inimigos); jogadores comuns avançam apenas quando é o turno de uma ficha vinculada a si (`combat_advance_own_turn`).
  - O servidor (`main.py`) revalida a autoria e permissão de avanço de turno antes de aceitar a mutação via WebSocket.
  - Sempre que `currentTurnIndex` dá a volta completa em `orderIds` (`nextIdx === 0`), `roundNumber` é incrementado em `+1`.

---

## 2. Rotina Automática de Turnos (Início, Fim e Auto-Skip)

Implementada em `advanceBattleTurn` e `processStartOfTurn` (`02-websocket-combat.js`):

### Ao Finalizar o Turno do Combatente Atual (`finishingChar`)
1. **Dano de Chamas (`CHAMAS`):** se o combatente vivo estiver sob efeito de `Chamas (Combustão)`, sofre `currentDmg` (inicial `15 + 2 × Nível`) absorvido primeiro pela Armadura e depois pela Vida. Em seguida, o próximo dano escala para `Math.floor((currentDmg + 10) * 1.2)` e a duração restante cai em `1` (extinguindo quando chega a `0`).

### Seleção do Próximo Combatente Apto (Auto-Skip)
O cursor percorre `orderIds` pulando automaticamente:
1. **Mortos (`hp <= 0` ou `isDead === true`):** permanecem na fila (para possível ressurreição em combate), mas têm o turno pulado automaticamente.
2. **Congelados (`CONGELAMENTO`) e Pós-Congelamento:**
   - Se possuir `CONGELAMENTO`, o Nerf é removido, o turno é pulado e o combatente recebe **`Imunidade a Congelamento`** por `1` turno.
   - Se possuir `Imunidade a Congelamento` e o medidor de `Congelamento` tiver atingido `current >= max` enquanto imune, a imunidade cessa na vez dele, o medidor zera, o congelamento dispara imediatamente e o turno é pulado (renovando `Imunidade a Congelamento` por 1 turno).

### Ao Iniciar o Turno do Combatente Apto (`actingChar`)
1. **Dano de Veneno (`VENENO`):** se possuir `Veneno Letal`, sofre dano **direto na Vida** (ignora Armadura) de **`5%` do HP Máx** (inimigos) ou **`10%` do HP Máx** (jogadores). Se o Veneno zerar o HP, o combatente cai (`isDead = true`, `pa = 0`) e não executa os passos seguintes.
2. **Cargas do Grupo:** se for um **jogador vivo** (`!isEnemy`), `state.battle.charges` recebe **`+1`**. Inimigos e combatentes mortos **nunca** geram cargas.
3. **Recarga de Pontos de Ação (`PA`):** `pa` é restaurado para `max(0, baseMaxPa - penalidades)` — por exemplo, descontando `-1 PA` de `Atordoamento` ativo.
4. **Expiração de Buffs/Nerfs Temporários:** decrementa em `1` a duração dos efeitos temporários (exceto `CHAMAS`, que decai no fim do turno, e efeitos permanentes). Efeitos zerados são removidos e, caso `Imunidade a Congelamento` expire nesse momento com acúmulo represado no máximo, dispara `checkPendingFreezeTrigger`.
5. **Regeneração Percentual Automática:**
   - **Mana:** recupera `Math.round(maxMana * (regen / 100))`, limitado a `maxMana`.
   - **Vida e Armadura:** aplica `effectiveRegenVida` e `effectiveRegenArmadura` (quando `> 0`), limitados aos respectivos máximos.

---

## 3. Sistema de Cargas do Grupo (`state.battle.charges`)

- Reserva tática compartilhada pelos heróis durante o combate, exibida no topo da sidebar de batalha.
- **Geração:** `+1` automática no início do combate (se o 1º na iniciativa for um jogador vivo) e `+1` no início do turno de cada jogador vivo. Inimigos e mortos não geram cargas — invariante reforçada no servidor em `main.py`.
- **Ajuste Manual (`-` / `+`):** permitido para o Mestre ou membros com `combat_manage_charges` (`adjustBattleCharges`).
- **Redução por Choque:** acúmulo máximo de `Choque` reduz o pool em `-1` (inimigo) ou `-2` (jogador).

---

## 4. Pipeline Modular de Dano (`evaluate_damage_pipeline`)

Disponível no modal de dano (`modal-damage`) em dois modos (**Simples** e **Pipeline Tática**) e exposto via `POST /api/preview-damage` (`rules_engine.py`):

### Modo Simples
- **Normal:** absorve o dano primeiro na `Armadura` (`armor`) e repassa o excedente para a `Vida` (`hp`).
- **Dano Real (`isTrueDamage: true`):** ignora Armadura e reduz diretamente a `Vida` (`hp`).

### Modo Pipeline Tática (Ordem Estrita)
1. **Dano Bruto:**
   - `D_base_eff = max(0, DanoBase + MultiplicadoresStatus)`
   - `D_raw = D_base_eff × (1 + BonusDano% / 100)`
2. **Se Dano Real (`is_true_damage: true`):**
   - Zera mitigação (`Defesa = 0`, `Resistência = 0%`, `Redução = 0%`), arredonda `D_raw` via `apply_rounding` e subtrai direto do `HP` (sem tocar na Armadura).
3. **Caso Contrário (Dano Mitigável):**
   - **Etapa 1 — Defesa com Letalidade %:**
     `Def_eff = max(0, DefesaAlvo × (1 - clamp(Letalidade%, 0, 100) / 100))`
     `D1 = max(0, D_raw - Def_eff)`
   - **Etapa 2 — Resistência % com Perfuração %:**
     `Res_eff = clamp(ResistenciaAlvo% × (1 - clamp(Perfuracao%, 0, 100) / 100), 0, 100)`
     `D2 = D1 × (1 - Res_eff / 100)`
   - **Etapa 3 — Redução de Dano Final % com Ruptura %:**
     `Red_eff = clamp(ReducaoAlvo% × (1 - clamp(Ruptura%, 0, 100) / 100), 0, 100)`
     `D_final = max(0, apply_rounding(D2 × (1 - Red_eff / 100), roundingMode))`
   - **Etapa 4 — Absorção Armadura → Vida:**
     Se `D_final > ArmaduraAtual`, `Armadura = 0` e `HP = max(0, HPAtual - (D_final - ArmaduraAtual))`; caso contrário, `Armadura = ArmaduraAtual - D_final` e `HP` permanece intacto.

---

## 5. Sistema de Morte (`0 HP`) e Ressurreição (`modal-revive`)

- **Morte em Combate:** sempre que `hp === 0`, `normalize_character` e as funções de dano marcam `isDead = true` e zeram `pa = 0`. O card exibe o banner de combatente derrotado (`PERSONAGEM MORTO (0 HP)` ou `INIMIGO DERROTADO / MORTO`).
- **Ressurreição pelo Mestre (`modal-revive`):** disponível no banner de morte para o Mestre com 3 modalidades:
  1. **`100% Total`:** restaura Vida e Armadura (e status vitais) para 100% dos valores máximos e remove `isDead`.
  2. **`50% Rápido`:** restaura 50% dos valores máximos (respeitando o modo de arredondamento da sala).
  3. **`Personalizado`:** o Mestre define manualmente os valores exatos de **Vida Restaurada** (`min: 1`) e **Armadura Restaurada** (`min: 0`).

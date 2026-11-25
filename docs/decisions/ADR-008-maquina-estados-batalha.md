# ADR-008: Máquina de Estados de Batalha, Turnos Múltiplos, Cargas e Acúmulos

- **Status:** Aceito (Em Produção)

## Contexto

O combate tático do CMrpg envolve múltiplos participantes, chefes com mais de uma ação por rodada (`turnsPerRound`), pool coletivo de Cargas do Grupo, recarga automática de PA/Mana/Vida/Armadura e efeitos de acúmulo com disparo automático no início ou no fim do turno.

## Decisão

Implementar uma máquina de estados determinística em `state.battle` (`02-websocket-combat.js` + validação no servidor em `main.py`):
- **Fila `orderIds` com Múltiplos Turnos:** chefes e inimigos com `turnsPerRound > 1` ocupam múltiplas entradas em `orderIds` (exibindo `Ação X/Y`).
- **Rotina de Fim de Turno:** processa dano escalonável de `Chamas` (`floor((dano + 10) * 1.2)`) e reduz sua duração antes de avançar o ponteiro.
- **Auto-Skip de Mortos e Congelados:** combatentes com `hp <= 0` ou `isDead` permanecem na fila (permitindo ressurreição) mas são pulados; combatentes com `CONGELAMENTO` pulam o turno e recebem `Imunidade a Congelamento` (1 turno), disparando acúmulos represados no máximo assim que a imunidade expira.
- **Rotina de Início de Turno (`processStartOfTurn`):** aplica `Veneno` direto na Vida (`5%` inimigo / `10%` jogador), concede **`+1` Carga do Grupo** apenas para jogadores vivos (invariante validada no servidor), recarrega `PA` descontando penalidades (`Atordoamento`), decrementa buffs/nerfs temporários e executa regeneração percentual de Mana, Vida e Armadura.

## Consequências

- **Positivas:** elimina esquecimentos manuais de ticks de veneno/chamas, recarga de PA e contagem de cargas; garante justiça entre jogadores e inimigos via checagem no servidor.
- **Negativas:** a fila requer `sanitizeBattleOrder()` caso personagens ou instâncias de inimigos sejam removidos durante o combate.

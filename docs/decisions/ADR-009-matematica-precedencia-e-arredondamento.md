# ADR-009: Precedência Matemática e Estratégia de Arredondamento Configuráveis

## Status
Aceito

## Contexto
Diferentes mestres e mesas de RPG possuem interpretações divergentes sobre a ordem em que modificadores matemáticos devem ser aplicados (fixo antes de percentual ou percentual antes de fixo) e como lidar com frações decimais resultantes de porcentagens.

## Decisão
A tabela de configurações da sala (`RoomSettings`) possuirá duas configurações matemáticas explícitas:
1. `statModifierPrecedence`:
   - `'FLAT_FIRST'` (Padrão): Soma os valores fixos à base e depois multiplica pelo percentual:
     $$\text{Final} = (\text{Base} + \sum \text{Fixo}) \times (1 + \sum \text{Percentual})$$
   - `'PERCENT_FIRST'`: Multiplica a base pelo percentual e soma os valores fixos ao final:
     $$\text{Final} = (\text{Base} \times (1 + \sum \text{Percentual})) + \sum \text{Fixo}$$
2. `roundingMode`:
   - `'ROUND_UP'`: Arredonda frações para cima (`Math.ceil`).
   - `'ROUND_DOWN'` (Padrão): Trunca / arredonda frações para baixo (`Math.floor`).

## Consequências
- Aplicação consistente e determinística de todas as fórmulas matemáticas no motor de regras (`packages/rules-engine`), garantindo previsibilidade para Mestre e Jogadores.

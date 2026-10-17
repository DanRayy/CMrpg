# ADR-011: Status Iniciais de Personagem e Curva de Progressão de Nível e XP

## Status
Aceito

## Contexto
Anteriormente, valores como HP e Armadura eram mantidos como referências genéricas ou sem fórmulas fechadas. O Mestre confirmou os status vitais, valores base iniciais, recursos de combate e a fórmula matemática para avanço de nível e pontos de habilidade.

## Decisão
1. **Status Base Iniciais (Nível 1):**
   - `Nível`: 1
   - `XP`: 0 / 80 (80 XP necessários para alcançar o Nível 2)
   - `Pontos de Habilidade`: 0 (+2 pontos a cada nível alcançado)
   - `HP (Vida)`: 80 / 80
   - `Armadura`: 0 (depende exclusivamente de armaduras/equipamentos)
   - `PA (Pontos de Ação)`: 3
   - `Mana Máxima`: 100 / 100
   - `Regeneração de Mana`: 20%
   - `Defesa`: 0
   - `Ataque`: 0
   - `Arcana`: 0
   - `Santidade`: 0
2. **Curva Exponencial de XP (+8% por nível):**
   - Para subir do nível $N$ para o nível $N+1$, o requisito de XP é:
     $$XP_{req}(N) = \text{round}(XP_{req}(N-1) \times 1.08)$$
     *Com $XP_{req}(1) = 80$, e a função de arredondamento seguindo o `roundingMode` (`ROUND_UP` ou `ROUND_DOWN`) configurado na sala (ADR-009).*
3. **Progressão de Pontos de Habilidade:**
   - Fórmula: $\text{Pontos de Habilidade Total} = (\text{Nível} - 1) \times 2$.
4. **Alvos de Efeitos Expandidos:**
   - Todos esses status (`HP`, `ARMADURA`, `MANA`, `PA`, `REGEN_MANA`, `DEFESA`, `ATAQUE`, `ARCANA`, `SANTIDADE`) passam a ser alvos válidos para bônus/penalidades de itens e consumíveis.

## Consequências
- A ficha ganha sustentação numérica completa e previsível.
- A progressão de XP e pontos de habilidade é 100% determinística e testável via TDD.

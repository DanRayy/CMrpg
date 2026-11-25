# ADR-009: Precedência Matemática e Estratégia de Arredondamento (`rules_engine.py`)

- **Status:** Aceito (Em Produção)

## Contexto

Ao combinar bônus fixos (`FLAT`) e percentuais (`PERCENT`) de múltiplas origens (raças, itens, buffs, classes e árvores), a ordem das operações altera o resultado final. Além disso, sistemas de RPG exigem arredondamento previsível e sem erros de representação binária (`float`).

## Decisão

Centralizar em `rules_engine.py` (`apply_rounding` e `compute_stat_with_modifiers`) e espelhar no frontend (`01-core-state.js`):
1. **Precedência Configurável na Sala (`room.statModifierPrecedence`):**
   - `FLAT_FIRST` (padrão): `(Base + Σ Flat) × (1 + Σ Percent / 100)`
   - `PERCENT_FIRST`: `(Base × (1 + Σ Percent / 100)) + Σ Flat`
2. **Estratégia de Arredondamento (`room.roundingMode`):**
   - Antes de arredondar, valores com diferença menor que **`1e-9`** de um inteiro retornam o inteiro exato (evitando desvios de ponto flutuante como `100 * 1.08 = 108.00000000000001`).
   - `ROUND_DOWN` (padrão): `math.floor(value)`
   - `ROUND_UP`: `math.ceil(value)`

## Consequências

- **Positivas:** paridade exata entre preview no cliente, cálculo de dano em `/api/preview-damage` e persistência no servidor.
- **Negativas:** modificadores compostos complexos fora do par `FLAT`/`PERCENT` exigem extensão explícita em `rules_engine.py`.

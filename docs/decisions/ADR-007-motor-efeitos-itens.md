# ADR-007: Motor Unificado de Efeitos e Modificadores (`rules_engine.py`)

- **Status:** Aceito (Em Produção)

## Contexto

Múltiplos sistemas do RPG — Raças/Sub-raças, Itens Equipados, Consumíveis, Buffs/Nerfs, Talentos, Árvores de Habilidades, Classes/Subclasses e Herança de Subclasse — alteram simultaneamente atributos, vitais, resistências elementais e limites de acúmulos. Manter cálculos isolados por funcionalidade geraria divergências entre ficha, servidor e combate.

## Decisão

Centralizar toda a consolidação matemática em `compute_character_derived_stats` (`rules_engine.py`, espelhada no cliente em `01-core-state.js`) usando uma lista canônica de **33 alvos** (`VALID_EFFECT_TARGETS`):
- **Vitais & Carga:** `VIDA`, `ARMADURA`, `MANA`, `PA`, `CAPACIDADE_PESO`.
- **Regeneração:** `REGEN_VIDA`, `REGEN_ARMADURA`, `REGEN_MANA`.
- **Combate:** `DEFESA`, `ATAQUE`, `ARCANA`, `SANTIDADE`.
- **Resistências Elementais:** `RES_GERAL` + os 7 tipos (`FISICO`, `MAGICO`, `PYRO`, `CRYO`, `ELETRICO`, `PROFANO`, `SACRO`).
- **Limites de Acúmulo:** `ACUMULO_GERAL` + os 7 status (`CONGELAMENTO`, `CHOQUE`, `SANGRAMENTO`, `CHAMAS`, `VENENO`, `ATORDOAMENTO`, `CEGUEIRA`).
- **Atributos Canônicos:** `FORCA`, `DESTREZA`, `INTELIGENCIA`, `SABEDORIA`, `LABIA`.

O motor aplica na sequência:
1. Modificadores de **Raça Base e Sub-raça**;
2. Peso seletivo e modificadores de **Itens Equipáveis equipados** (ignorando `IN_ESCROW`);
3. **Buffs/Nerfs ativos** (`enabled !== false` e dentro da duração ou permanentes);
4. **Classes e Subclasses** (com aplicação imediata do Efeito de Classe e eventual substituição/herança em Nível 15+);
5. **Árvores de Habilidades** (escalando Talentos por `cur_rank`, aplicando bônus de `100%` quando completa e impondo o teto global de **`3 / 3` passivas ativas**).

## Consequências

- **Positivas:** qualquer nova raça, classe, item ou buff funciona imediatamente sobre todos os 33 alvos sem alterações de código; consistência garantida pelo servidor a cada `state_sync`.
- **Negativas:** exige que cliente e servidor mantenham a mesma ordem de agregação e regras de precedência (`ADR-009`).

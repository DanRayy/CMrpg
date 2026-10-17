# ADR-007: Motor de Efeitos de Itens (Data-Driven Effects Engine)

## Status
Aceito

## Contexto
Itens podem alterar atributos e status dos personagens de formas variadas: bônus numéricos fixos, bônus percentuais, penalidades, durações permanentes (enquanto equipado) ou temporárias (baseadas em turnos, para consumíveis).

## Decisão
1. **Tipos de Itens:** `ARMADURA`, `ARMA`, `ACESSORIO`, `CONSUMIVEL`, `OUTRO`.
2. **Capacidade de Efeitos:**
   - Tipos equipáveis (`ARMADURA`, `ARMA`, `ACESSORIO`): suportam 0, 1 ou múltiplos efeitos contínuos enquanto equipados.
   - Tipo `CONSUMIVEL`: suporta 0, 1 ou múltiplos efeitos temporários com duração finita em turnos (`durationTurns`).
   - Tipo `OUTRO`: apenas nome e descrição (ex: "Pedra / muito dura"), sem efeitos mecânicos.
3. **Estrutura Normalizada do Efeito:**
   - `targetStat`:
     - Recursos Vitais: `VIDA` | `ARMADURA` | `MANA` | `PA` | `REGEN_MANA`
     - Combate: `DEFESA` | `ATAQUE` | `ARCANA` | `SANTIDADE`
     - Atributos Canônicos: `FORCA` | `DESTREZA` | `INTELIGENCIA` | `SABEDORIA` | `LABIA`
   - `modifierType`: `FLAT` (Fixo, ex: +70, -2) | `PERCENT` (Percentual, ex: +50%, -10%)
   - `value`: Number
   - `durationTurns`: Integer opcional (null para equipáveis, > 0 para consumíveis)
4. **Aplicação de Peso:** O peso de itens equipáveis só é contabilizado na carga do personagem quando o item estiver marcado como equipado (`isEquipped: true`). Se guardado no inventário, o peso é ignorado.

## Consequências
- Criação extensível de itens simples ou extremamente complexos via interface do Mestre que interagem diretamente com qualquer atributo ou recurso vital do personagem.

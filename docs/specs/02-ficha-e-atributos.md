# Especificação 02: Ficha de Personagem, Atributos, Status, Notas e Avatares

## 1. Os 5 Atributos Canônicos e Sistema Point Buy

Toda ficha possui exatamente **5 Atributos Canônicos** (`CANONICAL_ATTRIBUTES` em `rules_engine.py` e `01-core-state.js`):
1. `FORCA` (**Força** — `FOR`)
2. `DESTREZA` (**Destreza** — `DES`)
3. `INTELIGENCIA` (**Inteligência** — `INT`)
4. `SABEDORIA` (**Sabedoria** — `SAB`)
5. `LABIA` (**Lábia** — `LAB`)

### Regras de Distribuição na Criação (`validate_point_buy`)
- **Base Inicial:** todos os 5 atributos iniciam em **`8`** (soma inicial = `40`).
- **Pontos Livres:** **`+17` pontos** para distribuir, totalizando **`57` pontos** máximos (`sum(attributes) <= 57`).
- **Piso Mínimo:** nenhum atributo pode ser reduzido abaixo de **`7`** na criação.
- **Regra do 1 Ponto:**
  - Por padrão, o teto individual máximo é **`18`**.
  - O jogador pode reduzir **no máximo `1` atributo de `8` para `7`** (ganhando `+1` ponto extra para gastar), o que eleva o teto permitido de **`18` para `19`** em outro atributo.
  - Reduzir dois ou mais atributos para `7` é rejeitado por `validate_point_buy`.

---

## 2. Modificadores de Rolagem e Sucesso Automático Passivo

### Tabela de Modificadores (`get_attribute_modifier`)
Calculada dinamicamente sobre o **valor efetivo** do atributo (base + modificadores de raça, classe, árvores, itens equipados e buffs/nerfs):

| Valor Efetivo | Modificador |
| :---: | :---: |
| `<= 1` | `-5` |
| `2 – 3` | `-3` |
| `4 – 5` | `-2` |
| `6 – 7` | `-1` |
| `8 – 9` | `0` |
| `10 – 11` | `+1` |
| `12 – 13` | `+2` |
| `14 – 15` | `+3` |
| `16 – 17` | `+4` |
| `18 – 19` | `+5` |
| `>= 20` | `+7` |

### Sucesso Automático Passivo (`get_passive_auto_success_dc`)
Personagens com atributos elevados dispensam rolagem contra dificuldades triviais/moderadas:
- **`15 – 16`:** Sucesso Automático em testes com **`DC 5`**
- **`17 – 18`:** Sucesso Automático em testes com **`DC 8`**
- **`>= 19`:** Sucesso Automático em testes com **`DC 11`**
- **`< 15`:** Sem sucesso automático passivo (`null`).

---

## 3. Status Vitais, Atributos Derivados e Precedência Matemática

O motor `compute_character_derived_stats` (`rules_engine.py`) recalcula todos os status efetivos sempre que o estado é sincronizado ou editado:

- **Status Vitais:**
  - **Vida (`hp` / `maxHp`):** base padrão `80`.
  - **Armadura (`armor` / `maxArmor`):** base padrão `0`.
  - **Mana (`mana` / `maxMana`):** base padrão `100`.
  - **Pontos de Ação (`pa` / `maxPa`):** base padrão `3`.
  - **Regeneração (`regen %`):** base padrão `20%` (recupera Mana no início do turno; também suporta bônus específicos `effectiveRegenVida` e `effectiveRegenArmadura`).
  - **Overflow:** valores atuais acima do máximo (ex.: cura ou escudo temporário) são permitidos e destacados com badge `OVERFLOW` e borda dourada mate (`.stat-overflow-glow`).
- **Atributos Derivados de Combate e Carga:**
  - `Ataque` (`attack`), `Defesa` (`defense`), `Arcana` (`arcana`), `Santidade` (`santidade`), `Capacidade de Peso` (`maxWeight`, base padrão `27 kg` para jogadores e `999 kg` para inimigos), `resistancePercent` e `damageReductionPercent`.
- **Precedência e Arredondamento (`compute_stat_with_modifiers` / `apply_rounding`):**
  - `FLAT_FIRST` (padrão): `(Base + Σ Flat) × (1 + Σ Percent / 100)`
  - `PERCENT_FIRST`: `(Base × (1 + Σ Percent / 100)) + Σ Flat`
  - Arredondamento configurável na sala: `ROUND_DOWN` (padrão, `math.floor` com tolerância `1e-9`) ou `ROUND_UP` (`math.ceil`).

---

## 4. As 7 Resistências Elementais / de Dano (%)

Cada ficha e criatura do bestiário possui 7 resistências percentuais (`ELEMENTAL_RESISTANCE_TYPES`):
1. `FISICO` (**Físico**)
2. `MAGICO` (**Mágico**)
3. `PYRO` (**Pyro**)
4. `CRYO` (**Cryo**)
5. `ELETRICO` (**Elétrico**)
6. `PROFANO` (**Profano**)
7. `SACRO` (**Sacro**)

O valor efetivo de cada tipo soma o valor base na ficha (`elementalResistances[tipo]`), modificadores diretos `RES_<TIPO>` (em Flat ou Percent) e o modificador global `RES_GERAL`. Valores negativos representam vulnerabilidade elemental.

---

## 5. Os 7 Acúmulos de Status e Gatilhos Automáticos

Cada combatente possui 7 medidores de acúmulo (`STATUS_RESISTANCE_TYPES`), cada qual com valor atual (`current`) e limite máximo (`max`, base padrão `100`, ajustável por ficha e por modificadores `ACUMULO_<TIPO>` e `ACUMULO_GERAL`).

Quando um acúmulo cresce e atinge `current == max`, o servidor (`detect_max_resistance_toasts`) emite o alerta `<Nome> MAX ACÚMULO: <STATUS>!` e o cliente (`applyAccumulationTrigger` em `02-websocket-combat.js`) dispara automaticamente o efeito correspondente:

| Acúmulo | Gatilho Automático ao Atingir o Máximo (`current >= max`) |
| :--- | :--- |
| **Congelamento** | Aplica Nerf `Congelamento Severo` (`CONGELAMENTO`, 1 turno): o alvo **perde o próximo turno** e recebe `+25% Resistência Geral` e `+25% Resistência Perfuração`. Ao pular o turno, remove `CONGELAMENTO` e aplica `Imunidade a Congelamento` (1 turno); caso novos acúmulos atinjam o máximo durante a imunidade, ficam represados e disparam assim que a imunidade expira. |
| **Choque** | Causa dano imediato de `30 + (5 × Nível)` (absorvido pela Armadura antes da Vida) e reduz Cargas da batalha: **`-1` carga** se o alvo for inimigo ou **`-2` cargas** se for jogador. |
| **Sangramento** | Causa hemorragia imediata **direta na Vida** (ignora Armadura): **`11%` do HP Máx** em inimigos ou **`22%` do HP Máx** em jogadores. |
| **Chamas** | Aplica Nerf `Chamas (Combustão)` por `3` turnos com dano inicial de **`15 + (2 × Nível)`** aplicado no **fim do turno** (Armadura → Vida). A cada ativação ou tick de fim de turno, o próximo dano escala para `floor((danoAtual + 10) × 1.2)`; uma nova ativação renova a duração para `3` turnos sem causar dano imediato. |
| **Veneno** | Aplica Nerf `Veneno Letal` por `3` turnos, causando dano **direto na Vida** no **início de cada turno**: **`5%` do HP Máx** em inimigos ou **`10%` do HP Máx** em jogadores. Nova ativação renova a duração para `3` turnos. |
| **Atordoamento** | Aplica Nerf `Atordoamento` com **`-1 PA` por `2` turnos** (reduzindo o PA atual caso ultrapasse o novo teto disponível). Nova ativação renova para `2` turnos. |
| **Cegueira** | Aplica penalidade `Cegueira` (desvantagem em testes) por **`2` turnos**. |

---

## 6. Curva de XP, Progressão e Pontos de Talento

Implementada em `calculate_xp_required_for_level` e `process_xp_and_level_up` (`rules_engine.py`):
- **Fórmula Exponencial:** Nível `1 → 2` exige **`80 XP`**. Cada nível seguinte multiplica o requisito anterior por **`1.08` (`+8%` composto)** respeitando o arredondamento da sala.
- **Multi-Level Up:** ao receber XP suficiente para mais de um nível, o excedente é preservado em loop até `xp < xpNext`.
- **Recompensa por Nível:** cada nível ganho concede automaticamente **`+2 Pontos de Talento` (`skillPoints`)** para uso nas Árvores de Habilidades, Classes e Subclasses.

---

## 7. Sistema de Buffs e Nerfs (`char.buffsNerfs`)

Gerenciado pelo modal `modal-buffs-nerfs`:
- **Tipos:** `BUFF` (card esmeralda `.buff-item-card`) ou `NERF` (card carmesim `.nerf-item-card`).
- **Duração:**
  - **Temporário:** número inteiro de turnos (`duration > 0`), decrementado em `1` no início do turno do combatente (exceto `CHAMAS`, decrementado no fim do turno).
  - **Permanente:** flag `isPermanent: true` (`duration: null`), nunca expira por passagem de turnos.
- **Múltiplos Modificadores e Toggle Rápido:** um único Buff/Nerf pode agrupar múltiplos modificadores (`targetStat`, `modifierType: FLAT | PERCENT`, `value`) sobre qualquer alvo de `VALID_EFFECT_TARGETS`, além de possuir um toggle switch rápido (`enabled`) para ativar/pausar o efeito sem excluí-lo.

---

## 8. Bloco de Notas Multi-Páginas com Autosave Isolado

Implementado em `modal-notes` e `05-modals-notes-inventory-bestiary.js`:
- **Estrutura por Ficha (`char.notesPages`):** cada personagem possui suas próprias abas independentes identificadas por ID (`note_<timestamp>_<rand>`), com criação (`modal-new-note-page`), renomeação e exclusão (mínimo de 1 aba mantida).
- **Editor Rico:** barra de ferramentas sem rolagem com títulos (`H1`, `H2`), formatação (`B`, `I`, `U`, `S`), seletores flutuantes de cor de texto e marcador de destaque, listas ordenadas/não-ordenadas, **checklists interativos** (`.note-checkbox`), inserção de tabelas editáveis, citações (`blockquote`), divisor horizontal (`hr`) e contador ao vivo de palavras e caracteres.
- **Autosave Isolado:** alterações disparam `scheduleNotesAutoSave(600ms)` gravando especificamente em `target.notesPages` da ficha identificada por `currentNotesCharId` e sincronizando com a sala via WebSocket.

---

## 9. Sistema de Avatares Circulares e Visualização em Tela Cheia

- **Upload com Recorte Circular (`modal-image-cropper`):** ao selecionar uma imagem na criação/edição da ficha ou bestiário, o usuário ajusta zoom e posição sobre uma máscara circular e envia em `POST /api/upload-image` tanto a imagem completa (`*_orig.<ext>`) quanto o recorte do token (`*_token.png/.webp`) para `static/img/fichas/personagens/` ou `static/img/fichas/inimigos/`.
- **Exibição e Ampliação (`modal-image-viewer`):** os cards exibem o token circular (`64 × 64 px`) centralizado no topo (`top: -32px`). Clicar no avatar (`.image-viewer-trigger`) abre a imagem original completa em tela cheia.

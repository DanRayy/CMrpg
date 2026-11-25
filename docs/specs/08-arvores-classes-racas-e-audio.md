# Especificação 08: Árvores de Habilidades, Classes/Subclasses, Raças, Bestiário e Áudio

## 1. Árvores de Habilidades (`state.skillTrees`)

As Árvores de Habilidades oferecem progressão visual e matemática unificada em um **palco radial de 4 quadrantes** (`modal-skill-tree` e aba gerencial `#tab-skill-trees`):

### Layout Radial em 4 Quadrantes e Sub-abas de Paginação
Ao redor de um **núcleo central SVG** (`.sk-core-medallion`, exibindo `%` de conclusão e efeitos de completude), os nós são distribuídos em 4 quadrantes foscas:
1. **Superior Esquerdo (`sk-pos-tl`) — Passivas (`PASSIVA`)**
2. **Superior Direito (`sk-pos-tr`) — Talentos (`TALENTO`)**
3. **Inferior Esquerdo (`sk-pos-bl`) — Ativas (`ATIVA`)**
4. **Inferior Direito (`sk-pos-br`) — Supremas (`SUPREMA`)**

- Cada quadrante exibe uma grade **`2 × 3` (`SK_SLOTS_PER_PAGE = 6` slots por página)** com **sub-abas de paginação** (`<`, `ABA 1`, `ABA 2`, `ABA 3`, `>`).
- **Painel de Inspeção Flutuante (`.sk-inspector`) e Tooltip (`.sk-tooltip`):** ao passar o mouse ou clicar em um nó, exibe categoria, descrição, custos (`manaCost`, `paCost`, `uses`, `cooldown`), **campo exclusivo `charges` (Cargas) em Supremas**, modificadores e ações de compra/melhoria/reembolso/ativação.

### Regras de Progressão, Trava `3/3` e Bônus de `100%`
- **Multi-Ranks em Talentos (`TALENTO`):** configuráveis com `maxRanks` e `costPerRank`; cada rank adquirido multiplica os modificadores do nó (`valor × rankAtual`).
- **Melhorias Extras (`ATIVA`, `SUPREMA`, `PASSIVA`):** possuem desbloqueio inicial (`unlockCost`) e melhorias opcionais (`maxUpgrades`, `upgradeCost`).
- **Trava Global de Passivas Ativas (`MAX_ACTIVE_TREE_PASSIVES = 3`):** cada personagem pode manter **no máximo `3 / 3` passivas ativas simultaneamente**, somando todas as Árvores, Classe Base, Subclasse e Herança. Tentativas de ativar uma 4ª passiva são bloqueadas na UI e normalizadas em `rules_engine.py`.
- **Reembolso Individual ou Total:**
  - `handleSkillNodeRefund`: reembolsa o último rank/melhoria ou desbloqueio do nó, devolvendo os Pontos de Talento (`skillPoints`) à ficha.
  - `handleRefundWholeSkillTree`: zera todos os nós adquiridos da árvore/classe atual e devolve 100% dos pontos gastos.
- **Efeito de Árvore Completa (`100%`):** exclusivamente em Árvores comuns (`!isClassEntity`), quando todos os ranks e melhorias (`acquired_steps >= total_steps`) são adquiridos, os `completionEffects[]` tornam-se ativos automaticamente no `rules_engine.py`.
- **Gestão (permissão `manageSkillTrees`):** criar, editar, duplicar árvore ou nó com novos IDs independentes, ocultar dos jogadores (`hiddenForPlayers`), reordenar nós por drag & drop e excluir.

---

## 2. Classes e Subclasses (`state.classes`)

As Classes e Subclasses reutilizam integralmente o motor radial de 4 quadrantes (`isClassEntity: true`), com regras próprias de vocação:

- **Efeito de Classe / Subclasse Imediato:** diferente das Árvores comuns (que exigem 100%), os `completionEffects` / `classEffects` de uma Classe Base ou Subclasse são aplicados **imediatamente** assim que são escolhidas na criação/edição da ficha (`rules_engine.py` aplica sem exigir 100% dos nós).
- **Desbloqueio de Subclasse no Nível 15+:**
  - Apenas personagens com **`level >= 15`** podem selecionar e ativar uma Subclasse (`isSubclass: true`). Abaixo do nível 15, o seletor bloqueia a ativação na UI e `rules_engine.py` ignora efeitos de subclasse.
- **Herança Opcional de Subclasse (`modal-subclass-inheritance` / `char.subclassInheritance`):**
  - Ao atingir Nível 15+ com uma Subclasse selecionada, o personagem pode escolher outra Classe Base (`otherClassId`) e configurar opcionalmente:
    1. **Troca de 1 Efeito de Classe:** substitui 1 efeito da sua Classe Base (`replacedEffectIndex`) por 1 efeito da outra Classe Base (`inheritedEffect`).
    2. **Herança de 1 Habilidade:** herda 1 nó (`inheritedNodeId`) da outra Classe Base entre as categorias **`TALENTO`, `ATIVA` ou `PASSIVA`** (nós **`SUPREMA` são estritamente excluídos** da herança).
- **Troca com Reset e Devolução Automática (`handleSheetChangeCharacterVocation`):**
  - Ao trocar de Classe Base ou Subclasse (ou alterar a Herança), após confirmação, o sistema reseta todos os nós adquiridos da vocação anterior (e eventual nó herdado anterior), **devolve 100% dos Pontos de Talento gastos** à ficha, desativa suas passivas, remove os efeitos antigos e aplica imediatamente os efeitos da nova vocação.

---

## 3. Raças e Sub-raças (`state.races`)

Gerenciadas pelo Mestre na aba **Administração** (`modal-race-form`) com suporte a **Raças Base** (`isSubrace: false`) e **Sub-raças** vinculadas a uma raça pai (`isSubrace: true`, `parentRaceId`):

- **Bônus Inicial de Pontos de Talento (`bonusSkillPoints`):** aplicado automaticamente de forma idempotente via controle `appliedRaceBonusPoints` em `normalize_character` (`main.py`).
- **Modificadores Matemáticos (`effects[]`) e Traços Descritivos:** somados diretamente ao motor de atributos derivados (`rules_engine.py`).

### As 5 Raças Base Pré-Cadastradas (`build_default_races`)
| Raça | Bônus Matemáticos / Pontos | Traços Descritivos |
| :--- | :--- | :--- |
| **Dragão** | `+1 Força`, `+5 Mana`, `+8% Res. Físico` | Pode voar e possui afinidade com poder diacrônico. |
| **Humano** | `+8 Pontos de Talento` iniciais (`bonusSkillPoints: 8`) | Versatilidade humana na criação da ficha. |
| **Elfo** | `+10 Mana`, `+3 Regen. Mana` | Afinidade ancestral com o fluxo arcano e regeneração espiritual. |
| **Orc** | `+2 Força`, `+5 Capacidade de Peso` | Armas recebem `+5%` de multiplicadores. |
| **Xituiara** | *(Sem bônus estático padrão)* | Regenera `1% + 2` do HP no final do turno; ao atacar desarmado (mãos nuas/soco), causa `10 + 45% ×2` do ataque e aplica `10` de sangramento por acerto. |

---

## 4. Bestiário (`state.bestiary`)

A aba **Bestiário** (`#tab-bestiary`) funciona como compêndio paginado (`6` criaturas por página) de modelos de inimigos:
- **Cadastro (`modal-enemy-form`):** nome, nível, `turnsPerRound`, status vitais/combate, atributos, 7 resistências elementais (%), 7 limites de acúmulo, habilidades gerais e avatar circular.
- **Visibilidade (`reveladoParaJogadores`):** alternável entre **`Liberado`** e **`Oculto`**. Jogadores sem `bestiary_view_hidden` não veem criaturas ocultas no Bestiário e, quando invocadas na Mesa, seus cards aparecem mascarados com `?` até serem revelados.
- **Invocação e Despacho (`modal-spawn-enemy` / `spawnEnemyInstance` / `dismissEnemyInstance`):** invocar cria uma instância independente (`isEnemy: true`, `bestiaryId`) em `state.characters` e na Mesa; despachar remove apenas a instância da Mesa/combate, preservando o modelo no Bestiário.

---

## 5. Áudio (`AudioManager`) e Modal de Preferências (`modal-preferences`)

Implementado em `01-core-state.js` e acessível pelo botão de engrenagem (`#btn-open-preferences`) na barra superior:

- **Arquivos de Som (`static/sounds/`):**
  - `buy` → `static/sounds/buy_item.mp3` (compra direta e aceitação de proposta na loja)
  - `equip` / `unequip` → `static/sounds/equip_item.mp3` (equipar e desequipar itens)
  - `move` → `static/sounds/move_item_to_player.mp3` (transferência P2P / entrega de itens)
  - `hover` → `static/sounds/ui_hover_sound.mp3` (hover em controles, com throttle de `60 ms`)
- **Volume Padrão e Fórmula Efetiva:**
  - Volume Geral (**Master**) padrão: **`25%`**; canais individuais padrão: **`100%`**.
  - Volume reproduzido = `(master / 100) × (canal / 100)`.
- **Reprodução Reversa via Web Audio API (`playReversed`):**
  - Ao **desequipar** um item (`AudioManager.play('unequip')`), o sistema decodifica `equip_item.mp3` via `AudioContext.decodeAudioData`, cria um `AudioBuffer` com os samples de cada canal invertidos em ordem reversa (`dst[i] = src[j]`) e reproduz através de um `GainNode` com o volume efetivo. Caso a Web Audio API não esteja disponível, realiza fallback seguro para reprodução normal.
- **Preferências Persistidas Localmente:**
  - **Notificações na Tela:** toggle switch persistido em `localStorage` (`cmrpg_notifications_enabled`).
  - **Sliders de Áudio:** Master (`0–100%`) + 4 sliders individuais com botão de teste `▶` por canal e botão **Restaurar Padrão (25%)**, persistidos em `localStorage` (`cmrpg_audio_preferences_v1`).

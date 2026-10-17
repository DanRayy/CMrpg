# Especificação 02: Ficha de Personagem, Status e Motor de Atributos

## 1. Estrutura da Ficha
* **Identificação:** Nome, Idade, Altura, História, Descrição das Habilidades.
* **Nível:** Nível numérico do personagem (inicia em 1).
* **Experiência (XP):** XP Atual / XP Necessário para o próximo nível.
* **Pontos de Habilidade:** Reserva para aquisição ou evolução de habilidades.

---

## 2. Status Iniciais e Recursos Vitais (Nível 1)

Todo personagem recém-criado inicia com os seguintes valores padrão:

| Status | Valor Inicial | Descrição |
| :--- | :---: | :--- |
| **Nível** | 1 | Nível inicial da jornada. |
| **XP** | 0 / 80 | Requer 80 XP para subir ao Nível 2. |
| **Pontos de Habilidade** | 0 | Inicia em 0 e ganha **+2 pontos** a cada novo nível. |
| **Vida (HP)** | 80 / 80 | Reserva de vitalidade do personagem. |
| **Armadura** | 0 | Base 0; valor provém estritamente de equipamentos equipados. |
| **Pontos de Ação (PA)** | 3 | Quantidade de ações/recursos disponíveis. |
| **Mana Máxima** | 100 / 100 | Energia arcana/mágica para conjurações. |
| **Regeneração de Mana** | 20% | Percentual de recuperação de mana. |
| **Defesa** | 0 | Estatística defensiva base. |
| **Ataque** | 0 | Estatística ofensiva base. |
| **Arcana** | 0 | Afinidade com poderes arcanos. |
| **Santidade** | 0 | Afinidade com poderes sagrados/divinos. |

### 2.1 Curva de Progressão de Nível e XP (+8% por nível)
O custo de XP para alcançar o próximo nível aumenta em **8% composto a cada nível**:
$$XP_{req}(N) = \text{round}(XP_{req}(N-1) \times 1.08)$$
*Onde a função de arredondamento segue o `roundingMode` (`ROUND_UP` ou `ROUND_DOWN`) configurado na sala (ADR-009).*

* **Exemplo de Escala de XP:**
  * Nível 1 $\rightarrow$ 2: **80 XP**
  * Nível 2 $\rightarrow$ 3: $80 \times 1.08 =$ **86 XP** (arredondado)
  * Nível 3 $\rightarrow$ 4: $86.4 \times 1.08 =$ **93 XP** (arredondado)
  * Nível 4 $\rightarrow$ 5: $93.31 \times 1.08 =$ **101 XP** (arredondado)

### 2.2 Progressão de Pontos de Habilidade
* $\text{Pontos de Habilidade} = (\text{Nível} - 1) \times 2$
* Nível 1: 0 pontos
* Nível 2: 2 pontos (+2)
* Nível 3: 4 pontos (+2)
* Nível 4: 6 pontos (+2)

---

## 3. Atributos Principais
Existem 5 atributos canônicos:
1. **Força:** Força física simples e potência muscular.
2. **Destreza:** Agilidade geral, reflexos e ações manuais.
3. **Inteligência:** Intelecto geral e capacidade de análise/raciocínio.
4. **Sabedoria:** Vivência, intuição e influência em situações diversas.
5. **Lábia:** Capacidade de persuasão, negociação e carisma.

---

## 4. Matemática de Distribuição de Pontos (Point Buy)
1. **Base Inicial:** Todo personagem inicia com valor **8** em todos os 5 atributos (representando a média humana).
2. **Pote de Pontos Padrão:** O jogador recebe **17 pontos extras** para distribuir livremente.
3. **Teto Inicial:** Nenhum atributo pode ultrapassar **18** durante a distribuição padrão dos 17 pontos.
4. **Regra Estrita de Permuta (Regra do 1 Ponto):**
   * O jogador pode escolher **no máximo um** atributo para reduzir em 1 ponto (de 8 para 7).
   * Essa redução concede +1 ponto ao pote de distribuição, totalizando **18 pontos a distribuir**.
   * O sistema proíbe reduzir múltiplos atributos para ganhar mais de 18 pontos na criação.
   * Através dessa permuta, o jogador pode ultrapassar o teto padrão de 18 pontos em um atributo, alcançando o teto máximo absoluto de 19 pontos na criação (nunca 20).
5. **Invariante Matemático na Criação:**
   $$\sum \text{Atributos} = 57 \text{ pontos no total}$$
   * Com teto máximo de 19 pontos por atributo e no máximo 1 redução de 8 para 7.

---

## 5. Poderes de Intervenção do Mestre sobre Atributos
* **Ajuste Forçado por Roleplay:** O Mestre pode alterar qualquer atributo de um jogador para qualquer valor arbitrário (ex: reduzir Força para 3 para um personagem ancião/enfermo).
* **Concessão Direta de Atributos:** O Mestre pode conceder pontos adicionais de atributos para um jogador ou para todo o grupo simultaneamente.
* **Recompensa de Missões:** Missões podem premiar o jogador com pontos de atributo.

---

## 6. Tabela de Modificadores de Rolagem

| Valor do Atributo | Modificador |
| :---: | :---: |
| 1 | -5 |
| 2 ~ 3 | -3 |
| 4 ~ 5 | -2 |
| 6 ~ 7 | -1 |
| 8 ~ 9 | 0 |
| 10 ~ 11 | +1 |
| 12 ~ 13 | +2 |
| 14 ~ 15 | +3 |
| 16 ~ 17 | +4 |
| 18 ~ 19 | +5 |
| 20+ | +7 |

---

## 7. Mecânica de Sucesso Automático Passivo
Quando o personagem possui atributos elevados, ele passa automaticamente em testes de baixa dificuldade sem necessidade de rolagem de dados:
* **Atributo $\ge 15$:** Sucesso automático em testes com Dificuldade (DC) $\le 5$.
* **Atributo $\ge 17$:** Sucesso automático em testes com Dificuldade (DC) $\le 8$.
* **Atributo $\ge 19$:** Sucesso automático em testes com Dificuldade (DC) $\le 11$.

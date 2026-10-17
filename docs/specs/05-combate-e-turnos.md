# Especificação 05: Combate por Turnos, Armadura, Cargas e Estatísticas

## 1. O Estado de Batalha (`EM_BATALHA`)
1. O Mestre é o único responsável por iniciar ou encerrar o modo de combate da sala.
2. Ao ativar o combate, o Mestre define a **Ordem de Iniciativa** (lista ordenada de participantes contendo Jogadores e o próprio Mestre).
3. O Mestre pode reorganizar a ordem de iniciativa a qualquer momento.

---

## 2. A Dinâmica de Turnos
1. O sistema mantém um cursor apontando para o participante cujo turno está ativo no momento.
2. Todos os participantes veem um botão **"Finalizar Turno"** quando é a sua vez.
3. Ao clicar, o cursor avança para o próximo participante da lista.
4. **Turno do Mestre:** O Mestre tem sua própria vez na iniciativa para narrar, movimentar ameaças e desferir dano aos jogadores.
5. **Avanço Forçado pelo Mestre (Anti-AFK):** O Mestre possui uma ação para forçar a passagem do turno a qualquer instante, evitando que ausências travem a sessão.

### 2.1 Rotina Automática de Início de Turno do Jogador
No momento em que a iniciativa avança para a vez de um jogador ativo (não morto):
1. **Recarga de PA:** Os Pontos de Ação (PA) do jogador são recarregados para o valor de **3 PA** (ou seu valor máximo ativo com bônus de equipamentos).
2. **Regeneração de Mana:** O personagem recupera sua taxa de regeneração (padrão de **20% da Mana Máxima**), respeitando o teto da Mana Máxima:
   $$\text{Mana Recuperada} = \text{round}(\text{Mana Máxima} \times 0.20)$$
   $$\text{Mana Atual} = \min(\text{Mana Máxima}, \text{Mana Atual} + \text{Mana Recuperada})$$
   *Aplica-se a regra de arredondamento da sala (`ROUND_UP` ou `ROUND_DOWN`) caso a recuperação gere casas decimais.*
3. **Cargas do Grupo:** O pool compartilhado de cargas do grupo aumenta em **$+1$** (ver Seção 3).
4. **Exceções Estritas:** No turno do Mestre ou caso o jogador esteja com status `MORTO`, **não** há recarga de PA, regeneração de mana nem incremento de cargas.

---

## 3. Contador de Cargas do Grupo (Pool Compartilhado)
1. **Natureza Compartilhada:**
   * As cargas pertencem ao **grupo como um todo** (reserva/pool coletivo da equipe na batalha), e não a cada jogador individualmente.
2. **Acúmulo Automático:**
   * No **início do turno de qualquer jogador**, a reserva de cargas do grupo aumenta automaticamente em **$+1$**.
   * **Exceção Estrita:** No turno do Mestre, **não há acúmulo de cargas**. O incremento ocorre apenas nos turnos dos jogadores.
3. **Controle e Consumo pelo Grupo:**
   * Durante o seu turno, qualquer jogador pode gastar (reduzir) cargas da reserva compartilhada para ativar habilidades, conjurações ou recursos do grupo.
   * Os jogadores também possuem controles manuais (`[ + ]` e `[ - ]`) para ajustar o total de cargas compartilhadas conforme a narrativa da mesa.

---

## 4. Telemetria e Contadores de Batalha (Métricas de Combate)
A sessão de combate mantém contadores automáticos em tempo real, visíveis no painel da batalha:
1. **Turnos Totais da Batalha:** Contador acumulativo de quantas vezes a vez foi passada no combate geral.
2. **Rodadas Completas (`Rounds`):** Incrementado a cada ciclo completo em que todos os integrantes da iniciativa jogaram.
3. **Turnos do Mestre:** Contador dedicado de quantas vezes o Mestre jogou na batalha.
4. **Turnos Individuais por Jogador:** Contador exclusivo para cada personagem registrando quantas vezes ele já jogou naquela batalha.

---

## 5. Pipeline Modular de Cálculo de Dano e Mitigações

O cálculo de dano é processado em etapas desacopladas através de um pipeline de funções puras no `@rpg/rules-engine`, permitindo reordenação ou alteração futura sem impacto estrutural.

### 5.1 Entradas da Fórmula
* **Lado do Atacante:**
  * `Dano Base`: Valor numérico base do ataque/arma.
  * `Multiplicadores`: Bônus direto somado ao dano base proveniente de atributos/status (`Arcana`, `Ataque`, `Santidade`, etc.).
  * `Bônus de Dano (%)`: Multiplicador percentual sobre o dano base efetivo.
  * `Letalidade (%)`: Percentual da Defesa do alvo que é ignorado.
  * `Perfuração (%)`: Percentual da Resistência do alvo que é ignorado.
  * `Ruptura (%)`: Percentual da Redução de Dano do alvo que é ignorado.
* **Lado do Alvo (Defensor):**
  * `Defesa`: Redução fixa de dano plano.
  * `Resistência (%)`: Redução percentual de dano.
  * `Redução de Dano (%)`: Redução percentual sobre o dano final para evitar saturação de resistência.
  * `Armadura`: Escudo de sobrevida.
  * `Vida (HP)`: Pontos de vida.

### 5.2 Resolução da Pipeline (Ordem Estrita: Letalidade > Perfuração > Ruptura)
1. **Dano Bruto Ofensivo:**
   $$D_{\text{base\_efetivo}} = DanoBase + Multiplicadores$$
   $$D_{\text{bruto}} = D_{\text{base\_efetivo}} \times (1 + B\text{ô}nusDeDano\%)$$
2. **Mitigação 1 — Defesa (com Letalidade %):**
   $$Defesa_{\text{efetiva}} = \max(0, Defesa \times (1 - Letalidade\%))$$
   $$D_1 = \max(0, D_{\text{bruto}} - Defesa_{\text{efetiva}})$$
3. **Mitigação 2 — Resistência (com Perfuração %):**
   $$Resist\hat{e}ncia_{\text{efetiva}} = \max(0, Resist\hat{e}ncia\% \times (1 - Perfura\text{ç}\tilde{a}o\%))$$
   $$D_2 = D_1 \times (1 - Resist\hat{e}ncia_{\text{efetiva}})$$
4. **Mitigação 3 — Redução de Dano Final (com Ruptura %):**
   $$Redu\text{ç}\tilde{a}o_{\text{efetiva}} = \max(0, Redu\text{ç}\tilde{a}o\% \times (1 - Ruptura\%))$$
   $$D_{\text{final}} = D_2 \times (1 - Redu\text{ç}\tilde{a}o_{\text{efetiva}})$$
5. **Arredondamento:** Aplica-se o `roundingMode` da sala (`ROUND_UP` ou `ROUND_DOWN`).

---

## 6. Armadura como Sobrevida (Buffer) e Degradação
1. A Armadura funciona como um escudo de sobrevida que absorve o $D_{\text{final}}$ antes do HP.
2. **Regra de Degradação de Armadura Máxima:**
   * Seja $D$ o $D_{\text{final}}$ calculado e $A$ a armadura atual do personagem:
   * **Se $D > A$:** A armadura sofre sobrecarga estrutural. A armadura atual é zerada, o valor de **Armadura Máxima é reduzido temporariamente** até o final da batalha, e o dano excedente ($D - A$) é subtraído do HP.
   * **Se $D \le A$:** A armadura absorve o impacto normalmente ($A = A - D$) e a Armadura Máxima **não** é reduzida.
3. A penalidade de degradação é removida quando o Mestre declara o fim oficial da batalha.

---

## 7. Gerenciamento de Morte e Ressurreição
1. Quando a Vida do personagem chega a 0, ele adquire o status `MORTO`.
2. **Turno do Jogador Morto:** O turno continua chegando até ele na ordem de iniciativa normal. No entanto, sua interface permanece bloqueada, permitindo apenas clicar no botão **"Avançar Turno"**.
3. **Poder de Ressurreição do Mestre:** O Mestre pode reviver o personagem a qualquer momento abrindo o modal de ressurreição, que oferece 3 opções:
   * **100% (Total):** Restaura 100% da Vida Máxima e Armadura Máxima.
   * **Percentual Rápido (50% ou atalhos):** Restaura metade da Vida Máxima e Armadura Máxima (obedecendo a regra de arredondamento da sala).
   * **Personalizado / Manual:** O Mestre digita valores arbitrários de Vida e Armadura (ex: `33 de Vida`, `2 de Armadura`).
4. Ao reviver, o status volta para `ATIVO` e as opções de jogo são restauradas imediatamente.

---

## 8. Ciclo de Vida de Consumíveis por Turno
* Ao usar um consumível em batalha com efeito temporário (ex: $+30\%$ de Vida por 7 turnos), cria-se um registro de buff ativo com contador `durationTurns = 7`.
* A cada finalização de turno daquele personagem, o contador é decrementado em 1.
* Ao atingir zero, o bônus é removido e os status são recalculados pelo motor de regras.

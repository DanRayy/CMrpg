# ADR-012: Pipeline Modular de Cálculo de Dano, Mitigação e Penetrações

## Status
Aceito

## Contexto
O sistema possui uma mecânica aprofundada de dano e mitigação dividida em camadas ofensivas (Dano Base, Multiplicadores, Bônus de Dano) e defensivas (Defesa, Resistência e Redução de Dano), com suas respectivas penetrações percentuais (**Letalidade**, **Perfuração** e **Ruptura**). Requer-se que a equação seja de fácil alteração, permitindo reordenar, ajustar ou substituir fórmulas futuramente sem refatorar a aplicação inteira.

## Decisão
1. **Padrão Pipeline de Execução (Chain of Responsibility / Pure Functions):**
   - O cálculo de dano é desacoplado em etapas puras no pacote `@rpg/rules-engine`.
   - Cada etapa recebe o estado anterior e devolve o estado transformado, gerando um detalhamento passo a passo (*breakdown*) para visualização do Mestre.
2. **Ordem Estrita de Resolução:**
   $$\text{Letalidade (Defesa)} \longrightarrow \text{Perfuração (Resistência)} \longrightarrow \text{Ruptura (Redução de Dano)}$$
3. **Fórmula Matemática Atual:**
   * **Etapa 1 (Dano Bruto Ofensivo):**
     $$D_{\text{base\_efetivo}} = DanoBase + Multiplicadores$$
     $$D_{\text{bruto}} = D_{\text{base\_efetivo}} \times (1 + B\text{ô}nusDeDano\%)$$
   * **Etapa 2 (Mitigação de Defesa com Letalidade %):**
     $$Defesa_{\text{efetiva}} = \max(0, Defesa \times (1 - Letalidade\%))$$
     $$D_1 = \max(0, D_{\text{bruto}} - Defesa_{\text{efetiva}})$$
   * **Etapa 3 (Mitigação de Resistência com Perfuração %):**
     $$Resist\hat{e}ncia_{\text{efetiva}} = \max(0, Resist\hat{e}ncia\% \times (1 - Perfura\text{ç}\tilde{a}o\%))$$
     $$D_2 = D_1 \times (1 - Resist\hat{e}ncia_{\text{efetiva}})$$
   * **Etapa 4 (Mitigação de Redução de Dano Final com Ruptura %):**
     $$Redu\text{ç}\tilde{a}o_{\text{efetiva}} = \max(0, Redu\text{ç}\tilde{a}o\% \times (1 - Ruptura\%))$$
     $$D_{\text{final}} = D_2 \times (1 - Redu\text{ç}\tilde{a}o_{\text{efetiva}})$$
   * **Etapa 5 (Arredondamento e Impacto):**
     - Aplica o `roundingMode` da sala (`ROUND_UP` ou `ROUND_DOWN`).
     - Resolve absorção de Armadura e overflow no HP (com sobrecarga de armadura máxima caso $D_{\text{final}} > ArmaduraAtual$).

## Contrato de Dados da Pipeline (`@rpg/types`):
```typescript
export interface DamageCalculationPipelineInput {
  attacker: {
    baseDamage: number;
    statusMultipliers: number; // Arcana, Ataque, Santidade, etc.
    damageBonusPercent: number;
    lethalityPercent: number;   // % de defesa ignorada
    penetrationPercent: number; // % de resistência ignorada
    rupturePercent: number;     // % de redução final ignorada
  };
  target: {
    defense: number;
    resistancePercent: number;
    damageReductionPercent: number;
    currentArmor: number;
    currentHp: number;
  };
}
```

## Consequências
- **Extrema Flexibilidade:** Alterar fórmulas, adicionar dano verdadeiro (*True Damage*), acertos críticos ou mudar a ordem da matemática exige modificar apenas a ordem das funções no pipeline de regras, sem tocar em UI ou Banco de Dados.
- **Transparência Total:** A UI do Mestre recebe o log de cada etapa para pré-visualização antes da aplicação.

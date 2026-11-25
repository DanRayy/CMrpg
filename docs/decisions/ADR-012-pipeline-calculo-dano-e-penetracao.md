# ADR-012: Pipeline Modular de Cálculo de Dano e Penetrações

- **Status:** Aceito (Em Produção)

## Contexto

O combate do CMrpg suporta tanto aplicação direta de dano quanto ataques táticos que combinam dano base, multiplicadores de status, bônus percentuais e três camadas independentes de penetração (**Letalidade %**, **Perfuração %** e **Ruptura %**), além de **Dano Real** que ignora todas as mitigações e a Armadura.

## Decisão

Implementar a função pura `evaluate_damage_pipeline` em `rules_engine.py` (exposta em `POST /api/preview-damage` e espelhada no modal `modal-damage` do cliente):
1. **Dano Bruto:** `D_raw = max(0, DanoBase + Multiplicadores) × (1 + BonusDano% / 100)`.
2. **Dano Real (`is_true_damage: true`):** ignora Defesa, Resistência %, Redução % e Armadura; subtrai `apply_rounding(D_raw)` diretamente do `HP`.
3. **Dano Mitigável (Ordem Estrita):**
   - **Defesa vs. Letalidade %:** `Def_eff = max(0, Defesa × (1 - Letalidade% / 100))`; `D1 = max(0, D_raw - Def_eff)`.
   - **Resistência % vs. Perfuração %:** `Res_eff = clamp(Res% × (1 - Perfuracao% / 100), 0, 100)`; `D2 = D1 × (1 - Res_eff / 100)`.
   - **Redução % vs. Ruptura %:** `Red_eff = clamp(Red% × (1 - Ruptura% / 100), 0, 100)`; `D_final = max(0, apply_rounding(D2 × (1 - Red_eff / 100)))`.
4. **Absorção Armadura → HP:** `Armadura` absorve primeiro; qualquer excedente (`D_final - ArmaduraAtual`) reduz `HP` (marcando `isDead = true` e `pa = 0` se `HP == 0`).

## Consequências

- **Positivas:** preview instantâneo antes de confirmar o ataque no modal de dano e total transparência da ordem matemática entre ataque e defesa.
- **Negativas:** exige preenchimento correto dos percentuais no modo Pipeline (mitigado pela opção de alternar para o modo **Simples**).

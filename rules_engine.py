from __future__ import annotations

import copy
import math
from typing import Any, Dict, List, Optional, Tuple

# 5 Atributos Canônicos (02-ficha-e-atributos.md)
CANONICAL_ATTRIBUTES: List[str] = [
    "FORCA",
    "DESTREZA",
    "INTELIGENCIA",
    "SABEDORIA",
    "LABIA",
]

# 7 Resistências de Status Negativos do CMrpg
STATUS_RESISTANCE_TYPES: List[str] = [
    "Congelamento",
    "Choque",
    "Sangramento",
    "Chamas",
    "Veneno",
    "Atordoamento",
    "Cegueira",
]

# 5 Tipos de Itens (03-itens-e-inventario.md)
ITEM_TYPES: List[str] = [
    "ARMADURA",
    "ARMA",
    "ACESSORIO",
    "CONSUMIVEL",
    "OUTRO",
]

# Todos os alvos válidos para o Motor de Efeitos de Itens se Equipado (ADR-007)
VALID_EFFECT_TARGETS: List[str] = [
    "VIDA",
    "ARMADURA",
    "MANA",
    "PA",
    "REGEN_VIDA",
    "REGEN_ARMADURA",
    "REGEN_MANA",
    "DEFESA",
    "ATAQUE",
    "ARCANA",
    "SANTIDADE",
    "RES_FISICO",
    "RES_MAGICO",
    "RES_PYRO",
    "RES_CRYO",
    "RES_ELETRICO",
    "RES_PROFANO",
    "RES_SACRO",
    "FORCA",
    "DESTREZA",
    "INTELIGENCIA",
    "SABEDORIA",
    "LABIA",
]


def apply_rounding(value: float, rounding_mode: str = "ROUND_DOWN") -> int:
    """Aplica a estratégia de arredondamento configurada na sala (ADR-009)."""
    if abs(value - round(value)) < 1e-9:
        return int(round(value))
    if rounding_mode == "ROUND_UP":
        return int(math.ceil(value))
    return int(math.floor(value))


def get_attribute_modifier(score: int) -> int:
    """Tabela de modificadores de rolagem (02-ficha-e-atributos.md Seção 6)."""
    s = int(score)
    if s <= 1:
        return -5
    if s <= 3:
        return -3
    if s <= 5:
        return -2
    if s <= 7:
        return -1
    if s <= 9:
        return 0
    if s <= 11:
        return 1
    if s <= 13:
        return 2
    if s <= 15:
        return 3
    if s <= 17:
        return 4
    if s <= 19:
        return 5
    return 7


def get_passive_auto_success_dc(score: int) -> Optional[int]:
    """Mecânica de Sucesso Automático Passivo (02-ficha-e-atributos.md Seção 7)."""
    s = int(score)
    if s >= 19:
        return 11
    if s >= 17:
        return 8
    if s >= 15:
        return 5
    return None


def validate_point_buy(attributes: Dict[str, int]) -> Tuple[bool, str]:
    """
    Valida a distribuição de atributos Point Buy (Base 8, +17 pts = 57 pts totais, Regra do 1 Ponto).
    Retorna (valido, mensagem).
    """
    vals: List[int] = []
    for key in CANONICAL_ATTRIBUTES:
        v = int(attributes.get(key, 8))
        vals.append(v)

    if any(v < 7 for v in vals):
        return False, "Nenhum atributo pode ser menor que 7 na criação."

    reduced_count = sum(1 for v in vals if v == 7)
    if reduced_count > 1:
        return False, "Regra do 1 Ponto: no máximo 1 atributo pode ser reduzido de 8 para 7."

    max_allowed = 19 if reduced_count == 1 else 18
    if any(v > max_allowed for v in vals):
        return (
            False,
            f"Teto excedido: o valor máximo permitido nesta distribuição é {max_allowed}.",
        )

    total = sum(vals)
    if total > 57:
        return False, f"Total de pontos ({total}) excede o limite de 57 pontos."

    return True, "Distribuição válida."


def calculate_xp_required_for_level(level: int, rounding_mode: str = "ROUND_DOWN") -> int:
    """
    Calcula o XP necessário para subir do nível `level` para `level + 1` (ADR-011).
    Nível 1 -> 2 = 80 XP. Cresce +8% composto por nível.
    """
    lvl = max(1, int(level))
    req = 80
    for _ in range(1, lvl):
        req = apply_rounding(req * 1.08, rounding_mode)
    return req


def process_xp_and_level_up(
    char: Dict[str, Any],
    xp_added: int,
    rounding_mode: str = "ROUND_DOWN",
) -> int:
    """
    Adiciona XP ao personagem e processa múltiplos level-ups caso aplicável,
    concedendo +2 pontos de habilidade por nível ganho.
    Retorna quantos níveis o personagem subiu.
    """
    char["xp"] = max(0, int(char.get("xp", 0)) + int(xp_added))
    char["level"] = max(1, int(char.get("level", 1)))
    char["xpNext"] = calculate_xp_required_for_level(char["level"], rounding_mode)

    levels_gained = 0
    while char["xp"] >= char["xpNext"]:
        char["xp"] -= char["xpNext"]
        char["level"] += 1
        levels_gained += 1
        char["skillPoints"] = int(char.get("skillPoints", 0)) + 2
        char["xpNext"] = calculate_xp_required_for_level(char["level"], rounding_mode)

    return levels_gained


def compute_stat_with_modifiers(
    base_val: float,
    flat_sum: float,
    percent_sum: float,
    precedence: str = "FLAT_FIRST",
    rounding_mode: str = "ROUND_DOWN",
) -> int:
    """
    Calcula o valor final de um status aplicando bônus fixos e percentuais (ADR-009).
    FLAT_FIRST: (Base + sum(Flat)) * (1 + sum(Percent)/100)
    PERCENT_FIRST: (Base * (1 + sum(Percent)/100)) + sum(Flat)
    """
    pct_factor = 1.0 + (float(percent_sum) / 100.0)
    if precedence == "PERCENT_FIRST":
        raw_final = (float(base_val) * pct_factor) + float(flat_sum)
    else:
        raw_final = (float(base_val) + float(flat_sum)) * pct_factor
    return apply_rounding(raw_final, rounding_mode)


def compute_character_derived_stats(
    char: Dict[str, Any],
    items_catalog: List[Dict[str, Any]],
    room_settings: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Calcula carga (peso seletivo de itens equipados) e todos os status efetivos
    do personagem combinando base + itens equipados + buffs ativos de consumíveis.
    """
    precedence = room_settings.get("statModifierPrecedence", "FLAT_FIRST")
    rounding_mode = room_settings.get("roundingMode", "ROUND_DOWN")

    items_by_id = {it["id"]: it for it in items_catalog if isinstance(it, dict) and "id" in it}

    flat_mods: Dict[str, float] = {k: 0.0 for k in VALID_EFFECT_TARGETS}
    pct_mods: Dict[str, float] = {k: 0.0 for k in VALID_EFFECT_TARGETS}

    total_weight = 0.0
    inventory = char.get("inventory") or []

    for inv_entry in inventory:
        if not isinstance(inv_entry, dict):
            continue
        if not inv_entry.get("isEquipped"):
            continue
        if inv_entry.get("status") == "IN_ESCROW":
            continue
        item_tpl = items_by_id.get(inv_entry.get("itemId"))
        if not item_tpl:
            continue
        if item_tpl.get("equipavel", False):
            total_weight += float(item_tpl.get("peso", 0.0))
            for eff in item_tpl.get("effects") or []:
                target = eff.get("targetStat")
                if target not in flat_mods:
                    continue
                val = float(eff.get("value", 0))
                if eff.get("modifierType") == "PERCENT":
                    pct_mods[target] += val
                else:
                    flat_mods[target] += val

    # Buffs ativos de consumíveis por turno
    for buff in char.get("activeBuffs") or []:
        if not isinstance(buff, dict):
            continue
        if int(buff.get("remainingTurns", 0)) <= 0:
            continue
        for eff in buff.get("effects") or []:
            target = eff.get("targetStat")
            if target not in flat_mods:
                continue
            val = float(eff.get("value", 0))
            if eff.get("modifierType") == "PERCENT":
                pct_mods[target] += val
            else:
                flat_mods[target] += val

    base_attrs = char.get("attributes") or {}
    effective_attrs: Dict[str, Dict[str, Any]] = {}
    for attr_name in CANONICAL_ATTRIBUTES:
        b_val = int(base_attrs.get(attr_name, 8))
        eff_val = max(
            1,
            compute_stat_with_modifiers(
                b_val,
                flat_mods[attr_name],
                pct_mods[attr_name],
                precedence,
                rounding_mode,
            ),
        )
        effective_attrs[attr_name] = {
            "base": b_val,
            "effective": eff_val,
            "modifier": get_attribute_modifier(eff_val),
            "autoSuccessDc": get_passive_auto_success_dc(eff_val),
        }

    # Status vitais e de combate
    base_max_hp = int(char.get("baseMaxHp", char.get("maxHp", 80)))
    base_max_armor = int(char.get("baseMaxArmor", char.get("maxArmor", 0)))
    base_max_mana = int(char.get("baseMaxMana", char.get("maxMana", 100)))
    base_max_pa = int(char.get("baseMaxPa", char.get("maxPa", 3)))
    base_regen = float(char.get("baseRegen", char.get("regen", 20)))
    base_def = int(char.get("baseDefense", char.get("defense", 0)))
    base_atk = int(char.get("baseAttack", char.get("attack", 0)))
    base_arc = int(char.get("baseArcana", char.get("arcana", 0)))
    base_san = int(char.get("baseSantidade", char.get("santidade", 0)))
    base_res_dmg = float(char.get("baseResistancePercent", char.get("resistancePercent", 0)))
    base_red_dmg = float(char.get("baseDamageReductionPercent", char.get("damageReductionPercent", 0)))

    eff_max_hp = max(1, compute_stat_with_modifiers(base_max_hp, flat_mods["VIDA"], pct_mods["VIDA"], precedence, rounding_mode))
    eff_max_armor_raw = max(0, compute_stat_with_modifiers(base_max_armor, flat_mods["ARMADURA"], pct_mods["ARMADURA"], precedence, rounding_mode))
    armor_degradation = max(0, int(char.get("armorDegradation", 0)))
    eff_max_armor = max(0, eff_max_armor_raw - armor_degradation)

    eff_max_mana = max(0, compute_stat_with_modifiers(base_max_mana, flat_mods["MANA"], pct_mods["MANA"], precedence, rounding_mode))
    eff_max_pa = max(0, compute_stat_with_modifiers(base_max_pa, flat_mods["PA"], pct_mods["PA"], precedence, rounding_mode))
    eff_regen = max(0, compute_stat_with_modifiers(base_regen, flat_mods["REGEN_MANA"], pct_mods["REGEN_MANA"], precedence, rounding_mode))
    eff_regen_vida = max(0, apply_rounding(flat_mods["REGEN_VIDA"] + (eff_max_hp * (pct_mods["REGEN_VIDA"] / 100.0)), rounding_mode))
    eff_regen_armadura = max(0, apply_rounding(flat_mods["REGEN_ARMADURA"] + (eff_max_armor * (pct_mods["REGEN_ARMADURA"] / 100.0)), rounding_mode))
    eff_def = compute_stat_with_modifiers(base_def, flat_mods["DEFESA"], pct_mods["DEFESA"], precedence, rounding_mode)
    eff_atk = compute_stat_with_modifiers(base_atk, flat_mods["ATAQUE"], pct_mods["ATAQUE"], precedence, rounding_mode)
    eff_arc = compute_stat_with_modifiers(base_arc, flat_mods["ARCANA"], pct_mods["ARCANA"], precedence, rounding_mode)
    eff_san = compute_stat_with_modifiers(base_san, flat_mods["SANTIDADE"], pct_mods["SANTIDADE"], precedence, rounding_mode)
    eff_res_dmg = max(0, min(100, apply_rounding(base_res_dmg, rounding_mode)))
    eff_red_dmg = max(0, min(100, apply_rounding(base_red_dmg, rounding_mode)))

    elem_keys = ("FISICO", "MAGICO", "PYRO", "CRYO", "ELETRICO", "PROFANO", "SACRO")
    base_elem_res = char.get("elementalResistances") or {}
    effective_elem_res: Dict[str, float] = {}
    for ek in elem_keys:
        b_er = float(base_elem_res.get(ek, 0.0))
        t_key = f"RES_{ek}"
        eff_er = b_er + float(flat_mods.get(t_key, 0.0)) + float(pct_mods.get(t_key, 0.0))
        effective_elem_res[ek] = int(eff_er) if eff_er.is_integer() else round(eff_er, 1)

    return {
        "totalWeight": round(total_weight, 2),
        "effectiveAttributes": effective_attrs,
        "effectiveElementalResistances": effective_elem_res,
        "effectiveMaxHp": eff_max_hp,
        "effectiveMaxArmor": eff_max_armor,
        "effectiveMaxArmorUnpenalized": eff_max_armor_raw,
        "effectiveMaxMana": eff_max_mana,
        "effectiveMaxPa": eff_max_pa,
        "effectiveRegen": eff_regen,
        "effectiveRegenVida": eff_regen_vida,
        "effectiveRegenArmadura": eff_regen_armadura,
        "effectiveDefense": eff_def,
        "effectiveAttack": eff_atk,
        "effectiveArcana": eff_arc,
        "effectiveSantidade": eff_san,
        "effectiveResistancePercent": eff_res_dmg,
        "effectiveDamageReductionPercent": eff_red_dmg,
    }


def evaluate_damage_pipeline(
    attacker: Dict[str, Any],
    target: Dict[str, Any],
    rounding_mode: str = "ROUND_DOWN",
    is_true_damage: bool = False,
    degrade_armor_on_overload: bool = True,
) -> Dict[str, Any]:
    """
    Pipeline modular de cálculo de dano e penetrações (ADR-012 e 05-combate-e-turnos.md Seções 5 e 6).
    Ordem estrita:
    1. Dano Bruto = (DanoBase + Multiplicadores) * (1 + BonusDano%)
    2. Mitigação 1 — Defesa (com Letalidade %)
    3. Mitigação 2 — Resistência % (com Perfuração %)
    4. Mitigação 3 — Redução de Dano Final % (com Ruptura %)
    5. Arredondamento + Impacto na Armadura (com Sobrecarga) e HP.
    """
    base_damage = max(0.0, float(attacker.get("baseDamage", 0)))
    multipliers = float(attacker.get("statusMultipliers", 0))
    dmg_bonus_pct = float(attacker.get("damageBonusPercent", 0))
    lethality_pct = max(0.0, min(100.0, float(attacker.get("lethalityPercent", 0))))
    penetration_pct = max(0.0, min(100.0, float(attacker.get("penetrationPercent", 0))))
    rupture_pct = max(0.0, min(100.0, float(attacker.get("rupturePercent", 0))))

    target_def = float(target.get("defense", 0))
    target_res_pct = max(0.0, min(100.0, float(target.get("resistancePercent", 0))))
    target_red_pct = max(0.0, min(100.0, float(target.get("damageReductionPercent", 0))))
    current_armor = max(0, int(target.get("currentArmor", 0)))
    max_armor = max(0, int(target.get("maxArmor", 0)))
    current_hp = max(0, int(target.get("currentHp", 0)))

    d_base_effective = max(0.0, base_damage + multipliers)
    d_raw = d_base_effective * (1.0 + (dmg_bonus_pct / 100.0))

    if is_true_damage:
        effective_def = 0.0
        d1 = d_raw
        effective_res = 0.0
        d2 = d1
        effective_red = 0.0
        d_final_unrounded = d2
        final_damage = max(0, apply_rounding(d_final_unrounded, rounding_mode))
        next_armor = current_armor
        armor_degraded_by = 0
        next_hp = max(0, current_hp - final_damage)
    else:
        # Etapa 2: Defesa com Letalidade %
        effective_def = max(0.0, target_def * (1.0 - (lethality_pct / 100.0)))
        d1 = max(0.0, d_raw - effective_def)

        # Etapa 3: Resistência % com Perfuração %
        effective_res = max(0.0, min(100.0, target_res_pct * (1.0 - (penetration_pct / 100.0))))
        d2 = d1 * (1.0 - (effective_res / 100.0))

        # Etapa 4: Redução de Dano Final % com Ruptura %
        effective_red = max(0.0, min(100.0, target_red_pct * (1.0 - (rupture_pct / 100.0))))
        d_final_unrounded = d2 * (1.0 - (effective_red / 100.0))

        # Etapa 5: Arredondamento e absorção de Armadura
        final_damage = max(0, apply_rounding(d_final_unrounded, rounding_mode))

        if final_damage > current_armor:
            overflow_damage = final_damage - current_armor
            next_armor = 0
            # Se D > A e havia armadura ou sobrecarga ativa, degrada temporariamente a Armadura Máxima
            armor_degraded_by = min(max_armor, overflow_damage) if (degrade_armor_on_overload and max_armor > 0) else 0
            next_hp = max(0, current_hp - overflow_damage)
        else:
            next_armor = current_armor - final_damage
            armor_degraded_by = 0
            next_hp = current_hp

    return {
        "dBaseEffective": round(d_base_effective, 2),
        "dRaw": round(d_raw, 2),
        "effectiveDefense": round(effective_def, 2),
        "dAfterDefense": round(d1, 2),
        "effectiveResistancePercent": round(effective_res, 2),
        "dAfterResistance": round(d2, 2),
        "effectiveReductionPercent": round(effective_red, 2),
        "dFinalUnrounded": round(d_final_unrounded, 2),
        "finalDamage": final_damage,
        "previousArmor": current_armor,
        "nextArmor": next_armor,
        "armorDegradedBy": armor_degraded_by,
        "previousHp": current_hp,
        "nextHp": next_hp,
        "becameDead": next_hp == 0 and current_hp > 0,
    }

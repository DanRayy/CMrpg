from __future__ import annotations

import asyncio
import copy
import datetime
import json
import socket
import subprocess
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from rules_engine import (
    CANONICAL_ATTRIBUTES,
    ELEMENTAL_RESISTANCE_TYPES,
    STATUS_RESISTANCE_TYPES,
    calculate_xp_required_for_level,
    compute_character_derived_stats,
    evaluate_damage_pipeline,
)

BASE_DIR = Path(__file__).resolve().parent
STATE_FILE = BASE_DIR / "state.json"
STATIC_DIR = BASE_DIR / "static"

HISTORY_LIMIT = 6
elem_keys = ELEMENTAL_RESISTANCE_TYPES


def get_host_ips() -> Dict[str, Any]:
    """Detecta todos os IPs IPv4 locais da máquina Host (destacando Radmin VPN 26.x.x.x)."""
    ips: List[str] = ["127.0.0.1", "::1", "localhost"]
    radmin_ip: Optional[str] = None
    lan_ip: Optional[str] = None

    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip and ip not in ips:
                ips.append(ip)
    except Exception:
        pass

    try:
        out = subprocess.check_output(["ipconfig"], text=True, errors="ignore", timeout=3)
        for line in out.splitlines():
            if "IPv4" in line and ":" in line:
                candidate = line.split(":")[-1].strip()
                if candidate and candidate not in ips:
                    ips.append(candidate)
    except Exception:
        pass

    for ip in ips:
        if ip.startswith("26.") and not radmin_ip:
            radmin_ip = ip
        elif not ip.startswith("127.") and ip not in ("::1", "localhost") and not lan_ip:
            lan_ip = ip

    preferred_ip = radmin_ip or lan_ip or "127.0.0.1"
    return {
        "all_ips": ips,
        "radmin_ip": radmin_ip,
        "lan_ip": lan_ip,
        "preferred_ip": preferred_ip,
        "invite_url": f"http://{preferred_ip}:8000",
    }


HOST_NETWORK_INFO = get_host_ips()


def clean_client_ip(client_host: Optional[str]) -> str:
    if not client_host:
        return "127.0.0.1"
    ip = client_host.strip()
    if ip.startswith("::ffff:"):
        ip = ip.replace("::ffff:", "")
    return ip


def is_client_host_master(client_host: Optional[str]) -> bool:
    """Verifica estritamente se o IP conectado pertence à própria máquina do Host (Mestre)."""
    ip = clean_client_ip(client_host)
    return ip in HOST_NETWORK_INFO["all_ips"]


def get_canonical_member_ip(client_host: Optional[str]) -> str:
    """Para o Host, retorna o IP principal da máquina (ex: Radmin 26.x.x.x ou LAN). Para jogadores, retorna o IP real deles."""
    if is_client_host_master(client_host):
        return HOST_NETWORK_INFO["preferred_ip"]
    return clean_client_ip(client_host)


def now_iso() -> str:
    return datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")


def master_full_permissions() -> Dict[str, Any]:
    return {
        "preset": "MESTRE_TOTAL",
        # Categoria 1: Personagens & Fichas
        "char_manage_own": True,
        "char_view_others": True,
        "char_create": True,
        "char_edit_others": True,
        "char_delete": True,
        "char_reorder": True,
        "char_grant_xp": True,
        # Categoria 2: Combate, Turnos & Acúmulos
        "combat_advance_own_turn": True,
        "combat_manage_battle": True,
        "combat_edit_order": True,
        "combat_advance_any_turn": True,
        "combat_manage_charges": True,
        "combat_apply_damage_others": True,
        "combat_manage_accumulations_others": True,
        # Categoria 3: Itens, Inventário & Ouro
        "inventory_view_others": True,
        "inventory_transfer_any": True,
        "inventory_edit_others": True,
        "item_manage_catalog": True,
        "gold_manage": True,
        # Categoria 4: Loja, Mercadores & Escrow
        "shop_buy_sell": True,
        "shop_manage_npcs": True,
        "shop_approve_escrow": True,
        # Categoria 5: Bestiário & Invocação
        "bestiary_view_revealed": True,
        "bestiary_view_hidden": True,
        "bestiary_manage": True,
        "bestiary_summon": True,
        # Categoria 6: Missões & Sistema
        "mission_accept": True,
        "mission_manage": True,
        "mission_approve": True,
        "system_undo_redo": True,
        "system_view_audit_log": True,
        # Retrocompatibilidade
        "canEditRoom": True,
        "canViewAudit": True,
        "canManageMembers": True,
        "canCreateCharacters": True,
        "canEditOwnCharacter": True,
        "canEditOtherCharacters": True,
        "canDeleteCharacters": True,
        "canViewOtherInventories": True,
        "canManageItemsCatalog": True,
        "canApproveSales": True,
        "canManageShopNpcs": True,
        "canManageGold": True,
        "canManageQuests": True,
    }


def default_permissions(preset: str = "JOGADOR_COMUM") -> Dict[str, Any]:
    norm_preset = preset.upper() if isinstance(preset, str) else "JOGADOR_COMUM"
    if norm_preset in ("JOGADOR_COMUM", "COMUM"):
        norm_preset = "JOGADOR_COMUM"
    elif norm_preset in ("SUB_MESTRE", "AJUDANTE", "MODERADOR"):
        norm_preset = "SUB_MESTRE"
    elif norm_preset in ("ESPECTADOR", "VIEWER"):
        norm_preset = "ESPECTADOR"
    else:
        norm_preset = "PERSONALIZADO"

    base = {
        "preset": norm_preset,
        # Categoria 1: Personagens & Fichas
        "char_manage_own": True,
        "char_view_others": True,
        "char_create": True,
        "char_edit_others": False,
        "char_delete": False,
        "char_reorder": False,
        "char_grant_xp": False,
        # Categoria 2: Combate, Turnos & Acúmulos
        "combat_advance_own_turn": True,
        "combat_manage_battle": False,
        "combat_edit_order": False,
        "combat_advance_any_turn": False,
        "combat_manage_charges": True,
        "combat_apply_damage_others": True,
        "combat_manage_accumulations_others": False,
        # Categoria 3: Itens, Inventário & Ouro
        "inventory_view_others": True,
        "inventory_transfer_any": True,
        "inventory_edit_others": False,
        "item_manage_catalog": False,
        "gold_manage": False,
        # Categoria 4: Loja, Mercadores & Escrow
        "shop_buy_sell": True,
        "shop_manage_npcs": False,
        "shop_approve_escrow": False,
        # Categoria 5: Bestiário & Invocação
        "bestiary_view_revealed": True,
        "bestiary_view_hidden": False,
        "bestiary_manage": False,
        "bestiary_summon": False,
        # Categoria 6: Missões & Sistema
        "mission_accept": True,
        "mission_manage": False,
        "mission_approve": False,
        "system_undo_redo": False,
        "system_view_audit_log": True,
        # Retrocompatibilidade
        "canEditRoom": False,
        "canViewAudit": True,
        "canManageMembers": False,
        "canCreateCharacters": True,
        "canEditOwnCharacter": True,
        "canEditOtherCharacters": False,
        "canDeleteCharacters": False,
        "canViewOtherInventories": True,
        "canManageItemsCatalog": False,
        "canApproveSales": False,
        "canManageShopNpcs": False,
        "canManageGold": False,
        "canManageQuests": False,
    }

    if norm_preset == "SUB_MESTRE":
        base.update({
            "char_create": True,
            "char_edit_others": True,
            "char_grant_xp": True,
            "combat_manage_battle": True,
            "combat_edit_order": True,
            "combat_advance_any_turn": True,
            "combat_manage_charges": True,
            "combat_apply_damage_others": True,
            "combat_manage_accumulations_others": True,
            "inventory_transfer_any": True,
            "inventory_edit_others": True,
            "shop_manage_npcs": True,
            "shop_approve_escrow": True,
            "bestiary_summon": True,
            "mission_manage": True,
            "mission_approve": True,
            "system_view_audit_log": True,
            # Aliases
            "canCreateCharacters": True,
            "canEditOtherCharacters": True,
            "canApproveSales": True,
            "canManageShopNpcs": True,
            "canManageQuests": True,
            "canViewAudit": True,
        })
    elif norm_preset == "ESPECTADOR":
        base.update({
            "char_create": False,
            "char_manage_own": False,
            "combat_advance_own_turn": False,
            "combat_manage_charges": False,
            "combat_apply_damage_others": False,
            "inventory_transfer_any": False,
            "shop_buy_sell": False,
            "mission_accept": False,
            "system_view_audit_log": False,
            "canCreateCharacters": False,
            "canEditOwnCharacter": False,
            "canViewAudit": False,
        })

    return base


def build_default_resistances(max_val: int = 100) -> Dict[str, Dict[str, int]]:
    return {res_name: {"current": 0, "max": max_val} for res_name in STATUS_RESISTANCE_TYPES}


def build_default_catalog() -> List[Dict[str, Any]]:
    return [
        {
            "id": "item_cota_malha",
            "nome": "Cota de Malha Real",
            "descricao": "Armadura forjada em aço temperado que concede proteção pesada.",
            "tipo": "ARMADURA",
            "equipavel": True,
            "peso": 8.5,
            "preco": 250,
            "naoNegociavel": False,
            "precoIndefinido": False,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [
                {"targetStat": "ARMADURA", "modifierType": "FLAT", "value": 60, "durationTurns": None},
                {"targetStat": "DEFESA", "modifierType": "FLAT", "value": 4, "durationTurns": None},
            ],
        },
        {
            "id": "item_espada_solar",
            "nome": "Lâmina Crepuscular",
            "descricao": "Espada longa encantada que amplifica o poder ofensivo e a força.",
            "tipo": "ARMA",
            "equipavel": True,
            "peso": 3.5,
            "preco": 320,
            "naoNegociavel": False,
            "precoIndefinido": False,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [
                {"targetStat": "ATAQUE", "modifierType": "FLAT", "value": 15, "durationTurns": None},
                {"targetStat": "FORCA", "modifierType": "FLAT", "value": 2, "durationTurns": None},
            ],
        },
        {
            "id": "item_cajado_arcano",
            "nome": "Cajado do Éter",
            "descricao": "Canalizador místico que expande a reserva de mana e o poder arcano.",
            "tipo": "ARMA",
            "equipavel": True,
            "peso": 2.0,
            "preco": 300,
            "naoNegociavel": False,
            "precoIndefinido": False,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [
                {"targetStat": "ARCANA", "modifierType": "FLAT", "value": 18, "durationTurns": None},
                {"targetStat": "MANA", "modifierType": "FLAT", "value": 50, "durationTurns": None},
            ],
        },
        {
            "id": "item_anel_rubi",
            "nome": "Anel de Vitalidade Rubi",
            "descricao": "Anel ancestral que amplia a vitalidade máxima do portador em +25%.",
            "tipo": "ACESSORIO",
            "equipavel": True,
            "peso": 0.2,
            "preco": 400,
            "naoNegociavel": False,
            "precoIndefinido": False,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [
                {"targetStat": "VIDA", "modifierType": "PERCENT", "value": 25, "durationTurns": None},
            ],
        },
        {
            "id": "item_amuleto_vento",
            "nome": "Amuleto do Passo Veloz",
            "descricao": "Concede +1 Ponto de Ação (PA) e +2 de Destreza enquanto equipado.",
            "tipo": "ACESSORIO",
            "equipavel": True,
            "peso": 0.3,
            "preco": 550,
            "naoNegociavel": False,
            "precoIndefinido": False,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [
                {"targetStat": "PA", "modifierType": "FLAT", "value": 1, "durationTurns": None},
                {"targetStat": "DESTREZA", "modifierType": "FLAT", "value": 2, "durationTurns": None},
            ],
        },
        {
            "id": "item_pocao_furia",
            "nome": "Elixir de Sangue Dragônico",
            "descricao": "Consumível: regenera +30% de Vida ao usar.",
            "tipo": "CONSUMIVEL",
            "equipavel": False,
            "peso": 0.5,
            "preco": 90,
            "naoNegociavel": False,
            "precoIndefinido": False,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [
                {"targetStat": "REGEN_VIDA", "modifierType": "PERCENT", "value": 30, "durationTurns": None},
            ],
        },
        {
            "id": "item_pocao_mana",
            "nome": "Essência Astral Pura",
            "descricao": "Consumível: regenera +20% de Mana ao usar.",
            "tipo": "CONSUMIVEL",
            "equipavel": False,
            "peso": 0.5,
            "preco": 85,
            "naoNegociavel": False,
            "precoIndefinido": False,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [
                {"targetStat": "REGEN_MANA", "modifierType": "PERCENT", "value": 20, "durationTurns": None},
            ],
        },
        {
            "id": "item_escudo_templario",
            "nome": "Égide do Juramento Sagrado",
            "descricao": "Escudo relíquia que eleva Armadura, Defesa e Santidade.",
            "tipo": "ARMADURA",
            "equipavel": True,
            "peso": 6.0,
            "preco": 480,
            "naoNegociavel": False,
            "precoIndefinido": False,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [
                {"targetStat": "ARMADURA", "modifierType": "FLAT", "value": 80, "durationTurns": None},
                {"targetStat": "SANTIDADE", "modifierType": "FLAT", "value": 12, "durationTurns": None},
            ],
        },
        {
            "id": "item_chave_cripta",
            "nome": "Chave da Cripta Antiga",
            "descricao": "Chave de ferro negro marcada com runas reais. Item de história.",
            "tipo": "OUTRO",
            "equipavel": False,
            "peso": 0.1,
            "preco": 0,
            "naoNegociavel": True,
            "precoIndefinido": True,
            "visivelParaJogadores": True,
            "durationTurns": None,
            "effects": [],
        },
    ]


def build_default_characters() -> List[Dict[str, Any]]:
    res_1 = build_default_resistances(100)
    res_2 = build_default_resistances(100)

    teste = {
        "id": "char_default_1",
        "name": "Teste",
        "ownerMemberId": None,
        "age": "24 anos",
        "height": "1,82m",
        "history": "Guerreiro veterano das fronteiras do norte, especialista em combates de linha de frente.",
        "skillsDescription": "Golpe Brutal, Postura Inabalável e Grito de Guerra.",
        "level": 1,
        "xp": 0,
        "xpNext": 80,
        "skillPoints": 0,
        "pendingAttributePoints": 0,
        "hp": 143,
        "maxHp": 143,
        "baseMaxHp": 143,
        "armor": 117,
        "maxArmor": 117,
        "baseMaxArmor": 117,
        "armorDegradation": 0,
        "mana": 200,
        "maxMana": 200,
        "baseMaxMana": 200,
        "pa": 3,
        "maxPa": 3,
        "baseMaxPa": 3,
        "regen": 20,
        "baseRegen": 20,
        "defense": 0,
        "baseDefense": 0,
        "attack": 12,
        "baseAttack": 12,
        "arcana": 5,
        "baseArcana": 5,
        "santidade": 0,
        "baseSantidade": 0,
        "resistancePercent": 0,
        "baseResistancePercent": 0,
        "damageReductionPercent": 0,
        "baseDamageReductionPercent": 0,
        "gold": 250,
        "isDead": False,
        "attributes": {
            "FORCA": 16,
            "DESTREZA": 13,
            "INTELIGENCIA": 8,
            "SABEDORIA": 11,
            "LABIA": 9,
        },
        "resistances": copy.deepcopy(res_1),
        "inventory": [
            {
                "id": "inv_1",
                "itemId": "item_espada_solar",
                "quantity": 1,
                "isEquipped": False,
                "status": "IN_INVENTORY",
            },
            {
                "id": "inv_2",
                "itemId": "item_pocao_furia",
                "quantity": 2,
                "isEquipped": False,
                "status": "IN_INVENTORY",
            },
        ],
        "activeBuffs": [],
        "talents": [
            {"id": "tal_1", "name": "Mestre de Armas", "description": "+10% de precisão com espadas longas."}
        ],
        "initial": {
            "hp": 143,
            "maxHp": 143,
            "armor": 117,
            "maxArmor": 117,
            "mana": 200,
            "maxMana": 200,
            "pa": 3,
            "maxPa": 3,
            "regen": 20,
            "defense": 0,
            "attack": 12,
            "arcana": 5,
            "santidade": 0,
            "resistancePercent": 0,
            "damageReductionPercent": 0,
            "resistances": copy.deepcopy(res_1),
        },
    }

    teste2 = {
        "id": "char_default_2",
        "name": "Teste2",
        "ownerMemberId": None,
        "age": "118 anos",
        "height": "1,75m",
        "history": "Guardião arcano da Cidadela Dourada, versado em barreiras rúnicas e feitiçaria antiga.",
        "skillsDescription": "Muralha Etérea, Lança de Cristal e Pulso Arcano.",
        "level": 1,
        "xp": 0,
        "xpNext": 80,
        "skillPoints": 0,
        "pendingAttributePoints": 0,
        "hp": 1000,
        "maxHp": 1000,
        "baseMaxHp": 1000,
        "armor": 500,
        "maxArmor": 500,
        "baseMaxArmor": 500,
        "armorDegradation": 0,
        "mana": 300,
        "maxMana": 300,
        "baseMaxMana": 300,
        "pa": 3,
        "maxPa": 3,
        "baseMaxPa": 3,
        "regen": 40,
        "baseRegen": 40,
        "defense": 10,
        "baseDefense": 10,
        "attack": 8,
        "baseAttack": 8,
        "arcana": 25,
        "baseArcana": 25,
        "santidade": 10,
        "baseSantidade": 10,
        "resistancePercent": 10,
        "baseResistancePercent": 10,
        "damageReductionPercent": 5,
        "baseDamageReductionPercent": 5,
        "gold": 400,
        "isDead": False,
        "attributes": {
            "FORCA": 8,
            "DESTREZA": 10,
            "INTELIGENCIA": 18,
            "SABEDORIA": 13,
            "LABIA": 8,
        },
        "resistances": copy.deepcopy(res_2),
        "inventory": [
            {
                "id": "inv_3",
                "itemId": "item_cajado_arcano",
                "quantity": 1,
                "isEquipped": False,
                "status": "IN_INVENTORY",
            },
            {
                "id": "inv_4",
                "itemId": "item_pocao_mana",
                "quantity": 2,
                "isEquipped": False,
                "status": "IN_INVENTORY",
            },
        ],
        "activeBuffs": [],
        "talents": [
            {"id": "tal_2", "name": "Fluxo Astral", "description": "Reduz o custo de magias arcanas."}
        ],
        "initial": {
            "hp": 1000,
            "maxHp": 1000,
            "armor": 500,
            "maxArmor": 500,
            "mana": 300,
            "maxMana": 300,
            "pa": 3,
            "maxPa": 3,
            "regen": 40,
            "defense": 10,
            "attack": 8,
            "arcana": 25,
            "santidade": 10,
            "resistancePercent": 10,
            "damageReductionPercent": 5,
            "resistances": copy.deepcopy(res_2),
        },
    }

    return [teste, teste2]


CURSOR_COLOR_PALETTE: List[str] = [
    "#FF595E",  # Vermelho Coral
    "#3B82F6",  # Azul Neon
    "#10B981",  # Verde Esmeralda
    "#F59E0B",  # Amarelo Ouro
    "#A855F7",  # Roxo
    "#06B6D4",  # Ciano
    "#F97316",  # Laranja
    "#EC4899",  # Rosa Choque
    "#84CC16",  # Lima
    "#818CF8",  # Lavanda
]


def assign_permanent_cursor_color(
    member_key: str,
    existing_color: Optional[str] = None,
    used_colors: Optional[List[str]] = None,
) -> str:
    """Atribui e mantém permanentemente uma cor para o cursor. O Mestre usa RGB Chroma contínuo; jogadores usam 1 das 10 cores da paleta."""
    key_str = str(member_key or "player").strip()
    if key_str == "host_master" or str(existing_color or "").strip().upper() == "RGB_CHROMA":
        return "RGB_CHROMA"

    palette_upper = {c.upper(): c for c in CURSOR_COLOR_PALETTE}
    if existing_color and str(existing_color).strip().upper() in palette_upper:
        return palette_upper[str(existing_color).strip().upper()]

    h = 0
    for ch in key_str:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    base_idx = h % len(CURSOR_COLOR_PALETTE)

    used_set = {str(c).strip().upper() for c in (used_colors or []) if c and str(c).strip().upper() != "RGB_CHROMA"}
    for offset in range(len(CURSOR_COLOR_PALETTE)):
        candidate = CURSOR_COLOR_PALETTE[(base_idx + offset) % len(CURSOR_COLOR_PALETTE)]
        if candidate.upper() not in used_set:
            return candidate

    return CURSOR_COLOR_PALETTE[base_idx]


def build_host_master_member(existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    host_ip = HOST_NETWORK_INFO["preferred_ip"]
    nickname = ""
    char_id = None
    existing_color = None
    if isinstance(existing, dict):
        nickname = str(existing.get("nickname") or "").strip()
        char_id = existing.get("characterId")
        existing_color = existing.get("cursorColor")
    display_name = nickname if nickname else f"Host ({host_ip})"
    cursor_color = "RGB_CHROMA"
    return {
        "id": "host_master",
        "ip": host_ip,
        "name": display_name,
        "nickname": nickname,
        "title": f"Host Principal • IP: {host_ip}",
        "role": "MESTRE",
        "avatar": "crown",
        "characterId": char_id,
        "cursorColor": cursor_color,
        "online": bool(existing.get("online", False)) if isinstance(existing, dict) else False,
        "connectionsCount": int(existing.get("connectionsCount", 0)) if isinstance(existing, dict) else 0,
        "permissions": master_full_permissions(),
    }


def build_default_campaign_state() -> Dict[str, Any]:
    host_member = build_host_master_member()
    return {
        "initialized": True,
        "room": {
            "name": "SALA1",
            "subtitle": "TESTES DE TUDOO",
            "quote": "GRANDES HISTÓRIAS NASCEM DE BOAS COMPANHIAS.\nBEM-VINDOS À MESA.",
            "currencyName": "Ouro",
            "sharedGold": 1620,
            "isSharedWallet": True,
            "unlimitedInventory": True,
            "inventoryLimit": 10,
            "statModifierPrecedence": "FLAT_FIRST",
            "roundingMode": "ROUND_DOWN",
            "inviteCode": "RADMIN-LAN-8000",
        },
        "members": [host_member],
        "characters": build_default_characters(),
        "itemsCatalog": build_default_catalog(),
        "npcs": [
            {
                "id": "npc_ferreiro_baldwin",
                "name": "Baldwin, o Ferreiro Real",
                "description": "Mestre armeiro e alquimista da capital. Vende equipamentos de elite e elixires raros.",
                "avatar": "anvil",
                "stock": [
                    {"itemId": "item_cota_malha", "infinite": True, "quantity": 10},
                    {"itemId": "item_espada_solar", "infinite": True, "quantity": 5},
                    {"itemId": "item_cajado_arcano", "infinite": True, "quantity": 5},
                    {"itemId": "item_anel_rubi", "infinite": False, "quantity": 2},
                    {"itemId": "item_amuleto_vento", "infinite": False, "quantity": 1},
                    {"itemId": "item_pocao_furia", "infinite": True, "quantity": 20},
                    {"itemId": "item_pocao_mana", "infinite": True, "quantity": 20},
                    {"itemId": "item_escudo_templario", "infinite": False, "quantity": 2},
                ],
            }
        ],
        "escrowSales": [],
        "bestiary": [
            {
                "id": "bestiary_guardiao_cinzas",
                "name": "Guardião de Cinzas",
                "level": 3,
                "maxHp": 220,
                "maxArmor": 40,
                "maxMana": 80,
                "regen": 10,
                "defense": 15,
                "attack": 18,
                "arcana": 12,
                "santidade": 0,
                "reveladoParaJogadores": False,
                "generalSkills": "• Golpe da Forja Ancestral: Causa 25 de Dano Físico e aplica 30 de Sangramento.\n• Sopro de Fuligem: Explosão em área causando 15 de Dano Pyro em todos os alvos à frente.\n• Couraça de Escória (Passiva): Sempre que sua Armadura sofre dano, reflete 5 de Dano Pyro ao atacante.",
                "attributes": {"FORCA": 16, "DESTREZA": 8, "INTELIGENCIA": 10, "SABEDORIA": 12, "LABIA": 6},
                "resistances": {
                    "congelamento": {"current": 0, "max": 100},
                    "choque": {"current": 0, "max": 100},
                    "sangramento": {"current": 0, "max": 150},
                    "chamas": {"current": 0, "max": 200},
                    "veneno": {"current": 0, "max": 100},
                    "atordoamento": {"current": 0, "max": 120},
                    "cegueira": {"current": 0, "max": 100},
                },
                "elementalResistances": {"FISICO": 20, "MAGICO": 0, "PYRO": 50, "CRYO": -20, "ELETRICO": 0, "PROFANO": 0, "SACRO": 0},
            },
            {
                "id": "bestiary_lobo_cinzento",
                "name": "Lobo Cinzento",
                "level": 1,
                "maxHp": 90,
                "maxArmor": 10,
                "maxMana": 40,
                "regen": 10,
                "defense": 5,
                "attack": 14,
                "arcana": 0,
                "santidade": 0,
                "reveladoParaJogadores": False,
                "generalSkills": "• Mordida Voraz: Causa 14 de dano físico e 20 de sangramento.\n• Uivo da Matilha: Concede +2 de Ataque para todos os aliados próximos por 2 rodadas.",
                "attributes": {"FORCA": 12, "DESTREZA": 14, "INTELIGENCIA": 6, "SABEDORIA": 10, "LABIA": 4},
                "resistances": {
                    "congelamento": {"current": 0, "max": 100},
                    "choque": {"current": 0, "max": 100},
                    "sangramento": {"current": 0, "max": 100},
                    "chamas": {"current": 0, "max": 80},
                    "veneno": {"current": 0, "max": 100},
                    "atordoamento": {"current": 0, "max": 100},
                    "cegueira": {"current": 0, "max": 100},
                },
                "elementalResistances": {"FISICO": 0, "MAGICO": 0, "PYRO": -10, "CRYO": 20, "ELETRICO": 0, "PROFANO": 0, "SACRO": 0},
            }
        ],
        "battle": {
            "isActive": False,
            "roundNumber": 1,
            "totalTurnsCount": 0,
            "masterTurnsCount": 0,
            "currentTurnIndex": 0,
            "charges": 0,
            "groupCharges": 0,
            "participantsOrder": [
                {
                    "id": "char_default_1",
                    "name": "Teste",
                    "isMaster": False,
                    "isDead": False,
                    "turnsTaken": 0,
                    "initiativeRoll": 18,
                },
                {
                    "id": "MESTRE",
                    "name": "Mestre da Mesa",
                    "isMaster": True,
                    "isDead": False,
                    "turnsTaken": 0,
                    "initiativeRoll": 15,
                },
                {
                    "id": "char_default_2",
                    "name": "Teste2",
                    "isMaster": False,
                    "isDead": False,
                    "turnsTaken": 0,
                    "initiativeRoll": 12,
                },
            ],
        },
        "quests": [
            {
                "id": "quest_cripta_rei",
                "title": "O Selo da Cripta Esquecida",
                "description": "Investigar as ruínas subterrâneas ao norte da taverna e derrotar o Guardião de Cinzas.",
                "status": "EM_PROGRESSO",
                "assignedCharacterIds": ["char_default_1", "char_default_2"],
                "rewards": {
                    "gold": 500,
                    "xp": 120,
                    "attributePoints": 1,
                    "skillPoints": 1,
                    "items": [{"itemId": "item_anel_rubi", "quantity": 1}],
                    "itemIds": ["item_anel_rubi"],
                },
                "rewarded": False,
                "createdAt": now_iso(),
            },
            {
                "id": "quest_escolta_mercador",
                "title": "Caravana de Baldwin",
                "description": "Escoltar o carregamento de minério raro pelas estradas da floresta sombria.",
                "status": "PENDENTE",
                "assignedCharacterIds": [],
                "rewards": {
                    "gold": 300,
                    "xp": 80,
                    "attributePoints": 0,
                    "skillPoints": 0,
                    "items": [{"itemId": "item_pocao_furia", "quantity": 2}],
                    "itemIds": ["item_pocao_furia"],
                },
                "rewarded": False,
                "createdAt": now_iso(),
            },
        ],
        "auditLog": [
            {
                "id": "audit_init_1",
                "actorName": f"Host ({HOST_NETWORK_INFO['preferred_ip']})",
                "actionType": "ROOM_INIT",
                "targetEntity": "Sala: SALA1",
                "summary": f"Mesa SALA1 inicializada no Host {HOST_NETWORK_INFO['preferred_ip']} com 1620 Ouro no cofre.",
                "createdAt": now_iso(),
            }
        ],
        "customPermissionPresets": [],
        "skillTrees": build_default_skill_trees(),
        "undo_stack": [],
        "redo_stack": [],
    }


def build_default_skill_trees() -> List[Dict[str, Any]]:
    """Retorna a árvore de habilidades padrão de exemplo (Geomancia) pré-cadastrada."""
    return [
        {
            "id": "tree_geomancia",
            "name": "Geomancia",
            "description": "Domínio telúrico focado em fortificação de armadura, postura defensiva inabalável e retaliação sísmica.",
            "hiddenForPlayers": False,
            "completionDescription": "Domínio completo da terra: +10 kg de Capacidade de Peso máxima na mochila.",
            "completionEffects": [
                {
                    "targetStat": "CAPACIDADE_PESO",
                    "modifierType": "FLAT",
                    "value": 10,
                }
            ],
            "nodes": [
                {
                    "id": "node_geo_passiva_1",
                    "category": "PASSIVA",
                    "name": "Geomancia",
                    "subtype": "",
                    "description": "Inicia batalhas com 10% de sua capacidade de armadura como armadura adicional, e aumenta sua defesa enquanto tem armadura em 8%+2. Se sua armadura for quebrada, causa 25+40% de seu ataque e arcana ao atacante, esse dano possui 50% de letalidade.",
                    "unlockCost": 6,
                    "maxRanks": 1,
                    "costPerRank": 6,
                    "maxUpgrades": 0,
                    "upgradeCost": 0,
                    "upgradeDescription": "",
                    "manaCost": "",
                    "paCost": "",
                    "uses": "",
                    "cooldown": "",
                    "effects": [],
                    "order": 0,
                },
                {
                    "id": "node_geo_passiva_2",
                    "category": "PASSIVA",
                    "name": "Foco de Armadura",
                    "subtype": "",
                    "description": "Aumenta sua redução de dano em 10% enquanto tiver armadura, mas recebe 15%+1 de dano quando sofrer dano fora da armadura (efeitos não inclusos).",
                    "unlockCost": 4,
                    "maxRanks": 1,
                    "costPerRank": 4,
                    "maxUpgrades": 0,
                    "upgradeCost": 0,
                    "upgradeDescription": "",
                    "manaCost": "",
                    "paCost": "",
                    "uses": "",
                    "cooldown": "",
                    "effects": [],
                    "order": 1,
                },
                {
                    "id": "node_geo_ativa_1",
                    "category": "ATIVA",
                    "name": "Armadura de Rochas",
                    "subtype": "Postura",
                    "description": "Recupera 10% de sua armadura máxima e um adicional de 65% de sua arcana, para si ou um aliado, enquanto mantiver a postura o alvo recebe 5 de defesa e 8% de resistência geral, mas se sua postura for quebrada você sofre 55 acúmulos de atordoamento.",
                    "unlockCost": 4,
                    "maxRanks": 1,
                    "costPerRank": 4,
                    "maxUpgrades": 2,
                    "upgradeCost": 2,
                    "upgradeDescription": "Recuperação com base em armadura +2%.",
                    "manaCost": "35",
                    "paCost": "2",
                    "uses": "3",
                    "cooldown": "",
                    "effects": [],
                    "order": 2,
                },
                {
                    "id": "node_geo_talento_1",
                    "category": "TALENTO",
                    "name": "Blindagem",
                    "subtype": "",
                    "description": "Aumenta a armadura em 4 e defesa em 1.",
                    "unlockCost": 1,
                    "maxRanks": 5,
                    "costPerRank": 1,
                    "maxUpgrades": 0,
                    "upgradeCost": 1,
                    "upgradeDescription": "",
                    "manaCost": "",
                    "paCost": "",
                    "uses": "",
                    "cooldown": "",
                    "effects": [
                        {"targetStat": "ARMADURA", "modifierType": "FLAT", "value": 4},
                        {"targetStat": "DEFESA", "modifierType": "FLAT", "value": 1},
                    ],
                    "order": 3,
                },
                {
                    "id": "node_geo_talento_2",
                    "category": "TALENTO",
                    "name": "Vigor",
                    "subtype": "",
                    "description": "Aumenta o HP em 5.",
                    "unlockCost": 1,
                    "maxRanks": 5,
                    "costPerRank": 1,
                    "maxUpgrades": 0,
                    "upgradeCost": 1,
                    "upgradeDescription": "",
                    "manaCost": "",
                    "paCost": "",
                    "uses": "",
                    "cooldown": "",
                    "effects": [
                        {"targetStat": "VIDA", "modifierType": "FLAT", "value": 5},
                    ],
                    "order": 4,
                },
            ],
        }
    ]


def normalize_character(
    raw: Dict[str, Any],
    items_catalog: List[Dict[str, Any]],
    room_settings: Dict[str, Any],
    skill_trees: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Garante que o personagem possui todos os atributos, recursos vitais, 7 resistências, inventário e status derivados."""
    char = copy.deepcopy(raw or {})
    name = str(char.get("name", "")).strip()
    char["name"] = name if name else "Sem nome"
    char["id"] = str(char.get("id") or f"char_{uuid.uuid4().hex[:8]}")

    raw_owner_id = char.get("ownerMemberId")
    if raw_owner_id in ("member_leetobr", "member_san", "member_master", None, ""):
        raw_owner_id = "host_master"
    char["ownerMemberId"] = str(raw_owner_id)
    char["ownerIp"] = str(char.get("ownerIp") or HOST_NETWORK_INFO["preferred_ip"]).strip()

    char["age"] = str(char.get("age", "")).strip()
    char["height"] = str(char.get("height", "")).strip()
    char["history"] = str(char.get("history", "")).strip()
    char["skillsDescription"] = str(char.get("skillsDescription", "")).strip()
    char["skillPassive"] = str(char.get("skillPassive", "")).strip()
    char["skillActive"] = str(char.get("skillActive", "")).strip()
    char["skillSupreme"] = str(char.get("skillSupreme", "")).strip()
    char["isEnemy"] = bool(char.get("isEnemy", False))
    char["bestiaryId"] = str(char.get("bestiaryId")) if char.get("bestiaryId") else None
    char["generalSkills"] = str(char.get("generalSkills", "")).strip()
    char["reveladoParaJogadores"] = bool(char.get("reveladoParaJogadores", False))

    if char["isEnemy"]:
        char["baseMaxWeight"] = 999
        char["maxWeight"] = 999
        if not char.get("avatar"):
            char["avatar"] = "monster-grasp"
    else:
        raw_base_weight = float(char.get("baseMaxWeight", char.get("maxWeight", 27)))
        if raw_base_weight < 0:
            raw_base_weight = 27.0
        char["baseMaxWeight"] = int(raw_base_weight) if raw_base_weight.is_integer() else round(raw_base_weight, 2)
        char["maxWeight"] = char["baseMaxWeight"]

    rounding_mode = room_settings.get("roundingMode", "ROUND_DOWN")
    char["level"] = max(1, int(char.get("level", 1)))
    char["xp"] = max(0, int(char.get("xp", 0)))
    char["xpNext"] = calculate_xp_required_for_level(char["level"], rounding_mode)
    char["skillPoints"] = max(0, int(char.get("skillPoints", (char["level"] - 1) * 2)))
    char["pendingAttributePoints"] = max(0, int(char.get("pendingAttributePoints", 0)))

    char["baseMaxHp"] = max(1, int(char.get("baseMaxHp", char.get("maxHp", 80))))
    char["baseMaxArmor"] = max(0, int(char.get("baseMaxArmor", char.get("maxArmor", 0))))
    char["baseMaxMana"] = max(0, int(char.get("baseMaxMana", char.get("maxMana", 100))))
    char["baseMaxPa"] = max(0, int(char.get("baseMaxPa", char.get("maxPa", 3))))
    char["baseRegen"] = float(char.get("baseRegen", char.get("regen", 20)))
    if char["baseRegen"].is_integer():
        char["baseRegen"] = int(char["baseRegen"])
    char["baseDefense"] = int(char.get("baseDefense", char.get("defense", 0)))
    char["baseAttack"] = int(char.get("baseAttack", char.get("attack", 0)))
    char["baseArcana"] = int(char.get("baseArcana", char.get("arcana", 0)))
    char["baseSantidade"] = int(char.get("baseSantidade", char.get("santidade", 0)))
    char["baseResistancePercent"] = float(char.get("baseResistancePercent", char.get("resistancePercent", 0)))
    char["baseDamageReductionPercent"] = float(char.get("baseDamageReductionPercent", char.get("damageReductionPercent", 0)))
    char["armorDegradation"] = max(0, int(char.get("armorDegradation", 0)))
    char["gold"] = max(0, int(char.get("gold", 0)))

    raw_attrs = char.get("attributes") or {}
    norm_attrs: Dict[str, int] = {}
    for k in CANONICAL_ATTRIBUTES:
        norm_attrs[k] = max(7, int(raw_attrs.get(k, 8)))
    char["attributes"] = norm_attrs

    raw_res = char.get("resistances") or {}
    norm_res: Dict[str, Dict[str, int]] = {}
    for res_name in STATUS_RESISTANCE_TYPES:
        r_item = raw_res.get(res_name) or {}
        r_max = max(0, int(r_item.get("max", 100)))
        r_cur = max(0, min(r_max, int(r_item.get("current", 0))))
        norm_res[res_name] = {"current": r_cur, "max": r_max}
    char["resistances"] = norm_res

    raw_elem = char.get("elementalResistances") or {}
    norm_elem: Dict[str, float] = {}
    for ek in ELEMENTAL_RESISTANCE_TYPES:
        val_raw = raw_elem.get(ek)
        if val_raw is None:
            for k, v in raw_elem.items():
                if str(k).upper().replace("Í", "I").replace("É", "E") == ek:
                    val_raw = v
                    break
        val_f = float(val_raw or 0)
        norm_elem[ek] = int(val_f) if val_f.is_integer() else round(val_f, 1)
    char["elementalResistances"] = norm_elem

    if not isinstance(char.get("inventory"), list):
        char["inventory"] = []
    else:
        items_by_id = {it["id"]: it for it in items_catalog if isinstance(it, dict) and "id" in it}
        norm_inv: List[Dict[str, Any]] = []
        for inv_entry in char["inventory"]:
            if not isinstance(inv_entry, dict):
                continue
            item_tpl = items_by_id.get(inv_entry.get("itemId"))
            qty = max(1, int(inv_entry.get("quantity", 1)))
            if item_tpl and item_tpl.get("equipavel", False) and qty > 1:
                for idx in range(qty):
                    split_entry = copy.deepcopy(inv_entry)
                    split_entry["quantity"] = 1
                    if idx > 0:
                        split_entry["id"] = f"inv_{uuid.uuid4().hex[:8]}"
                        split_entry["isEquipped"] = False
                    norm_inv.append(split_entry)
            else:
                inv_copy = copy.deepcopy(inv_entry)
                inv_copy["quantity"] = 1 if (item_tpl and item_tpl.get("equipavel", False)) else qty
                norm_inv.append(inv_copy)
        char["inventory"] = norm_inv

    char["activeBuffs"] = []
    raw_bn = char.get("buffsNerfs")
    if isinstance(raw_bn, list):
        char["buffsNerfs"] = [b for b in raw_bn if isinstance(b, dict)]
    else:
        char["buffsNerfs"] = []

    raw_notes = char.get("notesPages")
    if isinstance(raw_notes, list):
        char["notesPages"] = [p for p in raw_notes if isinstance(p, dict)]
    else:
        char["notesPages"] = []

    if not isinstance(char.get("talents"), list):
        char["talents"] = []

    if not isinstance(char.get("skillTreeProgress"), dict):
        char["skillTreeProgress"] = {}

    derived = compute_character_derived_stats(char, items_catalog, room_settings, skill_trees)
    char["derived"] = derived
    char["maxHp"] = derived["effectiveMaxHp"]
    char["maxArmor"] = derived["effectiveMaxArmor"]
    char["maxMana"] = derived["effectiveMaxMana"]
    char["maxPa"] = derived["effectiveMaxPa"]
    if not char["isEnemy"]:
        char["maxWeight"] = derived.get("effectiveMaxWeight", char["baseMaxWeight"])
    char["regen"] = derived["effectiveRegen"]
    char["defense"] = derived["effectiveDefense"]
    char["attack"] = derived["effectiveAttack"]
    char["arcana"] = derived["effectiveArcana"]
    char["santidade"] = derived["effectiveSantidade"]
    char["resistancePercent"] = derived["effectiveResistancePercent"]
    char["damageReductionPercent"] = derived["effectiveDamageReductionPercent"]

    char["hp"] = max(0, int(char.get("hp", char["maxHp"])))
    char["armor"] = max(0, int(char.get("armor", char["maxArmor"])))
    char["mana"] = max(0, int(char.get("mana", char["maxMana"])))
    char["pa"] = max(0, int(char.get("pa", char["maxPa"])))

    char["isDead"] = bool(char.get("isDead", False)) or char["hp"] == 0
    if char["isDead"]:
        char["hp"] = 0
        char["pa"] = 0

    raw_init = char.get("initial")
    if isinstance(raw_init, dict):
        init_res_raw = raw_init.get("resistances") or {}
        init_res: Dict[str, Dict[str, int]] = {}
        for res_name in STATUS_RESISTANCE_TYPES:
            ir_item = init_res_raw.get(res_name) or norm_res[res_name]
            ir_max = max(0, int(ir_item.get("max", norm_res[res_name]["max"])))
            init_res[res_name] = {"current": 0, "max": ir_max}
        char["initial"] = {
            "hp": max(0, int(raw_init.get("hp", char["baseMaxHp"]))),
            "maxHp": max(1, int(raw_init.get("maxHp", char["baseMaxHp"]))),
            "armor": max(0, int(raw_init.get("armor", char["baseMaxArmor"]))),
            "maxArmor": max(0, int(raw_init.get("maxArmor", char["baseMaxArmor"]))),
            "mana": max(0, int(raw_init.get("mana", char["baseMaxMana"]))),
            "maxMana": max(0, int(raw_init.get("maxMana", char["baseMaxMana"]))),
            "pa": max(0, int(raw_init.get("pa", char["baseMaxPa"]))),
            "maxPa": max(0, int(raw_init.get("maxPa", char["baseMaxPa"]))),
            "regen": raw_init.get("regen", char["baseRegen"]),
            "defense": int(raw_init.get("defense", char["baseDefense"])),
            "attack": int(raw_init.get("attack", char["baseAttack"])),
            "arcana": int(raw_init.get("arcana", char["baseArcana"])),
            "santidade": int(raw_init.get("santidade", char["baseSantidade"])),
            "resistancePercent": float(raw_init.get("resistancePercent", char["baseResistancePercent"])),
            "damageReductionPercent": float(raw_init.get("damageReductionPercent", char["baseDamageReductionPercent"])),
            "maxWeight": raw_init.get("maxWeight", char["maxWeight"]),
            "elementalResistances": copy.deepcopy(norm_elem),
            "resistances": init_res,
        }
    else:
        char["initial"] = {
            "hp": char["baseMaxHp"],
            "maxHp": char["baseMaxHp"],
            "armor": char["baseMaxArmor"],
            "maxArmor": char["baseMaxArmor"],
            "mana": char["baseMaxMana"],
            "maxMana": char["baseMaxMana"],
            "pa": char["baseMaxPa"],
            "maxPa": char["baseMaxPa"],
            "regen": char["baseRegen"],
            "defense": char["baseDefense"],
            "attack": char["baseAttack"],
            "arcana": char["baseArcana"],
            "santidade": char["baseSantidade"],
            "resistancePercent": char["baseResistancePercent"],
            "damageReductionPercent": char["baseDamageReductionPercent"],
            "maxWeight": char["maxWeight"],
            "elementalResistances": copy.deepcopy(norm_elem),
            "resistances": {
                res_name: {"current": 0, "max": norm_res[res_name]["max"]}
                for res_name in STATUS_RESISTANCE_TYPES
            },
        }

    return char


def normalize_members_list(raw_members: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Garante que:
    1. O Host principal seja SEMPRE o único MESTRE com permissões totais.
    2. Membros antigos fictícios (Dan Ray, leetobr, San sem IP) sejam removidos.
    3. Qualquer outro IP conectado seja JOGADOR e exiba o apelido dado pelo Mestre (ou o IP caso sem apelido).
    4. Cada membro possua uma cor permanente de cursor (dentre as 10 cores da paleta).
    """
    host_ip = HOST_NETWORK_INFO["preferred_ip"]
    existing_host: Optional[Dict[str, Any]] = None
    other_members_by_ip: Dict[str, Dict[str, Any]] = {}

    for m in raw_members or []:
        if not isinstance(m, dict):
            continue
        mid = str(m.get("id") or "")
        mip = str(m.get("ip") or "").strip()

        # Ignora membros fictícios legados que não possuem IP real
        if mid in ("member_master", "member_leetobr", "member_san") and not mip:
            continue

        if mid == "host_master" or (mip and is_client_host_master(mip)) or m.get("role") == "MESTRE":
            if existing_host is None:
                existing_host = m
            continue

        if not mip:
            continue

        nickname = str(m.get("nickname") or "").strip()
        # Se o nome foi alterado manualmente pelo mestre, preserva como nickname
        raw_name = str(m.get("name") or "").strip()
        if not nickname and raw_name and not raw_name.startswith("Jogador (") and not raw_name.startswith("IP "):
            nickname = raw_name

        display_name = nickname if nickname else f"Sem apelido ({mip})"
        perms = m.get("permissions")
        raw_preset = perms.get("preset", "JOGADOR_COMUM") if isinstance(perms, dict) else "JOGADOR_COMUM"
        base_perms = default_permissions(raw_preset)
        if isinstance(perms, dict):
            for k, v in perms.items():
                if k in base_perms:
                    if raw_preset == "JOGADOR_COMUM" and k in (
                        "char_create", "char_manage_own", "combat_manage_charges",
                        "inventory_transfer_any", "system_view_audit_log",
                        "canCreateCharacters", "canViewAudit", "combat_apply_damage_others"
                    ):
                        continue
                    base_perms[k] = bool(v) if k != "preset" else v
            base_perms["preset"] = raw_preset
        perms = base_perms

        other_members_by_ip[mip] = {
            "id": f"ip_{mip}",
            "ip": mip,
            "name": display_name,
            "nickname": nickname,
            "title": f"Jogador • IP: {mip}",
            "role": "JOGADOR",
            "avatar": str(m.get("avatar") or "hooded-figure"),
            "characterId": m.get("characterId"),
            "cursorColor": m.get("cursorColor"),
            "online": bool(m.get("online", False)),
            "connectionsCount": int(m.get("connectionsCount", 0)),
            "permissions": perms,
        }

    host_member = build_host_master_member(existing_host)
    used_colors: List[str] = [host_member["cursorColor"]]

    for mip, m_entry in other_members_by_ip.items():
        assigned_color = assign_permanent_cursor_color(
            member_key=f"ip_{mip}",
            existing_color=m_entry.get("cursorColor"),
            used_colors=used_colors,
        )
        m_entry["cursorColor"] = assigned_color
        used_colors.append(assigned_color)

    normalized = [host_member]
    normalized.extend(other_members_by_ip.values())
    return normalized


def detect_max_resistance_toasts(
    old_chars: List[Dict[str, Any]],
    new_chars: List[Dict[str, Any]],
) -> List[str]:
    old_by_id = {c.get("id"): c for c in old_chars if isinstance(c, dict)}
    toasts: List[str] = []
    for new_c in new_chars:
        cid = new_c.get("id")
        old_c = old_by_id.get(cid)
        if not old_c:
            continue
        char_name = new_c.get("name", "Sem nome")
        old_res = old_c.get("resistances") or {}
        new_res = new_c.get("resistances") or {}
        for res_name in STATUS_RESISTANCE_TYPES:
            o_entry = old_res.get(res_name) or {"current": 0, "max": 100}
            n_entry = new_res.get(res_name) or {"current": 0, "max": 100}
            old_cur = int(o_entry.get("current", 0))
            new_cur = int(n_entry.get("current", 0))
            new_max = int(n_entry.get("max", 100))
            if new_max > 0 and new_cur > old_cur and new_cur == new_max:
                res_display = res_name.upper()
                msg = f"{char_name} MAX ACÚMULO: {res_display}!"
                if msg not in toasts:
                    toasts.append(msg)
    return toasts


class StateManager:
    def __init__(self, file_path: Path) -> None:
        self.file_path = file_path
        self.lock = asyncio.Lock()
        self.state: Dict[str, Any] = {}
        self.undo_stack: List[Dict[str, Any]] = []
        self.redo_stack: List[Dict[str, Any]] = []
        self.connected_ips_counts: Dict[str, int] = {}
        self._load_or_initialize()

    def _snapshot_core(self) -> Dict[str, Any]:
        return copy.deepcopy(
            {
                "room": self.state["room"],
                "members": self.state["members"],
                "characters": self.state["characters"],
                "itemsCatalog": self.state["itemsCatalog"],
                "npcs": self.state["npcs"],
                "escrowSales": self.state["escrowSales"],
                "battle": self.state["battle"],
                "quests": self.state["quests"],
                "bestiary": self.state.get("bestiary", []),
                "customPermissionPresets": self.state.get("customPermissionPresets", []),
                "skillTrees": self.state.get("skillTrees", []),
            }
        )

    def _restore_core(self, snap: Dict[str, Any]) -> None:
        for key in ("room", "members", "characters", "itemsCatalog", "npcs", "escrowSales", "battle", "quests", "bestiary", "customPermissionPresets", "skillTrees"):
            if key in snap:
                self.state[key] = copy.deepcopy(snap[key])
        self._recalculate_all()

    def _recalculate_all(self) -> None:
        room = self.state.get("room") or {}
        catalog = self.state.get("itemsCatalog") or []
        skill_trees = self.state.get("skillTrees")
        if not isinstance(skill_trees, list):
            skill_trees = build_default_skill_trees()
            self.state["skillTrees"] = skill_trees
        for it in catalog:
            if not isinstance(it, dict):
                continue
            it["durationTurns"] = None
            for ef in it.get("effects") or []:
                if isinstance(ef, dict):
                    ef["durationTurns"] = None
            if it.get("id") == "item_pocao_furia" and "turnos" in str(it.get("descricao", "")):
                it["descricao"] = "Consumível: regenera +30% de Vida ao usar."
                it["effects"] = [{"targetStat": "REGEN_VIDA", "modifierType": "PERCENT", "value": 30, "durationTurns": None}]
            elif it.get("id") == "item_pocao_mana" and "turnos" in str(it.get("descricao", "")):
                it["descricao"] = "Consumível: regenera +20% de Mana ao usar."
                it["effects"] = [{"targetStat": "REGEN_MANA", "modifierType": "PERCENT", "value": 20, "durationTurns": None}]
        chars = self.state.get("characters") or []
        self.state["characters"] = [normalize_character(c, catalog, room, skill_trees) for c in chars]
        for b in self.state.get("bestiary") or []:
            if isinstance(b, dict):
                raw_elem = b.get("elementalResistances") or {}
                norm_elem: Dict[str, float] = {}
                for ek in ELEMENTAL_RESISTANCE_TYPES:
                    val_raw = raw_elem.get(ek)
                    if val_raw is None:
                        for k, v in raw_elem.items():
                            if str(k).upper().replace("Í", "I").replace("É", "E") == ek:
                                val_raw = v
                                break
                    val_f = float(val_raw or 0)
                    norm_elem[ek] = int(val_f) if val_f.is_integer() else round(val_f, 1)
                b["elementalResistances"] = norm_elem
        self.state["members"] = normalize_members_list(self.state.get("members") or [])
        self._apply_live_connections_to_members()

        battle = self.state.get("battle") or {}
        chars_by_id = {c["id"]: c for c in self.state["characters"]}
        for p in battle.get("participantsOrder") or []:
            if not p.get("isMaster") and p.get("id") in chars_by_id:
                c_obj = chars_by_id[p["id"]]
                p["name"] = c_obj["name"]
                p["isDead"] = bool(c_obj.get("isDead", False))

    def _apply_live_connections_to_members(self) -> None:
        """Sincroniza os IPs conectados no momento com a lista de membros da sala."""
        host_ip = HOST_NETWORK_INFO["preferred_ip"]
        members = self.state.get("members") or []
        by_ip: Dict[str, Dict[str, Any]] = {}
        used_colors: List[str] = []

        for m in members:
            if m.get("id") == "host_master" or m.get("role") == "MESTRE":
                m["ip"] = host_ip
                m["role"] = "MESTRE"
                m["permissions"] = master_full_permissions()
                m["cursorColor"] = assign_permanent_cursor_color("host_master", m.get("cursorColor"))
                used_colors.append(m["cursorColor"])
                by_ip[host_ip] = m
            elif m.get("ip"):
                m["cursorColor"] = assign_permanent_cursor_color(
                    f"ip_{m['ip']}", m.get("cursorColor"), used_colors
                )
                used_colors.append(m["cursorColor"])
                by_ip[m["ip"]] = m

        # Garante que todo IP conectado atualmente exista na lista de membros
        for ip, count in self.connected_ips_counts.items():
            if count <= 0:
                continue
            if is_client_host_master(ip):
                host_entry = by_ip.get(host_ip)
                if host_entry:
                    host_entry["online"] = True
                    host_entry["connectionsCount"] = count
            else:
                if ip not in by_ip:
                    assigned_color = assign_permanent_cursor_color(f"ip_{ip}", None, used_colors)
                    used_colors.append(assigned_color)
                    new_member = {
                        "id": f"ip_{ip}",
                        "ip": ip,
                        "name": f"Sem apelido ({ip})",
                        "nickname": "",
                        "title": f"Jogador • IP: {ip}",
                        "role": "JOGADOR",
                        "avatar": "hooded-figure",
                        "characterId": None,
                        "cursorColor": assigned_color,
                        "online": True,
                        "connectionsCount": count,
                        "permissions": default_permissions("JOGADOR_COMUM"),
                    }
                    members.append(new_member)
                    by_ip[ip] = new_member
                else:
                    by_ip[ip]["online"] = True
                    by_ip[ip]["connectionsCount"] = count

        # Atualiza status online/offline de todos os membros registrados
        for m in members:
            mip = m.get("ip")
            if m.get("id") == "host_master":
                c_count = self.connected_ips_counts.get(host_ip, 0)
            else:
                c_count = self.connected_ips_counts.get(mip, 0)
            m["online"] = c_count > 0
            m["connectionsCount"] = c_count

        self.state["members"] = members

    async def update_live_connections(self, counts_by_ip: Dict[str, int]) -> Dict[str, Any]:
        async with self.lock:
            self.connected_ips_counts = copy.deepcopy(counts_by_ip)
            self._recalculate_all()
            self._save_sync()
            return self.get_sync_payload()

    def _load_or_initialize(self) -> None:
        default_state = build_default_campaign_state()
        if self.file_path.exists():
            try:
                raw_text = self.file_path.read_text(encoding="utf-8").strip()
                if raw_text:
                    loaded = json.loads(raw_text)
                    if isinstance(loaded, dict) and "characters" in loaded:
                        for k, v in default_state.items():
                            if k not in loaded:
                                loaded[k] = copy.deepcopy(v)
                        if not isinstance(loaded.get("skillTrees"), list):
                            loaded["skillTrees"] = copy.deepcopy(default_state["skillTrees"])
                        # Remove menções antigas a "Dan Ray" do log inicial se existirem
                        loaded["auditLog"] = [
                            entry
                            for entry in (loaded.get("auditLog") or [])
                            if "Dan Ray" not in str(entry.get("actorName", ""))
                        ]
                        if not loaded["auditLog"]:
                            loaded["auditLog"] = copy.deepcopy(default_state["auditLog"])
                        self.state = loaded
                        self.undo_stack = (loaded.get("undo_stack") or [])[-HISTORY_LIMIT:]
                        self.redo_stack = (loaded.get("redo_stack") or [])[-HISTORY_LIMIT:]
                        self._recalculate_all()
                        self._save_sync()
                        return
            except Exception as exc:
                print(f"[CMrpg] Aviso ao carregar state.json, usando estado padrão: {exc}")

        self.state = default_state
        self.undo_stack = []
        self.redo_stack = []
        self._recalculate_all()
        self._save_sync()

    def _save_sync(self) -> None:
        self.state["undo_stack"] = self.undo_stack[-HISTORY_LIMIT:]
        self.state["redo_stack"] = self.redo_stack[-HISTORY_LIMIT:]
        tmp_path = self.file_path.with_suffix(".json.tmp")
        tmp_path.write_text(
            json.dumps(self.state, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        tmp_path.replace(self.file_path)

    def add_audit_entry(
        self,
        actor_name: str,
        action_type: str,
        target_entity: str,
        summary: str,
    ) -> None:
        log = self.state.setdefault("auditLog", [])
        entry = {
            "id": f"audit_{uuid.uuid4().hex[:8]}",
            "actorName": actor_name or "Sistema",
            "actionType": action_type,
            "targetEntity": target_entity,
            "summary": summary,
            "createdAt": now_iso(),
        }
        log.insert(0, entry)
        if len(log) > 250:
            self.state["auditLog"] = log[:250]

    def get_sync_payload(self, toasts: Optional[List[str]] = None) -> Dict[str, Any]:
        active_ips = [
            {"ip": ip, "count": cnt, "isHost": is_client_host_master(ip)}
            for ip, cnt in self.connected_ips_counts.items()
            if cnt > 0
        ]
        return {
            "type": "state_sync",
            "room": self.state["room"],
            "members": self.state["members"],
            "characters": self.state["characters"],
            "itemsCatalog": self.state["itemsCatalog"],
            "npcs": self.state["npcs"],
            "escrowSales": self.state["escrowSales"],
            "battle": self.state["battle"],
            "quests": self.state["quests"],
            "bestiary": self.state.get("bestiary", []),
            "customPermissionPresets": self.state.get("customPermissionPresets", []),
            "skillTrees": self.state.get("skillTrees", []),
            "auditLog": self.state["auditLog"],
            "network": {
                **HOST_NETWORK_INFO,
                "connected_ips": active_ips,
            },
            "can_undo": len(self.undo_stack) > 0,
            "can_redo": len(self.redo_stack) > 0,
            "undo_count": len(self.undo_stack),
            "redo_count": len(self.redo_stack),
            "toasts": toasts or [],
        }

    async def update_full_state(
        self,
        data: Dict[str, Any],
        record_history: bool = True,
        client_toasts: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        async with self.lock:
            old_chars = copy.deepcopy(self.state.get("characters") or [])

            if record_history:
                self.undo_stack.append(self._snapshot_core())
                if len(self.undo_stack) > HISTORY_LIMIT:
                    self.undo_stack = self.undo_stack[-HISTORY_LIMIT:]
                self.redo_stack.clear()

            for key in ("room", "members", "characters", "itemsCatalog", "npcs", "escrowSales", "battle", "quests", "bestiary", "customPermissionPresets", "skillTrees"):
                if key in data and data[key] is not None:
                    self.state[key] = data[key]

            if isinstance(data.get("auditEntry"), dict):
                ae = data["auditEntry"]
                self.add_audit_entry(
                    actor_name=str(ae.get("actorName", "Mestre")),
                    action_type=str(ae.get("actionType", "UPDATE")),
                    target_entity=str(ae.get("targetEntity", "")),
                    summary=str(ae.get("summary", "")),
                )

            self._recalculate_all()
            detected_toasts = detect_max_resistance_toasts(old_chars, self.state["characters"])

            merged_toasts: List[str] = []
            for t in (client_toasts or []) + detected_toasts:
                if isinstance(t, str) and t.strip() and t not in merged_toasts:
                    merged_toasts.append(t.strip())

            self._save_sync()
            return self.get_sync_payload(toasts=merged_toasts)

    async def undo(self) -> Optional[Dict[str, Any]]:
        async with self.lock:
            if not self.undo_stack:
                return None
            prev = self.undo_stack.pop()
            self.redo_stack.append(self._snapshot_core())
            if len(self.redo_stack) > HISTORY_LIMIT:
                self.redo_stack = self.redo_stack[-HISTORY_LIMIT:]
            self._restore_core(prev)
            self.add_audit_entry("Mestre", "UNDO", "Campanha", "Desfez a última alteração de estado (Undo).")
            self._save_sync()
            return self.get_sync_payload()

    async def redo(self) -> Optional[Dict[str, Any]]:
        async with self.lock:
            if not self.redo_stack:
                return None
            nxt = self.redo_stack.pop()
            self.undo_stack.append(self._snapshot_core())
            if len(self.undo_stack) > HISTORY_LIMIT:
                self.undo_stack = self.undo_stack[-HISTORY_LIMIT:]
            self._restore_core(nxt)
            self.add_audit_entry("Mestre", "REDO", "Campanha", "Refez a alteração de estado (Redo).")
            self._save_sync()
            return self.get_sync_payload()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[Dict[str, Any]] = []

    async def connect(self, websocket: WebSocket, canonical_ip: str, is_host: bool) -> Dict[str, Any]:
        await websocket.accept()
        conn_entry = {
            "ws": websocket,
            "conn_id": f"conn_{uuid.uuid4().hex[:10]}",
            "client_id": None,
            "ip": canonical_ip,
            "is_host": is_host,
        }
        self.active_connections.append(conn_entry)
        return conn_entry

    def disconnect(self, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        removed: Optional[Dict[str, Any]] = None
        remaining: List[Dict[str, Any]] = []
        for entry in self.active_connections:
            if entry["ws"] is websocket:
                removed = entry
            else:
                remaining.append(entry)
        self.active_connections = remaining
        return removed

    def get_counts_by_ip(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for entry in self.active_connections:
            ip = entry["ip"]
            counts[ip] = counts.get(ip, 0) + 1
        return counts

    async def broadcast(self, base_message: Dict[str, Any]) -> None:
        stale: List[WebSocket] = []
        for entry in list(self.active_connections):
            ws: WebSocket = entry["ws"]
            is_host: bool = entry["is_host"]
            ip: str = entry["ip"]
            try:
                msg = dict(base_message)
                msg["identity"] = {
                    "client_ip": ip,
                    "is_host": is_host,
                    "role": "MESTRE" if is_host else "JOGADOR",
                    "member_id": "host_master" if is_host else f"ip_{ip}",
                }
                await ws.send_json(msg)
            except Exception:
                stale.append(ws)
        for dead in stale:
            self.disconnect(dead)

    async def broadcast_except(self, sender_ws: WebSocket, message: Dict[str, Any]) -> None:
        """Broadcast leve para cursores colaborativos sem gravar em disco e ignorando o próprio remetente."""
        stale: List[WebSocket] = []
        for entry in list(self.active_connections):
            ws: WebSocket = entry["ws"]
            if ws is sender_ws:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for dead in stale:
            self.disconnect(dead)


app = FastAPI(
    title="CMrpg Server",
    description="Sistema de Gestão de RPG Local via Radmin VPN.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state_manager = StateManager(STATE_FILE)
ws_manager = ConnectionManager()


@app.get("/api/whoami")
async def whoami(request: Request) -> JSONResponse:
    raw_ip = request.client.host if request.client else "127.0.0.1"
    is_host = is_client_host_master(raw_ip)
    canonical_ip = get_canonical_member_ip(raw_ip)
    return JSONResponse(
        content={
            "client_ip": canonical_ip,
            "is_host": is_host,
            "default_role": "MESTRE" if is_host else "JOGADOR",
            "member_id": "host_master" if is_host else f"ip_{canonical_ip}",
            "network": HOST_NETWORK_INFO,
        }
    )


@app.get("/api/state")
async def get_state(request: Request) -> JSONResponse:
    raw_ip = request.client.host if request.client else "127.0.0.1"
    is_host = is_client_host_master(raw_ip)
    canonical_ip = get_canonical_member_ip(raw_ip)
    payload = state_manager.get_sync_payload()
    payload["identity"] = {
        "client_ip": canonical_ip,
        "is_host": is_host,
        "role": "MESTRE" if is_host else "JOGADOR",
        "member_id": "host_master" if is_host else f"ip_{canonical_ip}",
    }
    return JSONResponse(content=payload)


@app.post("/api/preview-damage")
async def preview_damage(request: Request) -> JSONResponse:
    body = await request.json()
    attacker = body.get("attacker") or {}
    target = body.get("target") or {}
    is_true = bool(body.get("isTrueDamage", False))
    rounding = state_manager.state["room"].get("roundingMode", "ROUND_DOWN")
    result = evaluate_damage_pipeline(
        attacker=attacker,
        target=target,
        rounding_mode=rounding,
        is_true_damage=is_true,
    )
    return JSONResponse(content=result)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    raw_ip = websocket.client.host if websocket.client else "127.0.0.1"
    is_host = is_client_host_master(raw_ip)
    canonical_ip = get_canonical_member_ip(raw_ip)
    member_id = "host_master" if is_host else f"ip_{canonical_ip}"

    conn_entry = await ws_manager.connect(websocket, canonical_ip=canonical_ip, is_host=is_host)
    conn_id = conn_entry["conn_id"]

    try:
        # Atualiza imediatamente a lista de IPs conectados no momento e faz broadcast para toda a sala
        sync_payload = await state_manager.update_live_connections(ws_manager.get_counts_by_ip())
        await ws_manager.broadcast(sync_payload)

        while True:
            raw_msg = await websocket.receive_text()
            try:
                data = json.loads(raw_msg)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "cursor_move":
                # Broadcast leve em memória para todos os outros jogadores conectados (sem gravar em state.json)
                client_id = str(data.get("clientId") or conn_id).strip()
                conn_entry["client_id"] = client_id

                members_list = state_manager.state.get("members") or []
                member_obj = next(
                    (
                        m
                        for m in members_list
                        if m.get("id") == member_id or m.get("ip") == canonical_ip
                    ),
                    None,
                )

                is_master = bool(
                    is_host
                    or member_id == "host_master"
                    or (member_obj and str(member_obj.get("role") or "").upper() == "MESTRE")
                    or bool(data.get("isMaster"))
                )

                client_color = str(data.get("color") or "").strip()
                if is_master:
                    resolved_color = "RGB_CHROMA"
                elif member_obj is not None:
                    resolved_color = assign_permanent_cursor_color(
                        member_id,
                        member_obj.get("cursorColor") or client_color,
                    )
                else:
                    resolved_color = assign_permanent_cursor_color(member_id, client_color)

                if member_obj is not None:
                    member_obj["cursorColor"] = resolved_color
                    resolved_nick = (
                        str(member_obj.get("nickname") or "").strip()
                        or str(data.get("nickname") or "").strip()
                        or str(member_obj.get("name") or "").strip()
                    )
                else:
                    resolved_nick = str(data.get("nickname") or "").strip() or (
                        "Mestre" if is_master else f"Jogador ({canonical_ip})"
                    )

                cursor_packet = {
                    "type": "cursor_move",
                    "cursorId": client_id,
                    "connId": conn_id,
                    "memberId": member_id,
                    "ip": canonical_ip,
                    "isHost": is_host,
                    "isMaster": is_master,
                    "nickname": resolved_nick,
                    "color": resolved_color,
                    "activeTab": str(data.get("activeTab") or "overview"),
                    "region": str(data.get("region") or "main"),
                    "modalId": str(data.get("modalId") or ""),
                    "relX": float(data.get("relX", 0.5)),
                    "relY": float(data.get("relY", 0.5)),
                    "vw": float(data.get("vw", 0.5)),
                    "vh": float(data.get("vh", 0.5)),
                }
                await ws_manager.broadcast_except(websocket, cursor_packet)

            elif msg_type == "cursor_disconnect":
                client_id = str(data.get("clientId") or conn_entry.get("client_id") or conn_id).strip()
                await ws_manager.broadcast_except(
                    websocket,
                    {
                        "type": "cursor_disconnect",
                        "cursorId": client_id,
                        "connId": conn_id,
                        "memberId": member_id,
                        "ip": canonical_ip,
                    },
                )

            elif msg_type == "get_state":
                payload = await state_manager.update_live_connections(ws_manager.get_counts_by_ip())
                payload["identity"] = {
                    "client_ip": canonical_ip,
                    "is_host": is_host,
                    "role": "MESTRE" if is_host else "JOGADOR",
                    "member_id": member_id,
                }
                await websocket.send_json(payload)

            elif msg_type == "update_state":
                record_history = bool(data.get("record_history", True))
                client_toasts = data.get("toasts") if isinstance(data.get("toasts"), list) else []

                incoming_battle = data.get("battle")
                if isinstance(incoming_battle, dict) and incoming_battle.get("isActive"):
                    old_battle = state_manager.state.get("battle") or {}
                    if (
                        old_battle.get("isActive")
                        and incoming_battle.get("currentTurnIndex") != old_battle.get("currentTurnIndex")
                    ):
                        old_idx = int(old_battle.get("currentTurnIndex", 0))
                        old_order = old_battle.get("orderIds") or []
                        acting_id = old_order[old_idx % len(old_order)] if old_order else None
                        acting_char = next(
                            (c for c in state_manager.state.get("characters") or [] if c.get("id") == acting_id),
                            None,
                        )
                        if not is_host:
                            is_turn_allowed = False
                            if acting_char and not acting_char.get("isEnemy"):
                                if (
                                    acting_char.get("ownerIp") == canonical_ip
                                    or acting_char.get("ownerMemberId") == member_id
                                    or (member_obj and member_obj.get("characterId") == acting_id)
                                ):
                                    is_turn_allowed = True
                            if not is_turn_allowed:
                                incoming_battle["currentTurnIndex"] = old_idx
                                incoming_battle["roundNumber"] = old_battle.get("roundNumber", 1)
                                incoming_battle["charges"] = old_battle.get("charges", 0)

                        if acting_char and (acting_char.get("isEnemy") or acting_char.get("hp", 1) <= 0 or acting_char.get("isDead")):
                            incoming_battle["charges"] = old_battle.get("charges", 0)

                payload = await state_manager.update_full_state(
                    data=data,
                    record_history=record_history,
                    client_toasts=client_toasts,
                )
                await ws_manager.broadcast(payload)

            elif msg_type == "undo":
                payload = await state_manager.undo()
                if payload is not None:
                    await ws_manager.broadcast(payload)
                else:
                    await websocket.send_json(state_manager.get_sync_payload())

            elif msg_type == "redo":
                payload = await state_manager.redo()
                if payload is not None:
                    await ws_manager.broadcast(payload)
                else:
                    await websocket.send_json(state_manager.get_sync_payload())

            elif msg_type == "toast":
                toast_msg = str(data.get("message", "")).strip()
                if toast_msg:
                    await ws_manager.broadcast({"type": "toast", "message": toast_msg})

    except WebSocketDisconnect:
        removed = ws_manager.disconnect(websocket)
        await ws_manager.broadcast_except(
            websocket,
            {
                "type": "cursor_disconnect",
                "cursorId": (removed or {}).get("client_id") or conn_id,
                "connId": conn_id,
                "memberId": member_id,
                "ip": canonical_ip,
            },
        )
        payload = await state_manager.update_live_connections(ws_manager.get_counts_by_ip())
        await ws_manager.broadcast(payload)
    except Exception:
        removed = ws_manager.disconnect(websocket)
        await ws_manager.broadcast_except(
            websocket,
            {
                "type": "cursor_disconnect",
                "cursorId": (removed or {}).get("client_id") or conn_id,
                "connId": conn_id,
                "memberId": member_id,
                "ip": canonical_ip,
            },
        )
        payload = await state_manager.update_live_connections(ws_manager.get_counts_by_ip())
        await ws_manager.broadcast(payload)


@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="root_static")

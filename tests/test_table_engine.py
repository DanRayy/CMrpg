from __future__ import annotations

import copy
import json
from pathlib import Path

from table_engine import (
    DEFAULT_CARD_HEIGHT,
    DEFAULT_CARD_WIDTH,
    DEFAULT_WORLD_HEIGHT,
    DEFAULT_WORLD_WIDTH,
    build_default_table_state,
    can_move_card,
    enter_battle,
    exit_battle,
    get_allowed_region,
    in_region,
    overlaps_any,
    reconcile,
    rects_overlap,
    resolve_move,
)

FIXTURES_PATH = Path(__file__).resolve().parent / "fixtures" / "collision_cases.json"


def _assert_no_pairwise_overlap(positions: dict, sizes: dict) -> None:
    ids = list(positions.keys())
    for i in range(len(ids)):
        id_a = ids[i]
        pa = positions[id_a]
        sa = sizes.get(id_a, {"w": DEFAULT_CARD_WIDTH, "h": DEFAULT_CARD_HEIGHT})
        for j in range(i + 1, len(ids)):
            id_b = ids[j]
            pb = positions[id_b]
            sb = sizes.get(id_b, {"w": DEFAULT_CARD_WIDTH, "h": DEFAULT_CARD_HEIGHT})
            assert not rects_overlap(
                pa["x"], pa["y"], sa["w"], sa["h"],
                pb["x"], pb["y"], sb["w"], sb["h"],
            ), f"Overlap detected between {id_a} ({pa}, {sa}) and {id_b} ({pb}, {sb})"


def test_shared_collision_fixtures() -> None:
    cases = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))
    for case in cases:
        cur = case.get("current")
        cur_tuple = (cur["x"], cur["y"]) if isinstance(cur, dict) else None
        rx, ry = resolve_move(
            desired_x=case["desired"]["x"],
            desired_y=case["desired"]["y"],
            w=case["w"],
            h=case["h"],
            obstacles=case["obstacles"],
            region=case["region"],
            current_pos=cur_tuple,
        )
        assert (rx, ry) == (case["expected"]["x"], case["expected"]["y"]), f"Failed fixture: {case['name']}"
        assert in_region(rx, ry, case["region"]), f"Out of region in fixture: {case['name']}"
        assert not overlaps_any(rx, ry, case["w"], case["h"], case["obstacles"]), f"Overlap in fixture: {case['name']}"


def test_reconcile_auto_places_all_characters_and_preserves_offline() -> None:
    state = {
        "characters": [
            {"id": "char_1", "name": "Heroi 1", "isEnemy": False, "ownerMemberId": "ip_26.1.1.2"},
            {"id": "char_2", "name": "Heroi 2", "isEnemy": False, "ownerMemberId": "ip_26.1.1.3"},
            {"id": "enemy_1", "name": "Lobo (1)", "isEnemy": True, "bestiaryId": "b_lobo"},
        ],
        "members": [
            {"id": "host_master", "role": "MESTRE", "online": True},
            {"id": "ip_26.1.1.2", "role": "JOGADOR", "online": False},  # offline!
            {"id": "ip_26.1.1.3", "role": "JOGADOR", "online": False},  # offline!
        ],
        "battle": {"isActive": False},
    }
    changed = reconcile(state)
    assert changed is True
    tbl = state["table"]
    assert set(tbl["positions"].keys()) == {"char_1", "char_2", "enemy_1"}
    _assert_no_pairwise_overlap(tbl["positions"], tbl["sizes"])

    # Move char_1 to a custom spot; verify offline member does NOT reset or remove char_1
    tbl["positions"]["char_1"] = {"x": 950, "y": 1950}
    reconcile(state)
    assert tbl["positions"]["char_1"] == {"x": 950, "y": 1950}


def test_reconcile_deletion_and_graveyard_undo_recovery() -> None:
    state = {
        "characters": [
            {"id": "char_1", "name": "Heroi 1", "isEnemy": False},
            {"id": "char_2", "name": "Heroi 2", "isEnemy": False},
        ],
        "battle": {"isActive": False},
    }
    reconcile(state)
    state["table"]["positions"]["char_2"] = {"x": 1440, "y": 2020}

    # Delete char_2
    char_2_saved = copy.deepcopy(state["characters"][1])
    state["characters"] = [state["characters"][0]]
    reconcile(state)
    assert "char_2" not in state["table"]["positions"]
    assert "char_2" in state["table"]["graveyard"]

    # Undo restores char_2 -> recovers previous position!
    state["characters"].append(char_2_saved)
    reconcile(state)
    assert state["table"]["positions"]["char_2"] == {"x": 1440, "y": 2020}


def test_battle_transition_preserves_compatible_and_moves_only_incompatible() -> None:
    state = {
        "characters": [
            {"id": "hero_ok", "name": "Hero OK", "isEnemy": False},
            {"id": "hero_wrong", "name": "Hero No Topo", "isEnemy": False},
            {"id": "enemy_ok", "name": "Goblin OK (1)", "isEnemy": True, "bestiaryId": "b1"},
            {"id": "enemy_wrong", "name": "Goblin Embaixo (2)", "isEnemy": True, "bestiaryId": "b1"},
        ],
        "battle": {"isActive": False},
        "table": build_default_table_state(),
    }
    reconcile(state)
    tbl = state["table"]
    # hero_ok already in bottom half (y >= 1500)
    tbl["positions"]["hero_ok"] = {"x": 300, "y": 1800}
    # hero_wrong in top half (y = 200 -> invalid for hero in battle)
    tbl["positions"]["hero_wrong"] = {"x": 900, "y": 200}
    # enemy_ok already in top half (y + 468 <= 1500)
    tbl["positions"]["enemy_ok"] = {"x": 300, "y": 200}
    # enemy_wrong in bottom half (y = 1900 -> invalid for enemy in battle)
    tbl["positions"]["enemy_wrong"] = {"x": 1500, "y": 1900}

    enter_battle(tbl, state["characters"])
    assert tbl["battle"]["active"] is True

    # Compatible cards must NOT have moved at all
    assert tbl["positions"]["hero_ok"] == {"x": 300, "y": 1800}
    assert tbl["positions"]["enemy_ok"] == {"x": 300, "y": 200}

    # Incompatible cards moved into their respective valid regions while preserving X when free
    hw = tbl["positions"]["hero_wrong"]
    ew = tbl["positions"]["enemy_wrong"]
    assert hw["x"] == 900
    assert hw["y"] >= 1500
    assert ew["x"] == 1500
    assert ew["y"] + DEFAULT_CARD_HEIGHT <= 1500

    _assert_no_pairwise_overlap(tbl["positions"], tbl["sizes"])

    # Exit battle keeps current battle positions and does not delete enemies
    pos_before_exit = copy.deepcopy(tbl["positions"])
    exit_battle(tbl)
    assert tbl["battle"]["active"] is False
    assert tbl["positions"] == pos_before_exit


def test_permissions_master_vs_players() -> None:
    members = [
        {"id": "host_master", "ip": "26.1.1.1", "role": "MESTRE"},
        {"id": "ip_26.2.2.2", "ip": "26.2.2.2", "role": "JOGADOR", "characterId": "char_p1"},
        {"id": "ip_26.3.3.3", "ip": "26.3.3.3", "role": "JOGADOR", "characterId": "char_p2"},
    ]
    char_p1 = {"id": "char_p1", "isEnemy": False, "ownerMemberId": "ip_26.2.2.2", "ownerIp": "26.2.2.2"}
    char_p2 = {"id": "char_p2", "isEnemy": False, "ownerMemberId": "ip_26.3.3.3", "ownerIp": "26.3.3.3"}
    char_master = {"id": "char_m", "isEnemy": False, "ownerMemberId": "host_master", "ownerIp": "26.1.1.1"}
    enemy = {"id": "char_enemy_1", "isEnemy": True, "bestiaryId": "b_1", "ownerMemberId": "host_master"}

    master_id = {"is_host": True, "member_id": "host_master", "client_ip": "26.1.1.1", "role": "MESTRE"}
    p1_id = {"is_host": False, "member_id": "ip_26.2.2.2", "client_ip": "26.2.2.2", "role": "JOGADOR"}
    p2_id = {"is_host": False, "member_id": "ip_26.3.3.3", "client_ip": "26.3.3.3", "role": "JOGADOR"}

    # Master can move EVERYTHING (own, players' characters, enemies)
    assert can_move_card(char_p1, master_id, members) is True
    assert can_move_card(char_p2, master_id, members) is True
    assert can_move_card(char_master, master_id, members) is True
    assert can_move_card(enemy, master_id, members) is True

    # Universal permission on Mesa: any player can move any character card and any enemy card
    assert can_move_card(char_p1, p1_id, members) is True
    assert can_move_card(char_p2, p1_id, members) is True
    assert can_move_card(char_master, p1_id, members) is True
    assert can_move_card(enemy, p1_id, members) is True

    # Player 2 can also move any player card and any enemy card
    assert can_move_card(char_p2, p2_id, members) is True
    assert can_move_card(char_p1, p2_id, members) is True
    assert can_move_card(char_master, p2_id, members) is True
    assert can_move_card(enemy, p2_id, members) is True


def test_region_helpers() -> None:
    r_free = get_allowed_region(DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT, 420, 468, battle_active=False)
    assert r_free == {"min_x": 0, "max_x": 4380, "min_y": 0, "max_y": 2532}

    r_enemy = get_allowed_region(DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT, 420, 468, battle_active=True, battle_split=1500, is_enemy=True)
    assert r_enemy == {"min_x": 0, "max_x": 4380, "min_y": 0, "max_y": 1032}

    r_hero = get_allowed_region(DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT, 420, 468, battle_active=True, battle_split=1500, is_enemy=False)
    assert r_hero == {"min_x": 0, "max_x": 4380, "min_y": 1500, "max_y": 2532}


def test_multiple_enemy_instances_from_same_bestiary_are_independent() -> None:
    state = {
        "characters": [
            {"id": "enemy_inst_1", "name": "Lobo (1)", "isEnemy": True, "bestiaryId": "bestiary_lobo", "hp": 90},
            {"id": "enemy_inst_2", "name": "Lobo (2)", "isEnemy": True, "bestiaryId": "bestiary_lobo", "hp": 45},
        ],
        "bestiary": [
            {"id": "bestiary_lobo", "name": "Lobo Cinzento", "maxHp": 90},
        ],
        "battle": {"isActive": False},
    }
    reconcile(state)
    pos = state["table"]["positions"]
    assert "enemy_inst_1" in pos and "enemy_inst_2" in pos
    assert pos["enemy_inst_1"] != pos["enemy_inst_2"]
    _assert_no_pairwise_overlap(pos, state["table"]["sizes"])

    # Remove only instance 1
    state["characters"] = [state["characters"][1]]
    reconcile(state)
    assert "enemy_inst_1" not in state["table"]["positions"]
    assert "enemy_inst_2" in state["table"]["positions"]
    assert state["bestiary"][0]["id"] == "bestiary_lobo"


def test_crowded_board_and_battle_transition_no_overlaps() -> None:
    chars = []
    for i in range(18):
        chars.append({"id": f"hero_{i}", "name": f"Hero {i}", "isEnemy": False})
    for i in range(18):
        chars.append({"id": f"enemy_{i}", "name": f"Enemy {i}", "isEnemy": True, "bestiaryId": "b1"})

    state = {"characters": chars, "battle": {"isActive": False}}
    reconcile(state)
    tbl = state["table"]
    assert len(tbl["positions"]) == 36
    _assert_no_pairwise_overlap(tbl["positions"], tbl["sizes"])

    # Scramble some heroes into top half and enemies into bottom half, then trigger battle
    for i in range(6):
        tbl["positions"][f"hero_{i}"]["y"] = 150
        tbl["positions"][f"enemy_{i}"]["y"] = 2100

    state["battle"]["isActive"] = True
    reconcile(state)
    assert tbl["battle"]["active"] is True
    for c in chars:
        cid = c["id"]
        p = tbl["positions"][cid]
        sz = tbl["sizes"][cid]
        if c["isEnemy"]:
            assert 0 <= p["y"] <= 1500 - sz["h"]
        else:
            assert 1500 <= p["y"] <= DEFAULT_WORLD_HEIGHT - sz["h"]
    _assert_no_pairwise_overlap(tbl["positions"], tbl["sizes"])


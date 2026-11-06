from __future__ import annotations

import copy
import json
from pathlib import Path

from fastapi.testclient import TestClient

import main
from table_engine import rects_overlap


def _setup_isolated_state(tmp_path: Path) -> Path:
    state_path = tmp_path / "test_state.json"
    sm = main.StateManager(state_path)
    # Prepare 2 player characters + 1 enemy
    sm.state["members"].extend(
        [
            {
                "id": "ip_26.99.88.77",
                "ip": "26.99.88.77",
                "name": "Jogador Um",
                "nickname": "Jogador1",
                "role": "JOGADOR",
                "characterId": "char_default_1",
                "permissions": main.default_permissions("JOGADOR_COMUM"),
            },
            {
                "id": "ip_26.99.88.78",
                "ip": "26.99.88.78",
                "name": "Jogador Dois",
                "nickname": "Jogador2",
                "role": "JOGADOR",
                "characterId": "char_default_2",
                "permissions": main.default_permissions("JOGADOR_COMUM"),
            },
        ]
    )
    for c in sm.state["characters"]:
        if c["id"] == "char_default_1":
            c["ownerMemberId"] = "ip_26.99.88.77"
            c["ownerIp"] = "26.99.88.77"
        elif c["id"] == "char_default_2":
            c["ownerMemberId"] = "ip_26.99.88.78"
            c["ownerIp"] = "26.99.88.78"

    sm.state["characters"].append(
        {
            "id": "char_enemy_test_1",
            "name": "Guardião de Cinzas (1)",
            "isEnemy": True,
            "bestiaryId": "bestiary_guardiao_cinzas",
            "ownerMemberId": "host_master",
            "ownerIp": "127.0.0.1",
            "level": 3,
            "baseMaxHp": 220,
            "maxHp": 220,
            "hp": 220,
        }
    )
    sm._recalculate_all()
    sm._save_sync()
    main.state_manager = sm
    main.ws_manager = main.ConnectionManager()
    return state_path


def _drain_until_type(ws, expected_type: str, max_msgs: int = 6) -> dict:
    for _ in range(max_msgs):
        msg = ws.receive_json()
        if msg.get("type") == expected_type:
            return msg
    raise AssertionError(f"Did not receive {expected_type}")


def test_legacy_state_migration_and_backup(tmp_path: Path) -> None:
    legacy_path = tmp_path / "legacy_state.json"
    default_data = main.build_default_campaign_state()
    default_data.pop("table", None)
    legacy_path.write_text(json.dumps(default_data, ensure_ascii=False), encoding="utf-8")

    sm = main.StateManager(legacy_path)
    bak_path = tmp_path / "legacy_state.json.pre-1.11.0.bak"
    assert bak_path.exists(), "Pre-1.11.0 backup file must be created on migration"
    assert "table" in sm.state
    assert set(sm.state["table"]["positions"].keys()) == {"char_default_1", "char_default_2"}


def test_persistence_across_restart_and_individual_views(tmp_path: Path) -> None:
    state_path = _setup_isolated_state(tmp_path)

    client_master = TestClient(main.app, client=("127.0.0.1", 51000))
    client_p1 = TestClient(main.app, client=("26.99.88.77", 51001))

    with client_master.websocket_connect("/ws") as ws_m, client_p1.websocket_connect("/ws") as ws_p1:
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")

        # Save distinct camera views for Master and Player 1
        ws_m.send_json({"type": "table_view", "x": -240, "y": -180, "zoom": 0.65})
        ack_m = _drain_until_type(ws_m, "table_view_saved")
        assert ack_m["view"] == {"x": -240.0, "y": -180.0, "zoom": 0.65}

        ws_p1.send_json({"type": "table_view", "x": -800, "y": -1200, "zoom": 1.15})
        ack_p1 = _drain_until_type(ws_p1, "table_view_saved")
        assert ack_p1["view"] == {"x": -800.0, "y": -1200.0, "zoom": 1.15}

        # Player 1 moves char_default_1
        ws_p1.send_json({"type": "table_move", "charId": "char_default_1", "x": 1100, "y": 2100})
        upd = _drain_until_type(ws_m, "table_update")
        assert upd["charId"] == "char_default_1"
        assert upd["position"] == {"x": 1100, "y": 2100}

    # Flush and simulate full server restart by instantiating a new StateManager from disk
    main.state_manager._save_sync()
    reloaded = main.StateManager(state_path)
    assert reloaded.state["table"]["positions"]["char_default_1"] == {"x": 1100, "y": 2100}
    assert reloaded.get_member_table_view("host_master") == {"x": -240.0, "y": -180.0, "zoom": 0.65}
    assert reloaded.get_member_table_view("ip_26.99.88.77") == {"x": -800.0, "y": -1200.0, "zoom": 1.15}
    # Player 1 disconnected, but char_default_1 is still on the table at the same spot!
    assert "char_default_1" in reloaded.state["table"]["positions"]


def test_multiplayer_permissions_and_concurrent_collisions(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)

    client_master = TestClient(main.app, client=("127.0.0.1", 52000))
    client_p1 = TestClient(main.app, client=("26.99.88.77", 52001))
    client_p2 = TestClient(main.app, client=("26.99.88.78", 52002))

    with (
        client_master.websocket_connect("/ws") as ws_m,
        client_p1.websocket_connect("/ws") as ws_p1,
        client_p2.websocket_connect("/ws") as ws_p2,
    ):
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")
        _drain_until_type(ws_p1, "state_sync")
        _drain_until_type(ws_p2, "state_sync")

        # 1. Player 1 tries to move Player 2's character -> FORBIDDEN
        orig_p2_pos = copy.deepcopy(main.state_manager.state["table"]["positions"]["char_default_2"])
        ws_p1.send_json({"type": "table_move", "charId": "char_default_2", "x": 2200, "y": 2200})
        rej1 = _drain_until_type(ws_p1, "table_move_rejected")
        assert rej1["reason"] == "forbidden"
        assert main.state_manager.state["table"]["positions"]["char_default_2"] == orig_p2_pos

        # 2. Player 1 tries to move Enemy -> FORBIDDEN
        orig_enemy_pos = copy.deepcopy(main.state_manager.state["table"]["positions"]["char_enemy_test_1"])
        ws_p1.send_json({"type": "table_move", "charId": "char_enemy_test_1", "x": 900, "y": 400})
        rej2 = _drain_until_type(ws_p1, "table_move_rejected")
        assert rej2["reason"] == "forbidden"
        assert main.state_manager.state["table"]["positions"]["char_enemy_test_1"] == orig_enemy_pos

        # 3. Master CAN move Player 2's character AND Enemy
        ws_m.send_json({"type": "table_move", "charId": "char_default_2", "x": 1800, "y": 1900})
        upd_m1 = _drain_until_type(ws_m, "table_update")
        assert upd_m1["charId"] == "char_default_2"
        assert upd_m1["position"] == {"x": 1800, "y": 1900}

        ws_m.send_json({"type": "table_move", "charId": "char_enemy_test_1", "x": 900, "y": 300})
        upd_m2 = _drain_until_type(ws_m, "table_update")
        assert upd_m2["charId"] == "char_enemy_test_1"
        assert upd_m2["position"] == {"x": 900, "y": 300}

        # 4. Concurrent moves to the exact same destination (2500, 1900):
        # Player 1 moves char_default_1 to (2500, 1900) and Player 2 moves char_default_2 to (2500, 1900)
        ws_p1.send_json({"type": "table_move", "charId": "char_default_1", "x": 2500, "y": 1900})
        ws_p2.send_json({"type": "table_move", "charId": "char_default_2", "x": 2500, "y": 1900})

        _drain_until_type(ws_m, "table_update")
        _drain_until_type(ws_m, "table_update")

        pos_1 = main.state_manager.state["table"]["positions"]["char_default_1"]
        pos_2 = main.state_manager.state["table"]["positions"]["char_default_2"]
        sz_1 = main.state_manager.state["table"]["sizes"]["char_default_1"]
        sz_2 = main.state_manager.state["table"]["sizes"]["char_default_2"]

        assert pos_1 == {"x": 2500, "y": 1900}
        assert pos_2 != {"x": 2500, "y": 1900}
        assert not rects_overlap(
            pos_1["x"], pos_1["y"], sz_1["w"], sz_1["h"],
            pos_2["x"], pos_2["y"], sz_2["w"], sz_2["h"],
        ), "Concurrent moves must never result in overlapping cards on the server"


def test_battle_activation_guards_and_region_enforcement(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)

    client_master = TestClient(main.app, client=("127.0.0.1", 53000))
    client_p1 = TestClient(main.app, client=("26.99.88.77", 53001))

    with client_master.websocket_connect("/ws") as ws_m, client_p1.websocket_connect("/ws") as ws_p1:
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")

        # Player 1 tries to activate battle or delete enemy via update_state -> blocked by server guard!
        forged_battle = copy.deepcopy(main.state_manager.state["battle"])
        forged_battle["isActive"] = True
        forged_chars = [c for c in main.state_manager.state["characters"] if not c.get("isEnemy")]
        ws_p1.send_json({"type": "update_state", "battle": forged_battle, "characters": forged_chars})
        sync_after_forged = _drain_until_type(ws_m, "state_sync")
        assert sync_after_forged["battle"]["isActive"] is False
        assert any(c.get("id") == "char_enemy_test_1" for c in sync_after_forged["characters"])

        # Master activates battle -> allowed, table enters battle mode
        master_battle = copy.deepcopy(main.state_manager.state["battle"])
        master_battle["isActive"] = True
        ws_m.send_json({"type": "update_state", "battle": master_battle})
        sync_battle = _drain_until_type(ws_m, "state_sync")
        assert sync_battle["table"]["battle"]["active"] is True

        # Player 1 tries to drag char_default_1 into the top enemy zone (y = 200) -> clamped to >= 1500
        ws_p1.send_json({"type": "table_move", "charId": "char_default_1", "x": 600, "y": 200})
        upd_hero = _drain_until_type(ws_m, "table_update")
        assert upd_hero["position"]["y"] >= 1500

        # Master tries to drag enemy into bottom player zone (y = 2200) -> clamped to top zone (y + h <= 1500)
        ws_m.send_json({"type": "table_move", "charId": "char_enemy_test_1", "x": 600, "y": 2200})
        upd_enemy = _drain_until_type(ws_m, "table_update")
        enemy_h = main.state_manager.state["table"]["sizes"]["char_enemy_test_1"]["h"]
        assert upd_enemy["position"]["y"] + enemy_h <= 1500

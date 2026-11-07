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

        # 1. Universal drag permission: Player 1 CAN move Player 2's character
        ws_p1.send_json({
            "type": "REMOTE_CARD_DRAG",
            "cardId": "char_default_2",
            "x": 2180,
            "y": 2180,
            "user": "Jogador Um",
        })
        drag_preview = _drain_until_type(ws_m, "REMOTE_CARD_DRAG")
        assert drag_preview["cardId"] == "char_default_2"
        assert drag_preview["user"] == "Jogador Um"
        assert drag_preview["x"] == 2180
        assert drag_preview["y"] == 2180

        ws_p1.send_json({"type": "REMOTE_CARD_DROP", "cardId": "char_default_2", "x": 2200, "y": 2200})
        upd_p1_move = _drain_until_type(ws_m, "table_update")
        assert upd_p1_move["charId"] == "char_default_2"
        assert upd_p1_move["position"] == {"x": 2200, "y": 2200}
        assert main.state_manager.state["table"]["positions"]["char_default_2"] == {"x": 2200, "y": 2200}

        # 2. Universal enemy movement on Mesa: Player 1 CAN also move Enemy
        ws_p1.send_json({"type": "table_move", "charId": "char_enemy_test_1", "x": 900, "y": 400})
        upd_enemy_p1 = _drain_until_type(ws_m, "table_update")
        assert upd_enemy_p1["charId"] == "char_enemy_test_1"
        assert upd_enemy_p1["position"] == {"x": 900, "y": 400}
        assert main.state_manager.state["table"]["positions"]["char_enemy_test_1"] == {"x": 900, "y": 400}

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


def test_undo_redo_restores_deleted_character_position_on_mesa(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client_master = TestClient(main.app, client=("127.0.0.1", 53010))

    with client_master.websocket_connect("/ws") as ws_m:
        _drain_until_type(ws_m, "state_sync")

        # Move char_default_1 to a custom position (1850, 2100)
        ws_m.send_json({"type": "table_move", "charId": "char_default_1", "x": 1850, "y": 2100})
        upd = _drain_until_type(ws_m, "table_update")
        assert upd["position"] == {"x": 1850, "y": 2100}

        # Delete char_default_1 with record_history=True
        remaining_chars = [c for c in main.state_manager.state["characters"] if c.get("id") != "char_default_1"]
        ws_m.send_json({
            "type": "update_state",
            "characters": remaining_chars,
            "record_history": True,
        })
        sync_after_del = _drain_until_type(ws_m, "state_sync")
        assert "char_default_1" not in sync_after_del["table"]["positions"]

        # Undo deletion -> char_default_1 must return at its exact previous position (1850, 2100)
        ws_m.send_json({"type": "undo"})
        sync_after_undo = _drain_until_type(ws_m, "state_sync")
        assert sync_after_undo["table"]["positions"].get("char_default_1") == {"x": 1850, "y": 2100}


def test_static_assets_and_mesa_markup(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53020))

    resp_html = client.get("/")
    assert resp_html.status_code == 200
    html = resp_html.text
    assert 'data-nav-tab="mesa"' in html
    assert 'data-nav-tab="characters"' in html
    assert 'id="tab-mesa"' in html
    assert 'id="tab-characters"' in html
    assert 'id="characters-grid"' in html
    assert 'id="modal-image-viewer"' in html
    assert 'id="mesa-viewport"' in html
    assert 'id="mesa-world"' in html
    assert 'id="mesa-tokens-layer"' in html
    assert 'js/05b-mesa-board.js' in html

    for asset in [
        "/styles.css",
        "/js/01-core-state.js",
        "/js/02-websocket-combat.js",
        "/js/03-tabs-renderers.js",
        "/js/04-modals-character-buffs.js",
        "/js/05-modals-notes-inventory-bestiary.js",
        "/js/05b-mesa-board.js",
        "/js/06-events-init.js",
    ]:
        r = client.get(asset)
        assert r.status_code == 200, f"Asset {asset} returned {r.status_code}"


def test_upload_image_and_compact_card_collision(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53030))

    # Minimal 1x1 PNG bytes
    png_1x1 = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    created_files = []
    try:
        # 1. Upload Character image (multipart)
        r_char = client.post(
            "/api/upload-image",
            data={"category": "personagens"},
            files={"file": ("cropped.png", png_1x1, "image/png")},
        )
        assert r_char.status_code == 200
        url_char = r_char.json()["url"]
        assert url_char.startswith("/static/img/fichas/personagens/char_")
        assert url_char.endswith(".png")
        disk_char = main.BASE_DIR / url_char.lstrip("/")
        assert disk_char.exists()
        created_files.append(disk_char)

        # 2. Upload Bestiary Enemy image (multipart)
        r_enemy = client.post(
            "/api/upload-image",
            data={"category": "inimigos"},
            files={"file": ("enemy.png", png_1x1, "image/png")},
        )
        assert r_enemy.status_code == 200
        url_enemy = r_enemy.json()["url"]
        disk_enemy = main.BASE_DIR / url_enemy.lstrip("/")
        created_files.append(disk_enemy)
        assert url_enemy.startswith("/static/img/fichas/inimigos/char_")
        assert disk_enemy.exists()

        # 3. Upload Catalog Item image (ARMA -> static/img/itens/armas/)
        r_item = client.post(
            "/api/upload-image",
            data={"category": "itens", "itemType": "ARMA"},
            files={"file": ("sword.png", png_1x1, "image/png")},
        )
        assert r_item.status_code == 200
        url_item = r_item.json()["url"]
        assert url_item.startswith("/static/img/itens/armas/item_")
        disk_item = main.BASE_DIR / url_item.lstrip("/")
        assert disk_item.exists()
        created_files.append(disk_item)

        # 4. Compact Mode 72x96 collision test on Mesa:
        # Place two compact cards at x=100, y=500 and x=180, y=500 (distance 80px > 72px width!)
        with client.websocket_connect("/ws") as ws_m:
            _drain_until_type(ws_m, "state_sync")
            chars = copy.deepcopy(main.state_manager.state["characters"])
            for c in chars:
                if c["id"] in ("char_default_1", "char_default_2"):
                    c["mesaCompact"] = True
                    c["isCompact"] = True
                    c["image"] = url_char
            ws_m.send_json({"type": "update_state", "characters": chars})
            sync_compact = _drain_until_type(ws_m, "state_sync")
            assert sync_compact["table"]["sizes"]["char_default_1"] == {"w": 72, "h": 96}
            assert sync_compact["table"]["sizes"]["char_default_2"] == {"w": 72, "h": 96}

            ws_m.send_json({"type": "table_move", "charId": "char_default_1", "x": 100, "y": 2200})
            upd1 = _drain_until_type(ws_m, "table_update")
            assert upd1["position"] == {"x": 100, "y": 2200}

            # Second compact card placed 80px to the right (x=180, y=2200) must NOT collide with first compact card!
            ws_m.send_json({"type": "table_move", "charId": "char_default_2", "x": 180, "y": 2200})
            upd2 = _drain_until_type(ws_m, "table_update")
            assert upd2["position"] == {"x": 180, "y": 2200}
    finally:
        for f in created_files:
            if f.exists():
                f.unlink()


def test_decoupled_mesa_compact_state_and_cards_rendering(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53040))

    with client.websocket_connect("/ws") as ws:
        _drain_until_type(ws, "state_sync")
        chars = copy.deepcopy(main.state_manager.state["characters"])
        for c in chars:
            if c["id"] == "char_default_1":
                c["mesaCompact"] = True
                c["isCompact"] = False
            elif c["id"] == "char_default_2":
                c["mesaCompact"] = False
                c["isCompact"] = True
        ws.send_json({"type": "update_state", "characters": chars})
        sync = _drain_until_type(ws, "state_sync")

        # Mesa table sizes must be strictly governed by mesaCompact:
        assert sync["table"]["sizes"]["char_default_1"] == {"w": 72, "h": 96}
        assert sync["table"]["sizes"]["char_default_2"] == {"w": 420, "h": 468}

        # Static asset query string must be v1.13.1
        resp = client.get("/")
        assert "js/01-core-state.js?v=1.13.1" in resp.text
        assert "js/03-tabs-renderers.js?v=1.13.1" in resp.text

        # Verify 03-tabs-renderers.js restricts compact mode exclusively to Mesa:
        js_resp = client.get("/js/03-tabs-renderers.js")
        assert "const forMesa = Boolean(opts && opts.forMesa);" in js_resp.text
        assert "const isCompact = forMesa &&" in js_resp.text
        assert "${forMesa ? `" in js_resp.text
        assert "<!-- Rodapé Inferior: Botão Modo Compacto (Exclusivo da Mesa) -->" in js_resp.text



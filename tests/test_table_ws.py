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

        # Static asset query string must be v1.16.5
        resp = client.get("/")
        assert "js/01-core-state.js?v=1.16.5" in resp.text
        assert "js/03-tabs-renderers.js?v=1.16.5" in resp.text

        # Verify 03-tabs-renderers.js restricts compact mode exclusively to Mesa:
        js_resp = client.get("/js/03-tabs-renderers.js")
        assert "const forMesa = Boolean(opts && opts.forMesa);" in js_resp.text
        assert "const isCompact = forMesa &&" in js_resp.text
        assert "${forMesa ? `" in js_resp.text
        assert "<!-- Rodapé Inferior: Botão Modo Compacto (Exclusivo da Mesa) -->" in js_resp.text


def test_v1_13_2_features(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53040))

    # 1. Manual quality selector removed from index.html
    resp = client.get("/")
    assert resp.status_code == 200
    assert 'id="select-mesa-render-quality"' not in resp.text
    assert 'bg-[#0c0a08]' not in resp.text
    assert 'id="char-avatar-url"' in resp.text
    assert 'id="enemy-avatar-url"' in resp.text
    assert 'id="cat-item-avatar-url"' in resp.text

    # 2. Upload image with both cropped token and original full-res artwork
    fake_cropped = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    fake_orig = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02\x00\x00\x00\x02\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

    files = [
        ("file", ("token.png", fake_cropped, "image/png")),
        ("original_file", ("full_art.png", fake_orig, "image/png")),
    ]
    data = {"category": "personagens"}
    up_resp = client.post("/api/upload-image", data=data, files=files)
    assert up_resp.status_code == 200
    res_json = up_resp.json()
    assert "_token.png" in res_json["avatarUrl"]
    assert "_orig.png" in res_json["originalUrl"]
    assert res_json["url"] == res_json["avatarUrl"]

    # 3. State normalization preserves avatar and image
    with client.websocket_connect("/ws") as ws:
        _drain_until_type(ws, "state_sync")
        chars = copy.deepcopy(main.state_manager.state["characters"])
        chars[0]["image"] = res_json["originalUrl"]
        chars[0]["avatar"] = res_json["avatarUrl"]
        ws.send_json({"type": "update_state", "characters": chars})
        sync = _drain_until_type(ws, "state_sync")
        c0 = next(c for c in sync["characters"] if c["id"] == chars[0]["id"])
        assert c0["image"] == res_json["originalUrl"]
        assert c0["avatar"] == res_json["avatarUrl"]

    # 4. Custom dropdown component exists in js and css and opens upward (bottom: calc(100% + 4px))
    css_resp = client.get("/styles.css")
    assert ".fantasy-dropdown-wrapper" in css_resp.text
    assert ".fantasy-dropdown-menu" in css_resp.text
    assert "bottom: calc(100% + 4px)" in css_resp.text
    assert "#12100d" in css_resp.text
    assert "#241f18" in css_resp.text

    core_js = client.get("/js/01-core-state.js")
    assert "renderCustomModifierDropdownHtml" in core_js.text

    # Limpeza dos arquivos de teste gerados
    for key in ("avatarUrl", "originalUrl"):
        u = res_json.get(key)
        if u and u.startswith("/static/"):
            p = main.STATIC_DIR / u.replace("/static/", "")
            if p.exists():
                p.unlink()


def test_v1_13_4_turn_start_charges_and_enemy_guards(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client_master = TestClient(main.app, client=("127.0.0.1", 53020))
    client_p1 = TestClient(main.app, client=("26.88.77.66", 53021))

    # 1. HTML badge tooltip verification
    resp_html = client_master.get("/")
    assert 'title="Cargas de Combate (+1 automático no início do turno de cada jogador)"' in resp_html.text

    # 2. JS rules verification in static/js/02-websocket-combat.js
    resp_js = client_master.get("/js/02-websocket-combat.js")
    assert "+1 Carga de Batalha gerada no início do turno de ${actingChar.name}" in resp_js.text
    assert "Cargas NÃO são concedidas ao finalizar o turno" in resp_js.text

    with client_master.websocket_connect("/ws") as ws_m, client_p1.websocket_connect("/ws") as ws_p1:
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")

        # Cenário A: Iniciar combate com JOGADOR primeiro na fila -> charges inicia em 1
        start_battle_player_first = copy.deepcopy(main.state_manager.state["battle"])
        start_battle_player_first["isActive"] = True
        start_battle_player_first["orderIds"] = ["char_default_1", "char_enemy_test_1"]
        start_battle_player_first["currentTurnIndex"] = 0
        start_battle_player_first["charges"] = 1
        ws_m.send_json({"type": "update_state", "battle": start_battle_player_first})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["isActive"] is True
        assert sync["battle"]["charges"] == 1

        # Avançar turno para INIMIGO (index 1) -> Inimigo NÃO gera carga, mantém 1
        advance_to_enemy = copy.deepcopy(sync["battle"])
        advance_to_enemy["currentTurnIndex"] = 1
        advance_to_enemy["charges"] = 1
        ws_m.send_json({"type": "update_state", "battle": advance_to_enemy})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["currentTurnIndex"] == 1
        assert sync["battle"]["charges"] == 1

        # Se alguém tentar forjar aumento de cargas no turno de inimigo, servidor barra
        forged_enemy_charge = copy.deepcopy(sync["battle"])
        forged_enemy_charge["currentTurnIndex"] = 1
        forged_enemy_charge["charges"] = 99
        ws_p1.send_json({"type": "update_state", "battle": forged_enemy_charge})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["charges"] == 1

        # Avançar turno do INIMIGO para o JOGADOR (index 0 / rodada 2) -> Jogador ganha +1 no início do turno (Total: 2)
        advance_to_player = copy.deepcopy(sync["battle"])
        advance_to_player["currentTurnIndex"] = 0
        advance_to_player["roundNumber"] = 2
        advance_to_player["charges"] = 2
        ws_m.send_json({"type": "update_state", "battle": advance_to_player})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["currentTurnIndex"] == 0
        assert sync["battle"]["roundNumber"] == 2
        assert sync["battle"]["charges"] == 2

        # Resetar combate
        end_battle = copy.deepcopy(sync["battle"])
        end_battle["isActive"] = False
        end_battle["charges"] = 0
        ws_m.send_json({"type": "update_state", "battle": end_battle})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["isActive"] is False
        assert sync["battle"]["charges"] == 0

        # Cenário B: Iniciar combate com INIMIGO primeiro na fila -> charges inicia em 0
        start_battle_enemy_first = copy.deepcopy(sync["battle"])
        start_battle_enemy_first["isActive"] = True
        start_battle_enemy_first["orderIds"] = ["char_enemy_test_1", "char_default_1"]
        start_battle_enemy_first["currentTurnIndex"] = 0
        start_battle_enemy_first["charges"] = 0
        ws_m.send_json({"type": "update_state", "battle": start_battle_enemy_first})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["isActive"] is True
        assert sync["battle"]["charges"] == 0

        # Avançar do INIMIGO para o JOGADOR -> Jogador recebe sua primeira carga no início do turno (+1)
        first_player_turn = copy.deepcopy(sync["battle"])
        first_player_turn["currentTurnIndex"] = 1
        first_player_turn["charges"] = 1
        ws_m.send_json({"type": "update_state", "battle": first_player_turn})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["currentTurnIndex"] == 1
        assert sync["battle"]["charges"] == 1


def test_v1_13_5_navigation_presence_and_render_stability(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53030))

    # 1. HTML and assets checks
    resp_html = client.get("/")
    assert 'styles.css?v=1.16.5' in resp_html.text
    assert 'js/02-websocket-combat.js?v=1.16.5' in resp_html.text
    assert 'js/05b-mesa-board.js?v=1.16.5' in resp_html.text

    # 2. CSS Subpixel stabilization & GPU layer rules
    resp_css = client.get("/styles.css")
    assert "transform-style: preserve-3d" in resp_css.text
    assert "backface-visibility: hidden" in resp_css.text
    assert "transform: translate3d(0, 0, 0)" in resp_css.text
    assert "-webkit-transform-style: preserve-3d" in resp_css.text
    assert "-webkit-backface-visibility: hidden" in resp_css.text
    assert ".tabletop-container" in resp_css.text
    assert ".mesa-viewport" in resp_css.text

    # 3. JS zoom debounce (150ms) and no cyclic reflow loop
    resp_mesa_js = client.get("/js/05b-mesa-board.js")
    assert "debounce de 150ms" in resp_mesa_js.text
    assert "void worldEl.offsetHeight" not in resp_mesa_js.text

    # 4. JS Tab navigation and presence
    resp_combat_js = client.get("/js/02-websocket-combat.js")
    assert "bcSec.textContent = 'FICHAS'" in resp_combat_js.text
    assert "bcSec.textContent = 'MESA'" in resp_combat_js.text
    assert "location: state.activeTab === 'characters' ? 'fichas' : state.activeTab" in resp_combat_js.text
    assert "const normalizedTab = (rawTab === 'fichas' || rawTab === 'characters') ? 'characters' : (rawTab || 'overview')" in resp_combat_js.text

    # 5. WebSocket cursor_move retains fichas/characters and does not force-convert to mesa
    client_m = TestClient(main.app, client=("127.0.0.1", 53031))
    client_p = TestClient(main.app, client=("26.77.66.55", 53032))
    with client_m.websocket_connect("/ws") as ws_m, client_p.websocket_connect("/ws") as ws_p:
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p, "state_sync")

        # Player moves cursor while on Fichas tab
        ws_p.send_json({
            "type": "cursor_move",
            "clientId": "client_fichas_test",
            "activeTab": "characters",
            "currentTab": "fichas",
            "location": "fichas",
            "relX": 0.5,
            "relY": 0.5,
        })
        msg = _drain_until_type(ws_m, "cursor_move")
        assert msg["activeTab"] == "characters"
        # Must not be converted to mesa on broadcast
        assert msg["activeTab"] != "mesa"


def test_cross_tab_flicker_and_sidebar_stability():
    client = TestClient(main.app)

    # 1. Sidebar containment & cursor styles
    resp_css = client.get("/styles.css")
    assert "contain: layout style" in resp_css.text
    assert "transition: transform 40ms linear" not in resp_css.text

    # 2. WebSocket cursor throttling & presence diffing
    resp_combat_js = client.get("/js/02-websocket-combat.js")
    assert "container.dataset.renderedSig === sig" in resp_combat_js.text
    assert "if (navPresenceChanged)" in resp_combat_js.text
    assert "if (!isSameTab || !isFresh)" in resp_combat_js.text

    # 3. Mesa drag/sync isolation from non-mesa tabs
    resp_mesa_js = client.get("/js/05b-mesa-board.js")
    assert "if (state.activeTab !== 'mesa') return;" in resp_mesa_js.text
    assert "renderCharactersTab" not in resp_mesa_js.text

    # 4. Fichas tab DOM signature caching
    resp_tabs_js = client.get("/js/03-tabs-renderers.js")
    assert "grid.dataset.renderedSig === sig" in resp_tabs_js.text

    # 5. LERP 60 FPS Interpolation engine on Mesa tokens and remote cursors
    assert "stepMesaInterpolations" in resp_mesa_js.text
    assert "startMesaInterpolation" in resp_mesa_js.text
    assert "requestAnimationFrame(stepMesaInterpolations)" in resp_mesa_js.text
    assert "stepRemoteCursorsInterpolations" in resp_combat_js.text
    assert "startRemoteCursorsInterpolation" in resp_combat_js.text
    assert "requestAnimationFrame(stepRemoteCursorsInterpolations)" in resp_combat_js.text
    assert ".mesa-token-remote-dragging" in resp_css.text
    assert "transition: transform 0.08s" not in resp_css.text


def test_realtime_buffs_and_debuffs_sync_without_reload(tmp_path: Path):
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53045))

    # 1. Verifica no código JS que a assinatura de renderização da aba Fichas inclui buffs/nerfs e atributos derivados
    resp_tabs_js = client.get("/js/03-tabs-renderers.js")
    assert "buildCharSignature" in resp_tabs_js.text
    assert "bnSig" in resp_tabs_js.text
    assert "resSig" in resp_tabs_js.text
    assert "elemSig" in resp_tabs_js.text
    assert "c.defense" in resp_tabs_js.text
    assert "data-buffs-sig=" in resp_tabs_js.text
    assert "modal-buffs-nerfs" in resp_tabs_js.text

    # 2. Verifica que a remoção e alteração de buffs atualizam o modal e limpam o formulário
    resp_buffs_js = client.get("/js/04-modals-character-buffs.js")
    assert "removeBuffNerf" in resp_buffs_js.text
    assert "resetBnForm" in resp_buffs_js.text
    assert "renderBuffsNerfsModalContent" in resp_buffs_js.text

    # 3. Testa ciclo WebSocket em tempo real para adição e sincronização de Buff com bônus de DEFESA
    with client.websocket_connect("/ws") as ws:
        init_data = _drain_until_type(ws, "state_sync")
        characters = init_data.get("characters") or []
        assert len(characters) > 0
        char = characters[0]
        char_id = char["id"]
        base_def = char.get("defense", 0)

        # Adiciona um Buff com +10 de Defesa
        buff = {
            "id": "bn_test_def_bonus",
            "type": "BUFF",
            "name": "Escudo Astral",
            "description": "+10 Defesa",
            "duration": 3,
            "isPermanent": False,
            "enabled": True,
            "modifiers": [{"targetStat": "DEFESA", "modifierType": "FLAT", "value": 10}],
            "source": "Teste Unitário",
        }
        char.setdefault("buffsNerfs", []).append(buff)

        ws.send_json({
            "type": "update_state",
            "characters": characters,
            "record_history": True,
        })

        sync_data = _drain_until_type(ws, "state_sync")
        updated_chars = sync_data.get("characters") or []
        updated_char = next((c for c in updated_chars if c["id"] == char_id), None)
        assert updated_char is not None
        assert len(updated_char.get("buffsNerfs", [])) >= 1
        assert updated_char["defense"] == base_def + 10


def test_v1_13_8_all_32_permissions_and_skill_tree_category(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client_master = TestClient(main.app, client=("127.0.0.1", 53060))
    client_p1 = TestClient(main.app, client=("26.139.248.121", 53061))

    all_32_keys = [
        # Cat 1: Personagens & Fichas (7)
        "char_manage_own",
        "char_view_others",
        "char_create",
        "char_edit_others",
        "char_delete",
        "char_reorder",
        "char_grant_xp",
        # Cat 2: Combate, Turnos & Acúmulos (7)
        "combat_advance_own_turn",
        "combat_manage_battle",
        "combat_edit_order",
        "combat_advance_any_turn",
        "combat_manage_charges",
        "combat_apply_damage_others",
        "combat_manage_accumulations_others",
        # Cat 3: Itens, Inventário & Ouro (5)
        "inventory_view_others",
        "inventory_transfer_any",
        "inventory_edit_others",
        "item_manage_catalog",
        "gold_manage",
        # Cat 4: Loja, Mercadores & Escrow (3)
        "shop_buy_sell",
        "shop_manage_npcs",
        "shop_approve_escrow",
        # Cat 5: Bestiário & Invocação (4)
        "bestiary_view_revealed",
        "bestiary_view_hidden",
        "bestiary_manage",
        "bestiary_summon",
        # Cat 6: Missões & Sistema (5)
        "mission_accept",
        "mission_manage",
        "mission_approve",
        "system_undo_redo",
        "system_view_audit_log",
        # Cat 7: Árvore de Habilidades (1)
        "manageSkillTrees",
    ]
    assert len(all_32_keys) == 32

    # 1. Verify presets in main.py have all 32 keys and expected counts
    p_comum = main.default_permissions("JOGADOR_COMUM")
    p_sub = main.default_permissions("SUB_MESTRE")
    p_esp = main.default_permissions("ESPECTADOR")
    p_mestre = main.master_full_permissions()

    for k in all_32_keys:
        assert k in p_comum, f"Missing {k} in JOGADOR_COMUM"
        assert k in p_sub, f"Missing {k} in SUB_MESTRE"
        assert k in p_esp, f"Missing {k} in ESPECTADOR"
        assert p_mestre.get(k) is True, f"Master must have {k}=True"

    assert sum(1 for k in all_32_keys if p_comum[k]) == 12
    assert p_comum["manageSkillTrees"] is False
    assert p_sub["manageSkillTrees"] is True
    assert p_esp["manageSkillTrees"] is False

    # 2. Verify JS & HTML definitions for 7th category and non-truncated cards
    core_js = client_master.get("/js/01-core-state.js").text
    assert "id: 'skill_trees'" in core_js
    assert "title: 'Árvore de Habilidades'" in core_js
    assert "icon: 'game-icons:tree-branch'" in core_js
    assert "key: 'manageSkillTrees'" in core_js
    assert "Gerenciar Árvores de Habilidades (Controle Total)" in core_js
    assert "function canManageSkillTrees()" in core_js

    modals_js = client_master.get("/js/05-modals-notes-inventory-bestiary.js").text
    assert "break-words" in modals_js
    assert "line-clamp-2" in modals_js

    index_html = client_master.get("/").text
    assert 'id="modal-member"' in index_html
    assert "max-w-2xl" in index_html

    # 3. Verify normalize_members_list respects all 32 individual boolean toggles
    all_false_perms = {"preset": "JOGADOR_COMUM", **{k: False for k in all_32_keys}}
    norm_false = main.normalize_members_list([{"id": "ip_26.1.1.1", "ip": "26.1.1.1", "permissions": all_false_perms}])
    player_norm_f = next(m for m in norm_false if m["ip"] == "26.1.1.1")
    for k in all_32_keys:
        assert player_norm_f["permissions"][k] is False, f"{k} was not preserved as False"

    all_true_perms = {"preset": "PERSONALIZADO", **{k: True for k in all_32_keys}}
    norm_true = main.normalize_members_list([{"id": "ip_26.1.1.1", "ip": "26.1.1.1", "permissions": all_true_perms}])
    player_norm_t = next(m for m in norm_true if m["ip"] == "26.1.1.1")
    for k in all_32_keys:
        assert player_norm_t["permissions"][k] is True, f"{k} was not preserved as True"

    # 4. WebSocket end-to-end test: player blocked from skillTrees until manageSkillTrees is granted
    with client_master.websocket_connect("/ws") as ws_m, client_p1.websocket_connect("/ws") as ws_p1:
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")

        # Player 1 (default JOGADOR_COMUM, manageSkillTrees=False) tries to create a skill tree -> blocked!
        forged_tree = {
            "id": "tree_p1_test",
            "name": "Piromancia",
            "description": "Árvore criada por jogador",
            "hiddenForPlayers": False,
            "completionDescription": "+10 Ataque",
            "completionEffects": [{"targetStat": "ATAQUE", "modifierType": "FLAT", "value": 10}],
            "nodes": [],
        }
        ws_p1.send_json({"type": "update_state", "skillTrees": [forged_tree]})
        sync_blocked = _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")
        assert len(sync_blocked.get("skillTrees") or []) == 0

        # Master grants manageSkillTrees=True to Player 1's IP (26.139.248.121) and saves a custom preset
        members = copy.deepcopy(sync_blocked["members"])
        p1_mem = next(m for m in members if m.get("ip") == "26.139.248.121")
        p1_mem["nickname"] = "Nikiri Izune"
        p1_mem["permissions"]["manageSkillTrees"] = True
        p1_mem["permissions"]["preset"] = "preset_arquiteto"
        custom_presets = [
            {
                "id": "preset_arquiteto",
                "name": "Arquiteto de Árvores",
                "permissions": copy.deepcopy(p1_mem["permissions"]),
            }
        ]
        ws_m.send_json({
            "type": "update_state",
            "members": members,
            "customPermissionPresets": custom_presets,
        })
        _drain_until_type(ws_m, "state_sync")
        sync_granted = _drain_until_type(ws_p1, "state_sync")
        p1_synced = next(m for m in sync_granted["members"] if m.get("ip") == "26.139.248.121")
        assert p1_synced["permissions"]["manageSkillTrees"] is True
        assert p1_synced["permissions"]["skill_tree_manage"] is True
        assert len(sync_granted.get("customPermissionPresets") or []) == 1

        # Now Player 1 creates/edits a Skill Tree -> allowed and broadcast to everyone!
        ws_p1.send_json({"type": "update_state", "skillTrees": [forged_tree]})
        sync_created = _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")
        assert len(sync_created.get("skillTrees") or []) == 1
        assert sync_created["skillTrees"][0]["name"] == "Piromancia"

        # Master revokes manageSkillTrees=False -> Player 1 is immediately blocked from deleting the tree
        members_revoked = copy.deepcopy(sync_created["members"])
        p1_rev = next(m for m in members_revoked if m.get("ip") == "26.139.248.121")
        p1_rev["permissions"]["manageSkillTrees"] = False
        p1_rev["permissions"]["skill_tree_manage"] = False
        ws_m.send_json({"type": "update_state", "members": members_revoked})
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")

        ws_p1.send_json({"type": "update_state", "skillTrees": []})
        sync_after_revoke = _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")
        assert len(sync_after_revoke.get("skillTrees") or []) == 1


def test_v1_14_0_radial_skill_tree_modal_4_quadrants_and_core(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53070))

    # 1. Verify HTML structure for radial modal (#modal-skill-tree)
    html = client.get("/").text
    assert 'id="st-tree-dd-trigger"' in html
    assert 'id="st-tree-dd-label"' in html
    assert 'id="btn-st-modal-refund-tree"' in html
    assert 'id="skill-tree-modal-wrap"' in html
    assert 'id="st-inspector"' in html
    assert 'id="st-tooltip"' in html

    # 2. Verify CSS matte palette and radial 4-quadrant classes
    css = client.get("/styles.css").text
    for cls in [
        ".sk-shell",
        ".sk-dd-trigger",
        ".sk-dd-menu",
        ".sk-stage",
        ".sk-quad-passiva",
        ".sk-quad-talento",
        ".sk-quad-ativa",
        ".sk-quad-suprema",
        ".sk-core-medallion",
        ".sk-ring-progress",
        ".sk-core-effect",
        ".sk-inspector",
        ".sk-tooltip",
        "#131b24",
        "#1f1a12",
        "#1b1424",
        "#241315",
    ]:
        assert cls in css, f"Missing {cls} in styles.css"

    # 3. Verify JS radial rendering & inspection functions in 04-modals-character-buffs.js
    js_04 = client.get("/js/04-modals-character-buffs.js").text
    for fn in [
        "SK_QUADRANTS",
        "skRenderQuadrantHtml",
        "skRenderCoreHtml",
        "skRenderInspectorHtml",
        "positionSkillInspector",
        "layoutSkillTreeConnectors",
        "handleRefundWholeSkillTree",
    ]:
        assert fn in js_04, f"Missing {fn} in 04-modals-character-buffs.js"


def test_v1_15_0_charges_classes_subclasses_and_races(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53090))

    # 1. Verify HTML & JS fields for Cargas on Supremas, Classes/Subclasses, and Races/Sub-races
    html = client.get("/").text
    for elem_id in [
        'id="sn-charges-field-wrap"',
        'id="sn-form-charges"',
        'id="char-race-select"',
        'id="char-subrace-select"',
        'id="char-class-select"',
        'id="char-subclass-select"',
        'id="char-subclass-lock-hint"',
        'id="st-form-is-subclass"',
        'id="modal-race-form"',
        'id="host-progression-subtabs"',
    ]:
        assert elem_id in html, f"Missing {elem_id} in index.html"

    # 2. Verify the 5 default seeded races in state_sync and their modifiers / bonusSkillPoints
    with client.websocket_connect("/ws") as ws:
        init_sync = _drain_until_type(ws, "state_sync")
        races = init_sync.get("races") or []
        race_ids = {r["id"] for r in races}
        assert {"race_dragao", "race_humano", "race_elfo", "race_orc", "race_xituiara"}.issubset(race_ids)

        # Create a Base Class, two Subclasses (Level 15+), a Skill Tree with SUPREMA charges, and a Sub-race
        classes_payload = [
            {
                "id": "class_guerreiro",
                "name": "Guerreiro",
                "description": "Combatente de linha de frente.",
                "isSubclass": False,
                "completionDescription": "+20 Vida Máxima e +5 Ataque imediatos.",
                "completionEffects": [
                    {"targetStat": "VIDA", "modifierType": "FLAT", "value": 20},
                    {"targetStat": "ATAQUE", "modifierType": "FLAT", "value": 5},
                ],
                "nodes": [
                    {
                        "id": "node_cls_passiva_1",
                        "category": "PASSIVA",
                        "name": "Postura de Ferro",
                        "unlockCost": 2,
                        "effects": [{"targetStat": "DEFESA", "modifierType": "FLAT", "value": 4}],
                    },
                    {
                        "id": "node_cls_suprema_1",
                        "category": "SUPREMA",
                        "name": "Fúria Titânica",
                        "unlockCost": 4,
                        "charges": "2 cargas",
                        "effects": [],
                    },
                ],
            },
            {
                "id": "subclass_paladino",
                "name": "Paladino",
                "description": "Subclasse sagrada (Nível 15+).",
                "isSubclass": True,
                "completionDescription": "+15 Santidade imediata.",
                "completionEffects": [
                    {"targetStat": "SANTIDADE", "modifierType": "FLAT", "value": 15},
                ],
                "nodes": [
                    {
                        "id": "node_sub_passiva_1",
                        "category": "PASSIVA",
                        "name": "Aura Sagrada",
                        "unlockCost": 3,
                        "effects": [{"targetStat": "ARMADURA", "modifierType": "FLAT", "value": 30}],
                    },
                    {
                        "id": "node_sub_passiva_2",
                        "category": "PASSIVA",
                        "name": "Bastião Divino",
                        "unlockCost": 3,
                        "effects": [{"targetStat": "DEFESA", "modifierType": "FLAT", "value": 6}],
                    },
                ],
            },
        ]

        trees_payload = [
            {
                "id": "tree_teste_passivas",
                "name": "Mestre de Armas",
                "completionEffects": [
                    {"targetStat": "ATAQUE", "modifierType": "FLAT", "value": 50},
                ],
                "nodes": [
                    {
                        "id": "node_tree_passiva_1",
                        "category": "PASSIVA",
                        "name": "Lâmina Afiada",
                        "unlockCost": 2,
                        "effects": [{"targetStat": "ATAQUE", "modifierType": "FLAT", "value": 3}],
                    },
                    {
                        "id": "node_tree_passiva_2",
                        "category": "PASSIVA",
                        "name": "Contra-Ataque",
                        "unlockCost": 2,
                        "effects": [{"targetStat": "ATAQUE", "modifierType": "FLAT", "value": 3}],
                    },
                ],
            }
        ]

        # Test Humano (+8 bonusSkillPoints) + Base Class immediate effect (without 100% of nodes) + Level < 15 Subclass lock
        chars = copy.deepcopy(init_sync["characters"])
        c1 = chars[0]
        c1["level"] = 10
        c1["skillPoints"] = 0
        c1["appliedRaceBonusPoints"] = 0
        c1["raceId"] = "race_humano"
        c1["classId"] = "class_guerreiro"
        c1["subclassId"] = "subclass_paladino"  # Level 10 (< 15), so Subclass effect must NOT apply yet!
        c1["baseMaxHp"] = 100
        c1["baseAttack"] = 10
        c1["baseSantidade"] = 0

        # Test Dragão (+1 FORCA, +5 MANA, +8% RES_FISICO) on c2 at Level 15 (Subclass unlocked!)
        c2 = chars[1]
        c2["level"] = 15
        c2["raceId"] = "race_dragao"
        c2["classId"] = "class_guerreiro"
        c2["subclassId"] = "subclass_paladino"
        c2["baseMaxMana"] = 100
        c2["baseSantidade"] = 5
        c2["attributes"]["FORCA"] = 10
        c2["elementalResistances"]["FISICO"] = 10
        # Enable 4 passives across Class + Subclass + Skill Tree -> unified 3/3 limit must cap active passives at 3!
        c2["skillTreeProgress"] = {
            "node_cls_passiva_1": {"unlocked": True, "upgrades": 0, "enabled": True},
            "node_sub_passiva_1": {"unlocked": True, "upgrades": 0, "enabled": True},
            "node_sub_passiva_2": {"unlocked": True, "upgrades": 0, "enabled": True},
            "node_tree_passiva_1": {"unlocked": True, "upgrades": 0, "enabled": True},
        }

        ws.send_json(
            {
                "type": "update_state",
                "classes": classes_payload,
                "skillTrees": trees_payload,
                "characters": chars,
            }
        )
        sync = _drain_until_type(ws, "state_sync")

        # Verify charges preserved on SUPREMA node
        synced_cls = next(c for c in sync["classes"] if c["id"] == "class_guerreiro")
        sup_node = next(n for n in synced_cls["nodes"] if n["id"] == "node_cls_suprema_1")
        assert sup_node["charges"] == "2 cargas"

        # Verify c1 (Humano, Level 10, Guerreiro):
        # - Granted +8 skillPoints from Humano
        # - Base Class Guerreiro effect (+20 HP, +5 Attack) applied immediately even with 0% nodes unlocked
        # - Subclass Paladino (+15 Santidade) NOT applied because level 10 < 15
        sc1 = next(c for c in sync["characters"] if c["id"] == c1["id"])
        assert sc1["skillPoints"] == 8
        assert sc1["appliedRaceBonusPoints"] == 8
        assert sc1["maxHp"] == 120
        assert sc1["attack"] == 15
        assert sc1["santidade"] == 0

        # Verify c2 (Dragão, Level 15, Guerreiro + Paladino):
        # - Dragão: FORCA 10 -> 11, MANA 100 -> 105, RES_FISICO 10 -> 18
        # - Subclass Paladino (+15 Santidade) active at Level 15: Santidade 5 -> 20
        # - Unified 3/3 active passives limit enforced across Class + Subclass + Skill Tree
        sc2 = next(c for c in sync["characters"] if c["id"] == c2["id"])
        assert sc2["derived"]["effectiveAttributes"]["FORCA"]["effective"] == 11
        assert sc2["maxMana"] == 105
        assert sc2["derived"]["effectiveElementalResistances"]["FISICO"] == 18
        assert sc2["santidade"] == 20
        assert sc2["skillTreeProgress"]["node_tree_passiva_1"]["enabled"] is False


def test_enemy_multiple_turns_per_round(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client_master = TestClient(main.app, client=("127.0.0.1", 53040))
    client_p1 = TestClient(main.app, client=("26.1.1.2", 53041))

    # 1. HTML validation: Form enemy has turns-input, Form character does not
    resp_html = client_master.get("/")
    assert 'id="enemy-turns-input"' in resp_html.text
    assert 'Turnos / Rodada' in resp_html.text
    # Ensure modal-char-form does NOT have turnsPerRound or enemy-turns-input
    assert 'id="form-character"' in resp_html.text
    char_form_section = resp_html.text.split('id="form-character"')[1].split('</form>')[0]
    assert 'enemy-turns-input' not in char_form_section
    assert 'Turnos / Rodada' not in char_form_section

    with client_master.websocket_connect("/ws") as ws_m, client_p1.websocket_connect("/ws") as ws_p1:
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_m, "state_sync")
        _drain_until_type(ws_p1, "state_sync")

        # 2. Add an enemy with 2 turns per round to bestiary
        new_boss = {
            "id": "bestiary_boss_hydra",
            "name": "Hidra Anfíbia",
            "level": 5,
            "turnsPerRound": 2,
            "maxHp": 300,
            "maxArmor": 50,
            "maxMana": 100,
            "regen": 15,
            "defense": 10,
            "attack": 22,
            "arcana": 0,
            "santidade": 0,
            "reveladoParaJogadores": True,
            "generalSkills": "Ataque Múltiplo de Cabeças",
            "attributes": {"FORCA": 18, "DESTREZA": 12, "INTELIGENCIA": 8, "SABEDORIA": 10, "LABIA": 4},
            "resistances": {
                "congelamento": {"current": 0, "max": 100},
                "choque": {"current": 0, "max": 100},
                "sangramento": {"current": 0, "max": 100},
                "chamas": {"current": 0, "max": 50},
                "veneno": {"current": 0, "max": 150},
                "atordoamento": {"current": 0, "max": 100},
                "cegueira": {"current": 0, "max": 100},
            },
            "elementalResistances": {"FISICO": 10, "MAGICO": 0, "PYRO": -20, "CRYO": 10, "ELETRICO": 0, "PROFANO": 0, "SACRO": 0},
        }

        updated_bestiary = list(main.state_manager.state.get("bestiary", [])) + [new_boss]
        ws_m.send_json({"type": "update_state", "bestiary": updated_bestiary})
        sync = _drain_until_type(ws_m, "state_sync")
        saved_boss = next(b for b in sync["bestiary"] if b["id"] == "bestiary_boss_hydra")
        assert saved_boss["turnsPerRound"] == 2

        # 3. Spawn enemy instance on table
        boss_inst = {
            "id": "char_enemy_hydra_1",
            "name": "Hidra Anfíbia (1)",
            "isEnemy": True,
            "bestiaryId": "bestiary_boss_hydra",
            "turnsPerRound": 2,
            "level": 5,
            "maxHp": 300,
            "hp": 300,
            "baseMaxHp": 300,
            "maxArmor": 50,
            "armor": 50,
            "baseMaxArmor": 50,
            "maxMana": 100,
            "mana": 100,
            "baseMaxMana": 100,
            "defense": 10,
            "attack": 22,
            "regen": 15,
            "reveladoParaJogadores": True,
            "ownerMemberId": "host_master",
            "ownerIp": "127.0.0.1",
            "isDead": False,
            "inventory": [],
            "attributes": {"FORCA": 18, "DESTREZA": 12, "INTELIGENCIA": 8, "SABEDORIA": 10, "LABIA": 4},
        }
        chars = list(main.state_manager.state.get("characters", [])) + [boss_inst]
        ws_m.send_json({"type": "update_state", "characters": chars})
        sync = _drain_until_type(ws_m, "state_sync")
        synced_enemy = next(c for c in sync["characters"] if c["id"] == "char_enemy_hydra_1")
        assert synced_enemy["isEnemy"] is True
        assert synced_enemy["turnsPerRound"] == 2

        # Regular player character must NOT have turnsPerRound
        player_char = next(c for c in sync["characters"] if c["id"] == "char_default_1")
        assert player_char.get("isEnemy") is not True
        assert "turnsPerRound" not in player_char

        # 4. Combat with Multi-Turn Enemy:
        # Queue: Hero ("char_default_1") -> Boss Turn 1 ("char_enemy_hydra_1") -> Boss Turn 2 ("char_enemy_hydra_1")
        battle_state = copy.deepcopy(main.state_manager.state["battle"])
        battle_state["isActive"] = True
        battle_state["orderIds"] = ["char_default_1", "char_enemy_hydra_1", "char_enemy_hydra_1"]
        battle_state["currentTurnIndex"] = 0
        battle_state["charges"] = 1
        ws_m.send_json({"type": "update_state", "battle": battle_state})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["isActive"] is True
        assert sync["battle"]["charges"] == 1
        assert sync["battle"]["currentTurnIndex"] == 0

        # Advance to Boss Turn 1 (index 1) -> Enemy turn: charges remain 1 (no charge generated by enemy)
        adv1 = copy.deepcopy(sync["battle"])
        adv1["currentTurnIndex"] = 1
        adv1["charges"] = 1
        ws_m.send_json({"type": "update_state", "battle": adv1})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["currentTurnIndex"] == 1
        assert sync["battle"]["charges"] == 1

        # Advance to Boss Turn 2 (index 2) -> Enemy turn: charges remain 1
        adv2 = copy.deepcopy(sync["battle"])
        adv2["currentTurnIndex"] = 2
        adv2["charges"] = 1
        ws_m.send_json({"type": "update_state", "battle": adv2})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["currentTurnIndex"] == 2
        assert sync["battle"]["charges"] == 1

        # Advance to Hero (index 0, Round 2) -> Player turn generates +1 charge (Total: 2)
        adv3 = copy.deepcopy(sync["battle"])
        adv3["currentTurnIndex"] = 0
        adv3["roundNumber"] = 2
        adv3["charges"] = 2
        ws_m.send_json({"type": "update_state", "battle": adv3})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["currentTurnIndex"] == 0
        assert sync["battle"]["roundNumber"] == 2
        assert sync["battle"]["charges"] == 2

        # Reset battle
        end_b = copy.deepcopy(sync["battle"])
        end_b["isActive"] = False
        end_b["charges"] = 0
        ws_m.send_json({"type": "update_state", "battle": end_b})
        sync = _drain_until_type(ws_m, "state_sync")
        assert sync["battle"]["isActive"] is False


def test_audio_files_presence() -> None:
    sound_dir = Path("static") / "sounds"
    assert sound_dir.is_dir()
    expected_files = ["buy_item.mp3", "equip_item.mp3", "move_item_to_player.mp3", "ui_hover_sound.mp3"]
    for fname in expected_files:
        fpath = sound_dir / fname
        assert fpath.is_file(), f"Arquivo de áudio {fname} não encontrado em {sound_dir}"
        assert fpath.stat().st_size > 1000, f"Arquivo de áudio {fname} está vazio ou corrompido"


def test_subclass_inheritance_mechanics() -> None:
    from rules_engine import compute_character_derived_stats

    # Setup base classes: Guerreiro (base) with 2 completionEffects and Mago (other base) with 2 completionEffects and 1 passive node
    cls_guerreiro = {
        "id": "cls_guerreiro",
        "name": "Guerreiro",
        "isClassEntity": True,
        "isSubclass": False,
        "completionEffects": [
            {"targetStat": "FORCA", "modifierType": "FLAT", "value": 4},
            {"targetStat": "DEFESA", "modifierType": "FLAT", "value": 10},
        ],
        "nodes": [],
    }
    cls_mago = {
        "id": "cls_mago",
        "name": "Mago",
        "isClassEntity": True,
        "isSubclass": False,
        "completionEffects": [
            {"targetStat": "INTELIGENCIA", "modifierType": "FLAT", "value": 6},
            {"targetStat": "MANA", "modifierType": "PERCENT", "value": 25},
        ],
        "nodes": [
            {
                "id": "node_mago_arcana",
                "name": "Fluxo Etéreo",
                "category": "PASSIVA",
                "unlockCost": 2,
                "effects": [{"targetStat": "ARCANA", "modifierType": "FLAT", "value": 8}],
            }
        ],
    }
    cls_gladiador_sub = {
        "id": "cls_gladiador_sub",
        "name": "Gladiador",
        "isClassEntity": True,
        "isSubclass": True,
        "completionEffects": [
            {"targetStat": "ATAQUE", "modifierType": "FLAT", "value": 5},
        ],
        "nodes": [],
    }

    classes_catalog = [cls_guerreiro, cls_mago, cls_gladiador_sub]

    # Level 15 character with Guerreiro base and Gladiador subclass
    char = {
        "id": "char_dan",
        "name": "Dan",
        "level": 15,
        "classId": "cls_guerreiro",
        "subclassId": "cls_gladiador_sub",
        "attributes": {"FORCA": 10, "DESTREZA": 10, "INTELIGENCIA": 10, "SABEDORIA": 10, "LABIA": 10},
        "inventory": [],
        "skillPoints": 5,
        "skillTreeProgress": {},
    }

    # 1. Base test: normal stats without inheritance
    d1 = compute_character_derived_stats(char, [], {}, classes_catalog=classes_catalog)
    eff_for = d1["effectiveAttributes"]["FORCA"]["effective"]
    eff_int = d1["effectiveAttributes"]["INTELIGENCIA"]["effective"]
    assert eff_for == 14  # 10 base + 4 Guerreiro
    assert eff_int == 10  # 10 base, sem bônus de INT

    # 2. Swap base effect 0 (FORCA +4) with Mago's effect 0 (INTELIGENCIA +6)
    char["subclassInheritance"] = {
        "otherClassId": "cls_mago",
        "replacedEffectIndex": 0,
        "inheritedEffect": {"targetStat": "INTELIGENCIA", "modifierType": "FLAT", "value": 6},
        "inheritedNodeId": "node_mago_arcana",
    }
    # Unlock and activate inherited passive node
    char["skillTreeProgress"]["node_mago_arcana"] = {"unlocked": True, "enabled": True}

    d2 = compute_character_derived_stats(char, [], {}, classes_catalog=classes_catalog)
    # FORCA lost +4 (back to 10), INT gained +6 (10 + 6 = 16)
    assert d2["effectiveAttributes"]["FORCA"]["effective"] == 10
    assert d2["effectiveAttributes"]["INTELIGENCIA"]["effective"] == 16
    # Inherited passive node granted +8 ARCANA
    assert d2.get("effectiveArcana") == 8

    # 3. Reset inheritance (remove subclass / reset inheritance):
    del char["subclassInheritance"]
    del char["skillTreeProgress"]["node_mago_arcana"]
    d3 = compute_character_derived_stats(char, [], {}, classes_catalog=classes_catalog)
    # FORCA restored (+4), INT back to base (10), ARCANA back to 0
    assert d3["effectiveAttributes"]["FORCA"]["effective"] == 14
    assert d3["effectiveAttributes"]["INTELIGENCIA"]["effective"] == 10
    assert d3.get("effectiveArcana") == 0


def test_shop_purchase_proposals_flow(tmp_path: Path) -> None:
    state_path = _setup_isolated_state(tmp_path)
    client = TestClient(main.app)

    with client.websocket_connect("/ws?memberId=host_master") as ws_m:
        init_m = _drain_until_type(ws_m, "state_sync")
        assert "purchaseProposals" in init_m

        # Add a merchant stock item to test proposal
        test_npc = {
            "id": "npc_mercador_teste",
            "name": "Mercador de Teste",
            "stock": [{"itemId": "item_anel_rubi", "infinite": False, "quantity": 5}],
        }
        test_char = init_m["characters"][0]
        char_id = test_char["id"]
        # Give character 500 gold (and disable shared wallet for character gold testing)
        room_conf = copy.deepcopy(init_m["room"])
        room_conf["isSharedWallet"] = False

        chars = copy.deepcopy(init_m["characters"])
        for c in chars:
            if c["id"] == char_id:
                c["gold"] = 500

        npcs = copy.deepcopy(init_m.get("npcs", [])) + [test_npc]

        # 1. Create a purchase proposal for 2x anel de rubi for 200 gold
        proposal = {
            "id": "prop_test_1",
            "charId": char_id,
            "charName": test_char["name"],
            "merchantId": "npc_mercador_teste",
            "merchantName": "Mercador de Teste",
            "itemId": "item_anel_rubi",
            "itemName": "Anel de Rubi",
            "originalUnitPrice": 150,
            "quantity": 2,
            "proposedGold": 200,
            "message": "Pechincha de teste",
            "status": "PENDENTE",
            "createdAt": 1700000000,
        }

        ws_m.send_json({
            "type": "update_state",
            "room": room_conf,
            "characters": chars,
            "npcs": npcs,
            "purchaseProposals": [proposal],
        })
        sync = _drain_until_type(ws_m, "state_sync")
        assert len(sync["purchaseProposals"]) == 1
        assert sync["purchaseProposals"][0]["status"] == "PENDENTE"

        # 2. Master accepts proposal: deduct 200 gold, grant 2x item, reduce stock from 5 to 3, set status ACEITA
        chars_updated = copy.deepcopy(sync["characters"])
        buyer = next(c for c in chars_updated if c["id"] == char_id)
        buyer["gold"] -= 200
        buyer.setdefault("inventory", []).append({
            "id": "inv_test_anel",
            "itemId": "item_anel_rubi",
            "quantity": 2,
            "isEquipped": False,
            "status": "IN_INVENTORY",
        })

        npcs_updated = copy.deepcopy(sync["npcs"])
        npc_obj = next(n for n in npcs_updated if n["id"] == "npc_mercador_teste")
        stock_obj = next(s for s in npc_obj["stock"] if s["itemId"] == "item_anel_rubi")
        stock_obj["quantity"] = 3

        proposals_updated = copy.deepcopy(sync["purchaseProposals"])
        proposals_updated[0]["status"] = "ACEITA"

        ws_m.send_json({
            "type": "update_state",
            "characters": chars_updated,
            "npcs": npcs_updated,
            "purchaseProposals": proposals_updated,
        })
        sync_after = _drain_until_type(ws_m, "state_sync")

        b_after = next(c for c in sync_after["characters"] if c["id"] == char_id)
        assert b_after["gold"] == 300
        # Verify item added in inventory
        anel_items = [i for i in b_after["inventory"] if i["itemId"] == "item_anel_rubi"]
        assert len(anel_items) > 0
        assert sum(int(i.get("quantity", 1)) for i in anel_items) == 2

        # Verify stock decreased
        n_after = next(n for n in sync_after["npcs"] if n["id"] == "npc_mercador_teste")
        s_after = next(s for s in n_after["stock"] if s["itemId"] == "item_anel_rubi")
        assert s_after["quantity"] == 3

        # Verify proposal marked ACEITA
        assert sync_after["purchaseProposals"][0]["status"] == "ACEITA"


def test_v1_16_1_preferences_audio_and_shop_buttons(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53045))

    # 1. FastAPI app version check
    assert main.app.version == "1.16.5"

    # 2. HTML elements check
    resp = client.get("/")
    assert resp.status_code == 200
    html = resp.text

    # Header Preferences button with gear icon
    assert 'id="btn-open-preferences"' in html
    assert 'lucide:settings' in html

    # Shop buttons with rounded-lg
    assert 'id="btn-open-purchase-proposals"' in html
    assert 'class="app-secondary-btn rounded-lg px-3.5 py-2' in html

    # Modal Preferences structure
    assert 'id="modal-preferences"' in html
    assert 'PREFERÊNCIAS &amp; ÁUDIO' in html
    assert 'id="pref-notifications-toggle"' in html
    assert 'id="pref-volume-master"' in html
    assert 'id="pref-volume-master-val"' in html
    assert 'id="pref-volume-buy"' in html
    assert 'id="pref-volume-equip"' in html
    assert 'id="pref-volume-move"' in html
    assert 'id="pref-volume-hover"' in html
    assert 'data-test-sound="buy"' in html
    assert 'data-test-sound="equip"' in html
    assert 'data-test-sound="move"' in html
    assert 'data-test-sound="hover"' in html
    assert 'id="btn-pref-reset-defaults"' in html
    assert 'Restaurar Padrão (25%)' in html

    # 3. Check 03-tabs-renderers.js for rounded-lg on shop proposal button
    resp_js3 = client.get("/js/03-tabs-renderers.js")
    assert resp_js3.status_code == 200
    assert 'data-propose-buy' in resp_js3.text
    assert 'class="app-secondary-btn rounded-lg py-2 px-2.5' in resp_js3.text

    # 4. Check 01-core-state.js for audio preferences logic
    resp_js1 = client.get("/js/01-core-state.js")
    assert resp_js1.status_code == 200
    assert 'cmrpg_audio_preferences_v1' in resp_js1.text
    assert 'getEffectiveVolume' in resp_js1.text
    assert 'resetDefaults' in resp_js1.text
    assert 'openPreferencesModal' in resp_js1.text


def test_v1_16_2_character_card_redesign(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53046))

    assert main.app.version == "1.16.5"

    resp_js3 = client.get("/js/03-tabs-renderers.js")
    assert resp_js3.status_code == 200
    js3 = resp_js3.text

    # Header: level badge, unified subtitle, icon dock, full-width XP bar
    assert "char-card-level-badge" in js3
    assert "char-card-icon-dock" in js3
    assert "EXPERIÊNCIA" in js3

    # Tactical box: PA, DEF, Skill points, 3-col grid (ATAQUE/ARCANA, REGEN, CARGA) + accumulations inside
    assert "char-tactical-box" in js3
    assert "char-tactical-cell" in js3
    assert "REGEN" in js3
    assert "CARGA" in js3

    # Bottom 6 action buttons in 3x2 grid with matte finish and icons on left
    assert 'data-action="pill-damage"' in js3
    assert 'data-action="pill-attr"' in js3
    assert 'data-action="pill-reset"' in js3
    assert 'data-action="pill-notes"' in js3
    assert "card-action-btn" in js3

    # CSS classes present and zero glow on avatar/tactical box
    resp_css = client.get("/styles.css")
    assert resp_css.status_code == 200
    assert ".char-card-level-badge" in resp_css.text
    assert ".char-card-icon-dock" in resp_css.text
    assert ".char-tactical-box" in resp_css.text
    assert ".card-action-btn" in resp_css.text


def test_v1_16_3_combat_stat_toggle(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53047))

    assert main.app.version == "1.16.5"

    resp_js1 = client.get("/js/01-core-state.js")
    assert "cardCombatStatMode: {}" in resp_js1.text

    resp_js3 = client.get("/js/03-tabs-renderers.js")
    assert 'data-action="toggle-combat-stat"' in resp_js3.text
    assert "state.cardCombatStatMode?.[c.id]" in resp_js3.text

    resp_js6 = client.get("/js/06-events-init.js")
    assert "action === 'toggle-combat-stat'" in resp_js6.text
    assert "renderMesaBoard()" in resp_js6.text


def test_v1_16_4_class_subclass_node_purchase_and_equip_shortcut(tmp_path: Path) -> None:
    _setup_isolated_state(tmp_path)
    client = TestClient(main.app, client=("127.0.0.1", 53048))

    assert main.app.version == "1.16.5"

    resp_js4 = client.get("/js/04-modals-character-buffs.js")
    assert resp_js4.status_code == 200
    js4 = resp_js4.text
    assert "function isClassContainerEquippedOnChar(" in js4
    assert "data-st-equip-vocation=" in js4
    assert "Equipar ${isSubContainer ? 'Subclasse' : 'Classe'} na Ficha" in js4

    resp_js6 = client.get("/js/06-events-init.js")
    assert resp_js6.status_code == 200
    assert "[data-st-equip-vocation]" in resp_js6.text
    assert "handleSheetChangeCharacterVocation(cId, vocKind, vocId)" in resp_js6.text
    assert "const acquiredPassiveNodes = allAcquiredTreeNodes.filter(" in js4















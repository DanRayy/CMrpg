from __future__ import annotations

import copy
import math
from typing import Any, Dict, Iterable, List, Optional, Tuple

DEFAULT_WORLD_WIDTH = 4800
DEFAULT_WORLD_HEIGHT = 3000
DEFAULT_CARD_WIDTH = 420
DEFAULT_CARD_HEIGHT = 468

MIN_CARD_WIDTH = 260
MAX_CARD_WIDTH = 720
MIN_CARD_HEIGHT = 220
MAX_CARD_HEIGHT = 1200

MIN_ZOOM = 0.25
MAX_ZOOM = 1.50
DEFAULT_ZOOM = 0.75

SPAWN_GAP_X = 44
SPAWN_GAP_Y = 44
SPAWN_MARGIN_X = 120
SPAWN_MARGIN_Y = 90
GRAVEYARD_LIMIT = 50


def build_default_table_state(
    world_w: int = DEFAULT_WORLD_WIDTH,
    world_h: int = DEFAULT_WORLD_HEIGHT,
) -> Dict[str, Any]:
    return {
        "schemaVersion": 1,
        "rev": 1,
        "world": {"w": int(world_w), "h": int(world_h)},
        "positions": {},
        "sizes": {},
        "graveyard": {},
        "battle": {
            "active": False,
            "split": int(world_h) // 2,
            "snapshot": {},
        },
        "views": {},
    }


def sanitize_size(
    raw_size: Optional[Dict[str, Any]],
    fallback_w: int = DEFAULT_CARD_WIDTH,
    fallback_h: int = DEFAULT_CARD_HEIGHT,
) -> Dict[str, int]:
    if not isinstance(raw_size, dict):
        return {"w": int(fallback_w), "h": int(fallback_h)}
    try:
        w_val = float(raw_size.get("w", fallback_w))
    except (TypeError, ValueError):
        w_val = float(fallback_w)
    try:
        h_val = float(raw_size.get("h", fallback_h))
    except (TypeError, ValueError):
        h_val = float(fallback_h)

    if not math.isfinite(w_val):
        w_val = float(fallback_w)
    if not math.isfinite(h_val):
        h_val = float(fallback_h)

    w = max(MIN_CARD_WIDTH, min(MAX_CARD_WIDTH, int(round(w_val))))
    h = max(MIN_CARD_HEIGHT, min(MAX_CARD_HEIGHT, int(round(h_val))))
    return {"w": w, "h": h}


def sanitize_view(
    raw_view: Optional[Dict[str, Any]],
    world_w: int = DEFAULT_WORLD_WIDTH,
    world_h: int = DEFAULT_WORLD_HEIGHT,
) -> Dict[str, float]:
    if not isinstance(raw_view, dict):
        return {"x": 0.0, "y": 0.0, "zoom": DEFAULT_ZOOM}
    try:
        x_val = float(raw_view.get("x", 0.0))
    except (TypeError, ValueError):
        x_val = 0.0
    try:
        y_val = float(raw_view.get("y", 0.0))
    except (TypeError, ValueError):
        y_val = 0.0
    try:
        z_val = float(raw_view.get("zoom", DEFAULT_ZOOM))
    except (TypeError, ValueError):
        z_val = DEFAULT_ZOOM

    if not math.isfinite(x_val):
        x_val = 0.0
    if not math.isfinite(y_val):
        y_val = 0.0
    if not math.isfinite(z_val):
        z_val = DEFAULT_ZOOM

    zoom = round(max(MIN_ZOOM, min(MAX_ZOOM, z_val)), 4)
    limit_x = float(world_w) * 2.0
    limit_y = float(world_h) * 2.0
    x = round(max(-limit_x, min(limit_x, x_val)), 2)
    y = round(max(-limit_y, min(limit_y, y_val)), 2)
    return {"x": x, "y": y, "zoom": zoom}


def is_enemy_character(char: Optional[Dict[str, Any]]) -> bool:
    if not isinstance(char, dict):
        return False
    return bool(char.get("isEnemy") or char.get("type") == "enemy" or char.get("bestiaryId"))


def get_allowed_region(
    world_w: int,
    world_h: int,
    card_w: int,
    card_h: int,
    battle_active: bool = False,
    battle_split: Optional[int] = None,
    is_enemy: bool = False,
) -> Dict[str, int]:
    w = max(1, int(round(card_w)))
    h = max(1, int(round(card_h)))
    ww = max(w, int(round(world_w)))
    wh = max(h, int(round(world_h)))

    min_x = 0
    max_x = max(0, ww - w)

    if not battle_active:
        return {
            "min_x": min_x,
            "max_x": max_x,
            "min_y": 0,
            "max_y": max(0, wh - h),
        }

    split = int(battle_split if battle_split is not None else (wh // 2))
    split = max(h, min(wh - h, split))

    if is_enemy:
        min_y = 0
        max_y = max(0, split - h)
    else:
        min_y = split
        max_y = max(split, wh - h)

    return {
        "min_x": min_x,
        "max_x": max_x,
        "min_y": min_y,
        "max_y": max_y,
    }


def clamp_to_region(x: float, y: float, region: Dict[str, int]) -> Tuple[int, int]:
    if not math.isfinite(x):
        x = float(region["min_x"])
    if not math.isfinite(y):
        y = float(region["min_y"])
    cx = max(int(region["min_x"]), min(int(region["max_x"]), int(round(x))))
    cy = max(int(region["min_y"]), min(int(region["max_y"]), int(round(y))))
    return cx, cy


def in_region(x: int, y: int, region: Dict[str, int]) -> bool:
    return (
        int(region["min_x"]) <= x <= int(region["max_x"])
        and int(region["min_y"]) <= y <= int(region["max_y"])
    )


def rects_overlap(
    ax: int,
    ay: int,
    aw: int,
    ah: int,
    bx: int,
    by: int,
    bw: int,
    bh: int,
    gap: int = 0,
) -> bool:
    return (
        ax < bx + bw + gap
        and ax + aw + gap > bx
        and ay < by + bh + gap
        and ay + ah + gap > by
    )


def overlaps_any(
    x: int,
    y: int,
    w: int,
    h: int,
    obstacles: Iterable[Dict[str, int]],
    gap: int = 0,
) -> bool:
    for obs in obstacles:
        if rects_overlap(x, y, w, h, int(obs["x"]), int(obs["y"]), int(obs["w"]), int(obs["h"]), gap=gap):
            return True
    return False


def _sweep_x(
    cur_x: int,
    cur_y: int,
    target_x: int,
    w: int,
    h: int,
    obstacles: Iterable[Dict[str, int]],
    region: Dict[str, int],
) -> int:
    rx = max(int(region["min_x"]), min(int(region["max_x"]), int(target_x)))
    if rx == cur_x:
        return rx
    if rx > cur_x:
        for obs in obstacles:
            ox, oy, ow, oh = int(obs["x"]), int(obs["y"]), int(obs["w"]), int(obs["h"])
            if cur_y < oy + oh and cur_y + h > oy:
                if ox >= cur_x + w and rx + w > ox:
                    rx = min(rx, ox - w)
    else:
        for obs in obstacles:
            ox, oy, ow, oh = int(obs["x"]), int(obs["y"]), int(obs["w"]), int(obs["h"])
            if cur_y < oy + oh and cur_y + h > oy:
                if ox + ow <= cur_x and rx < ox + ow:
                    rx = max(rx, ox + ow)
    return max(int(region["min_x"]), min(int(region["max_x"]), rx))


def _sweep_y(
    cur_x: int,
    cur_y: int,
    target_y: int,
    w: int,
    h: int,
    obstacles: Iterable[Dict[str, int]],
    region: Dict[str, int],
) -> int:
    ry = max(int(region["min_y"]), min(int(region["max_y"]), int(target_y)))
    if ry == cur_y:
        return ry
    if ry > cur_y:
        for obs in obstacles:
            ox, oy, ow, oh = int(obs["x"]), int(obs["y"]), int(obs["w"]), int(obs["h"])
            if cur_x < ox + ow and cur_x + w > ox:
                if oy >= cur_y + h and ry + h > oy:
                    ry = min(ry, oy - h)
    else:
        for obs in obstacles:
            ox, oy, ow, oh = int(obs["x"]), int(obs["y"]), int(obs["w"]), int(obs["h"])
            if cur_x < ox + ow and cur_x + w > ox:
                if oy + oh <= cur_y and ry < oy + oh:
                    ry = max(ry, oy + oh)
    return max(int(region["min_y"]), min(int(region["max_y"]), ry))


def slide_move(
    cur_x: int,
    cur_y: int,
    target_x: int,
    target_y: int,
    w: int,
    h: int,
    obstacles: List[Dict[str, int]],
    region: Dict[str, int],
) -> Optional[Tuple[int, int]]:
    if not in_region(cur_x, cur_y, region) or overlaps_any(cur_x, cur_y, w, h, obstacles):
        return None

    # Candidate 1: X then Y
    x1 = _sweep_x(cur_x, cur_y, target_x, w, h, obstacles, region)
    y1 = _sweep_y(x1, cur_y, target_y, w, h, obstacles, region)

    # Candidate 2: Y then X
    y2 = _sweep_y(cur_x, cur_y, target_y, w, h, obstacles, region)
    x2 = _sweep_x(cur_x, y2, target_x, w, h, obstacles, region)

    valid: List[Tuple[int, int]] = []
    if in_region(x1, y1, region) and not overlaps_any(x1, y1, w, h, obstacles):
        valid.append((x1, y1))
    if (x2, y2) != (x1, y1) and in_region(x2, y2, region) and not overlaps_any(x2, y2, w, h, obstacles):
        valid.append((x2, y2))

    if not valid:
        return (cur_x, cur_y)

    valid.sort(key=lambda pt: (pt[0] - target_x) ** 2 + (pt[1] - target_y) ** 2)
    return valid[0]


def nearest_free(
    desired_x: float,
    desired_y: float,
    w: int,
    h: int,
    obstacles: List[Dict[str, int]],
    region: Dict[str, int],
    gap: int = 0,
) -> Tuple[int, int]:
    tx, ty = clamp_to_region(desired_x, desired_y, region)
    if not overlaps_any(tx, ty, w, h, obstacles, gap=gap):
        return tx, ty

    candidates: List[Tuple[int, int]] = []
    seen: set[Tuple[int, int]] = set()

    def add_candidate(cx: int, cy: int) -> None:
        px, py = clamp_to_region(cx, cy, region)
        if (px, py) in seen:
            return
        seen.add((px, py))
        if not overlaps_any(px, py, w, h, obstacles, gap=gap):
            candidates.append((px, py))

    # Level 1: single-axis projections onto every obstacle border
    l1_points: List[Tuple[int, int]] = []
    for obs in obstacles:
        ox, oy, ow, oh = int(obs["x"]), int(obs["y"]), int(obs["w"]), int(obs["h"])
        pts = [
            (ox - w - gap, ty),
            (ox + ow + gap, ty),
            (tx, oy - h - gap),
            (tx, oy + oh + gap),
        ]
        for px, py in pts:
            add_candidate(px, py)
            l1_points.append(clamp_to_region(px, py, region))

    # Level 2: resolve secondary overlaps from Level 1 points and obstacle corners
    for px, py in l1_points:
        for obs in obstacles:
            ox, oy, ow, oh = int(obs["x"]), int(obs["y"]), int(obs["w"]), int(obs["h"])
            if rects_overlap(px, py, w, h, ox, oy, ow, oh, gap=gap):
                add_candidate(ox - w - gap, py)
                add_candidate(ox + ow + gap, py)
                add_candidate(px, oy - h - gap)
                add_candidate(px, oy + oh + gap)

    for obs in obstacles:
        ox, oy, ow, oh = int(obs["x"]), int(obs["y"]), int(obs["w"]), int(obs["h"])
        for cx in (ox - w - gap, ox, ox + ow - w, ox + ow + gap):
            for cy in (oy - h - gap, oy, oy + oh - h, oy + oh + gap):
                add_candidate(cx, cy)

    if candidates:
        candidates.sort(key=lambda pt: ((pt[0] - tx) ** 2 + (pt[1] - ty) ** 2, pt[1], pt[0]))
        return candidates[0]

    # Fallback: shelf scan across the allowed region
    step_x = max(24, w // 4)
    step_y = max(24, h // 4)
    best_pt: Optional[Tuple[int, int]] = None
    best_dist = float("inf")
    for gy in range(int(region["min_y"]), int(region["max_y"]) + 1, step_y):
        for gx in range(int(region["min_x"]), int(region["max_x"]) + 1, step_x):
            if not overlaps_any(gx, gy, w, h, obstacles, gap=gap):
                d = (gx - tx) ** 2 + (gy - ty) ** 2
                if d < best_dist:
                    best_dist = d
                    best_pt = (gx, gy)
    if best_pt is not None:
        return best_pt

    return tx, ty


def resolve_move(
    desired_x: float,
    desired_y: float,
    w: int,
    h: int,
    obstacles: List[Dict[str, int]],
    region: Dict[str, int],
    current_pos: Optional[Tuple[int, int]] = None,
) -> Tuple[int, int]:
    tx, ty = clamp_to_region(desired_x, desired_y, region)
    if not overlaps_any(tx, ty, w, h, obstacles):
        return tx, ty

    if current_pos is not None:
        cx, cy = int(round(current_pos[0])), int(round(current_pos[1]))
        if in_region(cx, cy, region) and not overlaps_any(cx, cy, w, h, obstacles):
            dist_from_cur = math.hypot(tx - cx, ty - cy)
            # Continuous drag neighborhood: slide along obstacle borders without jumping across
            if dist_from_cur <= max(w, h) * 1.5:
                slid = slide_move(cx, cy, tx, ty, w, h, obstacles, region)
                if slid is not None:
                    return slid

    return nearest_free(tx, ty, w, h, obstacles, region, gap=0)


def can_move_card(
    char: Optional[Dict[str, Any]],
    identity: Dict[str, Any],
    members: Optional[List[Dict[str, Any]]] = None,
) -> bool:
    if not isinstance(char, dict) or not isinstance(identity, dict):
        return False

    is_host = bool(identity.get("is_host"))
    member_id = str(identity.get("member_id") or "").strip()
    client_ip = str(identity.get("client_ip") or "").strip()
    role = str(identity.get("role") or "").upper()

    member_obj: Optional[Dict[str, Any]] = None
    if isinstance(members, list):
        for m in members:
            if not isinstance(m, dict):
                continue
            if (member_id and m.get("id") == member_id) or (client_ip and m.get("ip") == client_ip):
                member_obj = m
                break

    is_master = (
        is_host
        or member_id == "host_master"
        or role == "MESTRE"
        or bool(member_obj and str(member_obj.get("role") or "").upper() == "MESTRE")
    )

    # Mestre pode mover qualquer card (personagens e inimigos)
    if is_master:
        return True

    # Jogadores comuns jamais podem mover inimigos
    if is_enemy_character(char):
        return False

    # Permissão universal: qualquer jogador pode mover cards de personagens (mesmo não vinculados)
    return True


def _default_spawn_slot(
    index_in_group: int,
    is_enemy: bool,
    w: int,
    h: int,
    world_w: int,
    world_h: int,
    split: int,
) -> Tuple[int, int]:
    usable_w = max(w, world_w - 2 * SPAWN_MARGIN_X)
    cols = max(1, (usable_w + SPAWN_GAP_X) // (w + SPAWN_GAP_X))
    col = index_in_group % cols
    row = index_in_group // cols

    x = SPAWN_MARGIN_X + col * (w + SPAWN_GAP_X)
    if is_enemy:
        y = SPAWN_MARGIN_Y + row * (h + SPAWN_GAP_Y)
    else:
        y = split + SPAWN_MARGIN_Y + row * (h + SPAWN_GAP_Y)
    return x, y


def enter_battle(table: Dict[str, Any], characters: List[Dict[str, Any]]) -> bool:
    world = table.setdefault("world", {"w": DEFAULT_WORLD_WIDTH, "h": DEFAULT_WORLD_HEIGHT})
    world_w = int(world.get("w", DEFAULT_WORLD_WIDTH))
    world_h = int(world.get("h", DEFAULT_WORLD_HEIGHT))
    split = int(table.get("battle", {}).get("split") or (world_h // 2))

    positions: Dict[str, Dict[str, int]] = table.setdefault("positions", {})
    sizes: Dict[str, Dict[str, int]] = table.setdefault("sizes", {})

    battle_info = table.setdefault("battle", {})
    battle_info["snapshot"] = copy.deepcopy(positions)
    battle_info["active"] = True
    battle_info["split"] = split

    placed_obstacles: List[Dict[str, int]] = []
    relocate_queue: List[Tuple[Dict[str, Any], int, int, int, int, Dict[str, int]]] = []

    # Passo 1: preservar cards que já estão inteiramente na região correta e sem colisão
    for char in characters:
        if not isinstance(char, dict) or not char.get("id"):
            continue
        cid = str(char["id"])
        is_enemy = is_enemy_character(char)
        sz = sanitize_size(sizes.get(cid))
        sizes[cid] = sz
        w, h = sz["w"], sz["h"]
        region = get_allowed_region(
            world_w=world_w,
            world_h=world_h,
            card_w=w,
            card_h=h,
            battle_active=True,
            battle_split=split,
            is_enemy=is_enemy,
        )
        pos = positions.get(cid)
        if isinstance(pos, dict) and "x" in pos and "y" in pos:
            px, py = int(round(pos["x"])), int(round(pos["y"]))
            if in_region(px, py, region) and not overlaps_any(px, py, w, h, placed_obstacles):
                positions[cid] = {"x": px, "y": py}
                placed_obstacles.append({"id": cid, "x": px, "y": py, "w": w, "h": h})
                continue
            relocate_queue.append((char, px, py, w, h, region))
        else:
            def_x, def_y = _default_spawn_slot(len(relocate_queue), is_enemy, w, h, world_w, world_h, split)
            relocate_queue.append((char, def_x, def_y, w, h, region))

    # Passo 2: mover apenas os cards em região incorreta (ou conflitantes), preservando X e ordem relativa
    relocate_queue.sort(key=lambda item: (item[2], item[1]))
    for idx, (char, orig_x, orig_y, w, h, region) in enumerate(relocate_queue):
        cid = str(char["id"])
        is_enemy = is_enemy_character(char)
        if is_enemy:
            # Estava na metade inferior; traz para a parte inferior da região superior mantendo X
            desired_y = min(orig_y, int(region["max_y"]) - SPAWN_MARGIN_Y)
        else:
            # Estava na metade superior; traz para o topo da região inferior mantendo X
            desired_y = max(orig_y, int(region["min_y"]) + SPAWN_MARGIN_Y)
        nx, ny = nearest_free(orig_x, desired_y, w, h, placed_obstacles, region, gap=16)
        if overlaps_any(nx, ny, w, h, placed_obstacles, gap=0):
            nx, ny = nearest_free(orig_x, desired_y, w, h, placed_obstacles, region, gap=0)
        positions[cid] = {"x": nx, "y": ny}
        placed_obstacles.append({"id": cid, "x": nx, "y": ny, "w": w, "h": h})

    table["rev"] = int(table.get("rev", 1)) + 1
    return True


def exit_battle(table: Dict[str, Any]) -> bool:
    battle_info = table.setdefault("battle", {})
    was_active = bool(battle_info.get("active", False))
    battle_info["active"] = False
    if was_active:
        table["rev"] = int(table.get("rev", 1)) + 1
    return was_active


def reconcile(state: Dict[str, Any]) -> bool:
    if not isinstance(state, dict):
        return False

    changed = False
    raw_table = state.get("table")
    if not isinstance(raw_table, dict):
        state["table"] = build_default_table_state()
        raw_table = state["table"]
        changed = True

    default_tpl = build_default_table_state()
    for k, v in default_tpl.items():
        if k not in raw_table or not isinstance(raw_table[k], type(v)):
            raw_table[k] = copy.deepcopy(v)
            changed = True

    world = raw_table["world"]
    world_w = max(1600, int(world.get("w", DEFAULT_WORLD_WIDTH)))
    world_h = max(1200, int(world.get("h", DEFAULT_WORLD_HEIGHT)))
    if world.get("w") != world_w or world.get("h") != world_h:
        world["w"] = world_w
        world["h"] = world_h
        changed = True

    split = int(raw_table["battle"].get("split") or (world_h // 2))
    raw_table["battle"]["split"] = split

    characters: List[Dict[str, Any]] = [
        c for c in (state.get("characters") or []) if isinstance(c, dict) and c.get("id")
    ]
    current_ids = {str(c["id"]) for c in characters}

    positions: Dict[str, Dict[str, int]] = raw_table["positions"]
    sizes: Dict[str, Dict[str, int]] = raw_table["sizes"]
    graveyard: Dict[str, Dict[str, int]] = raw_table["graveyard"]

    # 1. Remove apenas fichas que foram efetivamente deletadas de state["characters"]
    for cid in list(positions.keys()):
        if cid not in current_ids:
            old_pos = positions.pop(cid, None)
            old_sz = sizes.pop(cid, None)
            if isinstance(old_pos, dict):
                sz_clean = sanitize_size(old_sz)
                graveyard[cid] = {
                    "x": int(round(old_pos.get("x", 0))),
                    "y": int(round(old_pos.get("y", 0))),
                    "w": sz_clean["w"],
                    "h": sz_clean["h"],
                }
                while len(graveyard) > GRAVEYARD_LIMIT:
                    oldest_key = next(iter(graveyard))
                    graveyard.pop(oldest_key, None)
            changed = True

    for cid in list(sizes.keys()):
        if cid not in current_ids:
            sizes.pop(cid, None)
            changed = True

    # 2. Sincroniza flag de batalha caso state["battle"]["isActive"] tenha mudado
    state_battle_active = bool((state.get("battle") or {}).get("isActive", False))
    table_battle_active = bool(raw_table["battle"].get("active", False))

    if state_battle_active and not table_battle_active:
        enter_battle(raw_table, characters)
        return True
    if not state_battle_active and table_battle_active:
        exit_battle(raw_table)
        changed = True

    battle_active = bool(raw_table["battle"].get("active", False))

    # 3. Valida cards já posicionados e posiciona automaticamente fichas novas
    placed_obstacles: List[Dict[str, int]] = []
    missing_chars: List[Dict[str, Any]] = []

    for char in characters:
        cid = str(char["id"])
        sz = sanitize_size(sizes.get(cid))
        if sizes.get(cid) != sz:
            sizes[cid] = sz
            changed = True

        pos = positions.get(cid)
        if not isinstance(pos, dict) or "x" not in pos or "y" not in pos:
            missing_chars.append(char)
            continue

        is_enemy = is_enemy_character(char)
        region = get_allowed_region(
            world_w=world_w,
            world_h=world_h,
            card_w=sz["w"],
            card_h=sz["h"],
            battle_active=battle_active,
            battle_split=split,
            is_enemy=is_enemy,
        )
        px, py = clamp_to_region(pos.get("x", 0), pos.get("y", 0), region)
        if overlaps_any(px, py, sz["w"], sz["h"], placed_obstacles):
            px, py = nearest_free(px, py, sz["w"], sz["h"], placed_obstacles, region, gap=12)
            if overlaps_any(px, py, sz["w"], sz["h"], placed_obstacles):
                px, py = nearest_free(px, py, sz["w"], sz["h"], placed_obstacles, region, gap=0)

        if pos.get("x") != px or pos.get("y") != py:
            positions[cid] = {"x": px, "y": py}
            changed = True

        placed_obstacles.append({"id": cid, "x": px, "y": py, "w": sz["w"], "h": sz["h"]})

    enemy_idx = sum(1 for c in characters if str(c["id"]) in positions and is_enemy_character(c))
    hero_idx = sum(1 for c in characters if str(c["id"]) in positions and not is_enemy_character(c))

    for char in missing_chars:
        cid = str(char["id"])
        is_enemy = is_enemy_character(char)
        grave = graveyard.pop(cid, None)
        if isinstance(grave, dict):
            sz = sanitize_size({"w": grave.get("w", DEFAULT_CARD_WIDTH), "h": grave.get("h", DEFAULT_CARD_HEIGHT)})
            sizes[cid] = sz
            des_x, des_y = int(grave.get("x", SPAWN_MARGIN_X)), int(grave.get("y", SPAWN_MARGIN_Y))
        else:
            sz = sanitize_size(sizes.get(cid))
            sizes[cid] = sz
            if is_enemy:
                des_x, des_y = _default_spawn_slot(enemy_idx, True, sz["w"], sz["h"], world_w, world_h, split)
                enemy_idx += 1
            else:
                des_x, des_y = _default_spawn_slot(hero_idx, False, sz["w"], sz["h"], world_w, world_h, split)
                hero_idx += 1

        region = get_allowed_region(
            world_w=world_w,
            world_h=world_h,
            card_w=sz["w"],
            card_h=sz["h"],
            battle_active=battle_active,
            battle_split=split,
            is_enemy=is_enemy,
        )
        px, py = nearest_free(des_x, des_y, sz["w"], sz["h"], placed_obstacles, region, gap=16)
        if overlaps_any(px, py, sz["w"], sz["h"], placed_obstacles):
            px, py = nearest_free(des_x, des_y, sz["w"], sz["h"], placed_obstacles, region, gap=0)

        positions[cid] = {"x": px, "y": py}
        placed_obstacles.append({"id": cid, "x": px, "y": py, "w": sz["w"], "h": sz["h"]})
        changed = True

    if changed:
        raw_table["rev"] = int(raw_table.get("rev", 1)) + 1

    return changed


def get_public_table_payload(table: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "schemaVersion": int(table.get("schemaVersion", 1)),
        "rev": int(table.get("rev", 1)),
        "world": copy.deepcopy(table.get("world") or {"w": DEFAULT_WORLD_WIDTH, "h": DEFAULT_WORLD_HEIGHT}),
        "positions": copy.deepcopy(table.get("positions") or {}),
        "sizes": copy.deepcopy(table.get("sizes") or {}),
        "battle": {
            "active": bool((table.get("battle") or {}).get("active", False)),
            "split": int((table.get("battle") or {}).get("split", DEFAULT_WORLD_HEIGHT // 2)),
        },
    }

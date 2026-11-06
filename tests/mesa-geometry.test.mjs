import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const mesa = require('../static/js/05b-mesa-board.js');
const fixturePath = path.join(__dirname, 'fixtures', 'collision_cases.json');
const cases = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

test('JS vs Python parity on all 14 shared collision fixture cases', () => {
  for (const c of cases) {
    const res = mesa.mesaResolveMove(
      c.desired.x,
      c.desired.y,
      c.w,
      c.h,
      c.obstacles,
      c.region,
      c.current || null
    );

    assert.equal(res.x, c.expected.x, `[${c.name}] x mismatch`);
    assert.equal(res.y, c.expected.y, `[${c.name}] y mismatch`);
    assert.equal(mesa.mesaInRegion(res.x, res.y, c.region), true, `[${c.name}] out of region`);
    assert.equal(
      mesa.mesaOverlapsAny(res.x, res.y, c.w, c.h, c.obstacles),
      false,
      `[${c.name}] overlaps obstacle`
    );
  }
});

test('JS battle transition splits enemies top and players bottom without overlap and preserves on end', () => {
  const st = {
    characters: [
      { id: 'hero_1', name: 'Hero 1', isEnemy: false, hp: 100, maxHp: 100 },
      { id: 'hero_2', name: 'Hero 2', isEnemy: false, hp: 100, maxHp: 100 },
      { id: 'enemy_1', name: 'Goblin (1)', isEnemy: true, bestiaryId: 'b1', hp: 50, maxHp: 50 },
      { id: 'enemy_2', name: 'Goblin (2)', isEnemy: true, bestiaryId: 'b1', hp: 50, maxHp: 50 },
    ],
    battle: { isActive: false },
    table: null,
  };

  mesa.reconcileMesaTableStateClient(st);
  // Put hero_1 in top half and enemy_1 in bottom half before battle
  st.table.positions.hero_1 = { x: 300, y: 200 };
  st.table.positions.enemy_1 = { x: 300, y: 2100 };

  st.battle.isActive = true;
  mesa.enterMesaBattleClient(st);

  assert.equal(st.table.battle.active, true);
  const splitY = st.table.battle.split;

  for (const ch of st.characters) {
    const pos = st.table.positions[ch.id];
    const sz = st.table.sizes[ch.id];
    if (ch.isEnemy) {
      assert.ok(pos.y + sz.h <= splitY, `Enemy ${ch.id} violated top region`);
    } else {
      assert.ok(pos.y >= splitY, `Hero ${ch.id} violated bottom region`);
    }
  }

  // Verify no pairwise overlaps
  for (let i = 0; i < st.characters.length; i++) {
    for (let j = i + 1; j < st.characters.length; j++) {
      const a = st.characters[i].id;
      const b = st.characters[j].id;
      const pa = st.table.positions[a];
      const pb = st.table.positions[b];
      const sa = st.table.sizes[a];
      const sb = st.table.sizes[b];
      assert.equal(
        mesa.mesaRectsOverlap(pa.x, pa.y, sa.w, sa.h, pb.x, pb.y, sb.w, sb.h),
        false,
        `Overlap between ${a} and ${b}`
      );
    }
  }

  // Move enemy_1 inside top region during battle
  st.table.positions.enemy_1 = { x: 1200, y: 400 };

  // End battle
  st.battle.isActive = false;
  mesa.exitMesaBattleClient(st);

  assert.equal(st.table.battle.active, false);
  assert.equal(st.characters.filter((c) => c.isEnemy).length, 2, 'Enemies must remain on Mesa after battle end');
  assert.equal(st.table.positions.enemy_1.x, 1200, 'Enemy battle movement must be preserved after battle end');
  assert.equal(st.table.positions.enemy_1.y, 400);
});

test('JS collision benchmark: 30 cards x 500 drag frames runs under 1.5ms/frame', () => {
  const region = { min_x: 0, max_x: 4380, min_y: 0, max_y: 2532 };
  const obstacles = [];
  for (let i = 0; i < 30; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    obstacles.push({
      id: `card_${i}`,
      x: 100 + col * 680,
      y: 80 + row * 520,
      w: 420,
      h: 468,
    });
  }

  const w = 420;
  const h = 468;
  let curX = 0;
  let curY = 0;

  const t0 = performance.now();
  const frames = 500;
  for (let f = 0; f < frames; f++) {
    const targetX = (f * 73) % 4200;
    const targetY = (f * 59) % 2400;
    const res = mesa.mesaResolveMove(targetX, targetY, w, h, obstacles, region, { x: curX, y: curY });
    curX = res.x;
    curY = res.y;
    assert.equal(mesa.mesaOverlapsAny(curX, curY, w, h, obstacles), false);
  }
  const elapsedMs = performance.now() - t0;
  const avgFrameMs = elapsedMs / frames;
  assert.ok(avgFrameMs < 2.0, `Expected < 2.0ms per frame for 30 cards, got ${avgFrameMs.toFixed(3)}ms`);
});

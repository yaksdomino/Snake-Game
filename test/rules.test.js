import test from "node:test";
import assert from "node:assert/strict";

import { containsCell, isCellBlocked } from "../src/collision.js";
import { chooseBestDirection } from "../src/enemy.js";
import {
  calculateCompetitiveScore,
  getGameMode,
  wrapCell,
} from "../src/game-modes.js";
import {
  CLASSIC_HIGH_SCORE_KEY,
  createHighScoreStore,
} from "../src/high-score.js";
import {
  canTurn,
  getCurrentSpeed,
  getGrowthSteps,
  getNextHead,
  isInsideBoard,
  splitDisjointSegments,
} from "../src/rules.js";

test("movement advances one grid cell", () => {
  assert.deepEqual(getNextHead({ x: 4, y: 8 }, { x: -1, y: 0 }), { x: 3, y: 8 });
});

test("turning rejects only the direct reverse direction", () => {
  assert.equal(canTurn({ x: 1, y: 0 }, { x: -1, y: 0 }), false);
  assert.equal(canTurn({ x: 1, y: 0 }, { x: 0, y: -1 }), true);
});

test("board bounds include the first and last cells", () => {
  assert.equal(isInsideBoard({ x: 0, y: 0 }, 20), true);
  assert.equal(isInsideBoard({ x: 19, y: 19 }, 20), true);
  assert.equal(isInsideBoard({ x: 20, y: 19 }, 20), false);
});

test("growth scheduling is deterministic", () => {
  assert.equal(getGrowthSteps(3999, 2000), 1);
  assert.equal(getGrowthSteps(4000, 2000), 2);
});

test("speed progression respects its minimum", () => {
  assert.equal(getCurrentSpeed({ moveIntervalMs: 150, snakeLength: 5, initialLength: 4, speedStep: 4, minSpeed: 78 }), 146);
  assert.equal(getCurrentSpeed({ moveIntervalMs: 150, snakeLength: 100, initialLength: 4, speedStep: 4, minSpeed: 78 }), 78);
});

test("collision checks can ignore a tail that will vacate", () => {
  const body = [{ x: 2, y: 2 }, { x: 1, y: 2 }];
  assert.equal(containsCell(body, { x: 1, y: 2 }), true);
  assert.equal(containsCell(body, { x: 1, y: 2 }, true), false);
});

test("combined collision state covers walls, obstacles, and snakes", () => {
  const state = {
    gridSize: 20,
    obstacles: [{ x: 4, y: 4 }],
    playerSegments: [{ x: 10, y: 10 }],
    enemySnakes: [{ segments: [{ x: 6, y: 6 }] }],
  };
  assert.equal(isCellBlocked({ ...state, cell: { x: -1, y: 0 } }), true);
  assert.equal(isCellBlocked({ ...state, cell: { x: 4, y: 4 } }), true);
  assert.equal(isCellBlocked({ ...state, cell: { x: 6, y: 6 } }), true);
  assert.equal(isCellBlocked({ ...state, cell: { x: 8, y: 8 } }), false);
});

test("enemy selection chooses the highest-scoring safe direction", () => {
  const directions = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
  assert.deepEqual(chooseBestDirection(directions, ({ y }) => y * 10), { x: 0, y: 1 });
});

test("game mode definitions expose the expected rule families", () => {
  assert.equal(getGameMode("competitive").powerUps, true);
  assert.equal(getGameMode("sandbox").wallBehavior, "wrap");
  assert.equal(getGameMode("classic").automaticGrowth, false);
  assert.equal(getGameMode("unknown"), null);
});

test("competitive scoring combines survival and growth", () => {
  assert.equal(calculateCompetitiveScore(2450, 7, 4), 174);
});

test("sandbox wrapping moves across every board edge", () => {
  assert.deepEqual(wrapCell({ x: -1, y: 5 }, 20), { x: 19, y: 5 });
  assert.deepEqual(wrapCell({ x: 20, y: 5 }, 20), { x: 0, y: 5 });
  assert.deepEqual(wrapCell({ x: 5, y: -1 }, 20), { x: 5, y: 19 });
});

test("wrapped snakes are split into contiguous visual runs", () => {
  const segments = [
    { x: 1, y: 5 },
    { x: 0, y: 5 },
    { x: 19, y: 5 },
    { x: 18, y: 5 },
  ];
  assert.deepEqual(splitDisjointSegments(segments), [
    [{ x: 1, y: 5 }, { x: 0, y: 5 }],
    [{ x: 19, y: 5 }, { x: 18, y: 5 }],
  ]);
});

test("competitive high scores persist only when a record is beaten", () => {
  const values = new Map([["snakeGame.competitiveHighScore.v1", "120"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const scores = createHighScoreStore(storage);
  assert.equal(scores.get(), 120);
  assert.equal(scores.record(100), false);
  assert.equal(scores.record(175), true);
  assert.equal(scores.get(), 175);
  assert.equal(values.get("snakeGame.competitiveHighScore.v1"), "175");
});

test("high scores tolerate invalid and unavailable storage", () => {
  const brokenStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  const scores = createHighScoreStore(brokenStorage);
  assert.equal(scores.get(), 0);
  assert.equal(scores.record(25), true);
  assert.equal(scores.get(), 25);
});

test("classic and competitive records use independent storage keys", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const competitive = createHighScoreStore(storage);
  const classic = createHighScoreStore(storage, CLASSIC_HIGH_SCORE_KEY);
  competitive.record(80);
  classic.record(300);
  assert.equal(competitive.get(), 80);
  assert.equal(classic.get(), 300);
});

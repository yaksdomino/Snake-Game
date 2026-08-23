export const CELL_SIZE = 30;
export const INITIAL_LENGTH = 4;
export const DEFAULT_MOVE_INTERVAL_MS = 150;
export const MIN_SPEED = 78;
export const SPEED_STEP = 4;
export const DEFAULT_GROWTH_INTERVAL_MS = 2000;
export const DEFAULT_OBSTACLE_INTERVAL_MS = 1000;
export const DEFAULT_ENEMY_SPAWN_INTERVAL_MS = 10000;
export const POWER_UP_DELAY_MS = 5000;
export const POWER_UP_DURATION_MS = 15000;
export const POWER_UP_FLICKER_WARNING_MS = 4000;
export const MIN_INTERVAL_MS = 200;
export const MIN_MOVE_INTERVAL_MS = 50;
export const ENEMY_MOVE_INTERVAL_MS = 190;
export const ENEMY_LENGTH = 5;
export const MAX_TIMED_EVENTS_PER_FRAME = 8;

export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
});

export const KEY_DIRECTIONS = Object.freeze({
  ArrowUp: DIRECTIONS.up,
  ArrowDown: DIRECTIONS.down,
  ArrowLeft: DIRECTIONS.left,
  ArrowRight: DIRECTIONS.right,
  w: DIRECTIONS.up,
  W: DIRECTIONS.up,
  s: DIRECTIONS.down,
  S: DIRECTIONS.down,
  a: DIRECTIONS.left,
  A: DIRECTIONS.left,
  d: DIRECTIONS.right,
  D: DIRECTIONS.right,
});

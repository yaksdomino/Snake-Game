import {
  CELL_SIZE,
  DEFAULT_ENEMY_SPAWN_INTERVAL_MS,
  DEFAULT_GROWTH_INTERVAL_MS,
  DEFAULT_MOVE_INTERVAL_MS,
  DEFAULT_OBSTACLE_INTERVAL_MS,
  ENEMY_LENGTH,
  ENEMY_MOVE_INTERVAL_MS,
  INITIAL_LENGTH,
  MAX_TIMED_EVENTS_PER_FRAME,
  MIN_INTERVAL_MS,
  MIN_MOVE_INTERVAL_MS,
  MIN_SPEED,
  POWER_UP_DELAY_MS,
  POWER_UP_DURATION_MS,
  POWER_UP_FLICKER_WARNING_MS,
  SPEED_STEP,
} from "./constants.js";
import { bindGameInput } from "./input.js";
import {
  containsCell,
  enemiesAtCell,
  isCellBlocked as checkCellBlocked,
} from "./collision.js";
import { chooseBestDirection } from "./enemy.js";
import {
  calculateCompetitiveScore,
  getGameMode,
  wrapCell,
} from "./game-modes.js";
import {
  CLASSIC_HIGH_SCORE_KEY,
  createHighScoreStore,
} from "./high-score.js";
import { createBackgroundCache } from "./render-cache.js";
import {
  canTurn as isAllowedTurn,
  cellsMatch,
  getCurrentSpeed as calculateCurrentSpeed,
  getGrowthSteps,
  getNextHead,
  splitDisjointSegments,
} from "./rules.js";

export function createGameController() {
const canvas = document.getElementById("game");
const BOARD_SIZE = 600;
const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = BOARD_SIZE * pixelRatio;
canvas.height = BOARD_SIZE * pixelRatio;
const ctx = canvas.getContext("2d");
ctx.scale(pixelRatio, pixelRatio);

const scoreEl = document.getElementById("score");
const scoreLabelEl = document.getElementById("scoreLabel");
const lengthEl = document.getElementById("length");
const bestBlock = document.getElementById("bestBlock");
const bestScoreEl = document.getElementById("bestScore");
const modeNameEl = document.getElementById("modeName");
const modeInstructionsEl = document.getElementById("modeInstructions");
const modeMenu = document.getElementById("modeMenu");
const gameShell = document.getElementById("gameShell");
const changeModeButton = document.getElementById("changeMode");
const restartButton = document.getElementById("restart");
const obstacleRateInput = document.getElementById("obstacleRate");
const growthRateInput = document.getElementById("growthRate");
const speedRateInput = document.getElementById("speedRate");
const obstaclesEnabledInput = document.getElementById("obstaclesEnabled");
const enemySnakesEnabledInput = document.getElementById("enemySnakesEnabled");
const enemySnakeRateInput = document.getElementById("enemySnakeRate");
const enemySnakeRateValue = document.getElementById("enemySnakeRateValue");
const snakeStyleInput = document.getElementById("snakeStyle");
const overlay = document.getElementById("overlay");
const overlayLabel = document.getElementById("overlayLabel");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayButton = document.getElementById("overlayButton");
const sandboxActions = document.getElementById("sandboxActions");
const addObstacleButton = document.getElementById("addObstacle");
const addEnemyButton = document.getElementById("addEnemy");
const addPowerUpButton = document.getElementById("addPowerUp");
const clearBoardButton = document.getElementById("clearBoard");
const gameplayOptionEls = [...document.querySelectorAll(".gameplay-option")];
const modeButtons = [...document.querySelectorAll("[data-mode]")];

const GRID_SIZE = BOARD_SIZE / CELL_SIZE;
const ROCK_SHAPES = [
  [
    [-0.72, -0.18],
    [-0.48, -0.62],
    [0.08, -0.72],
    [0.58, -0.4],
    [0.72, 0.08],
    [0.3, 0.62],
    [-0.34, 0.68],
    [-0.7, 0.26],
  ],
  [
    [-0.64, -0.04],
    [-0.4, -0.56],
    [0.24, -0.68],
    [0.68, -0.18],
    [0.62, 0.42],
    [0.06, 0.72],
    [-0.5, 0.54],
    [-0.74, 0.16],
  ],
  [
    [-0.7, -0.28],
    [-0.22, -0.7],
    [0.38, -0.58],
    [0.72, -0.02],
    [0.56, 0.54],
    [0.04, 0.74],
    [-0.5, 0.52],
    [-0.76, 0.04],
  ],
  [
    [-0.62, -0.46],
    [-0.08, -0.72],
    [0.44, -0.52],
    [0.76, -0.02],
    [0.52, 0.58],
    [-0.04, 0.7],
    [-0.54, 0.5],
    [-0.74, 0.02],
  ],
  [
    [-0.74, -0.08],
    [-0.54, -0.58],
    [0.02, -0.7],
    [0.56, -0.46],
    [0.72, 0.12],
    [0.4, 0.62],
    [-0.22, 0.72],
    [-0.68, 0.34],
  ],
  [
    [-0.66, -0.36],
    [-0.28, -0.7],
    [0.24, -0.64],
    [0.68, -0.26],
    [0.74, 0.26],
    [0.28, 0.7],
    [-0.36, 0.62],
    [-0.76, 0.12],
  ],
  [
    [-0.72, -0.22],
    [-0.42, -0.68],
    [0.18, -0.66],
    [0.66, -0.34],
    [0.68, 0.22],
    [0.3, 0.7],
    [-0.3, 0.64],
    [-0.76, 0.18],
  ],
  [
    [-0.6, -0.52],
    [-0.14, -0.74],
    [0.42, -0.58],
    [0.74, -0.1],
    [0.62, 0.46],
    [0.12, 0.74],
    [-0.44, 0.58],
    [-0.78, 0.04],
  ],
];
const SNAKE_STYLE_KEYS = ["sketch", "classic", "colorful", "cobra"];

let snake = [];
let direction = { x: 1, y: 0 };
let queuedDirection = { x: 1, y: 0 };
let pendingGrowth = 0;
let obstacles = [];
let enemySnakes = [];
let running = false;
let gameOver = false;
let startedAt = 0;
let elapsedBeforeStop = 0;
let lastStepAt = 0;
let appliedGrowthSteps = 0;
let nextObstacleSpawnAt = DEFAULT_OBSTACLE_INTERVAL_MS;
let nextEnemySpawnAt = DEFAULT_ENEMY_SPAWN_INTERVAL_MS;
let animationFrameId = 0;
let lastDisplayedTenths = -1;
let powerUp = null;
let pendingPowerUpSpawns = [];
let poweredUpUntil = 0;
let activeMode = null;
let classicScore = 0;
let competitiveHighScore = 0;
let previousHighScore = 0;
const highScoreStore = createHighScoreStore();
const classicHighScoreStore = createHighScoreStore(
  globalThis.localStorage,
  CLASSIC_HIGH_SCORE_KEY,
);
const settings = {
  moveIntervalMs: DEFAULT_MOVE_INTERVAL_MS,
  growthIntervalMs: DEFAULT_GROWTH_INTERVAL_MS,
  obstacleIntervalMs: DEFAULT_OBSTACLE_INTERVAL_MS,
  enemySpawnIntervalMs: DEFAULT_ENEMY_SPAWN_INTERVAL_MS,
  obstaclesEnabled: true,
  enemySnakesEnabled: true,
  snakeStyle: "sketch",
};

function createInitialSnake() {
  const center = Math.floor(GRID_SIZE / 2);
  snake = Array.from({ length: INITIAL_LENGTH }, (_, index) => ({
    x: center - index,
    y: center,
  }));
}

function createObstacleCell(x, y) {
  return {
    x,
    y,
    shapeIndex: Math.floor(Math.random() * ROCK_SHAPES.length),
    rotation: Math.random() * Math.PI * 2,
  };
}

function createEnemySnake(x, y, initialDirection = { x: 1, y: 0 }) {
  return {
    segments: Array.from({ length: ENEMY_LENGTH }, (_, index) => ({
      x: x - initialDirection.x * index,
      y: y - initialDirection.y * index,
    })),
    direction: { ...initialDirection },
    lastMoveAt: 0,
    style: SNAKE_STYLE_KEYS[Math.floor(Math.random() * SNAKE_STYLE_KEYS.length)],
  };
}

function getElapsedTime() {
  if (running) {
    return performance.now() - startedAt;
  }

  return elapsedBeforeStop;
}

function isPoweredUp(elapsed = getElapsedTime()) {
  return elapsed < poweredUpUntil;
}

function isOccupied(cell) {
  return (
    snake.some((segment) => segment.x === cell.x && segment.y === cell.y) ||
    enemySnakes.some((enemySnake) =>
      enemySnake.segments.some((segment) => segment.x === cell.x && segment.y === cell.y),
    ) ||
    obstacles.some((obstacle) => obstacle.x === cell.x && obstacle.y === cell.y) ||
    (powerUp !== null && cellsMatch(powerUp, cell))
  );
}

function isCellBlocked(cell, options = {}) {
  const {
    ignorePlayerTail = false,
    ignoreEnemySnake = null,
    ignoreEnemyTail = false,
  } = options;

  return checkCellBlocked({
    cell,
    gridSize: GRID_SIZE,
    obstacles,
    playerSegments: snake,
    enemySnakes,
    ignorePlayerTail,
    ignoreEnemySnake,
    ignoreEnemyTail,
  });
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function schedulePowerUpSpawn(spawnAtElapsed) {
  pendingPowerUpSpawns.push(spawnAtElapsed);
  pendingPowerUpSpawns.sort((a, b) => a - b);
}

function createPowerUpCell(x, y, kind = "power-up") {
  return {
    x,
    y,
    kind,
    rotation: Math.random() * Math.PI * 2,
    fruit: Math.random() > 0.5 ? "apple" : "berry",
  };
}

function spawnClassicFood() {
  if (powerUp) return false;
  for (let attempt = 0; attempt < GRID_SIZE * GRID_SIZE; attempt += 1) {
    const cell = createPowerUpCell(
      Math.floor(Math.random() * GRID_SIZE),
      Math.floor(Math.random() * GRID_SIZE),
      "classic-food",
    );
    if (!isOccupied(cell)) {
      powerUp = cell;
      return true;
    }
  }
  return false;
}

function spawnPowerUp() {
  if (powerUp || isPoweredUp()) {
    return false;
  }

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const cell = createPowerUpCell(
      Math.floor(Math.random() * GRID_SIZE),
      Math.floor(Math.random() * GRID_SIZE),
    );

    if (!isOccupied(cell)) {
      powerUp = cell;
      return true;
    }
  }

  return false;
}

function spawnEnemySnake(elapsed = getElapsedTime()) {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const headX = Math.floor(Math.random() * GRID_SIZE);
    const headY = Math.floor(Math.random() * GRID_SIZE);
    const initialDirection = directions[Math.floor(Math.random() * directions.length)];
    const candidate = createEnemySnake(headX, headY, initialDirection);

    const hasSpace = candidate.segments.every((segment) => !isCellBlocked(segment));

    if (hasSpace) {
      candidate.lastMoveAt = performance.now();
      enemySnakes.push(candidate);
      schedulePowerUpSpawn(elapsed + POWER_UP_DELAY_MS);
      return;
    }
  }
}

function getSafeEnemyDirections(enemySnake) {
  const options = shuffleArray([
    enemySnake.direction,
    { x: enemySnake.direction.y, y: -enemySnake.direction.x },
    { x: -enemySnake.direction.y, y: enemySnake.direction.x },
    { x: -enemySnake.direction.x, y: -enemySnake.direction.y },
  ]);

  return options.filter((nextDirection) => {
    const nextHead = {
      x: enemySnake.segments[0].x + nextDirection.x,
      y: enemySnake.segments[0].y + nextDirection.y,
    };

    return !isCellBlocked(nextHead, {
      ignoreEnemySnake: enemySnake,
      ignoreEnemyTail: true,
    });
  });
}

function getProjectedEnemyScore(enemySnake, nextDirection) {
  let score = 0;
  let probe = {
    x: enemySnake.segments[0].x,
    y: enemySnake.segments[0].y,
  };

  for (let step = 1; step <= 4; step += 1) {
    probe = {
      x: probe.x + nextDirection.x,
      y: probe.y + nextDirection.y,
    };

    if (
      isCellBlocked(probe, {
        ignoreEnemySnake: enemySnake,
        ignoreEnemyTail: true,
      })
    ) {
      break;
    }

    score += 6 - step;
  }

  const sideChecks = [
    { x: nextDirection.y, y: -nextDirection.x },
    { x: -nextDirection.y, y: nextDirection.x },
  ];

  sideChecks.forEach((sideDirection) => {
    const sideCell = {
      x: enemySnake.segments[0].x + nextDirection.x + sideDirection.x,
      y: enemySnake.segments[0].y + nextDirection.y + sideDirection.y,
    };

    if (
      !isCellBlocked(sideCell, {
        ignoreEnemySnake: enemySnake,
        ignoreEnemyTail: true,
      })
    ) {
      score += 2;
    }
  });

  if (
    nextDirection.x === enemySnake.direction.x &&
    nextDirection.y === enemySnake.direction.y
  ) {
    score += 1;
  }

  return score + Math.random() * 0.2;
}

function relocateEnemySnake(enemySnake, now) {
  const directions = shuffleArray([
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ]);

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const headX = Math.floor(Math.random() * GRID_SIZE);
    const headY = Math.floor(Math.random() * GRID_SIZE);
    const initialDirection = directions[attempt % directions.length];
    const candidate = createEnemySnake(headX, headY, initialDirection);

    const hasSpace = candidate.segments.every((segment) => !isCellBlocked(segment));

    if (hasSpace) {
      enemySnake.segments = candidate.segments;
      enemySnake.direction = candidate.direction;
      enemySnake.lastMoveAt = now;
      enemySnake.style = enemySnake.style ?? candidate.style;
      return true;
    }
  }

  enemySnake.lastMoveAt = now;
  return false;
}

function moveEnemySnake(enemySnake, now) {
  if (now - enemySnake.lastMoveAt < ENEMY_MOVE_INTERVAL_MS) {
    return;
  }

  const safeDirections = getSafeEnemyDirections(enemySnake);

  if (safeDirections.length === 0) {
    relocateEnemySnake(enemySnake, now);
    return;
  }

  const nextDirection = chooseBestDirection(
    safeDirections,
    (directionOption) => getProjectedEnemyScore(enemySnake, directionOption),
  );
  const nextHead = {
    x: enemySnake.segments[0].x + nextDirection.x,
    y: enemySnake.segments[0].y + nextDirection.y,
  };

  enemySnake.direction = nextDirection;
  enemySnake.segments.unshift(nextHead);
  enemySnake.segments.pop();
  enemySnake.lastMoveAt = now;
}

function createObstacles(count) {
  obstacles = [];

  while (obstacles.length < count) {
    const cell = createObstacleCell(
      Math.floor(Math.random() * GRID_SIZE),
      Math.floor(Math.random() * GRID_SIZE),
    );

    const tooCloseToSnake = snake.some(
      (segment) => Math.abs(segment.x - cell.x) <= 2 && Math.abs(segment.y - cell.y) <= 2,
    );

    if (!tooCloseToSnake && !isOccupied(cell)) {
      obstacles.push(cell);
    }
  }
}

function addObstacle() {
  let attempts = 0;

  while (attempts < 120) {
    const cell = createObstacleCell(
      Math.floor(Math.random() * GRID_SIZE),
      Math.floor(Math.random() * GRID_SIZE),
    );

    const tooCloseToSnake = snake.some(
      (segment) => Math.abs(segment.x - cell.x) <= 1 && Math.abs(segment.y - cell.y) <= 1,
    );

    if (!tooCloseToSnake && !isOccupied(cell)) {
      obstacles.push(cell);
      return;
    }

    attempts += 1;
  }
}

function updateLength() {
  lengthEl.textContent = String(snake.length + pendingGrowth);
}

function updateEnemyRateLabel() {
  enemySnakeRateValue.textContent = `${Math.round(settings.enemySpawnIntervalMs / 1000)}s`;
}

function getCompetitiveScore() {
  return calculateCompetitiveScore(getElapsedTime(), snake.length + pendingGrowth, INITIAL_LENGTH);
}

function configureMode(modeId) {
  const nextMode = getGameMode(modeId);
  if (!nextMode) return;

  activeMode = nextMode;
  const style = settings.snakeStyle;
  settings.moveIntervalMs = DEFAULT_MOVE_INTERVAL_MS;
  settings.growthIntervalMs = DEFAULT_GROWTH_INTERVAL_MS;
  settings.obstacleIntervalMs = DEFAULT_OBSTACLE_INTERVAL_MS;
  settings.enemySpawnIntervalMs = DEFAULT_ENEMY_SPAWN_INTERVAL_MS;
  settings.obstaclesEnabled = nextMode.obstacles;
  settings.enemySnakesEnabled = nextMode.enemies;
  settings.snakeStyle = style;

  speedRateInput.value = "0.15";
  growthRateInput.value = "2.0";
  obstacleRateInput.value = "1.0";
  enemySnakeRateInput.value = "10";
  obstaclesEnabledInput.checked = nextMode.obstacles;
  enemySnakesEnabledInput.checked = nextMode.enemies;

  modeNameEl.textContent = nextMode.name;
  scoreLabelEl.textContent = nextMode.metricLabel;
  bestBlock.hidden = modeId === "sandbox";
  sandboxActions.hidden = modeId !== "sandbox";
  gameplayOptionEls.forEach((element) => {
    element.hidden = !nextMode.editableSettings;
  });
  modeInstructionsEl.textContent = modeId === "sandbox"
    ? "Walls wrap and collisions clear hazards. Tune the board while you play."
    : modeId === "classic"
      ? "Eat fruit to grow. Avoid the walls and your own tail."
      : "Survive as long as possible and beat your local best score.";

  modeMenu.hidden = true;
  gameShell.hidden = false;
  resetGame();
}

function showModeMenu() {
  running = false;
  cancelAnimationFrame(animationFrameId);
  animationFrameId = 0;
  gameShell.hidden = true;
  modeMenu.hidden = false;
}

function syncTimedEvents(elapsed) {
  const growthTarget = activeMode?.automaticGrowth
    ? getGrowthSteps(elapsed, settings.growthIntervalMs)
    : appliedGrowthSteps;
  let lengthChanged = false;

  if (growthTarget > appliedGrowthSteps) {
    pendingGrowth += growthTarget - appliedGrowthSteps;
    appliedGrowthSteps = growthTarget;
    lengthChanged = true;
  }

  if (settings.obstaclesEnabled) {
    let spawned = 0;
    while (elapsed >= nextObstacleSpawnAt && spawned < MAX_TIMED_EVENTS_PER_FRAME) {
      addObstacle();
      nextObstacleSpawnAt += settings.obstacleIntervalMs;
      spawned += 1;
    }
    if (elapsed >= nextObstacleSpawnAt) {
      nextObstacleSpawnAt = elapsed + settings.obstacleIntervalMs;
    }
  } else {
    nextObstacleSpawnAt = elapsed + settings.obstacleIntervalMs;
  }

  if (settings.enemySnakesEnabled) {
    let spawned = 0;
    while (elapsed >= nextEnemySpawnAt && spawned < MAX_TIMED_EVENTS_PER_FRAME) {
      spawnEnemySnake(elapsed);
      nextEnemySpawnAt += settings.enemySpawnIntervalMs;
      spawned += 1;
    }
    if (elapsed >= nextEnemySpawnAt) {
      nextEnemySpawnAt = elapsed + settings.enemySpawnIntervalMs;
    }
  } else {
    nextEnemySpawnAt = elapsed + settings.enemySpawnIntervalMs;
  }

  if (activeMode?.powerUps && !powerUp && !isPoweredUp(elapsed)) {
    while (pendingPowerUpSpawns.length > 0 && pendingPowerUpSpawns[0] <= elapsed) {
      pendingPowerUpSpawns.shift();
      if (spawnPowerUp()) {
        break;
      }
    }
  }

  if (lengthChanged) {
    updateLength();
  }
}

function resetGame() {
  if (!activeMode) return;
  createInitialSnake();
  direction = { x: 1, y: 0 };
  queuedDirection = { x: 1, y: 0 };
  pendingGrowth = 0;
  gameOver = false;
  running = false;
  startedAt = 0;
  elapsedBeforeStop = 0;
  lastStepAt = 0;
  appliedGrowthSteps = 0;
  nextObstacleSpawnAt = settings.obstacleIntervalMs;
  nextEnemySpawnAt = settings.enemySpawnIntervalMs;
  obstacles = [];
  enemySnakes = [];
  powerUp = null;
  pendingPowerUpSpawns = [];
  poweredUpUntil = 0;
  classicScore = 0;
  previousHighScore = activeMode.id === "classic"
    ? classicHighScoreStore.get()
    : highScoreStore.get();
  competitiveHighScore = previousHighScore;
  lastDisplayedTenths = -1;
  if (activeMode.id === "classic") {
    spawnClassicFood();
  } else if (activeMode.powerUps) {
    schedulePowerUpSpawn(POWER_UP_DELAY_MS);
  }
  updateLength();
  updateEnemyRateLabel();
  updateScore();
  showOverlay(
    "Press an arrow key to begin",
    activeMode.readyTitle,
    activeMode.readyText,
    "Start Game",
  );
  draw();
}

function showOverlay(label, title, text, buttonText) {
  overlayLabel.textContent = label;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function startGame() {
  if (!activeMode) return;
  if (gameOver) {
    resetGame();
  }

  if (!running) {
    running = true;
    startedAt = performance.now() - elapsedBeforeStop;
    lastStepAt = performance.now();
    hideOverlay();
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(gameLoop);
    }
  }
}

function endGame() {
  running = false;
  gameOver = true;
  elapsedBeforeStop = performance.now() - startedAt;
  let resultText;
  if (activeMode.id === "competitive") {
    const finalScore = getCompetitiveScore();
    const isRecord = highScoreStore.record(finalScore);
    competitiveHighScore = highScoreStore.get();
    resultText = isRecord
      ? `New high score: ${finalScore}! Your previous best was ${previousHighScore}.`
      : `You scored ${finalScore}. Your local best is ${competitiveHighScore}.`;
  } else {
    const isRecord = classicHighScoreStore.record(classicScore);
    const classicBest = classicHighScoreStore.get();
    resultText = isRecord
      ? `New high score: ${classicScore}! Your previous best was ${previousHighScore}.`
      : `You scored ${classicScore}. Your local best is ${classicBest}.`;
  }
  updateScore();
  showOverlay(
    "Game Over",
    "The snake crashed",
    `${resultText} Press Restart or choose Play Again.`,
    "Play Again",
  );
}

function formatTime(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function updateScore() {
  const elapsed = running ? performance.now() - startedAt : elapsedBeforeStop;
  const displayedTenths = Math.floor(elapsed / 100);
  if (activeMode?.id === "sandbox" && displayedTenths === lastDisplayedTenths) {
    return;
  }
  lastDisplayedTenths = displayedTenths;
  if (activeMode?.id === "competitive") {
    const score = getCompetitiveScore();
    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(competitiveHighScore);
    bestBlock.classList.toggle("new-record", score > previousHighScore);
  } else if (activeMode?.id === "classic") {
    scoreEl.textContent = String(classicScore);
    bestScoreEl.textContent = String(classicHighScoreStore.get());
    bestBlock.classList.toggle("new-record", classicScore > previousHighScore);
  } else {
    scoreEl.textContent = formatTime(elapsed);
  }
}

function parseIntervalInput(input, fallbackMs) {
  const seconds = Number.parseFloat(input.value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    input.value = (fallbackMs / 1000).toFixed(1);
    return fallbackMs;
  }

  const clampedMs = Math.max(MIN_INTERVAL_MS, Math.round(seconds * 1000));
  input.value = (clampedMs / 1000).toFixed(1);
  return clampedMs;
}

function parseMoveIntervalInput(input, fallbackMs) {
  const seconds = Number.parseFloat(input.value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    input.value = (fallbackMs / 1000).toFixed(2);
    return fallbackMs;
  }

  const clampedMs = Math.max(MIN_MOVE_INTERVAL_MS, Math.round(seconds * 1000));
  input.value = (clampedMs / 1000).toFixed(2);
  return clampedMs;
}

function applySettings() {
  const enemySpawnSeconds = Number.parseFloat(enemySnakeRateInput.value);

  settings.moveIntervalMs = parseMoveIntervalInput(
    speedRateInput,
    settings.moveIntervalMs,
  );
  settings.obstacleIntervalMs = parseIntervalInput(
    obstacleRateInput,
    settings.obstacleIntervalMs,
  );
  settings.growthIntervalMs = parseIntervalInput(
    growthRateInput,
    settings.growthIntervalMs,
  );
  settings.obstaclesEnabled = obstaclesEnabledInput.checked;
  settings.enemySnakesEnabled = enemySnakesEnabledInput.checked;
  settings.snakeStyle = snakeStyleInput.value || "sketch";
  settings.enemySpawnIntervalMs = Number.isFinite(enemySpawnSeconds)
    ? Math.max(5000, Math.round(enemySpawnSeconds * 1000))
    : settings.enemySpawnIntervalMs;
  enemySnakeRateInput.value = String(Math.round(settings.enemySpawnIntervalMs / 1000));
  updateEnemyRateLabel();

  if (running) {
    const elapsed = performance.now() - startedAt;
    nextObstacleSpawnAt = elapsed + settings.obstacleIntervalMs;
    nextEnemySpawnAt = elapsed + settings.enemySpawnIntervalMs;

    if (!settings.obstaclesEnabled) {
      obstacles = [];
    }

    if (!settings.enemySnakesEnabled) {
      enemySnakes = [];
    }

    syncTimedEvents(elapsed);
  } else {
    if (!settings.obstaclesEnabled) {
      obstacles = [];
    }

    if (!settings.enemySnakesEnabled) {
      enemySnakes = [];
    }
  }

  draw();
}

let snakeThemesCache = null;

function getSnakeThemes() {
  snakeThemesCache ??= {
    sketch: {
      mode: "doodle",
      dark: "#0f0f0f",
      mid: "#fbfbf7",
      amber: "#f4f4ee",
      light: "#ffffff",
      patternDark: "rgba(0, 0, 0, 0.9)",
      patternLight: "rgba(0, 0, 0, 0.85)",
      highlight: "rgba(0, 0, 0, 0.95)",
      shadow: "rgba(0, 0, 0, 0.12)",
      hoodDark: "#0c0c0c",
      hoodMid: "#ffffff",
      hoodAmber: "#f2f2ec",
      hoodLight: "#ffffff",
      headDark: "#0c0c0c",
      headMid: "#ffffff",
      headLight: "#ffffff",
      eyeGlow: "rgba(0, 0, 0, 1)",
    },
    classic: {
      mode: "natural",
      dark: "#184534",
      mid: "#2d7d5d",
      amber: "#4ba77a",
      light: "#bfe6ce",
      patternDark: "rgba(15, 58, 40, 0.42)",
      patternLight: "rgba(231, 244, 202, 0.24)",
      highlight: "rgba(228, 247, 214, 0.2)",
      shadow: "rgba(10, 35, 23, 0.22)",
      hoodDark: "#154130",
      hoodMid: "#2f7d5d",
      hoodAmber: "#4ba77a",
      hoodLight: "#bfe6ce",
      headDark: "#133828",
      headMid: "#2d7d5d",
      headLight: "#bfe6ce",
      eyeGlow: "rgba(241, 248, 166, 0.82)",
    },
    colorful: {
      mode: "natural",
      dark: "#8b3f2f",
      mid: "#c4573a",
      amber: "#d49a35",
      light: "#f1df9c",
      patternDark: "rgba(73, 33, 20, 0.52)",
      patternLight: "rgba(233, 192, 88, 0.34)",
      highlight: "rgba(255, 244, 214, 0.18)",
      shadow: "rgba(54, 29, 17, 0.18)",
      hoodDark: "#4a447e",
      hoodMid: "#d76a48",
      hoodAmber: "#d6942f",
      hoodLight: "#f0df9d",
      headDark: "#4a447e",
      headMid: "#924338",
      headLight: "#f0df9d",
      eyeGlow: "rgba(255, 214, 124, 0.78)",
    },
    cobra: {
      mode: "natural",
      dark: "#2f241d",
      mid: "#5f4636",
      amber: "#c08a3c",
      light: "#efdba0",
      patternDark: "rgba(18, 13, 10, 0.48)",
      patternLight: "rgba(186, 133, 59, 0.28)",
      highlight: "rgba(250, 239, 207, 0.15)",
      shadow: "rgba(24, 18, 14, 0.22)",
      hoodDark: "#241b16",
      hoodMid: "#4f3b2d",
      hoodAmber: "#7a5a38",
      hoodLight: "#d1a55b",
      headDark: "#201813",
      headMid: "#4a3728",
      headLight: "#ddb268",
      eyeGlow: "rgba(255, 214, 124, 0.75)",
    },
  };
  return snakeThemesCache;
}

function getPlayerSnakeTheme() {
  const themes = getSnakeThemes();
  return themes[settings.snakeStyle] ?? themes.sketch;
}

function getCurrentSpeed() {
  return calculateCurrentSpeed({
    moveIntervalMs: settings.moveIntervalMs,
    snakeLength: snake.length,
    initialLength: INITIAL_LENGTH,
    speedStep: SPEED_STEP,
    minSpeed: MIN_SPEED,
  });
}

function canTurn(nextDirection) {
  return isAllowedTurn(direction, nextDirection);
}

function queueDirection(nextDirection) {
  if (canTurn(nextDirection)) {
    queuedDirection = nextDirection;
  }
}

function beginRunIfNeeded() {
  if (!running) {
    startGame();
  }
}

function handleDirectionInput(nextDirection) {
  if (!activeMode || !modeMenu.hidden) return;
  beginRunIfNeeded();
  queueDirection(nextDirection);
}

function getReferencePoint() {
  if (snake.length > 0) {
    const head = getCellCenter(snake[0]);
    return head;
  }

  return {
    x: BOARD_SIZE / 2,
    y: BOARD_SIZE / 2,
  };
}

function moveSnake() {
  const elapsed = getElapsedTime();
  direction = queuedDirection;

  const head = snake[0];
  let nextHead = getNextHead(head, direction);

  let hitWall =
    nextHead.x < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y < 0 ||
    nextHead.y >= GRID_SIZE;

  if (hitWall && activeMode.wallBehavior === "wrap") {
    nextHead = wrapCell(nextHead, GRID_SIZE);
    hitWall = false;
  }

  const hitObstacle = obstacles.some(
    (obstacle) => obstacle.x === nextHead.x && obstacle.y === nextHead.y,
  );
  const hitEnemySnakes = enemiesAtCell(enemySnakes, nextHead);

  const willGrow = pendingGrowth > 0;
  const bodyToCheck = willGrow ? snake : snake.slice(0, -1);
  const hitSelf = bodyToCheck.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
  );

  if (
    hitWall ||
    (activeMode.selfCollision && hitSelf) ||
    (!isPoweredUp(elapsed) && hitObstacle) ||
    (!isPoweredUp(elapsed) && hitEnemySnakes.length > 0)
  ) {
    if (activeMode.id !== "sandbox") {
      endGame();
      return;
    }
  }

  if ((isPoweredUp(elapsed) || activeMode.id === "sandbox") && hitObstacle) {
    obstacles = obstacles.filter((obstacle) => !cellsMatch(obstacle, nextHead));
  }

  if ((isPoweredUp(elapsed) || activeMode.id === "sandbox") && hitEnemySnakes.length > 0) {
    enemySnakes = enemySnakes.filter(
      (enemySnake) => !hitEnemySnakes.includes(enemySnake),
    );
  }

  snake.unshift(nextHead);

  if (powerUp && cellsMatch(powerUp, nextHead)) {
    const itemKind = powerUp.kind;
    powerUp = null;
    if (itemKind === "classic-food") {
      pendingGrowth += 1;
      classicScore += 100;
      spawnClassicFood();
    } else {
      poweredUpUntil = elapsed + POWER_UP_DURATION_MS;
    }
  }

  if (pendingGrowth > 0) {
    pendingGrowth -= 1;
  } else {
    snake.pop();
  }

  updateLength();
}

function drawRoundedCell(cell, fillStyle, radius = 8) {
  const x = cell.x * CELL_SIZE + 3;
  const y = cell.y * CELL_SIZE + 3;
  const size = CELL_SIZE - 6;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + size, y, x + size, y + size, radius);
  ctx.arcTo(x + size, y + size, x, y + size, radius);
  ctx.arcTo(x, y + size, x, y, radius);
  ctx.arcTo(x, y, x + size, y, radius);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function getCellCenter(cell) {
  return {
    x: cell.x * CELL_SIZE + CELL_SIZE / 2,
    y: cell.y * CELL_SIZE + CELL_SIZE / 2,
  };
}

function getDirectionVector(fromCell, toCell, fallback) {
  if (!toCell) {
    return fallback;
  }

  const dx = toCell.x - fromCell.x;
  const dy = toCell.y - fromCell.y;
  const magnitude = Math.hypot(dx, dy) || 1;
  return { x: dx / magnitude, y: dy / magnitude };
}

function drawScaleTexture(points, widths) {
  ctx.save();
  ctx.strokeStyle = "rgba(236, 220, 176, 0.14)";
  ctx.lineWidth = 0.8;

  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1];
    const point = points[index];
    const next = points[index + 1];
    const direction = getDirectionVector(prev, next, { x: 1, y: 0 });
    const normal = { x: -direction.y, y: direction.x };
    const halfWidth = widths[index] * 0.48;

    for (let stripe = -0.5; stripe <= 0.5; stripe += 0.5) {
      const cx = point.x + normal.x * halfWidth * stripe;
      const cy = point.y + normal.y * halfWidth * stripe;
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        Math.max(2.8, widths[index] * 0.22),
        Math.atan2(normal.y, normal.x) + Math.PI * 0.18,
        Math.atan2(normal.y, normal.x) + Math.PI * 0.82,
      );
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawBody(segments = snake, facing = direction, theme = {}) {
  if (segments.length < 2) {
    return;
  }

  const palette = {
    dark: theme.dark ?? "#0f0f0f",
    mid: theme.mid ?? "#fbfbf7",
    amber: theme.amber ?? "#f4f4ee",
    light: theme.light ?? "#ffffff",
    patternDark: theme.patternDark ?? "rgba(0, 0, 0, 0.9)",
    patternLight: theme.patternLight ?? "rgba(0, 0, 0, 0.85)",
    highlight: theme.highlight ?? "rgba(0, 0, 0, 0.95)",
    shadow: theme.shadow ?? "rgba(0, 0, 0, 0.12)",
    mode: theme.mode ?? "doodle",
  };

  const points = segments.map(getCellCenter);
  const widths = points.map((_, index) => {
    const ratio = 1 - index / Math.max(1, segments.length - 1);
    return CELL_SIZE * (0.28 + ratio * 0.18);
  });

  const left = [];
  const right = [];

  for (let index = 0; index < points.length; index += 1) {
    const prev = points[index - 1] ?? points[index];
    const next = points[index + 1] ?? points[index];
    const segmentDirection = getDirectionVector(prev, next, {
      x: facing.x,
      y: facing.y,
    });
    const normal = { x: -segmentDirection.y, y: segmentDirection.x };
    const halfWidth = widths[index] / 2;

    left.push({
      x: points[index].x + normal.x * halfWidth,
      y: points[index].y + normal.y * halfWidth,
    });
    right.push({
      x: points[index].x - normal.x * halfWidth,
      y: points[index].y - normal.y * halfWidth,
    });
  }

  const shadow = ctx.createLinearGradient(0, points[0].y - 10, 0, points[0].y + 40);
  shadow.addColorStop(0, palette.shadow);
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.strokeStyle = shadow;
  ctx.lineWidth = widths[0] + 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y + 3);
  for (let index = 1; index < points.length; index += 1) {
    const midX = (points[index - 1].x + points[index].x) / 2;
    const midY = (points[index - 1].y + points[index].y) / 2 + 3;
    ctx.quadraticCurveTo(points[index - 1].x, points[index - 1].y + 3, midX, midY);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let index = 1; index < left.length; index += 1) {
    const midX = (left[index - 1].x + left[index].x) / 2;
    const midY = (left[index - 1].y + left[index].y) / 2;
    ctx.quadraticCurveTo(left[index - 1].x, left[index - 1].y, midX, midY);
  }
  for (let index = right.length - 1; index >= 0; index -= 1) {
    const current = right[index];
    const nextPoint = right[index - 1] ?? right[index];
    const midX = (current.x + nextPoint.x) / 2;
    const midY = (current.y + nextPoint.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }
  ctx.closePath();

  const boundsTop = Math.min(...points.map((point) => point.y)) - widths[0];
  const boundsBottom = Math.max(...points.map((point) => point.y)) + widths[0];
  const bodyGradient = ctx.createLinearGradient(0, boundsTop, 0, boundsBottom);
  bodyGradient.addColorStop(0, palette.mid);
  bodyGradient.addColorStop(0.28, palette.dark);
  bodyGradient.addColorStop(0.54, palette.mid);
  bodyGradient.addColorStop(0.78, palette.amber);
  bodyGradient.addColorStop(1, palette.light);
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  if (palette.mode === "doodle") {
    ctx.strokeStyle = palette.highlight;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  ctx.save();
  ctx.clip();

  for (let index = 0; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    const spine = getDirectionVector(point, next, { x: facing.x, y: facing.y });
    const normal = { x: -spine.y, y: spine.x };
    const size = widths[index] * 0.42;

    if (palette.mode === "doodle") {
      ctx.strokeStyle = index % 2 === 0 ? palette.patternDark : palette.patternLight;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(point.x + normal.x * size, point.y + normal.y * size);
      ctx.lineTo(point.x - normal.x * size, point.y - normal.y * size);
      ctx.stroke();
    } else {
      ctx.fillStyle = index % 2 === 0 ? palette.patternDark : palette.patternLight;
      ctx.beginPath();
      ctx.moveTo(point.x + spine.x * size * 0.7, point.y + spine.y * size * 0.7);
      ctx.lineTo(point.x + normal.x * size, point.y + normal.y * size * 0.66);
      ctx.lineTo(point.x - spine.x * size * 0.7, point.y - spine.y * size * 0.7);
      ctx.lineTo(point.x - normal.x * size, point.y - normal.y * size * 0.66);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (palette.mode === "natural") {
    drawScaleTexture(points, widths);
  }

  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = palette.mode === "doodle" ? 1.8 : widths[0] * 0.16;
  ctx.beginPath();
  ctx.moveTo(points[0].x - 6, points[0].y - widths[0] * 0.16);
  for (let index = 1; index < points.length; index += 1) {
    const midX = (points[index - 1].x + points[index].x) / 2;
    const midY = (points[index - 1].y + points[index].y) / 2 - widths[index] * 0.14;
    ctx.quadraticCurveTo(points[index - 1].x, points[index - 1].y - widths[index - 1] * 0.14, midX, midY);
  }
  ctx.stroke();
  ctx.restore();
}

function drawHead(segments = snake, facing = direction, theme = {}) {
  if (segments.length === 0) {
    return;
  }

  const head = segments[0];
  const center = getCellCenter(head);
  const neck = segments[1] ?? { x: head.x - facing.x, y: head.y - facing.y };
  const forward = getDirectionVector(neck, head, facing);
  const angle = Math.atan2(forward.y, forward.x);

  const palette = {
    hoodDark: theme.hoodDark ?? "#0c0c0c",
    hoodMid: theme.hoodMid ?? "#ffffff",
    hoodAmber: theme.hoodAmber ?? "#f2f2ec",
    hoodLight: theme.hoodLight ?? "#ffffff",
    headDark: theme.headDark ?? "#0c0c0c",
    headMid: theme.headMid ?? "#ffffff",
    headLight: theme.headLight ?? "#ffffff",
    eyeGlow: theme.eyeGlow ?? "rgba(0, 0, 0, 1)",
    shadow: theme.shadow ?? "rgba(0, 0, 0, 0.12)",
    mode: theme.mode ?? "doodle",
  };

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);

  const shadow = ctx.createRadialGradient(0, 6, 2, 0, 6, 22);
  shadow.addColorStop(0, palette.shadow);
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 6, 17, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (palette.mode === "natural") {
    const hoodGradient = ctx.createLinearGradient(-15, -14, 18, 14);
    hoodGradient.addColorStop(0, palette.hoodMid);
    hoodGradient.addColorStop(0.3, palette.hoodDark);
    hoodGradient.addColorStop(0.62, palette.hoodAmber);
    hoodGradient.addColorStop(1, palette.hoodLight);
    ctx.fillStyle = hoodGradient;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-15, -9.5, -8, -14.5);
    ctx.quadraticCurveTo(2, -16.5, 11, -11);
    ctx.quadraticCurveTo(16.5, -6.5, 18.2, 0);
    ctx.quadraticCurveTo(16.5, 6.5, 11, 11);
    ctx.quadraticCurveTo(2, 16.5, -8, 14.5);
    ctx.quadraticCurveTo(-15, 9.5, -10, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(12, 9, 7, 0.36)";
    ctx.beginPath();
    ctx.ellipse(-3.2, 0, 3.9, 5.7, 0, 0, Math.PI * 2);
    ctx.ellipse(8.4, 0, 4.7, 6.9, 0, 0, Math.PI * 2);
    ctx.fill();

    const headGradient = ctx.createLinearGradient(-12, -8, 18, 10);
    headGradient.addColorStop(0, palette.hoodAmber);
    headGradient.addColorStop(0.34, palette.headMid);
    headGradient.addColorStop(0.66, palette.headDark);
    headGradient.addColorStop(1, palette.headLight);
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.moveTo(-12, -4.2);
    ctx.quadraticCurveTo(-5, -8.8, 6.5, -7.2);
    ctx.quadraticCurveTo(13.5, -5.5, 17.5, 0);
    ctx.quadraticCurveTo(13.5, 5.5, 6.5, 7.2);
    ctx.quadraticCurveTo(-5, 8.8, -12, 4.2);
    ctx.quadraticCurveTo(-9.8, 0, -12, -4.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(35, 24, 17, 0.44)";
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-1, -3.2);
    ctx.lineTo(5.2, 0);
    ctx.lineTo(-1, 3.2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(243, 225, 181, 0.14)";
    ctx.lineWidth = 0.6;
    for (let x = -8; x <= 4; x += 4) {
      ctx.beginPath();
      ctx.arc(x, 0, 3.8, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    const belly = ctx.createLinearGradient(0, -1, 0, 8);
    belly.addColorStop(0, "rgba(246, 223, 158, 0)");
    belly.addColorStop(1, "rgba(246, 223, 158, 0.9)");
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(-0.5, 3.2, 6.6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#120f0d";
    ctx.beginPath();
    ctx.ellipse(7.9, -2.35, 0.72, 1.72, -0.28, 0, Math.PI * 2);
    ctx.ellipse(7.9, 2.35, 0.72, 1.72, 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.eyeGlow;
    ctx.beginPath();
    ctx.arc(8.15, -3.05, 0.26, 0, Math.PI * 2);
    ctx.arc(8.15, 1.75, 0.26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2c2118";
    ctx.beginPath();
    ctx.ellipse(14.1, -0.85, 0.4, 0.8, 0.1, 0, Math.PI * 2);
    ctx.ellipse(14.1, 0.85, 0.4, 0.8, -0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  ctx.fillStyle = palette.hoodMid;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.quadraticCurveTo(-17, -11, -7, -16);
  ctx.quadraticCurveTo(4, -18.5, 12, -12);
  ctx.quadraticCurveTo(18, -6.5, 19, 0);
  ctx.quadraticCurveTo(18, 6.5, 12, 12);
  ctx.quadraticCurveTo(4, 18.5, -7, 16);
  ctx.quadraticCurveTo(-17, 11, -8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = palette.hoodDark;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.fillStyle = palette.headLight;
  ctx.beginPath();
  ctx.moveTo(-9, 8);
  ctx.quadraticCurveTo(-12, -1, -8, -12);
  ctx.quadraticCurveTo(-2, -18, 3, -18);
  ctx.quadraticCurveTo(9, -17, 14, -11);
  ctx.quadraticCurveTo(17, -3, 16, 8);
  ctx.quadraticCurveTo(10, 13, 3, 14);
  ctx.quadraticCurveTo(-4, 13, -9, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = palette.headDark;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.strokeStyle = palette.headDark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-4, -17);
  ctx.quadraticCurveTo(4, -23, 12, -13);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-7, 2.5);
  ctx.lineTo(12.5, 2);
  ctx.stroke();

  for (let stripe = -2; stripe <= 6; stripe += 2) {
    ctx.beginPath();
    ctx.moveTo(-8 + stripe * 0.4, 6 + stripe * 2);
    ctx.lineTo(9 - stripe * 0.25, -1 + stripe * 2);
    ctx.stroke();
  }

  ctx.fillStyle = palette.eyeGlow;
  ctx.beginPath();
  ctx.arc(-1.8, -5.2, 1.65, 0, Math.PI * 2);
  ctx.arc(8.4, -4.6, 1.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = palette.headDark;
  ctx.beginPath();
  ctx.moveTo(-6.2, -4.2);
  ctx.lineTo(1.6, -2.2);
  ctx.moveTo(12.1, -3.6);
  ctx.lineTo(6.1, -2.4);
  ctx.stroke();

  ctx.restore();
}

function drawSnake() {
  const theme = getPlayerSnakeTheme();
  const visualRuns = splitDisjointSegments(snake);
  visualRuns.forEach((segments) => {
    drawBody(segments, direction, theme);
  });
  drawHead(visualRuns[0] ?? [], direction, theme);
}

function drawEnemySnakes() {
  const themes = getSnakeThemes();

  enemySnakes.forEach((enemySnake, index) => {
    const theme = themes[enemySnake.style] ?? themes[SNAKE_STYLE_KEYS[index % SNAKE_STYLE_KEYS.length]];
    drawBody(enemySnake.segments, enemySnake.direction, theme);
    drawHead(enemySnake.segments, enemySnake.direction, theme);
  });
}

function drawRock(obstacle) {
  const centerX = obstacle.x * CELL_SIZE + CELL_SIZE / 2;
  const centerY = obstacle.y * CELL_SIZE + CELL_SIZE / 2;
  const shape = ROCK_SHAPES[obstacle.shapeIndex % ROCK_SHAPES.length];
  const radius = CELL_SIZE * 0.42;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(obstacle.rotation);

  ctx.fillStyle = "rgba(39, 29, 22, 0.22)";
  ctx.beginPath();
  ctx.ellipse(1.5, 7.5, radius * 0.92, radius * 0.54, 0, 0, Math.PI * 2);
  ctx.fill();

  const rockGradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
  rockGradient.addColorStop(0, "#9f8f7b");
  rockGradient.addColorStop(0.32, "#7d6b59");
  rockGradient.addColorStop(0.66, "#5e5042");
  rockGradient.addColorStop(1, "#41372f");

  ctx.beginPath();
  shape.forEach(([x, y], index) => {
    const px = x * radius;
    const py = y * radius;
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.closePath();
  ctx.fillStyle = rockGradient;
  ctx.fill();

  ctx.strokeStyle = "rgba(44, 35, 29, 0.55)";
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 245, 232, 0.18)";
  ctx.beginPath();
  ctx.moveTo(-radius * 0.34, -radius * 0.3);
  ctx.lineTo(radius * 0.1, -radius * 0.44);
  ctx.lineTo(radius * 0.28, -radius * 0.12);
  ctx.lineTo(-radius * 0.06, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(224, 212, 194, 0.12)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.4, 0.06 * radius);
  ctx.lineTo(-radius * 0.08, -radius * 0.08);
  ctx.lineTo(radius * 0.36, radius * 0.22);
  ctx.stroke();

  ctx.restore();
}

function drawPowerUp() {
  if (!powerUp) {
    return;
  }

  const centerX = powerUp.x * CELL_SIZE + CELL_SIZE / 2;
  const centerY = powerUp.y * CELL_SIZE + CELL_SIZE / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(powerUp.rotation);

  const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
  aura.addColorStop(0, "rgba(255, 232, 176, 0.38)");
  aura.addColorStop(1, "rgba(255, 232, 176, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  if (powerUp.fruit === "berry") {
    ctx.fillStyle = "#9336aa";
    ctx.beginPath();
    ctx.arc(-4, 2, 5, 0, Math.PI * 2);
    ctx.arc(2, -1, 5.5, 0, Math.PI * 2);
    ctx.arc(6, 4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.beginPath();
    ctx.arc(0, -2, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4f7b27";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(1, -11);
    ctx.stroke();
  } else {
    const appleGradient = ctx.createLinearGradient(-8, -8, 8, 8);
    appleGradient.addColorStop(0, "#ff8152");
    appleGradient.addColorStop(0.58, "#d93025");
    appleGradient.addColorStop(1, "#9a1b1b");
    ctx.fillStyle = appleGradient;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.bezierCurveTo(8, -10, 10, 2, 0, 10);
    ctx.bezierCurveTo(-10, 2, -8, -10, 0, -8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 244, 227, 0.34)";
    ctx.beginPath();
    ctx.ellipse(-2, -1, 2.6, 1.8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#5a3a20";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.quadraticCurveTo(0, -11, 2, -13);
    ctx.stroke();

    ctx.fillStyle = "#5d9f42";
    ctx.beginPath();
    ctx.ellipse(5, -10, 4.8, 2.8, 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    drawRock(obstacle);
  });
}

function drawPoweredAura() {
  const elapsed = getElapsedTime();

  if (!isPoweredUp(elapsed) || snake.length === 0) {
    return;
  }

  const remainingPowerUpMs = poweredUpUntil - elapsed;
  if (remainingPowerUpMs <= POWER_UP_FLICKER_WARNING_MS) {
    const flickerOn = Math.floor(elapsed / 120) % 2 === 0;
    if (!flickerOn) {
      return;
    }
  }

  const colors = [
    "rgba(255, 64, 64, 0.34)",
    "rgba(255, 166, 0, 0.3)",
    "rgba(255, 232, 77, 0.28)",
    "rgba(87, 218, 83, 0.28)",
    "rgba(67, 172, 255, 0.3)",
    "rgba(166, 88, 255, 0.32)",
  ];

  const visualRuns = splitDisjointSegments(snake);

  colors.forEach((color, index) => {
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 - index * 2;
    ctx.lineWidth = CELL_SIZE * (1.26 - index * 0.1);
    visualRuns.forEach((segments) => {
      const points = segments.map(getCellCenter);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
        const midX = (points[pointIndex - 1].x + points[pointIndex].x) / 2;
        const midY = (points[pointIndex - 1].y + points[pointIndex].y) / 2;
        ctx.quadraticCurveTo(points[pointIndex - 1].x, points[pointIndex - 1].y, midX, midY);
      }
      ctx.stroke();
    });
  });

  ctx.shadowBlur = 0;
}

function renderGrassBackground() {
  const grassGradient = ctx.createLinearGradient(0, 0, 0, BOARD_SIZE);
  grassGradient.addColorStop(0, "#8eb565");
  grassGradient.addColorStop(0.48, "#6f9c4f");
  grassGradient.addColorStop(1, "#5c8744");
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  const patchCenters = [
    [90, 120, 70],
    [240, 88, 54],
    [470, 126, 78],
    [126, 302, 62],
    [328, 260, 86],
    [514, 332, 66],
    [170, 486, 82],
    [410, 494, 72],
  ];

  patchCenters.forEach(([x, y, radius]) => {
    const patch = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    patch.addColorStop(0, "rgba(132, 176, 77, 0.34)");
    patch.addColorStop(0.7, "rgba(96, 146, 60, 0.2)");
    patch.addColorStop(1, "rgba(96, 146, 60, 0)");
    ctx.fillStyle = patch;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  });

  ctx.strokeStyle = "rgba(42, 90, 34, 0.24)";
  ctx.lineWidth = 1.15;

  const tuftCenters = [
    [58, 74], [136, 58], [212, 96], [288, 64], [372, 90], [452, 58], [532, 106],
    [88, 174], [174, 154], [266, 184], [346, 156], [432, 194], [520, 164],
    [64, 276], [146, 250], [228, 292], [316, 266], [408, 284], [492, 252], [560, 304],
    [96, 388], [188, 366], [270, 404], [362, 378], [450, 412], [530, 374],
    [72, 504], [154, 550], [246, 518], [334, 548], [426, 516], [516, 544],
  ];

  tuftCenters.forEach(([x, y], tuftIndex) => {
    const height = 8 + (tuftIndex % 4) * 2;
    const spread = 4 + (tuftIndex % 3);
    for (let blade = -2; blade <= 2; blade += 1) {
      ctx.beginPath();
      ctx.moveTo(x + blade * 1.8, y + 5);
      ctx.quadraticCurveTo(
        x + blade * spread * 0.45,
        y - height * 0.35,
        x + blade * spread,
        y - height,
      );
      ctx.stroke();
    }
  });

}

const backgroundCache = createBackgroundCache(canvas, ctx, renderGrassBackground);

function drawGrassBackground() {
  backgroundCache.paint();
}

function drawBoardGlow() {
  if (snake.length === 0) {
    return;
  }

  const head = snake[0];
  const gradient = ctx.createRadialGradient(
    head.x * CELL_SIZE + CELL_SIZE / 2,
    head.y * CELL_SIZE + CELL_SIZE / 2,
    6,
    head.x * CELL_SIZE + CELL_SIZE / 2,
    head.y * CELL_SIZE + CELL_SIZE / 2,
    70,
  );
  gradient.addColorStop(0, "rgba(59, 156, 116, 0.28)");
  gradient.addColorStop(1, "rgba(59, 156, 116, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
}

function draw() {
  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
  drawGrassBackground();
  drawBoardGlow();
  drawObstacles();
  drawPowerUp();
  drawEnemySnakes();
  if (snake.length > 0) {
    drawPoweredAura();
    drawSnake();
  }
}

function gameLoop(now) {
  updateScore();

  if (running) {
    syncTimedEvents(now - startedAt);
  }

  if (running && now - lastStepAt >= getCurrentSpeed()) {
    const speed = getCurrentSpeed();
    moveSnake();
    lastStepAt = Math.max(lastStepAt + speed, now - speed);
  }

  if (running) {
    enemySnakes.forEach((enemySnake) => {
      moveEnemySnake(enemySnake, now);
    });
  }

  draw();
  if (running) {
    animationFrameId = requestAnimationFrame(gameLoop);
  } else {
    animationFrameId = 0;
  }
}

const unbindInput = bindGameInput({
  canvas,
  boardSize: BOARD_SIZE,
  getReferencePoint,
  onDirection: handleDirectionInput,
});

restartButton.addEventListener("click", resetGame);
changeModeButton.addEventListener("click", showModeMenu);
overlayButton.addEventListener("click", startGame);
obstacleRateInput.addEventListener("change", applySettings);
growthRateInput.addEventListener("change", applySettings);
speedRateInput.addEventListener("change", applySettings);
obstaclesEnabledInput.addEventListener("change", applySettings);
enemySnakesEnabledInput.addEventListener("change", applySettings);
enemySnakeRateInput.addEventListener("input", applySettings);
snakeStyleInput.addEventListener("change", applySettings);
modeButtons.forEach((button) => {
  button.addEventListener("click", () => configureMode(button.dataset.mode));
});
addObstacleButton.addEventListener("click", () => {
  addObstacle();
  draw();
});
addEnemyButton.addEventListener("click", () => {
  spawnEnemySnake();
  draw();
});
addPowerUpButton.addEventListener("click", () => {
  spawnPowerUp();
  draw();
});
clearBoardButton.addEventListener("click", () => {
  obstacles = [];
  enemySnakes = [];
  draw();
});

bestScoreEl.textContent = String(highScoreStore.get());

return {
  reset: resetGame,
  start: startGame,
  destroy() {
    cancelAnimationFrame(animationFrameId);
    unbindInput();
  },
};
}

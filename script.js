const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const lengthEl = document.getElementById("length");
const restartButton = document.getElementById("restart");
const obstacleRateInput = document.getElementById("obstacleRate");
const growthRateInput = document.getElementById("growthRate");
const speedRateInput = document.getElementById("speedRate");
const obstaclesEnabledInput = document.getElementById("obstaclesEnabled");
const enemySnakesEnabledInput = document.getElementById("enemySnakesEnabled");
const enemySnakeRateInput = document.getElementById("enemySnakeRate");
const enemySnakeRateValue = document.getElementById("enemySnakeRateValue");
const overlay = document.getElementById("overlay");
const overlayLabel = document.getElementById("overlayLabel");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayButton = document.getElementById("overlayButton");

const CELL_SIZE = 30;
const GRID_SIZE = canvas.width / CELL_SIZE;
const INITIAL_LENGTH = 4;
const DEFAULT_MOVE_INTERVAL_MS = 150;
const MIN_SPEED = 78;
const SPEED_STEP = 4;
const DEFAULT_GROWTH_INTERVAL_MS = 2000;
const DEFAULT_OBSTACLE_INTERVAL_MS = 1000;
const DEFAULT_ENEMY_SPAWN_INTERVAL_MS = 10000;
const MIN_INTERVAL_MS = 200;
const MIN_MOVE_INTERVAL_MS = 50;
const ENEMY_MOVE_INTERVAL_MS = 190;
const ENEMY_LENGTH = 5;
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
let activePointerId = null;
let pointerAnchor = null;
const settings = {
  moveIntervalMs: DEFAULT_MOVE_INTERVAL_MS,
  growthIntervalMs: DEFAULT_GROWTH_INTERVAL_MS,
  obstacleIntervalMs: DEFAULT_OBSTACLE_INTERVAL_MS,
  enemySpawnIntervalMs: DEFAULT_ENEMY_SPAWN_INTERVAL_MS,
  obstaclesEnabled: true,
  enemySnakesEnabled: true,
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
  };
}

function isOccupied(cell) {
  return (
    snake.some((segment) => segment.x === cell.x && segment.y === cell.y) ||
    enemySnakes.some((enemySnake) =>
      enemySnake.segments.some((segment) => segment.x === cell.x && segment.y === cell.y),
    ) ||
    obstacles.some((obstacle) => obstacle.x === cell.x && obstacle.y === cell.y)
  );
}

function isInsideBoard(cell) {
  return (
    cell.x >= 0 &&
    cell.x < GRID_SIZE &&
    cell.y >= 0 &&
    cell.y < GRID_SIZE
  );
}

function cellsMatch(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isBlockedByObstacles(cell) {
  return obstacles.some((obstacle) => cellsMatch(obstacle, cell));
}

function isBlockedByPlayer(cell, ignoreTail = false) {
  const segmentsToCheck = ignoreTail ? snake.slice(0, -1) : snake;
  return segmentsToCheck.some((segment) => cellsMatch(segment, cell));
}

function isBlockedByEnemySnakes(cell, ignoreSnake = null, ignoreTail = false) {
  return enemySnakes.some((enemySnake) => {
    if (enemySnake === ignoreSnake) {
      const ownSegments = ignoreTail ? enemySnake.segments.slice(0, -1) : enemySnake.segments;
      return ownSegments.some((segment) => cellsMatch(segment, cell));
    }

    return enemySnake.segments.some((segment) => cellsMatch(segment, cell));
  });
}

function isCellBlocked(cell, options = {}) {
  const {
    ignorePlayerTail = false,
    ignoreEnemySnake = null,
    ignoreEnemyTail = false,
  } = options;

  return (
    !isInsideBoard(cell) ||
    isBlockedByObstacles(cell) ||
    isBlockedByPlayer(cell, ignorePlayerTail) ||
    isBlockedByEnemySnakes(cell, ignoreEnemySnake, ignoreEnemyTail)
  );
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function spawnEnemySnake() {
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

function moveEnemySnake(enemySnake, now) {
  if (now - enemySnake.lastMoveAt < ENEMY_MOVE_INTERVAL_MS) {
    return;
  }

  const safeDirections = getSafeEnemyDirections(enemySnake);

  if (safeDirections.length === 0) {
    enemySnake.lastMoveAt = now;
    return;
  }

  const nextDirection = safeDirections[Math.floor(Math.random() * safeDirections.length)];
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

function syncTimedEvents(elapsed) {
  const growthTarget = Math.floor(elapsed / settings.growthIntervalMs);
  let lengthChanged = false;

  if (growthTarget > appliedGrowthSteps) {
    pendingGrowth += growthTarget - appliedGrowthSteps;
    appliedGrowthSteps = growthTarget;
    lengthChanged = true;
  }

  if (settings.obstaclesEnabled) {
    while (elapsed >= nextObstacleSpawnAt) {
      addObstacle();
      nextObstacleSpawnAt += settings.obstacleIntervalMs;
    }
  } else {
    nextObstacleSpawnAt = elapsed + settings.obstacleIntervalMs;
  }

  if (settings.enemySnakesEnabled) {
    while (elapsed >= nextEnemySpawnAt) {
      spawnEnemySnake();
      nextEnemySpawnAt += settings.enemySpawnIntervalMs;
    }
  } else {
    nextEnemySpawnAt = elapsed + settings.enemySpawnIntervalMs;
  }

  if (lengthChanged) {
    updateLength();
  }
}

function resetGame() {
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
  updateLength();
  updateEnemyRateLabel();
  updateScore();
  showOverlay(
    "Press an arrow key to begin",
    "Stay alive as long as you can",
    "The snake grows over time, and obstacles begin appearing one by one after the run starts.",
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
  if (gameOver) {
    resetGame();
  }

  if (!running) {
    running = true;
    startedAt = performance.now() - elapsedBeforeStop;
    lastStepAt = performance.now();
    hideOverlay();
  }
}

function endGame() {
  running = false;
  gameOver = true;
  elapsedBeforeStop = performance.now() - startedAt;
  updateScore();
  showOverlay(
    "Game Over",
    "The snake crashed",
    `You survived ${formatTime(elapsedBeforeStop)}. Press restart or hit an arrow key to try again.`,
    "Play Again",
  );
}

function formatTime(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function updateScore() {
  const elapsed = running ? performance.now() - startedAt : elapsedBeforeStop;
  scoreEl.textContent = formatTime(elapsed);
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

function getCurrentSpeed() {
  return Math.max(
    MIN_SPEED,
    settings.moveIntervalMs - (snake.length - INITIAL_LENGTH) * SPEED_STEP,
  );
}

function canTurn(nextDirection) {
  return !(
    nextDirection.x === -direction.x &&
    nextDirection.y === -direction.y
  );
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
  beginRunIfNeeded();
  queueDirection(nextDirection);
}

function getReferencePoint() {
  if (snake.length > 0) {
    const head = getCellCenter(snake[0]);
    return head;
  }

  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
  };
}

function getDirectionFromDelta(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }

  return dy >= 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function handlePointDirection(point) {
  const reference = getReferencePoint();
  const dx = point.x - reference.x;
  const dy = point.y - reference.y;

  if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
    return;
  }

  handleDirectionInput(getDirectionFromDelta(dx, dy));
}

function moveSnake() {
  direction = queuedDirection;

  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y < 0 ||
    nextHead.y >= GRID_SIZE;

  const hitObstacle = obstacles.some(
    (obstacle) => obstacle.x === nextHead.x && obstacle.y === nextHead.y,
  );
  const hitEnemySnake = enemySnakes.some((enemySnake) =>
    enemySnake.segments.some((segment) => cellsMatch(segment, nextHead)),
  );

  const willGrow = pendingGrowth > 0;
  const bodyToCheck = willGrow ? snake : snake.slice(0, -1);
  const hitSelf = bodyToCheck.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
  );

  if (hitWall || hitObstacle || hitSelf || hitEnemySnake) {
    endGame();
    return;
  }

  snake.unshift(nextHead);

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
  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.save();
  ctx.clip();

  for (let index = 0; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    const spine = getDirectionVector(point, next, { x: facing.x, y: facing.y });
    const normal = { x: -spine.y, y: spine.x };
    const size = widths[index] * 0.42;

    ctx.strokeStyle = index % 2 === 0 ? palette.patternDark : palette.patternLight;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(point.x + normal.x * size, point.y + normal.y * size);
    ctx.lineTo(point.x - normal.x * size, point.y - normal.y * size);
    ctx.stroke();
  }

  drawScaleTexture(points, widths);

  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = 1.8;
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
  drawBody();
  drawHead();
}

function drawEnemySnakes() {
  enemySnakes.forEach((enemySnake, index) => {
    const theme = index % 2 === 0
      ? {
          dark: "#121212",
          mid: "#eef7dd",
          amber: "#d9efb5",
          light: "#ffffff",
          patternDark: "rgba(0, 0, 0, 0.84)",
          patternLight: "rgba(0, 0, 0, 0.84)",
          highlight: "rgba(0, 0, 0, 0.9)",
          hoodDark: "#101010",
          hoodMid: "#f7fff0",
          hoodAmber: "#eef7dd",
          hoodLight: "#ffffff",
          headDark: "#111111",
          headMid: "#f7fff0",
          headLight: "#ffffff",
          eyeGlow: "rgba(0, 0, 0, 1)",
          shadow: "rgba(0, 0, 0, 0.1)",
        }
      : {
          dark: "#111111",
          mid: "#fff8f2",
          amber: "#f6e6d8",
          light: "#ffffff",
          patternDark: "rgba(0, 0, 0, 0.84)",
          patternLight: "rgba(0, 0, 0, 0.84)",
          highlight: "rgba(0, 0, 0, 0.9)",
          hoodDark: "#111111",
          hoodMid: "#fff8f2",
          hoodAmber: "#f6e6d8",
          hoodLight: "#ffffff",
          headDark: "#111111",
          headMid: "#fff8f2",
          headLight: "#ffffff",
          eyeGlow: "rgba(0, 0, 0, 1)",
          shadow: "rgba(0, 0, 0, 0.1)",
        };
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

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    drawRock(obstacle);
  });
}

function drawGrassBackground() {
  const grassGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grassGradient.addColorStop(0, "#8eb565");
  grassGradient.addColorStop(0.48, "#6f9c4f");
  grassGradient.addColorStop(1, "#5c8744");
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrassBackground();
  drawBoardGlow();
  drawObstacles();
  drawEnemySnakes();
  if (snake.length > 0) {
    drawSnake();
  }
}

function gameLoop(now) {
  updateScore();

  if (running) {
    syncTimedEvents(now - startedAt);
  }

  if (running && now - lastStepAt >= getCurrentSpeed()) {
    moveSnake();
    lastStepAt = now;
  }

  if (running) {
    enemySnakes.forEach((enemySnake) => {
      moveEnemySnake(enemySnake, now);
    });
  }

  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const directions = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    W: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    S: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    A: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
    D: { x: 1, y: 0 },
  };

  const nextDirection = directions[event.key];

  if (!nextDirection) {
    return;
  }

  event.preventDefault();
  handleDirectionInput(nextDirection);
});

canvas.addEventListener("pointerdown", (event) => {
  activePointerId = event.pointerId;
  pointerAnchor = getCanvasPoint(event);
  canvas.setPointerCapture(event.pointerId);
  handlePointDirection(pointerAnchor);
});

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId !== activePointerId || !pointerAnchor) {
    return;
  }

  const point = getCanvasPoint(event);
  const dx = point.x - pointerAnchor.x;
  const dy = point.y - pointerAnchor.y;

  if (Math.hypot(dx, dy) < 14) {
    return;
  }

  handleDirectionInput(getDirectionFromDelta(dx, dy));
  pointerAnchor = point;
});

canvas.addEventListener("pointerup", (event) => {
  if (event.pointerId === activePointerId) {
    activePointerId = null;
    pointerAnchor = null;
  }
});

canvas.addEventListener("pointercancel", (event) => {
  if (event.pointerId === activePointerId) {
    activePointerId = null;
    pointerAnchor = null;
  }
});

restartButton.addEventListener("click", resetGame);
overlayButton.addEventListener("click", startGame);
obstacleRateInput.addEventListener("change", applySettings);
growthRateInput.addEventListener("change", applySettings);
speedRateInput.addEventListener("change", applySettings);
obstaclesEnabledInput.addEventListener("change", applySettings);
enemySnakesEnabledInput.addEventListener("change", applySettings);
enemySnakeRateInput.addEventListener("input", applySettings);

resetGame();
applySettings();
animationFrameId = requestAnimationFrame(gameLoop);

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(animationFrameId);
});

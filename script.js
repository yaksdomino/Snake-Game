const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const lengthEl = document.getElementById("length");
const restartButton = document.getElementById("restart");
const obstacleRateInput = document.getElementById("obstacleRate");
const growthRateInput = document.getElementById("growthRate");
const speedRateInput = document.getElementById("speedRate");
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
const MIN_INTERVAL_MS = 200;
const MIN_MOVE_INTERVAL_MS = 50;

let snake = [];
let direction = { x: 1, y: 0 };
let queuedDirection = { x: 1, y: 0 };
let pendingGrowth = 0;
let obstacles = [];
let running = false;
let gameOver = false;
let startedAt = 0;
let elapsedBeforeStop = 0;
let lastStepAt = 0;
let appliedGrowthSteps = 0;
let appliedObstacleSteps = 0;
let animationFrameId = 0;
const settings = {
  moveIntervalMs: DEFAULT_MOVE_INTERVAL_MS,
  growthIntervalMs: DEFAULT_GROWTH_INTERVAL_MS,
  obstacleIntervalMs: DEFAULT_OBSTACLE_INTERVAL_MS,
};

function createInitialSnake() {
  const center = Math.floor(GRID_SIZE / 2);
  snake = Array.from({ length: INITIAL_LENGTH }, (_, index) => ({
    x: center - index,
    y: center,
  }));
}

function isOccupied(cell) {
  return (
    snake.some((segment) => segment.x === cell.x && segment.y === cell.y) ||
    obstacles.some((obstacle) => obstacle.x === cell.x && obstacle.y === cell.y)
  );
}

function createObstacles(count) {
  obstacles = [];

  while (obstacles.length < count) {
    const cell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };

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
    const cell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };

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

function syncTimedEvents(elapsed) {
  const growthTarget = Math.floor(elapsed / settings.growthIntervalMs);
  const obstacleTarget = Math.floor(elapsed / settings.obstacleIntervalMs);
  let lengthChanged = false;

  if (growthTarget > appliedGrowthSteps) {
    pendingGrowth += growthTarget - appliedGrowthSteps;
    appliedGrowthSteps = growthTarget;
    lengthChanged = true;
  }

  if (obstacleTarget > appliedObstacleSteps) {
    for (let index = 0; index < obstacleTarget - appliedObstacleSteps; index += 1) {
      addObstacle();
    }
    appliedObstacleSteps = obstacleTarget;
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
  appliedObstacleSteps = 0;
  obstacles = [];
  updateLength();
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

  if (running) {
    const elapsed = performance.now() - startedAt;
    syncTimedEvents(elapsed);
  }
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

  const willGrow = pendingGrowth > 0;
  const bodyToCheck = willGrow ? snake : snake.slice(0, -1);
  const hitSelf = bodyToCheck.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
  );

  if (hitWall || hitObstacle || hitSelf) {
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

function drawSnake() {
  snake.slice(1).forEach((segment) => {
    drawRoundedCell(segment, "#3b9c74");
  });

  const head = snake[0];
  drawRoundedCell(head, "#1f6f50");

  ctx.fillStyle = "#f5efe1";
  ctx.beginPath();
  ctx.arc(head.x * CELL_SIZE + 11, head.y * CELL_SIZE + 11, 3, 0, Math.PI * 2);
  ctx.arc(head.x * CELL_SIZE + 19, head.y * CELL_SIZE + 11, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    drawRoundedCell(obstacle, "#6a4b37", 7);
    ctx.fillStyle = "rgba(255, 248, 237, 0.38)";
    ctx.fillRect(
      obstacle.x * CELL_SIZE + 10,
      obstacle.y * CELL_SIZE + 9,
      10,
      3,
    );
  });
}

function drawBoardGlow() {
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
  drawBoardGlow();
  drawObstacles();
  drawSnake();
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

  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const directions = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  const nextDirection = directions[event.key];

  if (!nextDirection) {
    return;
  }

  event.preventDefault();

  if (!running) {
    startGame();
  }

  queueDirection(nextDirection);
});

restartButton.addEventListener("click", resetGame);
overlayButton.addEventListener("click", startGame);
obstacleRateInput.addEventListener("change", applySettings);
growthRateInput.addEventListener("change", applySettings);
speedRateInput.addEventListener("change", applySettings);

applySettings();
resetGame();
animationFrameId = requestAnimationFrame(gameLoop);

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(animationFrameId);
});

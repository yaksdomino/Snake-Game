export const GAME_MODES = Object.freeze({
  competitive: Object.freeze({
    id: "competitive",
    name: "Competitive",
    metricLabel: "Score",
    editableSettings: false,
    automaticGrowth: true,
    obstacles: true,
    enemies: true,
    powerUps: true,
    wallBehavior: "crash",
    selfCollision: true,
    readyTitle: "Outlast the arena",
    readyText: "Grow over time, dodge new hazards, collect power-ups, and beat your local best score.",
  }),
  sandbox: Object.freeze({
    id: "sandbox",
    name: "Sandbox",
    metricLabel: "Time",
    editableSettings: true,
    automaticGrowth: true,
    obstacles: true,
    enemies: true,
    powerUps: true,
    wallBehavior: "wrap",
    selfCollision: false,
    readyTitle: "Build your own arena",
    readyText: "Tune every setting while you play. Walls wrap and collisions never end the run.",
  }),
  classic: Object.freeze({
    id: "classic",
    name: "Classic",
    metricLabel: "Score",
    editableSettings: false,
    automaticGrowth: false,
    obstacles: false,
    enemies: false,
    powerUps: false,
    wallBehavior: "crash",
    selfCollision: true,
    readyTitle: "Eat, grow, repeat",
    readyText: "Collect fruit to grow. Avoid the walls and your own tail.",
  }),
});

export function getGameMode(modeId) {
  return GAME_MODES[modeId] ?? null;
}

export function calculateCompetitiveScore(elapsedMs, snakeLength, initialLength) {
  const survivalPoints = Math.floor(Math.max(0, elapsedMs) / 100);
  const growthPoints = Math.max(0, snakeLength - initialLength) * 50;
  return survivalPoints + growthPoints;
}

export function wrapCell(cell, gridSize) {
  return {
    x: (cell.x + gridSize) % gridSize,
    y: (cell.y + gridSize) % gridSize,
  };
}

import { cellsMatch, isInsideBoard } from "./rules.js";

export function containsCell(cells, cell, ignoreLast = false) {
  const limit = ignoreLast ? Math.max(0, cells.length - 1) : cells.length;
  for (let index = 0; index < limit; index += 1) {
    if (cellsMatch(cells[index], cell)) return true;
  }
  return false;
}

export function enemiesAtCell(enemySnakes, cell) {
  return enemySnakes.filter((enemySnake) =>
    containsCell(enemySnake.segments, cell),
  );
}

export function isCellBlocked({
  cell,
  gridSize,
  obstacles,
  playerSegments,
  enemySnakes,
  ignorePlayerTail = false,
  ignoreEnemySnake = null,
  ignoreEnemyTail = false,
}) {
  if (!isInsideBoard(cell, gridSize)) return true;
  if (containsCell(obstacles, cell)) return true;
  if (containsCell(playerSegments, cell, ignorePlayerTail)) return true;

  return enemySnakes.some((enemySnake) =>
    containsCell(
      enemySnake.segments,
      cell,
      enemySnake === ignoreEnemySnake && ignoreEnemyTail,
    ),
  );
}

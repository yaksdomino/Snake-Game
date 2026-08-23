export function cellsMatch(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function isInsideBoard(cell, gridSize) {
  return cell.x >= 0 && cell.x < gridSize && cell.y >= 0 && cell.y < gridSize;
}

export function getNextHead(head, direction) {
  return { x: head.x + direction.x, y: head.y + direction.y };
}

export function canTurn(currentDirection, nextDirection) {
  return !(
    nextDirection.x === -currentDirection.x &&
    nextDirection.y === -currentDirection.y
  );
}

export function getGrowthSteps(elapsed, intervalMs) {
  return Math.floor(elapsed / intervalMs);
}

export function getCurrentSpeed({
  moveIntervalMs,
  snakeLength,
  initialLength,
  speedStep,
  minSpeed,
}) {
  return Math.max(
    minSpeed,
    moveIntervalMs - (snakeLength - initialLength) * speedStep,
  );
}

export function getDirectionFromDelta(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }

  return dy >= 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
}

export function splitDisjointSegments(segments) {
  if (segments.length === 0) return [];

  const runs = [[segments[0]]];
  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1];
    const current = segments[index];
    const isAdjacent =
      Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y) === 1;

    if (!isAdjacent) {
      runs.push([]);
    }
    runs[runs.length - 1].push(current);
  }

  return runs;
}

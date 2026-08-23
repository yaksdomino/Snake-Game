export function chooseBestDirection(safeDirections, scoreDirection) {
  let bestDirection = safeDirections[0] ?? null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const direction of safeDirections) {
    const score = scoreDirection(direction);
    if (score > bestScore) {
      bestDirection = direction;
      bestScore = score;
    }
  }

  return bestDirection;
}

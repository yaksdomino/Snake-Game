export const COMPETITIVE_HIGH_SCORE_KEY = "snakeGame.competitiveHighScore.v1";
export const CLASSIC_HIGH_SCORE_KEY = "snakeGame.classicHighScore.v1";

function validScore(value) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 ? Math.floor(score) : 0;
}

export function createHighScoreStore(
  storage = globalThis.localStorage,
  key = COMPETITIVE_HIGH_SCORE_KEY,
) {
  let sessionScore = 0;

  try {
    sessionScore = validScore(storage?.getItem(key));
  } catch {
    sessionScore = 0;
  }

  return {
    get() {
      return sessionScore;
    },
    record(score) {
      const nextScore = validScore(score);
      if (nextScore <= sessionScore) return false;
      sessionScore = nextScore;
      try {
        storage?.setItem(key, String(nextScore));
      } catch {
        // The in-memory record still works when persistent storage is unavailable.
      }
      return true;
    },
  };
}

import { createGameController } from "./src/game-controller.js";

const game = createGameController();

window.addEventListener("beforeunload", () => game.destroy(), { once: true });

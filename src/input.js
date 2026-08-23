import { KEY_DIRECTIONS } from "./constants.js";

export function bindGameInput({ canvas, boardSize, getReferencePoint, onDirection }) {
  let activePointerId = null;
  let pointerAnchor = null;

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (boardSize / rect.width),
      y: (event.clientY - rect.top) * (boardSize / rect.height),
    };
  }

  function directionFromDelta(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx >= 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    }
    return dy >= 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  }

  function handleKeydown(event) {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    onDirection(direction);
  }

  function handlePointerDown(event) {
    activePointerId = event.pointerId;
    pointerAnchor = getCanvasPoint(event);
    canvas.setPointerCapture(event.pointerId);
    const reference = getReferencePoint();
    const dx = pointerAnchor.x - reference.x;
    const dy = pointerAnchor.y - reference.y;
    if (Math.abs(dx) >= 4 || Math.abs(dy) >= 4) {
      onDirection(directionFromDelta(dx, dy));
    }
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId || !pointerAnchor) return;
    const point = getCanvasPoint(event);
    const dx = point.x - pointerAnchor.x;
    const dy = point.y - pointerAnchor.y;
    if (Math.hypot(dx, dy) < 14) return;
    onDirection(directionFromDelta(dx, dy));
    pointerAnchor = point;
  }

  function releasePointer(event) {
    if (event.pointerId === activePointerId) {
      activePointerId = null;
      pointerAnchor = null;
    }
  }

  window.addEventListener("keydown", handleKeydown);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);

  return () => {
    window.removeEventListener("keydown", handleKeydown);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", releasePointer);
    canvas.removeEventListener("pointercancel", releasePointer);
  };
}

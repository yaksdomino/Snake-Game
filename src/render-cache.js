export function createBackgroundCache(canvas, context, drawBackground) {
  let imageData = null;

  return {
    paint() {
      if (!imageData) {
        drawBackground();
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        return;
      }
      context.putImageData(imageData, 0, 0);
    },
    invalidate() {
      imageData = null;
    },
  };
}

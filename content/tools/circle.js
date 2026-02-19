const CircleTool = {
  startX: 0,
  startY: 0,
  snapshot: null,

  onMouseDown(ctx, x, y, state) {
    this.startX = x;
    this.startY = y;
    // Cache pre-draw snapshot for live preview
    this.snapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  },

  onMouseMove(ctx, x, y, state) {
    if (!state.isDrawing || !this.snapshot) return;

    // Restore snapshot to remove previous preview frame
    ctx.putImageData(this.snapshot, 0, 0);

    const radiusX = Math.abs(x - this.startX) / 2;
    const radiusY = Math.abs(y - this.startY) / 2;
    const centerX = this.startX + (x - this.startX) / 2;
    const centerY = this.startY + (y - this.startY) / 2;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.brushSize;
    ctx.stroke();
  },

  onMouseUp(ctx, x, y, state) {
    this.snapshot = null;
  },
};

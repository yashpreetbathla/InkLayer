const RectTool = {
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

    const width = x - this.startX;
    const height = y - this.startY;

    ctx.beginPath();
    ctx.rect(this.startX, this.startY, width, height);
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  },

  onMouseUp(ctx, x, y, state) {
    this.snapshot = null;
  },
};

const FreehandTool = {
  points: [],

  onMouseDown(ctx, x, y, state) {
    this.points = [{ x, y }];
    ctx.beginPath();
    ctx.moveTo(x, y);
  },

  onMouseMove(ctx, x, y, state) {
    if (!state.isDrawing) return;

    this.points.push({ x, y });

    if (this.points.length < 3) {
      ctx.strokeStyle = state.color;
      ctx.lineWidth = state.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
      return;
    }

    // Quadratic bezier smoothing using midpoints between consecutive positions
    const len = this.points.length;
    const p0 = this.points[len - 3];
    const p1 = this.points[len - 2];
    const p2 = this.points[len - 1];

    const midX1 = (p0.x + p1.x) / 2;
    const midY1 = (p0.y + p1.y) / 2;
    const midX2 = (p1.x + p2.x) / 2;
    const midY2 = (p1.y + p2.y) / 2;

    ctx.beginPath();
    ctx.moveTo(midX1, midY1);
    ctx.quadraticCurveTo(p1.x, p1.y, midX2, midY2);
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  },

  onMouseUp(ctx, x, y, state) {
    if (this.points.length === 1) {
      // Just a dot — draw a filled circle
      ctx.beginPath();
      ctx.arc(x, y, state.brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = state.color;
      ctx.fill();
    }
    this.points = [];
  },
};

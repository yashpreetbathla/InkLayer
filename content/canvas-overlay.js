const CanvasOverlay = (() => {
  let canvas = null;
  let ctx = null;
  let active = false;

  function create() {
    if (canvas) return canvas;

    canvas = document.createElement('canvas');
    canvas.id = 'screen-annotate-canvas';
    canvas.style.cssText = [
      'position: fixed !important',
      'top: 0 !important',
      'left: 0 !important',
      'width: 100vw !important',
      'height: 100vh !important',
      'z-index: 2147483646 !important',
      'pointer-events: none !important',
      'cursor: crosshair !important',
    ].join(';');

    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', onResize);

    return canvas;
  }

  function resize() {
    if (!canvas) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Snapshot before resize — resizing the canvas wipes its content
    let snapshot = null;
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) {
        snapshot = null;
      }
    }

    canvas.width = w;
    canvas.height = h;

    // Restore snapshot after resize
    if (snapshot && ctx) {
      ctx.putImageData(snapshot, 0, 0);
    }
  }

  function onResize() {
    resize();
  }

  function activate() {
    if (!canvas) create();
    active = true;
    // Must use setProperty with 'important' to override the !important set in cssText
    canvas.style.setProperty('pointer-events', 'all', 'important');
  }

  function deactivate() {
    active = false;
    if (canvas) {
      canvas.style.setProperty('pointer-events', 'none', 'important');
    }
  }

  function toggle() {
    if (active) {
      deactivate();
    } else {
      activate();
    }
    return active;
  }

  function isActive() {
    return active;
  }

  function getCanvas() {
    return canvas;
  }

  function destroy() {
    if (canvas) {
      canvas.remove();
      canvas = null;
      ctx = null;
    }
    window.removeEventListener('resize', onResize);
    active = false;
  }

  return {
    create,
    activate,
    deactivate,
    toggle,
    isActive,
    getCanvas,
    destroy,
  };
})();

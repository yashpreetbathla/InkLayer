# InkLayer

> Draw, annotate, and capture any webpage — without leaving your browser.

A lightweight Chrome Extension (Manifest V3) that overlays a full-page ink canvas on any website, letting you sketch freehand, drop shapes and arrows, then save or copy the result as a composited PNG (page + annotations).

[![Privacy: No data collected](https://img.shields.io/badge/Privacy-No%20data%20collected-green?style=flat-square)](https://yashpreetbathla.github.io/InkLayer/privacy-policy.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Manifest: V3](https://img.shields.io/badge/Manifest-V3-orange?style=flat-square)](manifest.json)

---

## Screenshots

> _Add your screenshots here_

| Toolbar | Drawing in action  |
|---------|------------------|----------------|
| ![Toolbar](<img width="2856" height="1772" alt="image" src="https://github.com/user-attachments/assets/04fa6aaa-b0b5-47db-a3e4-10ed629f5b05" />

) |![Open And Select](<img width="2864" height="1774" alt="image" src="https://github.com/user-attachments/assets/21503a0a-69c2-468d-933c-6980aad94cdf" />

) | ![Drawing](<img width="2869" height="1794" alt="image" src="https://github.com/user-attachments/assets/70e4daa8-6a34-4079-b330-6840231e1c69" />

) | 

> **Tip:** Create a `docs/screenshots/` folder and drop your images there.

---

## Features

- **Freehand pen** — quadratic bézier smoothing for clean strokes
- **Rectangle & Circle** — live preview while dragging
- **Arrow** — auto-sized arrowhead based on brush size
- **Eraser** — block eraser scaled to brush size
- **Color picker** — full color wheel + 7 quick-access presets
- **Brush size** — slider from 1 px to 30 px
- **Undo** — up to 30 steps, snapshot-based (`Ctrl+Z`)
- **Clear** — wipe annotations with one click (undoable)
- **Save** — composites page screenshot + annotations → downloads PNG
- **Copy** — same composite → writes to clipboard
- **Floating toolbar** — drag anywhere on screen, minimize to a pill
- **Keyboard shortcuts** — full keyboard control

---

## Installation

> No build step. Load directly as an unpacked extension.

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer Mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `screen-annotate/` folder
6. The extension icon appears in your toolbar — pin it for easy access

---

## Usage

### Activating

| Method | Action |
|--------|--------|
| Click the extension icon | Opens popup → click **Activate Annotator** |
| Keyboard | `Alt + Shift + A` on any page |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Alt + Shift + A` | Toggle annotator on / off |
| `Esc` | Close annotator |
| `Ctrl + Z` / `Cmd + Z` | Undo last stroke |
| `F` | Freehand pen |
| `R` | Rectangle |
| `C` | Circle |
| `A` | Arrow |
| `E` | Eraser |

### Saving your work

- **💾 Save** — hides the toolbar, takes a screenshot of the visible page, composites your annotations on top, and downloads a timestamped PNG
- **📋 Copy** — same process, result goes straight to your clipboard

> The live canvas is never modified during save/copy — you can keep drawing afterwards.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Tab                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    Host Page DOM                        │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │   #screen-annotate-canvas  (z-index: MAX-1)     │   │   │
│   │   │   position: fixed, 100vw × 100vh                │   │   │
│   │   │   pointer-events: all (when active)             │   │   │
│   │   │                                                 │   │   │
│   │   │   mousedown ──► DrawingEngine                  │   │   │
│   │   │   mousemove ──► active tool handler            │   │   │
│   │   │   mouseup   ──► tool.onMouseUp                 │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │   #screen-annotate-toolbar  (z-index: MAX)      │   │   │
│   │   │   position: fixed, draggable, minimizable       │   │   │
│   │   │   mousedown stopPropagation (blocks canvas)     │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Content Scripts (isolated world)                             │
│   ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│   │ content.js   │  │drawing-engine  │  │ canvas-overlay   │   │
│   │ entry point  │─►│ undo stack     │─►│ create/activate  │   │
│   │ kb shortcuts │  │ tool routing   │  │ resize + restore │   │
│   │ msg listener │  │ save / copy    │  │ pointer-events   │   │
│   └──────────────┘  └────────────────┘  └──────────────────┘   │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│        freehand.js       rect.js         circle.js             │
│        arrow.js          eraser.js                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │ chrome.runtime.sendMessage
                              │ CAPTURE_SCREENSHOT
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Background Service Worker                          │
│   chrome.tabs.captureVisibleTab → dataUrl → sendResponse        │
└─────────────────────────────────────────────────────────────────┘
```

### Save / Copy Flow

```
User clicks Save or Copy
        │
        ▼
Hide toolbar + canvas (opacity: 0)
        │
   2× rAF wait  ◄── ensures browser repaints before capture
        │
        ▼
chrome.runtime.sendMessage(CAPTURE_SCREENSHOT)
        │
        ▼
Service worker: captureVisibleTab → dataUrl
        │
        ▼
Restore toolbar + canvas visibility
        │
        ▼
Offscreen canvas (same size as viewport)
  ├── drawImage(screenshot)      ◄── page as background
  └── drawImage(live canvas)     ◄── annotations on top
        │
        ▼
  toBlob('image/png')
  ├── Save → URL.createObjectURL → <a download> click
  └── Copy → navigator.clipboard.write(ClipboardItem)
```

---

## File Structure

```
screen-annotate/
├── manifest.json                  # MV3 manifest — permissions, script order
│
├── background/
│   └── service-worker.js          # captureVisibleTab (runs in extension process)
│
├── content/                       # All injected into the host page
│   ├── content.js                 # Entry point, activation, keyboard shortcuts
│   ├── canvas-overlay.js          # Fixed canvas creation, resize, pointer-events
│   ├── drawing-engine.js          # Undo stack, mouse routing, save/copy
│   ├── toolbar.js                 # Draggable/minimizable toolbar DOM + events
│   ├── content.css                # Scoped styles (injected via manifest css key)
│   └── tools/
│       ├── freehand.js            # Bézier-smoothed pen
│       ├── rect.js                # Live-preview rectangle
│       ├── circle.js              # Live-preview ellipse
│       ├── arrow.js               # Shaft + arrowhead
│       └── eraser.js              # clearRect block eraser
│
├── popup/
│   ├── popup.html                 # Extension popup UI
│   └── popup.js                   # Injects scripts if not present, then toggles
│
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Important Things to Know

### 1. Script load order matters
Tools must be defined before `drawing-engine.js` — the engine references `FreehandTool`, `RectTool`, etc. directly. The manifest `js` array enforces this order.

### 2. `pointer-events` must use `setProperty`
The canvas is initialised with `pointer-events: none !important` via `cssText`. A plain `style.pointerEvents = 'all'` assignment **cannot** override `!important`. You must use:
```js
canvas.style.setProperty('pointer-events', 'all', 'important');
```

### 3. `return true` in the service worker is critical
```js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // ...async work...
  return true; // ← without this the channel closes before sendResponse fires
});
```

### 4. Canvas resize wipes content
Setting `canvas.width` or `canvas.height` clears all pixel data. `canvas-overlay.js` always snapshots with `getImageData` before resize and restores with `putImageData` after.

### 5. Live preview pattern for shapes
`rect`, `circle`, and `arrow` cache a `getImageData` snapshot on `mousedown`. Every `mousemove` calls `putImageData` to restore the snapshot, then redraws the shape. Without this, each frame paints a new shape on top of the last.

### 6. Toolbar drag uses capture-phase listeners
```js
document.addEventListener('mousemove', onDragMove, true); // ← true = capture
document.addEventListener('mouseup',   onDragEnd,  true);
```
Bubble-phase listeners would be swallowed by `stopPropagation` calls inside the toolbar, causing the drag to get stuck.

### 7. Minimize anchors position before collapsing
The toolbar defaults to `right: 20px` (no `left`). Minimizing to `width: fit-content` on a `position: fixed` element with only `right` set causes it to stretch across the viewport. The minimize handler reads `getBoundingClientRect()` and pins `left`/`top` first.

### 8. Popup injection without page reload
On first click, `popup.js` probes for `window.__saToggle` via `chrome.scripting.executeScript`. If absent, it injects all scripts programmatically in order, then calls `window.__saToggle()` directly — no `sendMessage` needed post-inject.

### 9. Pages where the extension cannot run
Content scripts are blocked on `chrome://`, `chrome-extension://`, `edge://`, and `about:` URLs. The popup detects these and shows a friendly error instead of silently failing.

### 10. `all_frames: false`
Prevents the canvas and toolbar from being injected into every `<iframe>` on the page, which would cause duplicate canvases and conflicting event listeners.

---

## Permissions

| Permission | Why it's needed |
|------------|----------------|
| `activeTab` | Access the current tab to inject scripts |
| `tabs` | Read `tab.windowId` for `captureVisibleTab` |
| `scripting` | Programmatically inject scripts from the popup |
| `clipboardWrite` | `navigator.clipboard.write()` for the Copy button |
| `host_permissions: <all_urls>` | Allow content script injection on any page |

---

## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 109+ | Fully supported |
| Edge (Chromium) | Fully supported |
| Firefox | Not supported (uses Chrome extension APIs) |
| Safari | Not supported |

---

## Known Limitations

- **Scrolled content** — `captureVisibleTab` captures the visible viewport only, not the full scrollable page
- **Cross-origin iframes** — annotations drawn over an iframe are captured correctly, but the iframe's own content may not render in the screenshot due to browser security restrictions
- **Chrome system pages** — `chrome://newtab`, `chrome://settings`, etc. cannot be annotated
- **High-DPI displays** — the canvas uses CSS pixels; on retina screens the screenshot may be higher resolution than the canvas, causing a slight scale mismatch in the composite

---

## Privacy Policy

InkLayer collects no user data. Nothing is stored remotely or transmitted anywhere — all drawing and screenshot capture happens entirely inside your browser.

Full policy: **[yashpreetbathla.github.io/InkLayer/privacy-policy.html](https://yashpreetbathla.github.io/InkLayer/privacy-policy.html)**

---

## License

MIT — do whatever you want, attribution appreciated.

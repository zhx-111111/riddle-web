// ═════════════════════════════════════════════════════════
// Riddle Web — Tom Riddle's Diary
// v3.9: ultra-smooth ink + HTTP 500 diagnostic + fluent writing
// ═════════════════════════════════════════════════════════

(() => {
'use strict';

// ─── Config (overridden by /api/config) ────────────────
const DEFAULTS = {
  idleTimeoutMs:    1500,
  minDistPx:        0.4,
  maxDistPx:        2.5,
  pressureMinPx:    1.8,
  pressureMaxPx:    6.0,
  pollIntervalMs:   45,
  strokeIntervalMs: 50,
  strokeMaxDurMs:   2200,
  svgStrokeWidth:    2.0,
  maxLines:         20,
  lineHeightPx:     34,
  marginTopPx:      8,
  marginXPx:        28,
  fontSizePx:       26,
  replyFadeDelayMs: 8000,
  fadeDurationMs:   1200,
};

let CFG = { ...DEFAULTS };

// ─── Themes ───────────────────────────────────────────────
const THEMES = {
  diary: {
    name: "Tom's Diary",
    bg: '#0a0a0f', ink: '#e8e8e8', accent: '#7a7a8a',
    font: "'Dancing Script', 'Caveat', cursive",
    pageBg: 'radial-gradient(ellipse at center, #111118 0%, #050508 100%)',
    pageSolid: '#0c0c12',
  },
  parchment: {
    name: 'Parchment', bg: '#f4ead5', ink: '#3a2a1a', accent: '#8a7a6a',
    font: "'Caveat', 'Dancing Script', cursive",
    pageBg: 'radial-gradient(ellipse at center, #f4ead5 0%, #e0d4b8 100%)',
    pageSolid: '#f0e6d0',
  },
  midnight: {
    name: 'Midnight', bg: '#0d1b2a', ink: '#c8d6e5', accent: '#5a7a9a',
    font: "'Caveat', cursive",
    pageBg: 'radial-gradient(ellipse at center, #0d1b2a 0%, #050d18 100%)',
    pageSolid: '#0a1625',
  },
  letter: {
    name: 'Letter', bg: '#fdf6f0', ink: '#2a1a0a', accent: '#c0a080',
    font: "'Dancing Script', cursive",
    pageBg: 'radial-gradient(ellipse at center, #fdf6f0 0%, #f0e4d8 100%)',
    pageSolid: '#faf2ea',
  },
};

let currentTheme = localStorage.getItem('riddle-theme') || 'diary';

// ─── DOM refs ──────────────────────────────────────────────
const canvas           = document.getElementById('writing-canvas');
const ctx              = canvas.getContext('2d', { alpha: true, desynchronized: true });
const svgLayer         = document.getElementById('svg-layer');
const hintText         = document.getElementById('hint-text');
const statusDot        = document.getElementById('status-dot');
const statusText       = document.getElementById('status-text');
const fullscreenBtn    = document.getElementById('fullscreen-btn');
const themeBtns        = document.querySelectorAll('.theme-btn');
const errorOverlay     = document.getElementById('error-overlay');
const errorTitle       = document.getElementById('error-title');
const errorMsg         = document.getElementById('error-msg');
const errorClose       = document.getElementById('error-close');
const writingSurface   = document.getElementById('writing-surface');
const fullscreenToolbar= document.getElementById('floating-toolbar');

// ─── Canvas sizing (rock-solid DPR handling) ─────────────
let DPR = 1;
let resizePending = false;

function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width  * DPR));
  const h = Math.max(1, Math.floor(rect.height * DPR));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyTheme();
}

function scheduleResize() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    resizeCanvas();
  });
}

window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 300));

// ─── Theme ────────────────────────────────────────────────
function applyTheme() {
  const t = THEMES[currentTheme];
  document.body.style.background = t.bg;
  document.body.setAttribute('data-theme', currentTheme);
  document.documentElement.style.setProperty('--ink-color', t.ink);
  document.documentElement.style.setProperty('--accent-color', t.accent);
  document.documentElement.style.setProperty('--page-bg', t.pageBg);
  document.documentElement.style.setProperty('--font-family', t.font);
  if (writingSurface) {
    writingSurface.style.background = t.pageBg;
    writingSurface.style.backgroundColor = t.pageSolid;
  }
  redrawAllStrokes();
}

function setTheme(name) {
  currentTheme = name;
  localStorage.setItem('riddle-theme', name);
  themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === name));
  document.querySelectorAll('.floating-theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === name);
  });
  applyTheme();
}

themeBtns.forEach(btn => { btn.addEventListener('click', () => setTheme(btn.dataset.theme)); });
document.querySelectorAll('.floating-theme-btn').forEach(btn => {
  btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});

// ─── Stroke data model ────────────────────────────────────
let strokes = [];
let currentStroke = null;
let isWriting = false;
let idleTimer = null;
let lastPointerTime = 0;
let renderQueued = false;

// ─── Pointer position (unified for mouse/pen/touch) ───────
function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  let cx, cy, pressure;

  if (e.touches && e.touches.length > 0) {
    cx = e.touches[0].clientX;
    cy = e.touches[0].clientY;
    pressure = e.touches[0].force || 0.5;
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    cx = e.changedTouches[0].clientX;
    cy = e.changedTouches[0].clientY;
    pressure = e.changedTouches[0].force || 0.5;
  } else {
    cx = e.clientX;
    cy = e.clientY;
    pressure = e.pressure || (e.pointerType === 'pen' ? 0.7 : 0.5);
  }

  return {
    x: Math.max(0, Math.min(cx - rect.left, rect.width)),
    y: Math.max(0, Math.min(cy - rect.top, rect.height)),
    pressure: Math.max(0.05, Math.min(1, pressure)),
  };
}

function pressureToWidth(p) {
  return CFG.pressureMinPx + p * (CFG.pressureMaxPx - CFG.pressureMinPx);
}

// ─── Adaptive sampling ─────────────────────────────────────
function shouldSample(p, last) {
  if (!last) return true;
  const dx = p.x - last.x, dy = p.y - last.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const now = performance.now();
  const dt = now - lastPointerTime;
  // Throttle: max ~120Hz
  if (dt < 8) return false;
  // Adaptive: faster movement → denser sampling
  const speed = dist / Math.max(dt, 1);
  const adaptiveMin = Math.max(CFG.minDistPx * 0.4, CFG.minDistPx - speed * 0.1);
  return dist >= adaptiveMin;
}

// ─── Stroke lifecycle ─────────────────────────────────────
function startStroke(p) {
  const w = pressureToWidth(p.pressure);
  currentStroke = {
    points: [{ x: p.x, y: p.y, w: w, p: p.pressure }],
  };
  strokes.push(currentStroke);
  isWriting = true;
  hintText.classList.add('hidden');
  setStatus('writing', 'Writing…');
  lastPointerTime = performance.now();
}

function addPoint(p) {
  if (!currentStroke) return;
  const pts = currentStroke.points;
  const last = pts[pts.length - 1];
  if (!shouldSample(p, last)) return;

  const w = pressureToWidth(p.pressure);
  pts.push({ x: p.x, y: p.y, w: w, p: p.pressure });
  lastPointerTime = performance.now();
  scheduleRender();
}

function endStroke() {
  if (currentStroke && currentStroke.points.length === 1) {
    const p = currentStroke.points[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.w * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = THEMES[currentTheme].ink;
    ctx.fill();
  }
  currentStroke = null;
  isWriting = false;
  setStatus('ready', 'Paused…');
  scheduleIdleTimeout();
}

function scheduleIdleTimeout() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!isWriting && strokes.length > 0) {
      sendToTom();
    }
  }, CFG.idleTimeoutMs);
}

// ═════════════════════════════════════════════════════════
//  SMOOTH INK RENDERING
//  Catmull-Rom → Cubic Bezier, variable width, C1-continuous
// ═════════════════════════════════════════════════════════

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderLatestStrokeIncremental();
  });
}

function renderLatestStrokeIncremental() {
  const s = strokes[strokes.length - 1];
  if (!s || s.points.length < 2) return;

  const pts = s.points;
  const ink = THEMES[currentTheme].ink;

  if (pts.length <= 4) {
    drawStrokeSmooth(s);
    return;
  }

  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;

  const i = pts.length - 2;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(pts.length - 1, i + 2)];

  const c1x = p1.x + (p2.x - p0.x) / 6;
  const c1y = p1.y + (p2.y - p0.y) / 6;
  const c2x = p2.x - (p3.x - p1.x) / 6;
  const c2y = p2.y - (p3.y - p1.y) / 6;

  const steps = Math.max(4, Math.floor(Math.sqrt((p2.x-p1.x)**2 + (p2.y-p1.y)**2) * 2.5));
  const leftEdge = [];
  const rightEdge = [];

  for (let t = 0; t <= steps; t++) {
    const u = t / steps;
    const x = bezier(p1.x, c1x, c2x, p2.x, u);
    const y = bezier(p1.y, c1y, c2y, p2.y, u);

    let tx, ty;
    if (u < 1) {
      const x2 = bezier(p1.x, c1x, c2x, p2.x, u + 0.01);
      const y2 = bezier(p1.y, c1y, c2y, p2.y, u + 0.01);
      tx = x2 - x; ty = y2 - y;
    } else {
      const x2 = bezier(p1.x, c1x, c2x, p2.x, u - 0.01);
      const y2 = bezier(p1.y, c1y, c2y, p2.y, u - 0.01);
      tx = x - x2; ty = y - y2;
    }
    const len = Math.sqrt(tx*tx + ty*ty) || 1;
    const nx = -ty/len, ny = tx/len;
    const w = (p1.w + (p2.w - p1.w) * u) * 0.5;
    leftEdge.push([x + nx*w, y + ny*w]);
    rightEdge.push([x - nx*w, y - ny*w]);
  }

  ctx.beginPath();
  for (let j = 0; j < leftEdge.length; j++) ctx.lineTo(leftEdge[j][0], leftEdge[j][1]);
  for (let j = rightEdge.length - 1; j >= 0; j--) ctx.lineTo(rightEdge[j][0], rightEdge[j][1]);
  ctx.closePath();
  ctx.fill();

  // Subtle ink bleed on the new segment
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = (p1.w + p2.w) * 0.5 * 1.5;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.quadraticCurveTo((p1.x+p2.x)/2, (p1.y+p2.y)/2, p2.x, p2.y);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  ctx.restore();
}

function redrawAllStrokes() {
  if (!canvas.width || !canvas.height) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of strokes) {
    drawStrokeSmooth(s);
  }
}

// ═════════════════════════════════════════════════════════
//  THE SMOOTH STROKE ALGORITHM
//  Variable-width filled shape via Catmull-Rom → Bezier
//  Eliminates aliasing by using shape filling instead of line drawing
// ═════════════════════════════════════════════════════════
function drawStrokeSmooth(stroke) {
  const pts = stroke.points;
  if (pts.length < 2) {
    if (pts.length === 1) {
      const p = pts[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.w * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = THEMES[currentTheme].ink;
      ctx.fill();
    }
    return;
  }

  const ink = THEMES[currentTheme].ink;
  ctx.save();
  ctx.fillStyle = ink;

  // ── Pass 1: Variable-width filled shape ──
  const leftEdge = [];
  const rightEdge = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    const segLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const steps = Math.max(6, Math.floor(segLen * 3));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = bezier(p0.x, c1x, c2x, p2.x, t);
      const y = bezier(p0.y, c1y, c2y, p2.y, t);

      let tx, ty;
      if (s < steps) {
        const x2 = bezier(p0.x, c1x, c2x, p2.x, t + 0.01);
        const y2 = bezier(p0.y, c1y, c2y, p2.y, t + 0.01);
        tx = x2 - x; ty = y2 - y;
      } else {
        const x2 = bezier(p0.x, c1x, c2x, p2.x, t - 0.01);
        const y2 = bezier(p0.y, c1y, c2y, p2.y, t - 0.01);
        tx = x - x2; ty = y - y2;
      }
      const len = Math.sqrt(tx * tx + ty * ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;
      const w = (p1.w + (p2.w - p1.w) * t) * 0.5;
      leftEdge.push([x + nx * w, y + ny * w]);
      rightEdge.push([x - nx * w, y - ny * w]);
    }
  }

  // Fill the outline — this is what eliminates aliasing
  ctx.beginPath();
  for (let i = 0; i < leftEdge.length; i++) {
    if (i === 0) ctx.moveTo(leftEdge[i][0], leftEdge[i][1]);
    else ctx.lineTo(leftEdge[i][0], leftEdge[i][1]);
  }
  for (let i = rightEdge.length - 1; i >= 0; i--) {
    ctx.lineTo(rightEdge[i][0], rightEdge[i][1]);
  }
  ctx.closePath();
  ctx.fill();

  // ── Pass 2: Ink bleed layer (subtle glow, anti-alias) ──
  ctx.globalAlpha = 0.1;
  ctx.lineWidth = stroke.points[0].w * 2.2;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  ctx.restore();
}

function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

// ─── Status & Error UI ──────────────────────────────────────
function setStatus(state, text) {
  statusDot.className = 'status-dot ' + state;
  statusText.innerHTML = text;
}

function showError(title, msg) {
  errorTitle.textContent = title;
  errorMsg.textContent = msg;
  errorOverlay.classList.remove('hidden');
}
errorClose.addEventListener('click', () => errorOverlay.classList.add('hidden'));

// ─── Pointer Event Handlers (PRIMARY) ─────────────────────
function onPointerDown(e) {
  e.preventDefault();
  if (e.pointerType === 'touch' && e.isPrimary === false) return;
  try { canvas.setPointerCapture(e.pointerId); } catch(_) {}
  const p = getPointerPos(e);
  startStroke(p);
}

function onPointerMove(e) {
  if (!isWriting) return;
  e.preventDefault();
  const p = getPointerPos(e);
  addPoint(p);
}

function onPointerUp(e) {
  if (!isWriting) return;
  e.preventDefault();
  try { canvas.releasePointerCapture(e.pointerId); } catch(_) {}
  endStroke();
}

function onPointerCancel() {
  if (isWriting) endStroke();
}

// ─── Touch Event Handlers (FALLBACK) ───────────────────────
function onTouchStart(e) {
  if (e.touches.length > 1) return;
  e.preventDefault();
  const touch = e.touches[0];
  const simEvent = {
    clientX: touch.clientX, clientY: touch.clientY,
    pressure: touch.force || 0.5, pointerType: 'touch',
    preventDefault: () => {},
  };
  startStroke(getPointerPos(simEvent));
}

function onTouchMove(e) {
  if (!isWriting) return;
  e.preventDefault();
  const touch = e.touches[0];
  const simEvent = {
    clientX: touch.clientX, clientY: touch.clientY,
    pressure: touch.force || 0.5, pointerType: 'touch',
    preventDefault: () => {},
  };
  addPoint(getPointerPos(simEvent));
}

function onTouchEnd(e) {
  if (!isWriting) return;
  e.preventDefault();
  endStroke();
}

// ─── Bind events ────────────────────────────────────────────
const supportsPointer = 'PointerEvent' in window;

if (supportsPointer) {
  canvas.addEventListener('pointerdown',   onPointerDown,   { passive: false });
  canvas.addEventListener('pointermove',   onPointerMove,   { passive: false });
  canvas.addEventListener('pointerup',     onPointerUp,     { passive: false });
  canvas.addEventListener('pointercancel', onPointerCancel, { passive: false });
} else {
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',    onTouchEnd,   { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd,  { passive: false });
}

canvas.addEventListener('gesturestart', e => e.preventDefault());
canvas.addEventListener('dblclick', e => e.preventDefault());
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ─── Send to Tom ───────────────────────────────────────────
async function sendToTom() {
  setStatus('thinking', 'The diary is thinking…');
  fadeOutInk();

  const pngData = canvas.toDataURL('image/png');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: pngData,
        sessionId: localStorage.getItem('riddle-sid') || undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      let errMsg = 'HTTP ' + resp.status;
      try {
        const errData = await resp.json();
        errMsg = errData.message || errData.error || errMsg;
      } catch(_) {}
      showError('Tom is silent', errMsg + '\n\nCheck /api/setup for diagnostics.');
      setStatus('ready', 'Write again…');
      return;
    }

    await consumeSSE(resp);
  } catch(e) {
    if (e.name === 'AbortError') {
      showError('Timeout', 'Tom took too long to reply. Check /api/setup');
    } else {
      showError('Connection failed', e.message || 'Network error');
      console.error('[Riddle] Fetch error:', e);
    }
    setStatus('ready', 'Write again…');
  }
}

// ─── SSE Consumer ──────────────────────────────────────────
async function consumeSSE(resp) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let replyLineCount = 0;

  svgLayer.innerHTML = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]' || data === 'DONE') continue;

      try {
        const evt = JSON.parse(data);
        if (evt.type === 'sentence') {
          const clean = filterThinking(evt.text);
          if (clean && clean.trim()) {
            fullText += clean + ' ';
            await animateSentence(clean.trim(), replyLineCount);
            replyLineCount++;
          }
        } else if (evt.type === 'error') {
          showError('Tom is silent', evt.message || evt.text || 'Unknown error');
        } else if (evt.type === 'provider') {
          console.log('[Riddle] Provider:', evt.name, evt.model);
        }
      } catch(e) {
        console.warn('[Riddle] SSE parse error:', e, data.slice(0, 100));
      }
    }
  }

  setStatus('ready', 'Write again…');
  setTimeout(() => { hintText.classList.remove('hidden'); }, 8000);
  setTimeout(() => { fadeAwayAll(); }, CFG.replyFadeDelayMs);
}

function filterThinking(text) {
  if (!text) return '';
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  t = t.replace(/\[think\][\s\S]*?\[\/think\]/gi, '');
  t = t.replace(/^\s*thinking[\s\S]*?\n\n/gmi, '');
  return t.trim();
}

// ─── Full-page fade away ────────────────────────────────────
function fadeAwayAll() {
  for (const child of svgLayer.children) {
    child.style.transition = `opacity ${CFG.fadeDurationMs}ms ease-out`;
    child.style.opacity = '0';
  }

  let fadeAlpha = 1.0;
  const cw = canvas.width, ch = canvas.height;
  const fadeStep = () => {
    fadeAlpha -= 0.03;
    if (fadeAlpha <= 0.02) {
      strokes = [];
      ctx.clearRect(0, 0, cw, ch);
      svgLayer.innerHTML = '';
      return;
    }
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    const tmp = [...strokes];
    ctx.clearRect(0, 0, cw, ch);
    for (const s of tmp) drawStrokeSmooth(s);
    ctx.restore();
    requestAnimationFrame(fadeStep);
  };
  requestAnimationFrame(fadeStep);
}

// ─── Ink fade-out (before sending) ────────────────────────
function fadeOutInk() {
  const startTime = performance.now();
  const duration = CFG.fadeDurationMs * 0.8;
  const savedStrokes = [...strokes];
  const cw = canvas.width, ch = canvas.height;

  function fade() {
    const progress = Math.min((performance.now() - startTime) / duration, 1);
    const alpha = 1 - progress;
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalAlpha = alpha;
    for (const s of savedStrokes) drawStrokeSmooth(s);
    ctx.restore();
    if (progress < 1) {
      requestAnimationFrame(fade);
    } else {
      strokes = [];
      ctx.clearRect(0, 0, cw, ch);
    }
  }
  requestAnimationFrame(fade);
}

// ─── Sentence animation (text → handwritten strokes) ───────
async function animateSentence(text, lineIndex) {
  if (!text || !text.trim()) return;
  if (lineIndex >= CFG.maxLines) return;

  const theme = THEMES[currentTheme];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    if (lineIndex >= CFG.maxLines) break;
    await writeLineWithStrokes(line.trim(), lineIndex, theme);
    lineIndex++;
  }
}

async function writeLineWithStrokes(text, lineIndex, theme) {
  const startY = CFG.marginTopPx + lineIndex * CFG.lineHeightPx;
  const startX = CFG.marginXPx;
  const fontFamily = theme.font || "'Dancing Script', cursive";
  const fontSize = CFG.fontSizePx;

  const bitmap = rasterizeText(text, fontFamily, fontSize);
  if (!bitmap) {
    drawTextFallback(text, startX, startY, theme);
    return;
  }

  thinBitmap(bitmap);
  const strokePaths = traceStrokes(bitmap);

  for (const sp of strokePaths) {
    await drawAnimatedStroke(sp, startX, startY, theme);
  }
}

function drawTextFallback(text, x, y, theme) {
  ctx.save();
  ctx.font = `${CFG.fontSizePx}px ${theme.font}`;
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = 'alphabetic';
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx + (Math.random() - 0.5) * 1.0, y + (Math.random() - 0.5) * 0.6);
    cx += ctx.measureText(ch).width + (Math.random() - 0.5) * 0.8;
  }
  ctx.restore();
}

// ─── Text → Bitmap → Strokes (supersampled for smoothness) ──
function rasterizeText(text, font, size) {
  try {
    const SCALE = 2; // 2x supersampling for anti-aliased edges
    const cs = Math.ceil(size * DPR * SCALE);
    const mc = document.createElement('canvas');
    const mctx = mc.getContext('2d', { willReadFrequently: true });
    mctx.font = `${cs}px ${font}`;
    const metrics = mctx.measureText(text);
    const w = Math.ceil(metrics.width) + Math.ceil(16 * DPR * SCALE);
    const h = Math.ceil(cs * 1.6) + Math.ceil(16 * DPR * SCALE);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#fff';
    cx.font = `${cs}px ${font}`;
    cx.textBaseline = 'alphabetic';
    cx.fillText(text, Math.ceil(8 * DPR * SCALE), h * 0.7);

    const imgData = cx.getImageData(0, 0, w, h);
    // Downsample by SCALE for smooth edges
    const ow = Math.ceil(w / SCALE), oh = Math.ceil(h / SCALE);
    const mask = new Uint8Array(ow * oh);
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        let sum = 0, count = 0;
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            const sx = x * SCALE + dx, sy = y * SCALE + dy;
            if (sx < w && sy < h) {
              sum += imgData.data[(sy * w + sx) * 4];
              count++;
            }
          }
        }
        mask[y * ow + x] = (sum / count) > 128 ? 1 : 0;
      }
    }
    return { width: ow, height: oh, mask };
  } catch(e) {
    console.warn('[Riddle] rasterizeText failed:', e);
    return null;
  }
}

// ─── Zhang-Suen thinning ───────────────────────────────────
function thinBitmap(bm) {
  const { width: w, height: h } = bm;
  const idx = (x, y) => y * w + x;
  const at = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return 0; return bm.mask[idx(x, y)]; };

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 80) {
    changed = false;
    iterations++;
    for (let phase = 0; phase < 2; phase++) {
      const toClear = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!bm.mask[idx(x, y)]) continue;
          const p = [
            at(x, y-1), at(x+1, y-1), at(x+1, y), at(x+1, y+1),
            at(x, y+1), at(x-1, y+1), at(x-1, y), at(x-1, y-1)
          ];
          const N = p.reduce((s, v) => s + v, 0);
          if (N < 2 || N > 6) continue;
          let S = 0;
          for (let i = 0; i < 8; i++) {
            if (!p[i] && p[(i + 1) % 8]) S++;
          }
          if (S !== 1) continue;
          let c1, c2;
          if (phase === 0) {
            c1 = !(p[0] && p[2] && p[4]);
            c2 = !(p[2] && p[4] && p[6]);
          } else {
            c1 = !(p[0] && p[2] && p[6]);
            c2 = !(p[0] && p[4] && p[6]);
          }
          if (c1 && c2) toClear.push(idx(x, y));
        }
      }
      if (toClear.length > 0) {
        changed = true;
        for (const i of toClear) bm.mask[i] = 0;
      }
    }
  }
}

// ─── Skeleton tracing ───────────────────────────────────────
function traceStrokes(bm) {
  const { width: w, height: h } = bm;
  const idx = (x, y) => y * w + x;
  const at = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return 0; return bm.mask[idx(x, y)]; };
  const visited = new Uint8Array(w * h);

  const findStarts = () => {
    const starts = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!at(x, y)) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (at(x + dx, y + dy)) n++;
          }
        }
        if (n <= 1) starts.push([x, y]);
      }
    }
    if (starts.length === 0) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (at(x, y)) { starts.push([x, y]); break; }
        }
        if (starts.length > 0) break;
      }
    }
    return starts;
  };

  const result = [];
  for (const [sx, sy] of findStarts()) {
    if (visited[idx(sx, sy)]) continue;
    const path = [[sx, sy]];
    visited[idx(sx, sy)] = 1;
    let cx = sx, cy = sy;

    while (true) {
      let next = null;
      const last = path.length > 1 ? path[path.length - 2] : null;
      const candidates = [
        [0, -1], [0, 1], [-1, 0], [1, 0],
        [-1, -1], [1, -1], [-1, 1], [1, 1]
      ];
      if (last) {
        const dx = cx - last[0], dy = cy - last[1];
        candidates.sort((a, b) => {
          const da = Math.abs(a[0] - dx) + Math.abs(a[1] - dy);
          const db = Math.abs(b[0] - dx) + Math.abs(b[1] - dy);
          return da - db;
        });
      }
      for (const [dx, dy] of candidates) {
        if (at(cx + dx, cy + dy) && !visited[idx(cx + dx, cy + dy)]) {
          next = [cx + dx, cy + dy];
          break;
        }
      }
      if (!next) break;
      visited[idx(next[0], next[1])] = 1;
      path.push(next);
      cx = next[0];
      cy = next[1];
    }
    if (path.length >= 3) result.push(path);
  }

  result.sort((a, b) => {
    const mA = a.reduce((m, p) => Math.min(m, p[0]), Infinity);
    const mB = b.reduce((m, p) => Math.min(m, p[0]), Infinity);
    return mA - mB;
  });
  return result;
}

// ─── SVG stroke animation (reply writing) ──────────────────
function drawAnimatedStroke(stroke, offsetX, offsetY, theme) {
  return new Promise(resolve => {
    if (stroke.length < 2) { resolve(); return; }

    let d = `M ${stroke[0][0] + offsetX} ${stroke[0][1] + offsetY}`;
    for (let i = 0; i < stroke.length - 1; i++) {
      const p0 = stroke[i];
      const p1 = stroke[i + 1];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      d += ` Q ${p0[0] + offsetX} ${p0[1] + offsetY} ${mx + offsetX} ${my + offsetY}`;
    }
    const last = stroke[stroke.length - 1];
    d += ` L ${last[0] + offsetX} ${last[1] + offsetY}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', theme.ink);
    path.setAttribute('stroke-width', String(CFG.svgStrokeWidth));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svgLayer.appendChild(path);

    const len = path.getTotalLength() || stroke.length * 2;
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;

    const dur = Math.min(stroke.length * CFG.strokeIntervalMs, CFG.strokeMaxDurMs);
    path.style.transition = `stroke-dashoffset ${dur}ms ease-out`;

    path.getBoundingClientRect();
    requestAnimationFrame(() => {
      path.style.strokeDashoffset = '0';
    });

    setTimeout(resolve, dur + 20);
  });
}

// ─── Load server config ────────────────────────────────────
async function loadConfig() {
  try {
    const resp = await fetch('/api/config');
    if (!resp.ok) {
      console.warn('[Riddle] /api/config returned', resp.status, '— using defaults');
      return;
    }
    const data = await resp.json();
    let src = data.runtime || data.config || data;
    if (src && typeof src === 'object') {
      const mapped = {};
      const directMap = {
        'idleTimeoutMs':     'idleTimeoutMs',
        'minDistPx':         'minDistPx',
        'maxDistPx':         'maxDistPx',
        'pressureMinPx':     'pressureMinPx',
        'pressureMaxPx':     'pressureMaxPx',
        'pollIntervalMs':    'pollIntervalMs',
        'strokeIntervalMs':  'strokeIntervalMs',
        'strokeMaxDurMs':    'strokeMaxDurMs',
        'svgStrokeWidth':    'svgStrokeWidth',
        'maxLines':          'maxLines',
        'lineHeightPx':      'lineHeightPx',
        'marginTopPx':       'marginTopPx',
        'marginXPx':         'marginXPx',
        'fontSizePx':        'fontSizePx',
        'replyFadeDelayMs':  'replyFadeDelayMs',
        'fadeDurationMs':    'fadeDurationMs',
      };
      const snakeMap = {
        'idle_timeout_ms':     'idleTimeoutMs',
        'min_dist_px':         'minDistPx',
        'max_dist_px':         'maxDistPx',
        'pressure_min_px':     'pressureMinPx',
        'pressure_max_px':     'pressureMaxPx',
        'poll_interval_ms':    'pollIntervalMs',
        'stroke_interval_ms':  'strokeIntervalMs',
        'stroke_max_dur_ms':   'strokeMaxDurMs',
        'svg_stroke_width':    'svgStrokeWidth',
        'max_lines':           'maxLines',
        'line_height_px':      'lineHeightPx',
        'margin_top_px':       'marginTopPx',
        'margin_x_px':         'marginXPx',
        'font_size_px':        'fontSizePx',
        'reply_fade_delay_ms': 'replyFadeDelayMs',
        'fade_duration_ms':    'fadeDurationMs',
      };
      for (const [k, v] of Object.entries(src)) {
        let targetKey = null;
        if (directMap[k]) targetKey = directMap[k];
        else if (snakeMap[k]) targetKey = snakeMap[k];
        if (targetKey && typeof v === 'number') {
          mapped[targetKey] = v;
        }
      }
      CFG = { ...DEFAULTS, ...mapped };
      console.log('[Riddle] Config loaded:', CFG);
    }
  } catch(e) {
    console.warn('[Riddle] Config load failed, using defaults:', e.message);
  }
}

// ─── Fullscreen ────────────────────────────────────────────
function updateFullscreenIcon() {
  const isFs = document.fullscreenElement || document.webkitFullscreenElement;
  const use = fullscreenBtn.querySelector('use');
  if (use) {
    use.setAttribute('href', isFs ? '#icon-exit-fullscreen' : '#icon-fullscreen');
  }
  fullscreenBtn.title = isFs ? 'Exit fullscreen' : 'Fullscreen';
}

fullscreenBtn.addEventListener('click', () => {
  const el = document.fullscreenElement || document.webkitFullscreenElement;
  if (el) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    const target = writingSurface || document.documentElement;
    (target.requestFullscreen || target.webkitRequestFullscreen).call(target);
  }
});

document.addEventListener('fullscreenchange', () => {
  updateFullscreenIcon();
  setTimeout(scheduleResize, 150);
});
document.addEventListener('webkitfullscreenchange', () => {
  updateFullscreenIcon();
  setTimeout(scheduleResize, 150);
});

// ─── Init ───────────────────────────────────────────────────
async function init() {
  resizeCanvas();
  applyTheme();
  updateFullscreenIcon();
  setStatus('ready', 'Write with your pen…');
  await loadConfig();
  fetch('/api/init', { method: 'GET' })
    .then(r => r.json())
    .then(d => { if (d && d.sessionId) localStorage.setItem('riddle-sid', d.sessionId); })
    .catch(() => {});
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { scheduleResize(); });
  }
}

document.addEventListener('touchmove', e => {
  if (e.target === canvas || (canvas && canvas.contains(e.target))) {
    e.preventDefault();
  }
}, { passive: false });

init();

})();

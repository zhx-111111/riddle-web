/* ============================================================
 * Riddle Web — Tom Riddle's Diary
 * v3.6: fix writing input + Apple-style UI polish
 * ============================================================ */

(() => {
'use strict';

// ─── Default config (overridden by /api/config) ───────────────
const DEFAULTS = {
  idleTimeoutMs:    1500,
  minDistPx:        0.6,
  maxDistPx:        3.0,
  pressureMinPx:    2.0,
  pressureMaxPx:    5.5,
  pollIntervalMs:   50,
  strokeIntervalMs: 55,
  strokeMaxDurMs:   2500,
  svgStrokeWidth:    1.8,
  maxLines:         20,
  lineHeightPx:     36,
  marginTopPx:      6,
  marginXPx:        28,
  fontSizePx:       28,
  replyFadeDelayMs: 8000,
  fadeDurationMs:   1200,
};

let CFG = { ...DEFAULTS };

// ─── Themes ────────────────────────────────────────────────
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

// ─── DOM refs ───────────────────────────────────────────────
const canvas           = document.getElementById('writing-canvas');
const ctx              = canvas.getContext('2d', { alpha: true });
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

// ─── Canvas sizing (FIX: proper resize with DPR) ──────────
let DPR = 1;
let cssWidth = 0, cssHeight = 0;

function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  const rect = canvas.getBoundingClientRect();
  cssWidth  = rect.width;
  cssHeight = rect.height;
  const newW = Math.max(1, Math.floor(rect.width  * DPR));
  const newH = Math.max(1, Math.floor(rect.height * DPR));
  if (canvas.width !== newW)  canvas.width  = newW;
  if (canvas.height !== newH) canvas.height = newH;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyTheme();
}
window.addEventListener('resize', () => { setTimeout(resizeCanvas, 50); });
// FIX: also resize on orientation change
window.addEventListener('orientationchange', () => { setTimeout(resizeCanvas, 200); });

// ─── Theme application ──────────────────────────────────────
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

// ─── Stroke collection ──────────────────────────────────────
let strokes = [];
let currentStroke = null;
let isWriting = false;
let idleTimer = null;
let lastRenderTime = 0;
let renderRAF = null;
let lastPointerTime = 0;
let pointerVelocity = 0;

// FIX: get pointer position with proper coordinate mapping
function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY, pressure;

  // PointerEvent (preferred, covers mouse + pen + touch on modern browsers)
  if (e.clientX !== undefined && e.clientY !== undefined) {
    clientX = e.clientX;
    clientY = e.clientY;
    pressure = e.pressure || (e.pointerType === 'pen' ? 0.7 : 0.5);
  }
  // TouchEvent fallback
  else if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
    pressure = e.touches[0].force || 0.5;
  }
  else if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
    pressure = e.changedTouches[0].force || 0.5;
  }
  else {
    return { x: 0, y: 0, pressure: 0.5 };
  }

  // Map client coords → canvas CSS coords (no DPR math needed since ctx is scaled)
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  return {
    x: Math.max(0, Math.min(x, rect.width)),
    y: Math.max(0, Math.min(y, rect.height)),
    pressure: Math.max(0.05, Math.min(1, pressure)),
  };
}

function pressureToWidth(p) {
  return CFG.pressureMinPx + p * (CFG.pressureMaxPx - CFG.pressureMinPx);
}

function shouldSamplePoint(p, last) {
  if (!last) return true;
  const dx = p.x - last.x, dy = p.y - last.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const now = performance.now();
  const dt = now - lastPointerTime;
  if (dt < 8) return false; // throttle to ~120Hz
  const adaptiveMin = pointerVelocity > 2 ? CFG.minDistPx * 0.5 : CFG.minDistPx;
  return dist >= adaptiveMin;
}

function startStroke(p) {
  currentStroke = {
    points: [{ x: p.x, y: p.y, w: pressureToWidth(p.pressure) }],
    width: pressureToWidth(p.pressure),
  };
  strokes.push(currentStroke);
  isWriting = true;
  hintText.classList.add('hidden');
  setStatus('writing', 'Writing&hellip;');
}

function addPointToStroke(p) {
  if (!currentStroke) return;
  const last = currentStroke.points[currentStroke.points.length - 1];
  if (!shouldSamplePoint(p, last)) return;
  const w = pressureToWidth(p.pressure);
  currentStroke.points.push({ x: p.x, y: p.y, w });
  currentStroke.width = w;
  pointerVelocity = p.pressure;
  lastPointerTime = performance.now();
  scheduleRender();
}

function endStroke() {
  if (currentStroke && currentStroke.points.length < 2) {
    const p = currentStroke.points[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.w * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = THEMES[currentTheme].ink;
    ctx.fill();
  }
  currentStroke = null;
  isWriting = false;
  setStatus('ready', 'Paused&hellip;');
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

function scheduleRender() {
  if (renderRAF) return;
  renderRAF = requestAnimationFrame(() => {
    renderRAF = null;
    renderIncremental();
  });
}

function renderIncremental() {
  const s = strokes[strokes.length - 1];
  if (!s || s.points.length < 2) return;
  const startIdx = Math.max(1, s.points.length - 4);
  ctx.save();
  ctx.fillStyle = THEMES[currentTheme].ink;
  for (let i = startIdx; i < s.points.length; i++) {
    const p = s.points[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.w * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (s.points.length >= 2) {
    const p0 = s.points[s.points.length - 2];
    const p1 = s.points[s.points.length - 1];
    const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
    grad.addColorStop(0, hexToRgba(THEMES[currentTheme].ink, 1));
    grad.addColorStop(1, hexToRgba(THEMES[currentTheme].ink, 0.85));
    ctx.strokeStyle = grad;
    ctx.lineWidth = (p0.w + p1.w) * 0.5;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  ctx.restore();
}

function redrawAllStrokes() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  for (const s of strokes) {
    drawStrokeSmooth(s);
  }
}

function drawStrokeSmooth(stroke) {
  if (stroke.points.length < 2) {
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.w * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = THEMES[currentTheme].ink;
      ctx.fill();
    }
    return;
  }
  ctx.save();
  ctx.fillStyle = THEMES[currentTheme].ink;
  ctx.strokeStyle = THEMES[currentTheme].ink;

  const pts = stroke.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i-1)];
    const p1 = pts[i];
    const p2 = pts[i+1];
    const p3 = pts[Math.min(pts.length-1, i+2)];

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    const steps = Math.max(4, Math.floor(Math.sqrt((p2.x-p1.x)**2 + (p2.y-p1.y)**2) * 2));
    const leftEdge = [];
    const rightEdge = [];

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = bezierPoint(p1.x, c1x, c2x, p2.x, t);
      const y = bezierPoint(p1.y, c1y, c2y, p2.y, t);
      let nx, ny;
      if (s < steps) {
        const tx = bezierPoint(p1.x, c1x, c2x, p2.x, t + 0.01) - x;
        const ty = bezierPoint(p1.y, c1y, c2y, p2.y, t + 0.01) - y;
        const len = Math.sqrt(tx*tx + ty*ty) || 1;
        nx = -ty / len; ny = tx / len;
      } else {
        const tx = x - bezierPoint(p1.x, c1x, c2x, p2.x, t - 0.01);
        const ty = y - bezierPoint(p1.y, c1y, c2y, p2.y, t - 0.01);
        const len = Math.sqrt(tx*tx + ty*ty) || 1;
        nx = -ty / len; ny = tx / len;
      }
      const w = (p1.w + (p2.w - p1.w) * t) * 0.5;
      leftEdge.push([x + nx * w, y + ny * w]);
      rightEdge.push([x - nx * w, y - ny * w]);
    }

    ctx.beginPath();
    for (let j = 0; j < leftEdge.length; j++) ctx.lineTo(leftEdge[j][0], leftEdge[j][1]);
    for (let j = rightEdge.length - 1; j >= 0; j--) ctx.lineTo(rightEdge[j][0], rightEdge[j][1]);
    ctx.closePath();
    ctx.fill();
  }

  // Ink bleed layer
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = stroke.width * 1.8;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i+1].x) / 2;
    const my = (pts[i].y + pts[i+1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  ctx.restore();
}

function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ═════════════════════════════════════════════════════════
// FIX: Robust pointer event handlers (the core writing fix)
// ═════════════════════════════════════════════════════════
function onPointerDown(e) {
  e.preventDefault();
  if (e.pointerType === 'touch' && e.isPrimary === false) return;
  try { canvas.setPointerCapture(e.pointerId); } catch(_) {}
  const p = getPointerPos(e);
  startStroke(p);
  lastPointerTime = performance.now();
}

function onPointerMove(e) {
  if (!isWriting) return;
  e.preventDefault();
  const p = getPointerPos(e);
  addPointToStroke(p);
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

// FIX: Touch events as backup (for older browsers / edge cases)
function onTouchStart(e) {
  if (e.touches.length > 1) return; // multi-touch = ignore
  e.preventDefault();
  const touch = e.touches[0];
  const simulatedEvent = {
    clientX: touch.clientX,
    clientY: touch.clientY,
    pressure: touch.force || 0.5,
    pointerType: 'touch',
    pointerId: touch.identifier,
    preventDefault: () => {},
  };
  const p = getPointerPos(simulatedEvent);
  startStroke(p);
  lastPointerTime = performance.now();
}

function onTouchMove(e) {
  if (!isWriting) return;
  e.preventDefault();
  const touch = e.touches[0];
  const simulatedEvent = {
    clientX: touch.clientX,
    clientY: touch.clientY,
    pressure: touch.force || 0.5,
    pointerType: 'touch',
    preventDefault: () => {},
  };
  const p = getPointerPos(simulatedEvent);
  addPointToStroke(p);
}

function onTouchEnd(e) {
  if (!isWriting) return;
  e.preventDefault();
  endStroke();
}

// Bind BOTH pointer and touch events
canvas.addEventListener('pointerdown',   onPointerDown,   { passive: false });
canvas.addEventListener('pointermove',   onPointerMove,   { passive: false });
canvas.addEventListener('pointerup',     onPointerUp,     { passive: false });
canvas.addEventListener('pointercancel', onPointerCancel, { passive: false });

// Touch fallback (only fires if Pointer Events don't handle it)
canvas.addEventListener('touchstart', onTouchStart, { passive: false });
canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
canvas.addEventListener('touchend',    onTouchEnd,    { passive: false });
canvas.addEventListener('touchcancel', onTouchEnd,  { passive: false });

// Prevent scrolling/zooming on the canvas
canvas.addEventListener('gesturestart', e => e.preventDefault());
canvas.addEventListener('dblclick',    e => e.preventDefault());

// ─── Status ────────────────────────────────────────────────
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

// ─── Send to Tom ──────────────────────────────────────────
async function sendToTom() {
  setStatus('thinking', 'The diary is thinking&hellip;');
  fadeOutInk();
  const pngData = canvas.toDataURL('image/png');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: pngData }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      const err = await resp.json().catch(()=>({}));
      showError('Tom is silent', err.message || ('HTTP ' + resp.status));
      setStatus('ready', 'Write again&hellip;');
      return;
    }
    await consumeSSE(resp);
  } catch(e) {
    if (e.name === 'AbortError') {
      showError('Timeout', 'Tom took too long to reply. Check /api/setup');
    } else {
      showError('Connection failed', e.message || 'Network error');
    }
    setStatus('ready', 'Write again&hellip;');
  }
}

// ─── SSE consumption ───────────────────────────────────────
async function consumeSSE(resp) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', fullText = '';
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
          if (clean) {
            fullText += clean + ' ';
            await animateSentence(clean, replyLineCount);
            replyLineCount++;
          }
        } else if (evt.type === 'error') {
          showError('Tom is silent', evt.message || evt.text || 'Unknown error');
        }
      } catch(e) { console.warn('SSE parse error:', e, data); }
    }
  }
  setStatus('ready', 'Write again&hellip;');
  setTimeout(() => { hintText.classList.remove('hidden'); }, 8000);
  setTimeout(() => { fadeAwayAll(); }, CFG.replyFadeDelayMs);
}

function filterThinking(text) {
  if (!text) return '';
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  t = t.replace(/\[think\][\s\S]*?\[\/think\]/gi, '');
  return t.trim();
}

// ─── Full-page fade away ───────────────────────────────────
function fadeAwayAll() {
  for (const child of svgLayer.children) {
    child.style.transition = `opacity ${CFG.fadeDurationMs}ms ease-out`;
    child.style.opacity = '0';
  }
  let fadeAlpha = 1.0;
  const fadeStep = () => {
    fadeAlpha -= 0.04;
    if (fadeAlpha <= 0.02) {
      strokes = [];
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      svgLayer.innerHTML = '';
      return;
    }
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    const tmp = [...strokes];
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    for (const s of tmp) drawStrokeSmooth(s);
    ctx.restore();
    requestAnimationFrame(fadeStep);
  };
  requestAnimationFrame(fadeStep);
}

// ─── Ink fade-out animation ────────────────────────────────
function fadeOutInk() {
  const startTime = performance.now();
  const duration = CFG.fadeDurationMs;
  const rect = canvas.getBoundingClientRect();
  const savedStrokes = [...strokes];
  function fade() {
    const progress = Math.min((performance.now() - startTime) / duration, 1);
    const alpha = 1 - progress;
    ctx.save();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.globalAlpha = alpha;
    for (const s of savedStrokes) drawStrokeSmooth(s);
    ctx.restore();
    if (progress < 1) requestAnimationFrame(fade);
    else { strokes = []; ctx.clearRect(0, 0, rect.width, rect.height); }
  }
  requestAnimationFrame(fade);
}

// ─── Sentence-level animation ──────────────────────────────
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
  if (!bitmap) { drawTextFallback(text, startX, startY, theme); return; }
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
    ctx.fillText(ch, cx + (Math.random()-0.5)*1.0, y + (Math.random()-0.5)*0.6);
    cx += ctx.measureText(ch).width + (Math.random()-0.5)*0.8;
  }
  ctx.restore();
}

// ─── Text → bitmap ──────────────────────────────────────────
function rasterizeText(text, font, size) {
  try {
    const cs = size * DPR;
    const mc = document.createElement('canvas');
    const mctx = mc.getContext('2d', { willReadFrequently: true });
    mctx.font = `${cs}px ${font}`;
    const metrics = mctx.measureText(text);
    const w = Math.ceil(metrics.width) + Math.ceil(16 * DPR);
    const h = Math.ceil(cs * 1.6) + Math.ceil(16 * DPR);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#fff'; cx.font = `${cs}px ${font}`; cx.textBaseline = 'alphabetic';
    cx.fillText(text, Math.ceil(8*DPR), h * 0.7);
    const imgData = cx.getImageData(0, 0, w, h);
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) mask[i] = imgData.data[i * 4] > 128 ? 1 : 0;
    return { width: w, height: h, mask };
  } catch(e) { console.warn('rasterizeText failed:', e); return null; }
}

// ─── Zhang-Suen thinning ────────────────────────────────────
function thinBitmap(bm) {
  const { width: w, height: h } = bm;
  const idx = (x, y) => y * w + x;
  const get = (x, y) => { if (x<0||y<0||x>=w||y>=h) return 0; return bm.mask[idx(x,y)]; };
  let changed = true, iterations = 0;
  while (changed && iterations < 100) {
    changed = false; iterations++;
    for (let phase = 0; phase < 2; phase++) {
      const toClear = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!bm.mask[idx(x,y)]) continue;
          const p = [get(x,y-1),get(x+1,y-1),get(x+1,y),get(x+1,y+1),get(x,y+1),get(x-1,y+1),get(x-1,y),get(x-1,y-1)];
          const N = p.reduce((s,v)=>s+v,0);
          if (N<2||N>6) continue;
          let S=0; for(let i=0;i<8;i++){if(!p[i]&&p[(i+1)%8])S++;} if(S!==1)continue;
          let c1,c2; if(phase===0){c1=!(p[0]&&p[2]&&p[4]);c2=!(p[2]&&p[4]&&p[6]);}else{c1=!(p[0]&&p[2]&&p[6]);c2=!(p[0]&&p[4]&&p[6]);}
          if(c1&&c2) toClear.push(idx(x,y));
        }
      }
      if (toClear.length > 0) { changed = true; for (const i of toClear) bm.mask[i] = 0; }
    }
  }
}

// ─── Skeleton tracing ───────────────────────────────────────
function traceStrokes(bm) {
  const { width: w, height: h } = bm;
  const idx = (x, y) => y * w + x;
  const at = (x, y) => { if (x<0||y<0||x>=w||y>=h) return 0; return bm.mask[idx(x,y)]; };
  const visited = new Uint8Array(w * h);
  const result = [];
  const findStarts = () => {
    const starts = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!at(x,y)) continue;
      let n = 0; for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) { if(dx===0&&dy===0)continue; if(at(x+dx,y+dy)) n++; }
      if (n <= 1) starts.push([x, y]);
    }
    if (starts.length === 0) for (let y=0;y<h;y++) for (let x=0;x<w;x++) if (at(x,y)) { starts.push([x,y]); break; }
    return starts;
  };
  for (const [sx, sy] of findStarts()) {
    if (visited[idx(sx,sy)]) continue;
    const path = [[sx, sy]]; visited[idx(sx,sy)] = 1; let [cx, cy] = [sx, sy];
    while (true) {
      let next = null;
      for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]]) {
        if (at(cx+dx, cy+dy) && !visited[idx(cx+dx, cy+dy)]) { next = [cx+dx, cy+dy]; break; }
      }
      if (!next) break;
      visited[idx(next[0], next[1])] = 1; path.push(next); [cx, cy] = next;
    }
    if (path.length >= 3) result.push(path);
  }
  result.sort((a, b) => { const mA = a.reduce((m,p)=>Math.min(m,p[0]),Infinity), mB = b.reduce((m,p)=>Math.min(m,p[0]),Infinity); return mA - mB; });
  return result;
}

// ─── SVG stroke animation ────────────────────────────────────
function drawAnimatedStroke(stroke, offsetX, offsetY, theme) {
  return new Promise(resolve => {
    if (stroke.length < 2) { resolve(); return; }
    let d = `M ${stroke[0][0]+offsetX} ${stroke[0][1]+offsetY}`;
    for (let i = 0; i < stroke.length - 1; i++) {
      const p0 = stroke[i], p1 = stroke[i+1];
      d += ` Q ${(p0[0]+p1[0])/2+offsetX} ${(p0[1]+p1[1])/2+offsetY} ${p1[0]+offsetX} ${p1[1]+offsetY}`;
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', theme.ink);
    path.setAttribute('stroke-width', String(CFG.svgStrokeWidth));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svgLayer.appendChild(path);
    const len = path.getTotalLength() || stroke.length * 2;
    path.style.strokeDasharray = `${len}`; path.style.strokeDashoffset = `${len}`;
    const dur = Math.min(stroke.length * CFG.strokeIntervalMs, CFG.strokeMaxDurMs);
    path.style.transition = `stroke-dashoffset ${dur}ms ease-out`;
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
    setTimeout(resolve, dur + 20);
  });
}

// ─── Load server config ─────────────────────────────────────
async function loadConfig() {
  try {
    const resp = await fetch('/api/config');
    if (resp.ok) {
      const data = await resp.json();
      // FIX: handle both {runtime} and {config} response shapes
      const src = data.runtime || data.config || data;
      if (src && typeof src === 'object') {
        const mapped = {};
        const keyMap = {
          'idle_timeout_ms':'idleTimeoutMs','min_dist_px':'minDistPx','max_dist_px':'maxDistPx',
          'pressure_min_px':'pressureMinPx','pressure_max_px':'pressureMaxPx',
          'poll_interval_ms':'pollIntervalMs','stroke_interval_ms':'strokeIntervalMs',
          'stroke_max_dur_ms':'strokeMaxDurMs','svg_stroke_width':'svgStrokeWidth',
          'max_lines':'maxLines','line_height_px':'lineHeightPx',
          'margin_top_px':'marginTopPx','margin_x_px':'marginXPx','font_size_px':'fontSizePx',
          'reply_fade_delay_ms':'replyFadeDelayMs','fade_duration_ms':'fadeDurationMs',
        };
        for (const [k, v] of Object.entries(src)) {
          if (keyMap[k]) mapped[keyMap[k]] = v;
        }
        CFG = { ...DEFAULTS, ...mapped };
      }
    }
  } catch(e) { console.warn('Config load failed, using defaults:', e); }
}

// ─── Fullscreen ────────────────────────────────────────────
function updateFullscreenIcon() {
  const isFs = document.fullscreenElement || document.webkitFullscreenElement;
  const use = fullscreenBtn.querySelector('use');
  if (use) use.setAttribute('href', isFs ? '#icon-exit-fullscreen' : '#icon-fullscreen');
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
document.addEventListener('fullscreenchange', () => { updateFullscreenIcon(); setTimeout(resizeCanvas, 100); });
document.addEventListener('webkitfullscreenchange', () => { updateFullscreenIcon(); setTimeout(resizeCanvas, 100); });

// ─── Landscape: follow system only ───────────────────────
// No manual button — purely CSS media query based
// CSS handles @media (orientation: landscape) layout changes

// ─── Init ───────────────────────────────────────────────────
async function init() {
  // FIX: resize first, then theme, then config
  resizeCanvas();
  setTheme(currentTheme);
  updateFullscreenIcon();
  setStatus('ready', 'Write with your pen&hellip;');
  await loadConfig();
  fetch('/api/init', { method: 'GET' })
    .then(r=>r.json())
    .then(d=>{ if(d&&d.sessionId) localStorage.setItem('riddle-sid', d.sessionId); })
    .catch(()=>{});
  // FIX: resize again after fonts load (font metrics change layout)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { resizeCanvas(); });
  }
}

// FIX: Prevent default touch behaviors on the entire app container
document.addEventListener('touchmove', e => {
  if (e.target === canvas || canvas.contains(e.target)) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('contextmenu', e => {
  if (e.target === canvas) e.preventDefault();
});

init();

})();

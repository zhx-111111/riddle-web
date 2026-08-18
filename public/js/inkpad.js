// InkPad — the writer's pen.
//
// Captures pointer input (pen / finger / mouse), renders smooth anti-aliased
// ink (midpoint quadratic curves, pressure + speed modulated width, DPR-aware
// canvas so edges never alias), keeps a faithful stroke model, erases the way
// the original diary does (two fingers, or the corner eraser, splitting
// strokes under the eraser), rasterizes the committed page to a PNG for the
// oracle (long side ≤ 800px, black on white — as in ink.rs), dissolves the
// ink when the diary drinks it (a port of px_hash + dissolve_pass), and
// detects a lone large "?" (a port of looks_like_question_mark in help.rs).

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

/// Deterministic per-pixel hash for the dissolve pattern (port of ink.rs).
function pxHash(x, y) {
  let h = Math.imul(x | 0, 0x9E3779B1) ^ Math.imul(y | 0, 0x85EBCA6B);
  h ^= h >>> 13;
  h = Math.imul(h, 0xC2B2AE35);
  h ^= h >>> 16;
  return h >>> 0;
}

export class InkPad {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.strokes = [];      // committed: { pts: [{x,y,w}] }
    this.current = null;
    this.pointers = new Map();
    this.twoFinger = false;
    this.erasing = false;
    this.eraseTool = false;
    this.color = "#221610";
    this.strokeScale = 1.0; // admin 笔迹粗细
    this.penScale = 1.0;    // paper-size factor
    this.w = 0; this.h = 0; this.dpr = 1;
    this.onChange = null;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.redraw();
  }

  setColor(c) { this.color = c; }

  hasInk() { return this.strokes.length > 0 || !!this.current; }

  reset() {
    this.strokes = [];
    this.current = null;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // ------------------------------------------------------------- rendering

  _prep(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
  }

  redraw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._prep(ctx);
    for (const s of this.strokes) drawStroke(ctx, s.pts, this.color, 0.96, 1);
    if (this.current) drawStroke(ctx, this.current.pts, this.color, 0.96, 1);
  }

  // ----------------------------------------------------------------- input

  toLocal(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  widthFor(pt, prev) {
    let wf = 1;
    if (prev) {
      const d = Math.hypot(pt.x - prev.x, pt.y - prev.y);
      const dt = Math.max(1, pt.t - prev.t);
      const v = d / dt; // px per ms
      // Smoother speed modulation with easing curve
      const speedFactor = Math.min(v / 2.5, 1);
      wf = 1.6 - 0.7 * speedFactor; // range ~0.9 to 1.6
    }
    // Enhanced pressure sensitivity with exponential curve for natural feel
    // No pressure info (mouse/touch) → uses velocity-based width only
    // Pen with pressure → exponential mapping for natural ink feel
    let pf = 1;
    if (pt.p && pt.p > 0 && pt.p !== 0.5) {
      // Real pressure data: exponential curve for natural pen feel
      const p = clamp(pt.p, 0, 1);
      pf = 0.4 + Math.pow(p, 1.8) * 1.3; // range ~0.4 to 1.7
    } else if (pt.p === 0.5) {
      // Mouse default — slight variation based on velocity
      pf = wf * 0.9;
    }
    return 2.6 * this.penScale * this.strokeScale * wf * pf * 2;
  }

  /// Returns "draw" | "erase" | "ignore".
  pointerDown(e) {
    const pos = this.toLocal(e);
    this.pointers.set(e.pointerId, pos);
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* ok */ }

    if (this.pointers.size === 2) {
      // A second finger joins: erase (the web answer to flipping the marker).
      if (this.current && this.current.pts.length) this.strokes.push(this.current);
      this.current = null;
      this.twoFinger = true;
      const [a, b] = [...this.pointers.values()];
      this.eraseAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 26);
      this.onChange?.();
      return "erase";
    }
    if (this.pointers.size > 2) return "ignore";

    if (this.eraseTool) {
      this.erasing = true;
      this.eraseAt(pos, 17);
      this.onChange?.();
      return "erase";
    }

    this.current = { pts: [] };
    this._addPoint(e, pos);
    return "draw";
  }

  pointerMove(e) {
    const pos = this.toLocal(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, pos);

    if (this.twoFinger && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      this.eraseAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 26);
      return;
    }
    if (this.erasing) { this.eraseAt(pos, 17); return; }
    if (!this.current) return;

    // Use coalesced events for high-fidelity pen input (iPad Pencil, Surface Pen)
    let evs;
    if (typeof e.getCoalescedEvents === "function") {
      evs = e.getCoalescedEvents();
    } else {
      evs = [e];
    }
    // Also try predicted events for zero-latency feel
    if (typeof e.getPredictedEvents === "function" && evs.length <= 1) {
      const pred = e.getPredictedEvents();
      if (pred.length) evs = evs.concat(pred.slice(0, 2));
    }
    for (const ev of evs.length ? evs : [e]) this._addPoint(ev, this.toLocal(ev));
  }

  pointerUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.twoFinger && this.pointers.size < 2) this.twoFinger = false;
    if (this.erasing && this.pointers.size === 0) this.erasing = false;
    if (this.current) {
      if (this.current.pts.length) this.strokes.push(this.current);
      this.current = null;
      this.onChange?.();
    }
  }

  _addPoint(e, pos) {
    const prev = this.current.pts[this.current.pts.length - 1];
    // Tighter dedup: only skip if truly identical (sub-pixel)
    if (prev && Math.abs(pos.x - prev.x) < 0.3 && Math.abs(pos.y - prev.y) < 0.3) return;
    const now = e.timeStamp || performance.now();
    // Interpolate intermediate points for fast strokes (prevents gaps)
    if (prev) {
      const dx = pos.x - prev.x, dy = pos.y - prev.y;
      const dist = Math.hypot(dx, dy);
      const maxStep = 3.0; // px between interpolated points
      if (dist > maxStep) {
        const steps = Math.min(8, Math.floor(dist / maxStep));
        const tStep = (now - prev.t) / steps;
        for (let s = 1; s < steps; s++) {
          const frac = s / steps;
          const ix = prev.x + dx * frac;
          const iy = prev.y + dy * frac;
          // Interpolate pressure
          const ip = prev.p + (e.pressure || 0.5 - prev.p) * frac;
          const ipt = {
            x: ix, y: iy,
            t: prev.t + tStep * s,
            p: ip > 0 ? ip : 0.5,
          };
          ipt.w = this.widthFor(ipt, prev);
          this.current.pts.push(ipt);
          this._renderTailLast();
        }
      }
    }
    const pt = {
      x: pos.x, y: pos.y,
      t: now,
      p: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
    };
    pt.w = this.widthFor(pt, this.current.pts[this.current.pts.length - 1]);
    this.current.pts.push(pt);
    this._renderTail();
    this.onChange?.();
  }

  _renderTailLast() {
    const pts = this.current.pts;
    const n = pts.length;
    if (n < 2) return;
    const ctx = this.ctx;
    ctx.globalAlpha = 0.96;
    this._prep(ctx);
    const a = pts[n - 2], b = pts[n - 1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = (a.w + b.w) / 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  _renderTail() {
    const pts = this.current.pts;
    const n = pts.length;
    if (!n) return;
    const ctx = this.ctx;
    ctx.globalAlpha = 0.96;
    this._prep(ctx);
    if (n === 1) {
      // Three-pass dot: outer glow + mid halo + solid core (eliminates aliasing)
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, pts[0].w / 2 * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, pts[0].w / 2 * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.96;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, pts[0].w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (n === 2) {
      const w = (pts[0].w + pts[1].w) / 2;
      // Glow pass
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = w * 1.5;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
      // Main pass
      ctx.globalAlpha = 0.96;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
      ctx.restore();
    } else {
      // Three-pass smooth quadratic curve: outer glow + mid halo + crisp core
      const a = pts[n - 3], b = pts[n - 2], c = pts[n - 1];
      const mx1 = (a.x + b.x) / 2, my1 = (a.y + b.y) / 2;
      const mx2 = (b.x + c.x) / 2, my2 = (b.y + c.y) / 2;
      // Pass 1: wide soft glow
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.lineWidth = b.w * 1.7;
      ctx.beginPath();
      ctx.moveTo(mx1, my1);
      ctx.quadraticCurveTo(b.x, b.y, mx2, my2);
      ctx.stroke();
      // Pass 2: medium halo
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = b.w * 1.3;
      ctx.beginPath();
      ctx.moveTo(mx1, my1);
      ctx.quadraticCurveTo(b.x, b.y, mx2, my2);
      ctx.stroke();
      // Pass 3: crisp core
      ctx.globalAlpha = 0.96;
      ctx.lineWidth = b.w;
      ctx.beginPath();
      ctx.moveTo(mx1, my1);
      ctx.quadraticCurveTo(b.x, b.y, mx2, my2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ----------------------------------------------------------------- erase

  eraseAt(pos, r) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this._forgetNear(pos.x, pos.y, r);
  }

  /// Drop committed stroke points under the eraser, splitting strokes that
  /// are erased through the middle (port of forget_near in ink.rs) — the
  /// stroke model stays true to the visible page.
  _forgetNear(x, y, r) {
    const r2 = (r + 2) * (r + 2);
    const kept = [];
    for (const stroke of this.strokes) {
      let seg = [];
      for (const p of stroke.pts) {
        const dx = p.x - x, dy = p.y - y;
        if (dx * dx + dy * dy <= r2) {
          if (seg.length) { kept.push({ pts: seg }); seg = []; }
        } else seg.push(p);
      }
      if (seg.length) kept.push({ pts: seg });
    }
    this.strokes = kept;
  }

  // ----------------------------------------------------------------- model

  bbox() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const consider = (p) => {
      const r = p.w / 2 + 2;
      x0 = Math.min(x0, p.x - r); y0 = Math.min(y0, p.y - r);
      x1 = Math.max(x1, p.x + r); y1 = Math.max(y1, p.y + r);
    };
    for (const s of this.strokes) for (const p of s.pts) consider(p);
    if (this.current) for (const p of this.current.pts) consider(p);
    if (x0 === Infinity) return null;
    return { x0, y0, x1, y1 };
  }

  /// Strokes as decimated [x, y, radius] integer triples for memory keeping
  /// (port of decimate in memory.rs: drop points closer than 3px).
  serialize() {
    const out = [];
    for (const s of this.strokes) {
      const line = [];
      let lx = null, ly = null;
      for (let i = 0; i < s.pts.length; i++) {
        const p = s.pts[i];
        const keep = lx === null ||
          (p.x - lx) ** 2 + (p.y - ly) ** 2 >= 9 ||
          i === s.pts.length - 1;
        if (keep) {
          line.push([Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.w / 2))]);
          lx = p.x; ly = p.y;
        }
      }
      if (line.length) out.push(line);
    }
    return out;
  }

  /// Rasterize the ink to a PNG for the oracle: cropped to the ink bbox and
  /// downscaled so the long side stays ≤ 800px (port of to_png in ink.rs).
  exportPNG(maxSide = 800) {
    const b = this.bbox();
    if (!b) return null;
    const pad = 20;
    const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad);
    const x1 = Math.min(this.w, b.x1 + pad), y1 = Math.min(this.h, b.y1 + pad);
    const cw = x1 - x0, ch = y1 - y0;
    if (cw < 4 || ch < 4) return null;
    const f = Math.max(1, Math.ceil(Math.max(cw, ch) / maxSide));
    const w = Math.max(1, Math.round(cw / f)), h = Math.max(1, Math.round(ch / f));
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const octx = off.getContext("2d");
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, w, h);
    octx.scale(1 / f, 1 / f);
    octx.translate(-x0, -y0);
    for (const s of this.strokes) drawStroke(octx, s.pts, "#000000", 1, 1);
    if (this.current) drawStroke(octx, this.current.pts, "#000000", 1, 1);
    return off.toDataURL("image/png");
  }

  // --------------------------------------------------------------- dissolve

  /// "The diary drinks your ink": hash-dithered dissolve (ink.rs port).
  dissolve(durMs = 1100) {
    return new Promise((resolve) => {
      const b = this.bbox();
      if (!b) { resolve(); return; }
      const d = this.dpr, pad = 10;
      const x0 = Math.max(0, Math.floor((b.x0 - pad) * d));
      const y0 = Math.max(0, Math.floor((b.y0 - pad) * d));
      const x1 = Math.min(this.canvas.width, Math.ceil((b.x1 + pad) * d));
      const y1 = Math.min(this.canvas.height, Math.ceil((b.y1 + pad) * d));
      const w = x1 - x0, h = y1 - y0;
      if (w <= 0 || h <= 0) { resolve(); return; }
      const img = this.ctx.getImageData(x0, y0, w, h);
      const data = img.data;
      const stages = 24;
      const buckets = Array.from({ length: stages }, () => []);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const ai = (py * w + px) * 4 + 3;
          if (data[ai] > 0) buckets[pxHash(x0 + px, y0 + py) % stages].push(ai);
        }
      }
      let s = 0;
      const stepMs = durMs / stages;
      const tick = () => {
        if (s >= stages) { resolve(); return; }
        for (const ai of buckets[s]) data[ai] = 0;
        this.ctx.putImageData(img, x0, y0);
        s++;
        setTimeout(tick, stepMs);
      };
      tick();
    });
  }

  // ---------------------------------------------------- "?" detection

  /// Does the committed ink look like a single big "?"? Port of
  /// looks_like_question_mark (help.rs); thresholds scale with paper height
  /// (the original was tuned for the 1404×1872 reMarkable screen).
  looksLikeQuestionMark() {
    const strokes = this.strokes.map((s) => s.pts);
    if (!strokes.length || strokes.length > 3) return false;
    const k = this.h / 1872;
    let mainI = 0;
    for (let i = 1; i < strokes.length; i++) if (strokes[i].length > strokes[mainI].length) mainI = i;
    const main = strokes[mainI];
    if (main.length < 12) return false;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of main) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    const w = x1 - x0, h = y1 - y0;
    if (h < 280 * k || w < 70 * k || h < w) return false;
    for (let i = 0; i < strokes.length; i++) {
      if (i === mainI) continue;
      const s = strokes[i];
      let dx0 = Infinity, dy0 = Infinity, dx1 = -Infinity, dy1 = -Infinity;
      for (const p of s) {
        dx0 = Math.min(dx0, p.x); dy0 = Math.min(dy0, p.y);
        dx1 = Math.max(dx1, p.x); dy1 = Math.max(dy1, p.y);
      }
      if (Math.max(dx1 - dx0, dy1 - dy0) > 90 * k) return false;
      if ((dy0 + dy1) / 2 < y0 + h * 0.60) return false;
      if ((dx0 + dx1) / 2 < x0 - 80 * k || (dx0 + dx1) / 2 > x1 + 80 * k) return false;
    }
    const pts = main.map((p) => [p.x, p.y]);
    if (pts[0][1] > pts[pts.length - 1][1]) pts.reverse();
    const start = pts[0], end = pts[pts.length - 1];
    if (start[1] > y0 + h * 0.40 || end[1] < y0 + h * 0.55) return false;
    let topMinX = Infinity, topMaxX = -Infinity, topMaxXy = 0;
    for (const [x, y] of pts) {
      if (y <= y0 + h * 0.45) {
        if (x > topMaxX) { topMaxX = x; topMaxXy = y; }
        topMinX = Math.min(topMinX, x);
      }
    }
    if (topMaxX === -Infinity || topMaxX - topMinX < w * 0.55) return false;
    if (topMaxXy < y0 + h * 0.08) return false;
    let botMinX = Infinity, botMaxX = -Infinity;
    for (const [x, y] of pts) {
      if (y >= y0 + h * 0.66) {
        botMinX = Math.min(botMinX, x);
        botMaxX = Math.max(botMaxX, x);
      }
    }
    if (botMaxX !== -Infinity && botMaxX - botMinX > w * 0.60) return false;
    return true;
  }
}

/// Draw one full stroke (variable width, quadratic midpoints, anti-aliased).
/// Shared by the pad, the PNG export, and the conjuring replay.
/// Uses two-pass rendering: a wider low-alpha halo for smooth edges,
/// then the crisp main stroke on top — eliminates pixel-stepping.
export function drawStroke(ctx, pts, color, alpha = 0.96, widthScale = 1) {
  if (!pts.length) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (pts.length === 1) {
    // Soft halo + solid core for single dot
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, (pts[0].w / 2) * widthScale * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.20;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, (pts[0].w / 2) * widthScale, 0, Math.PI * 2);
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.restore();
    return;
  }
  // Build path segments
  const segments = [];
  segments.push({
    x1: pts[0].x, y1: pts[0].y,
    x2: (pts[0].x + pts[1].x) / 2, y2: (pts[0].y + pts[1].y) / 2,
    w: ((pts[0].w + pts[1].w) / 2) * widthScale,
  });
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    segments.push({
      x1: (a.x + b.x) / 2, y1: (a.y + b.y) / 2,
      x2: (b.x + c.x) / 2, y2: (b.y + c.y) / 2,
      w: b.w * widthScale,
      cx: b.x, cy: b.y,
    });
  }
  // Pass 1: wide soft glow → eliminates all jagged edges
  ctx.globalAlpha = alpha * 0.08;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of segments) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    if (s.cx !== undefined) {
      ctx.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2);
    } else {
      ctx.lineTo(s.x2, s.y2);
    }
    ctx.lineWidth = s.w * 1.9;
    ctx.stroke();
  }
  // Pass 2: medium halo → smooth anti-aliased transition
  ctx.globalAlpha = alpha * 0.18;
  for (const s of segments) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    if (s.cx !== undefined) {
      ctx.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2);
    } else {
      ctx.lineTo(s.x2, s.y2);
    }
    ctx.lineWidth = s.w * 1.45;
    ctx.stroke();
  }
  // Pass 3: main crisp stroke
  ctx.globalAlpha = alpha;
  for (const s of segments) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    if (s.cx !== undefined) {
      ctx.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2);
    } else {
      ctx.lineTo(s.x2, s.y2);
    }
    ctx.lineWidth = s.w;
    ctx.stroke();
  }
  ctx.restore();
}

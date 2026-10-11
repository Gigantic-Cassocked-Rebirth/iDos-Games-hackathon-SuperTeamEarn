// Drawing the table: packed steppe earth with a carpet-ornament border, the chalk ring and lines,
// the bones themselves (drawn as vectors, no image assets), and the little effects — dust, trails,
// floating words, the aiming band.

import type { SaqaDef } from "../data/saqas";
import {
  LINE_X_MAX,
  LINE_X_MIN,
  LINE_Y,
  RING,
  WORLD_H,
  WORLD_W,
  type Body,
} from "./physics";

export interface View {
  scale: number;
  ox: number;
  oy: number;
  dpr: number;
}

export function fitView(cssW: number, cssH: number, dpr: number): View {
  const scale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
  return {
    scale,
    ox: (cssW - WORLD_W * scale) / 2,
    oy: (cssH - WORLD_H * scale) / 2,
    dpr,
  };
}

export function toWorld(view: View, cssX: number, cssY: number): { x: number; y: number } {
  return { x: (cssX - view.ox) / view.scale, y: (cssY - view.oy) / view.scale };
}

// ── Table (drawn once per size into an offscreen canvas) ────────────────────────────────────

export function renderTable(view: View, cssW: number, cssH: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(cssW * view.dpr));
  c.height = Math.max(1, Math.round(cssH * view.dpr));
  const g = c.getContext("2d");
  if (!g) return c;
  g.scale(view.dpr, view.dpr);

  // Outside the table: night steppe.
  const sky = g.createLinearGradient(0, 0, 0, cssH);
  sky.addColorStop(0, "#1d2440");
  sky.addColorStop(1, "#2c1f2a");
  g.fillStyle = sky;
  g.fillRect(0, 0, cssW, cssH);

  g.save();
  g.translate(view.ox, view.oy);
  g.scale(view.scale, view.scale);

  // Packed earth.
  const earth = g.createRadialGradient(RING.x, RING.y, 80, RING.x, RING.y, 900);
  earth.addColorStop(0, "#d8ac72");
  earth.addColorStop(0.6, "#c0905a");
  earth.addColorStop(1, "#946a40");
  g.fillStyle = earth;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // Grit and pebbles (seeded, so the table looks the same every time).
  const rand = seeded(7);
  for (let i = 0; i < 1400; i++) {
    const x = rand() * WORLD_W;
    const y = rand() * WORLD_H;
    const r = 0.6 + rand() * 2.2;
    g.fillStyle =
      rand() < 0.5 ? `rgba(90,58,30,${0.08 + rand() * 0.15})` : `rgba(255,236,200,${0.06 + rand() * 0.12})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // Tufts of feather grass along the sides.
  for (let i = 0; i < 70; i++) {
    const side = rand() < 0.5;
    const x = side ? rand() * 70 : WORLD_W - rand() * 70;
    const y = 90 + rand() * (WORLD_H - 180);
    tuft(g, x, y, rand);
  }

  // Carpet bands (ram-horn "qoshqar muiz" curls) at the far ends.
  ornamentBand(g, 0, 0, WORLD_W, 58, "#8f2a22", "#f0c25a");
  ornamentBand(g, 0, WORLD_H - 58, WORLD_W, 58, "#1f4f7a", "#f0c25a");

  // Chalk ring.
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = `rgba(255,252,240,${0.55 - k * 0.15})`;
    g.lineWidth = 7 - k * 2;
    g.beginPath();
    g.arc(RING.x + (k - 1) * 1.2, RING.y + (1 - k) * 1.1, RING.r + (k - 1) * 1.5, 0, Math.PI * 2);
    g.stroke();
  }
  // The row the asyqs are set on.
  g.strokeStyle = "rgba(255,252,240,0.25)";
  g.lineWidth = 3;
  g.setLineDash([10, 12]);
  g.beginPath();
  g.moveTo(RING.x - RING.r + 30, RING.y);
  g.lineTo(RING.x + RING.r - 30, RING.y);
  g.stroke();

  // Throw lines.
  for (const y of [LINE_Y.player, LINE_Y.bot]) {
    g.strokeStyle = "rgba(255,252,240,0.6)";
    g.lineWidth = 5;
    g.setLineDash([22, 14]);
    g.beginPath();
    g.moveTo(LINE_X_MIN - 30, y);
    g.lineTo(LINE_X_MAX + 30, y);
    g.stroke();
  }
  g.setLineDash([]);
  g.restore();

  // Soft vignette.
  const vig = g.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.35, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.35)");
  g.fillStyle = vig;
  g.fillRect(0, 0, cssW, cssH);
  return c;
}

function tuft(g: CanvasRenderingContext2D, x: number, y: number, rand: () => number): void {
  g.strokeStyle = `rgba(${150 + rand() * 40},${150 + rand() * 30},${80 + rand() * 30},0.8)`;
  g.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 1.4;
    const len = 10 + rand() * 18;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 4, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
}

function ornamentBand(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  ink: string,
): void {
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.fillRect(x, y + h - 6, w, 6);
  g.fillRect(x, y, w, 6);
  g.strokeStyle = ink;
  g.lineWidth = 4;
  g.lineCap = "round";
  const cell = h * 1.3;
  const cy = y + h / 2;
  for (let cx = x + cell / 2; cx < x + w; cx += cell) {
    // A pair of curls back to back: the ram's horns.
    for (const dir of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx, cy + h * 0.28);
      g.lineTo(cx, cy);
      g.bezierCurveTo(cx, cy - h * 0.32, cx + dir * h * 0.42, cy - h * 0.32, cx + dir * h * 0.42, cy - h * 0.02);
      g.bezierCurveTo(cx + dir * h * 0.42, cy + h * 0.16, cx + dir * h * 0.2, cy + h * 0.16, cx + dir * h * 0.2, cy + h * 0.02);
      g.stroke();
    }
  }
  g.lineCap = "butt";
}

// ── Bones ────────────────────────────────────────────────────────────────────────────────────

const ASYQ_COLORS: [string, string, string] = ["#efe4cc", "#b9a37b", "#fffaf0"];

export function drawShadow(g: CanvasRenderingContext2D, b: Body): void {
  g.fillStyle = "rgba(40,20,5,0.28)";
  g.beginPath();
  g.ellipse(b.x + 5, b.y + 7, b.r * 1.15, b.r * 0.85, b.angle, 0, Math.PI * 2);
  g.fill();
}

export function drawBone(
  g: CanvasRenderingContext2D,
  b: Body,
  look: SaqaDef | null,
  glow = 0,
): void {
  const colors = look?.colors ?? ASYQ_COLORS;
  const r = b.r;
  g.save();
  g.translate(b.x, b.y);
  g.rotate(b.angle);
  if (glow > 0) {
    g.shadowColor = `rgba(255,230,120,${glow})`;
    g.shadowBlur = 24;
  }
  // Body: two lobes joined by a waist — a knucklebone seen from above.
  const grad = g.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, colors[2]);
  grad.addColorStop(0.45, colors[0]);
  grad.addColorStop(1, colors[1]);
  g.fillStyle = grad;
  g.beginPath();
  bonePath(g, r);
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = shade(colors[1], 0.55);
  g.lineWidth = Math.max(1.2, r * 0.07);
  g.stroke();

  g.save();
  g.clip();
  if (look?.pattern === "stripes") {
    g.strokeStyle = "rgba(255,230,200,0.45)";
    g.lineWidth = r * 0.14;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * r * 0.45, -r);
      g.lineTo(i * r * 0.45 + r * 0.3, r);
      g.stroke();
    }
  } else if (look?.pattern === "ornament") {
    g.strokeStyle = "rgba(120,60,0,0.55)";
    g.lineWidth = r * 0.09;
    for (const dir of [-1, 1]) {
      g.beginPath();
      g.arc(dir * r * 0.55, 0, r * 0.32, 0, Math.PI * 1.5);
      g.stroke();
    }
  } else if (look?.pattern === "scales") {
    g.strokeStyle = "rgba(10,40,25,0.5)";
    g.lineWidth = r * 0.07;
    for (let yy = -1; yy <= 1; yy++)
      for (let xx = -2; xx <= 2; xx++) {
        g.beginPath();
        g.arc(xx * r * 0.42 + (yy % 2 ? r * 0.21 : 0), yy * r * 0.42, r * 0.22, 0, Math.PI);
        g.stroke();
      }
  }
  // The groove across the middle and the little dimple: what makes a bone look like a bone.
  g.strokeStyle = shade(colors[1], 0.7);
  g.lineWidth = r * 0.12;
  g.beginPath();
  g.moveTo(-r * 0.05, -r * 0.62);
  g.quadraticCurveTo(r * 0.18, 0, -r * 0.05, r * 0.62);
  g.stroke();
  g.fillStyle = shade(colors[1], 0.75);
  g.beginPath();
  g.ellipse(-r * 0.55, r * 0.05, r * 0.16, r * 0.11, 0.3, 0, Math.PI * 2);
  g.fill();
  // Gloss.
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath();
  g.ellipse(r * 0.4, -r * 0.3, r * 0.3, r * 0.14, -0.4, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.restore();
}

function bonePath(g: CanvasRenderingContext2D, r: number): void {
  const L = r * 1.2; // half-length
  const H = r * 0.78; // half-height of a lobe
  const W = r * 0.5; // half-height at the waist
  g.moveTo(-L, 0);
  g.bezierCurveTo(-L, -H * 1.05, -L * 0.35, -H * 1.05, 0, -W);
  g.bezierCurveTo(L * 0.35, -H * 1.05, L, -H * 1.05, L, 0);
  g.bezierCurveTo(L, H * 1.05, L * 0.35, H * 1.05, 0, W);
  g.bezierCurveTo(-L * 0.35, H * 1.05, -L, H * 1.05, -L, 0);
  g.closePath();
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const gg = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${gg},${b})`;
}

// ── Effects ──────────────────────────────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
}

export function dust(list: Particle[], x: number, y: number, strength: number): void {
  const n = Math.min(14, 3 + Math.floor(strength / 160));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 30 + Math.random() * strength * 0.12;
    list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.45 + Math.random() * 0.4, size: 4 + Math.random() * 7 });
  }
}

export function drawParticles(g: CanvasRenderingContext2D, list: Particle[], dt: number): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]!;
    p.life += dt;
    if (p.life >= p.max) {
      list.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    const t = p.life / p.max;
    g.fillStyle = `rgba(235,210,170,${0.5 * (1 - t)})`;
    g.beginPath();
    g.arc(p.x, p.y, p.size * (0.6 + t), 0, Math.PI * 2);
    g.fill();
  }
}

export function drawTexts(g: CanvasRenderingContext2D, list: FloatText[], dt: number): void {
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i]!;
    f.life += dt;
    if (f.life >= f.max) {
      list.splice(i, 1);
      continue;
    }
    const t = f.life / f.max;
    const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - Math.min(0.1, (t - 0.15) * 0.3);
    g.save();
    g.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
    g.translate(f.x, f.y - t * 60);
    g.scale(pop, pop);
    g.font = `900 ${f.size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.lineWidth = f.size * 0.18;
    g.strokeStyle = "rgba(40,15,5,0.85)";
    g.strokeText(f.text, 0, 0);
    g.fillStyle = f.color;
    g.fillText(f.text, 0, 0);
    g.restore();
  }
}

export function drawTrail(g: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>, color: string): void {
  if (pts.length < 2) return;
  for (let i = 1; i < pts.length; i++) {
    const t = i / pts.length;
    g.strokeStyle = color.replace("ALPHA", (t * 0.35).toFixed(3));
    g.lineWidth = 4 + t * 14;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(pts[i - 1]!.x, pts[i - 1]!.y);
    g.lineTo(pts[i]!.x, pts[i]!.y);
    g.stroke();
  }
  g.lineCap = "butt";
}

/** The pull-back band and the flight arrow while aiming. */
export function drawAim(
  g: CanvasRenderingContext2D,
  saqa: Body,
  pull: { x: number; y: number },
  angle: number,
  power: number,
): void {
  // Band from the saqa to the finger.
  g.strokeStyle = "rgba(90,40,20,0.75)";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(saqa.x, saqa.y);
  g.lineTo(pull.x, pull.y);
  g.stroke();
  g.fillStyle = "rgba(255,250,235,0.85)";
  g.beginPath();
  g.arc(pull.x, pull.y, 9, 0, Math.PI * 2);
  g.fill();

  // Arrow the way it will fly, coloured by power.
  const len = 120 + power * 420;
  const hue = 120 - power * 120;
  const ex = saqa.x + Math.cos(angle) * len;
  const ey = saqa.y + Math.sin(angle) * len;
  g.strokeStyle = `hsla(${hue},85%,55%,0.9)`;
  g.lineWidth = 6;
  g.setLineDash([16, 12]);
  g.beginPath();
  g.moveTo(saqa.x + Math.cos(angle) * (saqa.r + 6), saqa.y + Math.sin(angle) * (saqa.r + 6));
  g.lineTo(ex, ey);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = `hsla(${hue},85%,55%,0.95)`;
  g.beginPath();
  g.moveTo(ex + Math.cos(angle) * 22, ey + Math.sin(angle) * 22);
  g.lineTo(ex + Math.cos(angle + 2.5) * 18, ey + Math.sin(angle + 2.5) * 18);
  g.lineTo(ex + Math.cos(angle - 2.5) * 18, ey + Math.sin(angle - 2.5) * 18);
  g.closePath();
  g.fill();
}

/** A pulsing hint around the saqa when it is the player's move. */
export function drawReady(g: CanvasRenderingContext2D, saqa: Body, time: number, fromLine: boolean): void {
  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  g.strokeStyle = `rgba(255,240,170,${0.35 + pulse * 0.4})`;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(saqa.x, saqa.y, saqa.r + 14 + pulse * 6, 0, Math.PI * 2);
  g.stroke();
  if (fromLine) {
    g.fillStyle = "rgba(255,250,235,0.55)";
    for (const dir of [-1, 1]) {
      const x = saqa.x + dir * (saqa.r + 40);
      g.beginPath();
      g.moveTo(x + dir * 14, saqa.y);
      g.lineTo(x, saqa.y - 10);
      g.lineTo(x, saqa.y + 10);
      g.closePath();
      g.fill();
    }
  }
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

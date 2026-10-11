// Draws the store banner (1920×1080) from the game's own renderer. Not part of the build.
import { drawBone, ornamentBand, seeded, tuft } from "../src/modules/asyq/game/render";
import { makeBody } from "../src/modules/asyq/game/physics";
import { saqaById } from "../src/modules/asyq/data/saqas";

const W = 1920, H = 1080;
const g = (document.getElementById("c") as HTMLCanvasElement).getContext("2d")!;
const rand = seeded(11);

// Earth.
const earth = g.createRadialGradient(1340, 560, 100, 1340, 560, 1300);
earth.addColorStop(0, "#dcb078"); earth.addColorStop(0.55, "#c0905a"); earth.addColorStop(1, "#7d5634");
g.fillStyle = earth; g.fillRect(0, 0, W, H);
for (let i = 0; i < 4200; i++) {
  g.fillStyle = rand() < 0.5 ? `rgba(90,58,30,${0.08 + rand() * 0.15})` : `rgba(255,236,200,${0.06 + rand() * 0.12})`;
  g.beginPath(); g.arc(rand() * W, rand() * H, 0.8 + rand() * 3, 0, 7); g.fill();
}
for (let i = 0; i < 40; i++) tuft(g, 1700 + rand() * 220, 90 + rand() * 900, rand);

// The ring.
const R = { x: 1330, y: 560, r: 360 };
for (let k = 0; k < 3; k++) {
  g.strokeStyle = `rgba(255,252,240,${0.6 - k * 0.15})`; g.lineWidth = 11 - k * 3;
  g.beginPath(); g.arc(R.x + (k - 1) * 2, R.y + (1 - k) * 2, R.r + (k - 1) * 2, 0, 7); g.stroke();
}

// Dust where the saqa hit.
for (let i = 0; i < 26; i++) {
  const a = rand() * 7, d = rand() * 70;
  g.fillStyle = `rgba(240,215,175,${0.12 + rand() * 0.25})`;
  g.beginPath(); g.arc(1290 + Math.cos(a) * d, 560 + Math.sin(a) * d, 10 + rand() * 22, 0, 7); g.fill();
}

const bone = (x: number, y: number, ang: number, r: number, look: string | null, glow = 0) => {
  const b = makeBody(1, look ? "saqa" : "asyq", x, y, 1, 1); b.r = r; b.angle = ang;
  g.fillStyle = "rgba(40,20,5,0.3)"; g.beginPath(); g.ellipse(x + 8, y + 11, r * 1.2, r * 0.9, ang, 0, 7); g.fill();
  drawBone(g, b, look ? saqaById(look) : null, glow);
};

// Saqa trail, coming in from the bottom right.
const pts: Array<[number, number]> = [];
for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([1690 - t * 360, 1000 - t * 420]); }
for (let i = 1; i < pts.length; i++) {
  const t = i / pts.length;
  g.strokeStyle = `rgba(255,230,150,${t * 0.45})`; g.lineWidth = 6 + t * 40; g.lineCap = "round";
  g.beginPath(); g.moveTo(...pts[i - 1]!); g.lineTo(...pts[i]!); g.stroke();
}

// Asyqs: some still in the row, some flying out.
const row = [[1080, 560], [1145, 562], [1210, 558]] as const;
row.forEach(([x, y], i) => bone(x, y, Math.PI / 2 + i * 0.1, 34, null));
bone(1440, 540, 0.6, 34, null); bone(1515, 590, 2.2, 34, null);
// Flying out, with motion lines.
const flying = [[1250, 300, -0.9], [1620, 330, 0.8], [1180, 820, 2.6], [1730, 700, 1.2]] as const;
for (const [x, y, a] of flying) {
  g.strokeStyle = "rgba(255,250,235,0.55)"; g.lineWidth = 5;
  for (let k = -1; k <= 1; k++) {
    const dx = x - 1300, dy = y - 560, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    g.beginPath(); g.moveTo(x - ux * 70 - uy * k * 18, y - uy * 70 + ux * k * 18); g.lineTo(x - ux * 130 - uy * k * 18, y - uy * 130 + ux * k * 18); g.stroke();
  }
  bone(x, y, a, 34, null);
}
bone(1330, 580, -0.7, 46, "altyn", 0.9);

// Carpet bands.
ornamentBand(g, 0, 0, W, 78, "#8f2a22", "#f0c25a");
ornamentBand(g, 0, H - 78, W, 78, "#1f4f7a", "#f0c25a");

// Left: title panel.
const fade = g.createLinearGradient(0, 0, 1050, 0);
fade.addColorStop(0, "rgba(20,24,48,0.92)"); fade.addColorStop(0.62, "rgba(20,24,48,0.78)"); fade.addColorStop(1, "rgba(20,24,48,0)");
g.fillStyle = fade; g.fillRect(0, 78, 1050, H - 156);

const text = (s: string, x: number, y: number, size: number, fill: string | CanvasGradient, weight = 900, stroke = 0.12) => {
  g.font = `${weight} ${size}px Inter, "DejaVu Sans", sans-serif`;
  g.lineJoin = "round"; g.lineWidth = size * stroke; g.strokeStyle = "rgba(30,12,2,0.9)";
  if (stroke) g.strokeText(s, x, y);
  g.fillStyle = fill; g.fillText(s, x, y);
};
g.textBaseline = "alphabetic";
const gold = g.createLinearGradient(0, 230, 0, 420);
gold.addColorStop(0, "#fff1b8"); gold.addColorStop(0.5, "#f2c14e"); gold.addColorStop(1, "#c38a24");
text("Асық ату", 120, 250, 64, "#f4ead2", 800, 0.1);
text("Asyq Atu", 112, 420, 190, gold, 900, 0.09);
text("Kazakh knucklebones on Solana", 120, 510, 54, "#f4ead2", 700, 0.1);

// Feature line.
const items = ["Flick your saqa", "Knock asyqs out of the ring", "Climb the leaderboard"];
g.font = `700 34px Inter, "DejaVu Sans", sans-serif`;
let y = 610;
for (const it of items) {
  g.fillStyle = "#f2c14e"; g.beginPath(); g.arc(138, y - 11, 9, 0, 7); g.fill();
  g.fillStyle = "#e8e2d4"; g.fillText(it, 165, y); y += 58;
}

// Token badge.
const img = new Image();
img.src = "./token.png";
img.onload = () => {
  g.drawImage(img, 116, 810, 150, 150);
  const sol = g.createLinearGradient(290, 0, 720, 0);
  sol.addColorStop(0, "#b58cff"); sol.addColorStop(1, "#14f195");
  text("$ASYQ", 292, 880, 64, sol, 900, 0.08);
  text("SPL token · wallet sign-in", 294, 930, 32, "#cfc8b8", 600, 0);
  document.title = "ready";
};

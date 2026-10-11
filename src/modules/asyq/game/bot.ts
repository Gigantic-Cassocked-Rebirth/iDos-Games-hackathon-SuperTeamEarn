// The opponent: it tries a spread of shots on a copy of the table, keeps the one that wins the most
// asyqs without burning its saqa, then throws it with a human hand — the weaker the opponent, the
// shakier the aim.

import type { Opponent } from "../data/opponents";
import { asyqsLeft, saqaOf, type Match } from "./match";
import {
  LINE_X_MAX,
  LINE_X_MIN,
  cloneBodies,
  outsideRing,
  settle,
  MAX_SPEED,
  WORLD_W,
} from "./physics";

export interface BotShot {
  x: number;
  angle: number;
  power: number;
}

export function planShot(m: Match, opp: Opponent, rand = Math.random): BotShot {
  const saqa = saqaOf(m);
  if (!saqa) return { x: WORLD_W / 2, angle: Math.PI / 2, power: 0.8 };
  const targets = asyqsLeft(m);
  const xs = m.fromLine
    ? [saqa.x, ...Array.from({ length: 3 }, () => lerp(LINE_X_MIN, LINE_X_MAX, rand()))]
    : [saqa.x];
  const offsets = [0, -0.035, 0.035, -0.08, 0.08];
  const powers = [0.55, 0.75, 0.95];
  // A weaker opponent considers fewer ideas.
  const budget = Math.max(12, Math.round(220 * opp.effort));

  const candidates: BotShot[] = [];
  for (const x of xs) {
    for (const t of targets) {
      const base = Math.atan2(t.y - saqa.y, t.x - x);
      for (const o of offsets) for (const p of powers) candidates.push({ x, angle: base + o, power: p });
    }
  }
  shuffle(candidates, rand);

  let best: BotShot = candidates[0] ?? { x: saqa.x, angle: Math.PI / 2, power: 0.8 };
  let bestValue = -Infinity;
  for (const c of candidates.slice(0, budget)) {
    const value = evaluate(m, c) + rand() * 0.5;
    if (value > bestValue) {
      bestValue = value;
      best = c;
    }
  }
  return {
    x: best.x,
    angle: best.angle + gauss(rand) * opp.aimNoise,
    power: Math.min(1, Math.max(0.25, best.power * (1 + gauss(rand) * opp.powerNoise))),
  };
}

function evaluate(m: Match, shot: BotShot): number {
  const bodies = cloneBodies(m.bodies);
  const s = bodies.find((b) => b.kind === "saqa");
  if (!s) return -Infinity;
  s.x = shot.x;
  s.vx = Math.cos(shot.angle) * shot.power * MAX_SPEED;
  s.vy = Math.sin(shot.angle) * shot.power * MAX_SPEED;
  settle(bodies);
  const won = bodies.filter((b) => b.kind === "asyq" && outsideRing(b)).length;
  const burned = !s.off && !outsideRing(s);
  return won * 10 - (burned ? 7 : 0);
}

function gauss(rand: () => number): number {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function shuffle<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

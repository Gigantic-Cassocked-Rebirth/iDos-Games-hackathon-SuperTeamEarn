// The rules of a match of asyq atu (knucklebone shooting), as played in many an aul:
//
// - Nine asyqs stand in a row across the middle of a chalk ring (the kon).
// - Players take turns flicking their saqa (the heavy shooter bone) from their throw line.
// - Every asyq knocked out of the ring is yours. Knock one out and you shoot again, from where your
//   saqa stopped.
// - If your saqa stops inside the ring it "burns": your turn ends, even if you knocked one out.
// - When the ring is empty, whoever holds more asyqs wins.

import {
  ASYQ_R,
  LINE_X_MAX,
  LINE_X_MIN,
  LINE_Y,
  MAX_SPEED,
  RING,
  WORLD_H,
  WORLD_W,
  makeBody,
  outsideRing,
  type Body,
} from "./physics";

export type Side = "player" | "bot";

export const ASYQ_COUNT = 9;
const ROW_GAP = 44;

export interface SaqaStats {
  mass: number;
  bounce: number;
}

export interface Match {
  bodies: Body[];
  turn: Side;
  saqa: Record<Side, SaqaStats>;
  captured: Record<Side, number>;
  /** The shooter's saqa is back on the throw line (they may slide it along the line). */
  fromLine: boolean;
  shots: Record<Side, number>;
  /** Asyqs captured by each of the player's shots that captured any, for the combo bonus. */
  playerCombos: number[];
  bestCombo: number;
  over: boolean;
  nextId: number;
}

export interface ShotOutcome {
  shooter: Side;
  capturedIds: number[];
  burned: boolean;
  /** Reserved for the stricter rule (a burned shooter gives one asyq back); always null for now. */
  returnedId: number | null;
  again: boolean;
  over: boolean;
}

export function newMatch(
  playerSaqa: SaqaStats,
  botSaqa: SaqaStats,
  first: Side = "player",
): Match {
  const bodies: Body[] = [];
  const start = RING.x - ((ASYQ_COUNT - 1) / 2) * ROW_GAP;
  for (let i = 0; i < ASYQ_COUNT; i++) {
    bodies.push(makeBody(i + 1, "asyq", start + i * ROW_GAP, RING.y, 1, 0.86));
  }
  const m: Match = {
    bodies,
    turn: first,
    saqa: { player: playerSaqa, bot: botSaqa },
    captured: { player: 0, bot: 0 },
    fromLine: true,
    shots: { player: 0, bot: 0 },
    playerCombos: [],
    bestCombo: 0,
    over: false,
    nextId: 100,
  };
  placeSaqaOnLine(m, first, WORLD_W / 2);
  return m;
}

export function saqaOf(m: Match): Body | undefined {
  return m.bodies.find((b) => b.kind === "saqa");
}

export function asyqsLeft(m: Match): Body[] {
  return m.bodies.filter((b) => b.kind === "asyq");
}

/** Put the shooter's saqa on their throw line at `x` (clamped), replacing any saqa in play. */
export function placeSaqaOnLine(m: Match, side: Side, x: number): void {
  m.bodies = m.bodies.filter((b) => b.kind !== "saqa");
  const s = makeBody(
    m.nextId++,
    "saqa",
    clamp(x, LINE_X_MIN, LINE_X_MAX),
    LINE_Y[side],
    m.saqa[side].mass,
    m.saqa[side].bounce,
  );
  s.angle = side === "player" ? -Math.PI / 2 : Math.PI / 2;
  m.bodies.push(s);
  m.fromLine = true;
}

export function slideSaqa(m: Match, x: number): void {
  const s = saqaOf(m);
  if (!s || !m.fromLine) return;
  s.x = clamp(x, LINE_X_MIN, LINE_X_MAX);
}

/** Flick: `power` 0..1, `angle` in radians (world space). */
export function shoot(m: Match, angle: number, power: number): void {
  const s = saqaOf(m);
  if (!s || m.over) return;
  const speed = clamp(power, 0, 1) * MAX_SPEED;
  s.vx = Math.cos(angle) * speed;
  s.vy = Math.sin(angle) * speed;
  s.spin = (Math.random() - 0.5) * 8;
  m.shots[m.turn]++;
}

/** Call once everything has come to rest after a shot: applies the rules and passes the turn. */
export function resolveShot(m: Match): ShotOutcome {
  const shooter = m.turn;
  const out = m.bodies.filter((b) => b.kind === "asyq" && outsideRing(b));
  const capturedIds = out.map((b) => b.id);
  m.bodies = m.bodies.filter((b) => !(b.kind === "asyq" && outsideRing(b)));
  m.captured[shooter] += out.length;
  if (shooter === "player" && out.length > 0) {
    m.playerCombos.push(out.length);
    m.bestCombo = Math.max(m.bestCombo, out.length);
  }

  const s = saqaOf(m);
  const burned = !!s && !s.off && !outsideRing(s);
  const returnedId: number | null = null;

  const left = asyqsLeft(m).length;
  m.over = left === 0;
  const again = !m.over && !burned && out.length > 0;
  if (m.over) {
    m.bodies = m.bodies.filter((b) => b.kind !== "saqa");
  } else if (again) {
    // Shoot again from where the saqa stopped, or from the line if it left the table.
    if (!s || s.off || !onTable(s)) placeSaqaOnLine(m, shooter, s?.x ?? WORLD_W / 2);
    else {
      m.fromLine = false;
      s.spin = 0;
    }
  } else {
    m.turn = shooter === "player" ? "bot" : "player";
    placeSaqaOnLine(m, m.turn, WORLD_W / 2);
  }
  return { shooter, capturedIds, burned, returnedId, again, over: m.over };
}

export function winner(m: Match): Side | null {
  if (!m.over) return null;
  return m.captured.player > m.captured.bot ? "player" : "bot";
}

// ── Score ────────────────────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  asyqs: number;
  combos: number;
  win: number;
  sweep: number;
  multiplier: number;
  total: number;
}

/** What a finished match is worth on the leaderboard. */
export function scoreMatch(m: Match, multiplier: number): ScoreBreakdown {
  const asyqs = m.captured.player * 100;
  const combos = m.playerCombos.reduce((sum, k) => sum + (k - 1) * k * 25, 0);
  const won = winner(m) === "player";
  const win = won ? 300 : 0;
  const sweep = won && m.captured.bot === 0 ? 500 : 0;
  const total = Math.round((asyqs + combos + win + sweep) * multiplier);
  return { asyqs, combos, win, sweep, multiplier, total };
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

function onTable(b: Body): boolean {
  return b.x > 20 && b.x < WORLD_W - 20 && b.y > 20 && b.y < WORLD_H - 20;
}

/** Find a spot near the ring's centre that overlaps nothing. */
function placeFree(m: Match, b: Body): void {
  for (let ring = 0; ring < 8; ring++) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + ring;
      const x = RING.x + Math.cos(a) * ring * ASYQ_R * 2.4;
      const y = RING.y + Math.sin(a) * ring * ASYQ_R * 2.4;
      if (m.bodies.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + b.r + 2)) {
        b.x = x;
        b.y = y;
        return;
      }
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

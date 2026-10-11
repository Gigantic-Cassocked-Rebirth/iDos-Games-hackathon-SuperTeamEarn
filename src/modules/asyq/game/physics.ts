// The table's physics: round bodies sliding on packed earth. Pure and deterministic (fixed step, no
// randomness), so the bot can plan a shot by running the very same simulation on a copy of the world.

export const WORLD_W = 700;
export const WORLD_H = 1150;

/** The chalk ring (kon) every asyq starts inside. An asyq whose centre leaves it is captured. */
export const RING = { x: 350, y: 575, r: 260 };

/** The throw lines: the player shoots from the bottom one, the opponent from the top one. */
export const LINE_Y = { player: 1040, bot: 110 } as const;
export const LINE_X_MIN = 110;
export const LINE_X_MAX = 590;

export const ASYQ_R = 19;
export const SAQA_R = 25;

/** Fastest flick, world units per second. */
export const MAX_SPEED = 2300;

const STEP = 1 / 180;
/** Sliding friction (constant deceleration) and a little air/rolling drag. */
const FRICTION = 1350;
const DRAG = 0.55;
const REST_SPEED = 6;
/** How far past the table's edge a body may fly before it is taken off. */
const OFF_MARGIN = 60;

export interface Body {
  id: number;
  kind: "asyq" | "saqa";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  mass: number;
  /** Bounciness of this body's surface (a lead saqa is a bit deader than bone). */
  bounce: number;
  angle: number;
  spin: number;
  /** Flew off the table — no longer simulated. */
  off: boolean;
}

export interface Impact {
  x: number;
  y: number;
  /** Closing speed of the two bodies, for sound volume and dust. */
  speed: number;
  a: number;
  b: number;
}

export function makeBody(
  id: number,
  kind: Body["kind"],
  x: number,
  y: number,
  mass: number,
  bounce: number,
): Body {
  return {
    id,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    r: kind === "saqa" ? SAQA_R : ASYQ_R,
    mass,
    bounce,
    angle: kind === "saqa" ? -Math.PI / 2 : Math.PI / 2 + (id % 3) * 0.08,
    spin: 0,
    off: false,
  };
}

export function cloneBodies(bodies: Body[]): Body[] {
  return bodies.map((b) => ({ ...b }));
}

export function isMoving(bodies: Body[]): boolean {
  return bodies.some((b) => !b.off && (b.vx !== 0 || b.vy !== 0));
}

export function outsideRing(b: Body): boolean {
  return b.off || Math.hypot(b.x - RING.x, b.y - RING.y) > RING.r;
}

/** Advance the world by `dt` seconds in fixed steps; returns the impacts that happened. */
export function advance(
  bodies: Body[],
  dt: number,
  acc: { t: number },
): Impact[] {
  const impacts: Impact[] = [];
  acc.t += dt;
  let guard = 0;
  while (acc.t >= STEP && guard++ < 200) {
    acc.t -= STEP;
    step(bodies, impacts);
  }
  return impacts;
}

export function step(bodies: Body[], impacts?: Impact[]): void {
  for (const b of bodies) {
    if (b.off) continue;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed === 0) {
      b.spin *= 0.9;
      b.angle += b.spin * STEP;
      continue;
    }
    const slowed = Math.max(0, speed - FRICTION * STEP) * (1 - DRAG * STEP);
    if (slowed < REST_SPEED) {
      b.vx = 0;
      b.vy = 0;
    } else {
      const k = slowed / speed;
      b.vx *= k;
      b.vy *= k;
    }
    b.x += b.vx * STEP;
    b.y += b.vy * STEP;
    b.spin *= 1 - 2.5 * STEP;
    b.angle += b.spin * STEP;
    if (
      b.x < -OFF_MARGIN ||
      b.x > WORLD_W + OFF_MARGIN ||
      b.y < -OFF_MARGIN ||
      b.y > WORLD_H + OFF_MARGIN
    ) {
      b.off = true;
      b.vx = 0;
      b.vy = 0;
    }
  }
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]!;
    if (a.off) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j]!;
      if (b.off) continue;
      collide(a, b, impacts);
    }
  }
}

function collide(a: Body, b: Body, impacts?: Impact[]): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min || d2 === 0) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  // Push apart in proportion to the other's mass.
  const overlap = min - d;
  const total = a.mass + b.mass;
  a.x -= nx * overlap * (b.mass / total);
  a.y -= ny * overlap * (b.mass / total);
  b.x += nx * overlap * (a.mass / total);
  b.y += ny * overlap * (a.mass / total);
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const closing = rvx * nx + rvy * ny;
  if (closing >= 0) return;
  const e = Math.min(a.bounce, b.bounce);
  const j = (-(1 + e) * closing) / (1 / a.mass + 1 / b.mass);
  a.vx -= (j * nx) / a.mass;
  a.vy -= (j * ny) / a.mass;
  b.vx += (j * nx) / b.mass;
  b.vy += (j * ny) / b.mass;
  // A glancing blow sets the bones spinning — purely for the look.
  const tangent = rvx * -ny + rvy * nx;
  a.spin += tangent * 0.012;
  b.spin -= tangent * 0.012;
  impacts?.push({
    x: a.x + nx * a.r,
    y: a.y + ny * a.r,
    speed: -closing,
    a: a.id,
    b: b.id,
  });
}

/** Run a copy of the world until everything rests (or a time cap); for planning shots. */
export function settle(bodies: Body[], maxSeconds = 6): Body[] {
  const steps = Math.ceil(maxSeconds / STEP);
  for (let i = 0; i < steps; i++) {
    step(bodies);
    if (i % 20 === 0 && !isMoving(bodies)) break;
  }
  return bodies;
}

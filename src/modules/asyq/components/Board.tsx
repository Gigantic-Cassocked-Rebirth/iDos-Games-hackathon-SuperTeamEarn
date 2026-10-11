import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, outlined, v } from "@idosgames/react/ui";
import type { Opponent } from "../data/opponents";
import { saqaById, type SaqaDef } from "../data/saqas";
import { planShot } from "../game/bot";
import {
  asyqsLeft,
  newMatch,
  resolveShot,
  saqaOf,
  shoot,
  slideSaqa,
  ASYQ_COUNT,
  type Match,
  type Side,
} from "../game/match";
import { LINE_Y, advance, isMoving } from "../game/physics";
import {
  drawAim,
  drawBone,
  drawParticles,
  drawReady,
  drawShadow,
  drawTexts,
  drawTrail,
  dust,
  fitView,
  renderTable,
  toWorld,
  type FloatText,
  type Particle,
  type View,
} from "../game/render";
import { clack, flick } from "../game/sound";
import { live } from "../game/live";
import { loc, t } from "../i18n";

// One match on the table: the canvas, touch/mouse aiming, the opponent's turns and a thin HUD.
// The rules live in game/match.ts; this file only drives time, input and drawing.

type Phase = "ready" | "aiming" | "sliding" | "rolling" | "bot" | "over";

/** Drag distance (CSS px) that means full power. */
const FULL_PULL_PX = 150;

interface Hud {
  turn: Side;
  captured: Record<Side, number>;
  left: number;
  banner: string | null;
  fromLine: boolean;
}

export function Board({
  playerSaqa,
  opponent,
  onFinish,
  onQuit,
}: {
  playerSaqa: SaqaDef;
  opponent: Opponent;
  onFinish: (m: Match) => void;
  onQuit: () => void;
}): ReactNode {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<Hud>({
    turn: "player",
    captured: { player: 0, bot: 0 },
    left: ASYQ_COUNT,
    banner: null,
    fromLine: true,
  });
  const [confirmQuit, setConfirmQuit] = useState(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    const g = el?.getContext("2d");
    if (!el || !box || !g) return;

    const botLook = saqaById(opponent.saqa);
    const m: Match = newMatch(
      { mass: playerSaqa.mass, bounce: playerSaqa.bounce },
      { mass: botLook.mass, bounce: botLook.bounce },
    );
    let phase: Phase = "ready";
    let view: View = fitView(1, 1, 1);
    let table: HTMLCanvasElement | null = null;
    let cssW = 1;
    let cssH = 1;
    const particles: Particle[] = [];
    const texts: FloatText[] = [];
    const trail: Array<{ x: number; y: number }> = [];
    const acc = { t: 0 };
    let shake = 0;
    let restFor = 0;
    let time = 0;
    let aim: { startX: number; startY: number; curX: number; curY: number; angle: number; power: number } | null = null;
    let botAim: { angle: number; power: number; until: number; slideFrom: number; slideTo: number; slideStart: number } | null = null;
    let botTimer = 0;
    let disposed = false;
    const glowing = new Map<number, number>();

    const sync = (banner: string | null = null) =>
      setHud({
        turn: m.turn,
        captured: { ...m.captured },
        left: asyqsLeft(m).length,
        banner,
        fromLine: m.fromLine,
      });

    const resize = () => {
      const r = box.getBoundingClientRect();
      cssW = Math.max(1, r.width);
      cssH = Math.max(1, r.height);
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      el.width = Math.round(cssW * dpr);
      el.height = Math.round(cssH * dpr);
      el.style.width = `${cssW}px`;
      el.style.height = `${cssH}px`;
      view = fitView(cssW, cssH, dpr);
      table = renderTable(view, cssW, cssH);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const say = (text: string, x: number, y: number, color: string, size = 44, max = 1.3) =>
      texts.push({ text, x, y, color, size, life: 0, max });

    const startShot = (angle: number, power: number) => {
      shoot(m, angle, power);
      flick(power);
      phase = "rolling";
      restFor = 0;
      trail.length = 0;
      sync();
    };

    const afterRest = () => {
      const shooter = m.turn;
      const before = new Map(m.bodies.map((b) => [b.id, { x: b.x, y: b.y }]));
      const o = resolveShot(m);
      const color = shooter === "player" ? "#ffe27a" : "#ff9f8a";
      for (const id of o.capturedIds) {
        const p = before.get(id);
        if (p) say("+1", p.x, p.y, color, 40, 1.1);
      }
      if (o.capturedIds.length >= 2)
        say(`${t("combo")} ×${o.capturedIds.length}`, 350, 520, "#ffd23f", 58, 1.6);
      if (o.burned) {
        say(t("burned"), 350, 600, "#ff6b4a", 60, 1.5);
        if (o.returnedId !== null) glowing.set(o.returnedId, 1.2);
      } else if (o.capturedIds.length === 0 && !o.over) {
        say(t("miss"), 350, shooter === "player" ? 860 : 290, "#f4ead2", 40, 1);
      }
      if (o.again) say(t("again"), 350, shooter === "player" ? 900 : 250, "#9ff0b0", 48, 1.3);

      if (o.over) {
        phase = "over";
        sync();
        window.setTimeout(() => !disposed && finishRef.current(m), 1300);
        return;
      }
      sync(o.burned && o.returnedId !== null ? t("giveBack") : null);
      if (m.turn === "bot") {
        phase = "bot";
        botTimer = 0.9;
        botAim = null;
      } else {
        phase = "ready";
      }
    };

    // ── Input ──────────────────────────────────────────────────────────────────────────────
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      if (phase !== "ready" || m.turn !== "player") return;
      const s = saqaOf(m);
      if (!s) return;
      const p = local(e);
      const w = toWorld(view, p.x, p.y);
      const nearSaqa = Math.hypot(w.x - s.x, w.y - s.y) * view.scale < 60;
      const nearLine = Math.abs(w.y - LINE_Y.player) * view.scale < 50;
      el.setPointerCapture(e.pointerId);
      if (m.fromLine && nearLine && !nearSaqa) {
        phase = "sliding";
        slideSaqa(m, w.x);
      } else {
        phase = "aiming";
        aim = { startX: p.x, startY: p.y, curX: p.x, curY: p.y, angle: -Math.PI / 2, power: 0 };
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (phase === "sliding") {
        slideSaqa(m, toWorld(view, p.x, p.y).x);
      } else if (phase === "aiming" && aim) {
        aim.curX = p.x;
        aim.curY = p.y;
        const dx = aim.startX - p.x;
        const dy = aim.startY - p.y;
        aim.power = Math.min(1, Math.hypot(dx, dy) / FULL_PULL_PX);
        if (Math.hypot(dx, dy) > 4) aim.angle = Math.atan2(dy, dx);
      }
    };
    const onUp = () => {
      if (phase === "sliding") phase = "ready";
      else if (phase === "aiming" && aim) {
        const a = aim;
        aim = null;
        if (a.power < 0.08) phase = "ready";
        else startShot(a.angle, a.power);
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    // ── The agent's debug surface reads and drives the same match ─────────────────────────
    live.state = () => ({
      phase,
      turn: m.turn,
      captured: m.captured,
      left: asyqsLeft(m).length,
      saqa: saqaOf(m) ? { x: Math.round(saqaOf(m)!.x), y: Math.round(saqaOf(m)!.y) } : null,
      opponent: opponent.id,
      bodies: m.bodies.map((b) => ({ id: b.id, kind: b.kind, x: Math.round(b.x), y: Math.round(b.y), off: b.off })),
    });
    live.shoot = (angle: number, power: number, x?: number) => {
      if (phase !== "ready" || m.turn !== "player") return false;
      if (x !== undefined && m.fromLine) slideSaqa(m, x);
      startShot(angle, power);
      return true;
    };

    // ── Loop ───────────────────────────────────────────────────────────────────────────────
    let raf = 0;
    let lastT = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      time += dt;

      if (phase === "rolling" || phase === "over") {
        const impacts = advance(m.bodies, dt, acc);
        for (const im of impacts) {
          const heavy = m.bodies.some((b) => b.kind === "saqa" && (b.id === im.a || b.id === im.b));
          clack(im.speed, heavy);
          if (im.speed > 250) dust(particles, im.x, im.y, im.speed);
          if (heavy && im.speed > 900) shake = Math.max(shake, Math.min(14, im.speed / 160));
        }
        const s = saqaOf(m);
        if (s && !s.off && (s.vx || s.vy)) {
          trail.push({ x: s.x, y: s.y });
          if (trail.length > 18) trail.shift();
        } else if (trail.length) trail.shift();
        if (phase === "rolling") {
          if (!isMoving(m.bodies)) {
            restFor += dt;
            if (restFor > 0.25) afterRest();
          } else restFor = 0;
        }
      } else if (phase === "bot") {
        stepBot(dt, now);
      }

      for (const [id, left] of glowing) {
        if (left - dt <= 0) glowing.delete(id);
        else glowing.set(id, left - dt);
      }

      draw(dt);
    };

    const stepBot = (dt: number, now: number) => {
      const s = saqaOf(m);
      if (!s) return;
      if (!botAim) {
        botTimer -= dt;
        if (botTimer > 0) return;
        const plan = planShot(m, opponent);
        botAim = {
          angle: plan.angle,
          power: plan.power,
          until: now + 900,
          slideFrom: s.x,
          slideTo: m.fromLine ? plan.x : s.x,
          slideStart: now,
        };
        return;
      }
      const k = Math.min(1, (now - botAim.slideStart) / 450);
      if (m.fromLine) slideSaqa(m, botAim.slideFrom + (botAim.slideTo - botAim.slideFrom) * easeOut(k));
      if (now >= botAim.until) {
        const a = botAim;
        botAim = null;
        startShot(a.angle, a.power);
      }
    };

    const draw = (dt: number) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (table) g.drawImage(table, 0, 0);
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      shake *= Math.pow(0.02, dt);
      const sx = shake > 0.3 ? (Math.random() - 0.5) * shake : 0;
      const sy = shake > 0.3 ? (Math.random() - 0.5) * shake : 0;
      g.translate(view.ox + sx, view.oy + sy);
      g.scale(view.scale, view.scale);

      const bodies = m.bodies.filter((b) => !b.off);
      for (const b of bodies) drawShadow(g, b);
      drawTrail(g, trail, m.turn === "player" ? "rgba(255,230,150,ALPHA)" : "rgba(255,150,130,ALPHA)");
      drawParticles(g, particles, dt);
      const shooterLook = m.turn === "player" ? playerSaqa : botLook;
      for (const b of bodies) drawBone(g, b, b.kind === "saqa" ? shooterLook : null, glowing.get(b.id) ?? 0);

      const s = saqaOf(m);
      if (s && phase === "ready" && m.turn === "player") drawReady(g, s, time, m.fromLine);
      if (s && phase === "aiming" && aim && aim.power > 0.02) {
        const pull = {
          x: s.x + (aim.curX - aim.startX) / view.scale,
          y: s.y + (aim.curY - aim.startY) / view.scale,
        };
        drawAim(g, s, pull, aim.angle, aim.power);
      }
      if (s && phase === "bot" && botAim) {
        const k = Math.min(1, (performance.now() - botAim.slideStart) / 700);
        drawAim(
          g,
          s,
          { x: s.x - Math.cos(botAim.angle) * 60 * k, y: s.y - Math.sin(botAim.angle) * 60 * k },
          botAim.angle,
          botAim.power * k,
        );
      }
      drawTexts(g, texts, dt);
    };

    raf = requestAnimationFrame(frame);
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      live.state = null;
      live.shoot = null;
    };
  }, [playerSaqa, opponent]);

  const myTurn = hud.turn === "player";
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#1d2440" }}>
      <HudRow
        face={opponent.face}
        name={loc(opponent.name)}
        count={hud.captured.bot}
        active={!myTurn}
        note={!myTurn ? t("botTurn") : null}
        top
      />
      <div ref={wrap} style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <canvas
          ref={canvas}
          style={{ position: "absolute", inset: 0, touchAction: "none", cursor: myTurn ? "crosshair" : "default" }}
        />
        {hud.banner ? (
          <div
            key={hud.banner + hud.captured.player + hud.captured.bot}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "45%",
              textAlign: "center",
              ...outlined,
              fontSize: 16,
              color: v.text,
              pointerEvents: "none",
              animation: "idos-pop-in .4s ease-out both",
            }}
          >
            {hud.banner}
          </div>
        ) : null}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <Button tone="grey" size="sm" onClick={() => setConfirmQuit(true)}>
            ✕
          </Button>
        </div>
        {confirmQuit ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10,10,20,0.6)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
              <div style={{ ...outlined, fontSize: 20 }}>{t("quit")}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <Button tone="red" onClick={onQuit}>
                  {t("quitYes")}
                </Button>
                <Button tone="green" onClick={() => setConfirmQuit(false)}>
                  {t("quitNo")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <HudRow
        face="🙂"
        name={t("you")}
        count={hud.captured.player}
        active={myTurn}
        note={myTurn ? (hud.fromLine ? t("slideHint") : t("pullHint")) : null}
      />
    </div>
  );
}

function HudRow({
  face,
  name,
  count,
  active,
  note,
  top,
}: {
  face: string;
  name: string;
  count: number;
  active: boolean;
  note: string | null;
  top?: boolean;
}): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: top ? "calc(var(--idos-safe-top, 0px) + 8px) 56px 8px 56px" : "8px 14px calc(var(--idos-safe-bottom, 0px) + 10px)",
        background: active ? "linear-gradient(90deg, rgba(240,194,90,0.28), rgba(240,194,90,0.05))" : "rgba(0,0,0,0.25)",
        borderTop: top ? "none" : "2px solid rgba(240,194,90,0.35)",
        borderBottom: top ? "2px solid rgba(240,194,90,0.35)" : "none",
        transition: "background .3s",
        minHeight: 52,
      }}
    >
      <span style={{ fontSize: 28 }}>{face}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...outlined, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {note ? (
          <div style={{ fontSize: 12, color: v.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{note}</div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {Array.from({ length: Math.min(count, 9) }, (_, i) => (
          <MiniBone key={i} />
        ))}
        <span style={{ ...outlined, fontSize: 22, marginLeft: 6, color: v.gold, minWidth: 18, textAlign: "right" }}>{count}</span>
      </div>
    </div>
  );
}

function MiniBone(): ReactNode {
  return (
    <svg width="18" height="12" viewBox="-12 -8 24 16" aria-hidden>
      <path
        d="M-11 0 C-11 -7 -4 -7 0 -4 C4 -7 11 -7 11 0 C11 7 4 7 0 4 C-4 7 -11 7 -11 0 Z"
        fill="#efe4cc"
        stroke="#7a6545"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function easeOut(k: number): number {
  return 1 - Math.pow(1 - k, 3);
}


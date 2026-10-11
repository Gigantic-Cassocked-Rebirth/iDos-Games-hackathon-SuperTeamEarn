import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import type { FeatureRegistry } from "@idosgames/module-sdk";
import { useIDosGamesClient, useUserState } from "@idosgames/react";
import {
  Button,
  Icon,
  configSection,
  errorText,
  formatAmount,
  outlined,
  panel,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import { OPPONENTS, type Opponent } from "../data/opponents";
import { SAQAS, saqaById, type SaqaDef } from "../data/saqas";
import { scoreMatch, winner, type Match, type ScoreBreakdown } from "../game/match";
import {
  METRIC,
  countedMetrics,
  loadProgress,
  ownedSaqas,
  pickLeaderboard,
  saveProgress,
  type InventoryView,
  type LeaderboardSection,
  type Progress,
  type QuestSection,
} from "../model";
import { loc, t } from "../i18n";
import { Board } from "./Board";

// The game's mode: the menu (opponent ladder, saqa in hand, rules), the match, and the result card
// that sends the score to the leaderboard and reports the match to quests.

type Screen =
  | { kind: "menu" }
  | { kind: "match"; key: number }
  | { kind: "result"; score: ScoreBreakdown; won: boolean; captured: [number, number]; unlockedNew: boolean; submitted: boolean };

export function makeAsyqPanel(features: FeatureRegistry): ComponentType {
  return function AsyqPanel(): ReactNode {
    return <Game features={features} />;
  };
}

function Game({ features }: { features: FeatureRegistry }): ReactNode {
  const client = useIDosGamesClient();
  const state = useUserState();
  const kit = useUiKit();
  const toast = useToast();
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });

  useEffect(() => {
    void client.cache.ensureState(["InventoryV2"], { maxAgeMs: 60_000 });
  }, [client]);

  const owned = ownedSaqas(state?.InventoryV2 as InventoryView | undefined);
  const saqa = owned.has(progress.saqa) ? saqaById(progress.saqa) : saqaById("bone");
  const opponent = OPPONENTS[Math.min(progress.selectedOpponent, progress.unlocked)] ?? OPPONENTS[0];
  const board = pickLeaderboard(configSection<LeaderboardSection>(client, "Leaderboard"));

  const update = useCallback((patch: Partial<Progress>) => {
    setProgress((p) => {
      const next = { ...p, ...patch };
      saveProgress(next);
      return next;
    });
  }, []);

  const finish = useCallback(
    async (m: Match) => {
      const idx = OPPONENTS.findIndex((o) => o.id === opponent.id);
      const won = winner(m) === "player";
      const score = scoreMatch(m, opponent.multiplier);
      const unlockedNew = won && idx === progress.unlocked && idx < OPPONENTS.length - 1;
      update({
        wins: progress.wins + (won ? 1 : 0),
        best: Math.max(progress.best, score.total),
        unlocked: unlockedNew ? idx + 1 : progress.unlocked,
      });
      kit.play(won ? "levelUp" : "notify");
      let submitted = false;
      if (board && score.total > 0) {
        const res = await client.leaderboard.submitScore(board, score.total);
        if (res.ok) submitted = true;
        else toast(errorText(res.error), "error");
      }
      setScreen({ kind: "result", score, won, captured: [m.captured.player, m.captured.bot], unlockedNew, submitted });

      const metrics = countedMetrics(configSection<QuestSection>(client, "Quest"));
      if (metrics.has(METRIC.played)) await client.quest.addQuestProgress(METRIC.played, 1);
      if (won && metrics.has(METRIC.won)) await client.quest.addQuestProgress(METRIC.won, 1);
      if (m.captured.player > 0 && metrics.has(METRIC.asyqs))
        await client.quest.addQuestProgress(METRIC.asyqs, m.captured.player);
    },
    [board, client, kit, opponent, progress, toast, update],
  );

  if (screen.kind === "match")
    return (
      <Board
        key={screen.key}
        playerSaqa={saqa}
        opponent={opponent}
        onFinish={(m) => void finish(m)}
        onQuit={() => setScreen({ kind: "menu" })}
      />
    );

  const start = () => setScreen({ kind: "match", key: Date.now() });

  return (
    <div
      className="idos-scroll"
      style={{
        position: "absolute",
        inset: 0,
        overflowY: "auto",
        background:
          "radial-gradient(ellipse at 50% 0%, #3a2d52 0%, #1d2440 55%, #141a30 100%)",
        fontFamily: v.font,
        color: v.text,
        padding: "64px 14px 28px",
        pointerEvents: "auto",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 14 }}>
        {screen.kind === "result" ? (
          <Result
            screen={screen}
            opponent={opponent}
            hasLeaderboard={!!board && !!features.get("leaderboard")?.available}
            onRematch={start}
            onNext={() => {
              update({ selectedOpponent: Math.min(OPPONENTS.length - 1, progress.unlocked) });
              setScreen({ kind: "match", key: Date.now() });
            }}
            onMenu={() => setScreen({ kind: "menu" })}
            onLeaderboard={() => features.open("leaderboard", { leaderboardID: board })}
          />
        ) : (
          <>
            <Header />
            <OpponentPicker progress={progress} onPick={(i) => update({ selectedOpponent: i })} />
            <SaqaPicker
              owned={owned}
              selected={saqa.id}
              onPick={(id) => update({ saqa: id })}
              onShop={features.get("store")?.available ? () => features.open("store") : null}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button attract size="lg" style={{ minWidth: 200 }} onClick={start} data-tutorial-anchor="play:start">
                ▶ {t("play")}
              </Button>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {board && features.get("leaderboard")?.available ? (
                <Button tone="blue" size="sm" onClick={() => features.open("leaderboard", { leaderboardID: board })}>
                  <Icon glyph="trophy" size={18} /> {t("leaderboard")}
                </Button>
              ) : null}
              {features.get("store")?.available ? (
                <Button tone="gold" size="sm" onClick={() => features.open("store")}>
                  {t("shop")}
                </Button>
              ) : null}
            </div>
            <Stats progress={progress} />
            <HowTo />
          </>
        )}
      </div>
    </div>
  );
}

function Header(): ReactNode {
  return (
    <div style={{ textAlign: "center", display: "grid", gap: 4, justifyItems: "center" }}>
      <div className="idos-bounce" style={{ display: "flex", gap: 6 }}>
        <BoneIcon size={54} look={saqaById("altyn")} />
        <BoneIcon size={54} look={null} />
        <BoneIcon size={54} look={saqaById("qyzyl")} />
      </div>
      <div style={{ ...outlined, fontSize: 40, color: v.gold, letterSpacing: 1 }}>{t("title")}</div>
      <div style={{ ...outlined, fontSize: 15, color: v.textDim }}>{t("subtitle")}</div>
    </div>
  );
}

function OpponentPicker({ progress, onPick }: { progress: Progress; onPick: (i: number) => void }): ReactNode {
  const selected = Math.min(progress.selectedOpponent, progress.unlocked);
  const opp = OPPONENTS[selected] ?? OPPONENTS[0];
  return (
    <div style={{ ...panel, padding: 14, display: "grid", gap: 10 }}>
      <div style={{ ...outlined, fontSize: 14, color: v.textDim }}>{t("opponent")}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        {OPPONENTS.map((o, i) => {
          const locked = i > progress.unlocked;
          const on = i === selected;
          return (
            <button
              key={o.id}
              type="button"
              disabled={locked}
              title={locked ? t("locked") : loc(o.name)}
              onClick={() => onPick(i)}
              style={{
                flex: 1,
                aspectRatio: "1",
                maxWidth: 76,
                borderRadius: 14,
                border: on ? `3px solid ${v.gold}` : "2px solid rgba(255,255,255,0.12)",
                background: on ? "rgba(240,194,90,0.18)" : "rgba(0,0,0,0.25)",
                fontSize: 30,
                cursor: locked ? "not-allowed" : "pointer",
                filter: locked ? "grayscale(1) brightness(0.5)" : "none",
                position: "relative",
              }}
            >
              {o.face}
              {locked ? <span style={{ position: "absolute", right: 4, bottom: 2, fontSize: 14 }}>🔒</span> : null}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ ...outlined, fontSize: 18 }}>{loc(opp.name)}</div>
          <div style={{ fontSize: 13, color: v.textDim }}>{loc(opp.title)}</div>
        </div>
        <div style={{ ...outlined, fontSize: 16, color: v.gold }}>×{opp.multiplier}</div>
      </div>
    </div>
  );
}

function SaqaPicker({
  owned,
  selected,
  onPick,
  onShop,
}: {
  owned: Set<string>;
  selected: string;
  onPick: (id: string) => void;
  onShop: (() => void) | null;
}): ReactNode {
  const [focus, setFocus] = useState(selected);
  const look = saqaById(focus);
  const has = owned.has(look.id);
  const maxMass = useMemo(() => Math.max(...SAQAS.map((s) => s.mass)), []);
  return (
    <div style={{ ...panel, padding: 14, display: "grid", gap: 10 }}>
      <div style={{ ...outlined, fontSize: 14, color: v.textDim }}>{t("yourSaqa")}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        {SAQAS.map((s) => {
          const mine = owned.has(s.id);
          const on = s.id === focus;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setFocus(s.id);
                if (mine) onPick(s.id);
              }}
              style={{
                flex: 1,
                maxWidth: 76,
                aspectRatio: "1",
                display: "grid",
                placeItems: "center",
                borderRadius: 14,
                border: s.id === selected ? `3px solid ${v.gold}` : on ? "2px solid rgba(255,255,255,0.5)" : "2px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                cursor: "pointer",
                position: "relative",
                filter: mine ? "none" : "saturate(0.4) brightness(0.65)",
              }}
            >
              <BoneIcon size={44} look={s} />
              {!mine ? <span style={{ position: "absolute", right: 4, bottom: 2, fontSize: 13 }}>🔒</span> : null}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ ...outlined, fontSize: 17 }}>{loc(look.name)}</span>
          {look.id === selected ? <span style={{ fontSize: 12, color: v.green }}>✔ {t("equipped")}</span> : null}
        </div>
        <div style={{ fontSize: 13, color: v.textDim }}>{loc(look.blurb)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: v.textDim }}>
          {t("weight")}
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
            <div style={{ width: `${(look.mass / maxMass) * 100}%`, height: "100%", background: v.gold }} />
          </div>
        </div>
        {!has && onShop ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button tone="gold" size="sm" onClick={onShop}>
              {t("getInShop")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stats({ progress }: { progress: Progress }): ReactNode {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      <Chip label={t("best")} value={formatAmount(progress.best)} />
      <Chip label={t("streak")} value={formatAmount(progress.wins)} />
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div style={{ ...panel, padding: "6px 14px", display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ fontSize: 12, color: v.textDim }}>{label}</span>
      <span style={{ ...outlined, fontSize: 17, color: v.gold }}>{value}</span>
    </div>
  );
}

function HowTo(): ReactNode {
  return (
    <div style={{ ...panel, padding: 14, display: "grid", gap: 6 }}>
      <div style={{ ...outlined, fontSize: 15 }}>{t("howTitle")}</div>
      {[t("how1"), t("how2"), t("how3"), t("how4")].map((line, i) => (
        <div key={i} style={{ fontSize: 13, color: v.textDim, display: "flex", gap: 8 }}>
          <span style={{ color: v.gold }}>{i + 1}.</span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}

function Result({
  screen,
  opponent,
  hasLeaderboard,
  onRematch,
  onNext,
  onMenu,
  onLeaderboard,
}: {
  screen: Extract<Screen, { kind: "result" }>;
  opponent: Opponent;
  hasLeaderboard: boolean;
  onRematch: () => void;
  onNext: () => void;
  onMenu: () => void;
  onLeaderboard: () => void;
}): ReactNode {
  const s = screen.score;
  const rows: Array<[string, string]> = [
    [t("asyqs"), `${screen.captured[0]} × 100`],
    ...(s.combos ? ([[t("combos"), `+${formatAmount(s.combos)}`]] as Array<[string, string]>) : []),
    ...(s.win ? ([[t("winBonus"), `+${formatAmount(s.win)}`]] as Array<[string, string]>) : []),
    ...(s.sweep ? ([[t("sweep"), `+${formatAmount(s.sweep)}`]] as Array<[string, string]>) : []),
    [t("multiplier"), `×${s.multiplier}`],
  ];
  return (
    <div
      className="idos-shine"
      style={{
        ...panel,
        padding: 20,
        display: "grid",
        gap: 12,
        justifyItems: "center",
        animation: `idos-pop-in ${v.slow} ease-out both`,
      }}
    >
      <div style={{ fontSize: 54 }}>{screen.won ? "🏆" : opponent.face}</div>
      <div style={{ ...outlined, fontSize: 32, color: screen.won ? v.gold : v.text }}>
        {screen.won ? t("won") : t("lost")}
      </div>
      <div style={{ ...outlined, fontSize: 22 }}>
        {screen.captured[0]} : {screen.captured[1]}
      </div>
      <div style={{ width: "100%", maxWidth: 320, display: "grid", gap: 4 }}>
        {rows.map(([k, val]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: v.textDim }}>
            <span>{k}</span>
            <span>{val}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 6 }}>
          <span style={{ ...outlined, fontSize: 18 }}>{t("total")}</span>
          <span style={{ ...outlined, fontSize: 22, color: v.gold }}>{formatAmount(s.total)}</span>
        </div>
        {screen.submitted ? <div style={{ fontSize: 12, color: v.green, textAlign: "center" }}>✔ {t("submitted")}</div> : null}
        {screen.unlockedNew ? (
          <div style={{ ...outlined, fontSize: 15, color: v.green, textAlign: "center" }}>🔓 {t("newOpponent")}</div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {screen.unlockedNew ? (
          <Button attract size="lg" onClick={onNext}>
            ▶ {t("next")}
          </Button>
        ) : null}
        <Button tone={screen.unlockedNew ? "blue" : "green"} size={screen.unlockedNew ? "md" : "lg"} attract={!screen.unlockedNew} onClick={onRematch}>
          ↻ {t("rematch")}
        </Button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {hasLeaderboard ? (
          <Button tone="blue" size="sm" onClick={onLeaderboard}>
            <Icon glyph="trophy" size={18} /> {t("leaderboard")}
          </Button>
        ) : null}
        <Button tone="grey" size="sm" onClick={onMenu}>
          {t("menu")}
        </Button>
      </div>
    </div>
  );
}

/** A small vector knucklebone for menus (same silhouette as the table's). */
export function BoneIcon({ size, look }: { size: number; look: SaqaDef | null }): ReactNode {
  const c = look?.colors ?? ["#efe4cc", "#b9a37b", "#fffaf0"];
  const id = `g-${look?.id ?? "asyq"}`;
  return (
    <svg width={size} height={size * 0.75} viewBox="-13 -9.75 26 19.5" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c[2]} />
          <stop offset="0.45" stopColor={c[0]} />
          <stop offset="1" stopColor={c[1]} />
        </linearGradient>
      </defs>
      <path
        d="M-12 0 C-12 -8.2 -4.2 -8.2 0 -5 C4.2 -8.2 12 -8.2 12 0 C12 8.2 4.2 8.2 0 5 C-4.2 8.2 -12 8.2 -12 0 Z"
        fill={`url(#${id})`}
        stroke="rgba(60,40,20,0.7)"
        strokeWidth="0.9"
      />
      <path d="M-0.5 -6 Q1.8 0 -0.5 6" stroke="rgba(60,40,20,0.45)" strokeWidth="1.2" fill="none" />
      <ellipse cx="4" cy="-3" rx="3" ry="1.4" fill="rgba(255,255,255,0.4)" transform="rotate(-20 4 -3)" />
    </svg>
  );
}

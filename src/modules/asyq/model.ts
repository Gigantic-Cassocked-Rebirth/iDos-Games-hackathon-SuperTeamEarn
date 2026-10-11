// Pure helpers between the game and the title's data: which leaderboard to play for, which quest
// metrics are worth reporting, which saqas the player owns, and the small local progress record.

import { SAQAS, type SaqaDef } from "./data/saqas";

/** Metrics a finished match reports — each only if some quest counts it. */
export const METRIC = {
  played: "games_played",
  won: "matches_won",
  asyqs: "asyqs_won",
} as const;

/** The leaderboard matches are scored on, when the title has it; else the first plain score board. */
export const PREFERRED_LEADERBOARD = "asyq_weekly";

export interface LeaderboardSection {
  Definitions?: Record<
    string,
    {
      LeaderboardID?: string;
      DisplayName?: string | null;
      IsEnabled?: boolean | null;
      ScoreSources?: unknown[] | null;
    } | null
  > | null;
}

export function pickLeaderboard(section: LeaderboardSection | undefined): string | null {
  const ids = Object.entries(section?.Definitions ?? {})
    .filter(([, d]) => d && d.IsEnabled !== false && (d.ScoreSources ?? []).length === 0)
    .map(([id, d]) => d?.LeaderboardID ?? id);
  if (ids.includes(PREFERRED_LEADERBOARD)) return PREFERRED_LEADERBOARD;
  return ids.sort()[0] ?? null;
}

export interface QuestSection {
  Quests?: Record<
    string,
    {
      Objectives?: Record<string, { MetricID?: string | null; Source?: string } | null> | null;
    } | null
  > | null;
}

/** Metrics some quest counts from the client — reporting any other one is refused by the server. */
export function countedMetrics(section: QuestSection | undefined): Set<string> {
  const out = new Set<string>();
  for (const q of Object.values(section?.Quests ?? {}))
    for (const o of Object.values(q?.Objectives ?? {}))
      if (o?.MetricID && (o.Source ?? "ClientApi") === "ClientApi") out.add(o.MetricID);
  return out;
}

export interface InventoryView {
  Items?: Record<string, { TotalAmount?: number; StackableAmount?: number; UnstackableAmount?: number } | null> | null;
  UnstackableItems?: Record<string, { ItemID?: string } | null> | null;
}

export function ownedSaqas(inv: InventoryView | null | undefined): Set<string> {
  const items = new Set<string>();
  for (const [id, n] of Object.entries(inv?.Items ?? {})) {
    const total = Number(n?.TotalAmount ?? (n?.StackableAmount ?? 0) + (n?.UnstackableAmount ?? 0));
    if (total > 0) items.add(id);
  }
  for (const u of Object.values(inv?.UnstackableItems ?? {})) if (u?.ItemID) items.add(u.ItemID);
  return new Set(SAQAS.filter((s) => s.itemID === null || items.has(s.itemID)).map((s) => s.id));
}

export function canUse(saqa: SaqaDef, owned: Set<string>): boolean {
  return owned.has(saqa.id);
}

// ── Local progress (the opponent ladder and the saqa in hand) ───────────────────────────────
// Cosmetic convenience only: scores live on the leaderboard and items in the inventory.

export interface Progress {
  unlocked: number;
  selectedOpponent: number;
  saqa: string;
  wins: number;
  best: number;
}

const KEY = "asyq-atu:progress@1";

export function loadProgress(): Progress {
  const fallback: Progress = { unlocked: 0, selectedOpponent: 0, saqa: "bone", wins: 0, best: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return fallback;
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private mode or blocked storage: progress just isn't remembered.
  }
}

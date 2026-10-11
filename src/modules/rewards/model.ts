// Pure helpers of the daily rewards screen: the calendar arithmetic. No React, no client calls —
// covered by model.test.ts against the module's own demo settings.

import type {
  DailyCalendarDefinition,
  DailyRewardDay,
  RewardDefinitions,
} from "@idosgames/core";
import type { Layout } from "@idosgames/react/ui";

// ── Daily calendar ───────────────────────────────────────────────────────────────────────────

export function pickCalendar(
  section: RewardDefinitions | undefined,
): (DailyCalendarDefinition & { CalendarID: string }) | null {
  const all = Object.entries(section?.DailyCalendars ?? {})
    // A calendar the server sends as null is skipped, not a crash.
    .map(([id, def]) =>
      def ? { ...def, CalendarID: def.CalendarID ?? id } : null,
    )
    .filter(
      (d): d is NonNullable<typeof d> =>
        d !== null && (d.Days?.length ?? 0) > 0,
    )
    .sort((a, b) => a.CalendarID.localeCompare(b.CalendarID));
  return all[0] ?? null;
}

export interface DailyView {
  days: Array<{ day: DailyRewardDay; state: "collected" | "today" | "locked" }>;
  canClaim: boolean;
  collected: number;
}

/**
 * Calendar state for drawing — the rule of the Unity DailyBonusWindowController: never claimed →
 * claimable; "CalendarDayUtc" → once per UTC date; "SlidingWindow" → after the cooldown. The
 * server is the authority — this only decides which card glows.
 */
export function dailyView(
  calendar: DailyCalendarDefinition,
  state: { CollectedDays?: number; LastClaimAt?: string } | null | undefined,
  now: Date,
): DailyView {
  const days = [...(calendar.Days ?? [])].sort(
    (a, b) => (a.DayNumber ?? 0) - (b.DayNumber ?? 0),
  );
  const total = days.length;
  const collectedAll = Math.max(0, Number(state?.CollectedDays ?? 0));

  const last = state?.LastClaimAt ? new Date(state.LastClaimAt) : null;
  const neverClaimed =
    !last || Number.isNaN(last.getTime()) || last.getUTCFullYear() < 2000;
  let canClaim: boolean;
  if (neverClaimed) canClaim = true;
  else if (calendar.ClaimMode === "SlidingWindow")
    canClaim =
      (now.getTime() - last.getTime()) / 1000 >=
      (calendar.ClaimCooldownSeconds ?? 0);
  else canClaim = utcDate(last) < utcDate(now);

  const finished = calendar.IsLooping === false && collectedAll >= total;
  if (finished) canClaim = false;

  const collected =
    total === 0
      ? 0
      : calendar.IsLooping === false
        ? Math.min(collectedAll, total)
        : collectedAll % total;
  // A loop that just wrapped shows the whole row as collected until the next claim opens.
  const shownCollected =
    !canClaim && collected === 0 && collectedAll > 0 ? total : collected;

  return {
    days: days.map((day, i) => ({
      day,
      state:
        i < shownCollected
          ? "collected"
          : i === shownCollected && canClaim
            ? "today"
            : "locked",
    })),
    canClaim,
    collected: shownCollected,
  };
}

function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Columns of the calendar: the week in one row only on a tablet, where the calendar has the whole
 * width. A phone is too narrow, and on a desktop the calendar shares the screen with the quests
 * (two columns) — rows of four there, like in the popup.
 */
export function calendarColumns(
  layout: Layout,
  compact: boolean,
  days: number,
): number {
  if (compact || layout !== "tablet") return Math.min(4, Math.max(1, days));
  return Math.min(7, Math.max(1, days));
}

/** How many columns the LAST card spans, so a short final row is filled (the big day 7). */
export function lastCardSpan(days: number, columns: number): number {
  const rest = days % columns;
  return rest === 0 ? 1 : columns - rest + 1;
}

/** Whether the title has a daily calendar — until it does, the lobby hides the tab. */
export function hasTitleData(reward: RewardDefinitions | undefined): boolean {
  return Object.keys(reward?.DailyCalendars ?? {}).length > 0;
}

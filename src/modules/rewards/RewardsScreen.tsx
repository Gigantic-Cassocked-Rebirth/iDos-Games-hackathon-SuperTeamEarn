import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  FeatureRegistry,
  FeatureScreenProps,
} from "@idosgames/module-sdk";
import { useIDosGamesClient, useUserState } from "@idosgames/react";
import {
  Button,
  configSection,
  EmptyState,
  errorText,
  grantedBy,
  grantLines,
  Icon,
  outlined,
  panel,
  Popup,
  SectionTitle,
  tokenGlyph,
  toneSurface,
  useCatalog,
  useCelebrate,
  useGameLayout,
  useStagger,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import {
  calendarColumns,
  dailyView,
  lastCardSpan,
  pickCalendar,
} from "./model";
import { t } from "./i18n";

// Daily rewards (Unity Alikhan/Dailies): the login calendar — collected / today / locked cards, the
// last one a big milestone. Quests are a system of their own (the quests module).

export function RewardsScreen(_: FeatureScreenProps): ReactNode {
  const client = useIDosGamesClient();
  const state = useUserState();

  // The day turns by the clock (counted locally); opening the screen re-checks the state against
  // changes made elsewhere through the central cache.
  useEffect(() => {
    void client.cache.ensureState(["Reward"], { maxAgeMs: 60_000 });
  }, [client]);

  return <DailyCalendar rewardState={state?.Reward ?? null} />;
}

// ── Daily calendar ───────────────────────────────────────────────────────────────────────────

type RewardState = {
  DailyCalendars?: Record<
    string,
    { CollectedDays?: number; LastClaimAt?: string } | undefined
  >;
} | null;

export function DailyCalendar({
  rewardState,
  compact = false,
  onClaimed,
}: {
  rewardState: RewardState;
  compact?: boolean;
  onClaimed?: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const catalog = useCatalog();
  const celebrate = useCelebrate();
  const toast = useToast();
  const layout = useGameLayout();
  const kit = useUiKit();
  const stagger = useStagger();
  const calendar = pickCalendar(configSection(client, "Reward"));
  const todayRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  if (!calendar)
    return compact ? null : (
      <EmptyState glyph="calendar" text={t("noCalendar")} />
    );

  const view = dailyView(
    calendar,
    rewardState?.DailyCalendars?.[calendar.CalendarID],
    new Date(),
  );
  const columns = calendarColumns(layout, compact, view.days.length);

  const claim = async () => {
    setBusy(true);
    const res = await client.reward.claimDailyReward(calendar.CalendarID);
    setBusy(false);
    if (!res.ok) return toast(errorText(res.error), "error");
    kit.fx.burst(todayRef.current);
    const today = view.days.find((d) => d.state === "today");
    const granted = grantedBy(res.data);
    onClaimed?.();
    celebrate(granted.length > 0 ? granted : grantLines(today?.day.Rewards));
  };

  return (
    <div>
      {compact ? null : (
        <SectionTitle>
          {catalog.localize(calendar.DisplayName ?? t("daily"))}
        </SectionTitle>
      )}
      <div style={{ ...panel, padding: 12, display: "grid", gap: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 8,
          }}
        >
          {view.days.map(({ day, state }, i) => {
            const lines = grantLines(day.Rewards);
            const main = lines[0];
            const span =
              i === view.days.length - 1
                ? lastCardSpan(view.days.length, columns)
                : 1;
            const today = state === "today";
            return (
              <div
                key={day.DayNumber ?? i}
                ref={today ? todayRef : undefined}
                className={today ? "idos-glow" : undefined}
                style={{
                  gridColumn: span > 1 ? `span ${span}` : undefined,
                  borderRadius: 14,
                  padding: "8px 4px",
                  display: "grid",
                  justifyItems: "center",
                  gap: 4,
                  position: "relative",
                  ...(state === "collected"
                    ? toneSurface("green")
                    : today
                      ? toneSurface("gold")
                      : day.IsMilestone
                        ? toneSurface("blue")
                        : { background: v.wellSoft }),
                  border: today ? `2px solid ${v.text}` : `2px solid ${v.line}`,
                  ...stagger(i),
                }}
              >
                <span style={{ ...outlined, fontSize: 12 }}>
                  {t("day")} {day.DayNumber ?? i + 1}
                </span>
                <div
                  className={today ? "idos-bounce" : undefined}
                  style={{ display: "flex", gap: 2 }}
                >
                  {lines.slice(0, 2).map((line) => (
                    <Icon
                      key={`${line.kind}:${line.id}`}
                      glyph={
                        line.kind === "token"
                          ? tokenGlyph(line)
                          : catalog.iconOf(line)
                      }
                      size={day.IsMilestone ? 36 : 30}
                    />
                  ))}
                </div>
                {main ? (
                  <span style={{ ...outlined, fontSize: 12 }}>
                    ×{main.amount}
                  </span>
                ) : null}
                {state === "collected" ? (
                  <span style={{ position: "absolute", top: -6, right: -6 }}>
                    <Icon glyph="check" size={22} />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {view.canClaim ? (
          <Button
            busy={busy}
            attract
            size="lg"
            onClick={() => void claim()}
            data-tutorial-anchor="rewards:daily-claim"
          >
            <Icon glyph="gift" size={22} /> {t("claim")}
          </Button>
        ) : (
          <div
            style={{
              ...outlined,
              textAlign: "center",
              fontSize: 13,
              color: v.textDim,
              fontWeight: 700,
            }}
          >
            {t("comeBackTomorrow")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Always-on: the daily bonus greets the player, and the badge ─────────────────────────────

/**
 * Like the Unity DailyBonusAutoOpener: a claimable daily reward pops up once per session. Also keeps
 * the badge of the rewards screen (the daily bonus waiting).
 */
export function makeRewardsWatcher(features: FeatureRegistry) {
  return function RewardsWatcher(): ReactNode {
    const client = useIDosGamesClient();
    const state = useUserState();
    const [popup, setPopup] = useState(false);
    const shownOnce = useRef(false);

    useEffect(() => {
      let cancelled = false;
      // The calendar is in the login state; the central cache asks the server only when the title
      // tracks comeback presence on read.
      void client.cache.ensureState(["Reward"]).then((res) => {
        if (cancelled || !res.ok || shownOnce.current) return;
        const calendar = pickCalendar(configSection(client, "Reward"));
        if (!calendar) return;
        const s = (client.data.user.state?.Reward as RewardState | undefined)
          ?.DailyCalendars?.[calendar.CalendarID];
        if (dailyView(calendar, s, new Date()).canClaim) {
          shownOnce.current = true;
          setPopup(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [client]);

    // Badge from the cached state, recomputed on every change of it. Subscribed directly: the cache
    // patches the state in place, so an effect keyed on the state object would not re-run after a
    // claim and the badge would stay lit. The minute timer opens the next day's claim.
    useEffect(() => {
      const update = () => {
        const calendar = pickCalendar(configSection(client, "Reward"));
        const dailyReady = calendar
          ? dailyView(
              calendar,
              (client.data.user.state?.Reward as RewardState)?.DailyCalendars?.[
                calendar.CalendarID
              ],
              new Date(),
            ).canClaim
          : false;
        features.setBadge("rewards", dailyReady ? 1 : 0);
      };
      update();
      const off = client.on("user:anyUpdated", update);
      const id = setInterval(update, 60_000);
      return () => {
        off();
        clearInterval(id);
      };
    }, [client]);

    if (!popup) return null;
    return (
      <Popup
        title={t("daily")}
        onClose={() => setPopup(false)}
        width={440}
        variant="center"
        queued
      >
        <DailyCalendar
          compact
          rewardState={(state?.Reward ?? null) as RewardState}
          onClaimed={() => setPopup(false)}
        />
      </Popup>
    );
  };
}

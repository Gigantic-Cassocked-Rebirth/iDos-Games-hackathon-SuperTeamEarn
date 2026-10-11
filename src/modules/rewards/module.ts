import { defineModule, type Module } from "@idosgames/module-sdk";
import { configSection } from "@idosgames/react/ui";
import { RewardsScreen, makeRewardsWatcher } from "./RewardsScreen";
import { hasTitleData } from "./model";
import { t } from "./i18n";

// Daily rewards as a feature of the game: the login calendar. The always-on watcher greets the
// player with the daily bonus once per session and keeps the badge.
export const rewardsModule: Module = defineModule({
  id: "rewards",
  meta: { name: "Rewards", type: "app", engine: "dom" },
  setup(ctx) {
    ctx.features.register({
      id: "rewards",
      label: t("title"),
      icon: "gift",
      group: "events",
      order: 40,
      primary: true,
      available: false,
      Screen: RewardsScreen,
    });
    const enabled = hasTitleData(configSection(ctx.client, "Reward"));
    ctx.features.setAvailable(
      "rewards",
      enabled,
      "no daily calendar on the title (Reward)",
    );
    // The greeting reads the rewards state — only where there is a calendar (no startup request
    // for a feature the title does not have: the engine's per-player limit answers a burst 429).
    if (enabled)
      ctx.registerPanel({
        id: "daily",
        slot: "modal",
        activeOnly: false,
        component: makeRewardsWatcher(ctx.features),
      });
    ctx.exposeToAgent({
      state: () => ({ ui: "dom", feature: "rewards" }),
      describeActions: {},
    });
  },
});

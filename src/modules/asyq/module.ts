import { defineModule, type Module } from "@idosgames/module-sdk";
import { makeAsyqPanel } from "./components/AsyqPanel";
import { live } from "./game/live";
import { t } from "./i18n";

// Asyq Atu — a mode of its own (a route + one full-screen panel). The table is a canvas inside that
// panel; the menu and result cards are ordinary React. Sign-in, the lobby, balances and the wallet
// stay with the base.
export const asyqModule: Module = defineModule({
  id: "asyq",
  meta: {
    name: "Asyq Atu",
    type: "game",
    genre: "casual",
    engine: "dom",
  },
  setup(ctx) {
    ctx.registerRoute({ id: "asyq", label: t("title"), icon: "🦴" });
    ctx.registerPanel({
      id: "game",
      slot: "overlay",
      component: makeAsyqPanel(ctx.features),
    });

    // The table is a canvas, so its state is published here for the agent and for reviewers.
    ctx.exposeToAgent({
      state: () => ({ mode: ctx.modes.current(), match: live.state?.() ?? null }),
      actions: {
        shoot: (args) =>
          live.shoot?.(Number(args?.angle ?? -Math.PI / 2), Number(args?.power ?? 0.8), args?.x === undefined ? undefined : Number(args.x)) ?? false,
      },
      describeActions: {
        shoot:
          "shoot({ angle, power, x? }) — on the player's turn, flick the saqa. angle in radians (-π/2 = straight up the table), power 0..1, x = position on the throw line (world units 110..590) when shooting from the line.",
      },
    });
  },
});

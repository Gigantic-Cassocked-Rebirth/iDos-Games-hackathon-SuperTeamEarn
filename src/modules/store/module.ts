import {
  defineModule,
  type Module,
  type ModuleContext,
} from "@idosgames/module-sdk";
import { StoreScreen } from "./StoreScreen";
import { freeOffersWaiting, hasOffers } from "./model";
import { t } from "./i18n";

// The shop as a feature of the game (ctx.features): the lobby shows it as a main tab once the
// storefront has offers. Its badge counts free offers waiting to be taken (the daily gift), kept
// fresh by an invisible always-on panel — the screen itself is mounted only while open.
export const storeModule: Module = defineModule({
  id: "store",
  meta: { name: "Shop", type: "app", engine: "dom" },
  setup(ctx) {
    ctx.features.register({
      id: "store",
      label: t("title"),
      icon: "shop",
      group: "economy",
      order: 10,
      primary: true,
      available: false,
      Screen: StoreScreen,
    });
    watchBadge(ctx);
    ctx.exposeToAgent({
      state: () => ({
        ui: "dom",
        feature: "store",
        badge: ctx.features.get("store")?.badge ?? 0,
      }),
      describeActions: {},
    });
  },
});

function watchBadge(ctx: ModuleContext): void {
  const { client, features } = ctx;
  ctx.effect(() => {
    const update = () => {
      const front = client.store.cachedStorefront;
      features.setAvailable(
        "store",
        hasOffers(front),
        "the storefront has no offers (Store section)",
      );
      features.setBadge("store", freeOffersWaiting(front));
    };
    // A free gift comes back with the next day: look again every few minutes.
    ctx.every(5 * 60_000, () => void client.store.getStorefront().then(update));
    // The badge is counted from the STOREFRONT, and after a purchase the screen re-reads it: the
    // purchase's own state update comes before that, with the old storefront still cached — so the
    // gift just taken kept the badge lit until the next re-read here. Count again on every load.
    const offs = [
      client.on("user:anyUpdated", update),
      client.on("store:storefrontLoaded", update),
    ];
    return () => {
      for (const off of offs) off();
    };
  });
}

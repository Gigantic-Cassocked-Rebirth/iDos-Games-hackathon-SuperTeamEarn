import type { Module } from "@idosgames/module-sdk";
import { asyqModule } from "./modules/asyq";
import { leaderboardModule } from "./modules/leaderboard";
import { storeModule } from "./modules/store";
import { inventoryModule } from "./modules/inventory";
import { questsModule } from "./modules/quests";
import { rewardsModule } from "./modules/rewards";
import { profileModule } from "./modules/profile";

// The modules this app is made of, on top of the base (sign-in and the lobby): the game launched by
// "Play" and the systems shown as lobby tabs. Imports and the array only.
export const modules: Module[] = [
  asyqModule,
  leaderboardModule,
  storeModule,
  inventoryModule,
  questsModule,
  rewardsModule,
  profileModule,
];

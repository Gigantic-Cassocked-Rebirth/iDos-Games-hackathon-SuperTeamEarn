// The match currently on the table, as the agent debug surface sees it (module.ts → exposeToAgent).
// The board fills these in while a match runs and clears them when it ends.

export const live: {
  state: (() => unknown) | null;
  shoot: ((angle: number, power: number, x?: number) => boolean) | null;
} = { state: null, shoot: null };

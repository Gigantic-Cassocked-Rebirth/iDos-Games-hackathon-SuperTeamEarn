// The ladder of opponents: from a kid of the aul to the champion of the Kurultai. Beating one opens
// the next; the higher the rung, the more a match is worth on the leaderboard.

export interface Opponent {
  id: string;
  face: string;
  name: { en: string; ru: string };
  title: { en: string; ru: string };
  /** Aim error (radians, 1σ) and power error (fraction, 1σ). */
  aimNoise: number;
  powerNoise: number;
  /** How many candidate shots the bot weighs before choosing. */
  effort: number;
  /** Score multiplier for a match against this opponent. */
  multiplier: number;
  /** Bot's saqa look. */
  saqa: string;
}

export const OPPONENTS: [Opponent, ...Opponent[]] = [
  {
    id: "bala",
    face: "🧒",
    name: { en: "Little Erzhan", ru: "Малыш Ержан" },
    title: { en: "Kid from the aul", ru: "Мальчишка из аула" },
    aimNoise: 0.09,
    powerNoise: 0.22,
    effort: 0.35,
    multiplier: 1,
    saqa: "bone",
  },
  {
    id: "korshi",
    face: "👦",
    name: { en: "Dana", ru: "Дана" },
    title: { en: "Neighbour's daughter", ru: "Соседская дочка" },
    aimNoise: 0.06,
    powerNoise: 0.15,
    effort: 0.5,
    multiplier: 1.25,
    saqa: "qyzyl",
  },
  {
    id: "zhigit",
    face: "🧑",
    name: { en: "Zhigit Arman", ru: "Джигит Арман" },
    title: { en: "Best shot of the valley", ru: "Лучший стрелок долины" },
    aimNoise: 0.04,
    powerNoise: 0.1,
    effort: 0.7,
    multiplier: 1.5,
    saqa: "qorgasyn",
  },
  {
    id: "aqsaqal",
    face: "👴",
    name: { en: "Aqsaqal Nurlan", ru: "Аксакал Нурлан" },
    title: { en: "Has played for 70 years", ru: "Играет уже 70 лет" },
    aimNoise: 0.025,
    powerNoise: 0.07,
    effort: 0.85,
    multiplier: 2,
    saqa: "altyn",
  },
  {
    id: "khan",
    face: "🤴",
    name: { en: "Champion Batyrkhan", ru: "Чемпион Батырхан" },
    title: { en: "Champion of the Kurultai", ru: "Чемпион курултая" },
    aimNoise: 0.014,
    powerNoise: 0.045,
    effort: 1,
    multiplier: 3,
    saqa: "aidahar",
  },
];

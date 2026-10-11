// The saqa — the shooter bone. Players have always "improved" theirs: dyed it, drilled it and poured
// lead inside to make it hit harder. Each saqa past the plain one is an item of the title
// (`ItemID`), bought in the shop; owning the item unlocks it here.

export interface SaqaDef {
  id: string;
  /** Title item that unlocks it; null = everyone has it. */
  itemID: string | null;
  name: { en: string; ru: string };
  blurb: { en: string; ru: string };
  mass: number;
  bounce: number;
  /** Body colours: base, shade, highlight. */
  colors: [string, string, string];
  /** Optional ornament drawn on top. */
  pattern?: "stripes" | "ornament" | "scales";
}

export const SAQAS: SaqaDef[] = [
  {
    id: "bone",
    itemID: null,
    name: { en: "Plain saqa", ru: "Простая сака" },
    blurb: {
      en: "A sheep's knucklebone, like everyone starts with.",
      ru: "Обычный бараний асык — с него начинают все.",
    },
    mass: 2.0,
    bounce: 0.9,
    colors: ["#e9dcc0", "#b8a37f", "#fff8e8"],
  },
  {
    id: "qyzyl",
    itemID: "saqa_qyzyl",
    name: { en: "Qyzyl saqa", ru: "Кызыл сака" },
    blurb: {
      en: "Dyed red with madder root. Slightly heavier, the pride of the aul.",
      ru: "Окрашена мареной. Чуть тяжелее — гордость аула.",
    },
    mass: 2.3,
    bounce: 0.9,
    colors: ["#c8442f", "#7d2116", "#f08a6e"],
    pattern: "stripes",
  },
  {
    id: "qorgasyn",
    itemID: "saqa_qorgasyn",
    name: { en: "Qorǵasyn saqa", ru: "Коргасын сака" },
    blurb: {
      en: "Drilled and filled with lead, the classic trick. Hits like a hammer.",
      ru: "Высверлена и залита свинцом — классика. Бьёт как молот.",
    },
    mass: 3.1,
    bounce: 0.82,
    colors: ["#8b8f98", "#4a4e57", "#d5d9e2"],
  },
  {
    id: "altyn",
    itemID: "saqa_altyn",
    name: { en: "Altyn saqa", ru: "Алтын сака" },
    blurb: {
      en: "Gilded for the Kurultai champion. Heavy and lively.",
      ru: "Позолочена для чемпиона курултая. Тяжёлая и прыгучая.",
    },
    mass: 2.8,
    bounce: 0.95,
    colors: ["#f2c14e", "#a8741a", "#fff1b8"],
    pattern: "ornament",
  },
  {
    id: "aidahar",
    itemID: "saqa_aidahar",
    name: { en: "Aidahar saqa", ru: "Айдахар сака" },
    blurb: {
      en: "Carved with dragon scales. The heaviest saqa on the steppe.",
      ru: "Покрыта чешуёй дракона. Самая тяжёлая сака степи.",
    },
    mass: 3.4,
    bounce: 0.9,
    colors: ["#3f9a6b", "#1d4f36", "#9fe3bd"],
    pattern: "scales",
  },
];

export const DEFAULT_SAQA = SAQAS[0]!;

export function saqaById(id: string | null | undefined): SaqaDef {
  return SAQAS.find((s) => s.id === id) ?? DEFAULT_SAQA;
}

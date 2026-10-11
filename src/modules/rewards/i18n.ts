import { makeT } from "@idosgames/react/ui";

const EN = {
  title: "Rewards",
  daily: "Daily rewards",
  day: "Day",
  claim: "Claim",
  comeBackTomorrow: "Come back tomorrow for the next reward",
  noCalendar: "No daily calendar. Add one in LiveOps → Rewards.",
} as const;

export const t = makeT<keyof typeof EN>(EN, {
  title: "Награды",
  daily: "Ежедневные награды",
  day: "День",
  claim: "Забрать",
  comeBackTomorrow: "Возвращайтесь завтра за следующей наградой",
  noCalendar: "Ежедневного календаря нет. Добавьте его в LiveOps → Rewards.",
});

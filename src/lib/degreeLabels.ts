import type { IntervalDegree } from "./musicTheory";

export type DisplayMode = "note" | "degree";

export const INTERVAL_TO_DEGREE_LABEL: Record<IntervalDegree, string> = {
  "1": "R", "b2": "b2", "2": "2", "b3": "b3", "3": "3", "4": "4",
  "b5": "b5", "5": "5", "#5": "#5", "6": "6", "b7": "b7", "7": "7",
};

export const getLabel = (
  mode: DisplayMode,
  note: string,
  interval?: IntervalDegree,
): string => {
  switch (mode) {
    case "note":
      return note;
    case "degree":
      return interval ? INTERVAL_TO_DEGREE_LABEL[interval] : "?";
    default:
      return note;
  }
};

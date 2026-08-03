import React from "react";
import type { ValidString } from "../lib/fretboard";

interface StringSelectorProps {
  enabledStrings: ValidString[];
  setEnabledStrings: (strings: ValidString[]) => void;
}

const ALL_STRINGS: ValidString[] = [1, 2, 3, 4, 5, 6];
const STRING_NAMES = ["1弦 (E)", "2弦 (B)", "3弦 (G)", "4弦 (D)", "5弦 (A)", "6弦 (E)"];

const PRESETS: { label: string; strings: ValidString[] }[] = [
  { label: "全弦", strings: [1, 2, 3, 4, 5, 6] },
  { label: "高音弦", strings: [1, 2, 3] },
  { label: "中音弦", strings: [2, 3, 4, 5] },
  { label: "低音弦", strings: [4, 5, 6] },
];

export const StringSelector: React.FC<StringSelectorProps> = ({ enabledStrings, setEnabledStrings }) => {
  const toggle = (s: ValidString) => {
    if (enabledStrings.includes(s)) {
      if (enabledStrings.length > 1) {
        setEnabledStrings(enabledStrings.filter(x => x !== s));
      }
    } else {
      setEnabledStrings([...enabledStrings, s].sort((a, b) => a - b));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-gray-400 font-semibold">使用弦</span>
      <div className="flex items-center gap-1.5">
        {ALL_STRINGS.map((s, idx) => (
          <button
            key={s}
            onClick={() => toggle(s)}
            className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
              enabledStrings.includes(s)
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-700 text-gray-500 hover:bg-gray-600"
            }`}
            title={STRING_NAMES[idx]}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => setEnabledStrings(p.strings)}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

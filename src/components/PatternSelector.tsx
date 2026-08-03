import React from "react";
import type { PatternType } from "../lib/guitarMapping";

interface PatternSelectorProps {
  selectedPattern: PatternType;
  setSelectedPattern: (pattern: PatternType) => void;
  difficulty?: number;
  stringJumps?: number;
  boxChanges?: number;
}

const PATTERNS: { type: PatternType; label: string; desc: string; icon: string }[] = [
  { type: "minimal-movement", label: "最小移動", desc: "移動量を最小化", icon: "🎯" },
  { type: "box-low", label: "ローポジ", desc: "フレット 0-5", icon: "⬇️" },
  { type: "box-mid", label: "ミドルポジ", desc: "フレット 5-10", icon: "↔️" },
  { type: "box-high", label: "ハイポジ", desc: "フレット 9+", icon: "⬆️" },
  { type: "single-string", label: "単弦", desc: "弦移動を最小化", icon: "📏" },
];

export const PatternSelector: React.FC<PatternSelectorProps> = ({
  selectedPattern,
  setSelectedPattern,
  difficulty,
  stringJumps,
  boxChanges,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-gray-400 font-semibold">弾き方パターン</span>
      <div className="flex flex-wrap gap-1.5">
        {PATTERNS.map(p => (
          <button
            key={p.type}
            onClick={() => setSelectedPattern(p.type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedPattern === p.type
                ? "bg-indigo-600 text-white shadow-md scale-105"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
            }`}
            title={p.desc}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
      {difficulty !== undefined && (
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span>難易度: <span className={`font-bold ${
            difficulty < 30 ? "text-green-400" :
            difficulty < 60 ? "text-yellow-400" : "text-red-400"
          }`}>{difficulty}/100</span></span>
          {stringJumps !== undefined && <span>飛び弦: {stringJumps}</span>}
          {boxChanges !== undefined && <span>ポジ移動: {boxChanges}</span>}
        </div>
      )}
    </div>
  );
};

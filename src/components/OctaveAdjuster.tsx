import React from "react";

interface OctaveAdjusterProps {
  octaveShift: number;
  setOctaveShift: (shift: number) => void;
  outOfRangeCount: number;
  totalNotes: number;
}

export const OctaveAdjuster: React.FC<OctaveAdjusterProps> = ({
  octaveShift,
  setOctaveShift,
  outOfRangeCount,
  totalNotes,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-gray-400 font-semibold">オクターブ調整</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOctaveShift(octaveShift - 1)}
          disabled={octaveShift <= -3}
          className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          -
        </button>
        <span className="text-sm font-mono text-white w-16 text-center bg-gray-800 rounded-lg py-1.5 border border-gray-700">
          {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
        </span>
        <button
          onClick={() => setOctaveShift(octaveShift + 1)}
          disabled={octaveShift >= 3}
          className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
      {outOfRangeCount > 0 && (
        <p className="text-xs text-amber-400">
          ⚠ {outOfRangeCount}/{totalNotes} 音が範囲外（自動調整済）
        </p>
      )}
    </div>
  );
};

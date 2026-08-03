import React from "react";
import type { Note } from "../lib/musicTheory";
import { NOTES } from "../lib/musicTheory";
import type { KeyDetectionResult } from "../lib/keyDetector";

interface KeySelectorProps {
  selectedKey: Note;
  setSelectedKey: (key: Note) => void;
  selectedMode: "major" | "minor";
  setSelectedMode: (mode: "major" | "minor") => void;
  detectedKeys: KeyDetectionResult[];
}

export const KeySelector: React.FC<KeySelectorProps> = ({
  selectedKey,
  setSelectedKey,
  selectedMode,
  setSelectedMode,
  detectedKeys,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-gray-400 font-semibold">キー</span>
      <div className="flex items-center gap-2">
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value as Note)}
          className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          {NOTES.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <div className="flex bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
          <button
            onClick={() => setSelectedMode("major")}
            className={`px-3 py-1.5 text-sm font-bold transition-colors ${
              selectedMode === "major" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-600"
            }`}
          >
            Maj
          </button>
          <button
            onClick={() => setSelectedMode("minor")}
            className={`px-3 py-1.5 text-sm font-bold transition-colors ${
              selectedMode === "minor" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-600"
            }`}
          >
            min
          </button>
        </div>
      </div>
      {detectedKeys.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-xs text-gray-500">推定:</span>
          {detectedKeys.slice(0, 3).map((k, i) => (
            <button
              key={i}
              onClick={() => { setSelectedKey(k.key); setSelectedMode(k.mode); }}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                k.key === selectedKey && k.mode === selectedMode
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {k.label} ({k.confidence}%)
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

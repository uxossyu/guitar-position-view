import React from "react";
import type { MidiTrackInfo } from "../lib/midiParser";

interface TrackSelectorProps {
  tracks: MidiTrackInfo[];
  onSelect: (trackIndex: number) => void;
  onCancel: () => void;
}

export const TrackSelector: React.FC<TrackSelectorProps> = ({ tracks, onSelect, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">トラック選択</h2>
          <p className="text-gray-400 text-sm mt-1">再生するトラックを選んでください</p>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {tracks.map((track) => (
            <button
              key={track.index}
              onClick={() => onSelect(track.index)}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-700/80 transition-colors group flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-200 group-hover:text-white truncate">
                  {track.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {track.instrument} · Ch.{track.channel}
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <span className="bg-gray-700 group-hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-xs font-mono">
                  {track.noteCount} notes
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="w-full py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

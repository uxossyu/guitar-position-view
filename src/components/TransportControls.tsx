import React, { useState, useEffect, useCallback, useRef } from "react";
import * as Tone from "tone";
import {
  initAudio,
  schedulePlayback,
  scheduleMetronome,
  startPlayback,
  stopPlayback,
  clearSchedule,
  setLoop,
  setPosition,
} from "../lib/playbackEngine";
import type { GuitarNote } from "../lib/guitarMapping";

interface TransportControlsProps {
  notes: GuitarNote[];
  bpm: number;
  setBpm: (bpm: number) => void;
  originalBpm: number;
  metronomeEnabled: boolean;
  setMetronomeEnabled: (v: boolean) => void;
  loopEnabled: boolean;
  setLoopEnabled: (v: boolean) => void;
  startMeasure: number;
  endMeasure: number;
  totalMeasures: number;
  setStartMeasure: (m: number) => void;
  setEndMeasure: (m: number) => void;
  beatsPerMeasure: number;
  ticksPerBeat: number;
  currentNoteIndex: number;
  setCurrentNoteIndex: (idx: number) => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  notes,
  bpm,
  setBpm,
  originalBpm,
  metronomeEnabled,
  setMetronomeEnabled,
  loopEnabled,
  setLoopEnabled,
  startMeasure,
  endMeasure,
  totalMeasures,
  setStartMeasure,
  setEndMeasure,
  beatsPerMeasure,
  ticksPerBeat,
  currentNoteIndex,
  setCurrentNoteIndex,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const animFrameRef = useRef<number>(0);

  const getTimeForMeasure = useCallback((measure: number) => {
    const ticksPerMeasure = ticksPerBeat * beatsPerMeasure;
    const tick = (measure - 1) * ticksPerMeasure;
    return (tick / ticksPerBeat) * (60 / bpm);
  }, [ticksPerBeat, beatsPerMeasure, bpm]);

  const scheduleAll = useCallback(async () => {
    await initAudio();
    clearSchedule();

    // Filter notes for the selected measure range
    const ticksPerMeasure = ticksPerBeat * beatsPerMeasure;
    const startTick = (startMeasure - 1) * ticksPerMeasure;
    const endTick = endMeasure * ticksPerMeasure;

    const filteredNotes = notes.filter(n => n.ticks >= startTick && n.ticks < endTick);
    
    // Convert ticks to time using BPM
    const noteEvents = filteredNotes.map(n => ({
      midi: n.midi,
      time: ((n.ticks - startTick) / ticksPerBeat) * (60 / bpm),
      duration: (n.durationTicks / ticksPerBeat) * (60 / bpm),
    }));

    const onNotePlay = (index: number) => {
      // Map back to the original index in the full notes array
      const originalIndex = notes.findIndex(n => n.ticks === filteredNotes[index]?.ticks);
      if (originalIndex >= 0) {
        setCurrentNoteIndex(originalIndex);
      }
    };

    schedulePlayback(noteEvents, bpm, onNotePlay);

    // Metronome
    if (metronomeEnabled) {
      const startTime = 0;
      const endTime = ((endTick - startTick) / ticksPerBeat) * (60 / bpm);
      scheduleMetronome(bpm, beatsPerMeasure, startTime, endTime);
    }

    // Loop
    if (loopEnabled) {
      const loopStart = 0;
      const loopEnd = ((endTick - startTick) / ticksPerBeat) * (60 / bpm);
      setLoop(true, loopStart, loopEnd);
    } else {
      setLoop(false, 0, 0);
    }
  }, [notes, bpm, startMeasure, endMeasure, ticksPerBeat, beatsPerMeasure, metronomeEnabled, loopEnabled, setCurrentNoteIndex]);

  const handlePlay = useCallback(async () => {
    await scheduleAll();
    setPosition(0);
    await startPlayback();
    setIsPlaying(true);
  }, [scheduleAll]);

  const handleStop = useCallback(() => {
    stopPlayback();
    clearSchedule();
    setIsPlaying(false);
    setCurrentNoteIndex(0);
  }, [setCurrentNoteIndex]);

  // Monitor playing state
  useEffect(() => {
    if (isPlaying) {
      const check = () => {
        if (Tone.getTransport().state !== "started" && !loopEnabled) {
          setIsPlaying(false);
        }
        animFrameRef.current = requestAnimationFrame(check);
      };
      animFrameRef.current = requestAnimationFrame(check);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, loopEnabled]);

  const bpmRatio = Math.round((bpm / originalBpm) * 100);

  return (
    <div className="w-full bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-4" id="transport-controls">
      {/* Row 1: Play controls + BPM */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {/* Play/Stop */}
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying ? handleStop : handlePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition-all shadow-lg ${
              isPlaying
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white"
            }`}
          >
            {isPlaying ? "■" : "▶"}
          </button>
        </div>

        {/* BPM */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold">BPM</span>
            <span className="text-xs text-gray-600">({bpmRatio}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={Math.max(20, Math.round(originalBpm * 0.25))}
              max={Math.round(originalBpm * 2)}
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="w-28 accent-indigo-500"
            />
            <input
              type="number"
              value={bpm}
              onChange={e => setBpm(Math.max(20, Number(e.target.value)))}
              className="w-16 bg-gray-700 text-white text-sm text-center rounded-lg border border-gray-600 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Metronome */}
        <button
          onClick={() => setMetronomeEnabled(!metronomeEnabled)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
            metronomeEnabled
              ? "bg-amber-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          🔔 メトロノーム
        </button>

        {/* Loop */}
        <button
          onClick={() => setLoopEnabled(!loopEnabled)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
            loopEnabled
              ? "bg-purple-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          🔁 ループ
        </button>

        {/* Note counter */}
        <div className="ml-auto text-sm text-gray-400 font-mono">
          {currentNoteIndex + 1} / {notes.length} notes
        </div>
      </div>

      {/* Row 2: Measure range */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">小節</span>
        <input
          type="number"
          min={1}
          max={endMeasure}
          value={startMeasure}
          onChange={e => setStartMeasure(Math.max(1, Math.min(Number(e.target.value), endMeasure)))}
          className="w-16 bg-gray-700 text-white text-sm text-center rounded-lg border border-gray-600 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <span className="text-gray-500">〜</span>
        <input
          type="number"
          min={startMeasure}
          max={totalMeasures}
          value={endMeasure}
          onChange={e => setEndMeasure(Math.max(startMeasure, Math.min(Number(e.target.value), totalMeasures)))}
          className="w-16 bg-gray-700 text-white text-sm text-center rounded-lg border border-gray-600 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <span className="text-xs text-gray-500">/ {totalMeasures} 小節</span>

        {/* Measure range slider */}
        <div className="flex-1 relative h-6 bg-gray-700 rounded-full overflow-hidden ml-2">
          <div
            className="absolute h-full bg-indigo-600/40 rounded-full"
            style={{
              left: `${((startMeasure - 1) / totalMeasures) * 100}%`,
              width: `${((endMeasure - startMeasure + 1) / totalMeasures) * 100}%`,
            }}
          />
          <div
            className="absolute h-full w-1 bg-green-400 rounded-full transition-all"
            style={{
              left: `${(currentNoteIndex / Math.max(1, notes.length)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

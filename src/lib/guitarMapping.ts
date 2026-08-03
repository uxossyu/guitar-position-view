import type { ValidString } from "./fretboard";
import type { Note, IntervalDegree } from "./musicTheory";
import type { MidiNoteEvent } from "./midiParser";
import { findMidiNotePositions, adjustToGuitarRange, isInGuitarRange } from "./fretboard";
import { midiToNote, getIntervalBetween } from "./musicTheory";

export interface GuitarNote {
  midi: number;
  originalMidi: number;
  note: Note;
  stringNum: ValidString;
  fret: number;
  time: number;
  duration: number;
  velocity: number;
  interval: IntervalDegree; // relative to key
  octaveAdjusted: boolean;
  ticks: number;
  durationTicks: number;
}

export interface GuitarPosition {
  notes: GuitarNote[];
  boxStartFret: number;
  boxEndFret: number;
  difficulty: number; // 0-100
  stringJumps: number;
  fretSpread: number;
}

/**
 * Convert MIDI events to guitar positions with all possible string/fret combinations
 */
export const mapMidiToGuitarCandidates = (
  midiNotes: MidiNoteEvent[],
  keyRoot: Note,
  enabledStrings: ValidString[],
  octaveShift: number = 0,
): { note: MidiNoteEvent; candidates: { stringNum: ValidString; fret: number }[]; adjusted: boolean }[] => {
  return midiNotes.map(midiNote => {
    let midi = midiNote.midi + (octaveShift * 12);
    let adjusted = octaveShift !== 0;

    if (!isInGuitarRange(midi)) {
      midi = adjustToGuitarRange(midi);
      adjusted = true;
    }

    const candidates = findMidiNotePositions(midi, enabledStrings);
    return { note: midiNote, candidates, adjusted };
  });
};

/**
 * Dynamic programming-based position optimizer
 * Finds the optimal string/fret assignment for a sequence of notes
 */
export const optimizePositions = (
  midiNotes: MidiNoteEvent[],
  keyRoot: Note,
  enabledStrings: ValidString[],
  octaveShift: number = 0,
  patternType: PatternType = "minimal-movement",
): GuitarNote[] => {
  if (midiNotes.length === 0) return [];

  const candidates = mapMidiToGuitarCandidates(midiNotes, keyRoot, enabledStrings, octaveShift);
  
  if (candidates.length === 0) return [];

  // DP: for each note, store the best cost to reach each candidate position
  const n = candidates.length;
  const dp: number[][] = [];
  const parent: number[][] = [];

  // Initialize first note
  dp[0] = candidates[0].candidates.map(() => 0);
  parent[0] = candidates[0].candidates.map(() => -1);

  // Fill DP table
  for (let i = 1; i < n; i++) {
    dp[i] = [];
    parent[i] = [];
    
    for (let j = 0; j < candidates[i].candidates.length; j++) {
      let bestCost = Infinity;
      let bestParent = 0;

      for (let k = 0; k < candidates[i - 1].candidates.length; k++) {
        const cost = dp[i - 1][k] + transitionCost(
          candidates[i - 1].candidates[k],
          candidates[i].candidates[j],
          patternType,
        );

        if (cost < bestCost) {
          bestCost = cost;
          bestParent = k;
        }
      }

      dp[i][j] = bestCost;
      parent[i][j] = bestParent;
    }
  }

  // Backtrack to find best path
  const path: number[] = new Array(n);
  
  // Find the best ending position
  let bestEnd = 0;
  let bestEndCost = Infinity;
  if (dp[n - 1]) {
    for (let j = 0; j < dp[n - 1].length; j++) {
      if (dp[n - 1][j] < bestEndCost) {
        bestEndCost = dp[n - 1][j];
        bestEnd = j;
      }
    }
  }
  path[n - 1] = bestEnd;

  for (let i = n - 2; i >= 0; i--) {
    path[i] = parent[i + 1][path[i + 1]];
  }

  // Build result
  return candidates.map((c, i) => {
    const pos = c.candidates[path[i]] || { stringNum: 1 as ValidString, fret: 0 };
    const midi = c.note.midi + (octaveShift * 12);
    const adjustedMidi = isInGuitarRange(midi) ? midi : adjustToGuitarRange(midi);
    const note = midiToNote(adjustedMidi);

    return {
      midi: adjustedMidi,
      originalMidi: c.note.midi,
      note,
      stringNum: pos.stringNum,
      fret: pos.fret,
      time: c.note.time,
      duration: c.note.duration,
      velocity: c.note.velocity,
      interval: getIntervalBetween(keyRoot, note),
      octaveAdjusted: c.adjusted,
      ticks: c.note.ticks,
      durationTicks: c.note.durationTicks,
    };
  });
};

export type PatternType = "minimal-movement" | "box-low" | "box-mid" | "box-high" | "single-string";

/**
 * Calculate transition cost between two positions
 */
const transitionCost = (
  from: { stringNum: ValidString; fret: number },
  to: { stringNum: ValidString; fret: number },
  patternType: PatternType,
): number => {
  const fretDistance = Math.abs(to.fret - from.fret);
  const stringDistance = Math.abs(to.stringNum - from.stringNum);

  // String jump penalty (non-adjacent strings are harder)
  const stringJumpPenalty = stringDistance > 1 ? (stringDistance - 1) * 15 : 0;

  // Fret spread penalty
  const fretPenalty = fretDistance * 3;

  // Pattern-specific costs
  switch (patternType) {
    case "minimal-movement":
      return fretPenalty + stringJumpPenalty;
    
    case "box-low":
      // Prefer frets 0-5
      return fretPenalty + stringJumpPenalty + (to.fret > 5 ? to.fret * 5 : 0);
    
    case "box-mid":
      // Prefer frets 5-10
      return fretPenalty + stringJumpPenalty + 
        (to.fret < 5 ? (5 - to.fret) * 5 : 0) + 
        (to.fret > 10 ? (to.fret - 10) * 5 : 0);
    
    case "box-high":
      // Prefer frets 9+
      return fretPenalty + stringJumpPenalty + (to.fret < 9 ? (9 - to.fret) * 5 : 0);
    
    case "single-string":
      // Heavy penalty for string changes
      return fretPenalty + stringDistance * 50;
  }
};

/**
 * Analyze the difficulty of a position sequence
 */
export const analyzePositionDifficulty = (positions: GuitarNote[]): {
  difficulty: number;
  stringJumps: number;
  fretSpread: number;
  boxChanges: number;
} => {
  let stringJumps = 0;
  let totalFretSpread = 0;
  let boxChanges = 0;

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    
    const strDist = Math.abs(curr.stringNum - prev.stringNum);
    if (strDist > 1) stringJumps++;
    
    totalFretSpread += Math.abs(curr.fret - prev.fret);
    
    // Box change: if fret position shifts more than 4 frets
    if (Math.abs(curr.fret - prev.fret) > 4) boxChanges++;
  }

  const avgFretSpread = positions.length > 1 ? totalFretSpread / (positions.length - 1) : 0;
  
  // Difficulty score 0-100
  const difficulty = Math.min(100, Math.round(
    stringJumps * 10 + avgFretSpread * 5 + boxChanges * 15
  ));

  return {
    difficulty,
    stringJumps,
    fretSpread: Math.round(avgFretSpread * 10) / 10,
    boxChanges,
  };
};

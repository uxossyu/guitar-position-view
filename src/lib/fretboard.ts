import type { Note } from "./musicTheory";
import { getNoteFromInterval } from "./musicTheory";

export const FRET_COUNT = 24;

// Standard tuning notes for open strings (1 = High E, 6 = Low E)
export const STANDARD_TUNING: Record<number, Note> = {
  1: "E", 2: "B", 3: "G", 4: "D", 5: "A", 6: "E",
};

// MIDI note numbers for open strings
export const OPEN_STRING_MIDI: Record<number, number> = {
  1: 64, // E4
  2: 59, // B3
  3: 55, // G3
  4: 50, // D3
  5: 45, // A2
  6: 40, // E2
};

export type ValidString = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Get the note at a specific string and fret
 */
export const getNoteAtLocation = (stringNum: ValidString, fretNum: number): Note => {
  const openNote = STANDARD_TUNING[stringNum];
  return getNoteFromInterval(openNote, fretNum);
};

/**
 * Get the MIDI note number at a specific string and fret
 */
export const getMidiAtLocation = (stringNum: ValidString, fretNum: number): number => {
  return OPEN_STRING_MIDI[stringNum] + fretNum;
};

/**
 * Find all positions (string, fret) where a specific MIDI note can be played
 */
export const findMidiNotePositions = (
  midiNote: number,
  enabledStrings: ValidString[] = [1, 2, 3, 4, 5, 6],
  maxFret: number = FRET_COUNT
): { stringNum: ValidString; fret: number }[] => {
  const positions: { stringNum: ValidString; fret: number }[] = [];
  
  for (const stringNum of enabledStrings) {
    const fret = midiNote - OPEN_STRING_MIDI[stringNum];
    if (fret >= 0 && fret <= maxFret) {
      positions.push({ stringNum, fret });
    }
  }
  
  return positions;
};

/**
 * Guitar range: E2 (40) to C6 (84) on 24 frets
 */
export const GUITAR_MIN_MIDI = 40; // E2
export const GUITAR_MAX_MIDI = OPEN_STRING_MIDI[1] + FRET_COUNT; // E4 + 24 = 88

export const isInGuitarRange = (midiNote: number): boolean => {
  return midiNote >= GUITAR_MIN_MIDI && midiNote <= GUITAR_MAX_MIDI;
};

/**
 * Adjust a MIDI note to fit within guitar range by shifting octaves
 */
export const adjustToGuitarRange = (midiNote: number): number => {
  let adjusted = midiNote;
  while (adjusted < GUITAR_MIN_MIDI) adjusted += 12;
  while (adjusted > GUITAR_MAX_MIDI) adjusted -= 12;
  return adjusted;
};

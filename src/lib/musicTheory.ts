export const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
export type Note = typeof NOTES[number];

export const NOTE_INDEX_MAP: Record<Note, number> = {
  "C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5,
  "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11
};

export type IntervalDegree = "1" | "b2" | "2" | "b3" | "3" | "4" | "b5" | "5" | "#5" | "6" | "b7" | "7";

export const INTERVAL_SEMITONES: Record<IntervalDegree, number> = {
  "1": 0, "b2": 1, "2": 2, "b3": 3, "3": 4, "4": 5,
  "b5": 6, "5": 7, "#5": 8, "6": 9, "b7": 10, "7": 11,
};

/**
 * Get the note that is `semitones` above `root`
 */
export const getNoteFromInterval = (root: Note, semitones: number): Note => {
  const rootIndex = NOTE_INDEX_MAP[root];
  let targetIndex = (rootIndex + semitones) % 12;
  if (targetIndex < 0) targetIndex += 12;
  return NOTES[targetIndex];
};

/**
 * Determine the interval degree between a root note and a target note.
 */
export const getIntervalBetween = (root: Note, target: Note): IntervalDegree => {
  const rootIdx = NOTE_INDEX_MAP[root];
  const targetIdx = NOTE_INDEX_MAP[target];
  let diff = (targetIdx - rootIdx) % 12;
  if (diff < 0) diff += 12;
  const entry = Object.entries(INTERVAL_SEMITONES).find(([, semi]) => semi === diff);
  return (entry ? entry[0] : "1") as IntervalDegree;
};

/**
 * Convert MIDI note number to Note name
 */
export const midiToNote = (midi: number): Note => {
  return NOTES[midi % 12];
};

/**
 * Convert MIDI note number to scientific pitch (e.g., "C4")
 */
export const midiToScientific = (midi: number): string => {
  const note = NOTES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
};

/**
 * Convert note name + octave to MIDI number
 */
export const noteToMidi = (note: Note, octave: number): number => {
  return (octave + 1) * 12 + NOTE_INDEX_MAP[note];
};

import { Key, Note as TonalNote } from "tonal";
import type { MidiNoteEvent } from "./midiParser";
import type { Note } from "./musicTheory";

// Map from tonal note names (with sharps) to our flat-based notation
const SHARP_TO_FLAT: Record<string, Note> = {
  "C": "C", "C#": "Db", "Db": "Db",
  "D": "D", "D#": "Eb", "Eb": "Eb",
  "E": "E", "Fb": "E",
  "F": "F", "F#": "Gb", "Gb": "Gb",
  "G": "G", "G#": "Ab", "Ab": "Ab",
  "A": "A", "A#": "Bb", "Bb": "Bb",
  "B": "B", "Cb": "B",
};

export interface KeyDetectionResult {
  key: Note;
  mode: "major" | "minor";
  confidence: number;
  label: string; // e.g. "C major" or "A minor"
}

/**
 * Detect the key from a set of MIDI notes using Krumhansl-Schmuckler algorithm via tonal.js
 */
export const detectKey = (notes: MidiNoteEvent[]): KeyDetectionResult[] => {
  if (notes.length === 0) return [];

  // Build pitch class distribution (chroma)
  // Count occurrences weighted by duration
  const chromaCounts = new Array(12).fill(0);
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  for (const note of notes) {
    const pc = note.midi % 12;
    chromaCounts[pc] += note.duration * note.velocity;
  }

  // Normalize to create a chroma array
  const maxCount = Math.max(...chromaCounts);
  if (maxCount === 0) return [];
  const chroma = chromaCounts.map(c => (c / maxCount > 0.01 ? 1 : 0));

  // Use tonal's Key.detect with the pitch class names present
  const pitchClasses = chroma
    .map((v, i) => (v ? noteNames[i] : null))
    .filter((n): n is string => n !== null);

  // Try detecting key
  const detected = Key.majorKey(pitchClasses[0] || "C");
  
  // Use a simpler approach: try all major and minor keys and score them
  const results: KeyDetectionResult[] = [];
  
  // Krumhansl-Kessler profiles
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  for (let root = 0; root < 12; root++) {
    // Major key correlation
    let majorCorr = 0;
    let minorCorr = 0;
    
    for (let i = 0; i < 12; i++) {
      const rotatedIdx = (i + root) % 12;
      majorCorr += chromaCounts[rotatedIdx] * majorProfile[i];
      minorCorr += chromaCounts[rotatedIdx] * minorProfile[i];
    }

    const rootNote = normalizeToFlat(noteNames[root]);
    
    results.push({
      key: rootNote,
      mode: "major",
      confidence: majorCorr,
      label: `${rootNote} major`,
    });
    
    results.push({
      key: rootNote,
      mode: "minor",
      confidence: minorCorr,
      label: `${rootNote} minor`,
    });
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  // Normalize confidence to 0-100 range
  const maxConf = results[0]?.confidence || 1;
  for (const r of results) {
    r.confidence = Math.round((r.confidence / maxConf) * 100);
  }

  // Suppress unused import warning on Key / TonalNote
  void detected;
  void TonalNote;

  return results.slice(0, 5); // Top 5 candidates
};

function normalizeToFlat(note: string): Note {
  // Strip octave and get pitch class
  const pc = note.replace(/\d+$/, "");
  return SHARP_TO_FLAT[pc] || "C";
}

export { normalizeToFlat };

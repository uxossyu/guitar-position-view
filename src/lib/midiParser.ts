import { Midi } from "@tonejs/midi";

export interface MidiNoteEvent {
  midi: number;       // MIDI note number
  name: string;       // e.g. "C4"
  time: number;       // seconds
  duration: number;   // seconds
  velocity: number;   // 0-1
  ticks: number;      // raw ticks
  durationTicks: number;
}

export interface MidiTrackInfo {
  index: number;
  name: string;
  instrument: string;
  channel: number;
  noteCount: number;
  notes: MidiNoteEvent[];
}

export interface MidiFileData {
  name: string;
  durationSeconds: number;
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  ticksPerBeat: number;
  tracks: MidiTrackInfo[];
  totalMeasures: number;
}

/**
 * Parse a MIDI file from an ArrayBuffer
 */
export const parseMidiFile = (buffer: ArrayBuffer, fileName: string): MidiFileData => {
  const midi = new Midi(buffer);

  // Get tempo
  const tempos = midi.header.tempos;
  const bpm = tempos.length > 0 ? Math.round(tempos[0].bpm) : 120;

  // Get time signature
  const timeSigs = midi.header.timeSignatures;
  const numerator = timeSigs.length > 0 ? timeSigs[0].timeSignature[0] : 4;
  const denominator = timeSigs.length > 0 ? timeSigs[0].timeSignature[1] : 4;

  const ticksPerBeat = midi.header.ppq;

  // Parse tracks
  const tracks: MidiTrackInfo[] = midi.tracks
    .map((track, index) => {
      const notes: MidiNoteEvent[] = track.notes.map(note => ({
        midi: note.midi,
        name: note.name,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity,
        ticks: note.ticks,
        durationTicks: note.durationTicks,
      }));

      return {
        index,
        name: track.name || `Track ${index + 1}`,
        instrument: track.instrument?.name || "Unknown",
        channel: track.channel,
        noteCount: notes.length,
        notes,
      };
    })
    .filter(t => t.noteCount > 0); // Only tracks with notes

  // Calculate total measures
  const totalTicks = Math.max(...tracks.map(t => {
    if (t.notes.length === 0) return 0;
    const lastNote = t.notes[t.notes.length - 1];
    return lastNote.ticks + lastNote.durationTicks;
  }));
  const ticksPerMeasure = ticksPerBeat * numerator;
  const totalMeasures = Math.ceil(totalTicks / ticksPerMeasure);

  return {
    name: fileName,
    durationSeconds: midi.duration,
    bpm,
    timeSignatureNumerator: numerator,
    timeSignatureDenominator: denominator,
    ticksPerBeat,
    tracks,
    totalMeasures,
  };
};

/**
 * Get notes within a specific measure range
 */
export const getNotesInMeasureRange = (
  notes: MidiNoteEvent[],
  startMeasure: number,
  endMeasure: number,
  ticksPerBeat: number,
  beatsPerMeasure: number
): MidiNoteEvent[] => {
  const ticksPerMeasure = ticksPerBeat * beatsPerMeasure;
  const startTick = (startMeasure - 1) * ticksPerMeasure;
  const endTick = endMeasure * ticksPerMeasure;

  return notes.filter(n => n.ticks >= startTick && n.ticks < endTick);
};

/**
 * Get the measure number for a given tick
 */
export const getMeasureForTick = (tick: number, ticksPerBeat: number, beatsPerMeasure: number): number => {
  const ticksPerMeasure = ticksPerBeat * beatsPerMeasure;
  return Math.floor(tick / ticksPerMeasure) + 1;
};

/**
 * Get the beat position within a measure
 */
export const getBeatForTick = (tick: number, ticksPerBeat: number, beatsPerMeasure: number): number => {
  const ticksPerMeasure = ticksPerBeat * beatsPerMeasure;
  const tickInMeasure = tick % ticksPerMeasure;
  return Math.floor(tickInMeasure / ticksPerBeat) + 1;
};

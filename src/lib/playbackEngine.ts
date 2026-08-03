import * as Tone from "tone";

let synth: Tone.PolySynth | null = null;
let metronomePlayer: Tone.MembraneSynth | null = null;
let isInitialized = false;
let scheduledEvents: number[] = [];

/**
 * Initialize the audio context
 */
export const initAudio = async () => {
  if (isInitialized) return;
  await Tone.start();

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
  }).toDestination();
  synth.volume.value = -10;

  metronomePlayer = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination();
  metronomePlayer.volume.value = -5;

  isInitialized = true;
};

/**
 * Play a note by MIDI number
 */
export const playMidiNote = async (midiNumber: number, duration: string = "8n") => {
  if (!isInitialized) await initAudio();
  if (!synth) return;

  const freq = Tone.Frequency(midiNumber, "midi").toFrequency();
  synth.triggerAttackRelease(freq, duration);
};

/**
 * Schedule playback of a sequence of notes
 */
export const schedulePlayback = (
  notes: { midi: number; time: number; duration: number }[],
  bpm: number,
  onNotePlay?: (index: number) => void,
) => {
  clearSchedule();
  Tone.getTransport().bpm.value = bpm;

  notes.forEach((note, index) => {
    const eventId = Tone.getTransport().schedule((time) => {
      if (synth) {
        const freq = Tone.Frequency(note.midi, "midi").toFrequency();
        synth.triggerAttackRelease(freq, note.duration, time);
      }
      if (onNotePlay) {
        Tone.getDraw().schedule(() => onNotePlay(index), time);
      }
    }, note.time);
    scheduledEvents.push(eventId);
  });
};

/**
 * Schedule metronome clicks
 */
export const scheduleMetronome = (
  bpm: number,
  beatsPerMeasure: number,
  startTime: number,
  endTime: number,
) => {
  if (!metronomePlayer) return;

  const beatDuration = 60 / bpm;
  let time = startTime;
  let beat = 0;

  while (time < endTime) {
    const currentTime = time;
    const isDownbeat = beat % beatsPerMeasure === 0;
    
    const eventId = Tone.getTransport().schedule((t) => {
      if (metronomePlayer) {
        metronomePlayer.triggerAttackRelease(
          isDownbeat ? "C2" : "C3",
          "32n",
          t,
          isDownbeat ? 0.8 : 0.4
        );
      }
    }, currentTime);
    scheduledEvents.push(eventId);
    
    time += beatDuration;
    beat++;
  }
};

/**
 * Start playback
 */
export const startPlayback = async () => {
  if (!isInitialized) await initAudio();
  Tone.getTransport().start();
};

/**
 * Stop playback
 */
export const stopPlayback = () => {
  Tone.getTransport().stop();
  Tone.getTransport().position = 0;
};

/**
 * Pause playback
 */
export const pausePlayback = () => {
  Tone.getTransport().pause();
};

/**
 * Set BPM
 */
export const setBpm = (bpm: number) => {
  Tone.getTransport().bpm.value = bpm;
};

/**
 * Set loop
 */
export const setLoop = (enabled: boolean, start: number, end: number) => {
  const transport = Tone.getTransport();
  transport.loop = enabled;
  if (enabled) {
    transport.loopStart = start;
    transport.loopEnd = end;
  }
};

/**
 * Clear all scheduled events
 */
export const clearSchedule = () => {
  for (const id of scheduledEvents) {
    Tone.getTransport().clear(id);
  }
  scheduledEvents = [];
};

/**
 * Get current transport time in seconds
 */
export const getCurrentTime = (): number => {
  return Tone.getTransport().seconds;
};

/**
 * Set transport position
 */
export const setPosition = (seconds: number) => {
  Tone.getTransport().seconds = seconds;
};

/**
 * Get transport state
 */
export const getTransportState = (): string => {
  return Tone.getTransport().state;
};

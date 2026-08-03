import { useState, useMemo, useCallback } from "react";
import type { Note } from "./lib/musicTheory";
import type { ValidString } from "./lib/fretboard";
import { isInGuitarRange } from "./lib/fretboard";
import type { MidiFileData, MidiNoteEvent } from "./lib/midiParser";
import { parseMidiFile } from "./lib/midiParser";
import { detectKey } from "./lib/keyDetector";
import type { KeyDetectionResult } from "./lib/keyDetector";
import type { GuitarNote, PatternType } from "./lib/guitarMapping";
import { optimizePositions, analyzePositionDifficulty } from "./lib/guitarMapping";

import { MidiFileLoader } from "./components/MidiFileLoader";
import { TrackSelector } from "./components/TrackSelector";
import { GuitarFretboard } from "./components/GuitarFretboard";
import { StringSelector } from "./components/StringSelector";
import { OctaveAdjuster } from "./components/OctaveAdjuster";
import { KeySelector } from "./components/KeySelector";
import { PatternSelector } from "./components/PatternSelector";
import { TransportControls } from "./components/TransportControls";
import { VexFlowDisplay } from "./components/VexFlowDisplay";

function App() {
  // MIDI state
  const [midiData, setMidiData] = useState<MidiFileData | null>(null);
  const [midiBuffer, setMidiBuffer] = useState<ArrayBuffer | null>(null);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null);
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const [pendingMidiData, setPendingMidiData] = useState<MidiFileData | null>(null);
  const [pendingBuffer, setPendingBuffer] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Music state
  const [selectedKey, setSelectedKey] = useState<Note>("C");
  const [selectedMode, setSelectedMode] = useState<"major" | "minor">("major");
  const [detectedKeys, setDetectedKeys] = useState<KeyDetectionResult[]>([]);

  // Guitar state
  const [enabledStrings, setEnabledStrings] = useState<ValidString[]>([1, 2, 3, 4, 5, 6]);
  const [octaveShift, setOctaveShift] = useState(0);
  const [patternType, setPatternType] = useState<PatternType>("minimal-movement");
  const [displayMode, setDisplayMode] = useState<"note" | "degree">("degree");

  // Playback state
  const [bpm, setBpm] = useState(120);
  const [originalBpm, setOriginalBpm] = useState(120);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [startMeasure, setStartMeasure] = useState(1);
  const [endMeasure, setEndMeasure] = useState(4);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);

  // Get selected track notes
  const trackNotes: MidiNoteEvent[] = useMemo(() => {
    if (!midiData || selectedTrackIndex === null) return [];
    const track = midiData.tracks.find(t => t.index === selectedTrackIndex);
    return track?.notes || [];
  }, [midiData, selectedTrackIndex]);

  // Optimize positions
  const guitarNotes: GuitarNote[] = useMemo(() => {
    if (trackNotes.length === 0) return [];
    try {
      return optimizePositions(trackNotes, selectedKey, enabledStrings, octaveShift, patternType);
    } catch (err) {
      console.error("Position calculation error:", err);
      setError(`ポジション計算エラー: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }, [trackNotes, selectedKey, enabledStrings, octaveShift, patternType]);

  // Difficulty analysis
  const difficulty = useMemo(() => {
    if (guitarNotes.length === 0) return { difficulty: 0, stringJumps: 0, fretSpread: 0, boxChanges: 0 };
    try {
      return analyzePositionDifficulty(guitarNotes);
    } catch (err) {
      return { difficulty: 0, stringJumps: 0, fretSpread: 0, boxChanges: 0 };
    }
  }, [guitarNotes]);

  // Out of range count
  const outOfRangeCount = useMemo(() => {
    return trackNotes.filter(n => !isInGuitarRange(n.midi + octaveShift * 12)).length;
  }, [trackNotes, octaveShift]);

  // Current & upcoming notes for fretboard
  const currentNote = guitarNotes[currentNoteIndex] || null;
  const upcomingNotes = guitarNotes.slice(currentNoteIndex + 1, currentNoteIndex + 5);

  // Box highlight
  const boxHighlight = useMemo(() => {
    if (!currentNote) return null;
    const center = currentNote.fret;
    return {
      start: Math.max(1, center - 2),
      end: Math.min(24, center + 2),
    };
  }, [currentNote]);

  // Handle MIDI file loaded
  const handleFileLoaded = useCallback((buffer: ArrayBuffer, fileName: string) => {
    setError(null);
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const data = parseMidiFile(buffer, fileName);
        if (data.tracks.length > 1) {
          setPendingMidiData(data);
          setPendingBuffer(buffer);
          setShowTrackSelector(true);
        } else if (data.tracks.length === 1) {
          setMidiBuffer(buffer);
          loadTrack(data, data.tracks[0].index);
        } else {
          setError("このMIDIファイルには有効なトラックが含まれていません。");
        }
      } catch (err) {
        console.error("MIDI parse error:", err);
        setError(`MIDI解析エラー: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  }, []);

  const loadTrack = useCallback((data: MidiFileData, trackIndex: number) => {
    setIsProcessing(true);
    setError(null);
    setSelectedTrackIndex(trackIndex);
    setMidiData(data);
    setBpm(data.bpm);
    setOriginalBpm(data.bpm);
    setStartMeasure(1);
    setEndMeasure(Math.min(4, data.totalMeasures));
    setCurrentNoteIndex(0);
    setShowTrackSelector(false);
    setPendingMidiData(null);
    setPendingBuffer(null);

    try {
      // Detect key
      const track = data.tracks.find(t => t.index === trackIndex);
      if (track) {
        const keys = detectKey(track.notes);
        setDetectedKeys(keys);
        if (keys.length > 0) {
          setSelectedKey(keys[0].key);
          setSelectedMode(keys[0].mode);
        }
      }
    } catch (err) {
      console.warn("Key detection failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleTrackSelect = useCallback((trackIndex: number) => {
    if (pendingMidiData && pendingBuffer) {
      setMidiBuffer(pendingBuffer);
      loadTrack(pendingMidiData, trackIndex);
    }
  }, [pendingMidiData, pendingBuffer, loadTrack]);

  // Synchronize alphaTab player position with our fretboard's currentNoteIndex
  const handlePlayerPositionChanged = useCallback((args: any) => {
    // args.currentTime is in milliseconds
    const timeInSeconds = args.currentTime / 1000;
    
    // Find the note in guitarNotes that corresponds to this time
    // We look for the first note that starts after or at the current time
    // Or just find the closest one
    let index = guitarNotes.findIndex(n => n.time >= timeInSeconds);
    if (index === -1) index = guitarNotes.length - 1;
    else if (index > 0 && Math.abs(guitarNotes[index-1].time - timeInSeconds) < Math.abs(guitarNotes[index].time - timeInSeconds)) {
      index = index - 1;
    }
    
    setCurrentNoteIndex(index);
  }, [guitarNotes]);

  const handleBeatClick = useCallback((beat: any) => {
    const timeInSeconds = beat.playbackStart / 1000;
    const index = guitarNotes.findIndex(n => Math.abs(n.time - timeInSeconds) < 0.05);
    if (index >= 0) {
      setCurrentNoteIndex(index);
    }
  }, [guitarNotes]);

  const handleAlphaTabError = useCallback((err: Error) => {
    setError(`譜面表示エラー: ${err.message}`);
  }, []);

  const isLoaded = midiData !== null && selectedTrackIndex !== null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎸</span>
            <div>
              <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
                Guitar Position View
              </h1>
              <p className="text-xs text-gray-500">MIDIギターポジションビューア</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {midiData && (
              <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-lg">
                📄 {midiData.name}
              </span>
            )}
            <MidiFileLoader onFileLoaded={handleFileLoaded} isLoaded={isLoaded} />
          </div>
        </div>
      </header>

      {/* Track Selector Modal */}
      {showTrackSelector && pendingMidiData && (
        <TrackSelector
          tracks={pendingMidiData.tracks}
          onSelect={handleTrackSelect}
          onCancel={() => { setShowTrackSelector(false); setPendingMidiData(null); setPendingBuffer(null); }}
        />
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/40 border border-red-500 rounded-xl flex items-center justify-between text-white z-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold">Error Info:</p>
              <pre className="text-xs whitespace-pre-wrap">{error}</pre>
            </div>
          </div>
          <button onClick={() => setError(null)} className="p-2 hover:bg-white/10 rounded">✕</button>
        </div>
      )}

      {/* Processing Status - Non-blocking */}
      {isProcessing && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold">Processing...</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full relative">
        {!isLoaded ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="text-6xl mb-6">🎸</div>
            <h2 className="text-3xl font-bold text-white mb-3">Guitar Position View</h2>
            <p className="text-gray-400 mb-10 max-w-md mx-auto">
              MIDIファイルを読み込んで、ギターの指板上にポジションを表示。
            </p>
            <MidiFileLoader onFileLoaded={handleFileLoaded} isLoaded={false} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 p-4 max-w-7xl mx-auto w-full">
            {/* Debug Monitor - 開発用 */}
            <div className="bg-indigo-900/40 border border-indigo-500/30 p-2 rounded text-[10px] font-mono text-indigo-200">
              [DEBUG] State: {isLoaded ? "LOADED" : "NOT_LOADED"} | 
              Track: {selectedTrackIndex ?? "NONE"} | 
              Notes: {guitarNotes.length} | 
              Key: {selectedKey}
            </div>
            
            <div className="flex flex-wrap gap-4 items-start bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-inner">
              <KeySelector
                selectedKey={selectedKey}
                setSelectedKey={setSelectedKey}
                selectedMode={selectedMode}
                setSelectedMode={setSelectedMode}
                detectedKeys={detectedKeys}
              />
              <div className="w-px h-16 bg-gray-700/50 self-center hidden sm:block" />
              <PatternSelector
                selectedPattern={patternType}
                setSelectedPattern={setPatternType}
                difficulty={difficulty.difficulty}
                stringJumps={difficulty.stringJumps}
                boxChanges={difficulty.boxChanges}
              />
              <div className="w-px h-16 bg-gray-700/50 self-center hidden sm:block" />
              <StringSelector
                enabledStrings={enabledStrings}
                setEnabledStrings={setEnabledStrings}
              />
              <div className="w-px h-16 bg-gray-700/50 self-center hidden sm:block" />
              <OctaveAdjuster
                octaveShift={octaveShift}
                setOctaveShift={setOctaveShift}
                outOfRangeCount={outOfRangeCount}
                totalNotes={trackNotes.length}
              />
            </div>

            <GuitarFretboard
              currentNote={currentNote}
              upcomingNotes={upcomingNotes}
              displayMode={displayMode}
              enabledStrings={enabledStrings}
              boxHighlight={boxHighlight}
            />

            <TransportControls
              notes={guitarNotes}
              bpm={bpm}
              setBpm={setBpm}
              originalBpm={originalBpm}
              metronomeEnabled={metronomeEnabled}
              setMetronomeEnabled={setMetronomeEnabled}
              loopEnabled={loopEnabled}
              setLoopEnabled={setLoopEnabled}
              startMeasure={startMeasure}
              endMeasure={endMeasure}
              totalMeasures={midiData?.totalMeasures || 1}
              setStartMeasure={setStartMeasure}
              setEndMeasure={setEndMeasure}
              beatsPerMeasure={midiData?.timeSignatureNumerator || 4}
              ticksPerBeat={midiData?.ticksPerBeat || 480}
              currentNoteIndex={currentNoteIndex}
              setCurrentNoteIndex={setCurrentNoteIndex}
            />

            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-xl">
              <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                <span>🎼</span> 楽譜 & TAB譜ビュー
              </h3>
              <VexFlowDisplay 
                guitarNotes={guitarNotes} 
                currentNoteIndex={currentNoteIndex}
                ticksPerBeat={midiData?.ticksPerBeat || 480}
                beatsPerMeasure={midiData?.timeSignatureNumerator || 4}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

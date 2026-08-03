import React, { useCallback, useState } from "react";

interface MidiFileLoaderProps {
  onFileLoaded: (buffer: ArrayBuffer, fileName: string) => void;
  isLoaded: boolean;
}

export const MidiFileLoader: React.FC<MidiFileLoaderProps> = ({ onFileLoaded, isLoaded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        onFileLoaded(e.target.result, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onFileLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".mid") || file.name.endsWith(".midi"))) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const loadDemo = useCallback(async () => {
    setLoadingDemo(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}demo.mid`);
      const buffer = await res.arrayBuffer();
      onFileLoaded(buffer, "Super Mario 64 - Medley.mid");
    } catch (err) {
      console.error("Failed to load demo:", err);
    }
    setLoadingDemo(false);
  }, [onFileLoaded]);

  if (isLoaded) {
    return (
      <div className="flex items-center gap-3">
        <label
          className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-600"
        >
          別のMIDI読込
          <input type="file" accept=".mid,.midi" onChange={handleChange} className="hidden" />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`w-full border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
          isDragOver
            ? "border-blue-400 bg-blue-500/10 scale-[1.02]"
            : "border-gray-600 hover:border-gray-500 bg-gray-800/50"
        }`}
      >
        <div className="text-5xl mb-4">🎵</div>
        <p className="text-xl font-bold text-gray-200 mb-2">
          MIDIファイルをドラッグ＆ドロップ
        </p>
        <p className="text-gray-400 text-sm mb-4">
          または
        </p>
        <label className="inline-block cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all">
          ファイルを選択
          <input type="file" accept=".mid,.midi" onChange={handleChange} className="hidden" />
        </label>
        <p className="text-gray-500 text-xs mt-4">.mid / .midi ファイル対応</p>
      </div>

      <button
        onClick={loadDemo}
        disabled={loadingDemo}
        className="text-gray-400 hover:text-gray-200 text-sm underline underline-offset-4 transition-colors disabled:opacity-50"
      >
        {loadingDemo ? "読み込み中..." : "🎮 デモMIDI（Super Mario 64）を試す"}
      </button>
    </div>
  );
};

import React, { useMemo } from "react";
import type { ValidString } from "../lib/fretboard";
import { FRET_COUNT } from "../lib/fretboard";
import type { GuitarNote } from "../lib/guitarMapping";
import type { IntervalDegree } from "../lib/musicTheory";

export type FretMarkerColor = "root" | "third" | "fifth" | "seventh" | "scale" | "current" | "upcoming" | "muted";

export interface FretMarker {
  stringNum: ValidString;
  fret: number;
  label: string;
  colorType: FretMarkerColor;
  isHighlighted: boolean;
  isCurrent: boolean;
  opacity: number;
  onClick?: () => void;
}

interface GuitarFretboardProps {
  currentNote: GuitarNote | null;
  upcomingNotes: GuitarNote[];  // Next 3-5 notes to preview
  displayMode: "note" | "degree";
  enabledStrings: ValidString[];
  boxHighlight?: { start: number; end: number } | null;
  onNoteClick?: (note: GuitarNote) => void;
}

const COLOR_MAP: Record<FretMarkerColor, string> = {
  root: "#F59E0B",
  third: "#EF4444",
  fifth: "#3B82F6",
  seventh: "#8B5CF6",
  scale: "#9CA3AF",
  current: "#22C55E",
  upcoming: "#6366F1",
  muted: "rgba(156, 163, 175, 0.3)",
};

const getColorForInterval = (interval: IntervalDegree): FretMarkerColor => {
  if (interval === "1") return "root";
  if (["3", "b3"].includes(interval)) return "third";
  if (["5", "b5", "#5"].includes(interval)) return "fifth";
  if (["7", "b7", "6"].includes(interval)) return "seventh";
  return "scale";
};

const INTERVAL_LABELS: Record<IntervalDegree, string> = {
  "1": "R", "b2": "b2", "2": "2", "b3": "b3", "3": "3", "4": "4",
  "b5": "b5", "5": "5", "#5": "#5", "6": "6", "b7": "b7", "7": "7",
};

export const GuitarFretboard: React.FC<GuitarFretboardProps> = ({
  currentNote,
  upcomingNotes,
  displayMode,
  enabledStrings,
  boxHighlight,
}) => {
  const strings: ValidString[] = [1, 2, 3, 4, 5, 6];
  const fretCount = FRET_COUNT;

  const stringSpacing = 40;
  const fretWidth = 60;
  const topPadding = 30;
  const leftPadding = 50;

  const width = leftPadding + (fretCount * fretWidth) + 20;
  const height = topPadding * 2 + (5 * stringSpacing);

  // Build markers from current + upcoming notes
  const markers = useMemo(() => {
    const result: FretMarker[] = [];

    // Current note (big, bright)
    if (currentNote) {
      const label = displayMode === "degree"
        ? INTERVAL_LABELS[currentNote.interval]
        : currentNote.note;
      
      result.push({
        stringNum: currentNote.stringNum,
        fret: currentNote.fret,
        label,
        colorType: "current",
        isHighlighted: true,
        isCurrent: true,
        opacity: 1,
      });
    }

    // Upcoming notes (progressively fading)
    upcomingNotes.forEach((note, idx) => {
      const label = displayMode === "degree"
        ? INTERVAL_LABELS[note.interval]
        : note.note;
      
      const opacity = Math.max(0.2, 0.7 - idx * 0.15);
      
      result.push({
        stringNum: note.stringNum,
        fret: note.fret,
        label,
        colorType: getColorForInterval(note.interval),
        isHighlighted: true,
        isCurrent: false,
        opacity,
      });
    });

    return result;
  }, [currentNote, upcomingNotes, displayMode]);

  // Render box position highlight
  const renderBoxHighlight = () => {
    if (!boxHighlight) return null;
    const x = leftPadding + ((boxHighlight.start - 0.5) * fretWidth);
    const w = (boxHighlight.end - boxHighlight.start + 1) * fretWidth;
    return (
      <rect
        x={x}
        y={topPadding - 10}
        width={w}
        height={5 * stringSpacing + 20}
        fill="rgba(99, 102, 241, 0.08)"
        stroke="rgba(99, 102, 241, 0.25)"
        strokeWidth={1}
        strokeDasharray="4 4"
        rx={6}
      />
    );
  };

  // Connection line between current and next note
  const renderConnectionLine = () => {
    if (!currentNote || upcomingNotes.length === 0) return null;
    const next = upcomingNotes[0];

    const cx1 = currentNote.fret === 0
      ? leftPadding - 15
      : leftPadding + (currentNote.fret * fretWidth) - (fretWidth / 2);
    const cy1 = topPadding + ((currentNote.stringNum - 1) * stringSpacing);

    const cx2 = next.fret === 0
      ? leftPadding - 15
      : leftPadding + (next.fret * fretWidth) - (fretWidth / 2);
    const cy2 = topPadding + ((next.stringNum - 1) * stringSpacing);

    const stringDist = Math.abs(next.stringNum - currentNote.stringNum);
    const isJump = stringDist > 1;

    return (
      <line
        x1={cx1} y1={cy1} x2={cx2} y2={cy2}
        stroke={isJump ? "#EF4444" : "#6366F1"}
        strokeWidth={isJump ? 2 : 1.5}
        strokeDasharray={isJump ? "6 3" : "4 4"}
        opacity={0.6}
        markerEnd="url(#arrowhead)"
      />
    );
  };

  const renderFretLines = () => {
    const lines = [];
    for (let i = 0; i <= fretCount; i++) {
      const x = leftPadding + (i * fretWidth);
      lines.push(
        <line
          key={`fret-${i}`}
          x1={x} y1={topPadding} x2={x} y2={height - topPadding}
          stroke={i === 0 ? "#D1D5DB" : "#4B5563"}
          strokeWidth={i === 0 ? 6 : 1.5}
        />
      );
      if (i > 0) {
        lines.push(
          <text
            key={`fret-text-${i}`}
            x={x - (fretWidth / 2)} y={height + 16}
            fill="#6B7280" fontSize="12" textAnchor="middle" fontFamily="monospace"
          >
            {i}
          </text>
        );
      }
    }
    return lines;
  };

  const renderPositionMarkers = () => {
    const singleDots = [3, 5, 7, 9, 15, 17, 19, 21];
    const doubleDots = [12, 24];
    const dots = [];

    for (let i = 1; i <= fretCount; i++) {
      const cx = leftPadding + (i * fretWidth) - (fretWidth / 2);
      const cyCenter = height / 2;

      if (singleDots.includes(i)) {
        dots.push(<circle key={`dot-${i}`} cx={cx} cy={cyCenter} r={5} fill="#2D3748" />);
      } else if (doubleDots.includes(i)) {
        dots.push(<circle key={`dot-${i}-1`} cx={cx} cy={cyCenter - stringSpacing} r={5} fill="#2D3748" />);
        dots.push(<circle key={`dot-${i}-2`} cx={cx} cy={cyCenter + stringSpacing} r={5} fill="#2D3748" />);
      }
    }
    return dots;
  };

  const renderStrings = () => {
    return strings.map((stringNum, idx) => {
      const y = topPadding + (idx * stringSpacing);
      const isEnabled = enabledStrings.includes(stringNum);
      const stringColor = isEnabled ? "#6B7280" : "#374151";
      const textColor = isEnabled ? "#9CA3AF" : "#4B5563";

      return (
        <g key={`string-${stringNum}`}>
          <text x={18} y={y + 5} fill={textColor} fontSize="13" fontWeight="bold" textAnchor="middle">
            {stringNum}
          </text>
          <line
            x1={leftPadding} y1={y} x2={width - 20} y2={y}
            stroke={stringColor}
            strokeWidth={1 + idx * 0.3}
            opacity={isEnabled ? 1 : 0.4}
          />
        </g>
      );
    });
  };

  const renderMarkers = () => {
    return markers.map((marker, idx) => {
      const stringIdx = marker.stringNum - 1;
      const cx = marker.fret === 0
        ? leftPadding - 15
        : leftPadding + (marker.fret * fretWidth) - (fretWidth / 2);
      const cy = topPadding + (stringIdx * stringSpacing);

      const color = COLOR_MAP[marker.colorType];
      const radius = marker.isCurrent ? 18 : 14;

      return (
        <g
          key={`marker-${idx}`}
          opacity={marker.opacity}
          className={marker.isCurrent ? "animate-pulse-gentle" : ""}
        >
          {marker.isCurrent && (
            <circle
              cx={cx} cy={cy} r={radius + 6}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.3}
              className="animate-ping-slow"
            />
          )}
          {marker.fret === 0 ? (
            <>
              <circle cx={cx} cy={cy} r={radius} fill="transparent" stroke={color} strokeWidth={3} />
              <circle cx={cx} cy={cy} r={radius * 0.5} fill={color} opacity={0.5} />
            </>
          ) : (
            <circle
              cx={cx} cy={cy} r={radius}
              fill={color}
              stroke={marker.isCurrent ? "#FFF" : "#1F2937"}
              strokeWidth={marker.isCurrent ? 3 : 1.5}
            />
          )}
          <text
            x={cx} y={cy + 5}
            fill={marker.fret === 0 ? "#E5E7EB" : "#FFF"}
            fontSize={marker.isCurrent ? "14" : "12"}
            fontWeight="bold"
            textAnchor="middle"
          >
            {marker.label}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="w-full flex justify-center overflow-x-auto select-none" id="guitar-fretboard">
      <svg
        width={width}
        height={height + 30}
        viewBox={`0 0 ${width} ${height + 30}`}
        className="bg-gray-900/80 rounded-xl shadow-xl border border-gray-800"
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#6366F1" opacity="0.6" />
          </marker>
        </defs>
        {renderBoxHighlight()}
        {renderPositionMarkers()}
        {renderFretLines()}
        {renderStrings()}
        {renderConnectionLine()}
        {renderMarkers()}
      </svg>
    </div>
  );
};

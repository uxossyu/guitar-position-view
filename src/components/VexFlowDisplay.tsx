import React, { useEffect, useRef, useState } from "react";
import type { GuitarNote } from "../lib/guitarMapping";
// @ts-ignore
import * as VexFlowFuncs from "vexflow";

const { Renderer, TabStave, TabNote, Formatter, Voice, Stave, StaveNote, StaveConnector, Accidental, Beam } = VexFlowFuncs as any;

interface VexFlowDisplayProps {
  guitarNotes: GuitarNote[];
  currentNoteIndex: number;
  ticksPerBeat: number;
  beatsPerMeasure: number;
}

const getVexDuration = (ticks: number, ticksPerBeat: number): string => {
  const ratio = ticks / ticksPerBeat;
  if (ratio >= 3.8) return "w";
  if (ratio >= 1.8) return "h";
  if (ratio >= 0.8) return "q";
  if (ratio >= 0.4) return "8";
  if (ratio >= 0.2) return "16";
  return "32";
};

export const VexFlowDisplay: React.FC<VexFlowDisplayProps> = ({ 
  guitarNotes, 
  currentNoteIndex,
  ticksPerBeat,
  beatsPerMeasure
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [renderStatus, setRenderStatus] = useState<string>("Initializing...");
  
  const notesRef = useRef<{ staveNote: any; tabNote: any; tick: number; x: number; el?: SVGElement; tabEl?: SVGElement; isRest?: boolean }[]>([]);
  const contextRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.innerHTML = "";
    notesRef.current = [];
    
    if (!guitarNotes || guitarNotes.length === 0) {
      setRenderStatus("No notes to display.");
      return;
    }

    try {
      const notesByTime: { [tick: string]: GuitarNote[] } = {};
      guitarNotes.forEach(note => {
        const key = note.ticks.toString();
        if (!notesByTime[key]) notesByTime[key] = [];
        notesByTime[key].push(note);
      });

      const uniqueTicks = Object.keys(notesByTime).map(Number).sort((a, b) => a - b);
      const activeTicksLimit = uniqueTicks.slice(0, 300);
      
      const width = Math.max(1000, activeTicksLimit.length * 75 + 200); 
      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(width, 420);
      const context = renderer.getContext();
      contextRef.current = context;
      
      // Force Gothic Bold globally
      context.setFont("bold 16pt sans-serif");
      
      const notationStave = new Stave(20, 60, width - 40);
      notationStave.addClef("treble").addTimeSignature(`${beatsPerMeasure}/4`);
      notationStave.setContext(context).draw();
      
      const tabStave = new TabStave(20, 240, width - 40);
      tabStave.addClef("tab").addTimeSignature(`${beatsPerMeasure}/4`);
      tabStave.setContext(context).draw();
      
      new StaveConnector(notationStave, tabStave).setType(1).setContext(context).draw();
      new StaveConnector(notationStave, tabStave).setType(6).setContext(context).draw();

      const staveNotes: any[] = [];
      const tabNotes: any[] = [];
      const ticksPerMeasure = ticksPerBeat * beatsPerMeasure;
      
      let lastEndTick = 0;

      activeTicksLimit.forEach((tick) => {
        if (tick > lastEndTick && lastEndTick > 0) {
            let gap = tick - lastEndTick;
            while (gap >= ticksPerBeat * 0.25) {
                const restDuration = getVexDuration(gap, ticksPerBeat);
                const rSNote = new StaveNote({ keys: ["b/4"], duration: restDuration + "r" });
                const rTNote = new TabNote({ positions: [{str: 3, fret: ""}], duration: restDuration + "r" });
                
                (rSNote as any)._isManualRest = true;
                (rTNote as any)._isManualRest = true;
                
                staveNotes.push(rSNote);
                tabNotes.push(rTNote);
                
                notesRef.current.push({
                    staveNote: rSNote,
                    tabNote: rTNote,
                    tick: tick - gap,
                    x: 0,
                    isRest: true
                });

                const durVal = (restDuration === "w" ? 4 : restDuration === "h" ? 2 : restDuration === "q" ? 1 : restDuration === "8" ? 0.5 : 0.25);
                gap -= durVal * ticksPerBeat;
                if (gap < ticksPerBeat * 0.1) break;
            }
        }

        const chord = notesByTime[tick.toString()];
        const duration = getVexDuration(chord[0].durationTicks, ticksPerBeat);
        
        const staveKeys = chord.map(n => {
          const name = n.note;
          const octave = Math.floor(n.midi / 12) - 1;
          return `${name}/${octave}`;
        });

        const sNote = new StaveNote({ keys: staveKeys, duration, auto_stem: true });
        staveKeys.forEach((k, i) => {
          if (k.includes("#")) sNote.addModifier(new Accidental("#"), i);
          if (k.includes("b")) sNote.addModifier(new Accidental("b"), i);
        });

        const positions = chord.map(n => ({ str: n.stringNum, fret: n.fret.toString() }));
        const tNote = new TabNote({ positions, duration });

        staveNotes.push(sNote);
        tabNotes.push(tNote);
        
        notesRef.current.push({
            staveNote: sNote,
            tabNote: tNote,
            tick: tick,
            x: 0,
            isRest: false
        });

        lastEndTick = Math.max(lastEndTick, tick + chord[0].durationTicks);
      });

      const voice1 = new Voice({ numBeats: staveNotes.length, beatValue: 4 }).setMode(2); 
      voice1.addTickables(staveNotes);
      const voice2 = new Voice({ numBeats: tabNotes.length, beatValue: 4 }).setMode(2);
      voice2.addTickables(tabNotes);
      
      new Formatter().joinVoices([voice1, voice2]).format([voice1, voice2], width - 100);
      
      // --- IMPORTANT: Repeatedly set bold font to ensure TAB digits pick it up ---
      context.setFont("bold 16pt sans-serif");
      voice1.draw(context, notationStave);
      
      context.setFont("bold 16pt sans-serif");
      voice2.draw(context, tabStave);
      
      try {
          const beamGroups = [];
          let currentGroup: any[] = [];
          staveNotes.forEach(note => {
              if (!note.isRest() && (note.getDuration() === "8" || note.getDuration() === "16")) {
                  currentGroup.push(note);
              } else {
                  if (currentGroup.length >= 2) beamGroups.push(currentGroup);
                  currentGroup = [];
              }
          });
          if (currentGroup.length >= 2) beamGroups.push(currentGroup);
          beamGroups.forEach(group => {
              new Beam(group).setContext(context).draw();
          });
      } catch (beamErr) {
          console.warn("Beam generation failed", beamErr);
      }

      // Metadata Styles (Measure lines and numbers)
      // Darker Slate-400/500 for measure lines
      context.setFont("bold 12pt sans-serif");
      notesRef.current.forEach(item => {
          const x = item.staveNote.getAbsoluteX();
          item.x = x;
          item.el = item.staveNote.getAttribute("el");
          item.tabEl = item.tabNote.getAttribute("el");
          
          if (item.tick % ticksPerMeasure === 0 && !item.isRest) {
              const measureNum = Math.floor(item.tick / ticksPerMeasure) + 1;
              context.save();
              context.setFillStyle("#475569"); // Slate-600
              context.fillText(`M.${measureNum}`, x, 40);
              
              context.setStrokeStyle("#94a3b8"); // Slate-400 (Deeper than before)
              context.setLineWidth(1.5);
              context.beginPath();
              context.moveTo(x - 25, 60);
              context.lineTo(x - 25, 360);
              context.stroke();
              context.restore();
          }
      });

      setRenderStatus("Render complete.");
    } catch (err) {
      console.error(err);
      setRenderStatus(`Error: ${String(err)}`);
    }
  }, [guitarNotes, ticksPerBeat, beatsPerMeasure]);

  useEffect(() => {
    if (notesRef.current.length === 0) return;
    const currentTick = guitarNotes[currentNoteIndex]?.ticks || 0;
    
    let activeIdx = -1;
    for (let i = 0; i < notesRef.current.length; i++) {
        if (notesRef.current[i].tick <= currentTick) {
            activeIdx = i;
        } else {
            break;
        }
    }

    if (activeIdx >= 0) {
        const activeItem = notesRef.current[activeIdx];
        notesRef.current.forEach((n, i) => {
            const isActive = i === activeIdx && !n.isRest;
            const color = isActive ? "#22C55E" : "#000000";
            if (n.el) n.el.setAttribute("fill", color);
            if (n.tabEl) n.tabEl.setAttribute("fill", color);
        });

        if (cursorRef.current) {
            cursorRef.current.style.opacity = "1";
            cursorRef.current.style.left = `${activeItem.x - 25}px`;
            cursorRef.current.style.width = "50px";
        }

        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTo({ left: activeItem.x - container.clientWidth / 3, behavior: "smooth" });
        }
    } else if (cursorRef.current) {
        cursorRef.current.style.opacity = "0";
    }
  }, [currentNoteIndex, guitarNotes]);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">楽譜 & TAB譜 (Standard Bold High-Contrast)</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-400">Time: {beatsPerMeasure}/4</span>
          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{renderStatus}</span>
        </div>
      </div>
      <div ref={scrollContainerRef} className="overflow-x-auto p-12 custom-scrollbar scroll-smooth relative">
        <div className="relative">
          <div 
            ref={cursorRef}
            className="absolute top-8 bottom-4 bg-yellow-400/20 border-x border-yellow-400/40 rounded pointer-events-none transition-all duration-100 ease-out z-0"
            style={{ opacity: 0 }}
          />
          <div ref={containerRef} className="min-w-fit relative z-10" />
        </div>
      </div>
    </div>
  );
};

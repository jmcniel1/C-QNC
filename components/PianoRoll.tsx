

import React, { useMemo, useRef, useEffect } from 'react';
import { noteNames as notes } from '../constants';
import { Note, SequencerStep } from '../types';
import { analyzeSequence } from '../audio/musicTheory';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface PianoRollProps {
    activeNotes: Note[];
    trackSteps: SequencerStep[];
    onClose: () => void;
    onNoteToggle: (noteName: string) => void;
    onSetNotes: (notes: Note[], chordName?: string) => void;
    rect: DOMRect;
    oscColor: string;
    isMobile: boolean;
}

export const PianoRoll: React.FC<PianoRollProps> = ({ activeNotes, trackSteps, onClose, onNoteToggle, onSetNotes, rect, oscColor, isMobile }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const desktopKeyWidth = 32;
    const mobileKeyWidth = typeof window !== 'undefined' ? window.innerWidth / 14 : 20;
    
    const wKeyWidth = isMobile ? mobileKeyWidth : desktopKeyWidth;
    const bKeyWidth = wKeyWidth * 0.6;
    const pHeight = isMobile ? 120 : 100; 
    const wKeyHeight = pHeight;
    const bKeyHeight = pHeight * 0.6;

    // Define Range (C1 to B6)
    const startOctave = 1;
    const endOctave = 6; 
    const octaves = Array.from({ length: endOctave - startOctave + 1 }, (_, i) => startOctave + i);

    const allKeys = useMemo(() => {
        return octaves.flatMap(octave => 
            notes.map(note => ({ note, octave, id: `${note}${octave}` }))
        );
    }, [octaves]);

    const whiteKeys = allKeys.filter(k => !k.note.includes('#'));
    const blackKeys = allKeys.filter(k => k.note.includes('#'));
    
    const pianoWidth = whiteKeys.length * wKeyWidth;

    // Music Theory Analysis
    const { keyName, suggestions } = useMemo(() => analyzeSequence(trackSteps), [trackSteps]);

    let top, left, transform, containerClass, containerStyleWidth;

    if (isMobile) {
        top = '50%';
        left = '0';
        transform = 'translate(0, -50%)';
        containerStyleWidth = '100%';
        containerClass = "absolute bg-gray-900/80 backdrop-blur-[4px] flex flex-col gap-2 shadow-2xl w-full py-4 border-y border-gray-700";
    } else {
        const windowWidth = window.innerWidth;
        
        // Calculate width for exactly 2 octaves of white keys plus padding (p-3 = 12px * 2 = 24px)
        const visibleWhiteKeys = 14; 
        const padding = 24; 
        const componentWidth = (visibleWhiteKeys * wKeyWidth) + padding;
        
        const componentHeight = pHeight + 160; // Increased height for octave controls
    
        let topPos = rect.top - componentHeight;
        if (topPos < 10) { topPos = rect.bottom + 10; }
    
        let leftPos = rect.left + rect.width / 2 - componentWidth / 2;
        if (leftPos < 10) leftPos = 10;
        if (leftPos + componentWidth > windowWidth - 10) { leftPos = windowWidth - componentWidth - 10; }
        
        top = `${topPos}px`;
        left = `${leftPos}px`;
        containerStyleWidth = `${componentWidth}px`;
        containerClass = "absolute bg-gray-800/60 backdrop-blur-[4px] rounded-xl p-3 flex flex-col gap-2 shadow-2xl border border-white/10";
    }

    const scrollToNotes = (targetNotes: Note[]) => {
        if (!scrollContainerRef.current || targetNotes.length === 0) return;

        let minIndex = Infinity;
        let maxIndex = -Infinity;

        targetNotes.forEach(n => {
             const octave = parseInt(n.name.slice(-1));
             const noteName = n.name.slice(0, -1);
             const whiteKeysPerOctave = 7;
             const whiteKeysBeforeOctave = (octave - startOctave) * whiteKeysPerOctave;
             
             let noteIndexInOctave = 0;
             if (noteName.startsWith('D')) noteIndexInOctave = 1;
             else if (noteName.startsWith('E')) noteIndexInOctave = 2;
             else if (noteName.startsWith('F')) noteIndexInOctave = 3;
             else if (noteName.startsWith('G')) noteIndexInOctave = 4;
             else if (noteName.startsWith('A')) noteIndexInOctave = 5;
             else if (noteName.startsWith('B')) noteIndexInOctave = 6;

             const absoluteIndex = whiteKeysBeforeOctave + noteIndexInOctave;
             if (absoluteIndex < minIndex) minIndex = absoluteIndex;
             if (absoluteIndex > maxIndex) maxIndex = absoluteIndex;
        });

        if (minIndex === Infinity) return;

        const centerIndex = (minIndex + maxIndex) / 2;
        const centerPixel = centerIndex * wKeyWidth + (wKeyWidth / 2);
        const containerWidth = scrollContainerRef.current.clientWidth;
        
        scrollContainerRef.current.scrollTo({
            left: centerPixel - (containerWidth / 2),
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        if (activeNotes.length > 0) {
            setTimeout(() => scrollToNotes(activeNotes), 100);
        } else {
            setTimeout(() => {
                if (scrollContainerRef.current) {
                   // Default to centering around middle of the range (approx C4)
                   const middle = (whiteKeys.length * wKeyWidth) / 2;
                   scrollContainerRef.current.scrollTo({ left: middle - scrollContainerRef.current.clientWidth / 2, behavior: 'smooth' });
                }
            }, 100);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSuggestionClick = (chordNotes: string[], chordName: string) => {
        const newNotes: Note[] = chordNotes.map(name => ({
            name,
            velocity: 0.8,
            duration: 1.0
        }));
        onSetNotes(newNotes, chordName);
        scrollToNotes(newNotes);
    };

    const handleOctaveShift = (shift: number) => {
        if (activeNotes.length === 0) return;
        const newNotes = activeNotes.map(n => {
            const match = n.name.match(/^([A-G]#?)(\d+)$/);
            if (!match) return n;
            const [, note, octStr] = match;
            let newOct = parseInt(octStr) + shift;
            // Clamp within reasonable 0-8 range
            newOct = Math.max(0, Math.min(8, newOct));
            return { ...n, name: `${note}${newOct}` };
        });
        onSetNotes(newNotes);
    };

    return (
        <div 
            className="fixed inset-0 z-[1003] bg-black/50 backdrop-blur-sm" 
            onMouseDown={onClose}
        >
            <div 
                className={containerClass}
                style={{ top, left, transform, width: containerStyleWidth }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Smart Assist Panel */}
                <div className={`bg-black/40 rounded-lg p-2 flex flex-col gap-1 ${isMobile ? 'mx-4' : ''}`}>
                    <div className="flex items-center justify-start text-xs text-gray-400 px-1">
                        <span>Key: <strong className="text-gray-200">{keyName}</strong></span>
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                        {suggestions.map((chord, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSuggestionClick(chord.notes, chord.name)}
                                className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                                    chord.isCommon 
                                    ? 'bg-gray-600/80 hover:bg-gray-500/80 text-white shadow-sm' 
                                    : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'
                                }`}
                            >
                                {chord.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable Piano Container */}
                <div 
                    ref={scrollContainerRef}
                    className="relative mx-auto mt-1 overflow-x-auto overflow-y-hidden scrollbar-hide" 
                    style={{ width: '100%', height: `${pHeight + 20}px` }} 
                >
                    <div style={{ width: `${pianoWidth}px`, height: `${pHeight}px`, position: 'relative' }}>
                        {whiteKeys.map((key, index) => {
                            const isActive = activeNotes.some(n => n.name === key.id);
                            return (
                                <button
                                    key={key.id}
                                    onClick={() => onNoteToggle(key.id)}
                                    className={`absolute top-0 bottom-0 transition-colors border-r border-b border-gray-900 text-black text-[10px] font-semibold rounded-b-[4px] flex items-end justify-center pb-1 ${
                                        !isActive ? 'bg-gray-200 hover:bg-gray-300' : 'text-white'
                                    }`}
                                    style={{
                                        left: `${index * wKeyWidth}px`,
                                        width: `${wKeyWidth}px`,
                                        height: `${wKeyHeight}px`,
                                        backgroundColor: isActive ? oscColor : undefined,
                                    }}
                                >
                                    {key.note.includes('C') && key.note.length === 1 ? key.id : ''}
                                </button>
                            );
                        })}
                        {blackKeys.map((key) => {
                            const isActive = activeNotes.some(n => n.name === key.id);
                            const keyNote = key.note;
                            const keyOctave = key.octave;
                            const whiteKeysBefore = (keyOctave - startOctave) * 7;
                            let offsetInOctave = 0;
                            if (keyNote.startsWith('C')) offsetInOctave = 1;
                            else if (keyNote.startsWith('D')) offsetInOctave = 2;
                            else if (keyNote.startsWith('F')) offsetInOctave = 4;
                            else if (keyNote.startsWith('G')) offsetInOctave = 5;
                            else if (keyNote.startsWith('A')) offsetInOctave = 6;
                            
                            const leftPos = (whiteKeysBefore + offsetInOctave) * wKeyWidth - (bKeyWidth / 2);

                            return (
                                <button
                                    key={key.id}
                                    onClick={() => onNoteToggle(key.id)}
                                    className={`absolute top-0 z-10 transition-colors border border-black/50 rounded-b-[4px]
                                        ${!isActive ? 'bg-black hover:bg-gray-800' : ''}`}
                                    style={{
                                        left: `${leftPos}px`,
                                        width: `${bKeyWidth}px`,
                                        height: `${bKeyHeight}px`,
                                        backgroundColor: isActive ? oscColor : undefined,
                                        opacity: isActive ? 0.9 : 1.0,
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                    <div className="text-center text-base md:text-xs text-gray-400 min-h-[16px]">
                        {activeNotes.length > 0 ? activeNotes.map(n => n.name).join(', ') : 'No notes selected'}
                    </div>
                    
                    <div className="flex justify-center gap-2 pb-1">
                         <button 
                            onClick={() => handleOctaveShift(-1)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-200 transition-colors disabled:opacity-50 shadow-sm"
                            disabled={activeNotes.length === 0}
                         >
                            <ArrowDown size={12} /> Octave
                         </button>
                         <button 
                            onClick={() => handleOctaveShift(1)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-200 transition-colors disabled:opacity-50 shadow-sm"
                            disabled={activeNotes.length === 0}
                         >
                            Octave <ArrowUp size={12} />
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
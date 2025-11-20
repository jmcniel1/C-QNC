import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { noteNames as notes } from '../constants';
import { Note } from '../types';

interface PianoRollProps {
    activeNotes: Note[];
    onClose: () => void;
    onNoteToggle: (noteName: string) => void;
    rect: DOMRect;
    oscColor: string;
    isMobile: boolean;
}

export const PianoRoll: React.FC<PianoRollProps> = ({ activeNotes, onClose, onNoteToggle, rect, oscColor, isMobile }) => {
    const [octave, setOctave] = useState(3);
    
    const desktopKeyWidth = 32;
    const mobileKeyWidth = typeof window !== 'undefined' ? window.innerWidth / 14 : 20;
    
    const wKeyWidth = isMobile ? mobileKeyWidth : desktopKeyWidth;
    const bKeyWidth = wKeyWidth * 0.6;
    const pHeight = isMobile ? 120 : 90; 
    const wKeyHeight = pHeight;
    const bKeyHeight = pHeight * 0.6;

    const twoOctaveNotes = [
        ...notes.map(n => ({ note: n, octave: octave })),
        ...notes.map(n => ({ note: n, octave: octave + 1 }))
    ];

    const whiteKeys = twoOctaveNotes.filter(k => !k.note.includes('#'));
    const blackKeys = twoOctaveNotes.filter(k => k.note.includes('#'));
    
    const pianoWidth = whiteKeys.length * wKeyWidth;

    const changeOctave = (delta: number) => { setOctave(prev => Math.max(0, Math.min(6, prev + delta))); }

    let top, left, transform, containerClass;

    if (isMobile) {
        top = '50%';
        left = '0';
        transform = 'translate(0, -50%)';
        containerClass = "absolute bg-panel-bg flex flex-col gap-2 shadow-2xl w-full py-4 border-y border-gray-700";
    } else {
        const windowWidth = window.innerWidth;
        const componentWidth = pianoWidth + 40;
        const componentHeight = pHeight + 100;
    
        let topPos = rect.top - componentHeight;
        if (topPos < 10) { topPos = rect.bottom + 10; }
    
        let leftPos = rect.left + rect.width / 2 - componentWidth / 2;
        if (leftPos < 10) leftPos = 10;
        if (leftPos + componentWidth > windowWidth - 10) { leftPos = windowWidth - componentWidth - 10; }
        top = `${topPos}px`;
        left = `${leftPos}px`;
        containerClass = "absolute bg-panel-bg rounded-xl p-3 flex flex-col gap-2 shadow-2xl";
    }

    return (
        <div 
            className="fixed inset-0 z-[1003] bg-black/50 backdrop-blur-sm" 
            onMouseDown={onClose}
        >
            <div 
                className={containerClass}
                style={{ top, left, transform }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className={`flex justify-between items-center border-b border-gray-800 pb-2 ${isMobile ? 'px-4' : 'px-1'}`}>
                    <h3 className="text-base md:text-xs uppercase tracking-widest text-gray-400 font-semibold">C{octave} - B{octave+1}</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => changeOctave(-1)} disabled={octave === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
                        <span className="text-base md:text-sm font-bold text-gray-300">Octave Range</span>
                        <button onClick={() => changeOctave(1)} disabled={octave === 6} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
                    </div>
                     <button onClick={onClose} className="text-xl leading-none w-6 h-6 text-gray-500 hover:text-white rounded-full transition-colors">&times;</button>
                </div>
                
                <div className="relative mx-auto" style={{ width: `${pianoWidth}px`, height: `${pHeight}px` }}>
                    {whiteKeys.map((key, index) => {
                        const keyName = `${key.note}${key.octave}`;
                        const isActive = activeNotes.some(n => n.name === keyName);
                        return (
                             <button
                                key={keyName}
                                onClick={() => onNoteToggle(keyName)}
                                className={`absolute top-0 bottom-0 transition-colors border-r border-b border-gray-900 text-black text-base md:text-xs font-semibold rounded-b-lg flex items-end justify-center pb-1 ${
                                    !isActive ? 'bg-gray-200 hover:bg-gray-300' : 'text-white'
                                }`}
                                style={{
                                    left: `${index * wKeyWidth}px`,
                                    width: `${wKeyWidth}px`,
                                    height: `${wKeyHeight}px`,
                                    backgroundColor: isActive ? oscColor : undefined,
                                }}
                            >
                                {key.note}
                            </button>
                        );
                    })}
                    {blackKeys.map((key) => {
                        const keyName = `${key.note}${key.octave}`;
                        const isActive = activeNotes.some(n => n.name === keyName);
                        
                        const whiteKeysInOctaveBefore = notes.slice(0, notes.indexOf(key.note)).filter(n => !n.includes('#')).length;
                        const octaveOffset = (key.octave - octave) * 7 * wKeyWidth;
                        const noteOffset = whiteKeysInOctaveBefore * wKeyWidth - (bKeyWidth / 2);

                        return (
                            <button
                                key={keyName}
                                onClick={() => onNoteToggle(keyName)}
                                className={`absolute top-0 z-10 transition-colors border border-black/50 rounded-b-lg
                                    ${!isActive ? 'bg-black hover:bg-gray-800' : ''}`}
                                style={{
                                    left: `${octaveOffset + noteOffset}px`,
                                    width: `${bKeyWidth}px`,
                                    height: `${bKeyHeight}px`,
                                    backgroundColor: isActive ? oscColor : undefined,
                                    opacity: isActive ? 0.9 : 1.0,
                                }}
                            />
                        );
                    })}
                </div>

                <div className="text-center text-base md:text-xs text-gray-500 min-h-[16px] pt-1">
                    {activeNotes.length}/4 notes selected
                </div>
            </div>
        </div>
    );
};

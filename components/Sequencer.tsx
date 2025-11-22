
import React, { useRef, useState, useEffect } from 'react';
import { X, SlidersHorizontal, MoveUpRight, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { noteToString, hexToRgba } from '../utils';
import { SequencerTrack } from '../types';
import { detectChord } from '../audio/musicTheory';

interface SequencerProps {
    steps: SequencerTrack[];
    shiftSteps: number[];
    stepCount: number;
    currentStep: number;
    currentShiftStep: number;
    oscColors: string[];
    onStepClick: (track: number, step: number, rect: DOMRect) => void;
    onStepToggle: (track: number, step: number) => void;
    onContextMenu: (e: React.MouseEvent, track: number, step: number) => void;
    onClearTrack: (trackIndex: number) => void;
    onClearShift: () => void;
    onShiftChange: (step: number, value: number) => void;
    isMobile: boolean;
    onDetailsClick: (track: number, step: number, rect: DOMRect) => void;
    shiftDuration: number;
    onShiftDurationChange: (duration: number) => void;
}

export const Sequencer: React.FC<SequencerProps> = ({ steps, shiftSteps, stepCount, currentStep, currentShiftStep, oscColors, onStepClick, onStepToggle, onContextMenu, onClearTrack, onClearShift, onShiftChange, isMobile, onDetailsClick, shiftDuration, onShiftDurationChange }) => {
    const lastTap = useRef<{time: number, track: number, step: number} | null>(null);

    const handleStepTouchStart = (e: React.TouchEvent, track: number, step: number) => {
        const now = Date.now();
        if (lastTap.current && 
            lastTap.current.track === track && 
            lastTap.current.step === step && 
            now - lastTap.current.time < 300) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = {
                    ...e,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => {},
                    stopPropagation: () => {}
                } as unknown as React.MouseEvent;
                onContextMenu(mouseEvent, track, step);
                lastTap.current = null;
        } else {
            lastTap.current = { time: now, track, step };
        }
    };

    const ConfirmClearButton = ({ onConfirm, title }: { onConfirm: () => void, title: string }) => {
        const [isConfirming, setIsConfirming] = useState(false);
        const ref = useRef<HTMLDivElement>(null);
        
        useEffect(() => {
            const handleOutside = (e: MouseEvent) => {
                if (ref.current && !ref.current.contains(e.target as Node)) {
                    setIsConfirming(false);
                }
            }
            if (isConfirming) window.addEventListener('click', handleOutside);
            return () => window.removeEventListener('click', handleOutside);
        }, [isConfirming]);

        if (isConfirming) {
             return (
                 <div ref={ref} className="w-6 flex-none relative h-full z-50">
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gray-800 flex items-center justify-evenly rounded border border-gray-600 shadow-xl">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsConfirming(false); }} 
                            className="text-gray-400 hover:text-white flex items-center justify-center h-full w-1/2"
                        >
                            <X size={12} />
                        </button>
                        <div className="w-px h-3 bg-gray-600"></div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onConfirm(); setIsConfirming(false); }} 
                            className="text-red-500 hover:text-red-400 flex items-center justify-center h-full w-1/2"
                        >
                            <Check size={14} strokeWidth={3} />
                        </button>
                    </div>
                 </div>
             )
        }

        return (
             <button 
                onClick={(e) => { e.stopPropagation(); setIsConfirming(true); }} 
                className="w-6 flex-none flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-400 rounded transition-colors"
                title={title}
            >
                <X size={12} />
            </button>
        );
    }
  
    const renderStep = (track: SequencerTrack, stepIndex: number, trackIndex: number) => {
        const stepData = track[stepIndex];
        const hasNotes = stepData?.notes.length > 0;
        const isEnabled = stepData?.enabled;
        const isCurrent = currentStep === stepIndex;
        const isBeat = stepIndex % 4 === 0;
  
        const avgVelocity = hasNotes ? stepData.notes.reduce((sum, note) => sum + note.velocity, 0) / stepData.notes.length : 0;
        const probability = stepData.probability ?? 1.0;
    
        const oscOnBg = oscColors[trackIndex];
        const defaultBg = isBeat ? '#222' : '#181818';
    
        const getBackgroundColor = () => {
          if (hasNotes) {
              return hexToRgba(oscOnBg, 0.4 + avgVelocity * 0.6);
          }
          return defaultBg;
        };
        
        const stepRoundingClass = isMobile ? 'rounded' : 'rounded-lg';
        const baseButtonStyles = 'flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-accent';
        
        // Detect Chord Name if not provided
        let displayChord = stepData.chordName;
        if (!displayChord && hasNotes) {
            displayChord = detectChord(stepData.notes) || undefined;
        }
  
        return (
          <div 
              key={stepIndex} 
              className={`flex-1 min-w-0 h-full ${stepRoundingClass} relative overflow-hidden flex flex-col transition-shadow duration-100 shadow-md ${!isEnabled ? 'opacity-50' : ''}`}
              onContextMenu={(e) => onContextMenu(e, trackIndex, stepIndex)}
              onTouchStart={(e) => handleStepTouchStart(e, trackIndex, stepIndex)}
              style={{ backgroundColor: getBackgroundColor() }}
          >
              {isCurrent && (
                  <div className="absolute inset-0 bg-white/20 pointer-events-none" />
              )}
              <button
                  onClick={(e) => onStepClick(trackIndex, stepIndex, e.currentTarget.getBoundingClientRect())}
                  aria-label="Edit notes"
                  className={`w-full h-1/2 relative flex flex-col items-center justify-center p-0.5 font-mono hover:bg-black/10 ${baseButtonStyles}`}
              >
                  {hasNotes ? (
                      <>
                        {displayChord ? (
                             <>
                                <span className="text-white/60 text-[9px] leading-none truncate max-w-full mb-1">
                                    {stepData.notes.map(noteToString).join(' ')}
                                </span>
                                <span className="text-white font-bold text-[13px] leading-none truncate max-w-full drop-shadow-sm bg-black/40 rounded px-[6px] pt-[6px] pb-[4px]">
                                    {displayChord}
                                </span>
                             </>
                        ) : (
                            <span className="text-white/90 text-xs leading-tight break-all text-center">
                                {stepData.notes.map(noteToString).join(' ')}
                            </span>
                        )}
                      </>
                  ) : null}

                  {probability < 1.0 && (
                      <span className="absolute top-0.5 right-1.5 text-white/70 text-[10px] font-mono pointer-events-none z-10">
                          {`${(probability * 100).toFixed(0)}%`}
                      </span>
                  )}
                  {hasNotes && (
                      <div
                          className="absolute right-0 bottom-0 w-[3px] pointer-events-none"
                          style={{
                              height: `${avgVelocity * 100}%`,
                              backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          }}
                      />
                  )}
              </button>
              
              <div className="h-1/2 w-full flex">
                  <button
                      onClick={() => onStepToggle(trackIndex, stepIndex)}
                      aria-label={isEnabled ? "Disable step" : "Enable step"}
                      className={`w-1/2 h-full hover:bg-black/20 ${baseButtonStyles}`}
                      onTouchStart={(e) => e.stopPropagation()} 
                  >
                     <div className={`w-3 h-3 rounded-full transition-colors ${isEnabled ? 'bg-gray-300' : 'bg-gray-700 ring-2 ring-gray-600'}`}/>
                  </button>
                  <button
                      onClick={(e) => {
                          e.stopPropagation();
                          onDetailsClick(trackIndex, stepIndex, e.currentTarget.getBoundingClientRect());
                      }}
                      aria-label="Edit step details"
                      className={`w-1/2 h-full hover:bg-black/20 ${baseButtonStyles}`}
                      onTouchStart={(e) => e.stopPropagation()}
                  >
                      <SlidersHorizontal size={isMobile ? 14 : 16} className="text-gray-400" />
                  </button>
              </div>
          </div>
        );
    };

    const renderShiftStep = (stepIndex: number) => {
        const isCurrent = currentShiftStep === stepIndex;
        const shiftVal = shiftSteps[stepIndex];
        
        let bg = '#000000';
        let textColor = '#ffffff';

        if (shiftVal !== 0) {
            const norm = (shiftVal + 9) / 18; 
            const lightness = 15 + (norm * 75); 
            const saturation = 90 - (norm * 40);
            
            bg = `hsl(270, ${saturation}%, ${lightness}%)`;
            textColor = lightness > 50 ? '#000' : '#fff';
        }
        
        return (
            <div key={stepIndex} className={`flex-1 min-w-0 h-full ${isMobile ? 'rounded' : 'rounded-lg'} bg-[#1a1a1a] flex flex-col items-stretch justify-between relative shadow-sm overflow-hidden group`}>
                {isCurrent && (
                  <div className="absolute inset-0 border-2 border-purple-400/50 rounded-lg pointer-events-none z-20" />
                )}
                
                <button 
                    className="flex-1 flex items-center justify-center hover:bg-white/10 text-gray-500 hover:text-white transition-colors active:bg-white/20 focus:outline-none"
                    onClick={() => onShiftChange(stepIndex, Math.min(9, shiftVal + 1))}
                >
                    <ChevronUp size={14} />
                </button>
                
                <div 
                    className="flex-1 mx-0.5 rounded-sm flex items-center justify-center text-sm md:text-xl font-bold font-mono select-none shadow-inner leading-none"
                    style={{ backgroundColor: bg, color: textColor }}
                >
                    {shiftVal > 0 ? `+${shiftVal}` : shiftVal}
                </div>

                <button 
                    className="flex-1 flex items-center justify-center hover:bg-white/10 text-gray-500 hover:text-white transition-colors active:bg-white/20 focus:outline-none"
                    onClick={() => onShiftChange(stepIndex, Math.max(-9, shiftVal - 1))}
                >
                    <ChevronDown size={14} />
                </button>
            </div>
        )
    };
  
    const durationOptions = [1, 2, 4, 16, 32];

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-panel-bg">
        <div className="flex-1 flex flex-col min-h-0 bg-[#121212] overflow-hidden relative">

          <div className={`flex-1 flex flex-col px-4 pb-4 pt-2 gap-2 overflow-y-auto ${!isMobile ? 'min-w-[800px]' : 'pb-4'}`}>
            {steps.map((track, trackIndex) => {
              if (isMobile) {
                return (
                  <div key={trackIndex} className="flex flex-1 min-h-0 gap-1 pb-1 mb-1">
                    <div className="flex flex-col flex-1 gap-1 min-h-0">
                        <div className="flex flex-1 gap-1 min-h-0">
                            {Array.from({ length: 8 }).map((_, i) => renderStep(track, i, trackIndex))}
                        </div>
                        <div className="flex flex-1 gap-1 min-h-0">
                            {Array.from({ length: 8 }).map((_, i) => renderStep(track, i + 8, trackIndex))}
                        </div>
                    </div>
                    <ConfirmClearButton onConfirm={() => onClearTrack(trackIndex)} title="Clear Track" />
                  </div>
                );
              }
              return (
                <div key={trackIndex} className="flex gap-1 flex-1 min-h-0 basis-0">
                  {Array.from({ length: stepCount }).map((_, stepIndex) => renderStep(track, stepIndex, trackIndex))}
                  <ConfirmClearButton onConfirm={() => onClearTrack(trackIndex)} title="Clear Track" />
                </div>
              );
            })}

            {/* Shift Lane */}
            <div className={`flex flex-col flex-1 gap-1 mt-2 pt-2 ${isMobile ? 'min-h-[200px]' : 'min-h-0'}`}>
                 <div className="flex items-center gap-4 px-1 mb-1">
                     <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
                        <MoveUpRight size={12} /> Shift (Circle of 5ths)
                     </div>
                     <div className="flex items-center gap-1">
                         {durationOptions.map(dur => (
                             <button
                                key={dur}
                                onClick={() => onShiftDurationChange(dur)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                                    shiftDuration === dur 
                                    ? 'bg-purple-600 text-white shadow-sm' 
                                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                                }`}
                             >
                                {dur}B
                             </button>
                         ))}
                     </div>
                 </div>
                 {isMobile ? (
                     <div className="flex flex-1 min-h-0 gap-1">
                        <div className="flex flex-col flex-1 gap-1 min-h-0">
                            <div className="flex flex-1 gap-1 min-h-0">
                                {Array.from({ length: 8 }).map((_, i) => renderShiftStep(i))}
                            </div>
                            <div className="flex flex-1 gap-1 min-h-0">
                                {Array.from({ length: 8 }).map((_, i) => renderShiftStep(i + 8))}
                            </div>
                        </div>
                        <ConfirmClearButton onConfirm={onClearShift} title="Clear Shift Lane" />
                     </div>
                 ) : (
                     <div className="flex gap-1 flex-1 min-h-0 basis-0 h-16">
                         {Array.from({ length: stepCount }).map((_, stepIndex) => renderShiftStep(stepIndex))}
                         <ConfirmClearButton onConfirm={onClearShift} title="Clear Shift Lane" />
                     </div>
                 )}
            </div>
          </div>
        </div>
      </div>
    );
};

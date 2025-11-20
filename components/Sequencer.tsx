import React, { useRef } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { Panel } from './ui/Panel';
import { noteToString, hexToRgba } from '../utils';
import { SequencerTrack } from '../types';

interface SequencerProps {
    steps: SequencerTrack[];
    stepCount: number;
    currentStep: number;
    oscColors: string[];
    onStepClick: (track: number, step: number, rect: DOMRect) => void;
    onStepToggle: (track: number, step: number) => void;
    onContextMenu: (e: React.MouseEvent, track: number, step: number) => void;
    onClear: () => void;
    isMobile: boolean;
    onDetailsClick: (track: number, step: number, rect: DOMRect) => void;
}

export const Sequencer: React.FC<SequencerProps> = ({ steps, stepCount, currentStep, oscColors, onStepClick, onStepToggle, onContextMenu, onClear, isMobile, onDetailsClick }) => {
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

    const clearButton = (
      <button onClick={onClear} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-base md:text-xs">
        <X size={14} /> Clear
      </button>
    );
  
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
        const noteTextClass = isCurrent ? 'text-sm font-bold' : 'text-xs';
        const baseButtonStyles = 'flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-accent';
  
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
                  className={`w-full h-1/2 relative flex items-center justify-center p-1 font-mono hover:bg-black/10 ${baseButtonStyles}`}
              >
                  {hasNotes && (
                      <span className={`text-white/90 leading-tight break-all transition-all text-center ${noteTextClass}`}>
                          {stepData.notes.map(noteToString).join(' ')}
                      </span>
                  )}
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
              
              <div className="h-1/2 w-full flex border-t border-black/30">
                  <button
                      onClick={() => onStepToggle(trackIndex, stepIndex)}
                      aria-label={isEnabled ? "Disable step" : "Enable step"}
                      className={`w-1/2 h-full hover:bg-black/20 ${baseButtonStyles}`}
                      onTouchStart={(e) => e.stopPropagation()} 
                  >
                     <div className={`w-3 h-3 rounded-full transition-colors ${isEnabled ? 'bg-gray-300' : 'bg-gray-700 border-2 border-gray-600'}`}/>
                  </button>
                  <button
                      onClick={(e) => {
                          e.stopPropagation();
                          onDetailsClick(trackIndex, stepIndex, e.currentTarget.getBoundingClientRect());
                      }}
                      aria-label="Edit step details"
                      className={`w-1/2 h-full hover:bg-black/20 border-l border-black/30 ${baseButtonStyles}`}
                      onTouchStart={(e) => e.stopPropagation()}
                  >
                      <SlidersHorizontal size={isMobile ? 14 : 16} className="text-gray-400" />
                  </button>
              </div>
          </div>
        );
      };
  
    return (
      <Panel title="Sequencer" className="flex-1 flex flex-col min-h-0" headerControls={clearButton}>
        <div className="flex-1 flex flex-col min-h-0 bg-[#121212]">
          <div className={`flex-1 flex flex-col p-2 gap-2 overflow-y-auto ${!isMobile ? 'min-w-[800px]' : 'pb-4'}`}>
            {steps.map((track, trackIndex) => {
              if (isMobile) {
                // Mobile Layout: 2 rows of 8
                return (
                  <div key={trackIndex} className="flex flex-col flex-shrink-0 flex-grow gap-1 border-b border-gray-700/50 pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0" style={{ minHeight: '180px' }}>
                    <div className="flex flex-1 gap-1">
                        {Array.from({ length: 8 }).map((_, i) => renderStep(track, i, trackIndex))}
                    </div>
                    <div className="flex flex-1 gap-1">
                        {Array.from({ length: 8 }).map((_, i) => renderStep(track, i + 8, trackIndex))}
                    </div>
                  </div>
                );
              }
              // Desktop Layout: 1 row of 16
              return (
                <div key={trackIndex} className="flex gap-1 flex-shrink-0 flex-grow basis-0" style={{ minHeight: '120px' }}>
                  {Array.from({ length: stepCount }).map((_, stepIndex) => renderStep(track, stepIndex, trackIndex))}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    );
};
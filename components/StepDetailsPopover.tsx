import React from 'react';
import { VerticalSlider } from './ui/VerticalSlider';
import { SequencerStep } from '../types';
import { oscColors } from '../constants';

interface StepDetailsPopoverProps {
    stepData: SequencerStep;
    rect: DOMRect;
    onClose: () => void;
    onChange: (track: number, step: number, key: string, value: any) => void;
    trackIndex: number;
    stepIndex: number;
    isMobile: boolean;
}

export const StepDetailsPopover: React.FC<StepDetailsPopoverProps> = ({ stepData, rect, onClose, onChange, trackIndex, stepIndex, isMobile }) => {
    let top, left, transform;

    if (isMobile) {
        top = '50%';
        left = '50%';
        transform = 'translate(-50%, -50%)';
    } else {
        const componentWidth = 150;
        const componentHeight = 220;
        const windowWidth = window.innerWidth;

        let topPos = rect.top - componentHeight - 10;
        if (topPos < 10) { topPos = rect.bottom + 10; }

        let leftPos = rect.left + rect.width / 2 - componentWidth / 2;
        if (leftPos < 10) leftPos = 10;
        if (leftPos + componentWidth > windowWidth - 10) { leftPos = windowWidth - componentWidth - 10; }
        
        top = `${topPos}px`;
        left = `${leftPos}px`;
        transform = 'none';
    }
    
    const avgVelocity = stepData.notes.length > 0
        ? stepData.notes.reduce((sum, note) => sum + note.velocity, 0) / stepData.notes.length
        : 0.8;
        
    const oscColor = oscColors[trackIndex];

    return (
        <div 
            className="fixed inset-0 z-[1003] bg-black/50 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <div 
                className="absolute bg-panel-bg rounded-xl p-4 flex flex-col gap-2 shadow-2xl"
                style={{ top, left, transform, width: `150px`, height: `220px` }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex justify-around items-center h-full">
                    <VerticalSlider 
                        label="Velocity"
                        value={avgVelocity}
                        onChange={(v) => onChange(trackIndex, stepIndex, 'velocity', v)}
                        color={oscColor}
                    />
                     <VerticalSlider 
                        label="Probability"
                        value={stepData.probability ?? 1.0}
                        onChange={(v) => onChange(trackIndex, stepIndex, 'probability', v)}
                        color={oscColor}
                    />
                </div>
            </div>
        </div>
    );
};

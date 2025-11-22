

import React from 'react';
import { OscillatorPanel } from './OscillatorPanel';
import { oscColors } from '../constants';
import { OscillatorSettings, ADSRSettings } from '../types';

interface SynthsProps {
    oscillators: OscillatorSettings[];
    onOscChange: (index: number, key: keyof OscillatorSettings | 'filter' | 'sends', value: any) => void;
    onADSRChange: (index: number, key: keyof ADSRSettings, value: number) => void;
    activeArps?: number[];
}

export const Synths: React.FC<SynthsProps> = ({ oscillators, onOscChange, onADSRChange, activeArps = [] }) => {
  return (
    <div className="h-full w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {oscillators.map((osc, i) => (
        <div 
            key={osc.id} 
            className="flex-grow flex flex-col min-w-0"
            style={{ zIndex: oscillators.length - i }}
        >
          <OscillatorPanel
            settings={osc}
            onOscChange={(key, value) => onOscChange(i, key, value)}
            onADSRChange={(key, value) => onADSRChange(i, key, value)}
            color={oscColors[i]}
            isArpTriggered={activeArps.includes(i)}
          />
        </div>
      ))}
    </div>
  );
};
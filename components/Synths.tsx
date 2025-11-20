import React from 'react';
import { Panel } from './ui/Panel';
import { OscillatorPanel } from './OscillatorPanel';
import { oscColors } from '../constants';
import { OscillatorSettings, ADSRSettings } from '../types';

interface SynthsProps {
    oscillators: OscillatorSettings[];
    onOscChange: (index: number, key: keyof OscillatorSettings | 'filter' | 'sends', value: any) => void;
    onADSRChange: (index: number, key: keyof ADSRSettings, value: number) => void;
}

export const Synths: React.FC<SynthsProps> = ({ oscillators, onOscChange, onADSRChange }) => {
  return (
    <Panel title="Synths" className="flex-grow">
      <div className="h-full flex flex-col md:flex-row justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 h-full w-full">
          {oscillators.map((osc, i) => (
            <div key={osc.id} className="border-b md:border-b-0 md:border-r border-gray-800 last:border-r-0 last:border-b-0 flex-grow flex flex-col">
              <OscillatorPanel
                settings={osc}
                onOscChange={(key, value) => onOscChange(i, key, value)}
                onADSRChange={(key, value) => onADSRChange(i, key, value)}
                color={oscColors[i]}
              />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

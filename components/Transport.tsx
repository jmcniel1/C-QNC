import React from 'react';
import { Play, Pause, StopCircle } from 'lucide-react';
import { Panel } from './ui/Panel';
import { Knob } from './ui/Knob';
import { Toggle } from './ui/Toggle';
import { Oscilloscope } from './Oscilloscope';
import { TransportState } from '../types';

interface TransportProps {
    settings: TransportState;
    onChange: (key: keyof TransportState, value: any) => void;
    isScrolled: boolean;
    isMobile: boolean;
    analysers: React.MutableRefObject<AnalyserNode[]>;
}

export const Transport: React.FC<TransportProps> = ({ settings, onChange, isScrolled, isMobile = false, analysers }) => {
  return (
    <Panel 
        title={null}
        className={`h-auto md:h-14 sticky top-0 z-50 bg-panel-bg transition-all duration-300 ease-in-out flex-none ${isScrolled ? 'md:h-12' : ''}`}
    >
      <div className="flex flex-col md:flex-row items-stretch justify-between h-full w-full">
        <div className="flex flex-grow md:w-1/3 border-b md:border-b-0 md:border-r border-gray-800 relative overflow-hidden min-h-[48px] md:min-h-0">
            <Oscilloscope analysers={analysers} />
            <div className="absolute inset-0 flex z-10">
                <button 
                    onClick={() => onChange('isPlaying', !settings.isPlaying)}
                    className="flex-grow flex items-center justify-center transition-colors bg-transparent hover:bg-white/10"
                    aria-label={settings.isPlaying ? "Pause" : "Play"}
                >
                    {settings.isPlaying ? <Pause size={20} className="text-primary-accent" /> : <Play size={20} />}
                </button>
                 <button 
                    onClick={() => onChange('isPlaying', false)}
                    className="flex-grow flex items-center justify-center bg-transparent hover:bg-white/10 transition-colors"
                    aria-label="Stop"
                >
                    <StopCircle size={20} />
                </button>
            </div>
        </div>
        <div className={`flex justify-around items-center md:w-2/3 flex-grow px-2 py-1 md:py-0 border-b md:border-b-0 md:border-r-0 border-gray-800`}>
          <Knob
            label="Bpm"
            value={settings.bpm}
            onChange={(val) => onChange('bpm', val)}
            min={40}
            max={300}
            step={1}
            color="#333"
            dotColor="white"
            size={isMobile ? 28 : (isScrolled ? 20 : 24)}
            layout="horizontal"
            precision={0}
            textSize="text-sm md:text-[10px]"
          />
          <Knob 
            label="Mains" 
            value={settings.masterVolume} 
            onChange={(v) => onChange('masterVolume', v)}
            min={0}
            max={1}
            step={0.01}
            color="#333"
            dotColor="white"
            size={isMobile ? 28 : (isScrolled ? 20 : 24)}
            layout="horizontal"
            textSize="text-sm md:text-[10px]"
          />
           <Knob 
            label="Swing" 
            value={settings.swing} 
            onChange={(v) => onChange('swing', v)}
            min={0}
            max={100}
            step={1}
            color="#333"
            dotColor="white"
            size={isMobile ? 28 : (isScrolled ? 20 : 24)}
            layout="horizontal"
            precision={0}
            textSize="text-sm md:text-[10px]"
          />
        </div>
        <div className={`flex flex-col justify-around md:w-1/4 flex-grow px-4 py-1 text-base md:text-xs border-l border-gray-800`}>
            <Toggle label="Metronome" checked={settings.metronomeOn} onChange={(v) => onChange('metronomeOn', v)} />
        </div>
      </div>
    </Panel>
  );
};

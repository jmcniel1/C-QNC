import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Knob } from './ui/Knob';
import { ADSR } from './ADSR';
import { OscillatorSettings, ADSRSettings } from '../types';

interface OscillatorPanelProps {
    settings: OscillatorSettings;
    onOscChange: (key: keyof OscillatorSettings | 'filter' | 'sends', value: any) => void;
    onADSRChange: (key: keyof ADSRSettings, value: number) => void;
    color: string;
}

export const OscillatorPanel: React.FC<OscillatorPanelProps> = ({ settings, onOscChange, onADSRChange, color }) => {
  const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
  return (
    <div className="flex flex-col h-full flex-grow">
      <div className="p-2 space-y-2">
        <h3 className="text-gray-400 font-semibold">Osc {settings.id}</h3>
        <div className="grid grid-cols-2 gap-1">
          {waveforms.map((wave) => (
            <button
              key={wave}
              onClick={() => onOscChange('wave', wave)}
              className={`px-2 py-1 text-base md:text-sm transition-colors rounded-full font-medium ${
                settings.wave !== wave ? 'bg-fader-bg hover:bg-gray-700' : ''
              }`}
              style={settings.wave === wave ? { backgroundColor: color, color: 'white' } : {}}
            >
              {wave.charAt(0).toUpperCase() + wave.slice(1,3)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex justify-around items-center flex-grow p-2 border-b border-gray-800">
          <Knob
            label="Vol"
            value={settings.vol}
            onChange={(v) => onOscChange('vol', v)}
            min={0}
            max={1}
            step={0.01}
            color="#444"
            dotColor="white"
          />
          <Knob label="Octave" value={settings.octave} onChange={v => onOscChange('octave', v)} min={-4} max={4} step={1} color="#444" dotColor="white" precision={0} dragSensitivity={0.05} />
          <div className="flex flex-col space-y-1 items-center text-center" style={{ width: '60px' }}>
            <button 
              onClick={() => onOscChange('muted', !settings.muted)} 
              className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-colors ${settings.muted ? 'bg-red-700/50' : 'bg-fader-bg'}`}
              aria-label={settings.muted ? "Unmute Oscillator" : "Mute Oscillator"}
            >
              {settings.muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
            </button>
            <div>
              <label className="text-base md:text-xs text-gray-400">Mute</label>
              <span className="block text-base md:text-sm font-medium invisible">0</span>
            </div>
          </div>
      </div>
      
      <div className="flex flex-col space-y-2 py-2 px-1 border-b border-gray-800">
        <h4 className="text-center text-gray-500 text-xs uppercase font-semibold tracking-wider">FX Sends</h4>
        <div className="flex justify-around items-center text-sm">
            <Knob label="Delay" value={settings.sends.delay} onChange={v => onOscChange('sends', {...settings.sends, delay: v})} min={0} max={1} step={0.01} color="#444" dotColor="white" size={40} />
            <Knob label="Disto" value={settings.sends.disto} onChange={v => onOscChange('sends', {...settings.sends, disto: v})} min={0} max={1} step={0.01} color="#444" dotColor="white" size={40} />
            <Knob label="Reverb" value={settings.sends.reverb} onChange={v => onOscChange('sends', {...settings.sends, reverb: v})} min={0} max={1} step={0.01} color="#444" dotColor="white" size={40} />
            <div className="flex flex-col space-y-1" style={{width: 100}}>
              <Knob 
                label="Freq"
                value={settings.filter.freq}
                onChange={(v) => onOscChange('filter', { ...settings.filter, freq: v })}
                min={20}
                max={20000}
                logarithmic
                color="#444"
                dotColor="white"
                size={36}
                layout="horizontal"
                precision={0}
              />
              <Knob 
                label="Res"
                value={settings.filter.res}
                onChange={(v) => onOscChange('filter', { ...settings.filter, res: v })}
                min={0}
                max={1}
                step={0.01}
                color="#444"
                dotColor="white"
                size={36}
                layout="horizontal"
              />
            </div>
        </div>
      </div>

      <div className="flex-grow-[3] flex flex-col min-h-[150px]">
        <ADSR settings={settings.adsr} onChange={onADSRChange} color={color} />
      </div>
    </div>
  );
};

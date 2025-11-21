
import React from 'react';
import { Volume2, VolumeX, Minus, Plus } from 'lucide-react';
import { Knob } from './ui/Knob';
import { ADSR } from './ADSR';
import { OscillatorSettings, ADSRSettings } from '../types';
import { PRESETS } from '../constants';

interface OscillatorPanelProps {
    settings: OscillatorSettings;
    onOscChange: (key: keyof OscillatorSettings | 'filter' | 'sends', value: any) => void;
    onADSRChange: (key: keyof ADSRSettings, value: number) => void;
    color: string;
}

const WaveIcon = ({ type }: { type: string }) => {
  const props: React.SVGProps<SVGSVGElement> = { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case 'sine': return <svg {...props}><path d="M2 12Q7 2 12 12Q17 22 22 12" /></svg>;
    case 'square': return <svg {...props}><path d="M3 17V7H12V17H21" /></svg>;
    case 'sawtooth': return <svg {...props}><path d="M2 17L22 7V17" /></svg>;
    case 'triangle': return <svg {...props}><path d="M3 17L12 6L21 17" /></svg>;
    default: return null;
  }
}

export const OscillatorPanel: React.FC<OscillatorPanelProps> = ({ settings, onOscChange, onADSRChange, color }) => {
  const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
  const controlSize = 50;
  
  return (
    <div className="flex flex-col h-full flex-grow">
      <div className="p-2 border-b border-gray-800 flex items-center gap-3">
        <h3 className="text-gray-400 font-semibold text-sm uppercase tracking-wider pl-1 shrink-0">O{settings.id}</h3>
        
        <div className="flex items-center gap-2">
            <div className="relative h-9 bg-black/40 rounded-lg flex items-center min-w-[80px]">
                <select
                    onChange={(e) => {
                        const preset = PRESETS.find(p => p.name === e.target.value);
                        if (preset) {
                            onOscChange('wave', preset.settings.wave);
                            onOscChange('octave', preset.settings.octave);
                            onOscChange('vol', preset.settings.vol);
                            onOscChange('adsr', preset.settings.adsr);
                            onOscChange('filter', preset.settings.filter);
                        }
                    }}
                    className="bg-transparent text-[11px] font-medium text-gray-300 w-full h-full rounded-lg pl-3 pr-7 focus:outline-none hover:text-white transition-colors appearance-none cursor-pointer border-none"
                    defaultValue=""
                >
                    <option value="" disabled hidden>Tone</option>
                    {PRESETS.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>

            <div className="flex bg-black/40 rounded-lg p-1 gap-0.5 h-9 items-center">
            {waveforms.map((wave) => (
                <button
                key={wave}
                onClick={() => onOscChange('wave', wave)}
                className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
                    settings.wave === wave ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
                style={settings.wave === wave ? { backgroundColor: color, color: 'white' } : {}}
                title={wave.charAt(0).toUpperCase() + wave.slice(1)}
                >
                <WaveIcon type={wave} />
                </button>
            ))}
            </div>
        </div>
      </div>
      
      <div className="flex justify-around items-start flex-grow p-4 border-b border-gray-800">
          <Knob
            label="Vol"
            value={settings.vol}
            onChange={(v) => onOscChange('vol', v)}
            min={0}
            max={1}
            step={0.01}
            color="#444"
            dotColor="white"
            size={controlSize}
          />
          
          <div className="flex flex-col items-center gap-1">
                <div 
                  className="flex flex-col items-center bg-black/20 rounded-lg border border-gray-700/50 overflow-hidden"
                  style={{ height: `${controlSize}px`, width: '36px' }}
                >
                    <button 
                        onClick={() => onOscChange('octave', Math.min(4, settings.octave + 1))}
                        className="flex-1 w-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        disabled={settings.octave >= 4}
                    >
                        <Plus size={12} />
                    </button>
                    <div className="w-full py-[1px] text-center font-mono font-bold text-[10px] text-white bg-black/40">
                        {settings.octave > 0 ? `+${settings.octave}` : settings.octave}
                    </div>
                    <button 
                        onClick={() => onOscChange('octave', Math.max(-4, settings.octave - 1))}
                        className="flex-1 w-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        disabled={settings.octave <= -4}
                    >
                        <Minus size={12} />
                    </button>
                </div>
                <label className="text-base md:text-xs text-gray-400">Octave</label>
           </div>

          <div className="flex flex-col space-y-1 items-center text-center">
            <button 
              onClick={() => onOscChange('muted', !settings.muted)} 
              className={`rounded-full flex items-center justify-center transition-colors ${settings.muted ? 'bg-red-700/50' : 'bg-fader-bg'}`}
              style={{ width: `${controlSize}px`, height: `${controlSize}px` }}
              aria-label={settings.muted ? "Unmute Oscillator" : "Mute Oscillator"}
            >
              {settings.muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
            <div>
              <label className="text-base md:text-xs text-gray-400">Mute</label>
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

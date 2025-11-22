

import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Minus, Plus, ArrowUp, ArrowDown, Shuffle, Sparkles } from 'lucide-react';
import { Knob } from './ui/Knob';
import { ADSR } from './ADSR';
import { OscillatorSettings, ADSRSettings, ArpMode } from '../types';
import { PRESETS } from '../constants';
import { hexToRgba } from '../utils';

interface OscillatorPanelProps {
    settings: OscillatorSettings;
    onOscChange: (key: keyof OscillatorSettings | 'filter' | 'sends', value: any) => void;
    onADSRChange: (key: keyof ADSRSettings, value: number) => void;
    color: string;
    isArpTriggered?: boolean;
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

const ArpModeIcon = ({ mode }: { mode: ArpMode }) => {
    const size = 14;
    switch (mode) {
        case 'up': return <ArrowUp size={size} strokeWidth={3} />;
        case 'down': return <ArrowDown size={size} strokeWidth={3} />;
        case 'random': return <Shuffle size={size} strokeWidth={3} />;
        case 'converge': return <Sparkles size={size} strokeWidth={3} />;
    }
};

export const OscillatorPanel: React.FC<OscillatorPanelProps> = ({ settings, onOscChange, onADSRChange, color, isArpTriggered }) => {
  const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
  const arpModes: ArpMode[] = ['up', 'down', 'random', 'converge'];
  const controlSize = 50;
  const arpButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
      if (isArpTriggered && arpButtonRef.current) {
          const btn = arpButtonRef.current;
          // Blink effect
          btn.style.backgroundColor = 'white';
          btn.style.color = color;
          setTimeout(() => {
              if (btn) {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'white';
              }
          }, 100);
      }
  }, [isArpTriggered, color]);
  
  const cycleArpMode = () => {
      const currentIndex = arpModes.indexOf(settings.arpMode);
      const nextIndex = (currentIndex + 1) % arpModes.length;
      onOscChange('arpMode', arpModes[nextIndex]);
  };
  
  return (
    <div 
        className="flex flex-col h-full flex-grow transition-colors rounded-xl overflow-hidden"
        style={{ backgroundColor: hexToRgba(color, 0.06) }}
    >
      <div className="p-2 border-b border-gray-800 flex-grow-0">
        <div className="flex justify-between items-center w-full gap-2">
             <div className="relative h-9 bg-black/40 rounded-lg flex items-center flex-grow max-w-[120px]">
                <span className="absolute left-3 text-gray-500 font-bold text-sm">O{settings.id}</span>
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
                    className="bg-transparent text-[13px] font-medium text-gray-300 w-full h-full rounded-lg pl-8 pr-6 focus:outline-none hover:text-white transition-colors appearance-none cursor-pointer border-none truncate"
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
            color={color}
            dotColor="black"
            size={controlSize}
            textColor="text-white font-bold"
            textSize="text-sm"
          />
          
          <div className="flex flex-col items-center gap-1">
                <div 
                  className="flex flex-row items-center bg-black/20 rounded-lg overflow-hidden"
                  style={{ height: `36px`, width: 'auto' }}
                >
                    <button 
                        onClick={() => onOscChange('octave', Math.max(-4, settings.octave - 1))}
                        className="w-8 h-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        disabled={settings.octave <= -4}
                    >
                        <Minus size={12} />
                    </button>
                    <div className="w-8 h-full flex items-center justify-center font-mono font-bold text-[12px] text-white bg-black/40">
                        {settings.octave > 0 ? `+${settings.octave}` : settings.octave}
                    </div>
                    <button 
                        onClick={() => onOscChange('octave', Math.min(4, settings.octave + 1))}
                        className="w-8 h-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        disabled={settings.octave >= 4}
                    >
                        <Plus size={12} />
                    </button>
                </div>
                <label className="text-sm font-bold text-white">Octave</label>
           </div>

           <Knob
            label="Hold"
            value={settings.hold}
            onChange={(v) => onOscChange('hold', v)}
            min={1}
            max={16}
            step={1}
            color={color}
            dotColor="black"
            size={controlSize}
            textColor="text-white font-bold"
            textSize="text-sm"
            precision={0}
          />

          {/* NEW ARP CONTROLS */}
          <div className="flex flex-col items-center gap-1.5 pt-0.5">
              <div className="flex items-center gap-1">
                  {/* Tiny Vertical Toggle */}
                  <button 
                    onClick={() => onOscChange('arp', !settings.arp)}
                    className={`w-4 h-9 rounded-full p-0.5 transition-colors relative flex flex-col items-center justify-between border border-white/10 ${settings.arp ? '' : 'bg-black/40'}`}
                    style={{ backgroundColor: settings.arp ? color : undefined }}
                    title="Arp Toggle"
                  >
                      <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all duration-200 ${settings.arp ? 'mt-0' : 'mt-[1.2rem]'}`} />
                  </button>

                  {/* Tiny Mode Button */}
                  <button
                    ref={arpButtonRef}
                    onClick={cycleArpMode}
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-black/40 hover:bg-white/10 border border-white/10 text-white transition-all duration-75"
                    title={`Arp Mode: ${settings.arpMode}`}
                  >
                     <ArpModeIcon mode={settings.arpMode} />
                  </button>
              </div>
              <label className="text-sm font-bold text-white">A</label>
          </div>

          <div className="flex flex-col space-y-1 items-center text-center">
            <button 
              onClick={() => onOscChange('muted', !settings.muted)} 
              className={`rounded-full flex items-center justify-center transition-colors ${settings.muted ? 'text-white' : 'bg-black text-gray-400 hover:text-gray-200'}`}
              style={{ 
                  width: `${controlSize}px`, 
                  height: `${controlSize}px`,
                  backgroundColor: settings.muted ? color : 'black' 
              }}
              aria-label={settings.muted ? "Unmute Oscillator" : "Mute Oscillator"}
            >
              {settings.muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
            <div>
              <label className="text-sm font-bold text-white">Mute</label>
            </div>
          </div>
      </div>
      
      <div className="flex flex-col space-y-2 py-2 px-1 border-b border-gray-800">
        <h4 className="text-center text-white text-[10px] uppercase font-semibold tracking-wider">FX Sends</h4>
        <div className="flex justify-around items-center text-sm">
            <Knob label="Delay" value={settings.sends.delay} onChange={v => onOscChange('sends', {...settings.sends, delay: v})} min={0} max={1} step={0.01} color={color} dotColor="black" size={40} textColor="text-white" textSize="text-xs" />
            <Knob label="Disto" value={settings.sends.disto} onChange={v => onOscChange('sends', {...settings.sends, disto: v})} min={0} max={1} step={0.01} color={color} dotColor="black" size={40} textColor="text-white" textSize="text-xs" />
            <Knob label="Reverb" value={settings.sends.reverb} onChange={v => onOscChange('sends', {...settings.sends, reverb: v})} min={0} max={1} step={0.01} color={color} dotColor="black" size={40} textColor="text-white" textSize="text-xs" />
            <div className="flex flex-col space-y-1" style={{width: 100}}>
              <Knob 
                label="Freq"
                value={settings.filter.freq}
                onChange={(v) => onOscChange('filter', { ...settings.filter, freq: v })}
                min={20}
                max={20000}
                logarithmic
                color={color}
                dotColor="black"
                size={36}
                layout="horizontal"
                precision={0}
                textColor="text-white" 
                textSize="text-xs"
              />
              <Knob 
                label="Res"
                value={settings.filter.res}
                onChange={(v) => onOscChange('filter', { ...settings.filter, res: v })}
                min={0}
                max={1}
                step={0.01}
                color={color}
                dotColor="black"
                size={36}
                layout="horizontal"
                textColor="text-white" 
                textSize="text-xs"
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

import React, { useRef } from 'react';
import { Play, Pause, Cable, Save, Upload } from 'lucide-react';
import { Panel } from './ui/Panel';
import { Knob } from './ui/Knob';
import { Oscilloscope } from './Oscilloscope';
import { TransportState } from '../types';

interface TransportProps {
    settings: TransportState;
    onChange: (key: keyof TransportState, value: any) => void;
    onSave: () => void;
    onLoad: (file: File) => void;
    isScrolled: boolean;
    isMobile: boolean;
    analysers: React.MutableRefObject<AnalyserNode[]>;
}

export const Transport: React.FC<TransportProps> = ({ settings, onChange, onSave, onLoad, isScrolled, isMobile = false, analysers }) => {
  // Increased knob sizes by approx 20%
  const knobSize = isMobile ? 34 : (isScrolled ? 24 : 30);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          onLoad(e.target.files[0]);
      }
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

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
            </div>
        </div>
        <div className={`flex justify-around items-center md:w-2/3 flex-grow px-4 py-1 md:py-0 gap-2 md:gap-4`}>
          <Knob
            label={isMobile ? null : "Bpm"}
            centerLabel={isMobile ? "B" : undefined}
            value={settings.bpm}
            onChange={(val) => onChange('bpm', val)}
            min={40}
            max={300}
            step={1}
            color="#333"
            dotColor="white"
            size={knobSize}
            layout="horizontal"
            precision={0}
            textSize="text-sm md:text-[10px]"
          />
          <Knob 
            label={isMobile ? null : "Mains"} 
            centerLabel={isMobile ? "V" : undefined}
            value={settings.masterVolume} 
            onChange={(v) => onChange('masterVolume', v)}
            min={0}
            max={1}
            step={0.01}
            color="#333"
            dotColor="white"
            size={knobSize}
            layout="horizontal"
            textSize="text-sm md:text-[10px]"
          />
           <Knob 
            label={isMobile ? null : "Swing"}
            centerLabel={isMobile ? "S" : undefined}
            value={settings.swing} 
            onChange={(v) => onChange('swing', v)}
            min={0}
            max={100}
            step={1}
            color="#333"
            dotColor="white"
            size={knobSize}
            layout="horizontal"
            precision={0}
            textSize="text-sm md:text-[10px]"
          />
          <div className="flex gap-2 md:gap-4 items-center pb-1 md:pb-0 ml-1 md:ml-2">
              <div className="flex flex-row items-center gap-2">
                  <button
                      onClick={() => onChange('metronomeOn', !settings.metronomeOn)}
                      className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors`}
                      style={{ backgroundColor: settings.metronomeOn ? '#faa917' : '#333333' }}
                      aria-label="Metronome Toggle"
                      title="Metronome"
                    >
                      <div className={`w-2 h-2 rounded-full ${settings.metronomeOn ? 'bg-white' : 'bg-gray-500'}`} />
                  </button>
                  <span className="hidden md:block text-[10px] text-gray-500 font-semibold tracking-wider">CLICK</span>
              </div>
              <div className="flex flex-row items-center gap-2">
                  <button
                      onClick={() => onChange('midiClockOut', !settings.midiClockOut)}
                      className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors`}
                      style={{ backgroundColor: settings.midiClockOut ? '#1d4ed8' : '#333333' }}
                      aria-label="MIDI Clock Toggle"
                      title="Send MIDI Clock"
                    >
                      <Cable size={16} className={settings.midiClockOut ? 'text-white' : 'text-gray-500'} />
                  </button>
                  <span className="hidden md:block text-[10px] text-gray-500 font-semibold tracking-wider">MIDI</span>
              </div>
              
              {/* Divider */}
              <div className="w-px h-8 bg-gray-800 mx-1"></div>

              {/* Save / Load */}
              <div className="flex gap-2">
                  <button
                      onClick={onSave}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors bg-[#333333] hover:bg-gray-700 text-gray-500 hover:text-white"
                      title="Save Patch"
                  >
                      <Save size={16} />
                  </button>
                  
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".json" 
                      className="hidden" 
                  />
                  <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors bg-[#333333] hover:bg-gray-700 text-gray-500 hover:text-white"
                      title="Load Patch"
                  >
                      <Upload size={16} />
                  </button>
              </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};
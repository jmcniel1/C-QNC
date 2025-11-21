import React from 'react';
import { Zap, Activity, Hash } from 'lucide-react';
import { Knob } from '../ui/Knob';
import { DistortionSettings } from '../../types';

interface DistortionPanelProps {
    settings: DistortionSettings;
    onChange: (key: keyof DistortionSettings, value: any) => void;
}

export const DistortionPanel: React.FC<DistortionPanelProps> = ({ settings, onChange }) => {
  const models = [
      { id: 'fuzz', icon: Zap, label: 'Fuzz' },
      { id: 'overdrive', icon: Activity, label: 'Overdrive' },
      { id: 'crush', icon: Hash, label: 'Bitcrush' }
  ];
  const fxColor = '#ae2b27';

  return (
    <div className="flex flex-col justify-between h-auto md:h-full w-full">
      <h3 className="text-gray-400 p-2 flex items-center gap-1 font-semibold">
        <Zap size={14} /> Distortion
      </h3>
       <div className="flex-grow-0 md:flex-grow flex flex-row justify-center items-center gap-6 py-8 md:py-2 md:flex-col md:space-y-4 md:gap-0">
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Depth" value={settings.depth} onChange={v => onChange('depth', v)} min={0} max={1} step={0.01} color="#ae2b27" dotColor="white" responsive />
          </div>
      </div>
      <div className="p-2 border-t border-gray-800 mt-auto">
        <div className="flex justify-around gap-4">
            {models.map(({ id, icon: Icon, label }) => (
                <button key={id}
                    onClick={() => onChange('model', id)}
                    title={label}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                        settings.model !== id 
                        ? 'bg-fader-bg hover:bg-gray-700 text-gray-400' 
                        : 'text-white scale-110'
                    }`}
                    style={settings.model === id ? { backgroundColor: fxColor } : {}}
                >
                    <Icon size={20} strokeWidth={2.5} />
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

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
      <h3 
        className="p-2 font-thin text-3xl"
        style={{ color: fxColor }}
      >
        Distortion
      </h3>
       <div className="flex-grow-0 md:flex-grow flex flex-row justify-center items-center gap-6 py-8 md:py-2 md:flex-col md:space-y-4 md:gap-0">
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Depth" value={settings.depth} onChange={v => onChange('depth', v)} min={0} max={1} step={0.01} color="#ae2b27" dotColor="black" responsive textSize="text-xs" spacing="space-y-3" />
          </div>
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Level" value={settings.level ?? 0.8} onChange={v => onChange('level', v)} min={0} max={1} step={0.01} color="#ae2b27" dotColor="black" responsive textSize="text-xs" spacing="space-y-3" />
          </div>
      </div>
      <div className="p-2 mt-auto">
        <div className="flex w-full gap-2">
            {models.map(({ id, icon: Icon, label }) => (
                <button key={id}
                    onClick={() => onChange('model', id)}
                    title={label}
                    className={`flex-1 h-10 rounded-full flex items-center justify-center transition-all ${
                        settings.model !== id 
                        ? 'bg-black hover:bg-gray-700 text-gray-400' 
                        : 'text-white'
                    }`}
                    style={settings.model === id ? { backgroundColor: fxColor } : {}}
                >
                    <Icon size={18} strokeWidth={2.5} />
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

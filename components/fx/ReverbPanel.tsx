
import React from 'react';
import { Layers, Sparkles, Anchor } from 'lucide-react';
import { Knob } from '../ui/Knob';
import { ReverbSettings } from '../../types';

interface ReverbPanelProps {
    settings: ReverbSettings;
    onChange: (key: keyof ReverbSettings, value: any) => void;
}

export const ReverbPanel: React.FC<ReverbPanelProps> = ({ settings, onChange }) => {
  const models = [
      { id: 'block', icon: Layers, label: 'Block' },
      { id: 'swarm', icon: Sparkles, label: 'Swarm' },
      { id: 'abyss', icon: Anchor, label: 'Abyss' }
  ];
  const fxColor = '#4c4c4c';
  const activeIconColor = '#d69615';

  return (
    <div className="flex flex-col justify-between h-auto md:h-full w-full">
      <h3 
        className="p-2 font-thin text-3xl"
        style={{ color: '#9ca3af' }}
      >
          Reverb
      </h3>
      <div className="flex-grow-0 md:flex-grow flex flex-row justify-center items-center gap-6 py-8 md:py-2 md:flex-col md:space-y-4 md:gap-0">
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Time" value={settings.time} onChange={v => onChange('time', v)} min={0.1} max={10} step={0.1} color={fxColor} dotColor={activeIconColor} responsive precision={1} textSize="text-xs" spacing="space-y-3" />
          </div>
          <div className="w-[20%] md:w-[30%] shrink-0">
             <Knob label="Gain" centerLabel="G" value={settings.gain} onChange={v => onChange('gain', v)} min={0} max={3} step={0.1} color={fxColor} dotColor={activeIconColor} responsive size={28} textSize="text-xs" spacing="space-y-3" />
          </div>
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Depth" value={settings.depth} onChange={v => onChange('depth', v)} min={0} max={1} step={0.01} color={fxColor} dotColor={activeIconColor} responsive textSize="text-xs" spacing="space-y-3" />
          </div>
      </div>
      <div className="p-2 mt-auto">
        <div className="flex w-full gap-2">
            {models.map(({ id, icon: Icon, label }) => (
                <button key={id}
                    onClick={() => onChange('model', id)}
                    title={label}
                    className={`flex-1 h-[84px] rounded-full flex items-center justify-center transition-all ${
                        settings.model !== id 
                        ? 'bg-black hover:bg-gray-700 text-gray-400' 
                        : 'bg-[#4c4c4c] text-[#d69615]'
                    }`}
                    style={settings.model === id ? { backgroundColor: fxColor, color: activeIconColor } : {}}
                >
                    <Icon size={18} strokeWidth={2.5} />
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

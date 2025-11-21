import React from 'react';
import { Rotate3d, Box, Disc, Waves } from 'lucide-react';
import { Knob } from '../ui/Knob';
import { ReverbSettings } from '../../types';

interface ReverbPanelProps {
    settings: ReverbSettings;
    onChange: (key: keyof ReverbSettings, value: any) => void;
}

export const ReverbPanel: React.FC<ReverbPanelProps> = ({ settings, onChange }) => {
  const models = [
      { id: 'hall', icon: Waves, label: 'Hall' },
      { id: 'plate', icon: Disc, label: 'Plate' },
      { id: 'room', icon: Box, label: 'Room' }
  ];
  const fxColor = '#4b5563';
  const activeIconColor = '#f59e0b';

  return (
    <div className="flex flex-col justify-between h-auto md:h-full w-full">
      <h3 className="text-gray-400 p-2 flex items-center gap-1 font-semibold">
          <Rotate3d size={14} /> Reverb
      </h3>
      <div className="flex-grow-0 md:flex-grow flex flex-row justify-center items-center gap-6 py-8 md:py-2 md:flex-col md:space-y-4 md:gap-0">
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Decay" value={settings.decay} onChange={v => onChange('decay', v)} min={0.1} max={6} step={0.1} color="#4b5563" dotColor="#f59e0b" responsive precision={1} />
          </div>
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Predelay" value={settings.predelay} onChange={v => onChange('predelay', v)} min={0} max={1} step={0.01} color="#4b5563" dotColor="#f59e0b" responsive />
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
                        : 'scale-110'
                    }`}
                    style={settings.model === id ? { backgroundColor: fxColor, color: activeIconColor } : {}}
                >
                    <Icon size={20} strokeWidth={2.5} />
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};
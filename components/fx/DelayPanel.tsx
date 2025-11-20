import React from 'react';
import { Aperture } from 'lucide-react';
import { Knob } from '../ui/Knob';
import { DelaySettings } from '../../types';

interface DelayPanelProps {
    settings: DelaySettings;
    onChange: (key: keyof DelaySettings, value: any) => void;
}

export const DelayPanel: React.FC<DelayPanelProps> = ({ settings, onChange }) => {
  const divisions = ['Free', '1/2', '1/2d', '1/4', '1/8', '1/8d', '1/16', '1/16d'];
  const fxColor = '#f59e0b';

  return (
    <div className="flex flex-col justify-between h-auto md:h-full w-full">
      <h3 className="text-gray-400 p-2 flex items-center gap-1 font-semibold">
        <Aperture size={14} /> Delay
      </h3>
       <div className="flex-grow-0 md:flex-grow flex flex-row justify-center items-center gap-6 py-8 md:py-2 md:flex-col md:space-y-4 md:gap-0">
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Feedback" value={settings.feedback} onChange={v => onChange('feedback', v)} min={0} max={1} step={0.01} color="#f59e0b" dotColor="black" responsive />
          </div>
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob 
                label="Time" 
                value={settings.time} 
                onChange={v => {
                    onChange('time', v);
                    if (settings.division !== 'Free') onChange('division', 'Free');
                }}
                min={1} 
                max={2000} 
                step={1} 
                color="#f59e0b" 
                dotColor="black" 
                responsive
                precision={0}
            />
          </div>
      </div>
      <div className="space-y-2 p-2 border-t border-gray-800 mt-auto">
        <div className="grid grid-cols-4 gap-1">
            {divisions.map(div => (
                <button key={div}
                    onClick={() => onChange('division', div)}
                    className={`px-2 text-base md:text-sm transition-colors w-full rounded-lg font-medium h-[50px] flex items-center justify-center ${
                        settings.division !== div ? 'bg-fader-bg hover:bg-gray-700 text-white' : 'text-black'
                    }`}
                    style={settings.division === div ? { backgroundColor: fxColor } : {}}
                >
                    {div}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

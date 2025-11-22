
import React from 'react';
import { Knob } from '../ui/Knob';
import { DelaySettings } from '../../types';

interface DelayPanelProps {
    settings: DelaySettings;
    onChange: (key: keyof DelaySettings, value: any) => void;
}

export const DelayPanel: React.FC<DelayPanelProps> = ({ settings, onChange }) => {
  const divisions = [
      { val: '1/2', label: '2' },
      { val: '1/2d', label: '2d' },
      { val: '1/4', label: '4' },
      { val: '1/4d', label: '4d' },
      { val: '1/8', label: '8' },
      { val: '1/8d', label: '8d' },
      { val: '1/16', label: '16' },
      { val: '1/16d', label: '16d' }
  ];
  const fxColor = '#faa917';

  return (
    <div className="flex flex-col justify-between h-auto md:h-full w-full">
      <h3 className="text-white p-2 flex items-center gap-1 font-semibold">
        Delay
      </h3>
       <div className="flex-grow-0 md:flex-grow flex flex-row justify-center items-center gap-6 py-8 md:py-2 md:flex-col md:space-y-4 md:gap-0">
          <div className="w-[40%] md:w-[60%] shrink-0">
            <Knob label="Feedback" value={settings.feedback} onChange={v => onChange('feedback', v)} min={0} max={1} step={0.01} color={fxColor} dotColor="black" responsive />
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
                color={fxColor} 
                dotColor="black" 
                responsive
                precision={0}
            />
          </div>
      </div>
      <div className="space-y-2 p-2 mt-auto">
        <div className="grid grid-cols-4 gap-1">
            {divisions.map(({ val, label }) => (
                <button key={val}
                    onClick={() => onChange('division', val)}
                    className={`px-1 text-sm md:text-xs transition-colors w-full rounded-lg font-medium h-10 flex items-center justify-center ${
                        settings.division !== val ? 'bg-black hover:bg-gray-700 text-gray-400' : 'text-black font-bold'
                    }`}
                    style={settings.division === val ? { backgroundColor: fxColor } : {}}
                >
                    {label}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

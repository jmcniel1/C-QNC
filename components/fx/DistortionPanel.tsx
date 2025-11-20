import React from 'react';
import { Zap } from 'lucide-react';
import { Knob } from '../ui/Knob';
import { DistortionSettings } from '../../types';

interface DistortionPanelProps {
    settings: DistortionSettings;
    onChange: (key: keyof DistortionSettings, value: any) => void;
}

export const DistortionPanel: React.FC<DistortionPanelProps> = ({ settings, onChange }) => {
  const models = ['fuzz', 'overdrive', 'crush'];
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
      <div className="space-y-2 p-2 border-t border-gray-800 mt-auto">
        <div className="flex justify-around gap-1">
            {models.map(model => (
                <button key={model}
                    onClick={() => onChange('model', model)}
                    className={`px-2 text-base md:text-sm transition-colors w-full rounded-lg font-medium h-[50px] flex items-center justify-center ${
                        settings.model !== model ? 'bg-fader-bg hover:bg-gray-700 text-white' : 'text-white'
                    }`}
                    style={settings.model === model ? { backgroundColor: fxColor } : {}}
                >
                    {model.charAt(0).toUpperCase() + model.slice(1)}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

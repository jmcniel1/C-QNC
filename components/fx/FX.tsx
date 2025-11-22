
import React from 'react';
import { Panel } from '../ui/Panel';
import { DelayPanel } from './DelayPanel';
import { DistortionPanel } from './DistortionPanel';
import { ReverbPanel } from './ReverbPanel';
import { FXState } from '../../types';

interface FXProps {
    settings: FXState;
    onChange: (fx: keyof FXState, key: string, value: any) => void;
}

export const FX: React.FC<FXProps> = ({ settings, onChange }) => {
    return (
        <Panel className="flex-grow">
            <div className="h-auto md:h-full grid grid-cols-1 md:grid-cols-3 gap-2 p-2">
                <div className="rounded-xl overflow-hidden bg-amber-900/10">
                    <DelayPanel 
                        settings={settings.delay}
                        onChange={(k, v) => onChange('delay', k, v)}
                    />
                </div>
                <div className="rounded-xl overflow-hidden bg-red-900/10">
                    <DistortionPanel 
                        settings={settings.distortion} 
                        onChange={(k, v) => onChange('distortion', k, v)}
                    />
                </div>
                <div className="rounded-xl overflow-hidden bg-gray-800/30">
                    <ReverbPanel 
                        settings={settings.reverb} 
                        onChange={(k, v) => onChange('reverb', k, v)}
                    />
                </div>
            </div>
        </Panel>
    )
}

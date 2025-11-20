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
        <Panel title="FX" className="flex-grow">
            <div className="h-auto md:h-full grid grid-cols-1 md:grid-cols-3">
                <div className="border-b md:border-b-0 md:border-r border-gray-800">
                    <DelayPanel 
                        settings={settings.delay}
                        onChange={(k, v) => onChange('delay', k, v)}
                    />
                </div>
                <div className="border-b md:border-b-0 md:border-r border-gray-800">
                    <DistortionPanel 
                        settings={settings.distortion} 
                        onChange={(k, v) => onChange('distortion', k, v)}
                    />
                </div>
                <div className="border-b md:border-b-0 md:border-r border-gray-800">
                    <ReverbPanel 
                        settings={settings.reverb} 
                        onChange={(k, v) => onChange('reverb', k, v)}
                    />
                </div>
            </div>
        </Panel>
    )
}


import React, { useRef, useEffect, useCallback, useId } from 'react';
import { DraggableHandle } from './ui/DraggableHandle';
import { ADSRSettings } from '../types';

interface ADSRProps {
    settings: ADSRSettings;
    onChange: (key: keyof ADSRSettings, value: number) => void;
    color?: string;
}

export const ADSR: React.FC<ADSRProps> = ({ settings, onChange, color = '#f59e0b' }) => {
  const settingsRef = useRef(settings);
  const gradientId = useId();
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const { attack, decay, sustain, release } = settings;
  const width = 220;
  const height = 96;
  const maxTime = 2;

  const ax = Math.min(width * 0.4, (attack / maxTime) * (width * 0.4));
  const ay = 0;
  const dx = ax + Math.min(width * 0.4, (decay / maxTime) * (width * 0.4));
  const dy = height * (1 - sustain);
  const sx = width * 0.8;
  const sy = dy;
  const rx = sx + Math.min(width * 0.2, (release / maxTime) * (width * 0.2));
  const ry = height;
  
  const handleDrag = useCallback((param: keyof ADSRSettings, dx: number, dy: number) => {
    const currentSettings = settingsRef.current;
    let newValue;
    switch(param) {
      case 'attack':
        newValue = currentSettings.attack + (dx / (width * 0.4)) * maxTime;
        break;
      case 'decay':
        newValue = currentSettings.decay + (dx / (width * 0.4)) * maxTime;
        break;
      case 'sustain':
        newValue = currentSettings.sustain - dy / height;
        break;
      case 'release':
        newValue = currentSettings.release + (dx / (width * 0.2)) * maxTime;
        break;
      default:
        return;
    }
    onChange(param, Math.max(0.001, Math.min(param === 'sustain' ? 1 : maxTime, newValue)));
  }, [onChange, width, height, maxTime]);

  return (
    <div className="flex flex-col justify-center items-center h-full w-full p-2">
      <svg viewBox={`-10 -10 ${width + 20} ${height + 20}`} width="100%" height="100%" className="flex-grow overflow-visible">
        <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.7" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
        </defs>
        <path
          d={`M 0,${height} L ${ax},${ay} L ${dx},${dy} L ${sx},${sy} L ${rx},${ry} Z`}
          stroke="none"
          fill={`url(#${gradientId})`}
        />
        <DraggableHandle cx={ax} cy={ay} onDrag={(dx) => handleDrag('attack', dx, 0)} color={color} />
        <DraggableHandle cx={dx} cy={dy} onDrag={(dx, dy) => { handleDrag('decay', dx, 0); handleDrag('sustain', 0, dy);}} color={color} />
        <DraggableHandle cx={sx} cy={sy} onDrag={(dx, dy) => handleDrag('sustain', 0, dy)} color={color} />
        <DraggableHandle cx={rx} cy={ry} onDrag={(dx) => handleDrag('release', dx, 0)} color={color} />
      </svg>
      <div className="flex justify-around w-full mt-1 text-base md:text-xs text-gray-400 font-mono">
          <span>A: {attack.toFixed(2)}</span>
          <span>D: {decay.toFixed(2)}</span>
          <span>S: {(sustain * 100).toFixed(0)}%</span>
          <span>R: {release.toFixed(2)}</span>
      </div>
    </div>
  );
};

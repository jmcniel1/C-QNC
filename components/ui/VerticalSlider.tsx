

import React, { useRef, useCallback } from 'react';

interface VerticalSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    color?: string;
}

export const VerticalSlider: React.FC<VerticalSliderProps> = ({ label, value, onChange, min = 0, max = 1, step = 0.01, color = '#d69615' }) => {
    const sliderRef = useRef<HTMLDivElement>(null);
  
    const handleValueChange = (clientY: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const range = max - min;
      let newValue = min + range * percent;
      newValue = Math.round(newValue / step) * step;
      onChange(Math.max(min, Math.min(max, newValue)));
    };
  
    const handleMouseMove = useCallback((e: MouseEvent) => {
      handleValueChange(e.clientY);
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        e.preventDefault();
        handleValueChange(e.touches[0].clientY);
    }, []);
  
    const handleMouseUp = useCallback(() => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    const handleTouchEnd = useCallback(() => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
    }, [handleTouchMove]);
  
    const handleMouseDown = (e: React.MouseEvent) => {
      handleValueChange(e.clientY);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        handleValueChange(e.touches[0].clientY);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
    }
  
    const percentage = ((value - min) / (max - min)) * 100;
  
    return (
      <div className="flex flex-col items-center gap-2 select-none touch-none">
        <div
          ref={sliderRef}
          className="w-6 h-32 bg-fader-bg rounded-full cursor-pointer relative overflow-hidden"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: `${percentage}%`, backgroundColor: color }}
          />
        </div>
        <div className="text-center">
            <div className="text-gray-400 text-base md:text-xs">{label}</div>
            <div className="text-gray-200 font-medium text-base md:text-sm">{`${(value * 100).toFixed(0)}%`}</div>
        </div>
      </div>
    );
};
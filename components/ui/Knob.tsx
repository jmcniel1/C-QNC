
import React, { useRef, useEffect, useCallback, useState } from 'react';

interface KnobProps {
    label?: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    logarithmic?: boolean;
    disabled?: boolean;
    color?: string;
    dotColor?: string;
    textColor?: string;
    textSize?: string;
    size?: number;
    layout?: 'vertical' | 'horizontal';
    precision?: number;
    responsive?: boolean;
    dragSensitivity?: number;
}

export const Knob: React.FC<KnobProps> = ({ label, value, onChange, min = 0, max = 100, step = 1, logarithmic = false, disabled = false, color = '#2d2d2d', dotColor = '#9ca3af', textColor = '', textSize = '', size = 50, layout = 'vertical', precision = 2, responsive = false, dragSensitivity = 1 }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const previousY = useRef(0);
  const valueRef = useRef(value);
  const [isDragging, setIsDragging] = useState(false);

  const log = (min: number, max: number, val: number) => {
    if (val <= min) return 0;
    if (max === min) return 0;
    return Math.log(val / min) / Math.log(max / min);
  }
  const exp = (min: number, max: number, val: number) => min * Math.pow(max / min, val);

  useEffect(() => { valueRef.current = value; }, [value]);

  const handleDrag = useCallback((clientY: number, shiftKey: boolean) => {
    const deltaY = previousY.current - clientY;
    let newValue;
    const sensitivity = shiftKey ? 0.1 : dragSensitivity;
    const currentValue = valueRef.current;

    if (logarithmic) {
      const currentPos = log(min, max, currentValue);
      const newPos = currentPos + deltaY * 0.005 * sensitivity;
      newValue = exp(min, max, Math.max(0, Math.min(1, newPos)));
    } else {
      newValue = currentValue + deltaY * step * sensitivity;
    }

    const clampedValue = Math.max(min, Math.min(max, newValue));
    let finalValue = clampedValue;
    if (!logarithmic) {
        const stepPrecision = step.toString().split('.')[1]?.length || 0;
        finalValue = parseFloat( (Math.round(clampedValue / step) * step).toFixed(stepPrecision) );
    }

    if (Math.abs(finalValue - currentValue) > 1e-6) {
        onChange(finalValue);
    }
    previousY.current = clientY;
  }, [onChange, min, max, step, logarithmic, dragSensitivity]);

  const handleMouseMove = useCallback((e: MouseEvent) => handleDrag(e.clientY, e.shiftKey), [handleDrag]);
  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    handleDrag(e.touches[0].clientY, false);
  }, [handleDrag]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleDragEnd);
    document.body.style.cursor = 'default';
  }, [handleMouseMove, handleTouchMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    previousY.current = e.clientY;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = 'ns-resize';
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    previousY.current = e.touches[0].clientY;
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  };

  const percentage = logarithmic ? log(min, max, value) * 100 : ((value - min) / (max - min)) * 100;

  const containerStyle: React.CSSProperties = responsive 
      ? { width: '100%' } 
      : (layout === 'vertical' ? { width: `${size}px` } : {});

  const knobStyle: React.CSSProperties = responsive
      ? { backgroundColor: color, width: '100%', height: 'auto', aspectRatio: '1/1' }
      : { backgroundColor: color, width: `${size}px`, height: `${size}px` };
      
  const labelClass = textSize || (layout === 'vertical' ? 'text-base md:text-xs' : 'text-base md:text-xs');

  // Dynamic dot size calculation with 8px cap
  const calculatedSize = Math.max(4, size * 0.2);
  const finalSize = Math.min(8, calculatedSize);
  
  const dotSizeVal = responsive ? 'min(20%, 8px)' : `${finalSize}px`;
  const dotTopVal = '15%';

  const displayValue = max === 1 ? (value * 100).toFixed(0) : value.toFixed(logarithmic ? 0 : precision);
  
  // Determine popup position: Below for horizontal layouts (like top bar), Above for vertical
  const popupPositionClass = layout === 'horizontal' ? 'top-[120%] mt-2' : 'bottom-[120%] mb-2';

  return (
    <div className={`flex group select-none touch-none transition-opacity items-center ${disabled ? 'opacity-50 pointer-events-none' : ''} ${layout === 'vertical' ? 'flex-col justify-start space-y-1' : 'flex-row space-x-2'}`} 
      style={containerStyle}>
      
      <div className="relative w-full flex justify-center">
        <div
            ref={knobRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`rounded-full flex-shrink-0 flex items-center justify-center relative ${disabled ? 'cursor-not-allowed' : 'cursor-ns-resize'}`}
            style={knobStyle}
        >
            <div className="w-full h-full" style={{ transform: `rotate(${percentage * 2.7 - 135}deg)` }}>
            <div 
                className={`rounded-full absolute left-1/2 -translate-x-1/2`}
                style={{ 
                    backgroundColor: dotColor,
                    width: dotSizeVal,
                    height: dotSizeVal,
                    top: dotTopVal
                }}
            ></div>
            </div>
        </div>
        
        {/* Large Dragging Value Overlay */}
        {isDragging && (
            <div className={`absolute ${popupPositionClass} left-1/2 -translate-x-1/2 z-[9999] pointer-events-none whitespace-nowrap`}>
                 <span className="text-4xl font-bold text-primary-accent drop-shadow-2xl bg-black/90 px-3 py-1 rounded-xl border border-gray-700/50 shadow-2xl backdrop-blur-sm">
                    {displayValue}
                 </span>
            </div>
        )}
        
        {/* Center Value Overlay - Show on Hover but Hide on Drag */}
        {!isDragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                 <span className={`font-bold text-white bg-black/50 backdrop-blur-[2px] px-1.5 rounded shadow-sm ${textSize || 'text-xs'}`}>
                    {displayValue}
                 </span>
            </div>
        )}
      </div>

      <div className={layout === 'horizontal' ? 'text-left' : 'text-center'}>
        <label className={`${labelClass} ${textColor || 'text-gray-400'} whitespace-nowrap`}>{label}</label>
      </div>
    </div>
  );
};

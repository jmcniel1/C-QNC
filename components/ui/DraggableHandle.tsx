
import React, { useRef, useEffect, useCallback } from 'react';

interface DraggableHandleProps {
    cx: number;
    cy: number;
    onDrag: (dx: number, dy: number) => void;
    color?: string;
}

export const DraggableHandle: React.FC<DraggableHandleProps> = ({ cx, cy, onDrag, color = '#faa917' }) => {
    const prevPos = useRef({ x: 0, y: 0 });
  
    const onDragRef = useRef(onDrag);
    useEffect(() => { onDragRef.current = onDrag; }, [onDrag]);
  
    const onMouseMove = useCallback((e: MouseEvent) => {
      const dx = e.clientX - prevPos.current.x;
      const dy = e.clientY - prevPos.current.y;
      prevPos.current = { x: e.clientX, y: e.clientY };
      onDragRef.current(dx, dy);
    }, []);
  
    const onMouseUp = useCallback(() => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    }, [onMouseMove]);
  
    const onMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      prevPos.current = { x: e.clientX, y: e.clientY };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'grabbing';
    };
  
    const onTouchMove = useCallback((e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const dx = touch.clientX - prevPos.current.x;
        const dy = touch.clientY - prevPos.current.y;
        prevPos.current = { x: touch.clientX, y: touch.clientY };
        onDragRef.current(dx, dy);
      }
    }, []);
  
    const onTouchEnd = useCallback(() => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    }, [onTouchMove]);
  
    const onTouchStart = (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        prevPos.current = { x: touch.clientX, y: touch.clientY };
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
      }
    };
  
    return (
      <g 
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        {/* Invisible larger hit area for easier touch interaction */}
        <circle cx={cx} cy={cy} r={20} fill="transparent" />
        
        {/* Visible handle - Semi-opaque black with colored glow */}
        <circle 
            cx={cx} 
            cy={cy} 
            r={8} 
            fill="rgba(0, 0, 0, 0.6)" 
            style={{ 
                filter: `drop-shadow(0 0 5px ${color})` 
            }}
        />
      </g>
    );
};
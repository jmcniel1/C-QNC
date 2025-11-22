
import React, { useRef, useEffect } from 'react';
import { oscColors } from '../constants';

interface OscilloscopeProps {
    analysers: React.MutableRefObject<AnalyserNode[]>;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({ analysers }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const updateSize = () => {
             if (canvas.parentElement) {
                 const rect = canvas.parentElement.getBoundingClientRect();
                 canvas.width = rect.width;
                 canvas.height = rect.height;
             }
        };
        
        updateSize();
        
        const resizeObserver = new ResizeObserver(updateSize);
        if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let animationId: number;
        
        const render = () => {
            if (!analysers.current) return;
            const width = canvas.width;
            const height = canvas.height;
            
            ctx.clearRect(0, 0, width, height);
            
            analysers.current.forEach((analyser, i) => {
                if (!analyser) return;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Float32Array(bufferLength);
                analyser.getFloatTimeDomainData(dataArray);
                
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = oscColors[i];
                
                const sliceWidth = width / bufferLength;
                let x = 0;
                
                for(let j = 0; j < bufferLength; j++) {
                    const v = dataArray[j];
                    // Increased visual gain factor from 0.8 to 2.2 to compensate for lower internal gain
                    const y = (height / 2) + (v * height * 2.2);
                    if (j === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                    x += sliceWidth;
                }
                ctx.stroke();
            });
            
            animationId = requestAnimationFrame(render);
        };
        render();
        
        return () => {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
        }
    }, [analysers]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />;
};

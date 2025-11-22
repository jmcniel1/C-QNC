
import React, { useRef, useEffect } from 'react';
import { oscColors } from '../constants';
import { OscillatorSettings } from '../types';

interface OscilloscopeProps {
    analysers: React.MutableRefObject<AnalyserNode[]>;
    oscillators: OscillatorSettings[];
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({ analysers, oscillators }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const oscillatorsRef = useRef(oscillators);

    // Keep ref updated without triggering re-initialization of the loop
    useEffect(() => {
        oscillatorsRef.current = oscillators;
    }, [oscillators]);
    
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
            
            // Draw Order: 2 (Orange/Bottom) -> 1 (Green/Middle) -> 0 (Blue/Top)
            const drawOrder = [2, 1, 0];

            drawOrder.forEach((i) => {
                const analyser = analysers.current[i];
                const settings = oscillatorsRef.current[i];

                if (!analyser || !settings) return;

                // Visual FX Parameters
                const { delay, reverb, disto } = settings.sends;

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Float32Array(bufferLength);
                analyser.getFloatTimeDomainData(dataArray);
                
                ctx.beginPath();
                ctx.lineWidth = 2;
                
                // FX: Reverb (Blur)
                if (reverb > 0.01) {
                    ctx.shadowBlur = reverb * 15;
                    ctx.shadowColor = oscColors[i];
                } else {
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                }

                // FX: Delay (Breaks/Dashed Line)
                if (delay > 0.01) {
                    // High delay = larger gaps
                    const dashLen = Math.max(2, 30 - (delay * 20));
                    const gapLen = delay * 10;
                    ctx.setLineDash([dashLen, gapLen]);
                } else {
                    ctx.setLineDash([]);
                }

                ctx.strokeStyle = oscColors[i];
                
                const sliceWidth = width / bufferLength;
                let x = 0;
                
                for(let j = 0; j < bufferLength; j++) {
                    const v = dataArray[j];
                    
                    // FX: Distortion (Jitter/Peaks)
                    let jitter = 0;
                    if (disto > 0.01) {
                        // Noise proportional to signal amplitude
                        if (Math.abs(v) > 0.01) {
                             jitter = (Math.random() - 0.5) * disto * 0.2; 
                        }
                    }

                    // Scale and position
                    const y = (height / 2) + ((v + jitter) * height * 4.0);
                    
                    if (j === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                    x += sliceWidth;
                }
                ctx.stroke();
                
                // Reset for next line
                ctx.shadowBlur = 0;
                ctx.setLineDash([]);
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

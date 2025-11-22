
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
            
            // Drawing Order: Bottom -> Top
            // Index 2 (Orange) -> Index 1 (Green) -> Index 0 (Blue)
            // This ensures Blue is visually on top (Z-space).
            const drawOrder = [2, 1, 0];

            drawOrder.forEach((i) => {
                const analyser = analysers.current[i];
                const settings = oscillatorsRef.current[i];

                if (!analyser || !settings) return;

                const { delay, reverb, disto } = settings.sends;

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Float32Array(bufferLength);
                analyser.getFloatTimeDomainData(dataArray);
                
                ctx.beginPath();
                ctx.lineWidth = 2;
                
                // FX: Reverb (Blur) - Makes the line glow/blurry
                // Scale: 0-30px blur
                if (reverb > 0.01) {
                    ctx.shadowBlur = reverb * 30;
                    ctx.shadowColor = oscColors[i];
                } else {
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                }

                // FX: Delay (Broken Lines) - Dashed line effect
                if (delay > 0.05) {
                    // High delay = bigger gaps. 
                    // Segment size shrinks, gap grows.
                    const segment = Math.max(2, 40 - (delay * 35));
                    const gap = delay * 20; 
                    ctx.setLineDash([segment, gap]);
                } else {
                    ctx.setLineDash([]);
                }

                ctx.strokeStyle = oscColors[i];
                
                const sliceWidth = width / bufferLength;
                let x = 0;
                
                for(let j = 0; j < bufferLength; j++) {
                    const v = dataArray[j];
                    
                    // FX: Distortion (Spikes) - Add intermittent jagged peaks
                    let offset = 0;
                    if (disto > 0.01) {
                        // Probability based jitter to create "spikes" rather than white noise
                        if (Math.random() > (1.0 - disto * 0.3)) {
                            offset = (Math.random() - 0.5) * disto * 0.5;
                        }
                    }

                    // Map amplitude to height
                    // Standard amplitude 4.0 to fill space
                    const y = (height / 2) + ((v + offset) * height * 4.0);
                    
                    if (j === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                    x += sliceWidth;
                }
                ctx.stroke();
                
                // Reset context properties for next layer
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

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80" />;
};

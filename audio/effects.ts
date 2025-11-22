

export async function generateImpulseResponse(audioCtx: AudioContext, model: string, decayTime: number, duration: number) {
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);

    for (let channelNum = 0; channelNum < 2; channelNum++) {
        const channelData = impulse.getChannelData(channelNum);
        
        // State for lowpass filter (Abyss model)
        let lpState = 0;

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let output = 0;
            
            // Basic noise source
            let noise = Math.random() * 2 - 1;

            if (model === 'block') {
                // BLOCK: Gated, industrial, non-linear.
                // Replaces Nebula.
                // Uses a square-wave LFO to gate the noise, creating a "stepped" reverb tail.
                
                // LFO Frequency decreases over time (20Hz -> 5Hz)
                const lfoFreq = 20 * Math.exp(-t); 
                const gate = Math.sin(t * lfoFreq * Math.PI * 2) > 0 ? 1 : 0;
                
                // Non-linear decay (convex)
                const envelope = Math.pow(1 - (t / duration), 2);
                
                output = noise * gate * envelope;

            } else if (model === 'swarm') {
                // SWARM: Granular, texture-heavy.
                // Replaces Shimmer.
                // Modulates noise with high-frequency ring mod to create "grains".

                const grainMod = Math.sin(t * 800 + (Math.random() * 10)); 
                const envelope = Math.exp(-t / decayTime);
                
                // Add sparse high-energy spikes
                const spike = Math.random() > 0.99 ? (Math.random() * 0.5) : 0;

                output = (noise * grainMod * 0.8 + spike) * envelope;

            } else if (model === 'abyss') {
                // ABYSS: Deep, dark, submerged.
                // Replaces Submarine (Fixed logic).
                // Heavy low-pass filtering statefully applied to noise.

                // State-variable Low Pass Filter
                // Alpha determines cutoff (lower = lower freq)
                const alpha = 0.05; 
                lpState = lpState + alpha * (noise - lpState);

                // Swelling attack
                const attack = Math.min(1, t * 8); // fast but noticeable swell
                const envelope = Math.exp(-t / (decayTime * 1.2));

                // Boost gain because LPF reduces energy significantly
                output = lpState * envelope * attack * 5.0;

            } else {
                // Fallback
                output = noise * Math.exp(-t / decayTime);
            }
            
            // Safety Clipping to prevent blown filters/NaNs
            if (Number.isNaN(output)) output = 0;
            output = Math.max(-1, Math.min(1, output));

            channelData[i] = output;
        }
    }
    return impulse;
}

export function makeDistortionCurve(amount: number, model: string) {
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  
  for (let i = 0; i < n_samples; ++i) {
    // x is in [-1, 1]
    const x = i * 2 / n_samples - 1;
    
    if (model === 'overdrive') {
        // High-Res Soft Clipping (Saturation)
        const k = 1 + amount * 30;
        curve[i] = Math.tanh(k * x) / Math.tanh(k);
        
    } else if (model === 'fuzz') {
        // High-Res Hard Clipping (Fuzz)
        const k = 1 + amount * 60;
        curve[i] = (2 / Math.PI) * Math.atan(k * x);

    } else if (model === 'crush') {
        // Bit-Depth Reduction (Quantization)
        const bits = 16 - (amount * 14); // Down to 2 bits
        const steps = Math.pow(2, bits);
        curve[i] = Math.round(x * steps) / steps;
    } else {
        curve[i] = x;
    }
  }
  return curve;
}

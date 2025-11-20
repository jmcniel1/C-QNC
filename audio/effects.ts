export async function generateImpulseResponse(audioCtx: AudioContext, model: string, decayTime: number, duration: number) {
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);

    for (let channelNum = 0; channelNum < 2; channelNum++) {
        const channelData = impulse.getChannelData(channelNum);
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate; // Time in seconds
            let envelope = 0;

            if (model === 'plate') {
                 // Plate: Fast buildup, long sustained metallic decay
                 envelope = Math.exp(-t / (decayTime * 0.6)) * (1 - Math.exp(-t * 50)); 
            } else if (model === 'room') {
                 // Room: Quick exponential decay, dense early
                 envelope = Math.exp(-t / (decayTime * 0.15));
            } else {
                 // Hall: Slower buildup (predelay feel), long exponential tail
                 envelope = Math.exp(-t / (decayTime * 0.8)) * (1 - Math.exp(-t * 20));
            }
            
            // Noise burst scaled down to prevent clipping the convolver output
            channelData[i] = (Math.random() * 2 - 1) * envelope * 0.5;
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

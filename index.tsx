import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Play, Pause, StopCircle, Volume2, Waves, SlidersHorizontal, Bluetooth, SkipBack, SkipForward, ChevronLeft, ChevronRight, X, Keyboard, Download, Disc, Rotate3d, Aperture, Filter, VolumeX } from 'lucide-react';

// --- GLOBAL STYLES & TAILWIND CONFIG ---
const GlobalStyles = () => {
    // Font data is truncated for brevity but would be the full base64 string.
    const poppins400 = 'd09GMgABAAAAAAPs...';
    const poppins500 = 'd09GMgABAAAAAAPs...';
    const poppins700 = 'd09GMgABAAAAAAPs...';
    
    return (
        <style>
        {`
          /* Inlined @font-face for Poppins to improve Safari compatibility */
          @font-face {
            font-family: 'Poppins';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url(data:application/font-woff2;base64,${poppins400}) format('woff2');
          }
          @font-face {
            font-family: 'Poppins';
            font-style: normal;
            font-weight: 500;
            font-display: swap;
            src: url(data:application/font-woff2;base64,${poppins500}) format('woff2');
          }
          @font-face {
            font-family: 'Poppins';
            font-style: normal;
            font-weight: 700;
            font-display: swap;
            src: url(data:application/font-woff2;base64,${poppins700}) format('woff2');
          }

          /* Custom user overrides */
          @media (min-width: 768px) {
              .md\\:text-xs {
                  font-size: 1rem;
                  line-height: 1rem;
              }
          }

          .font-semibold {
              font-weight: 500;
          }

          .p-2 {
              padding: 1rem;
          }

          .justify-around {
              justify-content: space-evenly;
          }

          .sequencer-toggle-mobile {
            background: rgb(234, 88, 12);
            color: white;
            font-weight: 400;
          }

          /* Safari Polyfills & Font fallbacks */
          .backdrop-blur-sm {
            -webkit-backdrop-filter: blur(4px);
          }
          .backdrop-blur-\\[4px\\] {
            -webkit-backdrop-filter: blur(4px);
          }

          body {
            overscroll-behavior: none;
            font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            min-height: 100vh;
            height: 100vh;
            overflow: hidden;
            background-color: #121212;
          }
          #root {
            height: 100%;
          }
        `}
        </style>
    );
};

// --- TYPE DEFINITIONS ---
// (Simplified types for in-file consumption)


// --- CONSTANTS & INITIAL STATE ---
const oscColors = ['#1d4ed8', '#166534', '#b91c1c']; 

const initialADSR = { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 };
const initialOsc = [
  { id: 1, wave: 'sine', vol: 0.2, octave: 0, adsr: { ...initialADSR }, sends: { delay: 0, reverb: 0 }, muted: false, filter: { freq: 20000, res: 0.1 } },
  { id: 2, wave: 'square', vol: 0.2, octave: 0, adsr: { ...initialADSR, attack: 0.02, decay: 0.5 }, sends: { delay: 0, reverb: 0 }, muted: false, filter: { freq: 20000, res: 0.1 } },
  { id: 3, wave: 'sawtooth', vol: 0.2, octave: 0, adsr: { ...initialADSR, release: 1.0 }, sends: { delay: 0, reverb: 0 }, muted: false, filter: { freq: 20000, res: 0.1 } },
];
const initialSequencer = {
  steps: Array(3).fill(0).map(() => Array(16).fill({ notes: [], enabled: true, probability: 1.0 })),
  stepCount: 16,
};
const initialTransport = { isPlaying: false, bpm: 120, masterVolume: 0.8, metronomeOn: false, swing: 50 };
const initialFX = {
  reverb: { decay: 2.5, predelay: 0.1, damper: 8000, model: 'hall' },
  delay: { time: 250, feedback: 0, division: '1/4' },
};

// --- AUDIO LOGIC (useSynth hook) ---
const A4 = 440;
const C0 = A4 * Math.pow(2, -4.75);
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const noteToFreq = (note, octaveShift = 0) => {
  const octave = parseInt(note.slice(-1)) + octaveShift;
  const key = note.slice(0, -1);
  const halfSteps = noteNames.indexOf(key);
  return C0 * Math.pow(2, octave + halfSteps / 12);
};

class Voice {
  #osc; #gain; #adsr; output; note = null; isAvailable = true;
  constructor(audioCtx, adsr) {
    this.#osc = audioCtx.createOscillator();
    this.#gain = audioCtx.createGain();
    this.output = this.#gain;
    this.#adsr = adsr;
    this.#osc.connect(this.#gain);
    this.#gain.gain.setValueAtTime(0, audioCtx.currentTime);
    this.#osc.start();
  }
  connect(destination) { this.output.connect(destination); }
  update(settings) { this.#osc.type = settings.wave; this.#adsr = settings.adsr; }
  on(note, octaveShift, audioCtx, velocity = 1.0) {
    this.isAvailable = false; this.note = note;
    this.#osc.frequency.setValueAtTime(noteToFreq(note, octaveShift), audioCtx.currentTime);
    const now = audioCtx.currentTime;
    this.#gain.gain.cancelScheduledValues(now);
    this.#gain.gain.setValueAtTime(0, now);
    this.#gain.gain.linearRampToValueAtTime(velocity, now + this.#adsr.attack);
    this.#gain.gain.linearRampToValueAtTime(this.#adsr.sustain * velocity, now + this.#adsr.attack + this.#adsr.decay);
  }
  off(audioCtx) {
    const now = audioCtx.currentTime;
    this.#gain.gain.cancelScheduledValues(now);
    this.#gain.gain.setValueAtTime(this.#gain.gain.value, now);
    this.#gain.gain.linearRampToValueAtTime(0, now + this.#adsr.release);
    setTimeout(() => { this.isAvailable = true; this.note = null; }, (this.#adsr.release + 0.1) * 1000);
  }
}
const MAX_VOICES_PER_OSC = 8;
async function generateImpulseResponse(audioCtx, model, duration, decay) {
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);

    for (let channelNum = 0; channelNum < 2; channelNum++) {
        const channelData = impulse.getChannelData(channelNum);
        for (let i = 0; i < length; i++) {
            const t = i / length;
            let envelope = 0;
            switch(model) {
                case 'plate':
                    envelope = Math.exp(-t * 20) * (1 - t);
                    break;
                case 'room':
                    envelope = Math.pow(1 - t, decay * 1.5);
                    break;
                case 'hall':
                default:
                    envelope = (1 - Math.exp(-t * 5)) * Math.pow(1 - t, decay);
                    break;
            }
            channelData[i] = (Math.random() * 2 - 1) * envelope;
        }
    }
    return impulse;
}

interface FxNodes {
  reverb?: ConvolverNode;
  reverbWetGain?: GainNode;
  delay?: DelayNode;
  delayFeedback?: GainNode;
  delayInputGain?: GainNode;
  reverbInputGain?: GainNode;
}
interface OscFxSendNodes {
  delay: GainNode;
  reverb: GainNode;
}

const useSynth = (state, onStepChange) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voicePoolRef = useRef<Voice[][]>([]);
  const activeVoicesRef = useRef<Voice[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscGainNodesRef = useRef<GainNode[]>([]);
  const oscFilterNodesRef = useRef<BiquadFilterNode[]>([]);
  const fxNodesRef = useRef<FxNodes>({});
  const oscFxSendNodesRef = useRef<OscFxSendNodes[]>([]);
  const metronomeGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const currentStepRef = useRef(-1);
  const nextStepTimeRef = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const initialize = useCallback(async () => {
    if (audioCtxRef.current) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = context;

      masterGainRef.current = context.createGain();
      masterGainRef.current.connect(context.destination);
      
      metronomeGainRef.current = context.createGain();
      metronomeGainRef.current.gain.value = 0.5;
      metronomeGainRef.current.connect(masterGainRef.current);

      // Create FX nodes
      const reverb = context.createConvolver();
      reverb.buffer = await generateImpulseResponse(context, state.fx.reverb.model, state.fx.reverb.decay, 3);
      const reverbWetGain = context.createGain();
      reverbWetGain.gain.value = 1.0; // Reverb wet level is controlled by sends now
      const delay = context.createDelay(5);
      const delayFeedback = context.createGain();
      const delayInputGain = context.createGain();
      const reverbInputGain = context.createGain();

      // Configure FX nodes
      delayFeedback.gain.value = state.fx.delay.feedback;

      // Connect FX chains in PARALLEL
      // Delay Chain
      delayInputGain.connect(delay);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
      delay.connect(masterGainRef.current);

      // Reverb Chain
      reverbInputGain.connect(reverbWetGain);
      reverbWetGain.connect(reverb);
      reverb.connect(masterGainRef.current);

      fxNodesRef.current = { reverb, reverbWetGain, delay, delayFeedback, delayInputGain, reverbInputGain };

      const oscGains = state.oscillators.map(() => context.createGain());
      oscGainNodesRef.current = oscGains;
      oscFilterNodesRef.current = state.oscillators.map(() => context.createBiquadFilter());

      voicePoolRef.current = state.oscillators.map((oscSettings, oscIndex) => {
        const pool = [];
        const oscGain = oscGainNodesRef.current[oscIndex];
        const oscFilter = oscFilterNodesRef.current[oscIndex];
        
        // Configure osc-specific filter
        oscFilter.type = 'lowpass';
        oscFilter.frequency.value = oscSettings.filter.freq;
        oscFilter.Q.value = Math.pow(oscSettings.filter.res, 3) * 20 + 0.1;

        // Create 2 send nodes per OSC
        const delaySend = context.createGain();
        const reverbSend = context.createGain();
        
        delaySend.gain.value = oscSettings.sends.delay;
        reverbSend.gain.value = oscSettings.sends.reverb;

        // Connect sends to FX chain inputs
        delaySend.connect(delayInputGain);
        reverbSend.connect(reverbInputGain);

        oscFxSendNodesRef.current.push({ delay: delaySend, reverb: reverbSend });
        
        // Routing: Voice -> Gain -> Filter -> (Master + Sends)
        oscGain.connect(oscFilter);
        oscFilter.connect(masterGainRef.current!); // Dry signal
        oscFilter.connect(delaySend); // Wet signals
        oscFilter.connect(reverbSend);

        for (let i = 0; i < MAX_VOICES_PER_OSC; i++) {
          const voice = new Voice(context, oscSettings.adsr);
          voice.connect(oscGain);
          pool.push(voice);
        }
        return pool;
      });
    } catch (e) { console.error("Web Audio API is not supported.", e); }
  }, [state.fx.delay.feedback, state.fx.reverb.decay, state.fx.reverb.model]);

  const playMetronomeClick = useCallback(() => {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx || !metronomeGainRef.current) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(metronomeGainRef.current);
      osc.start(now);
      osc.stop(now + 0.05);
  }, []);

  const tick = useCallback(() => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    const { sequencer, oscillators, transport } = stateRef.current;
    const { stepCount, steps } = sequencer;
    activeVoicesRef.current.forEach(voice => voice.off(audioCtx));
    activeVoicesRef.current = [];
    currentStepRef.current = (currentStepRef.current + 1) % stepCount;
    onStepChange(currentStepRef.current);

    if (transport.metronomeOn && currentStepRef.current % 4 === 0) {
        playMetronomeClick();
    }
    
    steps.forEach((track, trackIndex) => {
      const stepData = track[currentStepRef.current];
      const shouldPlay = stepData && stepData.enabled && stepData.notes.length > 0 && (Math.random() < (stepData.probability ?? 1.0));

      if (shouldPlay) {
        const oscSettings = oscillators[trackIndex];
        const voicePool = voicePoolRef.current[trackIndex];
        
        stepData.notes.forEach(note => {
          const voice = voicePool.find(v => v.isAvailable);
          if (voice) {
            voice.update(oscSettings);
            voice.on(note.name, oscSettings.octave, audioCtx, note.velocity);
            activeVoicesRef.current.push(voice);
          }
        });
      }
    });
  }, [onStepChange, playMetronomeClick]);

  const scheduler = useCallback(() => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    while (nextStepTimeRef.current < now + 0.1) {
        tick();
        const { bpm, swing } = stateRef.current.transport;
        const secondsPerBeat = 60.0 / bpm;
        const sixteenthNoteDuration = 0.25 * secondsPerBeat;
        
        let timeToNextStep = sixteenthNoteDuration;
        
        const isNextStepOdd = (currentStepRef.current + 1) % 2 !== 0;
        
        if (swing !== 50) {
            const swingRatio = swing / 100;
            const swingOffset = (swingRatio - 0.5) * sixteenthNoteDuration;
            if (isNextStepOdd) {
                timeToNextStep += swingOffset;
            } else {
                timeToNextStep -= swingOffset;
            }
        }
        
        nextStepTimeRef.current += timeToNextStep;
    }
    timerRef.current = window.setTimeout(scheduler, 50);
  }, [tick]);

  const start = useCallback(() => {
    if (!audioCtxRef.current) { initialize(); }
    if (audioCtxRef.current?.state === 'suspended') { audioCtxRef.current.resume(); }
    if (!timerRef.current) {
      currentStepRef.current = -1;
      nextStepTimeRef.current = audioCtxRef.current?.currentTime ?? 0;
      scheduler();
    }
  }, [initialize, scheduler]);
  
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      currentStepRef.current = -1;
      onStepChange(-1);
      activeVoicesRef.current.forEach(v => v.off(audioCtxRef.current!));
      activeVoicesRef.current = [];
    }
  }, [onStepChange]);
  
  useEffect(() => { masterGainRef.current?.gain.setTargetAtTime(state.transport.masterVolume, audioCtxRef.current?.currentTime ?? 0, 0.01); }, [state.transport.masterVolume]);
  
  useEffect(() => {
      if (!audioCtxRef.current) return;
      const now = audioCtxRef.current.currentTime;
      state.oscillators.forEach((osc, i) => {
          const gainValue = osc.muted ? 0 : osc.vol;
          oscGainNodesRef.current[i]?.gain.setTargetAtTime(gainValue, now, 0.01);
          
          const sends = oscFxSendNodesRef.current[i];
          if (sends) {
            sends.delay.gain.setTargetAtTime(osc.sends.delay, now, 0.02);
            sends.reverb.gain.setTargetAtTime(osc.sends.reverb, now, 0.02);
          }

          const oscFilter = oscFilterNodesRef.current[i];
          if (oscFilter) {
            const qValue = Math.pow(osc.filter.res, 3) * 20 + 0.1;
            oscFilter.frequency.setTargetAtTime(osc.filter.freq, now, 0.02);
            oscFilter.Q.setTargetAtTime(qValue, now, 0.02);
          }
      });
  }, [state.oscillators]);

  useEffect(() => {
    const audioCtx = audioCtxRef.current;
    const reverbNode = fxNodesRef.current.reverb;
    if (!audioCtx || !reverbNode) return;
    const { model, decay } = state.fx.reverb;
    // Debounce this expensive operation
    const timeoutId = setTimeout(() => {
        generateImpulseResponse(audioCtx, model, decay, 3).then(impulse => {
            if(reverbNode) reverbNode.buffer = impulse;
        });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [state.fx.reverb.model, state.fx.reverb.decay]);


  useEffect(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    const { delay } = state.fx;
    const { delay: delayNode, delayFeedback } = fxNodesRef.current;
    
    if (!delayNode || !delayFeedback) return;
    
    delayNode.delayTime.setTargetAtTime(delay.time / 1000, now, 0.02);
    delayFeedback.gain.setTargetAtTime(delay.feedback, now, 0.02);
  }, [state.fx]);

  return { start, stop, initialize };
};


// --- UI COMPONENTS (Inline for self-contained file) ---

const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Knob = ({ label, value, onChange, min = 0, max = 100, step = 1, logarithmic = false, disabled = false, color = '#2d2d2d', dotColor = '#9ca3af', textColor = '', size = 60, layout = 'vertical', precision = 2, responsive = false }) => {
  const knobRef = useRef(null);
  const previousY = useRef(0);
  const valueRef = useRef(value);

  const log = (min, max, val) => {
    if (val <= min) return 0;
    if (max === min) return 0;
    return Math.log(val / min) / Math.log(max / min);
  }
  const exp = (min, max, val) => min * Math.pow(max / min, val);

  useEffect(() => { valueRef.current = value; }, [value]);

  const handleDrag = useCallback((clientY, shiftKey) => {
    const deltaY = previousY.current - clientY;
    let newValue;
    const sensitivity = shiftKey ? 0.1 : 1;
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
  }, [onChange, min, max, step, logarithmic]);

  const handleMouseMove = useCallback((e) => handleDrag(e.clientY, e.shiftKey), [handleDrag]);
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    handleDrag(e.touches[0].clientY, false);
  }, [handleDrag]);

  const handleDragEnd = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleDragEnd);
    document.body.style.cursor = 'default';
  }, [handleMouseMove, handleTouchMove]);

  const handleMouseDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    previousY.current = e.clientY;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = 'ns-resize';
  };
  
  const handleTouchStart = (e) => {
    if (disabled) return;
    previousY.current = e.touches[0].clientY;
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  };

  const percentage = logarithmic ? log(min, max, value) * 100 : ((value - min) / (max - min)) * 100;

  const containerStyle = responsive 
      ? { width: '100%' } 
      : (layout === 'vertical' ? { width: `${size}px` } : {});

  const knobStyle = responsive
      ? { backgroundColor: color, width: '100%', height: 'auto', aspectRatio: '1/1' }
      : { backgroundColor: color, width: `${size}px`, height: `${size}px` };

  return (
    <div className={`flex select-none transition-opacity items-center ${disabled ? 'opacity-50 pointer-events-none' : ''} ${layout === 'vertical' ? 'flex-col justify-start space-y-1' : 'flex-row space-x-2'}`} 
      style={containerStyle}>
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`rounded-full flex-shrink-0 flex items-center justify-center relative ${disabled ? 'cursor-not-allowed' : 'cursor-ns-resize'}`}
        style={knobStyle}
      >
        <div className="w-full h-full" style={{ transform: `rotate(${percentage * 2.7 - 135}deg)` }}>
           <div 
             className={`w-1.5 h-1.5 rounded-full absolute top-2 left-1/2 -translate-x-1/2`}
             style={{ backgroundColor: dotColor }}
           ></div>
        </div>
      </div>
      <div className={layout === 'horizontal' ? 'text-left' : 'text-center'}>
        <label className={`text-base md:text-xs ${textColor || 'text-gray-400'}`}>{label}</label>
        <span className={`block text-base md:text-sm ${textColor || 'text-gray-200'} font-medium`}>
          {max === 1 ? `${(value * 100).toFixed(0)}%` : value.toFixed(logarithmic ? 0 : precision)}
        </span>
      </div>
    </div>
  );
};


const Panel = ({ title, children = null, className = '', headerControls = null }) => {
  return (
    <div className={`flex flex-col border-b border-gray-800 bg-panel-bg ${className}`}>
      {title && (
        <div className="flex justify-between items-center border-b border-gray-800">
          <h2 className="text-base md:text-xs px-3 py-1 text-gray-500 tracking-wider font-semibold uppercase">
            {title}
          </h2>
          {headerControls && <div className="px-2">{headerControls}</div>}
        </div>
      )}
      <div className="flex-grow min-h-0">{children}</div>
    </div>
  );
};

const Toggle = ({ label, checked, onChange, color = '#f59e0b' }) => {
    return (
      <label className="flex items-center justify-between w-full cursor-pointer">
        <span className="text-gray-400 text-base md:text-xs mr-2">{label}</span>
        <button
          onClick={() => onChange(!checked)}
          className={`w-10 h-5 rounded-full p-0.5 transition-colors`}
          style={{ backgroundColor: checked ? color : '#333333' }}
        >
          <div
            className={`w-4 h-4 bg-gray-200 rounded-full transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
    );
  };

const Transport = ({ settings, onChange, isScrolled, isMobile = false }) => {
  return (
    <Panel 
        title={null}
        className={`h-auto md:h-24 sticky top-0 z-50 bg-panel-bg transition-all duration-300 ease-in-out flex-none ${isScrolled ? 'md:h-20' : ''}`}
    >
      <div className="flex flex-col md:flex-row items-stretch justify-between h-full w-full">
        <div className="flex flex-grow md:w-1/3 border-b md:border-b-0 md:border-r border-gray-800">
            <button 
                onClick={() => onChange('isPlaying', !settings.isPlaying)}
                className="flex-grow flex items-center justify-center transition-colors bg-fader-bg hover:bg-gray-700"
                aria-label={settings.isPlaying ? "Pause" : "Play"}
            >
                {settings.isPlaying ? <Pause size={36} className="text-primary-accent" /> : <Play size={36} />}
            </button>
             <button 
                onClick={() => onChange('isPlaying', false)}
                className="flex-grow flex items-center justify-center bg-fader-bg hover:bg-gray-700 transition-colors"
                aria-label="Stop"
            >
                <StopCircle size={36} />
            </button>
        </div>
        <div className={`flex justify-around items-center md:w-2/3 flex-grow px-2 py-2 md:py-0 border-b md:border-b-0 md:border-r-0 border-gray-800`}>
          <Knob
            label="Bpm"
            value={settings.bpm}
            onChange={(val) => onChange('bpm', val)}
            min={40}
            max={300}
            step={1}
            color="#333"
            dotColor="white"
            size={isMobile ? 44 : (isScrolled ? 26 : 38)}
            layout="horizontal"
            precision={0}
          />
          <Knob 
            label="Mains" 
            value={settings.masterVolume} 
            onChange={(v) => onChange('masterVolume', v)}
            min={0}
            max={1}
            step={0.01}
            color="#333"
            dotColor="white"
            size={isMobile ? 44 : (isScrolled ? 26 : 38)}
            layout="horizontal"
          />
           <Knob 
            label="Swing" 
            value={settings.swing} 
            onChange={(v) => onChange('swing', v)}
            min={0}
            max={100}
            step={1}
            color="#333"
            dotColor="white"
            size={isMobile ? 44 : (isScrolled ? 26 : 38)}
            layout="horizontal"
            precision={0}
          />
        </div>
        <div className={`flex flex-col justify-around md:w-1/4 flex-grow px-4 py-2 text-base md:text-xs border-l border-gray-800`}>
            <Toggle label="Metronome" checked={settings.metronomeOn} onChange={(v) => onChange('metronomeOn', v)} />
        </div>
      </div>
    </Panel>
  );
};

const DraggableHandle = ({ cx, cy, onDrag }) => {
    const prevPos = useRef({ x: 0, y: 0 });
  
    const onDragRef = useRef(onDrag);
    useEffect(() => { onDragRef.current = onDrag; }, [onDrag]);
  
    // --- Mouse Handlers ---
    const onMouseMove = useCallback((e) => {
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
  
    const onMouseDown = (e) => {
      e.preventDefault();
      prevPos.current = { x: e.clientX, y: e.clientY };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'grabbing';
    };
  
    // --- Touch Handlers ---
    const onTouchMove = useCallback((e) => {
      e.preventDefault(); // Prevent page scroll
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
  
    const onTouchStart = (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        prevPos.current = { x: touch.clientX, y: touch.clientY };
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
      }
    };
  
    return (
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill="#e0e0e0"
        stroke="#1c1c1c"
        strokeWidth={2}
        className="cursor-grab active:cursor-grabbing shadow-lg"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      />
    );
  };

const ADSR = ({ settings, onChange, color = '#f59e0b' }) => {
  const settingsRef = useRef(settings);
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
  
  const handleDrag = useCallback((param, dx, dy) => {
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
      <svg viewBox={`-10 -10 ${width + 20} ${height + 20}`} width="100%" height="100%" className="flex-grow">
        <path
          d={`M 0,${height} L ${ax},${ay} L ${dx},${dy} L ${sx},${sy} L ${rx},${ry}`}
          stroke={color}
          strokeWidth={2}
          fill={hexToRgba(color, 0.2)}
        />
        <DraggableHandle cx={ax} cy={ay} onDrag={(dx) => handleDrag('attack', dx, 0)} />
        <DraggableHandle cx={dx} cy={dy} onDrag={(dx, dy) => { handleDrag('decay', dx, 0); handleDrag('sustain', 0, dy);}} />
        <DraggableHandle cx={sx} cy={sy} onDrag={(dx, dy) => handleDrag('sustain', 0, dy)} />
        <DraggableHandle cx={rx} cy={ry} onDrag={(dx) => handleDrag('release', dx, 0)} />
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

const OscillatorPanel = ({ settings, onOscChange, onADSRChange, color }) => {
  const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
  return (
    <div className="flex flex-col h-full flex-grow">
      <div className="p-2 space-y-2">
        <h3 className="text-gray-400 font-semibold">Osc {settings.id}</h3>
        <div className="grid grid-cols-2 gap-1">
          {waveforms.map((wave) => (
            <button
              key={wave}
              onClick={() => onOscChange('wave', wave)}
              className={`px-2 py-1 text-base md:text-sm transition-colors rounded-full font-medium ${
                settings.wave !== wave ? 'bg-fader-bg hover:bg-gray-700' : ''
              }`}
              style={settings.wave === wave ? { backgroundColor: color, color: 'white' } : {}}
            >
              {wave.charAt(0).toUpperCase() + wave.slice(1,3)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex justify-around items-center flex-grow p-2 border-b border-gray-800">
          <Knob
            label="Vol"
            value={settings.vol}
            onChange={(v) => onOscChange('vol', v)}
            min={0}
            max={1}
            step={0.01}
            color="#444"
            dotColor="white"
          />
          <Knob label="Octave" value={settings.octave} onChange={v => onOscChange('octave', v)} min={-4} max={4} step={1} color="#444" dotColor="white" precision={0} />
          <div className="flex flex-col space-y-1 items-center text-center" style={{ width: '60px' }}>
            <button 
              onClick={() => onOscChange('muted', !settings.muted)} 
              className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-colors ${settings.muted ? 'bg-red-700/50' : 'bg-fader-bg'}`}
              aria-label={settings.muted ? "Unmute Oscillator" : "Mute Oscillator"}
            >
              {settings.muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
            </button>
            <div>
              <label className="text-base md:text-xs text-gray-400">Mute</label>
              <span className="block text-base md:text-sm font-medium invisible">0</span>
            </div>
          </div>
      </div>
      
      <div className="flex flex-col space-y-2 py-2 px-1 border-b border-gray-800">
        <h4 className="text-center text-gray-500 text-xs uppercase font-semibold tracking-wider">FX Sends</h4>
        <div className="flex justify-around items-center text-sm">
            <Knob label="Delay" value={settings.sends.delay} onChange={v => onOscChange('sends', {...settings.sends, delay: v})} min={0} max={1} step={0.01} color="#444" dotColor="white" size={50} />
            <Knob label="Reverb" value={settings.sends.reverb} onChange={v => onOscChange('sends', {...settings.sends, reverb: v})} min={0} max={1} step={0.01} color="#444" dotColor="white" size={50} />
            <div className="flex flex-col space-y-1" style={{width: 120}}>
              <Knob 
                label="Freq"
                value={settings.filter.freq}
                onChange={(v) => onOscChange('filter', { ...settings.filter, freq: v })}
                min={20}
                max={20000}
                logarithmic
                color="#444"
                dotColor="white"
                size={36}
                layout="horizontal"
                precision={0}
              />
              <Knob 
                label="Res"
                value={settings.filter.res}
                onChange={(v) => onOscChange('filter', { ...settings.filter, res: v })}
                min={0}
                max={1}
                step={0.01}
                color="#444"
                dotColor="white"
                size={36}
                layout="horizontal"
              />
            </div>
        </div>
      </div>

      <div className="flex-grow-[3] flex flex-col min-h-[150px]">
        <ADSR settings={settings.adsr} onChange={onADSRChange} color={color} />
      </div>
    </div>
  );
};

const Synths = ({ oscillators, onOscChange, onADSRChange }) => {
  return (
    <Panel title="Synths" className="flex-grow">
      <div className="h-full flex flex-col md:flex-row justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 h-full w-full">
          {oscillators.map((osc, i) => (
            <div key={osc.id} className="border-b md:border-b-0 md:border-r border-gray-800 last:border-r-0 last:border-b-0 flex-grow flex flex-col">
              <OscillatorPanel
                settings={osc}
                onOscChange={(key, value) => onOscChange(i, key, value)}
                onADSRChange={(key, value) => onADSRChange(i, key, value)}
                color={oscColors[i]}
              />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

const ReverbPanel = ({ settings, onChange }) => {
  const models = ['hall', 'plate', 'room'];
  const fxColor = '#4b5563';

  return (
    <div className="flex flex-col justify-between h-full w-full">
      <h3 className="text-gray-400 p-2 flex items-center gap-1 font-semibold">
          <Rotate3d size={14} /> Reverb
      </h3>
      <div className="flex-grow flex flex-row md:flex-col justify-around items-center p-2 md:space-y-4">
          <div className="w-[60%]">
            <Knob label="Decay" value={settings.decay} onChange={v => onChange('decay', v)} min={0.1} max={6} step={0.1} color="#4b5563" dotColor="#f59e0b" responsive precision={1} />
          </div>
          <div className="w-[60%]">
            <Knob label="Predelay" value={settings.predelay} onChange={v => onChange('predelay', v)} min={0} max={1} step={0.01} color="#4b5563" dotColor="#f59e0b" responsive />
          </div>
      </div>
      <div className="flex justify-around gap-1 p-2 border-t border-gray-800">
        {models.map(model => (
            <button key={model}
                onClick={() => onChange('model', model)}
                 className={`px-2 text-base md:text-sm transition-colors w-full rounded-lg font-medium h-[50px] flex items-center justify-center ${
                    settings.model !== model ? 'bg-fader-bg hover:bg-gray-700 text-white' : 'text-white'
                }`}
                style={settings.model === model ? { backgroundColor: fxColor } : {}}
            >
                {model.charAt(0).toUpperCase() + model.slice(1)}
            </button>
        ))}
      </div>
    </div>
  );
};

const DelayPanel = ({ settings, onChange }) => {
  const divisions = ['Free', '1/2', '1/2d', '1/4', '1/8', '1/8d', '1/16', '1/16d'];
  const fxColor = '#f59e0b';

  return (
    <div className="flex flex-col justify-between h-full">
      <h3 className="text-gray-400 p-2 flex items-center gap-1 font-semibold">
        <Aperture size={14} /> Delay
      </h3>
       <div className="flex-grow flex flex-row md:flex-col justify-around items-center p-2 md:space-y-4 gap-2 md:gap-0">
          <div className="w-[45%] md:w-[60%]">
            <Knob label="Feedback" value={settings.feedback} onChange={v => onChange('feedback', v)} min={0} max={1} step={0.01} color="#f59e0b" dotColor="black" responsive />
          </div>
          <div className="w-[45%] md:w-[60%]">
            <Knob 
                label="Time" 
                value={settings.time} 
                onChange={v => {
                    onChange('time', v);
                    if (settings.division !== 'Free') onChange('division', 'Free');
                }}
                min={1} 
                max={2000} 
                step={1} 
                color="#f59e0b" 
                dotColor="black" 
                responsive
                precision={0}
            />
          </div>
      </div>
      <div className="space-y-2 p-2 border-t border-gray-800">
        <div className="grid grid-cols-4 gap-1">
            {divisions.map(div => (
                <button key={div}
                    onClick={() => onChange('division', div)}
                    className={`px-2 text-base md:text-sm transition-colors w-full rounded-lg font-medium h-[50px] flex items-center justify-center ${
                        settings.division !== div ? 'bg-fader-bg hover:bg-gray-700 text-white' : 'text-black'
                    }`}
                    style={settings.division === div ? { backgroundColor: fxColor } : {}}
                >
                    {div}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};
  
const FX = ({ settings, onChange }) => {
    return (
        <Panel title="FX" className="flex-grow">
            <div className="h-full grid grid-cols-1 md:grid-cols-2">
                <div className="border-b md:border-b-0 md:border-r border-gray-800">
                    <DelayPanel 
                        settings={settings.delay}
                        onChange={(k, v) => onChange('delay', k, v)}
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

const noteToString = (note) => note.name.slice(0, -1);

const Sequencer = ({ steps, stepCount, currentStep, oscColors, onStepClick, onStepToggle, onContextMenu, onClear, isMobile, onDetailsClick }) => {
    const clearButton = (
      <button onClick={onClear} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-base md:text-xs">
        <X size={14} /> Clear
      </button>
    );
  
    const renderStep = (track, stepIndex, trackIndex) => {
        const stepData = track[stepIndex];
        const hasNotes = stepData?.notes.length > 0;
        const isEnabled = stepData?.enabled;
        const isCurrent = currentStep === stepIndex;
        const isBeat = stepIndex % 4 === 0;
  
        const avgVelocity = hasNotes ? stepData.notes.reduce((sum, note) => sum + note.velocity, 0) / stepData.notes.length : 0;
        const probability = stepData.probability ?? 1.0;
    
        const oscOnBg = oscColors[trackIndex];
        const defaultBg = isBeat ? '#222' : '#181818';
    
        const getBackgroundColor = () => {
          if (hasNotes) {
              return hexToRgba(oscOnBg, 0.4 + avgVelocity * 0.6);
          }
          return defaultBg;
        };
        
        const stepRoundingClass = isMobile ? 'rounded' : 'rounded-lg';
        const noteTextClass = isCurrent ? 'text-sm font-bold' : 'text-xs';
        const baseButtonStyles = 'flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-accent';
  
        return (
          <div 
              key={stepIndex} 
              className={`flex-1 h-full ${stepRoundingClass} relative overflow-hidden flex flex-col transition-shadow duration-100 shadow-md ${!isEnabled ? 'opacity-50' : ''}`}
              onContextMenu={(e) => onContextMenu(e, trackIndex, stepIndex)}
              style={{ backgroundColor: getBackgroundColor() }}
          >
              {isCurrent && (
                  <div className="absolute inset-0 bg-white/20 pointer-events-none" />
              )}
              <button
                  onClick={(e) => onStepClick(trackIndex, stepIndex, e.currentTarget.getBoundingClientRect())}
                  aria-label="Edit notes"
                  className={`w-full h-1/2 relative flex items-center justify-center p-1 font-mono hover:bg-black/10 ${baseButtonStyles}`}
              >
                  {hasNotes && (
                      <span className={`text-white/90 leading-tight break-all transition-all text-center ${noteTextClass}`}>
                          {stepData.notes.map(noteToString).join(' ')}
                      </span>
                  )}
                  {probability < 1.0 && (
                      <span className="absolute top-0.5 right-1.5 text-white/70 text-[10px] font-mono pointer-events-none z-10">
                          {`${(probability * 100).toFixed(0)}%`}
                      </span>
                  )}
                  {hasNotes && (
                      <div
                          className="absolute right-0 bottom-0 w-[3px] pointer-events-none"
                          style={{
                              height: `${avgVelocity * 100}%`,
                              backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          }}
                      />
                  )}
              </button>
              
              <div className="h-1/2 w-full flex border-t border-black/30">
                  <button
                      onClick={() => onStepToggle(trackIndex, stepIndex)}
                      aria-label={isEnabled ? "Disable step" : "Enable step"}
                      className={`w-1/2 h-full hover:bg-black/20 ${baseButtonStyles}`}
                  >
                     <div className={`w-3 h-3 rounded-full transition-colors ${isEnabled ? 'bg-gray-300' : 'bg-gray-700 border-2 border-gray-600'}`}/>
                  </button>
                  <button
                      onClick={(e) => {
                          e.stopPropagation();
                          onDetailsClick(trackIndex, stepIndex, e.currentTarget.getBoundingClientRect());
                      }}
                      aria-label="Edit step details"
                      className={`w-1/2 h-full hover:bg-black/20 border-l border-black/30 ${baseButtonStyles}`}
                  >
                      <SlidersHorizontal size={isMobile ? 14 : 16} className="text-gray-400" />
                  </button>
              </div>
          </div>
        );
      };
  
    return (
      <Panel title="Sequencer" className="h-full flex flex-col" headerControls={clearButton}>
        <div className="overflow-auto h-full bg-[#121212]">
          <div className={`flex flex-col gap-2 p-2 h-full justify-around ${!isMobile ? 'min-w-[800px]' : 'pb-4'}`}>
            {steps.map((track, trackIndex) => {
              if (isMobile) {
                return (
                  <div key={trackIndex} className="flex flex-col flex-grow gap-1 border-b-2 border-gray-700/50 pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
                    <div className="flex flex-grow gap-1">
                        {Array.from({ length: 8 }).map((_, i) => renderStep(track, i, trackIndex))}
                    </div>
                    <div className="flex flex-grow gap-1">
                        {Array.from({ length: 8 }).map((_, i) => renderStep(track, i + 8, trackIndex))}
                    </div>
                  </div>
                );
              }
              return (
                <div key={trackIndex} className="flex gap-1 flex-grow">
                  {Array.from({ length: stepCount }).map((_, stepIndex) => renderStep(track, stepIndex, trackIndex))}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    );
};

const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });
  
    useEffect(() => {
      const media = window.matchMedia(query);
      const listener = () => setMatches(media.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }, [query]);
  
    return matches;
  };

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const whiteKeyWidth = 16 * 1.2;
const blackKeyWidth = 10 * 1.2;
const pianoHeight = 80;
const whiteKeyHeight = pianoHeight;
const blackKeyHeight = 50;

const PianoRoll = ({ activeNotes, onClose, onNoteToggle, rect, oscColor, isMobile }) => {
    const [octave, setOctave] = useState(3);
    
    const twoOctaveNotes = [
        ...notes.map(n => ({ note: n, octave: octave })),
        ...notes.map(n => ({ note: n, octave: octave + 1 }))
    ];

    const whiteKeys = twoOctaveNotes.filter(k => !k.note.includes('#'));
    const blackKeys = twoOctaveNotes.filter(k => k.note.includes('#'));
    
    const pianoWidth = whiteKeys.length * whiteKeyWidth;

    const changeOctave = (delta) => { setOctave(prev => Math.max(0, Math.min(6, prev + delta))); }

    let top, left, transform;

    if (isMobile) {
        top = '50%';
        left = '50%';
        transform = 'translate(-50%, -50%)';
    } else {
        const windowWidth = window.innerWidth;
        const componentWidth = pianoWidth + 40;
        const componentHeight = pianoHeight + 100;
    
        let topPos = rect.top - componentHeight;
        if (topPos < 10) { topPos = rect.bottom + 10; }
    
        let leftPos = rect.left + rect.width / 2 - componentWidth / 2;
        if (leftPos < 10) leftPos = 10;
        if (leftPos + componentWidth > windowWidth - 10) { leftPos = windowWidth - componentWidth - 10; }
        top = `${topPos}px`;
        left = `${leftPos}px`;
    }

    return (
        <div 
            className="fixed inset-0 z-[1003] bg-black/50 backdrop-blur-sm" 
            onMouseDown={onClose}
        >
            <div 
                className="absolute bg-panel-bg rounded-xl p-3 flex flex-col gap-2 shadow-2xl"
                style={{ top, left, transform }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center px-1 border-b border-gray-800 pb-2">
                    <h3 className="text-base md:text-xs uppercase tracking-widest text-gray-400 font-semibold">C{octave} - B{octave+1}</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => changeOctave(-1)} disabled={octave === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
                        <span className="text-base md:text-sm font-bold text-gray-300">Octave Range</span>
                        <button onClick={() => changeOctave(1)} disabled={octave === 6} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
                    </div>
                     <button onClick={onClose} className="text-xl leading-none w-6 h-6 text-gray-500 hover:text-white rounded-full transition-colors">&times;</button>
                </div>
                
                <div className="relative mx-auto" style={{ width: `${pianoWidth}px`, height: `${pianoHeight}px` }}>
                    {/* Render White Keys */}
                    {whiteKeys.map((key, index) => {
                        const keyName = `${key.note}${key.octave}`;
                        const isActive = activeNotes.some(n => n.name === keyName);
                        return (
                             <button
                                key={keyName}
                                onClick={() => onNoteToggle(keyName)}
                                className={`absolute top-0 bottom-0 transition-colors border-r border-b border-gray-900 text-black text-base md:text-xs font-semibold rounded-b-lg flex items-end justify-center pb-1 ${
                                    !isActive ? 'bg-gray-200 hover:bg-gray-300' : 'text-white'
                                }`}
                                style={{
                                    left: `${index * whiteKeyWidth}px`,
                                    width: `${whiteKeyWidth}px`,
                                    height: `${whiteKeyHeight}px`,
                                    backgroundColor: isActive ? oscColor : undefined,
                                }}
                            >
                                {key.note}
                            </button>
                        );
                    })}
                     {/* Render Black Keys */}
                    {blackKeys.map((key) => {
                        const keyName = `${key.note}${key.octave}`;
                        const isActive = activeNotes.some(n => n.name === keyName);
                        
                        const whiteKeysInOctaveBefore = notes.slice(0, notes.indexOf(key.note)).filter(n => !n.includes('#')).length;
                        const octaveOffset = (key.octave - octave) * 7 * whiteKeyWidth;
                        const noteOffset = whiteKeysInOctaveBefore * whiteKeyWidth - (blackKeyWidth / 2);

                        return (
                            <button
                                key={keyName}
                                onClick={() => onNoteToggle(keyName)}
                                className={`absolute top-0 z-10 transition-colors border border-black/50 rounded-b-lg
                                    ${!isActive ? 'bg-black hover:bg-gray-800' : ''}`}
                                style={{
                                    left: `${octaveOffset + noteOffset}px`,
                                    width: `${blackKeyWidth}px`,
                                    height: `${blackKeyHeight}px`,
                                    backgroundColor: isActive ? oscColor : undefined,
                                    opacity: isActive ? 0.9 : 1.0,
                                }}
                            />
                        );
                    })}
                </div>

                <div className="text-center text-base md:text-xs text-gray-500 min-h-[16px] pt-1">
                    {activeNotes.length}/4 notes selected
                </div>
            </div>
        </div>
    );
};

const ContextMenu = ({ x, y, onCopy, onPaste, onClose, isPasteDisabled, onToggle, isEnabled }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) { onClose(); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [onClose]);

  // Fix: Explicitly type menuStyle as React.CSSProperties to resolve position property type mismatch.
  const menuStyle: React.CSSProperties = { top: `${y}px`, left: `${x}px`, position: 'fixed', zIndex: 1001 };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-gray-800/30 backdrop-blur-[4px] rounded-lg shadow-xl text-gray-200 w-36 overflow-hidden"
      onClick={(e) => e.stopPropagation()} 
      onContextMenu={(e) => e.preventDefault()} 
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-2 hover:bg-primary-accent/50 hover:text-white transition-colors text-base"
      >
        {isEnabled ? 'Disable Step' : 'Enable Step'}
      </button>
      <button
        onClick={onCopy}
        className="w-full text-left px-4 py-2 hover:bg-primary-accent/50 hover:text-white transition-colors text-base"
      >
        Copy
      </button>
      <button
        onClick={onPaste}
        disabled={isPasteDisabled}
        className="w-full text-left px-4 py-2 hover:bg-primary-accent/50 transition-colors disabled:text-gray-500 disabled:hover:bg-transparent text-base"
      >
        Paste
      </button>
    </div>
  );
};

const VerticalSlider = ({ label, value, onChange, min = 0, max = 1, step = 0.01, color = '#f59e0b' }) => {
    const sliderRef = useRef(null);
  
    const handleValueChange = (clientY) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const range = max - min;
      let newValue = min + range * percent;
      newValue = Math.round(newValue / step) * step;
      onChange(Math.max(min, Math.min(max, newValue)));
    };
  
    const handleMouseMove = useCallback((e) => {
      handleValueChange(e.clientY);
    }, []);

    const handleTouchMove = useCallback((e) => {
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
  
    const handleMouseDown = (e) => {
      handleValueChange(e.clientY);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    const handleTouchStart = (e) => {
        handleValueChange(e.touches[0].clientY);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
    }
  
    const percentage = ((value - min) / (max - min)) * 100;
  
    return (
      <div className="flex flex-col items-center gap-2 select-none">
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
  
const StepDetailsPopover = ({ stepData, rect, onClose, onChange, trackIndex, stepIndex, isMobile }) => {
    let top, left, transform;

    if (isMobile) {
        top = '50%';
        left = '50%';
        transform = 'translate(-50%, -50%)';
    } else {
        const componentWidth = 150;
        const componentHeight = 220;
        const windowWidth = window.innerWidth;

        let topPos = rect.top - componentHeight - 10;
        if (topPos < 10) { topPos = rect.bottom + 10; }

        let leftPos = rect.left + rect.width / 2 - componentWidth / 2;
        if (leftPos < 10) leftPos = 10;
        if (leftPos + componentWidth > windowWidth - 10) { leftPos = windowWidth - componentWidth - 10; }
        
        top = `${topPos}px`;
        left = `${leftPos}px`;
        transform = 'none';
    }
    
    const avgVelocity = stepData.notes.length > 0
        ? stepData.notes.reduce((sum, note) => sum + note.velocity, 0) / stepData.notes.length
        : 0.8;
        
    const oscColor = oscColors[trackIndex];

    return (
        <div 
            className="fixed inset-0 z-[1003] bg-black/50 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <div 
                className="absolute bg-panel-bg rounded-xl p-4 flex flex-col gap-2 shadow-2xl"
                style={{ top, left, transform, width: `150px`, height: `220px` }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex justify-around items-center h-full">
                    <VerticalSlider 
                        label="Velocity"
                        value={avgVelocity}
                        onChange={(v) => onChange(trackIndex, stepIndex, 'velocity', v)}
                        color={oscColor}
                    />
                     <VerticalSlider 
                        label="Probability"
                        value={stepData.probability ?? 1.0}
                        onChange={(v) => onChange(trackIndex, stepIndex, 'probability', v)}
                        color={oscColor}
                    />
                </div>
            </div>
        </div>
    );
};

const SynthView = () => {
  const [synthState, setSynthState] = useState({
    transport: initialTransport, oscillators: initialOsc, sequencer: initialSequencer, fx: initialFX
  });
  const [currentStep, setCurrentStep] = useState(-1);
  const [editingStep, setEditingStep] = useState(null);
  const [editingStepDetails, setEditingStepDetails] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [copiedStep, setCopiedStep] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const mainContentRef = useRef(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isSequencerVisible, setSequencerVisible] = useState(false);

  useEffect(() => {
    setSequencerVisible(!isMobile);
  }, [isMobile]);

  const { start, stop, initialize } = useSynth(synthState, setCurrentStep);

  const handleScroll = () => {
    if (mainContentRef.current) {
        setIsScrolled(mainContentRef.current.scrollTop > 10);
    }
  };

  useEffect(() => {
    const init = () => {
      initialize();
      window.removeEventListener('click', init);
      window.removeEventListener('keydown', init);
      window.removeEventListener('touchstart', init);
    };
    window.addEventListener('click', init);
    window.addEventListener('keydown', init);
    window.addEventListener('touchstart', init);
    return () => {
      window.removeEventListener('click', init);
      window.removeEventListener('keydown', init);
      window.removeEventListener('touchstart', init);
    };
  }, [initialize]);

  useEffect(() => {
    if (synthState.transport.isPlaying) { start(); } else { stop(); }
  }, [synthState.transport.isPlaying, start, stop]);
  
  const handleFXChange = useCallback((fx, key, value) => {
     setSynthState(prev => ({ ...prev, fx: { ...prev.fx, [fx]: { ...prev.fx[fx], [key]: value } }, }));
  }, []);

  useEffect(() => {
    const { division } = synthState.fx.delay;
    if (division === 'Free') return;

    const { bpm } = synthState.transport;
    const secondsPerBeat = 60 / bpm;
    let timeInSeconds = 0;
    switch (division) {
        case '1/2': timeInSeconds = secondsPerBeat * 2; break;
        case '1/2d': timeInSeconds = secondsPerBeat * 3; break;
        case '1/4': timeInSeconds = secondsPerBeat; break;
        case '1/8': timeInSeconds = secondsPerBeat / 2; break;
        case '1/8d': timeInSeconds = (secondsPerBeat / 2) * 1.5; break;
        case '1/16': timeInSeconds = secondsPerBeat / 4; break;
        case '1/16d': timeInSeconds = (secondsPerBeat / 4) * 1.5; break;
    }
    const timeInMs = timeInSeconds * 1000;
    
    if (Math.abs(synthState.fx.delay.time - timeInMs) > 1e-6) {
        handleFXChange('delay', 'time', timeInMs);
    }
  }, [synthState.transport.bpm, synthState.fx.delay.division, handleFXChange, synthState.fx.delay.time]);


  const handleTransportChange = useCallback((key, value) => {
    setSynthState(prev => ({ ...prev, transport: { ...prev.transport, [key]: value } }));
  }, []);

  const handleOscChange = useCallback((index, key, value) => {
    setSynthState(prev => {
      const newOscs = JSON.parse(JSON.stringify(prev.oscillators));
      newOscs[index][key] = value;
      return { ...prev, oscillators: newOscs };
    });
  }, []);
  
  const handleADSRChange = useCallback((oscIndex, key, value) => {
    setSynthState(prev => {
        const newOscs = JSON.parse(JSON.stringify(prev.oscillators));
        newOscs[oscIndex].adsr[key] = value;
        return { ...prev, oscillators: newOscs };
    });
  }, []);

  const handleStepToggle = useCallback((track, step) => {
    setSynthState(prev => {
        const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
        newSteps[track][step].enabled = !newSteps[track][step].enabled;
        return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
    });
  }, []);

  const handleStepDetailsChange = useCallback((track, step, key, value) => {
    setSynthState(prev => {
        const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
        const stepData = newSteps[track][step];
        if (key === 'velocity') {
            stepData.notes.forEach(note => {
                note.velocity = value;
            });
        } else if (key === 'probability') {
            stepData.probability = value;
        }
        return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
    });
  }, []);


  const handleNoteToggle = useCallback((noteName) => {
    if (!editingStep) return;
    const { track, step } = editingStep;
    setSynthState(prev => {
      const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
      const currentStepData = newSteps[track][step];
      const noteIndex = currentStepData.notes.findIndex(n => n.name === noteName);

      if (noteIndex > -1) {
        currentStepData.notes.splice(noteIndex, 1);
      } else if (currentStepData.notes.length < 4) {
        const newNote = { name: noteName, velocity: 0.8, duration: 1.0 };
        currentStepData.notes.push(newNote);
        currentStepData.notes.sort((a, b) => {
            const octaveA = parseInt(a.name.slice(-1));
            const octaveB = parseInt(b.name.slice(-1));
            if (octaveA !== octaveB) return octaveA - octaveB;
            const noteNameA = a.name.slice(0, -1);
            const noteNameB = b.name.slice(0, -1);
            return noteNames.indexOf(noteNameA) - noteNames.indexOf(noteNameB);
        });
      }
      
      return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
    });
  }, [editingStep]);

  const handleContextMenu = useCallback((e, trackIndex, stepIndex) => {
    e.preventDefault();
    const isEnabled = synthState.sequencer.steps[trackIndex][stepIndex].enabled;
    setContextMenu({ x: e.clientX, y: e.clientY, trackIndex, stepIndex, isEnabled });
  }, [synthState.sequencer.steps]);

  const handleCopy = useCallback(() => {
    if (!contextMenu) return;
    const { trackIndex, stepIndex } = contextMenu;
    const stepToCopy = synthState.sequencer.steps[trackIndex][stepIndex];
    setCopiedStep(JSON.parse(JSON.stringify(stepToCopy)));
    setContextMenu(null);
  }, [contextMenu, synthState.sequencer.steps]);
  
  const handlePaste = useCallback(() => {
    if (!contextMenu || !copiedStep) return;
    const { trackIndex, stepIndex } = contextMenu;
    setSynthState(prev => {
      const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
      newSteps[trackIndex][stepIndex] = JSON.parse(JSON.stringify(copiedStep));
      return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
    });
    setContextMenu(null);
  }, [contextMenu, copiedStep]);

  const handleClearSequencer = useCallback(() => {
    if (window.confirm("Are you sure you want to clear the entire sequence? This cannot be undone.")) {
        setSynthState(prev => {
            const newSteps = Array(3).fill(0).map(() => Array(16).fill({ notes: [], enabled: true, probability: 1.0 }));
            return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
        });
    }
  }, []);
  
  const activeNotesForPiano = editingStep ? synthState.sequencer.steps[editingStep.track][editingStep.step].notes : [];
  const activeStepDetails = editingStepDetails ? synthState.sequencer.steps[editingStepDetails.track][editingStepDetails.step] : null;


  return (
    <div className="flex flex-col h-screen w-full bg-synth-bg text-gray-300 antialiased overflow-hidden" role="application" onClick={() => setContextMenu(null)}>
      <Transport
          settings={synthState.transport}
          onChange={handleTransportChange}
          isScrolled={isScrolled}
          isMobile={isMobile}
      />

      <div className="flex-grow flex flex-col min-h-0 relative">
        <div 
            ref={mainContentRef} 
            onScroll={handleScroll} 
            className={`w-full flex flex-col
                ${isMobile 
                    ? 'flex-grow overflow-y-auto' 
                    : 'lg:flex-none lg:h-auto lg:overflow-visible flex-grow overflow-y-auto' 
                }
            `}
        >
            <main className={`flex flex-col lg:flex-row h-full lg:h-auto`}>
            <div className="flex flex-col w-full lg:w-2/3 xl:w-3/5 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800">
                <Synths
                oscillators={synthState.oscillators}
                onOscChange={handleOscChange}
                onADSRChange={handleADSRChange}
                />
            </div>
            <div className="flex-grow flex flex-col w-full lg:w-1/3 xl:w-2/5">
                <FX settings={synthState.fx} onChange={handleFXChange} />
            </div>
            </main>
        </div>

        {isMobile && isSequencerVisible && (
            <div
            className="fixed inset-0 bg-black/50 z-[1001] lg:hidden"
            onClick={() => setSequencerVisible(false)}
            />
        )}

        <footer id="sequencer-panel" className={`bg-panel-bg border-t border-gray-800 transition-transform duration-300 ease-in-out flex flex-col
            ${isMobile 
                ? 'fixed bottom-0 left-0 right-0 w-full z-[1002] h-[90vh]' 
                : 'relative'
            }
            ${isMobile && !isSequencerVisible ? 'translate-y-full' : 'translate-y-0'}
            ${!isMobile ? 'md:h-1/3 md:flex-shrink-0 lg:h-auto lg:flex-grow lg:flex-shrink lg:min-h-0' : ''} 
            `}
            onClick={(e) => e.stopPropagation()}
        >
            {isMobile && (
                <button
                    onClick={() => setSequencerVisible(prev => !prev)}
                    className="sequencer-toggle-mobile absolute -top-8 right-4 w-[70px] h-8 text-sm z-[1005] flex items-center justify-center lg:hidden rounded-t-lg shadow-lg"
                    aria-controls="sequencer-panel"
                    aria-expanded={isSequencerVisible}
                >
                    <span>Seq</span>
                </button>
            )}
            <Sequencer
            steps={synthState.sequencer.steps}
            stepCount={synthState.sequencer.stepCount}
            currentStep={currentStep}
            oscColors={oscColors}
            onStepClick={(track, step, rect) => setEditingStep({track, step, rect})}
            onDetailsClick={(track, step, rect) => setEditingStepDetails({track, step, rect})}
            onStepToggle={handleStepToggle}
            onContextMenu={handleContextMenu}
            onClear={handleClearSequencer}
            isMobile={isMobile}
            />
        </footer>
      </div>

      {editingStep && (
        <PianoRoll 
            activeNotes={activeNotesForPiano}
            onClose={() => setEditingStep(null)}
            onNoteToggle={handleNoteToggle}
            rect={editingStep.rect}
            oscColor={oscColors[editingStep.track]}
            isMobile={isMobile}
        />
      )}
      {editingStepDetails && (
        <StepDetailsPopover
            stepData={activeStepDetails}
            rect={editingStepDetails.rect}
            onClose={() => setEditingStepDetails(null)}
            onChange={handleStepDetailsChange}
            trackIndex={editingStepDetails.track}
            stepIndex={editingStepDetails.step}
            isMobile={isMobile}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onClose={() => setContextMenu(null)}
          isPasteDisabled={!copiedStep}
          isEnabled={contextMenu.isEnabled}
          onToggle={() => {
            handleStepToggle(contextMenu.trackIndex, contextMenu.stepIndex);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
};

const App = () => {
    return (
      <React.Fragment>
        <GlobalStyles />
        <div className="min-h-screen w-screen bg-synth-bg flex flex-col font-sans text-gray-300 antialiased text-base">
            <SynthView />
        </div>
      </React.Fragment>
    );
};

// --- BOOTSTRAP ---
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
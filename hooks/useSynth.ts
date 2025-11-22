
import { useEffect, useRef, useCallback } from 'react';
import { SynthState, FxNodes, OscFxSendNodes } from '../types';
import { Voice } from '../audio/Voice';
import { generateImpulseResponse, makeDistortionCurve } from '../audio/effects';
import { shiftNoteByFifths } from '../utils';

const MAX_VOICES_PER_OSC = 8;
const OSC_GAIN_SCALE = 0.2; // Scale down internal gain to prevent clipping at max volume

export const useSynth = (state: SynthState, onStepChange: (steps: { main: number, shift: number }) => void) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voicePoolRef = useRef<Voice[][]>([]);
  const activeVoicesRef = useRef<Voice[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const oscGainNodesRef = useRef<GainNode[]>([]);
  const oscFilterNodesRef = useRef<BiquadFilterNode[]>([]);
  const fxNodesRef = useRef<FxNodes>({});
  const oscFxSendNodesRef = useRef<OscFxSendNodes[]>([]);
  const metronomeGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const currentStepRef = useRef(-1);
  const totalTicksRef = useRef(0);
  const nextStepTimeRef = useRef(0);
  const stateRef = useRef(state);
  const oscAnalysersRef = useRef<AnalyserNode[]>([]);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  
  // Visual Sync Queue
  const visualQueueRef = useRef<{ main: number, shift: number, time: number }[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Initialize MIDI Access
  useEffect(() => {
    if (typeof navigator.requestMIDIAccess === 'function') {
        navigator.requestMIDIAccess().then((access) => {
            midiAccessRef.current = access;
        }).catch(err => console.warn("MIDI Access Failed", err));
    }
  }, []);

  const initialize = useCallback(async () => {
    if (audioCtxRef.current) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = context;

      // Master Chain: MasterGain -> SoftClipper -> MasterLowPass -> Compressor -> Destination
      masterGainRef.current = context.createGain();
      
      // 1. Soft Clipper (Invisible Limiter)
      const softClipper = context.createWaveShaper();
      const curve = new Float32Array(4096);
      for (let i = 0; i < 4096; i++) {
          const x = (i * 2) / 4096 - 1;
          curve[i] = Math.tanh(x);
      }
      softClipper.curve = curve;
      
      // 2. Master Safety Filter (20kHz hard cut)
      const masterLowPass = context.createBiquadFilter();
      masterLowPass.type = 'lowpass';
      masterLowPass.frequency.value = 20000;
      masterLowPass.Q.value = 0; // Clean roll-off

      // 3. Compressor
      compressorRef.current = context.createDynamicsCompressor();
      compressorRef.current.threshold.value = -20;
      compressorRef.current.knee.value = 30;
      compressorRef.current.ratio.value = 12;
      compressorRef.current.attack.value = 0.003;
      compressorRef.current.release.value = 0.25;

      // Connect the chain
      masterGainRef.current.connect(softClipper);
      softClipper.connect(masterLowPass);
      masterLowPass.connect(compressorRef.current);
      compressorRef.current.connect(context.destination);
      
      metronomeGainRef.current = context.createGain();
      metronomeGainRef.current.gain.value = 0.5;
      metronomeGainRef.current.connect(masterGainRef.current);

      // --- CREATE FX NODES ---
      const delay = context.createDelay(5);
      const delayFeedback = context.createGain();
      const delayInputGain = context.createGain();

      const distoInputGain = context.createGain();
      const distoShaper = context.createWaveShaper();
      const distoOutputGain = context.createGain();
      distoShaper.oversample = '4x'; 

      const reverb = context.createConvolver();
      reverb.buffer = await generateImpulseResponse(context, state.fx.reverb.model, state.fx.reverb.decay, 4);
      const reverbWetGain = context.createGain();
      const reverbInputGain = context.createGain();
      reverbWetGain.gain.value = 1.0; 

      // --- CONFIGURE & CONNECT FX ---
      delayFeedback.gain.value = state.fx.delay.feedback;
      delayInputGain.connect(delay);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
      delay.connect(masterGainRef.current);

      distoInputGain.gain.value = 1.0; 
      distoInputGain.connect(distoShaper);
      distoShaper.connect(distoOutputGain);
      distoOutputGain.connect(masterGainRef.current);

      reverbInputGain.connect(reverbWetGain);
      reverbWetGain.connect(reverb);
      reverb.connect(masterGainRef.current);

      fxNodesRef.current = { 
          reverb, reverbWetGain, delay, delayFeedback, delayInputGain, reverbInputGain,
          distoInputGain, distoShaper, distoOutputGain
      };

      // Use current state from Ref to ensure we capture any changes made before context init
      const currentOscillators = stateRef.current.oscillators;

      const oscGains = currentOscillators.map((osc) => {
          const g = context.createGain();
          // CRITICAL FIX: Initialize with correctly scaled volume immediately
          // Without this, gains default to 1.0 causing a loud burst until the first useEffect runs
          const initialGain = osc.muted ? 0 : osc.vol * OSC_GAIN_SCALE;
          g.gain.value = initialGain;
          return g;
      });
      oscGainNodesRef.current = oscGains;
      
      oscFilterNodesRef.current = currentOscillators.map(() => context.createBiquadFilter());

      oscAnalysersRef.current = currentOscillators.map(() => {
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        return analyser;
      });

      voicePoolRef.current = currentOscillators.map((oscSettings, oscIndex) => {
        const pool = [];
        const oscGain = oscGainNodesRef.current[oscIndex];
        const oscFilter = oscFilterNodesRef.current[oscIndex];
        const analyser = oscAnalysersRef.current[oscIndex];
        
        oscFilter.type = 'lowpass';
        oscFilter.frequency.value = oscSettings.filter.freq;
        // Clamp Q to safe values to prevent self-oscillation screaming
        const safeQ = Math.min(30, Math.pow(oscSettings.filter.res, 3) * 20 + 0.1);
        oscFilter.Q.value = safeQ;

        const delaySend = context.createGain();
        const distoSend = context.createGain();
        const reverbSend = context.createGain();
        
        delaySend.gain.value = oscSettings.sends.delay;
        distoSend.gain.value = oscSettings.sends.disto;
        reverbSend.gain.value = oscSettings.sends.reverb;

        delaySend.connect(delayInputGain);
        distoSend.connect(distoInputGain);
        reverbSend.connect(reverbInputGain);

        oscFxSendNodesRef.current.push({ delay: delaySend, reverb: reverbSend, disto: distoSend });
        
        oscGain.connect(oscFilter);
        oscFilter.connect(masterGainRef.current!);
        oscFilter.connect(delaySend); 
        oscFilter.connect(distoSend);
        oscFilter.connect(reverbSend);
        oscFilter.connect(analyser);

        for (let i = 0; i < MAX_VOICES_PER_OSC; i++) {
          const voice = new Voice(context, oscSettings.adsr);
          voice.connect(oscGain);
          pool.push(voice);
        }
        return pool;
      });
    } catch (e) { console.error("Web Audio API is not supported.", e); }
  }, [state.fx.delay.feedback, state.fx.reverb.decay, state.fx.reverb.model]);

  const playMetronomeClick = useCallback((time: number) => {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx || !metronomeGainRef.current) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(1000, time);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(gain);
      gain.connect(metronomeGainRef.current);
      osc.start(time);
      osc.stop(time + 0.05);
  }, []);

  const sendMidiMessage = useCallback((data: number[], timestamp?: number) => {
      if (!midiAccessRef.current) return;
      midiAccessRef.current.outputs.forEach(output => {
          output.send(data, timestamp);
      });
  }, []);

  const tick = useCallback((scheduledTime: number, stepDuration: number) => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    const { sequencer, oscillators, transport } = stateRef.current;
    const { stepCount, steps, shiftSteps, shiftDuration } = sequencer;
    
    activeVoicesRef.current.forEach(voice => voice.off(audioCtx, scheduledTime));
    activeVoicesRef.current = [];
    
    const nextStep = (currentStepRef.current + 1) % stepCount;
    currentStepRef.current = nextStep;
    
    const multiplier = shiftDuration || 1;
    const shiftStepIndex = Math.floor(totalTicksRef.current / multiplier) % 16;
    totalTicksRef.current++;

    visualQueueRef.current.push({ 
        main: nextStep, 
        shift: shiftStepIndex, 
        time: scheduledTime 
    });

    if (transport.metronomeOn && nextStep % 4 === 0) {
        playMetronomeClick(scheduledTime);
    }

    if (transport.midiClockOut && midiAccessRef.current) {
        const clockInterval = stepDuration / 6;
        for (let i = 0; i < 6; i++) {
            const pulseTime = scheduledTime + i * clockInterval;
            const midiTime = performance.now() + (pulseTime - audioCtx.currentTime) * 1000;
            sendMidiMessage([0xF8], midiTime);
        }
    }
    
    const currentShift = shiftSteps[shiftStepIndex] || 0;

    steps.forEach((track, trackIndex) => {
      const stepData = track[nextStep];
      const shouldPlay = stepData && stepData.enabled && stepData.notes.length > 0 && (Math.random() < (stepData.probability ?? 1.0));

      if (shouldPlay) {
        const oscSettings = oscillators[trackIndex];
        const voicePool = voicePoolRef.current[trackIndex];
        
        stepData.notes.forEach(note => {
          const voice = voicePool.find(v => v.isAvailable);
          if (voice) {
            voice.update(oscSettings);
            const noteToPlay = currentShift !== 0 
                ? shiftNoteByFifths(note.name, currentShift) 
                : note.name;
            voice.on(noteToPlay, oscSettings.octave, audioCtx, scheduledTime, note.velocity);
            activeVoicesRef.current.push(voice);
          }
        });
      }
    });
  }, [playMetronomeClick, sendMidiMessage]);

  const scheduler = useCallback(() => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    while (nextStepTimeRef.current < now + 0.1) {
        const { bpm, swing } = stateRef.current.transport;
        const secondsPerBeat = 60.0 / bpm;
        const sixteenthNoteDuration = 0.25 * secondsPerBeat;
        
        let timeToNextStep = sixteenthNoteDuration;
        const nextStepIndex = (currentStepRef.current + 1) % 16;
        const isNextStepOdd = nextStepIndex % 2 !== 0;
        
        if (swing !== 50) {
            const swingRatio = swing / 100;
            const swingOffset = (swingRatio - 0.5) * sixteenthNoteDuration;
            if (isNextStepOdd) {
                timeToNextStep += swingOffset;
            } else {
                timeToNextStep -= swingOffset;
            }
        }
        
        tick(nextStepTimeRef.current, timeToNextStep);
        nextStepTimeRef.current += timeToNextStep;
    }
    timerRef.current = window.setTimeout(scheduler, 25);
  }, [tick]);

  useEffect(() => {
    const draw = () => {
        if (audioCtxRef.current && stateRef.current.transport.isPlaying) {
            const now = audioCtxRef.current.currentTime;
            while (visualQueueRef.current.length > 0 && visualQueueRef.current[0].time <= now) {
                const event = visualQueueRef.current.shift();
                if (event) {
                    onStepChange({ main: event.main, shift: event.shift });
                }
            }
        }
        animationFrameRef.current = requestAnimationFrame(draw);
    };
    animationFrameRef.current = requestAnimationFrame(draw);
    return () => {
        if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [onStepChange]);

  const start = useCallback(() => {
    if (!audioCtxRef.current) { initialize(); }
    if (audioCtxRef.current?.state === 'suspended') { audioCtxRef.current.resume(); }
    if (!timerRef.current) {
      currentStepRef.current = -1;
      totalTicksRef.current = 0; 
      visualQueueRef.current = []; 
      nextStepTimeRef.current = (audioCtxRef.current?.currentTime ?? 0) + 0.05;
      
      if (stateRef.current.transport.midiClockOut) {
          sendMidiMessage([0xFA]);
      }
      
      scheduler();
    }
  }, [initialize, scheduler, sendMidiMessage]);
  
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      currentStepRef.current = -1;
      totalTicksRef.current = 0;
      
      visualQueueRef.current = [];
      onStepChange({ main: -1, shift: -1 });
      
      if (stateRef.current.transport.midiClockOut) {
          sendMidiMessage([0xFC]);
      }

      if (audioCtxRef.current) {
        activeVoicesRef.current.forEach(v => v.off(audioCtxRef.current!, audioCtxRef.current!.currentTime));
        activeVoicesRef.current = [];
      }
    }
  }, [onStepChange, sendMidiMessage]);
  
  useEffect(() => { masterGainRef.current?.gain.setTargetAtTime(state.transport.masterVolume, audioCtxRef.current?.currentTime ?? 0, 0.01); }, [state.transport.masterVolume]);
  
  useEffect(() => {
      if (!audioCtxRef.current) return;
      const now = audioCtxRef.current.currentTime;
      state.oscillators.forEach((osc, i) => {
          // Apply OSC_GAIN_SCALE to scale the UI volume (0-1) to a safe internal range (0-0.2)
          const gainValue = osc.muted ? 0 : osc.vol * OSC_GAIN_SCALE;
          
          if (gainValue < 0.001) {
               oscGainNodesRef.current[i]?.gain.setTargetAtTime(0, now, 0.01);
          } else {
               oscGainNodesRef.current[i]?.gain.setTargetAtTime(gainValue, now, 0.01);
          }
          
          const sends = oscFxSendNodesRef.current[i];
          if (sends) {
            sends.delay.gain.setTargetAtTime(osc.sends.delay, now, 0.02);
            sends.disto.gain.setTargetAtTime(osc.sends.disto, now, 0.02);
            sends.reverb.gain.setTargetAtTime(osc.sends.reverb, now, 0.02);
          }

          const oscFilter = oscFilterNodesRef.current[i];
          if (oscFilter) {
            const safeQ = Math.min(30, Math.pow(osc.filter.res, 3) * 20 + 0.1);
            oscFilter.frequency.setTargetAtTime(osc.filter.freq, now, 0.02);
            oscFilter.Q.setTargetAtTime(safeQ, now, 0.02);
          }
      });
  }, [state.oscillators]);

  useEffect(() => {
    const audioCtx = audioCtxRef.current;
    const reverbNode = fxNodesRef.current.reverb;
    if (!audioCtx || !reverbNode) return;
    const { model, decay } = state.fx.reverb;
    const timeoutId = setTimeout(() => {
        generateImpulseResponse(audioCtx, model, decay, 4).then(impulse => {
            if(reverbNode) reverbNode.buffer = impulse;
        });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [state.fx.reverb.model, state.fx.reverb.decay]);

  useEffect(() => {
      const { distoShaper, distoOutputGain, distoInputGain } = fxNodesRef.current;
      if (!distoShaper || !distoOutputGain || !distoInputGain) return;
      
      const { depth, model } = state.fx.distortion;
      const audioCtx = audioCtxRef.current;
      
      distoShaper.curve = makeDistortionCurve(depth, model);
      
      let inputBoost = 1.0;
      let outputAtten = 1.0;

      if (model === 'fuzz') {
          inputBoost = 2.0 + depth * 10.0; 
          outputAtten = 0.5 - (depth * 0.2); 
      } else if (model === 'overdrive') {
          inputBoost = 1.0 + depth * 5.0;
          outputAtten = 0.8 - (depth * 0.2);
      } else if (model === 'crush') {
          inputBoost = 1.0;
          outputAtten = 1.0;
      }
      
      if (audioCtx) {
        distoInputGain.gain.setTargetAtTime(inputBoost, audioCtx.currentTime, 0.05);
        distoOutputGain.gain.setTargetAtTime(outputAtten, audioCtx.currentTime, 0.05);
      }

  }, [state.fx.distortion]);

  useEffect(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    const { delay } = state.fx;
    const { delay: delayNode, delayFeedback } = fxNodesRef.current;
    
    if (!delayNode || !delayFeedback) return;
    
    delayNode.delayTime.setTargetAtTime(delay.time / 1000, now, 0.02);
    delayFeedback.gain.setTargetAtTime(delay.feedback, now, 0.02);
  }, [state.fx]);

  return { start, stop, initialize, analysers: oscAnalysersRef };
};

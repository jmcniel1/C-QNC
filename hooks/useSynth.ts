import { useEffect, useRef, useCallback } from 'react';
import { SynthState, FxNodes, OscFxSendNodes, Note, ArpMode } from '../types';
import { Voice } from '../audio/Voice';
import { generateImpulseResponse, makeDistortionCurve } from '../audio/effects';
import { shiftNoteByFifths } from '../utils';
import { noteNames } from '../constants';

const MAX_VOICES_PER_OSC = 8;
const OSC_GAIN_SCALE = 0.1; // Scale down internal gain to prevent clipping at max volume

interface ActiveArp {
    notes: Note[];
    ticksRemaining: number;
    currentIndex: number;
    mode: ArpMode;
}

export const useSynth = (state: SynthState, onStepChange: (steps: { main: number, shift: number, arpTriggers: number[] }) => void) => {
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
  
  // ARP State
  const activeArpsRef = useRef<{ [trackIndex: number]: ActiveArp | null }>({});

  // Visual Sync Queue
  const visualQueueRef = useRef<{ main: number, shift: number, time: number, arpTriggers: number[] }[]>([]);
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
      // Dub Delay Filter
      const delayFilter = context.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2500;
      delayFilter.Q.value = 0.7;

      const distoInputGain = context.createGain();
      const distoShaper = context.createWaveShaper();
      const distoOutputGain = context.createGain();
      distoShaper.oversample = '4x'; 

      const reverb = context.createConvolver();
      // Init reverb with default state time, adding 0.5s tail
      reverb.buffer = await generateImpulseResponse(context, state.fx.reverb.model, state.fx.reverb.time, state.fx.reverb.time + 0.5);
      const reverbWetGain = context.createGain();
      const reverbInputGain = context.createGain();
      const reverbOutputGain = context.createGain();
      
      reverbWetGain.gain.value = state.fx.reverb.depth; 
      reverbOutputGain.gain.value = state.fx.reverb.gain;

      // --- CONFIGURE & CONNECT FX ---
      delayFeedback.gain.value = state.fx.delay.feedback;
      delayInputGain.connect(delay);
      // Delay Feedback Loop with Filter (Dub Style)
      delay.connect(delayFeedback);
      delayFeedback.connect(delayFilter);
      delayFilter.connect(delay);
      
      delay.connect(masterGainRef.current);

      distoInputGain.gain.value = 1.0; 
      distoInputGain.connect(distoShaper);
      distoShaper.connect(distoOutputGain);
      distoOutputGain.connect(masterGainRef.current);

      reverbInputGain.connect(reverbWetGain);
      reverbWetGain.connect(reverb);
      reverb.connect(reverbOutputGain);
      reverbOutputGain.connect(masterGainRef.current);

      fxNodesRef.current = { 
          reverb, reverbWetGain, reverbOutputGain, 
          delay, delayFeedback, delayInputGain, delayFilter,
          reverbInputGain,
          distoInputGain, distoShaper, distoOutputGain
      };

      // Use current state from Ref to ensure we capture any changes made before context init
      const currentOscillators = stateRef.current.oscillators;

      const oscGains = currentOscillators.map((osc) => {
          const g = context.createGain();
          // CRITICAL FIX: Initialize with correctly scaled volume immediately
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
  }, [state.fx.delay.feedback, state.fx.reverb.time, state.fx.reverb.model, state.fx.reverb.gain]);

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

  const getArpNote = (notes: Note[], index: number, mode: ArpMode) => {
      // Sort notes by pitch (using name parsing)
      const sortedNotes = [...notes].sort((a, b) => {
         const octA = parseInt(a.name.slice(-1));
         const octB = parseInt(b.name.slice(-1));
         if (octA !== octB) return octA - octB;
         const nameA = a.name.slice(0, -1);
         const nameB = b.name.slice(0, -1);
         return noteNames.indexOf(nameA) - noteNames.indexOf(nameB);
      });
      
      const len = sortedNotes.length;
      if (len === 0) return null;

      let noteIndex = 0;
      
      switch (mode) {
          case 'up':
              noteIndex = index % len;
              break;
          case 'down':
              noteIndex = (len - 1 - (index % len));
              break;
          case 'random':
              noteIndex = Math.floor(Math.random() * len);
              break;
          case 'converge':
               // Converge: Low, High, Low+1, High-1...
               const cycleIndex = index % len;
               if (cycleIndex % 2 === 0) {
                   // Even indices (0, 2, 4): Increasing from bottom
                   noteIndex = cycleIndex / 2;
               } else {
                   // Odd indices (1, 3, 5): Decreasing from top
                   noteIndex = len - 1 - Math.floor(cycleIndex / 2);
               }
               break;
      }
      
      return sortedNotes[noteIndex];
  };

  const tick = useCallback((scheduledTime: number, stepDuration: number) => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    const { sequencer, oscillators, transport } = stateRef.current;
    const { stepCount, steps, shiftSteps, shiftDuration } = sequencer;
    const { bpm } = transport;
    
    const nextStep = (currentStepRef.current + 1) % stepCount;
    currentStepRef.current = nextStep;
    
    const multiplier = shiftDuration || 1;
    const shiftStepIndex = Math.floor(totalTicksRef.current / multiplier) % 16;
    totalTicksRef.current++;

    const arpTriggers: number[] = [];

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
    const secondsPerBeat = 60.0 / bpm;
    const sixteenthNoteDuration = secondsPerBeat / 4;

    steps.forEach((track, trackIndex) => {
      const stepData = track[nextStep];
      const oscSettings = oscillators[trackIndex];
      const hasHit = stepData && stepData.enabled && stepData.notes.length > 0 && (Math.random() < (stepData.probability ?? 1.0));

      const voicePool = voicePoolRef.current[trackIndex];
      
      // If we have a new hit on this step
      if (hasHit) {
          if (oscSettings.arp) {
              // START ARP
              activeArpsRef.current[trackIndex] = {
                  notes: stepData.notes,
                  ticksRemaining: Math.max(1, oscSettings.hold) - 1, // Play first note now, remaining later
                  currentIndex: 1, // Next index
                  mode: oscSettings.arpMode
              };
              
              // Play first ARP note
              const note = getArpNote(stepData.notes, 0, oscSettings.arpMode);
              if (note) {
                  const voice = voicePool.find(v => v.isAvailable);
                  if (voice) {
                      voice.update(oscSettings);
                      const noteToPlay = currentShift !== 0 ? shiftNoteByFifths(note.name, currentShift) : note.name;
                      // Arp notes are short (1/16th) with slight gate separation
                      voice.on(noteToPlay, oscSettings.octave, audioCtx, scheduledTime, note.velocity);
                      voice.off(audioCtx, scheduledTime + sixteenthNoteDuration * 0.95);
                      activeVoicesRef.current.push(voice);
                      arpTriggers.push(trackIndex);
                  }
              }
          } else {
              // STANDARD CHORD PLAYBACK (No Arp)
              activeArpsRef.current[trackIndex] = null; // Kill any running arp
              const holdSteps = oscSettings.hold || 1;
              const noteDuration = sixteenthNoteDuration * holdSteps;
              
              stepData.notes.forEach(note => {
                const voice = voicePool.find(v => v.isAvailable);
                if (voice) {
                  voice.update(oscSettings);
                  const noteToPlay = currentShift !== 0 ? shiftNoteByFifths(note.name, currentShift) : note.name;
                  voice.on(noteToPlay, oscSettings.octave, audioCtx, scheduledTime, note.velocity);
                  voice.off(audioCtx, scheduledTime + noteDuration);
                  activeVoicesRef.current.push(voice);
                }
              });
          }
      } else {
          // No Hit on this step - Check for Active Arp continuation
          const activeArp = activeArpsRef.current[trackIndex];
          if (activeArp && activeArp.ticksRemaining > 0) {
              const note = getArpNote(activeArp.notes, activeArp.currentIndex, activeArp.mode);
              if (note) {
                  const voice = voicePool.find(v => v.isAvailable);
                  if (voice) {
                      voice.update(oscSettings);
                      const noteToPlay = currentShift !== 0 ? shiftNoteByFifths(note.name, currentShift) : note.name;
                      voice.on(noteToPlay, oscSettings.octave, audioCtx, scheduledTime, note.velocity);
                      voice.off(audioCtx, scheduledTime + sixteenthNoteDuration * 0.95);
                      activeVoicesRef.current.push(voice);
                      arpTriggers.push(trackIndex);
                  }
              }
              activeArp.ticksRemaining--;
              activeArp.currentIndex++;
          }
      }
    });

    visualQueueRef.current.push({ 
        main: nextStep, 
        shift: shiftStepIndex, 
        time: scheduledTime,
        arpTriggers
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
                    onStepChange({ main: event.main, shift: event.shift, arpTriggers: event.arpTriggers });
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
      activeArpsRef.current = {};
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
      activeArpsRef.current = {};
      onStepChange({ main: -1, shift: -1, arpTriggers: [] });
      
      if (stateRef.current.transport.midiClockOut) {
          sendMidiMessage([0xFC]);
      }

      if (audioCtxRef.current) {
        // Stop ALL voices from the pool explicitly to ensure silence
        voicePoolRef.current.flat().forEach(v => v.off(audioCtxRef.current!, audioCtxRef.current!.currentTime));
        activeVoicesRef.current = [];
      }
    }
  }, [onStepChange, sendMidiMessage]);
  
  useEffect(() => { masterGainRef.current?.gain.setTargetAtTime(state.transport.masterVolume, audioCtxRef.current?.currentTime ?? 0, 0.01); }, [state.transport.masterVolume]);
  
  useEffect(() => {
      if (!audioCtxRef.current) return;
      const now = audioCtxRef.current.currentTime;
      state.oscillators.forEach((osc, i) => {
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
    const { reverb, reverbWetGain, reverbOutputGain } = fxNodesRef.current;
    if (!audioCtx || !reverb || !reverbWetGain || !reverbOutputGain) return;
    const { model, time, depth, gain } = state.fx.reverb;
    
    // Update Wet Gain (Depth)
    reverbWetGain.gain.setTargetAtTime(depth, audioCtx.currentTime, 0.05);
    // Update Output Gain (Makeup Gain)
    reverbOutputGain.gain.setTargetAtTime(gain, audioCtx.currentTime, 0.05);

    // Re-generate buffer only if model or time changes. 
    // Debounce slightly to avoid heavy computation during knob drag
    const timeoutId = setTimeout(() => {
        // Generate buffer slightly longer than fade-out time
        generateImpulseResponse(audioCtx, model, time, time + 0.5).then(impulse => {
            if(reverb) reverb.buffer = impulse;
        });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [state.fx.reverb.model, state.fx.reverb.time, state.fx.reverb.depth, state.fx.reverb.gain]);

  useEffect(() => {
      const { distoShaper, distoOutputGain, distoInputGain } = fxNodesRef.current;
      if (!distoShaper || !distoOutputGain || !distoInputGain) return;
      
      const { depth, model, level } = state.fx.distortion;
      const audioCtx = audioCtxRef.current;
      
      distoShaper.curve = makeDistortionCurve(depth, model);
      
      let inputBoost = 1.0;
      let outputAtten = 1.0;

      if (model === 'fuzz') {
          inputBoost = 1.5 + depth * 5.0; 
          outputAtten = 0.4 - (depth * 0.1); 
      } else if (model === 'overdrive') {
          inputBoost = 1.0 + depth * 4.0;
          outputAtten = 0.8 - (depth * 0.1);
      } else if (model === 'crush') {
          inputBoost = 1.0;
          outputAtten = 1.0;
      }
      
      const finalOutputGain = outputAtten * (level ?? 0.8);

      if (audioCtx) {
        distoInputGain.gain.setTargetAtTime(inputBoost, audioCtx.currentTime, 0.05);
        distoOutputGain.gain.setTargetAtTime(finalOutputGain, audioCtx.currentTime, 0.05);
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
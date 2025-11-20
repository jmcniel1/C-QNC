import { useEffect, useRef, useCallback } from 'react';
import { SynthState, FxNodes, OscFxSendNodes } from '../types';
import { Voice } from '../audio/Voice';
import { generateImpulseResponse, makeDistortionCurve } from '../audio/effects';

const MAX_VOICES_PER_OSC = 8;

export const useSynth = (state: SynthState, onStepChange: (step: number) => void) => {
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
  const oscAnalysersRef = useRef<AnalyserNode[]>([]);

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

      // --- CREATE FX NODES ---
      const delay = context.createDelay(5);
      const delayFeedback = context.createGain();
      const delayInputGain = context.createGain();

      const distoInputGain = context.createGain();
      const distoShaper = context.createWaveShaper();
      const distoOutputGain = context.createGain();
      distoShaper.oversample = 'none'; 

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

      const oscGains = state.oscillators.map(() => context.createGain());
      oscGainNodesRef.current = oscGains;
      oscFilterNodesRef.current = state.oscillators.map(() => context.createBiquadFilter());

      oscAnalysersRef.current = state.oscillators.map(() => {
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        return analyser;
      });

      voicePoolRef.current = state.oscillators.map((oscSettings, oscIndex) => {
        const pool = [];
        const oscGain = oscGainNodesRef.current[oscIndex];
        const oscFilter = oscFilterNodesRef.current[oscIndex];
        const analyser = oscAnalysersRef.current[oscIndex];
        
        oscFilter.type = 'lowpass';
        oscFilter.frequency.value = oscSettings.filter.freq;
        oscFilter.Q.value = Math.pow(oscSettings.filter.res, 3) * 20 + 0.1;

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

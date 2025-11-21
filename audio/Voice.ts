import { ADSRSettings, OscillatorSettings } from '../types';
import { noteToFreq } from '../utils';

export class Voice {
  #osc: OscillatorNode;
  #gain: GainNode;
  #adsr: ADSRSettings;
  output: GainNode;
  note: string | null = null;
  isAvailable = true;

  constructor(audioCtx: AudioContext, adsr: ADSRSettings) {
    this.#osc = audioCtx.createOscillator();
    this.#gain = audioCtx.createGain();
    this.output = this.#gain;
    this.#adsr = adsr;
    this.#osc.connect(this.#gain);
    this.#gain.gain.setValueAtTime(0, audioCtx.currentTime);
    this.#osc.start();
  }

  connect(destination: AudioNode) { this.output.connect(destination); }

  update(settings: OscillatorSettings) { 
    this.#osc.type = settings.wave; 
    this.#adsr = settings.adsr; 
  }

  on(note: string, octaveShift: number, audioCtx: AudioContext, when: number, velocity = 1.0) {
    this.isAvailable = false; 
    this.note = note;
    this.#osc.frequency.setValueAtTime(noteToFreq(note, octaveShift), when);
    
    this.#gain.gain.cancelScheduledValues(when);
    this.#gain.gain.setValueAtTime(0, when);
    this.#gain.gain.linearRampToValueAtTime(velocity, when + this.#adsr.attack);
    this.#gain.gain.linearRampToValueAtTime(this.#adsr.sustain * velocity, when + this.#adsr.attack + this.#adsr.decay);
  }

  off(audioCtx: AudioContext, when: number) {
    this.#gain.gain.cancelScheduledValues(when);
    // Use setTargetAtTime for smooth exponential decay from whatever value exists at 'when'
    // Time constant is release / 5 to reach ~1% by the end of release time
    this.#gain.gain.setTargetAtTime(0, when, this.#adsr.release / 5);
    
    // Calculate time until voice is free to reuse
    // We need to convert the scheduled 'when' time back to a wall-clock timeout delay
    // Adding a small buffer (100ms) to ensure audio is fully silent before reuse
    const releaseDuration = this.#adsr.release;
    const delay = (Math.max(0, when - audioCtx.currentTime) + releaseDuration + 0.1) * 1000;
    
    setTimeout(() => { this.isAvailable = true; this.note = null; }, delay);
  }
}
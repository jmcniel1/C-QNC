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

  on(note: string, octaveShift: number, audioCtx: AudioContext, velocity = 1.0) {
    this.isAvailable = false; 
    this.note = note;
    this.#osc.frequency.setValueAtTime(noteToFreq(note, octaveShift), audioCtx.currentTime);
    const now = audioCtx.currentTime;
    this.#gain.gain.cancelScheduledValues(now);
    this.#gain.gain.setValueAtTime(0, now);
    this.#gain.gain.linearRampToValueAtTime(velocity, now + this.#adsr.attack);
    this.#gain.gain.linearRampToValueAtTime(this.#adsr.sustain * velocity, now + this.#adsr.attack + this.#adsr.decay);
  }

  off(audioCtx: AudioContext) {
    const now = audioCtx.currentTime;
    this.#gain.gain.cancelScheduledValues(now);
    this.#gain.gain.setValueAtTime(this.#gain.gain.value, now);
    this.#gain.gain.linearRampToValueAtTime(0, now + this.#adsr.release);
    setTimeout(() => { this.isAvailable = true; this.note = null; }, (this.#adsr.release + 0.1) * 1000);
  }
}

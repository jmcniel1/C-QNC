import { SynthState, ADSRSettings, OscillatorSettings, SequencerState, TransportState, FXState } from './types';

export const oscColors = ['#1d4ed8', '#166534', '#e74e1a'];
export const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const initialADSR: ADSRSettings = { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 };

export const initialOsc: OscillatorSettings[] = [
  { id: 1, wave: 'sine', vol: 0.2, octave: 0, adsr: { ...initialADSR }, sends: { delay: 0, reverb: 0, disto: 0 }, muted: false, filter: { freq: 20000, res: 0.1 } },
  { id: 2, wave: 'square', vol: 0.2, octave: 0, adsr: { ...initialADSR, attack: 0.02, decay: 0.5 }, sends: { delay: 0, reverb: 0, disto: 0 }, muted: false, filter: { freq: 20000, res: 0.1 } },
  { id: 3, wave: 'sawtooth', vol: 0.2, octave: 0, adsr: { ...initialADSR, release: 1.0 }, sends: { delay: 0, reverb: 0, disto: 0 }, muted: false, filter: { freq: 20000, res: 0.1 } },
];

export const initialSequencer: SequencerState = {
  steps: Array(3).fill(0).map(() => Array(16).fill({ notes: [], enabled: true, probability: 1.0 })),
  stepCount: 16,
};

export const initialTransport: TransportState = { isPlaying: false, bpm: 120, masterVolume: 0.8, metronomeOn: false, swing: 50 };

export const initialFX: FXState = {
  reverb: { decay: 2.5, predelay: 0.1, damper: 8000, model: 'hall' },
  delay: { time: 250, feedback: 0, division: '1/4' },
  distortion: { depth: 0, model: 'overdrive' },
};

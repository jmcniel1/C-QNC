import { SynthState, ADSRSettings, OscillatorSettings, SequencerState, TransportState, FXState } from './types';

export const oscColors = ['#1d4ed8', '#166534', '#e74e1a'];
export const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const initialADSR: ADSRSettings = { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 };

// Randomization Logic
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

const ARCHETYPES = [
  { // Bass
    waves: ['square', 'sawtooth'],
    octave: [-2, -1],
    adsr: { attack: [0.01, 0.05], decay: [0.1, 0.3], sustain: [0.4, 0.8], release: [0.1, 0.3] },
    filter: { freq: [200, 2000], res: [0.1, 3] }
  },
  { // Pad
    waves: ['sine', 'triangle'],
    octave: [0, 1],
    adsr: { attack: [0.5, 1.5], decay: [0.5, 2.0], sustain: [0.6, 1.0], release: [1.0, 3.0] },
    filter: { freq: [800, 15000], res: [0, 1] }
  },
  { // Lead
    waves: ['sawtooth', 'square'],
    octave: [0, 1],
    adsr: { attack: [0.01, 0.1], decay: [0.1, 0.5], sustain: [0.7, 1.0], release: [0.1, 0.5] },
    filter: { freq: [2000, 20000], res: [0.1, 5] }
  },
  { // Pluck
    waves: ['triangle', 'sine', 'sawtooth'],
    octave: [0, 1],
    adsr: { attack: [0.01, 0.01], decay: [0.1, 0.4], sustain: [0, 0.2], release: [0.1, 0.4] },
    filter: { freq: [500, 5000], res: [0, 2] }
  }
];

const generateOscillator = (id: number): OscillatorSettings => {
  const type = ARCHETYPES[getRandomInt(0, ARCHETYPES.length - 1)];
  const wave = type.waves[getRandomInt(0, type.waves.length - 1)] as any;
  
  return {
    id,
    wave,
    vol: 0.2,
    octave: type.octave[getRandomInt(0, type.octave.length - 1)],
    adsr: {
      attack: getRandomFloat(type.adsr.attack[0], type.adsr.attack[1]),
      decay: getRandomFloat(type.adsr.decay[0], type.adsr.decay[1]),
      sustain: getRandomFloat(type.adsr.sustain[0], type.adsr.sustain[1]),
      release: getRandomFloat(type.adsr.release[0], type.adsr.release[1]),
    },
    sends: {
      delay: getRandomFloat(0, 0.3),
      reverb: getRandomFloat(0, 0.3),
      disto: 0
    },
    muted: false,
    filter: {
      freq: getRandomFloat(type.filter.freq[0], type.filter.freq[1]),
      res: getRandomFloat(type.filter.res[0], type.filter.res[1])
    }
  };
};

export const initialOsc: OscillatorSettings[] = [
  generateOscillator(1),
  generateOscillator(2),
  generateOscillator(3),
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
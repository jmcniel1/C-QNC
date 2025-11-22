



import { SynthState, ADSRSettings, OscillatorSettings, SequencerState, TransportState, FXState } from './types';

export const oscColors = ['#0e446e', '#00482f', '#b5461b'];
export const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const initialADSR: ADSRSettings = { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 };

const defaultOscillator = (id: number): OscillatorSettings => ({
  id,
  wave: 'sine',
  vol: 0.5,
  octave: 0,
  adsr: {
    attack: 0.05,
    decay: 0.3,
    sustain: 0.6,
    release: 0.5,
  },
  sends: {
    delay: 0,
    reverb: 0,
    disto: 0
  },
  muted: false,
  filter: {
    freq: 20000,
    res: 0
  },
  hold: 1,
  arp: false,
  arpMode: 'up'
});

export const initialOsc: OscillatorSettings[] = [
  defaultOscillator(1),
  defaultOscillator(2),
  defaultOscillator(3),
];

export const initialSequencer: SequencerState = {
  steps: Array(3).fill(0).map(() => Array(16).fill({ notes: [], enabled: true, probability: 1.0 })),
  shiftSteps: Array(16).fill(0),
  stepCount: 16,
  shiftDuration: 1,
};

export const initialTransport: TransportState = { isPlaying: false, bpm: 120, masterVolume: 0.8, metronomeOn: false, swing: 50, midiClockOut: false };

export const initialFX: FXState = {
  reverb: { time: 3, depth: 0.5, damper: 8000, model: 'block', gain: 1.0 },
  delay: { time: 250, feedback: 0, division: '1/4' },
  distortion: { depth: 0, level: 0.8, model: 'overdrive' },
};

// Normalized Presets to 50% Volume
export const PRESETS = [
  {
    name: 'Init',
    settings: {
      wave: 'sine' as const,
      octave: 0,
      vol: 0.5,
      adsr: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 },
      filter: { freq: 20000, res: 0.1 }
    }
  },
  {
    name: 'Sub Bass',
    settings: {
      wave: 'sine' as const,
      octave: -2,
      vol: 0.5,
      adsr: { attack: 0.01, decay: 0.2, sustain: 0.9, release: 0.2 },
      filter: { freq: 150, res: 0.1 }
    }
  },
  {
    name: 'Reese',
    settings: {
      wave: 'sawtooth' as const,
      octave: -2,
      vol: 0.5,
      adsr: { attack: 0.05, decay: 0.3, sustain: 0.7, release: 0.4 },
      filter: { freq: 800, res: 0.5 }
    }
  },
  {
    name: 'Warm Pad',
    settings: {
      wave: 'triangle' as const,
      octave: 0,
      vol: 0.5,
      adsr: { attack: 0.8, decay: 0.5, sustain: 0.6, release: 1.2 },
      filter: { freq: 1200, res: 0.2 }
    }
  },
  {
    name: 'Vapor Lead',
    settings: {
      wave: 'square' as const,
      octave: 1,
      vol: 0.5,
      adsr: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
      filter: { freq: 4000, res: 0.5 }
    }
  },
  {
    name: 'Pluck',
    settings: {
      wave: 'square' as const,
      octave: 0,
      vol: 0.5,
      adsr: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 },
      filter: { freq: 800, res: 0.5 }
    }
  },
  {
    name: 'Strings',
    settings: {
      wave: 'sawtooth' as const,
      octave: 0,
      vol: 0.5,
      adsr: { attack: 0.4, decay: 0.2, sustain: 0.8, release: 0.8 },
      filter: { freq: 6000, res: 0.5 }
    }
  },
  {
    name: 'Brass',
    settings: {
      wave: 'sawtooth' as const,
      octave: -1,
      vol: 0.5,
      adsr: { attack: 0.15, decay: 0.2, sustain: 0.7, release: 0.3 },
      filter: { freq: 2500, res: 0.5 }
    }
  },
  {
    name: 'E-Piano',
    settings: {
      wave: 'triangle' as const,
      octave: 0,
      vol: 0.5,
      adsr: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.4 },
      filter: { freq: 3000, res: 0.5 }
    }
  },
  {
    name: 'Crystal',
    settings: {
      wave: 'sine' as const,
      octave: 2,
      vol: 0.5,
      adsr: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 1.5 },
      filter: { freq: 8000, res: 0.1 }
    }
  },
  {
    name: 'Acid',
    settings: {
      wave: 'sawtooth' as const,
      octave: -1,
      vol: 0.5,
      adsr: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.1 },
      filter: { freq: 1500, res: 0.8 }
    }
  },
  {
    name: 'Organ',
    settings: {
      wave: 'triangle' as const,
      octave: 1,
      vol: 0.5,
      adsr: { attack: 0.05, decay: 0.1, sustain: 1.0, release: 0.1 },
      filter: { freq: 5000, res: 0.5 }
    }
  }
];
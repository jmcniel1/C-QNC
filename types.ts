

export interface Note {
  name: string;
  velocity: number;
  duration?: number;
}

export interface ADSRSettings {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface FilterSettings {
  freq: number;
  res: number;
}

export interface SendsSettings {
  delay: number;
  reverb: number;
  disto: number;
}

export type ArpMode = 'up' | 'down' | 'random' | 'converge';

export interface OscillatorSettings {
  id: number;
  wave: 'sine' | 'square' | 'sawtooth' | 'triangle';
  vol: number;
  octave: number;
  adsr: ADSRSettings;
  sends: SendsSettings;
  muted: boolean;
  filter: FilterSettings;
  hold: number;
  arp: boolean;
  arpMode: ArpMode;
}

export interface SequencerStep {
  notes: Note[];
  enabled: boolean;
  probability?: number;
  chordName?: string;
}

export interface SequencerTrack extends Array<SequencerStep> {}

export interface SequencerState {
  steps: SequencerTrack[];
  shiftSteps: number[];
  stepCount: number;
  shiftDuration: number;
}

export interface TransportState {
  isPlaying: boolean;
  bpm: number;
  masterVolume: number;
  metronomeOn: boolean;
  swing: number;
  midiClockOut: boolean;
}

export interface ReverbSettings {
  time: number;
  depth: number;
  damper: number;
  model: 'block' | 'swarm' | 'abyss';
  gain: number;
}

export interface DelaySettings {
  time: number;
  feedback: number;
  division: string;
}

export interface DistortionSettings {
  depth: number;
  level: number;
  model: 'fuzz' | 'overdrive' | 'crush';
}

export interface FXState {
  reverb: ReverbSettings;
  delay: DelaySettings;
  distortion: DistortionSettings;
}

export interface SynthState {
  transport: TransportState;
  oscillators: OscillatorSettings[];
  sequencer: SequencerState;
  fx: FXState;
}

export interface FxNodes {
  reverb?: ConvolverNode;
  reverbWetGain?: GainNode;
  reverbOutputGain?: GainNode;
  delay?: DelayNode;
  delayFeedback?: GainNode;
  delayInputGain?: GainNode;
  delayFilter?: BiquadFilterNode;
  reverbInputGain?: GainNode;
  distoInputGain?: GainNode;
  distoShaper?: WaveShaperNode;
  distoOutputGain?: GainNode;
}

export interface OscFxSendNodes {
  delay: GainNode;
  reverb: GainNode;
  disto: GainNode;
}
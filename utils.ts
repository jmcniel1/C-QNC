import { noteNames } from './constants';

const A4 = 440;
const C0 = A4 * Math.pow(2, -4.75);

export const noteToFreq = (note: string, octaveShift = 0) => {
  const octave = parseInt(note.slice(-1)) + octaveShift;
  const key = note.slice(0, -1);
  const halfSteps = noteNames.indexOf(key);
  return C0 * Math.pow(2, octave + halfSteps / 12);
};

export const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const noteToString = (note: { name: string }) => note.name.slice(0, -1);

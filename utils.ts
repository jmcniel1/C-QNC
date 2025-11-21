
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

export const shiftNoteByFifths = (noteName: string, shiftAmount: number): string => {
    if (shiftAmount === 0) return noteName;
    
    const match = noteName.match(/^([A-G]#?)(\d+)$/);
    if (!match) return noteName;
    
    const [, noteKey, octaveStr] = match;
    const currentOctave = parseInt(octaveStr);
    
    const currentIndex = noteNames.indexOf(noteKey);
    if (currentIndex === -1) return noteName;
    
    // A Perfect Fifth is 7 semitones.
    // To shift by 'n' steps on Circle of Fifths, we add (n * 7) semitones to the index.
    // We use modulo 12 to keep it within the pitch class.
    // For negative shifts, we ensure the result of modulo is positive.
    
    const semitoneShift = shiftAmount * 7;
    let newIndex = (currentIndex + semitoneShift) % 12;
    
    if (newIndex < 0) {
        newIndex += 12;
    }
    
    const newNoteKey = noteNames[newIndex];
    
    // We preserve the original octave as per "shifting root note values" usually implies
    // staying in the relative register unless specifically transposing octaves.
    return `${newNoteKey}${currentOctave}`;
};

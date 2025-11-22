
import { noteNames } from '../constants';
import { SequencerStep, Note } from '../types';

// Pitch class mapping (C=0, C#=1, ... B=11)
const getPitchClass = (noteName: string): number => {
    const key = noteName.slice(0, -1);
    return noteNames.indexOf(key);
};

const SCALES = {
    Major: [0, 2, 4, 5, 7, 9, 11],
    Minor: [0, 2, 3, 5, 7, 8, 10], // Natural Minor
};

const INTERVALS: Record<string, number[]> = {
    'Maj7': [0, 4, 7, 11],
    'm7': [0, 3, 7, 10],
    'Dom7': [0, 4, 7, 10],
    'Maj9': [0, 4, 7, 11, 14],
    'm9': [0, 3, 7, 10, 14],
    'Dom9': [0, 4, 7, 10, 14],
    'm11': [0, 3, 7, 10, 14, 17], // R, b3, 5, b7, 9, 11
    '13': [0, 4, 10, 14, 21], // Shell + 13: R, 3, b7, 9, 13
    'sus4': [0, 5, 7],
    '7sus4': [0, 5, 7, 10],
    'Aug': [0, 4, 8],
    'dim7': [0, 3, 6, 9],
    'm7b5': [0, 3, 6, 10],
};

// Definitions for chord detection
const CHORD_PATTERNS: { name: string; intervals: number[] }[] = [
    { name: 'Maj', intervals: [0, 4, 7] },
    { name: 'm', intervals: [0, 3, 7] },
    { name: 'dim', intervals: [0, 3, 6] },
    { name: 'Aug', intervals: [0, 4, 8] },
    { name: 'sus2', intervals: [0, 2, 7] },
    { name: 'sus4', intervals: [0, 5, 7] },
    { name: '7', intervals: [0, 4, 7, 10] },
    { name: 'Maj7', intervals: [0, 4, 7, 11] },
    { name: 'm7', intervals: [0, 3, 7, 10] },
    { name: 'mMaj7', intervals: [0, 3, 7, 11] },
    { name: '6', intervals: [0, 4, 7, 9] },
    { name: 'm6', intervals: [0, 3, 7, 9] },
    { name: '9', intervals: [0, 4, 7, 10, 2] },
    { name: 'Maj9', intervals: [0, 4, 7, 11, 2] },
    { name: 'm9', intervals: [0, 3, 7, 10, 2] },
];

export interface ChordSuggestion {
    name: string;
    notes: string[]; // e.g. "C4", "E4"
    isCommon?: boolean;
}

export const detectChord = (notes: Note[]): string | null => {
    if (!notes || notes.length === 0) return null;
    if (notes.length === 1) return notes[0].name.slice(0, -1); // Just the note name (e.g., "C")

    const pitchClasses = Array.from(new Set(notes.map(n => getPitchClass(n.name)))).sort((a, b) => a - b);
    
    if (pitchClasses.length < 2) return notes[0].name.slice(0, -1);

    // Brute force check every note in the set as the potential root
    for (let i = 0; i < pitchClasses.length; i++) {
        const root = pitchClasses[i];
        
        // Calculate intervals relative to this root
        const currentIntervals = pitchClasses.map(pc => {
            let interval = pc - root;
            if (interval < 0) interval += 12;
            return interval;
        }).sort((a, b) => a - b);

        // Check against patterns
        for (const pattern of CHORD_PATTERNS) {
            // Check if all pattern intervals exist in our current intervals
            // (We allow extra notes for now, or strict match? Let's do strict subset matching for basic triads, loose for extended)
            
            // 1. Strict check: Lengths match and values match
            const strictMatch = pattern.intervals.length === currentIntervals.length && 
                                pattern.intervals.every((val, idx) => val === currentIntervals[idx]);
            
            if (strictMatch) {
                return `${noteNames[root]}${pattern.name}`;
            }
            
            // 2. Subset check (for complex chords where we might have inversions or partial voicings)
            // If it has at least 3 notes and matches a complex pattern
            if (pattern.intervals.length >= 3 && currentIntervals.length >= 3) {
                 const isSubset = pattern.intervals.every(iv => currentIntervals.includes(iv));
                 // Also ensure we don't have too many 'wrong' notes.
                 // For simplicity in this light version, we stick to strict checks or 'close enough' logic
                 if (isSubset && currentIntervals.length <= pattern.intervals.length + 1) {
                     // Prioritize the exact match loop above, but return this if no strict match found later?
                     // Let's return immediately for now
                      return `${noteNames[root]}${pattern.name}`;
                 }
            }
        }
    }

    // Fallback: Just return root note name + "?" or just root
    // Try to identify the bass note (lowest octave)
    const sortedNotes = [...notes].sort((a, b) => {
        const octA = parseInt(a.name.slice(-1));
        const octB = parseInt(b.name.slice(-1));
        if (octA !== octB) return octA - octB;
        return getPitchClass(a.name) - getPitchClass(b.name);
    });
    
    return sortedNotes[0].name.slice(0, -1); // Return lowest note name
};

export const generateSuggestions = (rootPC: number, scaleType: 'Major' | 'Minor'): ChordSuggestion[] => {
     // 3. Generate Jazz / Neo-Soul Suggestions based on Common Degrees
    const suggestions: ChordSuggestion[] = [];
    
    // Palette Definitions with isCommon flags for UI highlighting
    const majorPalette = [
        { degree: 0, type: 'Maj9', suffix: 'Maj9', isCommon: true },       // I - Tonic
        { degree: 5, type: 'm9', suffix: 'm9', isCommon: true },           // vi - Relative Minor
        { degree: 3, type: 'Maj9', suffix: 'Maj9', isCommon: true },       // IV - Subdominant
        { degree: 4, type: 'Dom9', suffix: '9', isCommon: true },          // V - Dominant
        { degree: 1, type: 'm9', suffix: 'm9', isCommon: true },           // ii - Predominant
        { degree: 2, type: 'm7', suffix: 'm7', isCommon: false },          // iii
        { degree: 6, type: 'm7b5', suffix: 'm7b5', isCommon: false },      // vii
        { degree: 4, type: '13', suffix: '13', isCommon: false },          // V variation
        { degree: 0, type: '7sus4', suffix: '7sus', isCommon: false },      // I variation
    ];

    const minorPalette = [
        { degree: 0, type: 'm9', suffix: 'm9', isCommon: true },           // i
        { degree: 5, type: 'Maj9', suffix: 'Maj9', isCommon: true },       // bVI
        { degree: 6, type: 'Dom9', suffix: '9', isCommon: true },          // bVII
        { degree: 4, type: 'm9', suffix: 'm9', isCommon: true },           // v
        { degree: 3, type: 'm9', suffix: 'm9', isCommon: false },          // iv
        { degree: 2, type: 'Maj7', suffix: 'Maj7', isCommon: false },      // bIII
        { degree: 4, type: 'Dom7', suffix: '7', isCommon: true },          // V (Harmonic)
        { degree: 1, type: 'm7b5', suffix: 'm7b5', isCommon: false },       // ii
    ];

    const palette = scaleType === 'Major' ? majorPalette : minorPalette;

    // Helper to construct note array for a voicing
    const getVoicing = (root: number, type: string): string[] => {
        const intervals = INTERVALS[type] || INTERVALS['Maj7'];
        return intervals.map(interval => {
            const absNote = root + interval;
            const pc = absNote % 12;
            // Smart voicing: keep extensions in upper structure (octave 3/4 now instead of 4/5)
            // Base octave is 3. If interval > 12, it goes to 4.
            const octaveShift = Math.floor(absNote / 12);
            return `${noteNames[pc]}${3 + octaveShift}`;
        });
    };

    const scaleInts = SCALES[scaleType];

    palette.forEach(p => {
        const interval = scaleInts[p.degree];
        const chordRootPC = (rootPC + interval) % 12;
        
        suggestions.push({
            name: `${noteNames[chordRootPC]}${p.suffix}`,
            notes: getVoicing(chordRootPC, p.type),
            isCommon: p.isCommon
        });
    });

    // Add "Secret Sauce" Chords for Neo-Soul flavor
    
    // 1. Tritone Substitution (bII Maj7) - Great for resolving to I
    const bII = (rootPC + 1) % 12;
    suggestions.push({ name: `${noteNames[bII]}Maj7`, notes: getVoicing(bII, 'Maj7'), isCommon: false });

    // 2. Backdoor Dominant (bVII Maj7 in Major)
    if (scaleType === 'Major') {
        const bVII = (rootPC + 10) % 12;
        suggestions.push({ name: `${noteNames[bVII]}Maj7`, notes: getVoicing(bVII, 'Maj7'), isCommon: false });
    }

    // 3. Secondary Dominant (V of vi)
    const VofViRoot = (rootPC + 4) % 12;
    suggestions.push({ name: `${noteNames[VofViRoot]}Aug`, notes: getVoicing(VofViRoot, 'Aug'), isCommon: false });

    return suggestions;
}

export const analyzeSequence = (steps: SequencerStep[]): { keyName: string, suggestions: ChordSuggestion[] } => {
    // 1. Focus on the first 2 filled steps for context
    const filledSteps = steps.filter(s => s.enabled && s.notes.length > 0);
    const targetSteps = filledSteps.slice(0, 2);
    
    const pitchClasses = new Set<number>();
    let firstRoot = -1;

    // Gather pitch data from target steps
    targetSteps.forEach((step, idx) => {
        let minOctave = 100;
        let rootPC = -1;
        
        step.notes.forEach(n => {
            const pc = getPitchClass(n.name);
            pitchClasses.add(pc);
            
            // Simple root detection: assume lowest note of the chord is the root (common in pop/soul)
            const oct = parseInt(n.name.slice(-1));
            if (oct < minOctave) {
                minOctave = oct;
                rootPC = pc;
            }
        });
        
        if (idx === 0) firstRoot = rootPC;
    });

    // 2. Detect Key (Weighted Scoring)
    let bestRoot = 0; // Default C
    let bestScale: 'Major' | 'Minor' = 'Major';
    let maxScore = -1;

    // Only analyze if we have data, otherwise default to C Major
    if (pitchClasses.size > 0) {
        for (let root = 0; root < 12; root++) {
            (['Major', 'Minor'] as const).forEach(scaleType => {
                const scaleIntervals = new Set(SCALES[scaleType].map(i => (root + i) % 12));
                let score = 0;
                
                // +1 for every note that fits in the scale
                pitchClasses.forEach(pc => {
                    if (scaleIntervals.has(pc)) score += 1;
                });

                // Contextual Weighting
                // +3 if the first chord's root is the Tonic of this candidate scale
                if (firstRoot === root) score += 3;
                
                // +2 if the first chord's root is the Relative Minor (vi) of this Major candidate
                if (scaleType === 'Major' && firstRoot === (root + 9) % 12) score += 2; 

                if (score > maxScore) {
                    maxScore = score;
                    bestRoot = root;
                    bestScale = scaleType;
                }
            });
        }
    }

    const keyLabel = `${noteNames[bestRoot]} ${bestScale}`;
    const suggestions = generateSuggestions(bestRoot, bestScale);

    return { keyName: keyLabel, suggestions };
};

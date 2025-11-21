import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSynth } from './hooks/useSynth';
import { Transport } from './components/Transport';
import { Synths } from './components/Synths';
import { FX } from './components/fx/FX';
import { Sequencer } from './components/Sequencer';
import { PianoRoll } from './components/PianoRoll';
import { StepDetailsPopover } from './components/StepDetailsPopover';
import { ContextMenu } from './components/ContextMenu';
import { initialTransport, initialOsc, initialSequencer, initialFX, oscColors, noteNames } from './constants';
import { SynthState, OscillatorSettings, ADSRSettings, FXState, SequencerStep, Note } from './types';

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });
  
    useEffect(() => {
      const media = window.matchMedia(query);
      const listener = () => setMatches(media.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }, [query]);
  
    return matches;
};

// Global Styles
export const GlobalStyles = () => {
    const poppins400 = 'd09GMgABAAAAAAPs...'; 
    const poppins500 = 'd09GMgABAAAAAAPs...';
    const poppins700 = 'd09GMgABAAAAAAPs...';
    
    return (
        <style>
        {`
          @font-face { font-family: 'Poppins'; font-style: normal; font-weight: 400; font-display: swap; src: url(data:application/font-woff2;base64,${poppins400}) format('woff2'); }
          @font-face { font-family: 'Poppins'; font-style: normal; font-weight: 500; font-display: swap; src: url(data:application/font-woff2;base64,${poppins500}) format('woff2'); }
          @font-face { font-family: 'Poppins'; font-style: normal; font-weight: 700; font-display: swap; src: url(data:application/font-woff2;base64,${poppins700}) format('woff2'); }

          @media (min-width: 768px) {
              .md\\:text-xs { font-size: 1rem; line-height: 1rem; }
          }
          .font-semibold { font-weight: 500; }
          .p-2 { padding: 1rem; }
          .justify-around { justify-content: space-evenly; }
          .sequencer-toggle-mobile { background: rgb(234, 88, 12); color: white; font-weight: 400; }
          .backdrop-blur-sm { -webkit-backdrop-filter: blur(4px); }
          .backdrop-blur-\\[4px\\] { -webkit-backdrop-filter: blur(4px); }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

          html, body {
            overscroll-behavior: none;
            font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            width: 100%; height: 100%; margin: 0; padding: 0;
            overflow: hidden; position: fixed;
            background-color: #121212;
            user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none;
          }
          #root { height: 100%; width: 100%; overflow: hidden; }
        `}
        </style>
    );
};

const App = () => {
  const [synthState, setSynthState] = useState<SynthState>({
    transport: initialTransport, oscillators: initialOsc, sequencer: initialSequencer, fx: initialFX
  });
  const [currentStep, setCurrentStep] = useState(-1);
  const [editingStep, setEditingStep] = useState<{track: number, step: number, rect: DOMRect} | null>(null);
  const [editingStepDetails, setEditingStepDetails] = useState<{track: number, step: number, rect: DOMRect} | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, trackIndex: number, stepIndex: number, isEnabled: boolean} | null>(null);
  const [copiedStep, setCopiedStep] = useState<SequencerStep | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isSequencerVisible, setSequencerVisible] = useState(false);

  useEffect(() => {
    setSequencerVisible(!isMobile);
  }, [isMobile]);

  const { start, stop, initialize, analysers } = useSynth(synthState, setCurrentStep);

  const handleScroll = () => {
    if (mainContentRef.current) {
        setIsScrolled(mainContentRef.current.scrollTop > 10);
    }
  };

  useEffect(() => {
    const init = () => {
      initialize();
      window.removeEventListener('click', init);
      window.removeEventListener('keydown', init);
      window.removeEventListener('touchstart', init);
    };
    window.addEventListener('click', init);
    window.addEventListener('keydown', init);
    window.addEventListener('touchstart', init);
    return () => {
      window.removeEventListener('click', init);
      window.removeEventListener('keydown', init);
      window.removeEventListener('touchstart', init);
    };
  }, [initialize]);

  // Handle Spacebar for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSynthState(prev => ({
          ...prev,
          transport: {
            ...prev.transport,
            isPlaying: !prev.transport.isPlaying
          }
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (synthState.transport.isPlaying) { start(); } else { stop(); }
  }, [synthState.transport.isPlaying, start, stop]);
  
  const handleFXChange = useCallback((fx: keyof FXState, key: string, value: any) => {
     setSynthState(prev => ({ ...prev, fx: { ...prev.fx, [fx]: { ...prev.fx[fx], [key]: value } }, }));
  }, []);

  useEffect(() => {
    const { division } = synthState.fx.delay;
    if (division === 'Free') return;

    const { bpm } = synthState.transport;
    const secondsPerBeat = 60 / bpm;
    let timeInSeconds = 0;
    switch (division) {
        case '1/2': timeInSeconds = secondsPerBeat * 2; break;
        case '1/2d': timeInSeconds = secondsPerBeat * 3; break;
        case '1/4': timeInSeconds = secondsPerBeat; break;
        case '1/8': timeInSeconds = secondsPerBeat / 2; break;
        case '1/8d': timeInSeconds = (secondsPerBeat / 2) * 1.5; break;
        case '1/16': timeInSeconds = secondsPerBeat / 4; break;
        case '1/16d': timeInSeconds = (secondsPerBeat / 4) * 1.5; break;
    }
    const timeInMs = timeInSeconds * 1000;
    
    if (Math.abs(synthState.fx.delay.time - timeInMs) > 1e-6) {
        handleFXChange('delay', 'time', timeInMs);
    }
  }, [synthState.transport.bpm, synthState.fx.delay.division, handleFXChange, synthState.fx.delay.time]);


  const handleTransportChange = useCallback((key: string, value: any) => {
    setSynthState(prev => ({ ...prev, transport: { ...prev.transport, [key]: value } }));
  }, []);

  const handleOscChange = useCallback((index: number, key: keyof OscillatorSettings | 'filter' | 'sends', value: any) => {
    setSynthState(prev => {
      const newOscs = JSON.parse(JSON.stringify(prev.oscillators));
      newOscs[index][key] = value;
      return { ...prev, oscillators: newOscs };
    });
  }, []);
  
  const handleADSRChange = useCallback((oscIndex: number, key: keyof ADSRSettings, value: number) => {
    setSynthState(prev => {
        const newOscs = JSON.parse(JSON.stringify(prev.oscillators));
        newOscs[oscIndex].adsr[key] = value;
        return { ...prev, oscillators: newOscs };
    });
  }, []);

  const handleStepToggle = useCallback((track: number, step: number) => {
    setSynthState(prev => {
        const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
        newSteps[track][step].enabled = !newSteps[track][step].enabled;
        return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
    });
  }, []);

  const handleStepDetailsChange = useCallback((track: number, step: number, key: string, value: any) => {
    setSynthState(prev => {
        const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
        const stepData = newSteps[track][step];
        if (key === 'velocity') {
            stepData.notes.forEach((note: any) => {
                note.velocity = value;
            });
        } else if (key === 'probability') {
            stepData.probability = value;
        }
        return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
    });
  }, []);

  const handleNoteToggle = useCallback((noteName: string) => {
    if (!editingStep) return;
    const { track, step } = editingStep;
    setSynthState(prev => {
      const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
      const currentStepData = newSteps[track][step];
      const noteIndex = currentStepData.notes.findIndex((n: any) => n.name === noteName);

      if (noteIndex > -1) {
        currentStepData.notes.splice(noteIndex, 1);
      } else if (currentStepData.notes.length < 4) {
        const newNote = { name: noteName, velocity: 0.8, duration: 1.0 };
        currentStepData.notes.push(newNote);
        currentStepData.notes.sort((a: any, b: any) => {
            const octaveA = parseInt(a.name.slice(-1));
            const octaveB = parseInt(b.name.slice(-1));
            if (octaveA !== octaveB) return octaveA - octaveB;
            const noteNameA = a.name.slice(0, -1);
            const noteNameB = b.name.slice(0, -1);
            return noteNames.indexOf(noteNameA) - noteNames.indexOf(noteNameB);
        });
      }
      return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
    });
  }, [editingStep]);

  const handleSetNotes = useCallback((notes: Note[]) => {
      if (!editingStep) return;
      const { track, step } = editingStep;
      setSynthState(prev => {
          const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
          newSteps[track][step].notes = notes;
          return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
      });
  }, [editingStep]);

  const handleContextMenu = useCallback((e: React.MouseEvent, trackIndex: number, stepIndex: number) => {
    e.preventDefault();
    const isEnabled = synthState.sequencer.steps[trackIndex][stepIndex].enabled;
    setContextMenu({ x: e.clientX, y: e.clientY, trackIndex, stepIndex, isEnabled });
  }, [synthState.sequencer.steps]);

  const handleCopy = useCallback(() => {
    if (!contextMenu) return;
    const { trackIndex, stepIndex } = contextMenu;
    const stepToCopy = synthState.sequencer.steps[trackIndex][stepIndex];
    setCopiedStep(JSON.parse(JSON.stringify(stepToCopy)));
    setContextMenu(null);
  }, [contextMenu, synthState.sequencer.steps]);
  
  const handlePaste = useCallback(() => {
    if (!contextMenu || !copiedStep) return;
    const { trackIndex, stepIndex } = contextMenu;
    setSynthState(prev => {
      const newSteps = JSON.parse(JSON.stringify(prev.sequencer.steps));
      newSteps[trackIndex][stepIndex] = JSON.parse(JSON.stringify(copiedStep));
      return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
    });
    setContextMenu(null);
  }, [contextMenu, copiedStep]);

  const handleClearSequencer = useCallback(() => {
    if (window.confirm("Are you sure you want to clear the entire sequence? This cannot be undone.")) {
        setSynthState(prev => {
            const newSteps = Array(3).fill(0).map(() => Array(16).fill({ notes: [], enabled: true, probability: 1.0 }));
            return { ...prev, sequencer: { ...prev.sequencer, steps: newSteps } };
        });
    }
  }, []);
  
  const activeNotesForPiano = editingStep ? synthState.sequencer.steps[editingStep.track][editingStep.step].notes : [];
  const activeStepDetails = editingStepDetails ? synthState.sequencer.steps[editingStepDetails.track][editingStepDetails.step] : null;

  return (
    <React.Fragment>
      <GlobalStyles />
      <div className="h-full w-full bg-synth-bg flex flex-col font-sans text-gray-300 antialiased text-base" onClick={() => setContextMenu(null)}>
        <Transport
            settings={synthState.transport}
            onChange={handleTransportChange}
            isScrolled={isScrolled}
            isMobile={isMobile}
            analysers={analysers}
        />

        <div 
            ref={mainContentRef} 
            onScroll={handleScroll} 
            className={`flex-none w-full flex flex-col ${isMobile ? 'overflow-y-auto' : 'overflow-visible'}`}
            style={{ maxHeight: isMobile ? 'calc(100% - 100px)' : 'none' }} 
        >
            <main className={`flex flex-col lg:flex-row w-full`}>
                <div className="flex flex-col w-full lg:w-2/3 xl:w-3/5 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800">
                    <Synths
                    oscillators={synthState.oscillators}
                    onOscChange={handleOscChange}
                    onADSRChange={handleADSRChange}
                    />
                </div>
                <div className="flex flex-col w-full lg:w-1/3 xl:w-2/5">
                    <FX settings={synthState.fx} onChange={handleFXChange} />
                </div>
            </main>
        </div>

        {isMobile && isSequencerVisible && (
            <div
            className="fixed inset-0 bg-black/50 z-[1001] lg:hidden"
            onClick={() => setSequencerVisible(false)}
            />
        )}

        <footer id="sequencer-panel" className={`bg-panel-bg border-t border-gray-800 transition-transform duration-300 ease-in-out flex flex-col
            ${isMobile 
                ? 'fixed bottom-0 left-0 right-0 w-full z-[1002] h-[90vh]' 
                : 'flex-1 min-h-0 relative'
            }
            ${isMobile && !isSequencerVisible ? 'translate-y-full' : 'translate-y-0'}
            `}
            onClick={(e) => e.stopPropagation()}
        >
            {isMobile && (
                <button
                    onClick={() => setSequencerVisible(prev => !prev)}
                    className="sequencer-toggle-mobile absolute -top-8 right-4 w-[70px] h-8 text-sm z-[1005] flex items-center justify-center lg:hidden rounded-t-lg shadow-lg"
                    aria-controls="sequencer-panel"
                    aria-expanded={isSequencerVisible}
                >
                    <span>Seq</span>
                </button>
            )}
            <Sequencer
            steps={synthState.sequencer.steps}
            stepCount={synthState.sequencer.stepCount}
            currentStep={currentStep}
            oscColors={oscColors}
            onStepClick={(track, step, rect) => setEditingStep({track, step, rect})}
            onDetailsClick={(track, step, rect) => setEditingStepDetails({track, step, rect})}
            onStepToggle={handleStepToggle}
            onContextMenu={handleContextMenu}
            onClear={handleClearSequencer}
            isMobile={isMobile}
            />
        </footer>

        {editingStep && (
          <PianoRoll 
              activeNotes={activeNotesForPiano}
              trackSteps={synthState.sequencer.steps[editingStep.track]}
              onClose={() => setEditingStep(null)}
              onNoteToggle={handleNoteToggle}
              onSetNotes={handleSetNotes}
              rect={editingStep.rect}
              oscColor={oscColors[editingStep.track]}
              isMobile={isMobile}
          />
        )}
        {editingStepDetails && activeStepDetails && (
          <StepDetailsPopover
              stepData={activeStepDetails}
              rect={editingStepDetails.rect}
              onClose={() => setEditingStepDetails(null)}
              onChange={handleStepDetailsChange}
              trackIndex={editingStepDetails.track}
              stepIndex={editingStepDetails.step}
              isMobile={isMobile}
          />
        )}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onClose={() => setContextMenu(null)}
            isPasteDisabled={!copiedStep}
            isEnabled={contextMenu.isEnabled}
            onToggle={() => {
              handleStepToggle(contextMenu.trackIndex, contextMenu.stepIndex);
              setContextMenu(null);
            }}
          />
        )}
      </div>
    </React.Fragment>
  );
};

export default App;
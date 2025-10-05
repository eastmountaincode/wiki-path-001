// SynthController - Handles Tone.js synth initialization and note playing

class SynthController {
  constructor(colorInstrumentMap) {
    this.colorInstrumentMap = colorInstrumentMap;
    this.synths = {};
    this.toneInitiated = false;
    this.volume = null;
    this.reverb = null;
  }

  // Initialize all synths (call this on first user interaction)
  initializeSynths() {
    if (this.toneInitiated) return;
    
    Tone.start();
    
    // Create volume control (reduce volume a bit)
    this.volume = new Tone.Volume(-12).toDestination(); // -12dB quieter
    
    this.reverb = new Tone.Reverb({
      decay: 7,
      preDelay: 0.01,
      wet: 0.8,
    }).connect(this.volume);
    
    // Create all synth types
    this.synths.AMSynth = new Tone.AMSynth().connect(this.reverb);
    this.synths.DuoSynth = new Tone.DuoSynth().connect(this.reverb);
    this.synths.FMSynth = new Tone.FMSynth().connect(this.reverb);
    this.synths.MembraneSynth = new Tone.MembraneSynth().connect(this.reverb);
    this.synths.MonoSynth = new Tone.MonoSynth().connect(this.reverb);
    this.synths.NoiseSynth = new Tone.NoiseSynth().connect(this.reverb);
    this.synths.PluckSynth = new Tone.PluckSynth().connect(this.reverb);
    this.synths.PolySynth = new Tone.PolySynth().connect(this.reverb);
    this.synths.Synth = new Tone.Synth().connect(this.reverb);
    
    this.toneInitiated = true;
    console.log('🎵 Synths initialized');
  }

  // Play a note with the specified instrument
  playNote(wordIndex, words, wordData, instrument) {
    // Safety check: don't play if synths aren't initialized yet
    if (!this.toneInitiated) return;
    
    if (!words[wordIndex]) return;
    
    const noteWord = words[wordIndex].textContent;
    const line = wordData[wordIndex]?.line || 0;
    
    const noteLength = noteWord.length * 0.05;
    const noteOctave = (line % 4) + 1;
    const noteNumber = wordIndex % 5;
    const noteMap = ['A', 'C', 'D', 'E', 'G'];
    
    console.log(noteMap[noteNumber], noteOctave, 'instrument:', instrument);
    
    // Use "+0.01" to schedule note slightly in future to prevent timing conflicts
    const now = Tone.now();
    
    try {
      const synth = this.synths[instrument];
      
      if (!synth) {
        console.warn('Unknown instrument:', instrument);
        return;
      }
      
      // NoiseSynth doesn't support pitched notes
      if (instrument === 'NoiseSynth') {
        synth.triggerAttackRelease(noteLength, now + 0.01);
      } else {
        synth.triggerAttackRelease(
          noteMap[noteNumber] + noteOctave,
          noteLength,
          now + 0.01
        );
      }
    } catch (error) {
      console.warn('Error playing note:', error.message);
    }
  }

  // Check if synths are initialized
  isInitialized() {
    return this.toneInitiated;
  }

  // Dispose of all synths (cleanup)
  dispose() {
    Object.values(this.synths).forEach(synth => {
      if (synth && synth.dispose) {
        synth.dispose();
      }
    });
    if (this.reverb) this.reverb.dispose();
    if (this.volume) this.volume.dispose();
    this.toneInitiated = false;
  }
}


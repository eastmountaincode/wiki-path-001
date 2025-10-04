// TextToSpeech - Handles text-to-speech functionality

class TextToSpeech {
  constructor() {
    // Check if speech synthesis is available
    this.isAvailable = 'speechSynthesis' in window;
    
    if (!this.isAvailable) {
      console.warn('Text-to-speech not available in this browser');
    }
  }

  // Speak a single word or phrase
  speak(text) {
    if (!this.isAvailable || !text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }

  // Stop any current speech
  stop() {
    if (!this.isAvailable) return;
    speechSynthesis.cancel();
  }

  // Check if currently speaking
  isSpeaking() {
    if (!this.isAvailable) return false;
    return speechSynthesis.speaking;
  }
}


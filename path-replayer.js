// PathReplayer - Handles replaying paths with visual effects and audio

class PathReplayer {
  constructor(words, wordData, synthController, tts, userColor) {
    this.words = words;
    this.wordData = wordData;
    this.synthController = synthController;
    this.tts = tts;
    this.userColor = userColor;
    this.replaySpeed = 50; // milliseconds between words
  }

  // Generic replay function (private helper)
  _replayWordArray(indexArray, index = 0, options = {}) {
    const { spoken = false, color = this.userColor, opacity = 1.0, instrument = null } = options;
    
    if (index < indexArray.length) {
      const replayIndex = indexArray[index];
      
      if (this.words[replayIndex]) {
        // Play note if instrument provided
        if (instrument && this.synthController) {
          this.synthController.playNote(replayIndex, this.words, this.wordData, instrument);
        }
        
        // Apply visual effects
        this.words[replayIndex].style.transition = 'none';
        this.words[replayIndex].style.backgroundColor = color;
        
        // Set opacity for historical paths
        if (opacity < 1.0) {
          this.words[replayIndex].style.opacity = opacity.toString();
        }
        
        this.words[replayIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        
        // Enable transition and fade to white over 1 second
        setTimeout(() => {
          if (this.words[replayIndex]) {
            this.words[replayIndex].style.transition = 'background-color 1s ease-out, opacity 1s ease-out';
            this.words[replayIndex].style.backgroundColor = 'white';
            this.words[replayIndex].style.opacity = '1';
          }
        }, 10);
        
        // Speak word if requested
        if (spoken && this.tts) {
          console.log('speaking', this.words[replayIndex].textContent);
          this.tts.speak(this.words[replayIndex].textContent);
        }
      }
      
      // Continue to next word
      setTimeout(() => {
        this._replayWordArray(indexArray, index + 1, options);
      }, this.replaySpeed);
    } else {
      console.log("Replay finished.");
    }
  }

  // Replay your local path (all words you've navigated through)
  replayLocalPath(pathWordIndexes, instrument) {
    console.log('🔄 Replaying local path:', pathWordIndexes.length, 'words');
    this._replayWordArray(pathWordIndexes, 0, {
      spoken: false,
      color: this.userColor,
      opacity: 1.0,
      instrument: instrument
    });
  }

  // Replay selected words (words you marked with E key) with speech (no notes)
  replaySelectedWords(selectedWordIndexes, instrument) {
    console.log('🗣️ Replaying selected words:', selectedWordIndexes.length, 'words');
    this._replayWordArray(selectedWordIndexes, 0, {
      spoken: true,
      color: this.userColor,
      opacity: 1.0,
      instrument: null  // No notes for local replay
    });
  }

  // Replay selected words from server with speech and their original color
  replayServerSelectedWords(selectedWordIndexes, color) {
    console.log('🎲 Replaying server selected words:', selectedWordIndexes.length, 'words');
    this._replayWordArray(selectedWordIndexes, 0, {
      spoken: true,
      color: color,
      opacity: 1.0,
      instrument: null  // No notes
    });
  }

  // Replay historical paths from other users (with their color and lower opacity)
  replayHistoricalPath(pathArray, color, index = 0) {
    if (index < pathArray.length) {
      const replayIndex = pathArray[index];
      
      if (this.words[replayIndex] && replayIndex >= 0 && replayIndex < this.words.length) {
        // Set instant color change with lower opacity for historical paths
        this.words[replayIndex].style.transition = 'none';
        this.words[replayIndex].style.backgroundColor = color;
        this.words[replayIndex].style.opacity = '0.1'; // Lower opacity for historical paths
        
        // Enable transition and fade to white over 1 second
        setTimeout(() => {
          if (this.words[replayIndex]) {
            this.words[replayIndex].style.transition = 'background-color 1s ease-out, opacity 1s ease-out';
            this.words[replayIndex].style.backgroundColor = 'white';
            this.words[replayIndex].style.opacity = '1';
          }
        }, 10);
      }
      
      setTimeout(() => {
        this.replayHistoricalPath(pathArray, color, index + 1);
      }, this.replaySpeed);
    }
  }

  // Set replay speed (milliseconds between words)
  setReplaySpeed(speed) {
    this.replaySpeed = speed;
  }
}


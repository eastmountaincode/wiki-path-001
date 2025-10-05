// Wiki Path 001 - Word Navigation (Multiplayer)
// Navigate through words on a page using WASD keys
// Now with real-time multiplayer via WebSocket!

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

function start() {
  // Color to instrument mapping (matches server)
  const colorInstrumentMap = {
    '#970302': 'AMSynth',      // Red
    '#E679A6': 'DuoSynth',     // Pink
    '#EE8019': 'FMSynth',      // Orange
    '#F0BC00': 'MembraneSynth', // Yellow
    '#5748B5': 'PolySynth',    // Purple
    '#305D70': 'MonoSynth',    // Dark green
    '#0E65C0': 'NoiseSynth',   // Blue
    '#049DFF': 'PluckSynth',   // Bright Blue
    '#E9E7C4': 'PolySynth',    // Bright Yellow
    '#308557': 'Synth',        // Green
    '#71D1B3': 'FMSynth'       // Bright Green
  };
  
  // WebSocket connection
  const SOCKET_SERVER = 'https://wiki-path.freewaterhouse.com';
  let socket = null;
  let userColor = null;
  let userInstrument = 'Synth'; // Default instrument
  let otherUsers = {}; // Track other users in the room
  
  // Synth instances (created once and reused)
  let userSynth = null;
  let otherUserSynths = {}; // Store synths for other users by ID
  let toneStarted = false;
  
  // Initialize path storage arrays
  const pathWordIndexes = [];
  const selectedWordIndexes = [];

  // Initialize components
  const extractor = new TextExtractor();
  const tts = new TextToSpeech();
  
  // Get the content area
  const contentArea = extractor.getContentArea();

  if (!contentArea) {
    console.log('No content area found');
    return;
  }

  // Wrap all words in spans
  const wrapper = new WordWrapper(extractor);
  const words = wrapper.wrapWords(contentArea);
  
  if (words.length === 0) {
    console.log('ERROR: No words found!');
    return;
  }
  
  let currentIndex = 0;
  
  // Calculate line positions for each word
  const calculator = new LinePosCalculator();
  const wordData = calculator.calculatePositions(words);
  
  // Highlight current word
  function highlightWord(index) {    
    currentIndex = index;
    
    if (words[currentIndex]) {
      pathWordIndexes.push(currentIndex);
      
      // Set instant color change (no transition on applying color)
      words[currentIndex].style.transition = 'none';
      words[currentIndex].style.backgroundColor = userColor;
      words[currentIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      
      // Enable transition and fade to white over 1 second
      setTimeout(() => {
        if (words[index]) {
          words[index].style.transition = 'background-color 1s ease-out';
          words[index].style.backgroundColor = 'white';
        }
      }, 10); // Small delay to ensure transition applies
      
      // Send position update to other users
      if (socket && wordData[currentIndex]) {
        socket.emit('move', {
          wordIndex: currentIndex,
          line: wordData[currentIndex].line,
          positionInLine: wordData[currentIndex].positionInLine
        });
      }
    }
  }
  
  // Highlight other users' positions
  function highlightOtherUser(wordIndex, color) {
    if (wordIndex >= 0 && wordIndex < words.length) {
      // Set instant color change (no transition on applying color)
      words[wordIndex].style.transition = 'none';
      words[wordIndex].style.backgroundColor = color;
      
      // Enable transition and fade to white over 1 second
      setTimeout(() => {
        if (words[wordIndex]) {
          words[wordIndex].style.transition = 'background-color 1s ease-out';
          words[wordIndex].style.backgroundColor = 'white';
        }
      }, 10); // Small delay to ensure transition applies
    }
  }
  
// Speech to text of highlight
 function selectWord(index) {
    currentIndex = index;
    
    if (words[currentIndex]) {
      selectedWordIndexes.push(currentIndex);
      //words[currentIndex].style.fontWeight = 'bold';
      words[currentIndex].style.backgroundColor = userColor;
      words[currentIndex].style.filter = 'invert(75%)'
      words[currentIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      tts.speak(words[currentIndex].textContent);
      
      // Send selection to other users
      if (socket && wordData[currentIndex]) {
        console.log('📤 EMITTING select-emit:', {
          wordIndex: currentIndex,
          text: words[currentIndex].textContent
        });
        socket.emit('select-emit', {
          wordIndex: currentIndex,
          line: wordData[currentIndex].line,
          positionInLine: wordData[currentIndex].positionInLine,
          text: words[currentIndex].textContent
        });
      } else {
        console.log('⚠️ Cannot emit select-emit - socket:', !!socket, 'wordData:', !!wordData[currentIndex]);
      }
    }

}

  // Start on first word
  highlightWord(0);
  
   // Initiate some tone stuff
   let toneInitiated = false;
   let AMSynth;
   let DuoSynth;
   let FMSynth;
   let MembraneSynth;
   let MonoSynth;
   let NoiseSynth;
   let PluckSynth;
   let PolySynth;
   let synth;
  
  // Handle movement commands
  function handleCommand(command) {
    if (!toneInitiated) {
      Tone.start();
          // Tone stuff
                // Play a note from that synth
        const reverb = new Tone.Reverb({
          decay: 7, // Adjust decay time as desired
          preDelay: 0.01, // Adjust preDelay as desired
          wet: 0.8, // Adjust wet/dry mix as desired
        }).toDestination(); // Connect the reverb to the master output
             // Create the appropriate synth based on instrument type
             AMSynth = new Tone.AMSynth().toDestination().connect(reverb);
             DuoSynth = new Tone.DuoSynth().toDestination().connect(reverb);
             FMSynth = new Tone.FMSynth().toDestination().connect(reverb);
             MembraneSynth = new Tone.MembraneSynth().toDestination().connect(reverb);
             MonoSynth = new Tone.MonoSynth().toDestination().connect(reverb);
             NoiseSynth = new Tone.NoiseSynth().toDestination().connect(reverb);
             PluckSynth = new Tone.PluckSynth().toDestination().connect(reverb);
             PolySynth = new Tone.PolySynth().toDestination().connect(reverb);
             synth = new Tone.Synth().toDestination().connect(reverb);
        
      synth.connect(reverb);
      toneInitiated = true;
    }
    const currentWord = wordData[currentIndex];
    if (command === 'left') {
      // Find previous word on same line
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (wordData[i].line === currentWord.line) {
          playNote(i, command, currentWord.line);
          highlightWord(i);
          return;
        }
      }
    } else if (command === 'right') {
      // Find next word on same line
      for (let i = currentIndex + 1; i < words.length; i++) {
        if (wordData[i].line === currentWord.line) {
          highlightWord(i);
          playNote(i, command, currentWord.line);
          return;
        }
      }
    } else if (command === 'up') {
      // Find word on previous line at closest X position
      const targetLine = currentWord.line - 1;
      if (targetLine < 0) return;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.min(currentWord.positionInLine, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
      playNote(wordsOnTargetLine[targetPos].index, command, targetLine)
    } else if (command === 'down') {
      // Find word on next line at closest X position
      const targetLine = currentWord.line + 1;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.min(currentWord.positionInLine, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
      playNote(wordsOnTargetLine[targetPos].index, command, targetLine)
    } else if (command === 'up-left') {
      // Go up one line and left one word
      const targetLine = currentWord.line - 1;
      if (targetLine < 0) return;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.max(0, Math.min(currentWord.positionInLine - 1, wordsOnTargetLine.length - 1));
      highlightWord(wordsOnTargetLine[targetPos].index);
      playNote(wordsOnTargetLine[targetPos].index, command, targetLine);

    } else if (command === 'up-right') {
      // Go up one line and right one word
      const targetLine = currentWord.line - 1;
      if (targetLine < 0) return;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.min(currentWord.positionInLine + 1, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
      playNote(wordsOnTargetLine[targetPos].index, command, targetLine);
    } else if (command === 'down-left') {
      // Go down one line and left one word
      const targetLine = currentWord.line + 1;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.max(0, Math.min(currentWord.positionInLine - 1, wordsOnTargetLine.length - 1));
      highlightWord(wordsOnTargetLine[targetPos].index);
      playNote(wordsOnTargetLine[targetPos].index, command, targetLine);
    } else if (command === 'down-right') {
      // Go down one line and right one word
      const targetLine = currentWord.line + 1;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.min(currentWord.positionInLine + 1, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
      playNote(wordsOnTargetLine[targetPos].index, command, targetLine);
    } else if (command === 'select') {
      //console.log('current index select', currentIndex)
      selectWord(currentIndex);
    }
  }
  
  // Initialize movement controller
  const controller = new MovementController(handleCommand);
  
  // Initialize WebSocket connection
  try {
    socket = io(SOCKET_SERVER);
    
    socket.on('connect', () => {
      console.log('🌐 Connected to multiplayer server');
      
      // Join room based on current page URL
      const roomId = window.location.href;
      socket.emit('join-room', roomId);
      console.log('🚪 Joined room:', roomId);
      
      // Periodically send path to server (every 5 seconds)
      setInterval(() => {
        if (socket && pathWordIndexes.length > 0) {
          console.log('💾 Sending path to server:', pathWordIndexes.length, 'words');
          socket.emit('save-path', {
            path: pathWordIndexes
          });
        }
      }, 5000); // Every 5 seconds
    });
    
    // Receive assigned color from server
    socket.on('user-color', (color) => {
      userColor = color;
      console.log('🎨 Your color:', userColor);
      
      // Re-highlight current word with server-assigned color
      if (words[currentIndex]) {
        words[currentIndex].style.backgroundColor = userColor;
      }
    });
    
    // Receive assigned instrument from server
    socket.on('user-instrument', (instrument) => {
      userInstrument = instrument;
      console.log('🎸 Your instrument:', userInstrument);
    });
    
    // Receive current users in room
    socket.on('room-users', (users) => {
      console.log('👥 Users in room:', Object.keys(users).length);
      otherUsers = users;
      
      // Render trails of existing users
      Object.values(users).forEach(user => {
        if (user.id !== socket.id && user.trail) {
          user.trail.forEach(wordIndex => {
            highlightOtherUser(wordIndex, user.color);
          });
        }
      });
    });
    
    // Receive all historical paths for this room
    socket.on('historical-paths', (data) => {
      console.log('📜 Received historical paths:', data.paths.length, 'paths');
      
      // Replay each historical path with animation
      data.paths.forEach((pathData, pathIndex) => {
        const { userId, color, path } = pathData;
        console.log(`  - Replaying path from ${userId}: ${path.length} words`);
        
        // Replay this path with a delay so we can see each one
        setTimeout(() => {
          replayHistoricalPath(path, color);
        }, pathIndex * 500); // Stagger each path by 500ms
      });
    });
    
    // Another user joined
    socket.on('user-joined', (user) => {
      console.log('✅ User joined:', user.id);
      otherUsers[user.id] = user;
    });
    
    // Another user moved
    socket.on('user-moved', (data) => {
      const { id, color, instrument, position, line } = data;
      
      // Update user data
      if (!otherUsers[id]) {
        otherUsers[id] = { id, color, instrument, trail: [] };
      }
      otherUsers[id].position = position;
      otherUsers[id].instrument = instrument;
      if (!otherUsers[id].trail) {
        otherUsers[id].trail = [];
      }
      otherUsers[id].trail.push(position);
      
      // Highlight their new position
      highlightOtherUser(position, color);
      
      // Play note for other user's movement with their instrument
      playNote(position, 'other-user', line, instrument, id);
    });
    
    // Another user selected a word
    socket.on('select-receive', (data) => {
      const { id, color, position, text } = data;
      
      console.log('📥 RECEIVED select-receive:', {
        userId: id,
        text: text,
        position: position,
        color: color
      });
      
      // Update user data
      if (!otherUsers[id]) {
        otherUsers[id] = { id, color, trail: [] };
      }
      
      // Highlight the selected word with inverted filter
      if (position >= 0 && position < words.length) {
        words[position].style.backgroundColor = color;
        words[position].style.filter = 'invert(75%)';
        console.log('✅ Highlighted and speaking word:', text);
      }
      
      // Optionally: speak the word that another user selected
      tts.speak(text);
    });
    
    // Another user left
    socket.on('user-left', (userId) => {
      console.log('❌ User left:', userId);
      
      // Clean up their synth
      if (otherUserSynths[userId]) {
        otherUserSynths[userId].dispose();
        delete otherUserSynths[userId];
      }
      
      delete otherUsers[userId];
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from multiplayer server');
    });
    
  } catch (error) {
    console.log('⚠️ Multiplayer unavailable:', error.message);
    console.log('💡 Running in single-player mode');
    // Assign random color for single-player
    const colorPalette = Object.keys(colorInstrumentMap);
    userColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    userInstrument = colorInstrumentMap[userColor];
    console.log('🎨 Your color:', userColor);
    console.log('🎸 Your instrument:', userInstrument);
  }
  
  console.log('✨ Ready!');

  // Replay a historical path with a specific color
  function replayHistoricalPath(indexArray, color, index = 0) {
    if (index < indexArray.length) {
      const replayIndex = indexArray[index];
      
      if (words[replayIndex] && replayIndex >= 0 && replayIndex < words.length) {
        // Set instant color change with lower opacity for historical paths
        words[replayIndex].style.transition = 'none';
        words[replayIndex].style.backgroundColor = color;
        words[replayIndex].style.opacity = '0.2'; // Lower opacity for historical paths
        
        // Enable transition and fade to white over 1 second
        setTimeout(() => {
          if (words[replayIndex]) {
            words[replayIndex].style.transition = 'background-color 1s ease-out, opacity 1s ease-out';
            words[replayIndex].style.backgroundColor = 'white';
            words[replayIndex].style.opacity = '1'; // Fade back to full opacity
          }
        }, 10);
      }
      
      setTimeout(() => {
        replayHistoricalPath(indexArray, color, index + 1);
      }, 50); // Fast replay - 50ms between words
    }
  }

  // Replay the path
  function replayPathWithTimeout(indexArray, index = 0, spoken = false) {
    if (index < indexArray.length) {
      const replayIndex = indexArray[index];
      if (words[replayIndex]) {
      playNote(replayIndex, 'none', wordData[index].line);
      //words[index].style.fontWeight = 'bold';
      words[replayIndex].style.backgroundColor = userColor;
      words[replayIndex].style.filter = 'invert(75%)'
      words[replayIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (spoken) {
        console.log('speaking', words[replayIndex]);
        tts.speak(words[replayIndex].textContent);
      }
    }
      setTimeout(() => {
                replayPathWithTimeout(indexArray, index + 1, spoken);
            }, 50); // Fast replay - 50ms between words
        } else {
            console.log("Loop finished.");
        }
  }

  
  /** Add Replay Buttons for Testing **/
  const replayPathButton = document.createElement('button');
  replayPathButton.innerText = 'Replay Path';
  replayPathButton.id = 'replayPathButton'; // Assign an ID for styling or further manipulation

   // Add styling (optional)
    replayPathButton.style.position = 'fixed';
    replayPathButton.style.bottom = '10px';
    replayPathButton.style.right = '200px';
    replayPathButton.style.zIndex = '9999'; // Ensure it's on top of other elements

    // Add an event listener to the button
    replayPathButton.addEventListener('click', () => {
      replayPathWithTimeout(pathWordIndexes)
    });

    // Append the button to the page's body
    document.body.prepend(replayPathButton);

  const replaySelectedButton = document.createElement('button');
  replaySelectedButton.innerText = 'Replay Selected';
  replaySelectedButton.id = 'replaySelectedButton'; // Assign an ID for styling or further manipulation

   // Add styling (optional)
    replaySelectedButton.style.position = 'fixed';
    replaySelectedButton.style.bottom = '10px';
    replaySelectedButton.style.right = '10px';
    replaySelectedButton.style.zIndex = '9999'; // Ensure it's on top of other elements

    // Add an event listener to the button
    replaySelectedButton.addEventListener('click', () => {
      replayPathWithTimeout(selectedWordIndexes, 0, true)
    });

    // Append the button to the page's body
    document.body.prepend(replaySelectedButton);

      // Tone stuff

      function playNote(currentIndex, command, line, instrument = userInstrument) {
        const noteWord = words[currentIndex].textContent;
        const direction = command;
        const depth = line;

        const noteLength = noteWord.length * 0.05;
        const noteOctave = depth % 4 + 1;
        const noteNumber = currentIndex % 5;
        const noteMap = ['A', 'C', 'D', 'E', 'G'];

        console.log(noteMap[noteNumber], noteOctave, 'instrument:', instrument);

          switch(instrument) {
           case 'AMSynth':
             AMSynth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
           case 'DuoSynth':
             DuoSynth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
           case 'FMSynth':
             FMSynth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
           case 'MembraneSynth':
             MembraneSynth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
           case 'MonoSynth':
             MonoSynth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
           case 'NoiseSynth':
             NoiseSynth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
           case 'PluckSynth':
             PluckSynth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
           case 'PolySynth':
             PolySynth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
           case 'Synth':
           default:
             synth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
             break;
         }

        synth.triggerAttackRelease(noteMap[noteNumber] + noteOctave, noteLength);
      }
    }

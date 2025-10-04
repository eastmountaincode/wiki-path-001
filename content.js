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
  // WebSocket connection
  const SOCKET_SERVER = 'https://wiki-path.freewaterhouse.com';
  let socket = null;
  let userColor = null;
  let otherUsers = {}; // Track other users in the room
  
  // Get the content area
  const extractor = new TextExtractor();
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
      words[currentIndex].style.backgroundColor = userColor;
      words[currentIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      
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
  function highlightOtherUser(userId, wordIndex, color) {
    if (wordIndex >= 0 && wordIndex < words.length) {
      words[wordIndex].style.backgroundColor = color;
    }
  }
  
// Speech to text of highlight
 function selectWord(index) {
    currentIndex = index;
    
    if (words[currentIndex]) {
      //words[currentIndex].style.fontWeight = 'bold';
      words[currentIndex].style.backgroundColor = userColor;
      words[currentIndex].style.filter = 'invert(75%)'
      words[currentIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const utterance = new SpeechSynthesisUtterance(words[currentIndex].textContent);
      speechSynthesis.speak(utterance);
    }

}

  // Start on first word
  highlightWord(0);
  
  // Handle movement commands
  function handleCommand(command) {
    const currentWord = wordData[currentIndex];
    
    if (command === 'left') {
      // Find previous word on same line
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (wordData[i].line === currentWord.line) {
          highlightWord(i);
          return;
        }
      }
    } else if (command === 'right') {
      // Find next word on same line
      for (let i = currentIndex + 1; i < words.length; i++) {
        if (wordData[i].line === currentWord.line) {
          highlightWord(i);
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
    } else if (command === 'down') {
      // Find word on next line at closest X position
      const targetLine = currentWord.line + 1;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.min(currentWord.positionInLine, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
    } else if (command === 'up-left') {
      // Go up one line and left one word
      const targetLine = currentWord.line - 1;
      if (targetLine < 0) return;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.max(0, Math.min(currentWord.positionInLine - 1, wordsOnTargetLine.length - 1));
      highlightWord(wordsOnTargetLine[targetPos].index);
    } else if (command === 'up-right') {
      // Go up one line and right one word
      const targetLine = currentWord.line - 1;
      if (targetLine < 0) return;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.min(currentWord.positionInLine + 1, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
    } else if (command === 'down-left') {
      // Go down one line and left one word
      const targetLine = currentWord.line + 1;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.max(0, Math.min(currentWord.positionInLine - 1, wordsOnTargetLine.length - 1));
      highlightWord(wordsOnTargetLine[targetPos].index);
    } else if (command === 'down-right') {
      // Go down one line and right one word
      const targetLine = currentWord.line + 1;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      const targetPos = Math.min(currentWord.positionInLine + 1, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
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
    
    // Receive current users in room
    socket.on('room-users', (users) => {
      console.log('👥 Users in room:', Object.keys(users).length);
      otherUsers = users;
      
      // Render trails of existing users
      Object.values(users).forEach(user => {
        if (user.id !== socket.id && user.trail) {
          user.trail.forEach(wordIndex => {
            highlightOtherUser(user.id, wordIndex, user.color);
          });
        }
      });
    });
    
    // Another user joined
    socket.on('user-joined', (user) => {
      console.log('✅ User joined:', user.id);
      otherUsers[user.id] = user;
    });
    
    // Another user moved
    socket.on('user-moved', (data) => {
      const { id, color, position } = data;
      
      // Update user data
      if (!otherUsers[id]) {
        otherUsers[id] = { id, color, trail: [] };
      }
      otherUsers[id].position = position;
      if (!otherUsers[id].trail) {
        otherUsers[id].trail = [];
      }
      otherUsers[id].trail.push(position);
      
      // Highlight their new position
      highlightOtherUser(id, position, color);
    });
    
    // Another user left
    socket.on('user-left', (userId) => {
      console.log('❌ User left:', userId);
      delete otherUsers[userId];
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from multiplayer server');
    });
    
  } catch (error) {
    console.log('⚠️ Multiplayer unavailable:', error.message);
    console.log('💡 Running in single-player mode');
    // Assign random color for single-player
    const colorPalette = [
      '#970302', '#E679A6', '#EE8019', '#F0BC00', '#5748B5',
      '#305D70', '#0E65C0', '#049DFF', '#E9E7C4', '#308557', '#71D1B3'
    ];
    userColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
  }
  
  console.log('✨ Ready!');
}


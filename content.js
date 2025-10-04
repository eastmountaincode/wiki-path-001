// Wiki Path 001 - Word Navigation
// Navigate through words on a page using WASD keys

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

function start() {
  // Color palette for user highlights
  const colorPalette = [
    '#C44601', // Burnt orange
    '#F57600', // Orange
    '#8BABF1', // Light blue
    '#0073E6', // Bright blue
    '#054FB9'  // Dark blue
  ];
  
  // Assign random color to this user
  const userColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
  console.log('Your highlight color:', userColor);
  
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
    // Remove bold from previous word (but keep the color trail)
    if (words[currentIndex]) {
      words[currentIndex].style.fontWeight = 'normal';
    }
    
    currentIndex = index;
    
    if (words[currentIndex]) {
      //words[currentIndex].style.fontWeight = 'bold';
      words[currentIndex].style.backgroundColor = userColor;
      words[currentIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
  
// Speech to text of highlight
 function selectWord(index) {
    console.log('Selected Word:', index);
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
  console.log('Ready!');
}


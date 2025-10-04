// Wiki Path 001 - Word Navigation
// Navigate through words on a page using WASD keys

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

function start() {
  // Get the content area
  const extractor = new TextExtractor();
  const contentArea = extractor.getContentArea();
  
  if (!contentArea) {
    console.log('No content area found');
    return;
  }
  
  // Find all text nodes and wrap words in spans
  const words = [];
  let currentIndex = 0;
  
  const walker = document.createTreeWalker(
    contentArea,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    // Skip if empty or inside excluded element
    if (node.textContent.trim() && !extractor.isExcluded(node)) {
      textNodes.push(node);
    }
  }
  
  // Log the navigation area text
  const navigationText = textNodes.map(n => n.textContent).join('');
  console.log('Navigation area text:', navigationText);
  
  // Wrap each word in each text node with a span
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const parent = textNode.parentNode;
    const fragment = document.createDocumentFragment();
    
    // Split by whitespace but keep the whitespace
    const parts = text.split(/(\s+)/);
    
    parts.forEach(part => {
      if (part.trim()) {
        // It's a word - wrap it
        const span = document.createElement('span');
        span.textContent = part;
        span.className = 'wiki-word';
        fragment.appendChild(span);
        words.push(span);
      } else if (part) {
        // It's whitespace - keep it as text
        fragment.appendChild(document.createTextNode(part));
      }
    });
    
    parent.replaceChild(fragment, textNode);
  });
  
  console.log('Total words:', words.length);
  console.log('Total text nodes processed:', textNodes.length);
  
  if (words.length === 0) {
    console.log('ERROR: No words found!');
    return;
  }
  
  // Calculate line positions for each word
  const wordData = words.map((span, index) => {
    const rect = span.getBoundingClientRect();
    return {
      element: span,
      index: index,
      x: rect.left,
      y: Math.round(rect.top),
      line: 0,
      positionInLine: 0
    };
  });
  
  // Group words by their Y position (visual line)
  const lineMap = new Map();
  wordData.forEach(data => {
    if (!lineMap.has(data.y)) {
      lineMap.set(data.y, []);
    }
    lineMap.get(data.y).push(data);
  });
  
  // Sort lines by Y position and assign line numbers
  const sortedLines = Array.from(lineMap.entries()).sort((a, b) => a[0] - b[0]);
  sortedLines.forEach((entry, lineNum) => {
    const [y, wordsOnLine] = entry;
    wordsOnLine.forEach((wordInfo, posInLine) => {
      wordInfo.line = lineNum;
      wordInfo.positionInLine = posInLine;
    });
  });
  
  console.log('Total lines:', sortedLines.length);
  
  // Highlight current word
  function highlightWord(index) {
    if (words[currentIndex]) {
      words[currentIndex].style.fontWeight = 'normal';
    }
    currentIndex = index;
    if (words[currentIndex]) {
      words[currentIndex].style.fontWeight = 'bold';
      words[currentIndex].style.backgroundColor = 'yellow';


      words[currentIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      console.log('Highlighted word:', words[currentIndex].textContent);
    }
  }
  
  // Start on first word
  highlightWord(0);
  
  // Handle movement commands
  function handleCommand(command) {
    const currentWord = wordData[currentIndex];
    console.log('Current word:', currentWord);
    console.log('Current index:', currentIndex);
    
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
      if (targetLine < 0) return; // No line above
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;
      
      // Find closest word by position
      const targetPos = Math.min(currentWord.positionInLine, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
    } else if (command === 'down') {
      // Find word on next line at closest X position
      const targetLine = currentWord.line + 1;
      
      const wordsOnTargetLine = wordData.filter(w => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return; // No line below
      
      // Find closest word by position
      const targetPos = Math.min(currentWord.positionInLine, wordsOnTargetLine.length - 1);
      highlightWord(wordsOnTargetLine[targetPos].index);
    }
  }
  
  // Initialize movement controller
  const controller = new MovementController(handleCommand);
  console.log('Ready!');
}


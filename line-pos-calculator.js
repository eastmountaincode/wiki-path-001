// LinePosCalculator - Calculates which visual line each word is on

class LinePosCalculator {
  // Calculate line positions for all words
  calculatePositions(words) {
    // Get position data for each word
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
    
    return wordData;
  }
}


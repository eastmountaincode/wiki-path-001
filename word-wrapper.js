// WordWrapper - Wraps words in the DOM with spans for navigation

class WordWrapper {
  constructor(extractor) {
    this.extractor = extractor;
  }

  // Wrap all words in the content area with spans
  wrapWords(contentArea) {
    const words = [];
    
    // Find all text nodes
    const walker = document.createTreeWalker(
      contentArea,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      // Skip if empty or inside excluded element
      if (node.textContent.trim() && !this.extractor.isExcluded(node)) {
        textNodes.push(node);
      }
    }
    
    // Log the navigation area text
    const navigationText = textNodes.map(n => n.textContent).join('');
    console.log('Navigation area text:', navigationText);
    console.log('Total text nodes:', textNodes.length);
    
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
    
    console.log('Total words wrapped:', words.length);
    return words;
  }
}


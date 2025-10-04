// TextExtractor - Gets the body content from the page

class TextExtractor {
  constructor() {
    // Classes to exclude from navigation (but keep visible)
    this.excludedClasses = [
      'infobox',
      'reference'
      // Add more classes here
    ];

    // IDs to exclude from navigation (but keep visible)
    this.excludedIds = [
      'siteSub'
      // Add more IDs here
    ];

    // Tags to exclude from navigation
    this.excludedTags = [
      'style',
      'script',
      'figure',
      'table'
      // Add more tags here
    ];
  }

  // Get the body content area
  getContentArea() {
    const contentArea = document.querySelector('#bodyContent');
    
    if (!contentArea) {
      console.log('Wikipedia content area not found');
      return null;
    }
    
    console.log('Content area found: #bodyContent');
    return contentArea;
  }

  // Check if a node is inside an excluded element
  isExcluded(node) {
    let current = node.parentElement;
    while (current) {
      // Check excluded tags
      const tagName = current.tagName ? current.tagName.toLowerCase() : '';
      if (this.excludedTags.includes(tagName)) {
        return true;
      }
      
      // Check excluded IDs
      if (current.id && this.excludedIds.includes(current.id)) {
        return true;
      }
      
      // Check excluded classes
      if (current.classList) {
        for (const className of this.excludedClasses) {
          if (current.classList.contains(className)) {
            return true;
          }
        }
      }
      
      current = current.parentElement;
    }
    return false;
  }
}


// TextExtractor - Gets the body text from the page

class TextExtractor {
  // Get the body text from Wikipedia page
  getBodyText() {
    const contentArea = document.querySelector('#bodyContent');
    
    if (!contentArea) {
      console.log('Wikipedia content area not found');
      return '';
    }
    
    console.log('Content area found: #bodyContent');
    
    // Get all the text
    const text = contentArea.innerText;
    
    // Log only the first 200 characters of the body text for a quick preview
    console.log('Body text (head):', text.slice(0, 200));
    console.log('Character count:', text.length);
    
    return text;
  }
}


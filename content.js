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
  const contentArea = document.querySelector('#bodyContent');
  if (!contentArea) {
    console.log('Wikipedia content not found');
    return;
  }
  
  // Extract body text
  const bodyText = contentArea.innerText;
  console.log('Body text:', bodyText);
}


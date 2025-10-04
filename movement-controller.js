// MovementController - Takes keyboard input and outputs commands

class MovementController {
  constructor(onCommand) {
    this.onCommand = onCommand; // Callback function to handle commands
    
    // Listen for key presses
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
  }

  // Handle keyboard input
  handleKeyPress(e) {
    const key = e.key.toLowerCase();
    
    // Handle WASD
    if (key === 'w') {
      e.preventDefault();
      this.onCommand('up');
    } else if (key === 'a') {
      e.preventDefault();
      this.onCommand('left');
    } else if (key === 's') {
      e.preventDefault();
      this.onCommand('down');
    } else if (key === 'd') {
      e.preventDefault();
      this.onCommand('right');
    }
  }
}


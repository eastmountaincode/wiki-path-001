// MovementController - Takes keyboard input and outputs commands

class MovementController {
  constructor(onCommand) {
    this.onCommand = onCommand; // Callback function to handle commands
    this.keysPressed = new Set(); // Track which keys are currently down
    this.isMoving = false; // Track if movement loop is running
    this.moveInterval = 100; // Milliseconds between moves
    this.lastMoveTime = 0;
    
    // Listen for key presses and releases
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  // Handle key down
  handleKeyDown(e) {
    const key = e.key.toLowerCase();
    
    // Only handle WASD
    if (!['w', 'a', 's', 'd', 'e'].includes(key)) return;
    
    //e.preventDefault();
    
    const wasEmpty = this.keysPressed.size === 0;
    
    // Add to pressed keys
    this.keysPressed.add(key);
    
    // If first key pressed, start movement loop
    if (wasEmpty) {
      this.processMovement(); // Immediate first move
      this.startMovementLoop();
    }
  }

  // Handle key up
  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keysPressed.delete(key);
    
    // If no keys pressed, stop movement loop
    if (this.keysPressed.size === 0) {
      this.stopMovementLoop();
    }
  }

  // Start continuous movement loop
  startMovementLoop() {
    if (this.isMoving) return;
    this.isMoving = true;
    this.lastMoveTime = Date.now();
    this.movementLoop();
  }

  // Stop movement loop
  stopMovementLoop() {
    this.isMoving = false;
  }

  // Continuous movement loop
  movementLoop() {
    if (!this.isMoving) return;
    
    const now = Date.now();
    if (now - this.lastMoveTime >= this.moveInterval) {
      this.processMovement();
      this.lastMoveTime = now;
    }
    
    requestAnimationFrame(() => this.movementLoop());
  }

  // Process movement based on currently pressed keys
  processMovement() {
    if (this.keysPressed.size === 0) return;
    
    const hasW = this.keysPressed.has('w');
    const hasA = this.keysPressed.has('a');
    const hasS = this.keysPressed.has('s');
    const hasD = this.keysPressed.has('d');
    const hasE = this.keysPressed.has('e');
    
    // Diagonal movements (two keys pressed)
    if (hasW && hasA) {
      this.onCommand('up-left');
    } else if (hasW && hasD) {
      this.onCommand('up-right');
    } else if (hasS && hasA) {
      this.onCommand('down-left');
    } else if (hasS && hasD) {
      this.onCommand('down-right');
    }
    // Single direction movements
    else if (hasW) {
      this.onCommand('up');
    } else if (hasA) {
      this.onCommand('left');
    } else if (hasS) {
      this.onCommand('down');
    } else if (hasD) {
      this.onCommand('right');
    } else if (hasE) {
      this.onCommand('select');
    }
  }
}


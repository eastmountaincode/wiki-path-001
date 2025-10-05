// Wiki Path 001 - Word Navigation (Multiplayer)
// Navigate through words on a page using WASD keys
// Now with real-time multiplayer via WebSocket!

// Start when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}

function start() {
  // Color to instrument mapping (matches server)
  const colorInstrumentMap = {
    "#970302": "AMSynth", // Red
    "#E679A6": "DuoSynth", // Pink
    "#EE8019": "FMSynth", // Orange
    "#F0BC00": "MembraneSynth", // Yellow
    "#5748B5": "PolySynth", // Purple
    "#305D70": "MonoSynth", // Dark green
    "#0E65C0": "NoiseSynth", // Blue
    "#049DFF": "PluckSynth", // Bright Blue
    "#E9E7C4": "PolySynth", // Bright Yellow
    "#308557": "Synth", // Green
    "#71D1B3": "FMSynth", // Bright Green
  };

  let overlapTimer = null;
  let lastOverlapHref = null;

  // WebSocket connection
  const SOCKET_SERVER = "https://wiki-path.freewaterhouse.com";
  let socket = null;
  let userColor = "#308557"; // Default color
  let userInstrument = colorInstrumentMap[userColor]; // Default instrument
  let otherUsers = {}; // Track other users in the room

  // Synth instances (created once and reused)
  let userSynth = null;
  let otherUserSynths = {}; // Store synths for other users by ID
  let toneStarted = false;

  // Initialize path storage arrays
  const pathWordIndexes = [];
  const selectedWordIndexes = [];

  // Initialize components
  const extractor = new TextExtractor();
  const tts = new TextToSpeech();
  const synthController = new SynthController(colorInstrumentMap);

  // Get the content area
  const contentArea = extractor.getContentArea();

  if (!contentArea) {
    console.log("No content area found");
    return;
  }

  // Wrap all words in spans
  const wrapper = new WordWrapper(extractor);
  const words = wrapper.wrapWords(contentArea);

  // Map each word index to its parent hyperlink (if any)
  const wordToLinkMap = new Map();
  words.forEach((word, index) => {
    const link = word.closest("a[href]");
    if (link) {
      wordToLinkMap.set(index, link);
    }
  });

  if (words.length === 0) {
    console.log("ERROR: No words found!");
    return;
  }

  let currentIndex = 0;

  // Calculate line positions for each word
  const calculator = new LinePosCalculator();
  const wordData = calculator.calculatePositions(words);

  // Initialize path replayer
  const pathReplayer = new PathReplayer(
    words,
    wordData,
    synthController,
    tts,
    userColor
  );

  // Highlight current word
  function highlightWord(index) {
    const lastIndex = currentIndex;
    currentIndex = index;
    console.log(lastIndex, currentIndex);

    if (words[currentIndex]) {
      pathWordIndexes.push(currentIndex);

      // Set instant color change (no transition on applying color)
      words[currentIndex].style.transition = "none";
      words[currentIndex].style.backgroundColor = userColor;
      words[currentIndex].scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

      // Enable transition and fade to white over 1 second
      setTimeout(() => {
        if (words[lastIndex] && lastIndex !== currentIndex) {
          words[lastIndex].style.transition = "background-color 1s ease-out";
          words[lastIndex].style.backgroundColor = "white";
        }
      }, 10); // Small delay to ensure transition applies

      // Send position update to other users
      if (socket && wordData[currentIndex]) {
        socket.emit("move", {
          wordIndex: currentIndex,
          line: wordData[currentIndex].line,
          positionInLine: wordData[currentIndex].positionInLine,
        });
      }
    }
  }

  // Highlight other users' positions
  function highlightOtherUser(wordIndex, color) {
    if (wordIndex >= 0 && wordIndex < words.length) {
      // Set instant color change (no transition on applying color)
      words[wordIndex].style.transition = "none";
      words[wordIndex].style.backgroundColor = color;

      // Enable transition and fade to white over 1 second
      setTimeout(() => {
        if (words[wordIndex]) {
          words[wordIndex].style.transition = "background-color 1s ease-out";
          words[wordIndex].style.backgroundColor = "white";
        }
      }, 10); // Small delay to ensure transition applies
    }
  }

  // Speech to text of highlight (toggle selection)
  function selectWord(index) {
    currentIndex = index;

    if (words[currentIndex]) {
      // Check if word is already selected
      const selectedIndex = selectedWordIndexes.indexOf(currentIndex);

      if (selectedIndex !== -1) {
        // Word is selected - DESELECT it
        selectedWordIndexes.splice(selectedIndex, 1);

        // Remove visual effects
        words[currentIndex].style.backgroundColor = "white";
        words[currentIndex].style.filter = "none";

        console.log("🔽 Deselected word:", words[currentIndex].textContent);
      } else {
        // Word is not selected - SELECT it
        selectedWordIndexes.push(currentIndex);

        // Apply visual effects
        words[currentIndex].style.backgroundColor = userColor;
        words[currentIndex].style.filter = "invert(75%)";
        words[currentIndex].scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
        tts.speak(words[currentIndex].textContent);

        console.log("🔼 Selected word:", words[currentIndex].textContent);

        // Send selection to other users
        if (socket && wordData[currentIndex]) {
          console.log("📤 EMITTING select-emit:", {
            wordIndex: currentIndex,
            text: words[currentIndex].textContent,
          });
          socket.emit("select-emit", {
            wordIndex: currentIndex,
            line: wordData[currentIndex].line,
            positionInLine: wordData[currentIndex].positionInLine,
            text: words[currentIndex].textContent,
          });
        } else {
          console.log(
            "⚠️ Cannot emit select-emit - socket:",
            !!socket,
            "wordData:",
            !!wordData[currentIndex]
          );
        }
      }
    }
  }

  // Start on first word
  highlightWord(0);

  // Handle movement commands
  function handleCommand(command) {
    // Initialize synths on first command
    if (!synthController.isInitialized()) {
      synthController.initializeSynths();
    }

    const currentWord = wordData[currentIndex];
    if (command === "left") {
      // Find previous word on same line
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (wordData[i].line === currentWord.line) {
          synthController.playNote(i, words, wordData, userInstrument);
          highlightWord(i);
          return;
        }
      }
    } else if (command === "right") {
      // Find next word on same line
      for (let i = currentIndex + 1; i < words.length; i++) {
        if (wordData[i].line === currentWord.line) {
          highlightWord(i);
          synthController.playNote(i, words, wordData, userInstrument);
          return;
        }
      }
    } else if (command === "up") {
      // Find word on previous line at closest X position
      const targetLine = currentWord.line - 1;
      if (targetLine < 0) return;

      const wordsOnTargetLine = wordData.filter((w) => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;

      const targetPos = Math.min(
        currentWord.positionInLine,
        wordsOnTargetLine.length - 1
      );
      highlightWord(wordsOnTargetLine[targetPos].index);
      synthController.playNote(
        wordsOnTargetLine[targetPos].index,
        words,
        wordData,
        userInstrument
      );
    } else if (command === "down") {
      // Find word on next line at closest X position
      const targetLine = currentWord.line + 1;

      const wordsOnTargetLine = wordData.filter((w) => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;

      const targetPos = Math.min(
        currentWord.positionInLine,
        wordsOnTargetLine.length - 1
      );
      highlightWord(wordsOnTargetLine[targetPos].index);
      synthController.playNote(
        wordsOnTargetLine[targetPos].index,
        words,
        wordData,
        userInstrument
      );
    } else if (command === "up-left") {
      // Go up one line and left one word
      const targetLine = currentWord.line - 1;
      if (targetLine < 0) return;

      const wordsOnTargetLine = wordData.filter((w) => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;

      const targetPos = Math.max(
        0,
        Math.min(currentWord.positionInLine - 1, wordsOnTargetLine.length - 1)
      );
      highlightWord(wordsOnTargetLine[targetPos].index);
      synthController.playNote(
        wordsOnTargetLine[targetPos].index,
        words,
        wordData,
        userInstrument
      );
    } else if (command === "up-right") {
      // Go up one line and right one word
      const targetLine = currentWord.line - 1;
      if (targetLine < 0) return;

      const wordsOnTargetLine = wordData.filter((w) => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;

      const targetPos = Math.min(
        currentWord.positionInLine + 1,
        wordsOnTargetLine.length - 1
      );
      highlightWord(wordsOnTargetLine[targetPos].index);
      synthController.playNote(
        wordsOnTargetLine[targetPos].index,
        words,
        wordData,
        userInstrument
      );
    } else if (command === "down-left") {
      // Go down one line and left one word
      const targetLine = currentWord.line + 1;

      const wordsOnTargetLine = wordData.filter((w) => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;

      const targetPos = Math.max(
        0,
        Math.min(currentWord.positionInLine - 1, wordsOnTargetLine.length - 1)
      );
      highlightWord(wordsOnTargetLine[targetPos].index);
      synthController.playNote(
        wordsOnTargetLine[targetPos].index,
        words,
        wordData,
        userInstrument
      );
    } else if (command === "down-right") {
      // Go down one line and right one word
      const targetLine = currentWord.line + 1;

      const wordsOnTargetLine = wordData.filter((w) => w.line === targetLine);
      if (wordsOnTargetLine.length === 0) return;

      const targetPos = Math.min(
        currentWord.positionInLine + 1,
        wordsOnTargetLine.length - 1
      );
      highlightWord(wordsOnTargetLine[targetPos].index);
      synthController.playNote(
        wordsOnTargetLine[targetPos].index,
        words,
        wordData,
        userInstrument
      );
    } else if (command === "select") {
      //console.log('current index select', currentIndex)
      selectWord(currentIndex);
    }
  }

  // Initialize movement controller
  const controller = new MovementController(handleCommand);

  // Initialize WebSocket connection
  try {
    socket = io(SOCKET_SERVER);

    socket.on("connect", () => {
      console.log("🌐 Connected to multiplayer server");

      // Join room based on current page URL
      const roomId = window.location.href;
      socket.emit("join-room", roomId);
      console.log("🚪 Joined room:", roomId);

      // Periodically send path to server (every 5 seconds)
      setInterval(() => {
        if (socket && pathWordIndexes.length > 0) {
          console.log(
            "💾 Sending path to server:",
            pathWordIndexes.length,
            "words"
          );
          socket.emit("save-path", {
            path: pathWordIndexes,
          });
        }
      }, 5000); // Every 5 seconds
    });

    // Receive assigned color from server
    socket.on("user-color", (color) => {
      userColor = color;
      console.log("🎨 Your color:", userColor);

      // Re-highlight current word with server-assigned color
      if (words[currentIndex]) {
        words[currentIndex].style.backgroundColor = userColor;
      }
    });

    // Receive assigned instrument from server
    socket.on("user-instrument", (instrument) => {
      userInstrument = instrument;
      console.log("🎸 Your instrument:", userInstrument);
    });

    // Receive current users in room
    socket.on("room-users", (users) => {
      console.log("👥 Users in room:", Object.keys(users).length);
      otherUsers = users;

      // Render trails of existing users
      Object.values(users).forEach((user) => {
        if (user.id !== socket.id && user.trail) {
          user.trail.forEach((wordIndex) => {
            highlightOtherUser(wordIndex, user.color);
          });
        }
      });
    });

    // Receive all historical paths for this room
    socket.on("historical-paths", (data) => {
      console.log("📜 Received historical paths:", data.paths.length, "paths");

      // Replay each historical path with animation
      data.paths.forEach((pathData, pathIndex) => {
        const { userId, color, path } = pathData;
        console.log(`  - Replaying path from ${userId}: ${path.length} words`);

        // Replay this path with a delay so we can see each one
        setTimeout(() => {
          pathReplayer.replayHistoricalPath(path, color);
        }, pathIndex * 500); // Stagger each path by 500ms
      });
    });

    // Another user joined
    socket.on("user-joined", (user) => {
      console.log("✅ User joined:", user.id);
      otherUsers[user.id] = user;
    });

    // Another user moved
    socket.on("user-moved", (data) => {
      const { id, color, instrument, position, line } = data;

      // Update other user
      if (!otherUsers[id]) {
        otherUsers[id] = { id, color, instrument, trail: [] };
      }
      otherUsers[id].position = position;
      otherUsers[id].instrument = instrument;
      if (!otherUsers[id].trail) otherUsers[id].trail = [];
      otherUsers[id].trail.push(position);

      highlightOtherUser(position, color);
      synthController.playNote(position, words, wordData, instrument);

      // --- 🔥 NEW: Check overlap on the same link
      const myLink = wordToLinkMap.get(currentIndex);
      const otherLink = wordToLinkMap.get(position);

      if (myLink && otherLink && myLink === otherLink) {
        const href = myLink.getAttribute("href");

        if (href && href !== lastOverlapHref) {
          lastOverlapHref = href;

          // Clear existing timer to prevent multiple redirects
          if (overlapTimer) clearTimeout(overlapTimer);

          // Wait 2 seconds of sustained overlap
          overlapTimer = setTimeout(() => {
            console.log(`🔗 Redirecting both users to ${href}`);
            window.location.href = href;
          }, 2000);
        }
      } else {
        // Reset if users move apart
        if (overlapTimer) {
          clearTimeout(overlapTimer);
          overlapTimer = null;
          lastOverlapHref = null;
        }
      }
    });

    if (myLink && otherLink && myLink === otherLink) {
      myLink.style.outline = "3px solid #00FF99"; // glowing green border
    }

    // Another user selected a word
    socket.on("select-receive", (data) => {
      const { id, color, position, text } = data;

      console.log("📥 RECEIVED select-receive:", {
        userId: id,
        text: text,
        position: position,
        color: color,
      });

      // Update user data
      if (!otherUsers[id]) {
        otherUsers[id] = { id, color, trail: [] };
      }

      // Highlight the selected word with inverted filter
      if (position >= 0 && position < words.length) {
        words[position].style.backgroundColor = color;
        words[position].style.filter = "invert(75%)";
        console.log("✅ Highlighted and speaking word:", text);
      }

      // Optionally: speak the word that another user selected
      tts.speak(text);
    });

    // Another user left
    socket.on("user-left", (userId) => {
      console.log("❌ User left:", userId);

      // Clean up their synth
      if (otherUserSynths[userId]) {
        otherUserSynths[userId].dispose();
        delete otherUserSynths[userId];
      }

      delete otherUsers[userId];
    });

    socket.on("disconnect", () => {
      console.log("🔌 Disconnected from multiplayer server");
    });
  } catch (error) {
    console.log("⚠️ Multiplayer unavailable:", error.message);
    console.log("💡 Running in single-player mode");
    // Assign random color for single-player
    const colorPalette = Object.keys(colorInstrumentMap);
    userColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    userInstrument = colorInstrumentMap[userColor];
    console.log("🎨 Your color:", userColor);
    console.log("🎸 Your instrument:", userInstrument);
  }

  console.log("✨ Ready!");

  /** Add Replay Buttons for Testing **/
  const replayPathButton = document.createElement("button");
  replayPathButton.innerText = "Replay Path";
  replayPathButton.id = "replayPathButton"; // Assign an ID for styling or further manipulation

  // Add styling (optional)
  replayPathButton.style.position = "fixed";
  replayPathButton.style.bottom = "10px";
  replayPathButton.style.right = "200px";
  replayPathButton.style.zIndex = "9999"; // Ensure it's on top of other elements

  // Add an event listener to the button
  replayPathButton.addEventListener("click", () => {
    pathReplayer.replayLocalPath(pathWordIndexes, userInstrument);
  });

  // Append the button to the page's body
  document.body.prepend(replayPathButton);

  const replaySelectedButton = document.createElement("button");
  replaySelectedButton.innerText = "Replay Selected";
  replaySelectedButton.id = "replaySelectedButton"; // Assign an ID for styling or further manipulation

  // Add styling (optional)
  replaySelectedButton.style.position = "fixed";
  replaySelectedButton.style.bottom = "10px";
  replaySelectedButton.style.right = "10px";
  replaySelectedButton.style.zIndex = "9999"; // Ensure it's on top of other elements

  // Add an event listener to the button
  replaySelectedButton.addEventListener("click", () => {
    pathReplayer.replaySelectedWords(selectedWordIndexes, userInstrument);
  });

  // Append the button to the page's body
  document.body.prepend(replaySelectedButton);
}

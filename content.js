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
  let pendingRedirectHref = null; // Track if we should redirect when broadcast arrives

  // Track which two words are being overlap-highlighted (so we don't fade them)
  let overlapLocked = { mine: -1, theirs: -1 };

  // WebSocket connection
  const SOCKET_SERVER = "https://wiki-path.freewaterhouse.com";
  let socket = null;
  let userColor = "#308557"; // Default color
  let userInstrument = colorInstrumentMap[userColor]; // Default instrument
  let otherUsers = {}; // Track other users in the room
  let savedSelectedPaths = {}; // Store saved selected paths from server

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
  function lockOverlap(myIdx, otherIdx) {
    const a = words[myIdx];
    const b = words[otherIdx];

    // Get the shared link element
    const myLink = wordToLinkMap.get(myIdx);

    if (a) {
      a.dataset.lock = "overlap";
      a.style.transition = "none";
      a.style.backgroundColor = "red";
    }
    if (b) {
      b.dataset.lock = "overlap";
      b.style.transition = "none";
      b.style.backgroundColor = "red";
    }

    // Add animated hands to the LINK once (not each word)
    if (myLink && !myLink._hasEmojis) {
      // Container to center the hands
      const handContainer = document.createElement("span");
      handContainer.style.display = "inline-block";
      handContainer.style.position = "relative";

      // Left hand 🫱 (pointing right) - starts from left, moves to center
      const leftHand = document.createElement("span");
      leftHand.textContent = "🫱";
      leftHand.style.display = "inline-block";
      leftHand.style.position = "absolute";
      leftHand.style.left = "-40px";
      leftHand.style.transition = "left 3s linear";

      // Right hand 🫲 (pointing left) - starts from right, moves to center
      const rightHand = document.createElement("span");
      rightHand.textContent = "🫲";
      rightHand.style.display = "inline-block";
      rightHand.style.position = "absolute";
      rightHand.style.left = "40px";
      rightHand.style.transition = "left 3s linear";

      handContainer.appendChild(leftHand);
      handContainer.appendChild(rightHand);

      // Insert container in the middle of the link
      const firstChild = myLink.firstChild;
      if (firstChild) {
        myLink.insertBefore(handContainer, firstChild);
      } else {
        myLink.appendChild(handContainer);
      }

      // Start animation after a brief delay (so transition applies)
      setTimeout(() => {
        leftHand.style.left = "0px";
        rightHand.style.left = "0px";
      }, 10);

      myLink._hasEmojis = true;
      myLink._handContainer = handContainer;
    }

    overlapLocked.mine = myIdx;
    overlapLocked.theirs = otherIdx;
  }

  function clearOverlapLock() {
    // Get the link from one of the locked word indices
    const myLink = wordToLinkMap.get(overlapLocked.mine);

    // Clear word styling
    [overlapLocked.mine, overlapLocked.theirs].forEach((idx) => {
      const el = words[idx];
      if (el) {
        delete el.dataset.lock;
        el.style.transition = "background-color 1s ease-out";
        el.style.backgroundColor = "white";
      }
    });

    // Remove animated hands from the LINK
    if (myLink && myLink._hasEmojis) {
      const handContainer = myLink._handContainer;
      if (handContainer && handContainer.parentNode) {
        handContainer.parentNode.removeChild(handContainer);
      }
      delete myLink._hasEmojis;
      delete myLink._handContainer;
    }

    overlapLocked.mine = overlapLocked.theirs = -1;
  }

  // Highlight current word
  function highlightWord(index) {
    const lastIndex = currentIndex;
    currentIndex = index;
    console.log(lastIndex, currentIndex);

    if (words[currentIndex]) {
      pathWordIndexes.push(currentIndex);

      // Fade previous word (if not locked or selected)
      if (words[lastIndex] && lastIndex !== currentIndex) {
        if (
          words[lastIndex].dataset.lock !== "overlap" &&
          !selectedWordIndexes.includes(lastIndex)
        ) {
          words[lastIndex].style.transition = "background-color 1s ease-out";
          words[lastIndex].style.backgroundColor = "white";
        }
      }

      // Highlight current word (keep it highlighted, don't fade)
      words[currentIndex].style.transition = "none";
      words[currentIndex].style.backgroundColor = userColor;
      words[currentIndex].scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

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

  // Highlight other users' positions (keep current highlighted, fade previous)
  function highlightOtherUser(userId, wordIndex, color) {
    if (wordIndex >= 0 && wordIndex < words.length) {
      // Get user's previous position
      const user = otherUsers[userId];
      const lastPosition = user ? user.lastPosition : null;

      // Fade previous position (if not locked or selected)
      if (
        lastPosition !== null &&
        lastPosition !== wordIndex &&
        words[lastPosition]
      ) {
        if (
          words[lastPosition].dataset.lock !== "overlap" &&
          !selectedWordIndexes.includes(lastPosition)
        ) {
          words[lastPosition].style.transition = "background-color 1s ease-out";
          words[lastPosition].style.backgroundColor = "white";
        }
      }

      // Highlight current position (keep it highlighted, don't fade)
      const el = words[wordIndex];
      if (el && el.dataset.lock !== "overlap") {
        el.style.transition = "none";
        el.style.backgroundColor = color;
      }

      // Update user's last position
      if (user) {
        user.lastPosition = wordIndex;
      }
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
            highlightOtherUser(user.id, wordIndex, user.color);
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

    // Receive all saved selected paths for this room
    socket.on("saved-selected-paths", (data) => {
      console.log(
        "📝 Received saved selected paths:",
        data.selectedPaths.length,
        "paths"
      );
      console.log("Full data:", data.selectedPaths);

      // Store them for later replay
      savedSelectedPaths = {};
      data.selectedPaths.forEach((pathData) => {
        const { userId, color, selectedWords } = pathData;
        if (selectedWords && selectedWords.length > 0) {
          savedSelectedPaths[userId] = { color, selectedWords };
          console.log(
            `  - Saved selected path from ${userId}: ${selectedWords.length} words`
          );
        }
      });
      console.log("Final savedSelectedPaths object:", savedSelectedPaths);
    });

    // Another user joined
    socket.on("user-joined", (user) => {
      console.log("✅ User joined:", user.id);
      otherUsers[user.id] = user;
    });

    // Another user moved
    socket.on("user-moved", (data) => {
      const { id, color, instrument, position, line } = data;

      // Track other user
      if (!otherUsers[id])
        otherUsers[id] = { id, color, instrument, trail: [] };
      otherUsers[id].position = position;
      otherUsers[id].instrument = instrument;
      if (!otherUsers[id].trail) otherUsers[id].trail = [];
      otherUsers[id].trail.push(position);

      // Usual visuals/sound for their move
      highlightOtherUser(id, position, color);
      synthController.playNote(position, words, wordData, instrument);

      // ---- Overlap logic (same hyperlink) ----
      const myLink = wordToLinkMap.get(currentIndex);
      const otherLink = wordToLinkMap.get(position);
      const sameLink = myLink && otherLink && myLink === otherLink;

      if (sameLink) {
        // Use absolute href so redirects are reliable on Wikipedia
        const href = myLink.href;

        // Only process if this is a new overlap
        if (lastOverlapHref !== href) {
          // Broadcast overlap start to everyone in the room
          socket.emit("overlap-start", {
            href: href,
            myIndex: currentIndex,
            otherIndex: position,
          });

          lastOverlapHref = href;
        }

        // Make both words red and lock them so they don't fade
        lockOverlap(currentIndex, position);

        // Mark that we should redirect when the broadcast arrives
        pendingRedirectHref = href;

        // Restart a shared 3s timer -> then broadcast redirect to the whole room
        if (overlapTimer) clearTimeout(overlapTimer);
        overlapTimer = setTimeout(() => {
          socket.emit("redirect-link", { href }); // ask server to broadcast
        }, 3000);
      } else {
        // Users separated: cancel timer and unlock visuals
        if (overlapTimer) {
          clearTimeout(overlapTimer);
          overlapTimer = null;
          lastOverlapHref = null;
          pendingRedirectHref = null; // Clear pending redirect

          // Broadcast overlap end to everyone
          socket.emit("overlap-end");
        }
        clearOverlapLock();
      }
    });
    // Overlap started - show hands for both users
    socket.on("overlap-start", ({ href, myIndex, otherIndex }) => {
      console.log(`🤝 Overlap started on link: ${href}`);
      // Find any word in our page that belongs to this href
      for (let i = 0; i < words.length; i++) {
        const link = wordToLinkMap.get(i);
        if (link && link.href === href) {
          lockOverlap(currentIndex, i);
          pendingRedirectHref = href;
          break;
        }
      }
    });

    // Overlap ended - remove hands for both users
    socket.on("overlap-end", () => {
      console.log(`👋 Overlap ended`);
      clearOverlapLock();
      pendingRedirectHref = null;
    });

    socket.on("redirect-link", ({ href }) => {
      // Redirect if we were part of the overlap (have pending redirect for this href)
      if (pendingRedirectHref === href) {
        console.log(`🔗 Redirecting to ${href}`);
        window.location.href = href;
      } else {
        console.log(
          `⚠️ Ignoring redirect to ${href} - not part of this overlap`
        );
      }
    });

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

  /** Add Button Controls - Stacked Column in Lower Right **/

  // Button configuration
  const BUTTON_GAP = 40; // Gap between buttons in pixels
  const BUTTON_BASE = 10; // Distance from bottom for first button

  // Common button styling function (index: 0 = bottom, 1 = second from bottom, etc.)
  const styleButton = (button, index) => {
    const bottomPosition = BUTTON_BASE + (index * BUTTON_GAP);
    button.style.position = "fixed";
    button.style.bottom = `${bottomPosition}px`;
    button.style.right = "10px";
    button.style.zIndex = "9999";
    button.style.backgroundColor = "#f8f9fa";
    button.style.color = "#202122";
    button.style.padding = "1px 12px";
    button.style.minHeight = "32px";
    button.style.border = "1px solid black";
    button.style.borderRadius = "2px";
    button.style.cursor = "pointer";
    button.style.minWidth = "150px";
    button.style.fontFamily = "sans-serif";
  };

  // Replay Path button
  const replayPathButton = document.createElement("button");
  replayPathButton.innerText = "Replay my path";
  replayPathButton.id = "replayPathButton";
  styleButton(replayPathButton, 3); // Index 3 (top button)
  replayPathButton.addEventListener("click", () => {
    pathReplayer.replayLocalPath(pathWordIndexes, userInstrument);
  });
  document.body.prepend(replayPathButton);

  // Save Selected button
  const saveSelectedButton = document.createElement("button");
  saveSelectedButton.innerText = "Save my words";
  saveSelectedButton.id = "saveSelectedButton";
  styleButton(saveSelectedButton, 0); // Index 0 (bottom button)
  saveSelectedButton.addEventListener("click", () => {
    if (socket && selectedWordIndexes.length > 2) {
      console.log(
        "💾 Saving selected words to server:",
        selectedWordIndexes.length,
        "words"
      );
      socket.emit("save-selected-words", {
        selectedWords: selectedWordIndexes,
      });
      // Visual feedback
      saveSelectedButton.innerText = "Saved ✓";
      setTimeout(() => {
        saveSelectedButton.innerText = "Save my words";
      }, 2000);
    } else {
      console.log("⚠️ No selected words to save");
      saveSelectedButton.innerText = "No words selected!";
      setTimeout(() => {
        saveSelectedButton.innerText = "Save my words";
      }, 2000);
    }
  });
  document.body.prepend(saveSelectedButton);

  // Replay Selected button
  const replaySelectedButton = document.createElement("button");
  replaySelectedButton.innerText = "Replay my words";
  replaySelectedButton.id = "replaySelectedButton";
  styleButton(replaySelectedButton, 1); // Index 2
  replaySelectedButton.addEventListener("click", () => {
    pathReplayer.replaySelectedWords(selectedWordIndexes, userInstrument);
  });
  document.body.prepend(replaySelectedButton);

  // Replay Random Selected from Server button
  const replayServerSelectedButton = document.createElement("button");
  replayServerSelectedButton.innerText = "Play their words";
  replayServerSelectedButton.id = "replayServerSelectedButton";
  styleButton(replayServerSelectedButton, 0); // Index 1
  replayServerSelectedButton.addEventListener("click", () => {
    // Get all saved selected paths from server
    console.log("🔍 Current savedSelectedPaths:", savedSelectedPaths);
    const savedPaths = Object.values(savedSelectedPaths);
    console.log("🔍 savedPaths array:", savedPaths);
    if (savedPaths.length > 0) {
      const randomPath =
        savedPaths[Math.floor(Math.random() * savedPaths.length)];
      console.log(
        "🎲 Replaying random selected path from server:",
        randomPath.selectedWords.length,
        "words"
      );
      pathReplayer.replayServerSelectedWords(
        randomPath.selectedWords,
        randomPath.color
      );
    } else {
      console.log("⚠️ No saved selected paths from server");
      console.log("⚠️ savedSelectedPaths object is:", savedSelectedPaths);
      replayServerSelectedButton.innerText = "No saved paths!";
      setTimeout(() => {
        replayServerSelectedButton.innerText =
          "Replay Random Selected (Server)";
      }, 2000);
    }
  });
  document.body.prepend(replayServerSelectedButton);


}

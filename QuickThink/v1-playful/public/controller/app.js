// Quick Think - v1-playful Controller Application
// Enhanced with multi-entry support and encouragement messages

// Encouragement messages shown when adding entries
const ENCOURAGEMENT_MESSAGES = [
  "That's a good one!",
  "Keep going!",
  "Wow, you're on a roll!",
  "Way to go!",
  "Nice thinking!",
  "Great choice!",
  "You're crushing it!",
  "Smart answer!",
  "Keep 'em coming!",
  "On fire!",
  "Brilliant!",
  "That's unique!",
  "Good pick!",
  "Excellent!",
  "You got this!"
];

// Milestone messages for hitting certain counts
const MILESTONE_MESSAGES = {
  3: "Hat trick! 🎩",
  5: "High five! ✋",
  7: "Lucky seven!",
  10: "Double digits! 🔥"
};

// Client-side duplicate detection uses shared wordUtils.js
// Server-side uses full lemmatization (wink-lemmatizer) for accurate detection

class QuickThinkController {
  constructor() {
    this.ws = null;
    this.roomCode = null;
    this.playerId = null;
    this.playerName = null;
    this.isHost = false;
    this.currentCategory = null;
    this.myScore = 0;
    this.entries = []; // Array of current round entries
    this.reconnectTimer = null;
    this.connectionAttempts = 0;
    this.settings = { musicEnabled: true, typingTime: 10 };
    this.players = []; // List of players for host transfer

    this.init();
  }

  init() {
    this.getRoomCode();
    this.bindElements();
    this.bindEvents();
    // Start with splash screen - WebSocket connection happens after splash
  }

  setupJoinScreen() {
    if (this.roomCode) {
      // Room code from URL - hide room code input
      this.elements.roomCodeInput.style.display = 'none';
      this.elements.joinBtn.textContent = 'CONNECTING...';
      this.elements.joinBtn.disabled = true;
    } else {
      // No room code - show input for manual entry
      this.elements.roomCodeInput.style.display = 'block';
      this.elements.joinBtn.textContent = 'JOIN GAME';
      this.elements.joinBtn.disabled = true;
    }
    this.connectWebSocket();
  }

  getRoomCode() {
    const params = new URLSearchParams(window.location.search);
    this.roomCode = params.get('room');

    if (this.roomCode) {
      document.getElementById('room-code').textContent = this.roomCode;
    }
  }

  isValidRoomCode(code) {
    if (!code || typeof code !== 'string') return false;
    return /^[A-Z0-9]{4}$/.test(code.toUpperCase());
  }

  bindElements() {
    this.screens = {
      splash: document.getElementById('splash-screen'),
      join: document.getElementById('join-screen'),
      waiting: document.getElementById('waiting-screen'),
      ready: document.getElementById('ready-screen'),
      typing: document.getElementById('typing-screen'),
      locked: document.getElementById('locked-screen'),
      reveal: document.getElementById('reveal-screen'),
      audit: document.getElementById('audit-screen'),
      voting: document.getElementById('voting-screen'),
      score: document.getElementById('score-screen'),
      gameover: document.getElementById('gameover-screen'),
      error: document.getElementById('error-screen')
    };

    this.elements = {
      roomCodeInput: document.getElementById('room-code-input'),
      playerNameInput: document.getElementById('player-name'),
      joinBtn: document.getElementById('join-btn'),

      playerAvatar: document.getElementById('player-avatar'),
      playerDisplayName: document.getElementById('player-display-name'),
      hostStatus: document.getElementById('host-status'),

      readyCategory: document.getElementById('ready-category'),
      readyCountdown: document.getElementById('ready-countdown'),

      typingCategory: document.getElementById('typing-category'),
      timerDisplay: document.getElementById('timer-display'),
      answerInput: document.getElementById('answer-input'),
      entriesList: document.getElementById('entries-list'),
      entryCount: document.getElementById('entry-count'),

      submittedEntries: document.getElementById('submitted-entries'),

      myScore: document.getElementById('my-score'),
      roundResult: document.getElementById('round-result'),

      resultMessage: document.getElementById('result-message'),
      finalScore: document.getElementById('final-score'),

      // Voting elements
      votingTimer: document.getElementById('voting-timer'),
      voteCategory: document.getElementById('vote-category'),
      votePlayerName: document.getElementById('vote-player-name'),
      voteAnswerText: document.getElementById('vote-answer-text'),
      voteValidBtn: document.getElementById('vote-valid-btn'),
      voteInvalidBtn: document.getElementById('vote-invalid-btn'),
      voteSubmittedMsg: document.getElementById('vote-submitted-msg'),
      ownAnswerMsg: document.getElementById('own-answer-msg'),

      // Settings elements
      settingsBtn: document.getElementById('settings-btn'),
      settingsPanel: document.getElementById('settings-panel'),
      closeSettingsBtn: document.getElementById('close-settings-btn'),
      musicToggle: document.getElementById('music-toggle'),
      timerBtns: document.querySelectorAll('.timer-btn'),

      // Host transfer elements
      transferHostBtn: document.getElementById('transfer-host-btn'),
      transferModal: document.getElementById('transfer-modal'),
      closeTransferBtn: document.getElementById('close-transfer-btn'),
      playerList: document.getElementById('player-list'),

      // Splash screen elements
      splashContinueBtn: document.getElementById('splash-continue-btn'),
      splashCountdown: document.getElementById('splash-countdown')
    };
  }

  bindEvents() {
    // Room code input - update display and button
    this.elements.roomCodeInput.addEventListener('input', () => {
      const code = this.elements.roomCodeInput.value.toUpperCase();
      this.elements.roomCodeInput.value = code;
      document.getElementById('room-code').textContent = code || '----';
      this.updateJoinButton();
    });

    this.elements.roomCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.elements.playerNameInput.focus();
      }
    });

    // Join form - update button on every input change
    this.elements.playerNameInput.addEventListener('input', () => {
      this.updateJoinButton();
    });

    this.elements.playerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.canJoin()) {
          this.joinGame();
        }
      }
    });

    this.elements.joinBtn.addEventListener('click', () => {
      if (this.canJoin()) {
        this.joinGame();
      }
    });

    // Answer input - Enter to add entry
    this.elements.answerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addEntry();
      }
    });

    // Vote buttons
    this.elements.voteValidBtn.addEventListener('click', () => this.submitVote('valid'));
    this.elements.voteInvalidBtn.addEventListener('click', () => this.submitVote('invalid'));

    // Settings events
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener('click', () => this.toggleSettings());
    }
    if (this.elements.closeSettingsBtn) {
      this.elements.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    }
    if (this.elements.musicToggle) {
      this.elements.musicToggle.addEventListener('click', () => {
        this.settings.musicEnabled = !this.settings.musicEnabled;
        this.updateSettings();
      });
    }
    if (this.elements.timerBtns) {
      this.elements.timerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.settings.typingTime = parseInt(btn.dataset.time);
          this.updateSettings();
        });
      });
    }

    // Host transfer events
    if (this.elements.transferHostBtn) {
      this.elements.transferHostBtn.addEventListener('click', () => this.showTransferModal());
    }
    if (this.elements.closeTransferBtn) {
      this.elements.closeTransferBtn.addEventListener('click', () => this.closeTransferModal());
    }

    // Splash screen events
    if (this.elements.splashContinueBtn) {
      this.elements.splashContinueBtn.addEventListener('click', () => this.dismissSplash());
    }

    // Start splash auto-advance countdown
    this.startSplashCountdown();
  }

  startSplashCountdown() {
    this.splashCountdownValue = 10;
    this.splashCountdownTimer = setInterval(() => {
      this.splashCountdownValue--;
      if (this.elements.splashCountdown) {
        this.elements.splashCountdown.textContent = this.splashCountdownValue;
      }
      if (this.splashCountdownValue <= 0) {
        this.dismissSplash();
      }
    }, 1000);
  }

  dismissSplash() {
    // Clear the countdown timer
    if (this.splashCountdownTimer) {
      clearInterval(this.splashCountdownTimer);
      this.splashCountdownTimer = null;
    }
    // Transition to join screen and set it up
    this.showScreen('join');
    this.setupJoinScreen();
  }

  // Simple check if WebSocket is ready
  isWebSocketReady() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Check if player can join
  canJoin() {
    const name = this.elements.playerNameInput.value.trim();
    const roomCode = this.roomCode || this.elements.roomCodeInput.value.trim();
    return name.length >= 1 && this.isValidRoomCode(roomCode) && this.isWebSocketReady();
  }

  connectWebSocket() {
    // Clear any pending reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clean up any existing connection
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch (e) {
        console.log('Error cleaning up WebSocket:', e);
      }
      this.ws = null;
    }

    this.updateJoinButton();

    console.log('[Controller] Connecting to WebSocket...');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    try {
      this.ws = new WebSocket(`${protocol}//${window.location.host}`);
    } catch (e) {
      console.error('[Controller] Failed to create WebSocket:', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[Controller] WebSocket connected!');
      this.connectionAttempts = 0;
      this.updateJoinButton();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error('[Controller] Error parsing message:', e);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[Controller] WebSocket closed:', event.code, event.reason);
      this.updateJoinButton();

      // Only show error screen and reconnect if player was already in-game
      if (this.playerId) {
        this.showScreen('error');
      }
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[Controller] WebSocket error:', error);
      // Don't call updateJoinButton here - onclose will be called next
    };
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return; // Already scheduled

    this.connectionAttempts++;
    // Exponential backoff: 1s, 2s, 4s, max 8s
    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 8000);
    console.log(`[Controller] Reconnecting in ${delay}ms (attempt ${this.connectionAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, delay);
  }

  updateJoinButton() {
    const isReady = this.isWebSocketReady();
    const canJoin = this.canJoin();

    this.elements.joinBtn.disabled = !canJoin;

    if (!isReady) {
      this.elements.joinBtn.textContent = 'CONNECTING...';
    } else {
      this.elements.joinBtn.textContent = 'JOIN GAME';
    }
  }

  joinGame() {
    // Double-check we can join
    if (!this.canJoin()) {
      console.log('[Controller] Cannot join - conditions not met');
      this.updateJoinButton();
      return;
    }

    // Use room code from URL or manual input
    if (!this.roomCode) {
      this.roomCode = this.elements.roomCodeInput.value.trim().toUpperCase();
    }

    this.playerName = this.elements.playerNameInput.value.trim();
    console.log('[Controller] Joining room:', this.roomCode, 'as', this.playerName);

    // Disable button immediately
    this.elements.joinBtn.disabled = true;
    this.elements.joinBtn.textContent = 'JOINING...';

    try {
      this.ws.send(JSON.stringify({
        type: 'JOIN',
        payload: {
          roomCode: this.roomCode,
          playerName: this.playerName
        }
      }));
    } catch (e) {
      console.error('[Controller] Error sending JOIN:', e);
      this.updateJoinButton();
    }
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'JOINED':
        this.onJoined(payload);
        break;

      case 'GAME_STARTED':
        // Stay on waiting screen, game flow managed by server
        break;

      case 'PHASE_CHANGE':
        this.handlePhaseChange(payload);
        break;

      case 'TIMER':
        this.updateTimer(payload.remaining);
        break;

      case 'ANSWER_RECEIVED':
        // Confirmation of answer submission
        break;

      case 'GAME_RESET':
        this.resetGame();
        break;

      case 'SETTINGS_CHANGED':
        this.applySettings(payload);
        break;

      case 'HOST_CHANGED':
        this.onHostChanged(payload);
        break;

      case 'PLAYER_UPDATE':
        this.players = payload.players || [];
        break;

      case 'ERROR':
        console.error('Server error:', payload.message);
        alert(payload.message);
        // Re-enable join button if join failed
        if (!this.playerId) {
          this.updateJoinButton();
        }
        break;
    }
  }

  onJoined(payload) {
    this.playerId = payload.playerId;
    this.isHost = payload.isHost;
    this.players = payload.players || [];

    this.elements.playerAvatar.textContent = this.playerName.charAt(0).toUpperCase();
    this.elements.playerDisplayName.textContent = this.playerName;
    this.elements.hostStatus.textContent = this.isHost ? 'You are the host!' : 'Waiting for host to start...';

    // Show/hide host transfer button
    this.updateHostUI();

    // Apply settings if provided
    if (payload.settings) {
      this.applySettings(payload.settings);
    }

    this.showScreen('waiting');
  }

  handlePhaseChange(payload) {
    switch (payload.phase) {
      case 'CATEGORY_REVEAL':
        this.currentCategory = payload.category;
        this.elements.readyCategory.textContent = payload.category;
        this.elements.readyCountdown.textContent = '';
        this.showScreen('ready');
        break;

      case 'COUNTDOWN':
        this.elements.readyCountdown.textContent = payload.timer;
        this.showScreen('ready');
        break;

      case 'TYPING':
        this.elements.typingCategory.textContent = this.currentCategory;
        this.elements.timerDisplay.textContent = payload.timer;
        this.elements.timerDisplay.classList.remove('low');
        this.elements.answerInput.value = '';
        this.clearEntries(); // Clear entries from previous round
        this.showScreen('typing');

        // Focus on input
        setTimeout(() => {
          this.elements.answerInput.focus();
        }, 100);
        break;

      case 'LOCKED':
        // Show submitted entries
        const submittedContainer = this.elements.submittedEntries;
        submittedContainer.innerHTML = '';

        if (this.entries.length === 0) {
          submittedContainer.innerHTML = '<div class="submitted-entry">(no answer)</div>';
        } else {
          this.entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'submitted-entry';
            div.textContent = entry;
            submittedContainer.appendChild(div);
          });
        }

        this.showScreen('locked');
        break;

      case 'REVEAL':
        this.showScreen('reveal');
        break;

      case 'AUDIT':
        this.showScreen('audit');
        break;

      case 'VOTING':
        this.showVoting(payload);
        break;

      case 'SCORING':
        this.showScoring(payload);
        break;

      case 'GAME_OVER':
        this.showGameOver(payload);
        break;
    }
  }

  updateTimer(remaining) {
    // Update ready screen countdown
    if (this.screens.ready.classList.contains('active')) {
      if (remaining === 0) {
        this.elements.readyCountdown.textContent = 'GO!';
      } else {
        this.elements.readyCountdown.textContent = remaining;
      }
    }

    // Update typing screen timer
    if (this.screens.typing.classList.contains('active')) {
      this.elements.timerDisplay.textContent = remaining;

      if (remaining <= 3) {
        this.elements.timerDisplay.classList.add('low');
      }
    }

    // Update voting screen timer
    if (this.screens.voting.classList.contains('active')) {
      this.elements.votingTimer.textContent = remaining;

      if (remaining <= 3) {
        this.elements.votingTimer.classList.add('low');
      } else {
        this.elements.votingTimer.classList.remove('low');
      }
    }
  }

  // Entry management methods
  async addEntry() {
    const value = this.elements.answerInput.value.trim();
    if (!value) return;

    // Normalize for duplicate check (within player's own entries)
    const normalized = value.toLowerCase();

    // Check if already added (exact match)
    if (this.entries.some(e => e.toLowerCase() === normalized)) {
      this.elements.answerInput.value = '';
      return;
    }

    // Check for sneaky duplicates (plurals, past tense, etc.)
    const similarEntry = findSimilarEntry(value, this.entries);
    if (similarEntry) {
      this.showInputError(`"${similarEntry}" already used!`);
      return;
    }

    // Validate the word with server
    try {
      const response = await fetch(`/api/validate-word?word=${encodeURIComponent(value)}`);
      const result = await response.json();

      if (!result.valid) {
        this.showInputError(result.reason || 'Not a valid word');
        return;
      }
    } catch (err) {
      // If validation fails, allow the word (server will validate on submit)
      console.warn('Word validation failed:', err);
    }

    this.entries.push(value);
    this.renderEntries();
    this.elements.answerInput.value = '';
    this.elements.answerInput.focus();

    // Show encouragement message
    this.showEncouragement();

    // Send updated list to server
    this.sendEntries();
  }

  showEncouragement() {
    const count = this.entries.length;

    // Check for milestone message first
    let message;
    if (MILESTONE_MESSAGES[count]) {
      message = MILESTONE_MESSAGES[count];
    } else {
      // Random encouragement
      message = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
    }

    // Show the message
    const msgEl = document.getElementById('encouragement-msg');
    if (msgEl) {
      msgEl.textContent = message;
      msgEl.classList.add('show');

      // Hide after a short delay
      setTimeout(() => {
        msgEl.classList.remove('show');
      }, 1500);
    }
  }

  showInputError(message) {
    const input = this.elements.answerInput;
    input.classList.add('error');
    input.placeholder = message;

    // Shake animation
    input.style.animation = 'shake 0.3s ease-in-out';

    setTimeout(() => {
      input.classList.remove('error');
      input.placeholder = 'Type an answer, press Enter';
      input.style.animation = '';
      input.value = '';
      input.focus();
    }, 1500);
  }

  removeEntry(index) {
    this.entries.splice(index, 1);
    this.renderEntries();
    this.sendEntries();
  }

  renderEntries() {
    const container = this.elements.entriesList;
    container.innerHTML = '';

    this.entries.forEach((entry, index) => {
      const chip = document.createElement('div');
      chip.className = 'entry-chip';
      chip.innerHTML = `
        <span>${entry}</span>
        <svg class="remove-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      chip.addEventListener('click', () => this.removeEntry(index));
      container.appendChild(chip);
    });

    this.elements.entryCount.textContent = this.entries.length;
  }

  sendEntries() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SUBMIT_ANSWER',
        payload: {
          answer: this.entries.join(', '),  // Send as comma-separated for backward compatibility
          entries: this.entries              // Also send as array for new scoring
        }
      }));
    }
  }

  clearEntries() {
    this.entries = [];
    this.renderEntries();
  }

  showScoring(payload) {
    this.myScore = payload.scores[this.playerId] || 0;
    const roundPoints = payload.roundPoints[this.playerId] || 0;
    const details = payload.detailedResults?.[this.playerId];

    this.elements.myScore.textContent = this.myScore;

    const resultEl = this.elements.roundResult;
    resultEl.classList.remove('unique', 'eliminated', 'mixed');

    if (details) {
      const { uniqueCount, duplicateCount, volumeBonus } = details;

      let resultText = '';
      if (uniqueCount > 0 && duplicateCount > 0) {
        resultText = `+${uniqueCount} unique, -${duplicateCount} dup`;
        resultEl.classList.add('mixed');
      } else if (uniqueCount > 0) {
        resultText = `+${uniqueCount} UNIQUE!`;
        resultEl.classList.add('unique');
      } else if (duplicateCount > 0) {
        resultText = `-${duplicateCount} Duplicated`;
        resultEl.classList.add('eliminated');
      } else {
        resultText = 'No answers';
        resultEl.classList.add('eliminated');
      }

      if (volumeBonus > 0) {
        resultText += ` +${volumeBonus} bonus`;
      }

      resultEl.textContent = resultText;
    } else {
      // Fallback to simple display
      if (roundPoints > 0) {
        resultEl.textContent = `+${roundPoints} UNIQUE!`;
        resultEl.classList.add('unique');
      } else if (roundPoints < 0) {
        resultEl.textContent = `${roundPoints}`;
        resultEl.classList.add('eliminated');
      } else {
        resultEl.textContent = 'No points';
        resultEl.classList.add('eliminated');
      }
    }

    this.showScreen('score');
  }

  showGameOver(payload) {
    const isWinner = payload.winners.includes(this.playerId);
    const finalScore = payload.finalScores[this.playerId] || 0;

    this.elements.resultMessage.textContent = isWinner ? 'YOU WIN!' : 'GAME OVER';
    this.elements.resultMessage.classList.toggle('winner', isWinner);
    this.elements.finalScore.textContent = finalScore;

    this.showScreen('gameover');
  }

  resetGame() {
    this.myScore = 0;
    this.clearEntries();
    this.showScreen('waiting');
  }

  // Settings methods
  toggleSettings() {
    if (this.elements.settingsPanel) {
      this.elements.settingsPanel.classList.toggle('hidden');
    }
  }

  closeSettings() {
    if (this.elements.settingsPanel) {
      this.elements.settingsPanel.classList.add('hidden');
    }
  }

  updateSettings() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'UPDATE_SETTINGS',
        payload: this.settings
      }));
    }
    // Optimistically update UI
    this.applySettings(this.settings);
  }

  applySettings(settings) {
    this.settings = { ...settings };

    // Update music toggle button
    if (this.elements.musicToggle) {
      this.elements.musicToggle.classList.toggle('active', settings.musicEnabled);
      this.elements.musicToggle.textContent = settings.musicEnabled ? 'ON' : 'OFF';
    }

    // Update timer buttons
    if (this.elements.timerBtns) {
      this.elements.timerBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.time) === settings.typingTime);
      });
    }
  }

  // Host transfer methods
  updateHostUI() {
    if (this.elements.transferHostBtn) {
      if (this.isHost && this.players.length > 1) {
        this.elements.transferHostBtn.classList.remove('hidden');
      } else {
        this.elements.transferHostBtn.classList.add('hidden');
      }
    }
  }

  onHostChanged(payload) {
    const wasHost = this.isHost;
    this.isHost = payload.newHostId === this.playerId;
    this.players = payload.players || this.players;

    // Update host status display
    this.elements.hostStatus.textContent = this.isHost ? 'You are the host!' : 'Waiting for host to start...';

    // Show/hide transfer button
    this.updateHostUI();

    // Close transfer modal if open
    this.closeTransferModal();

    // Notify if host status changed
    if (this.isHost && !wasHost) {
      // Became host
      this.elements.hostStatus.classList.add('highlight');
      setTimeout(() => {
        this.elements.hostStatus.classList.remove('highlight');
      }, 2000);
    }
  }

  showTransferModal() {
    if (!this.elements.transferModal || !this.elements.playerList) return;

    // Populate player list (exclude self)
    this.elements.playerList.innerHTML = '';
    this.players
      .filter(p => p.id !== this.playerId)
      .forEach(player => {
        const btn = document.createElement('button');
        btn.className = 'player-select-btn';
        btn.innerHTML = `
          <span class="player-avatar-small">${player.name.charAt(0).toUpperCase()}</span>
          <span>${player.name}</span>
        `;
        btn.addEventListener('click', () => this.transferHost(player.id));
        this.elements.playerList.appendChild(btn);
      });

    this.elements.transferModal.classList.remove('hidden');
  }

  closeTransferModal() {
    if (this.elements.transferModal) {
      this.elements.transferModal.classList.add('hidden');
    }
  }

  transferHost(newHostId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'HOST_TRANSFER',
        payload: { newHostId }
      }));
    }
    this.closeTransferModal();
  }

  showVoting(payload) {
    this.currentVoteChallenge = payload.challenge;
    this.hasVoted = false;

    this.elements.voteCategory.textContent = payload.category;
    this.elements.votePlayerName.textContent = payload.challenge.playerName;
    this.elements.voteAnswerText.textContent = payload.challenge.answer;
    this.elements.votingTimer.textContent = payload.timer;
    this.elements.votingTimer.classList.remove('low');

    // Reset button states
    this.elements.voteValidBtn.disabled = false;
    this.elements.voteInvalidBtn.disabled = false;
    this.elements.voteSubmittedMsg.style.display = 'none';
    this.elements.ownAnswerMsg.style.display = 'none';

    // Check if this is the player's own answer
    if (payload.challenge.playerId === this.playerId) {
      this.elements.voteValidBtn.disabled = true;
      this.elements.voteInvalidBtn.disabled = true;
      this.elements.ownAnswerMsg.style.display = 'block';
    }

    this.showScreen('voting');
  }

  submitVote(vote) {
    if (this.hasVoted) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SUBMIT_VOTE',
        payload: { vote }
      }));

      this.hasVoted = true;
      this.elements.voteValidBtn.disabled = true;
      this.elements.voteInvalidBtn.disabled = true;
      this.elements.voteSubmittedMsg.style.display = 'block';

      // Highlight the selected button
      if (vote === 'valid') {
        this.elements.voteValidBtn.classList.add('selected');
      } else {
        this.elements.voteInvalidBtn.classList.add('selected');
      }
    }
  }

  showScreen(screenName) {
    Object.values(this.screens).forEach(screen => {
      screen.classList.remove('active');
    });

    if (this.screens[screenName]) {
      this.screens[screenName].classList.add('active');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new QuickThinkController();
});

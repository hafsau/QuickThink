// Quick Think - Game State Management

const { getRandomCategory, getCategoriesForGame } = require('./categories');
const { findDuplicates, calculateRoundPoints, getDetailedResults, updateScores, getWinners } = require('./scoring');

// Game phases
const PHASES = {
  LOBBY: 'LOBBY',
  CATEGORY_REVEAL: 'CATEGORY_REVEAL',
  COUNTDOWN: 'COUNTDOWN',
  TYPING: 'TYPING',
  LOCKED: 'LOCKED',
  REVEAL: 'REVEAL',
  AUDIT: 'AUDIT',        // Host can challenge answers
  VOTING: 'VOTING',      // Players vote on challenged answer
  SCORING: 'SCORING',
  GAME_OVER: 'GAME_OVER'
};

// Game length options
const GAME_LENGTHS = {
  quick: 5,
  standard: 10,
  extended: 15
};

// Timing constants (in milliseconds)
const TIMING = {
  CATEGORY_REVEAL: 3000,
  COUNTDOWN: 3000,
  TYPING: 10000,
  REVEAL_PER_ANSWER: 1500,
  AUDIT: 15000,      // Time for host to review answers
  VOTING: 10000,     // Time for players to vote
  SCORING: 3000
};

class GameState {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.phase = PHASES.LOBBY;
    this.players = new Map(); // playerId -> { id, name, ws }
    this.hostId = null;

    // Configurable settings
    this.settings = {
      musicEnabled: true,
      typingTime: 10  // seconds: 5, 10, or 15
    };

    // Game settings
    this.totalRounds = GAME_LENGTHS.standard;
    this.currentRound = 0;

    // Round state
    this.currentCategory = null;
    this.categories = [];
    this.answers = new Map(); // playerId -> answer
    this.markedAnswers = []; // After duplicate detection
    this.revealIndex = 0;

    // Audit state
    this.challengedAnswers = []; // Indices of answers challenged by host
    this.currentChallenge = null; // Current answer being voted on { index, answer }
    this.votes = new Map(); // playerId -> vote ('valid' or 'invalid')
    this.rejectedAnswers = new Set(); // Indices of answers rejected by vote

    // Scores
    this.scores = {}; // playerId -> total score

    // Timers
    this.timer = null;
    this.timerValue = 0;
  }

  // Add a player to the game
  addPlayer(playerId, playerName, ws) {
    if (this.phase !== PHASES.LOBBY) {
      return { success: false, error: 'Game already started' };
    }

    if (this.players.size >= 6) {
      return { success: false, error: 'Room is full (max 6 players)' };
    }

    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      ws: ws
    });

    this.scores[playerId] = 0;

    // First player is host
    if (this.players.size === 1) {
      this.hostId = playerId;
    }

    return { success: true };
  }

  // Remove a player
  removePlayer(playerId) {
    this.players.delete(playerId);
    delete this.scores[playerId];

    // Reassign host if needed
    if (playerId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
  }

  // Transfer host to another player
  transferHost(newHostId) {
    if (!this.players.has(newHostId)) {
      return { success: false, error: 'Player not found' };
    }
    this.hostId = newHostId;
    return { success: true };
  }

  // Update game settings
  updateSettings(newSettings) {
    if (newSettings.typingTime !== undefined && [5, 10, 15].includes(newSettings.typingTime)) {
      this.settings.typingTime = newSettings.typingTime;
    }
    if (typeof newSettings.musicEnabled === 'boolean') {
      this.settings.musicEnabled = newSettings.musicEnabled;
    }
    return { success: true, settings: this.settings };
  }

  // Start the game
  startGame(gameLength = 'standard') {
    if (this.players.size < 2) {
      return { success: false, error: 'Need at least 2 players' };
    }

    this.totalRounds = GAME_LENGTHS[gameLength] || GAME_LENGTHS.standard;
    this.currentRound = 0;
    this.categories = getCategoriesForGame(this.totalRounds);

    // Reset scores
    this.players.forEach((player, id) => {
      this.scores[id] = 0;
    });

    return { success: true };
  }

  // Start a new round
  startRound() {
    this.currentRound++;
    this.currentCategory = this.categories[this.currentRound - 1];
    this.answers.clear();
    this.markedAnswers = [];
    this.revealIndex = 0;
    this.phase = PHASES.CATEGORY_REVEAL;
  }

  // Move to countdown phase
  startCountdown() {
    this.phase = PHASES.COUNTDOWN;
    this.timerValue = 3;
  }

  // Move to typing phase
  startTyping() {
    this.phase = PHASES.TYPING;
    this.timerValue = this.settings.typingTime;
  }

  // Submit an answer
  submitAnswer(playerId, answer) {
    if (this.phase !== PHASES.TYPING) {
      return { success: false, error: 'Not in typing phase' };
    }

    this.answers.set(playerId, answer);
    return { success: true };
  }

  // Lock all answers and process duplicates
  lockAnswers() {
    this.phase = PHASES.LOCKED;

    // Convert answers to array format
    const answersArray = [];
    this.answers.forEach((answer, playerId) => {
      const player = this.players.get(playerId);
      answersArray.push({
        playerId,
        playerName: player ? player.name : 'Unknown',
        answer
      });
    });

    // Add empty answers for players who didn't submit
    this.players.forEach((player, playerId) => {
      if (!this.answers.has(playerId)) {
        answersArray.push({
          playerId,
          playerName: player.name,
          answer: ''
        });
      }
    });

    // Shuffle for reveal order
    this.markedAnswers = findDuplicates(answersArray).sort(() => Math.random() - 0.5);
  }

  // Move to reveal phase
  startReveal() {
    this.phase = PHASES.REVEAL;
    this.revealIndex = 0;
  }

  // Get next answer to reveal
  revealNext() {
    if (this.revealIndex < this.markedAnswers.length) {
      const answer = this.markedAnswers[this.revealIndex];
      this.revealIndex++;
      return answer;
    }
    return null;
  }

  // Start audit phase (host reviews answers)
  startAudit() {
    this.phase = PHASES.AUDIT;
    this.challengedAnswers = [];
    this.rejectedAnswers = new Set();
    this.timerValue = Math.floor(TIMING.AUDIT / 1000);
  }

  // Host challenges an answer (marks it for voting)
  challengeAnswer(answerIndex) {
    if (this.phase !== PHASES.AUDIT) {
      return { success: false, error: 'Not in audit phase' };
    }

    if (answerIndex < 0 || answerIndex >= this.markedAnswers.length) {
      return { success: false, error: 'Invalid answer index' };
    }

    // Toggle challenge status
    const idx = this.challengedAnswers.indexOf(answerIndex);
    if (idx >= 0) {
      this.challengedAnswers.splice(idx, 1);
    } else {
      this.challengedAnswers.push(answerIndex);
    }

    return { success: true, challenged: this.challengedAnswers };
  }

  // Get all answers for audit display
  getAuditAnswers() {
    return this.markedAnswers.map((answer, index) => ({
      ...answer,
      index,
      challenged: this.challengedAnswers.includes(index)
    }));
  }

  // Check if there are challenged answers to vote on
  hasChallengedAnswers() {
    return this.challengedAnswers.length > 0;
  }

  // Start voting on the next challenged answer
  startNextVote() {
    if (this.challengedAnswers.length === 0) {
      return null;
    }

    const nextIndex = this.challengedAnswers.shift();
    this.currentChallenge = {
      index: nextIndex,
      answer: this.markedAnswers[nextIndex]
    };
    this.votes.clear();
    this.phase = PHASES.VOTING;
    this.timerValue = Math.floor(TIMING.VOTING / 1000);

    return this.currentChallenge;
  }

  // Submit a vote for the current challenge
  submitVote(playerId, vote) {
    if (this.phase !== PHASES.VOTING) {
      return { success: false, error: 'Not in voting phase' };
    }

    if (!this.currentChallenge) {
      return { success: false, error: 'No active challenge' };
    }

    // Don't let the answer's owner vote on their own answer
    if (this.currentChallenge.answer.playerId === playerId) {
      return { success: false, error: 'Cannot vote on your own answer' };
    }

    this.votes.set(playerId, vote);
    return { success: true };
  }

  // Tally votes and determine if answer is rejected
  tallyVotes() {
    if (!this.currentChallenge) return null;

    let validVotes = 0;
    let invalidVotes = 0;

    this.votes.forEach(vote => {
      if (vote === 'valid') validVotes++;
      else if (vote === 'invalid') invalidVotes++;
    });

    // Majority wins, tie goes to keeping the answer valid
    const rejected = invalidVotes > validVotes;

    if (rejected) {
      this.rejectedAnswers.add(this.currentChallenge.index);
    }

    const result = {
      answer: this.currentChallenge.answer,
      index: this.currentChallenge.index,
      validVotes,
      invalidVotes,
      rejected
    };

    this.currentChallenge = null;
    return result;
  }

  // Calculate and apply scores (excluding rejected answers)
  calculateScores() {
    this.phase = PHASES.SCORING;

    // Filter out rejected answers before scoring
    const validAnswers = this.markedAnswers.filter((_, index) =>
      !this.rejectedAnswers.has(index)
    );

    const roundPoints = calculateRoundPoints(validAnswers);
    this.scores = updateScores(this.scores, roundPoints);

    return roundPoints;
  }

  // Get rejected answers for display
  getRejectedAnswers() {
    return Array.from(this.rejectedAnswers).map(index => this.markedAnswers[index]);
  }

  // Get detailed results for display (breakdown of unique, duplicates, bonus)
  getDetailedResults() {
    // Filter out rejected answers
    const validAnswers = this.markedAnswers.filter((_, index) =>
      !this.rejectedAnswers.has(index)
    );
    return getDetailedResults(validAnswers);
  }

  // Check if game is over
  isGameOver() {
    return this.currentRound >= this.totalRounds;
  }

  // End the game
  endGame() {
    this.phase = PHASES.GAME_OVER;
    return {
      winners: getWinners(this.scores),
      finalScores: { ...this.scores }
    };
  }

  // Reset for new game
  reset() {
    this.phase = PHASES.LOBBY;
    this.currentRound = 0;
    this.currentCategory = null;
    this.categories = [];
    this.answers.clear();
    this.markedAnswers = [];
    this.revealIndex = 0;

    // Reset audit state
    this.challengedAnswers = [];
    this.currentChallenge = null;
    this.votes.clear();
    this.rejectedAnswers = new Set();

    // Reset scores
    this.players.forEach((player, id) => {
      this.scores[id] = 0;
    });
  }

  // Get player list (without WebSocket references)
  getPlayerList() {
    const list = [];
    this.players.forEach((player, id) => {
      list.push({
        id: player.id,
        name: player.name,
        score: this.scores[id] || 0,
        isHost: id === this.hostId
      });
    });
    return list;
  }

  // Get current state for broadcast
  getState() {
    return {
      phase: this.phase,
      roomCode: this.roomCode,
      players: this.getPlayerList(),
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentCategory: this.currentCategory,
      timerValue: this.timerValue,
      scores: { ...this.scores },
      hostId: this.hostId,
      settings: { ...this.settings }
    };
  }
}

module.exports = {
  GameState,
  PHASES,
  TIMING,
  GAME_LENGTHS
};

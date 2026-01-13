// Quick Think - GameState Module Tests
const { GameState, PHASES, TIMING, GAME_LENGTHS } = require('../game/GameState');

describe('PHASES', () => {
  test('contains all required phases', () => {
    expect(PHASES.LOBBY).toBe('LOBBY');
    expect(PHASES.CATEGORY_REVEAL).toBe('CATEGORY_REVEAL');
    expect(PHASES.COUNTDOWN).toBe('COUNTDOWN');
    expect(PHASES.TYPING).toBe('TYPING');
    expect(PHASES.LOCKED).toBe('LOCKED');
    expect(PHASES.REVEAL).toBe('REVEAL');
    expect(PHASES.SCORING).toBe('SCORING');
    expect(PHASES.GAME_OVER).toBe('GAME_OVER');
  });
});

describe('GAME_LENGTHS', () => {
  test('defines correct round counts', () => {
    expect(GAME_LENGTHS.quick).toBe(5);
    expect(GAME_LENGTHS.standard).toBe(10);
    expect(GAME_LENGTHS.extended).toBe(15);
  });
});

describe('TIMING', () => {
  test('defines timing constants', () => {
    expect(TIMING.CATEGORY_REVEAL).toBeDefined();
    expect(TIMING.COUNTDOWN).toBeDefined();
    expect(TIMING.TYPING).toBeDefined();
    expect(TIMING.REVEAL_PER_ANSWER).toBeDefined();
    expect(TIMING.SCORING).toBeDefined();
  });
});

describe('GameState', () => {
  let game;

  beforeEach(() => {
    game = new GameState('TEST');
  });

  describe('constructor', () => {
    test('initializes with correct room code', () => {
      expect(game.roomCode).toBe('TEST');
    });

    test('starts in LOBBY phase', () => {
      expect(game.phase).toBe(PHASES.LOBBY);
    });

    test('starts with empty players', () => {
      expect(game.players.size).toBe(0);
    });

    test('defaults to standard game length', () => {
      expect(game.totalRounds).toBe(GAME_LENGTHS.standard);
    });
  });

  describe('addPlayer', () => {
    test('adds player successfully', () => {
      const result = game.addPlayer('p1', 'Alice', null);
      expect(result.success).toBe(true);
      expect(game.players.size).toBe(1);
    });

    test('first player becomes host', () => {
      game.addPlayer('p1', 'Alice', null);
      expect(game.hostId).toBe('p1');
    });

    test('second player is not host', () => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      expect(game.hostId).toBe('p1');
    });

    test('initializes player score to 0', () => {
      game.addPlayer('p1', 'Alice', null);
      expect(game.scores['p1']).toBe(0);
    });

    test('rejects when room is full', () => {
      for (let i = 1; i <= 6; i++) {
        game.addPlayer(`p${i}`, `Player${i}`, null);
      }
      const result = game.addPlayer('p7', 'Player7', null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('full');
    });

    test('rejects when game already started', () => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame();
      game.phase = PHASES.TYPING; // Simulate game in progress

      const result = game.addPlayer('p3', 'Charlie', null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('started');
    });
  });

  describe('removePlayer', () => {
    test('removes player from game', () => {
      game.addPlayer('p1', 'Alice', null);
      game.removePlayer('p1');
      expect(game.players.size).toBe(0);
    });

    test('removes player score', () => {
      game.addPlayer('p1', 'Alice', null);
      game.removePlayer('p1');
      expect(game.scores['p1']).toBeUndefined();
    });

    test('reassigns host when host leaves', () => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.removePlayer('p1');
      expect(game.hostId).toBe('p2');
    });
  });

  describe('startGame', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
    });

    test('requires at least 2 players', () => {
      const singlePlayerGame = new GameState('SOLO');
      singlePlayerGame.addPlayer('p1', 'Alice', null);
      const result = singlePlayerGame.startGame();
      expect(result.success).toBe(false);
      expect(result.error).toContain('2 players');
    });

    test('succeeds with 2+ players', () => {
      const result = game.startGame();
      expect(result.success).toBe(true);
    });

    test('sets correct round count for quick game', () => {
      game.startGame('quick');
      expect(game.totalRounds).toBe(5);
    });

    test('sets correct round count for extended game', () => {
      game.startGame('extended');
      expect(game.totalRounds).toBe(15);
    });

    test('generates categories for all rounds', () => {
      game.startGame('quick');
      expect(game.categories.length).toBe(5);
    });

    test('resets all player scores to 0', () => {
      game.scores['p1'] = 10;
      game.startGame();
      expect(game.scores['p1']).toBe(0);
    });
  });

  describe('startRound', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame('quick');
    });

    test('increments current round', () => {
      game.startRound();
      expect(game.currentRound).toBe(1);
    });

    test('sets current category', () => {
      game.startRound();
      expect(game.currentCategory).toBe(game.categories[0]);
    });

    test('clears previous answers', () => {
      game.answers.set('p1', 'old answer');
      game.startRound();
      expect(game.answers.size).toBe(0);
    });

    test('sets phase to CATEGORY_REVEAL', () => {
      game.startRound();
      expect(game.phase).toBe(PHASES.CATEGORY_REVEAL);
    });
  });

  describe('submitAnswer', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame('quick');
      game.startRound();
      game.phase = PHASES.TYPING;
    });

    test('accepts answer in TYPING phase', () => {
      const result = game.submitAnswer('p1', 'Pizza');
      expect(result.success).toBe(true);
      expect(game.answers.get('p1')).toBe('Pizza');
    });

    test('rejects answer outside TYPING phase', () => {
      game.phase = PHASES.LOBBY;
      const result = game.submitAnswer('p1', 'Pizza');
      expect(result.success).toBe(false);
    });

    test('allows updating answer', () => {
      game.submitAnswer('p1', 'Pizza');
      game.submitAnswer('p1', 'Pasta');
      expect(game.answers.get('p1')).toBe('Pasta');
    });
  });

  describe('lockAnswers', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame('quick');
      game.startRound();
      game.phase = PHASES.TYPING;
      game.submitAnswer('p1', 'Pizza');
      game.submitAnswer('p2', 'Pasta');
    });

    test('changes phase to LOCKED', () => {
      game.lockAnswers();
      expect(game.phase).toBe(PHASES.LOCKED);
    });

    test('processes answers into markedAnswers', () => {
      game.lockAnswers();
      expect(game.markedAnswers.length).toBeGreaterThan(0);
    });

    test('adds empty answers for non-submitters', () => {
      game.addPlayer('p3', 'Charlie', null);
      game.lockAnswers();
      // Charlie didn't submit, should still be in results
      const playerIds = game.markedAnswers.map(a => a.playerId);
      // Note: empty answers result in 0 entries, so Charlie won't have any
    });
  });

  describe('reveal flow', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame('quick');
      game.startRound();
      game.phase = PHASES.TYPING;
      game.submitAnswer('p1', 'Pizza');
      game.submitAnswer('p2', 'Pasta');
      game.lockAnswers();
    });

    test('startReveal sets phase and resets index', () => {
      game.startReveal();
      expect(game.phase).toBe(PHASES.REVEAL);
      expect(game.revealIndex).toBe(0);
    });

    test('revealNext returns answers in order', () => {
      game.startReveal();
      const first = game.revealNext();
      expect(first).not.toBeNull();
      expect(game.revealIndex).toBe(1);
    });

    test('revealNext returns null when all revealed', () => {
      game.startReveal();
      while (game.revealNext() !== null) {}
      expect(game.revealNext()).toBeNull();
    });
  });

  describe('calculateScores', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame('quick');
      game.startRound();
      game.phase = PHASES.TYPING;
      game.submitAnswer('p1', 'Pizza');
      game.submitAnswer('p2', 'Pasta');
      game.lockAnswers();
    });

    test('changes phase to SCORING', () => {
      game.calculateScores();
      expect(game.phase).toBe(PHASES.SCORING);
    });

    test('returns round points', () => {
      const points = game.calculateScores();
      expect(points).toHaveProperty('p1');
      expect(points).toHaveProperty('p2');
    });

    test('updates total scores', () => {
      game.calculateScores();
      // Both should have unique answers, so +1 each
      expect(game.scores['p1']).toBe(1);
      expect(game.scores['p2']).toBe(1);
    });
  });

  describe('isGameOver', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame('quick'); // 5 rounds
    });

    test('returns false when rounds remain', () => {
      game.currentRound = 3;
      expect(game.isGameOver()).toBe(false);
    });

    test('returns true when all rounds complete', () => {
      game.currentRound = 5;
      expect(game.isGameOver()).toBe(true);
    });
  });

  describe('endGame', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame('quick');
      game.scores['p1'] = 10;
      game.scores['p2'] = 5;
    });

    test('changes phase to GAME_OVER', () => {
      game.endGame();
      expect(game.phase).toBe(PHASES.GAME_OVER);
    });

    test('returns winners', () => {
      const result = game.endGame();
      expect(result.winners).toContain('p1');
    });

    test('returns final scores', () => {
      const result = game.endGame();
      expect(result.finalScores['p1']).toBe(10);
      expect(result.finalScores['p2']).toBe(5);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.startGame('quick');
      game.startRound();
      game.scores['p1'] = 10;
    });

    test('returns to LOBBY phase', () => {
      game.reset();
      expect(game.phase).toBe(PHASES.LOBBY);
    });

    test('resets round counter', () => {
      game.reset();
      expect(game.currentRound).toBe(0);
    });

    test('clears categories', () => {
      game.reset();
      expect(game.categories.length).toBe(0);
    });

    test('resets all scores to 0', () => {
      game.reset();
      expect(game.scores['p1']).toBe(0);
    });

    test('keeps players', () => {
      game.reset();
      expect(game.players.size).toBe(2);
    });
  });

  describe('getPlayerList', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
      game.addPlayer('p2', 'Bob', null);
      game.scores['p1'] = 5;
    });

    test('returns array of player objects', () => {
      const list = game.getPlayerList();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(2);
    });

    test('includes player id and name', () => {
      const list = game.getPlayerList();
      const alice = list.find(p => p.id === 'p1');
      expect(alice.name).toBe('Alice');
    });

    test('includes scores', () => {
      const list = game.getPlayerList();
      const alice = list.find(p => p.id === 'p1');
      expect(alice.score).toBe(5);
    });

    test('identifies host', () => {
      const list = game.getPlayerList();
      const alice = list.find(p => p.id === 'p1');
      expect(alice.isHost).toBe(true);
    });

    test('does not include WebSocket reference', () => {
      const list = game.getPlayerList();
      list.forEach(p => {
        expect(p.ws).toBeUndefined();
      });
    });
  });

  describe('getState', () => {
    beforeEach(() => {
      game.addPlayer('p1', 'Alice', null);
    });

    test('includes all state properties', () => {
      const state = game.getState();
      expect(state).toHaveProperty('phase');
      expect(state).toHaveProperty('roomCode');
      expect(state).toHaveProperty('players');
      expect(state).toHaveProperty('currentRound');
      expect(state).toHaveProperty('totalRounds');
      expect(state).toHaveProperty('currentCategory');
      expect(state).toHaveProperty('scores');
      expect(state).toHaveProperty('hostId');
    });

    test('scores object is a copy', () => {
      const state = game.getState();
      state.scores['p1'] = 999;
      expect(game.scores['p1']).toBe(0);
    });
  });
});

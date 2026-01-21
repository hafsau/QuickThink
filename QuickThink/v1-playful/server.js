// Quick Think - v1-playful Server
// Express + WebSocket game server

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');

const { GameState, PHASES, TIMING } = require('./game/GameState');
const { isValidWord, loadDictionary } = require('./game/wordValidation');

// Load dictionary at startup
loadDictionary();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Store active game rooms
const rooms = new Map();

// Generate a random room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Generate player ID
function generatePlayerId() {
  return 'p_' + Math.random().toString(36).substr(2, 9);
}

// Redirect root to TV display
app.get('/', (req, res) => {
  res.redirect('/tv');
});

// Serve static files
app.use('/tv', express.static(path.join(__dirname, 'public/tv')));
app.use('/controller', express.static(path.join(__dirname, 'public/controller')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/shared', express.static(path.join(__dirname, 'public/shared')));

// API endpoint to create a room
app.get('/api/create-room', (req, res) => {
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }

  const gameState = new GameState(roomCode);
  rooms.set(roomCode, gameState);

  // Use request host for deployed environments
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host');
  const joinUrl = `${protocol}://${host}/controller?room=${roomCode}`;

  res.json({
    roomCode,
    joinUrl
  });
});

// API endpoint to generate QR code
app.get('/api/qr/:roomCode', async (req, res) => {
  const { roomCode } = req.params;

  // Use request host for deployed environments, fallback to local IP for development
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host');
  const joinUrl = `${protocol}://${host}/controller?room=${roomCode}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    res.json({ qrDataUrl, joinUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// API endpoint to validate a word
app.get('/api/validate-word', (req, res) => {
  const word = req.query.word;
  if (!word) {
    return res.json({ valid: false, reason: 'No word provided' });
  }
  const result = isValidWord(word);
  res.json(result);
});

// Broadcast to all clients in a room
function broadcast(roomCode, message, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  let playersSent = 0;
  let tvsSent = 0;

  room.players.forEach((player) => {
    if (player.ws && player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(messageStr);
      playersSent++;
    }
  });

  // Also send to TV clients
  if (room.tvClients) {
    room.tvClients.forEach(tvWs => {
      if (tvWs && tvWs.readyState === WebSocket.OPEN) {
        tvWs.send(messageStr);
        tvsSent++;
      }
    });
  }

  console.log(`[Broadcast] ${message.type} to room ${roomCode}: ${playersSent} players, ${tvsSent} TVs`);
}

// Send to specific client
function sendTo(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Game phase timers
function runCategoryReveal(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.startRound();
  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: {
      phase: PHASES.CATEGORY_REVEAL,
      category: room.currentCategory,
      round: room.currentRound,
      totalRounds: room.totalRounds
    }
  });

  setTimeout(() => runCountdown(roomCode), TIMING.CATEGORY_REVEAL);
}

function runCountdown(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.startCountdown();
  let count = 3;

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: { phase: PHASES.COUNTDOWN, timer: count }
  });

  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      broadcast(roomCode, {
        type: 'TIMER',
        payload: { remaining: count }
      });
    } else {
      clearInterval(countdownInterval);
      runTyping(roomCode);
    }
  }, 1000);
}

function runTyping(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.startTyping();
  let remaining = 10;

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: { phase: PHASES.TYPING, timer: remaining }
  });

  const typingInterval = setInterval(() => {
    remaining--;
    room.timerValue = remaining;

    broadcast(roomCode, {
      type: 'TIMER',
      payload: { remaining }
    });

    if (remaining <= 0) {
      clearInterval(typingInterval);
      runLockAndReveal(roomCode);
    }
  }, 1000);
}

function runLockAndReveal(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.lockAnswers();

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: { phase: PHASES.LOCKED }
  });

  // Brief pause before reveal
  setTimeout(() => {
    room.startReveal();

    broadcast(roomCode, {
      type: 'PHASE_CHANGE',
      payload: {
        phase: PHASES.REVEAL,
        totalAnswers: room.markedAnswers.length
      }
    });

    // Reveal answers one by one
    revealNextAnswer(roomCode);
  }, 1000);
}

function revealNextAnswer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const answer = room.revealNext();

  if (answer) {
    broadcast(roomCode, {
      type: 'REVEAL_ANSWER',
      payload: {
        playerName: answer.playerName,
        playerId: answer.playerId,
        answer: answer.answer,
        unique: answer.unique,
        revealIndex: room.revealIndex,
        totalAnswers: room.markedAnswers.length
      }
    });

    setTimeout(() => revealNextAnswer(roomCode), TIMING.REVEAL_PER_ANSWER);
  } else {
    // All answers revealed, move to audit phase
    runAudit(roomCode);
  }
}

// Audit phase: host can challenge answers
function runAudit(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.startAudit();

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: {
      phase: PHASES.AUDIT,
      answers: room.getAuditAnswers(),
      category: room.currentCategory,
      timer: room.timerValue
    }
  });

  // Countdown timer for audit phase
  let remaining = room.timerValue;
  const auditInterval = setInterval(() => {
    remaining--;
    room.timerValue = remaining;

    broadcast(roomCode, {
      type: 'TIMER',
      payload: { remaining }
    });

    if (remaining <= 0) {
      clearInterval(auditInterval);
      // End audit and start voting or scoring
      endAuditPhase(roomCode);
    }
  }, 1000);

  // Store interval so host can end it early
  room.auditInterval = auditInterval;
}

// End audit phase and proceed to voting or scoring
function endAuditPhase(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Clear any running interval
  if (room.auditInterval) {
    clearInterval(room.auditInterval);
    room.auditInterval = null;
  }

  if (room.hasChallengedAnswers()) {
    // Start voting on challenged answers
    runVoting(roomCode);
  } else {
    // No challenges, go directly to scoring
    runScoring(roomCode);
  }
}

// Voting phase: players vote on challenged answer
function runVoting(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const challenge = room.startNextVote();
  if (!challenge) {
    // No more challenges, proceed to scoring
    runScoring(roomCode);
    return;
  }

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: {
      phase: PHASES.VOTING,
      challenge: {
        index: challenge.index,
        answer: challenge.answer.answer,
        playerName: challenge.answer.playerName,
        playerId: challenge.answer.playerId
      },
      category: room.currentCategory,
      timer: room.timerValue
    }
  });

  // Countdown timer for voting
  let remaining = room.timerValue;
  const voteInterval = setInterval(() => {
    remaining--;
    room.timerValue = remaining;

    broadcast(roomCode, {
      type: 'TIMER',
      payload: { remaining }
    });

    if (remaining <= 0) {
      clearInterval(voteInterval);
      endVotingRound(roomCode);
    }
  }, 1000);

  room.voteInterval = voteInterval;
}

// End current voting round and show results
function endVotingRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.voteInterval) {
    clearInterval(room.voteInterval);
    room.voteInterval = null;
  }

  const result = room.tallyVotes();

  broadcast(roomCode, {
    type: 'VOTE_RESULT',
    payload: result
  });

  // Brief pause to show result, then continue
  setTimeout(() => {
    if (room.hasChallengedAnswers()) {
      runVoting(roomCode);
    } else {
      runScoring(roomCode);
    }
  }, 2000);
}

function runScoring(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const roundPoints = room.calculateScores();
  const detailedResults = room.getDetailedResults();

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: {
      phase: PHASES.SCORING,
      roundPoints,
      scores: room.scores,
      markedAnswers: room.markedAnswers,
      detailedResults
    }
  });

  setTimeout(() => {
    if (room.isGameOver()) {
      runGameOver(roomCode);
    } else {
      // Start next round
      runCategoryReveal(roomCode);
    }
  }, TIMING.SCORING);
}

function runGameOver(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const result = room.endGame();

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: {
      phase: PHASES.GAME_OVER,
      winners: result.winners,
      finalScores: result.finalScores,
      players: room.getPlayerList()
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  let playerId = null;
  let roomCode = null;
  let isTV = false;

  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      return;
    }

    const { type, payload } = message;

    switch (type) {
      case 'TV_JOIN': {
        // TV client joining a room
        roomCode = payload.roomCode;
        isTV = true;

        const room = rooms.get(roomCode);
        if (!room) {
          sendTo(ws, { type: 'ERROR', payload: { message: 'Room not found' } });
          return;
        }

        // Add TV client to room
        if (!room.tvClients) {
          room.tvClients = new Set();
        }
        room.tvClients.add(ws);

        sendTo(ws, {
          type: 'ROOM_STATE',
          payload: room.getState()
        });
        break;
      }

      case 'JOIN': {
        // Player joining a room
        roomCode = payload.roomCode;
        const playerName = payload.playerName;

        console.log(`[Server] Player "${playerName}" attempting to join room ${roomCode}`);

        const room = rooms.get(roomCode);
        if (!room) {
          console.log(`[Server] Room ${roomCode} not found`);
          sendTo(ws, { type: 'ERROR', payload: { message: 'Room not found' } });
          return;
        }

        playerId = generatePlayerId();
        const result = room.addPlayer(playerId, playerName, ws);

        if (!result.success) {
          console.log(`[Server] Failed to add player: ${result.error}`);
          sendTo(ws, { type: 'ERROR', payload: { message: result.error } });
          return;
        }

        console.log(`[Server] Player "${playerName}" joined as ${playerId}. Total players: ${room.players.size}`);

        // Confirm join to player
        sendTo(ws, {
          type: 'JOINED',
          payload: {
            playerId,
            playerName,
            roomCode,
            isHost: room.hostId === playerId
          }
        });

        // Broadcast updated player list
        const playerList = room.getPlayerList();
        console.log(`[Server] Broadcasting PLAYER_JOINED with ${playerList.length} players to room ${roomCode}`);

        broadcast(roomCode, {
          type: 'PLAYER_JOINED',
          payload: {
            playerId,
            playerName,
            players: playerList
          }
        });
        break;
      }

      case 'START_GAME': {
        console.log(`[Server] START_GAME received - roomCode: ${roomCode}, isTV: ${isTV}, playerId: ${playerId}`);

        const room = rooms.get(roomCode);
        if (!room) {
          console.log(`[Server] START_GAME failed - room not found for code: ${roomCode}`);
          sendTo(ws, { type: 'ERROR', payload: { message: 'Room not found' } });
          return;
        }

        console.log(`[Server] Room found - players: ${room.players.size}, hostId: ${room.hostId}`);

        // Only host can start (or TV can start on behalf of host)
        if (playerId !== room.hostId && !isTV) {
          console.log(`[Server] START_GAME denied - not host and not TV`);
          sendTo(ws, { type: 'ERROR', payload: { message: 'Only host can start' } });
          return;
        }

        const gameLength = payload?.gameLength || 'standard';
        console.log(`[Server] Starting game with length: ${gameLength}`);

        const result = room.startGame(gameLength);

        if (!result.success) {
          console.log(`[Server] startGame failed: ${result.error}`);
          sendTo(ws, { type: 'ERROR', payload: { message: result.error } });
          return;
        }

        console.log(`[Server] Game started successfully! Broadcasting to room ${roomCode}`);

        broadcast(roomCode, {
          type: 'GAME_STARTED',
          payload: {
            totalRounds: room.totalRounds
          }
        });

        // Start first round
        console.log(`[Server] Starting first round in 1 second...`);
        setTimeout(() => runCategoryReveal(roomCode), 1000);
        break;
      }

      case 'SUBMIT_ANSWER': {
        const room = rooms.get(roomCode);
        if (!room) return;

        // Validate entries if provided as array
        let validAnswer = payload.answer;
        let invalidEntries = [];

        if (payload.entries && Array.isArray(payload.entries)) {
          const validEntries = [];

          for (const entry of payload.entries) {
            const validation = isValidWord(entry);
            if (validation.valid) {
              validEntries.push(entry);
            } else {
              invalidEntries.push({ entry, reason: validation.reason });
            }
          }

          validAnswer = validEntries.join(', ');
        } else if (payload.answer) {
          // Validate single answer
          const validation = isValidWord(payload.answer);
          if (!validation.valid) {
            invalidEntries.push({ entry: payload.answer, reason: validation.reason });
            validAnswer = '';
          }
        }

        room.submitAnswer(playerId, validAnswer);

        // Confirm to player with validation feedback
        sendTo(ws, {
          type: 'ANSWER_RECEIVED',
          payload: {
            answer: validAnswer,
            invalidEntries: invalidEntries.length > 0 ? invalidEntries : undefined
          }
        });

        // Let TV know a player submitted (without revealing answer)
        broadcast(roomCode, {
          type: 'PLAYER_SUBMITTED',
          payload: { playerId }
        }, ws);
        break;
      }

      case 'PLAY_AGAIN': {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.reset();

        broadcast(roomCode, {
          type: 'GAME_RESET',
          payload: room.getState()
        });
        break;
      }

      case 'CHALLENGE_ANSWER': {
        // Host (via TV) challenges an answer for voting
        const room = rooms.get(roomCode);
        if (!room || !isTV) return;

        const result = room.challengeAnswer(payload.answerIndex);

        if (result.success) {
          broadcast(roomCode, {
            type: 'ANSWER_CHALLENGED',
            payload: {
              answerIndex: payload.answerIndex,
              challenged: result.challenged
            }
          });
        }
        break;
      }

      case 'END_AUDIT': {
        // Host (via TV) ends audit phase early
        const room = rooms.get(roomCode);
        if (!room || !isTV) return;

        if (room.phase === PHASES.AUDIT) {
          endAuditPhase(roomCode);
        }
        break;
      }

      case 'SUBMIT_VOTE': {
        // Player submits vote on challenged answer
        const room = rooms.get(roomCode);
        if (!room) return;

        const result = room.submitVote(playerId, payload.vote);

        if (result.success) {
          // Notify everyone that a vote was received (not the actual vote)
          broadcast(roomCode, {
            type: 'VOTE_RECEIVED',
            payload: {
              playerId,
              voteCount: room.votes.size,
              eligibleVoters: room.players.size - 1 // Exclude answer owner
            }
          });

          // Check if all votes are in
          const eligibleVoters = room.players.size - 1;
          if (room.votes.size >= eligibleVoters) {
            // All votes in, end voting round early
            if (room.voteInterval) {
              clearInterval(room.voteInterval);
              room.voteInterval = null;
            }
            endVotingRound(roomCode);
          }
        } else {
          sendTo(ws, {
            type: 'ERROR',
            payload: { message: result.error }
          });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        if (isTV) {
          room.tvClients?.delete(ws);
        } else if (playerId) {
          room.removePlayer(playerId);

          broadcast(roomCode, {
            type: 'PLAYER_LEFT',
            payload: {
              playerId,
              players: room.getPlayerList()
            }
          });

          // Clean up empty rooms
          if (room.players.size === 0 && (!room.tvClients || room.tvClients.size === 0)) {
            rooms.delete(roomCode);
          }
        }
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log('\n========================================');
  console.log('   QUICK THINK - v1-playful');
  console.log('========================================');
  console.log(`   Server running at http://${localIP}:${PORT}`);
  console.log(`   TV Display: http://${localIP}:${PORT}/tv`);
  console.log('========================================');
  console.log('   Open TV Display and scan QR code to join!');
  console.log('========================================\n');
});

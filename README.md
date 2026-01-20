# Family Multiplayer Games

A collection of original, snackable multiplayer games designed for families and groups. Built for ages 6+ through adulthood, these games bring people together in the same physical space using a shared TV screen and individual phone controllers.

## Games Included

### QuickThink

> *"Name it before the buzzer—but don't repeat anyone!"*

A fast-paced category game where players race to type answers. The twist: duplicate answers are eliminated, so you need to think fast AND think different.

**How it works:**
1. A category appears (e.g., "Things that are RED")
2. 3-second think time (no typing allowed)
3. 10-second typing phase
4. Answers revealed simultaneously
5. Duplicates eliminated - only unique answers score!

**Learning focus:** Vocabulary, quick thinking, creative thinking, spelling

### AliasAuction

> *"I can describe it in THREE words!" "I can do it in TWO!"*

A word description bidding game where players bid on how FEW words they can use to describe a target word. The lowest bidder must deliver their clue, and the group votes on success.

**How it works:**
1. Secret word revealed to all players
2. Players bid lower (5→4→3→2→1 words)
3. Lowest bidder describes using only their bid count
4. Other players vote: did it work?
5. Success = points based on difficulty, Failure = penalty

**Learning focus:** Vocabulary, risk assessment, wordplay, persuasion

## Visual Variants

Each game comes in 3 visual styles:

| Variant | Style |
|---------|-------|
| **v1-playful** | Vibrant colors, rounded buttons, playful animations, confetti effects |
| **v2-minimal** | Black/white with accent color, clean typography, subtle transitions |
| **v3-retro** | Arcade/game show aesthetic, pixel fonts, CRT glow effects |

## Tech Stack

- **Backend:** Node.js + Express.js
- **Real-time:** WebSocket (ws)
- **QR Codes:** qrcode
- **Word Processing:** wink-lemmatizer (for synonym detection)
- **Testing:** Jest
- **Frontend:** Vanilla HTML/CSS/JavaScript (no frameworks)

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A device to display the TV screen (computer, smart TV, or Chromecast)
- Phones/tablets for players to use as controllers
- All devices on the same Wi-Fi network

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hafsau/QuickThink.git
   cd QuickThink
   ```

2. **Navigate to the game variant you want to run**
   ```bash
   # For QuickThink (recommended: v1-playful)
   cd QuickThink/v1-playful

   # Or for AliasAuction
   cd AliasAuction/v1-playful
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

## Running the Game

1. **Start the server**
   ```bash
   npm start
   ```

2. **Open the TV display**

   The terminal will show something like:
   ```
   ========================================
      QUICK THINK - v1-playful
   ========================================
      Server running at http://192.168.1.X:3000
      TV Display: http://192.168.1.X:3000/tv
   ========================================
   ```

   Open the TV Display URL in a browser on your TV/main screen.

3. **Players join via QR code**

   A QR code will appear on the TV screen. Each player scans it with their phone to join as a controller.

4. **Start playing!**

   Once 3+ players have joined, the host can start the game.

## Project Structure

```
.
├── Brief.md                    # Product & creative brief
├── ShortlistedConcepts.md      # Game concept details
├── docs/
│   ├── architecture.md         # Technical architecture
│   └── TESTING_INSTRUCTIONS.md # Testing guide
├── QuickThink/
│   ├── AGENT_INSTRUCTIONS.md   # Build specifications
│   ├── v1-playful/             # Playful variant (most features)
│   ├── v2-minimal/             # Minimal variant
│   └── v3-retro/               # Retro variant
└── AliasAuction/
    ├── AGENT_INSTRUCTIONS.md   # Build specifications
    ├── v1-playful/             # Playful variant
    ├── v2-minimal/             # Minimal variant
    └── v3-retro/               # Retro variant
```

### Game Variant Structure

Each variant follows this structure:
```
v1-playful/
├── server.js           # Main server with WebSocket handling
├── package.json        # Dependencies and scripts
├── game/
│   ├── GameState.js    # Core game state management
│   ├── categories.js   # Category definitions (QuickThink)
│   ├── words.js        # Word lists (AliasAuction)
│   ├── scoring.js      # Scoring logic
│   └── wordValidation.js # Dictionary validation (v1 only)
├── public/
│   ├── tv/             # TV display (HTML/CSS/JS)
│   ├── controller/     # Phone controller (HTML/CSS/JS)
│   └── shared/         # Shared utilities
└── __tests__/          # Jest tests (v1-playful only)
```

## Running Tests

Tests are available for QuickThink v1-playful:

```bash
cd QuickThink/v1-playful

# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run with coverage report
npm test:coverage

# Run integration tests
npm test:integration
```

## How to Play

### Setup
1. Connect your TV/display and phones to the same Wi-Fi network
2. Start the game server on any computer on the network
3. Open the TV URL in a browser on your display
4. Have players scan the QR code with their phones

### QuickThink Rules
- **Players:** 3-6
- **Round time:** ~1-2 minutes
- **Scoring:** +1 for unique answers, 0 for duplicates
- **Winning:** Most points after all rounds

### AliasAuction Rules
- **Players:** 3-6
- **Round time:** ~3-5 minutes
- **Scoring:** +1 to +5 for successful descriptions (based on word count), -2 for failures
- **Winning:** Most points after all rounds

## Advanced Features (QuickThink v1-playful)

- **Host Audit:** Host can challenge questionable answers
- **Player Voting:** Democratic validation of challenged answers
- **Word Lemmatization:** Catches word variations (e.g., "running" = "run")
- **Audio System:** Lobby music and sound effects
- **Difficulty Tiers:** Categories marked as Easy, Medium, or Hard

## Troubleshooting

| Problem | Solution |
|---------|----------|
| QR code won't scan | Make sure phone and server are on same Wi-Fi network |
| Players can't connect | Check firewall settings, ensure port 3000 is accessible |
| Game feels laggy | Reduce number of players or check network connection |
| Audio not playing | Check browser autoplay settings, interact with page first |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for personal and educational use.

---

Built with fun in mind for families everywhere.

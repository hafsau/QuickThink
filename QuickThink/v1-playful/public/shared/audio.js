// Quick Think - Audio System
// Procedural audio using Web Audio API for background music and sound effects

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.currentMusic = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Volume levels
    this.volumes = {
      master: 1.0,
      music: 0.8,
      sfx: 0.8
    };
  }

  // Must be called after user interaction (click/tap)
  async init() {
    if (this.isInitialized) {
      console.log('Audio already initialized');
      return;
    }

    try {
      console.log('Creating AudioContext...');
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext created, state:', this.ctx.state);

      // Force resume if needed
      if (this.ctx.state === 'suspended') {
        console.log('Context suspended, resuming...');
        await this.ctx.resume();
        console.log('Context resumed, new state:', this.ctx.state);
      }

      // Create gain nodes
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volumes.master;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.volumes.music;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.volumes.sfx;
      this.sfxGain.connect(this.masterGain);

      this.isInitialized = true;
      console.log('✓ Audio system initialized successfully');
      console.log('Master gain:', this.masterGain.gain.value);
      console.log('Music gain:', this.musicGain.gain.value);
      console.log('SFX gain:', this.sfxGain.gain.value);
      console.log('isMuted:', this.isMuted);
    } catch (e) {
      console.error('❌ Audio initialization failed:', e);
    }
  }

  // Resume context if suspended (required by browsers)
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      console.log('Resuming suspended audio context...');
      await this.ctx.resume();
      console.log('Audio context resumed, state:', this.ctx.state);
    }
  }

  // Test beep - simple sound to verify audio works
  async testBeep() {
    console.log('TEST BEEP called');
    console.log('Context exists:', !!this.ctx);
    console.log('Context state BEFORE resume:', this.ctx?.state);

    if (!this.ctx) {
      console.error('No audio context!');
      return;
    }

    // Force resume the context
    if (this.ctx.state === 'suspended') {
      console.log('Context is suspended, forcing resume...');
      try {
        await this.ctx.resume();
        console.log('Resume called, new state:', this.ctx.state);
      } catch (e) {
        console.error('Resume failed:', e);
      }
    }

    console.log('Context state AFTER resume:', this.ctx.state);
    console.log('Context currentTime:', this.ctx.currentTime);
    console.log('Context destination:', this.ctx.destination);

    console.log('Creating test oscillator...');
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440; // A4 note
    gain.gain.value = 0.5; // Louder for testing

    osc.connect(gain);
    gain.connect(this.ctx.destination); // Connect directly to output

    console.log('Starting test beep at currentTime:', this.ctx.currentTime);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
    console.log('Test beep scheduled, should play for 0.5 seconds');

    // Log state after a moment
    setTimeout(() => {
      console.log('After 100ms - Context state:', this.ctx.state, 'currentTime:', this.ctx.currentTime);
    }, 100);
  }

  // Toggle mute
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volumes.master;
    }
    return this.isMuted;
  }

  // Mute just music (keeps SFX)
  muteMusic() {
    if (this.musicGain) {
      this.musicGain.gain.value = 0;
    }
  }

  // Unmute music
  unmuteMusic() {
    if (this.musicGain) {
      this.musicGain.gain.value = this.volumes.music;
    }
  }

  // Set volume (0-1)
  setVolume(type, value) {
    this.volumes[type] = Math.max(0, Math.min(1, value));
    if (type === 'master' && this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volumes.master;
    } else if (type === 'music' && this.musicGain) {
      this.musicGain.gain.value = this.volumes.music;
    } else if (type === 'sfx' && this.sfxGain) {
      this.sfxGain.gain.value = this.volumes.sfx;
    }
  }

  // ==================== SOUND EFFECTS ====================

  // Play a chime (player joined, success)
  playChime(frequency = 880, duration = 0.15) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Play ascending chime (player join)
  playPlayerJoin() {
    if (!this.ctx || this.isMuted) return;

    [440, 550, 660].forEach((freq, i) => {
      setTimeout(() => this.playChime(freq, 0.12), i * 80);
    });
  }

  // Play game start jingle
  playGameStart() {
    if (!this.ctx || this.isMuted) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playChime(freq, 0.2), i * 100);
    });
  }

  // Play whoosh (category reveal, transitions)
  playWhoosh() {
    if (!this.ctx || this.isMuted) return;

    const duration = 0.3;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // White noise approximation with oscillator
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + duration * 0.3);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + duration * 0.3);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + duration);
    filter.Q.value = 1;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Play countdown tick
  playTick(pitch = 1) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800 * pitch;

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Play GO! sound
  playGo() {
    if (!this.ctx || this.isMuted) return;

    // Chord burst
    [523, 659, 784].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    });
  }

  // Play urgent beep (timer warning)
  playUrgent() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = 880;

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.setValueAtTime(0, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Play buzzer (time's up)
  playBuzzer() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 150;

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Play card flip sound
  playCardFlip() {
    if (!this.ctx || this.isMuted) return;

    // Quick noise burst
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start();
  }

  // Play success ding (unique answer)
  playSuccess() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1100, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Play fail buzz (duplicate answer)
  playFail() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 180;

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Play point tally tick
  playPointTick() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 1200 + Math.random() * 200;

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Play victory fanfare
  playVictory() {
    if (!this.ctx || this.isMuted) return;

    const notes = [
      { freq: 523, time: 0 },
      { freq: 659, time: 0.15 },
      { freq: 784, time: 0.3 },
      { freq: 1047, time: 0.5 },
      { freq: 784, time: 0.65 },
      { freq: 1047, time: 0.8 }
    ];

    notes.forEach(note => {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = note.freq;

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
      }, note.time * 1000);
    });
  }

  // ==================== BACKGROUND MUSIC ====================

  // Stop current music
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.forEach(node => {
        try {
          node.stop();
        } catch (e) {}
      });
      this.currentMusic = null;
    }
  }

  // Play lobby music - fun, catchy party game style!
  playLobbyMusic() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    this.currentMusic = [{ active: true }]; // Flag to track if music should play
    const isActive = () => this.currentMusic && this.currentMusic[0]?.active;

    const bpm = 140;
    const beatTime = 60 / bpm;

    // Catchy melody - think party game!
    const melody = [
      // Bar 1
      { note: 'E5', time: 0, dur: 0.5 },
      { note: 'G5', time: 0.5, dur: 0.5 },
      { note: 'A5', time: 1, dur: 0.5 },
      { note: 'G5', time: 1.5, dur: 0.5 },
      // Bar 2
      { note: 'E5', time: 2, dur: 1 },
      { note: 'D5', time: 3, dur: 0.5 },
      { note: 'E5', time: 3.5, dur: 0.5 },
      // Bar 3
      { note: 'G5', time: 4, dur: 0.5 },
      { note: 'A5', time: 4.5, dur: 0.5 },
      { note: 'B5', time: 5, dur: 0.5 },
      { note: 'A5', time: 5.5, dur: 0.5 },
      // Bar 4
      { note: 'G5', time: 6, dur: 1.5 },
      { note: 'E5', time: 7.5, dur: 0.5 },
    ];

    // Bouncy bass line
    const bassLine = [
      { note: 'C3', time: 0 }, { note: 'C3', time: 0.5 }, { note: 'G3', time: 1 }, { note: 'G3', time: 1.5 },
      { note: 'A2', time: 2 }, { note: 'A2', time: 2.5 }, { note: 'E3', time: 3 }, { note: 'E3', time: 3.5 },
      { note: 'F3', time: 4 }, { note: 'F3', time: 4.5 }, { note: 'C3', time: 5 }, { note: 'C3', time: 5.5 },
      { note: 'G2', time: 6 }, { note: 'G2', time: 6.5 }, { note: 'G2', time: 7 }, { note: 'B2', time: 7.5 },
    ];

    // Note frequencies
    const noteFreq = {
      'G2': 98, 'A2': 110, 'B2': 123.5, 'C3': 130.8, 'E3': 164.8, 'F3': 174.6, 'G3': 196,
      'D5': 587.3, 'E5': 659.3, 'G5': 784, 'A5': 880, 'B5': 987.8
    };

    const loopDuration = 8 * beatTime * 1000; // 8 beats

    const playLoop = () => {
      if (!isActive()) return;

      // Play melody notes
      melody.forEach(({ note, time, dur }) => {
        setTimeout(() => {
          if (!isActive()) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'square';
          osc.frequency.value = noteFreq[note];

          gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur * beatTime);

          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start();
          osc.stop(this.ctx.currentTime + dur * beatTime);
        }, time * beatTime * 1000);
      });

      // Play bass notes
      bassLine.forEach(({ note, time }) => {
        setTimeout(() => {
          if (!isActive()) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.value = noteFreq[note];

          gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + beatTime * 0.4);

          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start();
          osc.stop(this.ctx.currentTime + beatTime * 0.5);
        }, time * beatTime * 1000);
      });

      // Play percussion hits
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (!isActive()) return;
          this.playPercHit(i % 2 === 0 ? 'kick' : 'hat');
        }, i * beatTime * 1000);
      }

      setTimeout(playLoop, loopDuration);
    };

    playLoop();
  }

  // Helper for percussion sounds
  playPercHit(type) {
    if (!this.ctx) return;

    const gain = this.ctx.createGain();
    gain.connect(this.musicGain);

    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } else if (type === 'hat') {
      // Hi-hat using filtered noise
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      noise.start();
    }
  }

  // Play gameplay music - super energetic and fast!
  playGameplayMusic() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const nodes = [];

    // Create continuous background chord - G major
    const createChordNote = (freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.12;

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();

      nodes.push(osc);
    };

    createChordNote(392.00); // G4
    createChordNote(493.88); // B4
    createChordNote(587.33); // D5

    // Fast rhythm pattern
    const rhythmPattern = () => {
      if (!this.currentMusic || this.currentMusic.length === 0) return;

      [880, 1046.5, 1318.5, 1046.5].forEach((freq, i) => {
        setTimeout(() => {
          if (!this.currentMusic || this.currentMusic.length === 0) return;

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.15);
        }, i * 150);
      });

      setTimeout(rhythmPattern, 800);
    };

    this.currentMusic = nodes;
    rhythmPattern();
  }

  // Play tense music - super fast and exciting for typing phase!
  playTenseMusic() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const nodes = [];

    // Create continuous background chord - D major (energetic)
    const createChordNote = (freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.1;

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();

      nodes.push(osc);
    };

    createChordNote(587.33); // D5
    createChordNote(739.99); // F#5
    createChordNote(880.00); // A5

    // Very fast pattern
    const fastPattern = () => {
      if (!this.currentMusic || this.currentMusic.length === 0) return;

      [1318.5, 1568.0, 1318.5, 1174.7].forEach((freq, i) => {
        setTimeout(() => {
          if (!this.currentMusic || this.currentMusic.length === 0) return;

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.12);
        }, i * 100);
      });

      setTimeout(fastPattern, 500);
    };

    this.currentMusic = nodes;
    fastPattern();
  }

  // Play reveal music - bright, exciting anticipation!
  playRevealMusic() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const nodes = [];

    // Create continuous background chord - A major (anticipation)
    const createChordNote = (freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.12;

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();

      nodes.push(osc);
    };

    createChordNote(440.00); // A4
    createChordNote(554.37); // C#5
    createChordNote(659.25); // E5

    // Exciting drumroll pattern
    const revealPattern = () => {
      if (!this.currentMusic || this.currentMusic.length === 0) return;

      [880, 1046.5, 1174.7, 1318.5].forEach((freq, i) => {
        setTimeout(() => {
          if (!this.currentMusic || this.currentMusic.length === 0) return;

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.3);
        }, i * 200);
      });

      setTimeout(revealPattern, 1000);
    };

    this.currentMusic = nodes;
    revealPattern();
  }

  // Crossfade to new music
  async crossfadeTo(musicType) {
    if (!this.ctx || !this.musicGain) return;

    // Fade out current
    const fadeTime = 0.5;
    this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTime);

    await new Promise(r => setTimeout(r, fadeTime * 1000));

    // Play new music
    switch (musicType) {
      case 'lobby':
        this.playLobbyMusic();
        break;
      case 'gameplay':
        this.playGameplayMusic();
        break;
      case 'tense':
        this.playTenseMusic();
        break;
      case 'reveal':
        this.playRevealMusic();
        break;
      case 'none':
        this.stopMusic();
        break;
    }

    // Fade in
    this.musicGain.gain.linearRampToValueAtTime(this.volumes.music, this.ctx.currentTime + fadeTime);
  }
}

// Global instance
const audioManager = new AudioManager();

// Auto-init on first user interaction
let audioInitPromise = null;
function ensureAudioInit() {
  if (audioManager.isInitialized) {
    return Promise.resolve();
  }
  if (!audioInitPromise) {
    audioInitPromise = audioManager.init().then(() => audioManager.resume());
  }
  return audioInitPromise;
}

['click', 'touchstart', 'keydown'].forEach(event => {
  document.addEventListener(event, async function initAudio() {
    await ensureAudioInit();
    document.removeEventListener(event, initAudio);
  }, { once: true });
});

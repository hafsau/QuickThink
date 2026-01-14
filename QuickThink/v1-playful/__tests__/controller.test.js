// Quick Think - Controller Tests
// Tests for room code handling

describe('Controller Room Code Handling', () => {
  describe('getRoomCodeFromURL', () => {
    // Helper function to extract room code from URL params
    const getRoomCodeFromURL = (url) => {
      const params = new URLSearchParams(url.split('?')[1] || '');
      return params.get('room');
    };

    test('extracts room code from URL query parameter', () => {
      expect(getRoomCodeFromURL('http://localhost:3000/controller?room=ABCD')).toBe('ABCD');
    });

    test('returns null when no room code in URL', () => {
      expect(getRoomCodeFromURL('http://localhost:3000/controller')).toBe(null);
    });

    test('handles room code with numbers', () => {
      expect(getRoomCodeFromURL('http://localhost:3000/controller?room=AB12')).toBe('AB12');
    });
  });

  describe('Room code validation', () => {
    const isValidRoomCode = (code) => {
      if (!code || typeof code !== 'string') return false;
      return /^[A-Z0-9]{4}$/.test(code.toUpperCase());
    };

    test('accepts valid 4-character uppercase code', () => {
      expect(isValidRoomCode('ABCD')).toBe(true);
    });

    test('accepts valid 4-character mixed case code', () => {
      expect(isValidRoomCode('abcd')).toBe(true);
    });

    test('accepts valid alphanumeric code', () => {
      expect(isValidRoomCode('AB12')).toBe(true);
    });

    test('rejects code that is too short', () => {
      expect(isValidRoomCode('ABC')).toBe(false);
    });

    test('rejects code that is too long', () => {
      expect(isValidRoomCode('ABCDE')).toBe(false);
    });

    test('rejects empty code', () => {
      expect(isValidRoomCode('')).toBe(false);
    });

    test('rejects null/undefined', () => {
      expect(isValidRoomCode(null)).toBe(false);
      expect(isValidRoomCode(undefined)).toBe(false);
    });
  });
});

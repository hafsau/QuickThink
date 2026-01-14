// Quick Think - Word Validation Tests
// Tests dictionary-based word validation

const {
  isValidWord,
  isInDictionary,
  loadDictionary
} = require('../game/wordValidation');

// Load dictionary before tests
beforeAll(() => {
  loadDictionary();
});

describe('isInDictionary', () => {
  test('returns true for common English words', () => {
    expect(isInDictionary('pizza')).toBe(true);
    expect(isInDictionary('cat')).toBe(true);
    expect(isInDictionary('house')).toBe(true);
    expect(isInDictionary('computer')).toBe(true);
  });

  test('returns true for words in additional list', () => {
    expect(isInDictionary('spain')).toBe(true);
    expect(isInDictionary('einstein')).toBe(true);
    expect(isInDictionary('pokemon')).toBe(true);
  });

  test('returns false for gibberish', () => {
    expect(isInDictionary('asde')).toBe(false);
    expect(isInDictionary('kkhh')).toBe(false);
    expect(isInDictionary('qwerty')).toBe(false);
    expect(isInDictionary('asdfg')).toBe(false);
    expect(isInDictionary('zxcvb')).toBe(false);
  });

  test('is case-insensitive', () => {
    expect(isInDictionary('PIZZA')).toBe(true);
    expect(isInDictionary('Pizza')).toBe(true);
    expect(isInDictionary('pIzZa')).toBe(true);
  });
});

describe('isValidWord', () => {
  describe('accepts valid English words', () => {
    test('common nouns', () => {
      expect(isValidWord('pizza').valid).toBe(true);
      expect(isValidWord('cat').valid).toBe(true);
      expect(isValidWord('dog').valid).toBe(true);
      expect(isValidWord('house').valid).toBe(true);
      expect(isValidWord('table').valid).toBe(true);
    });

    test('proper nouns (countries, names)', () => {
      expect(isValidWord('Spain').valid).toBe(true);
      expect(isValidWord('France').valid).toBe(true);
      expect(isValidWord('Japan').valid).toBe(true);
      expect(isValidWord('Einstein').valid).toBe(true);
    });

    test('food items', () => {
      expect(isValidWord('sushi').valid).toBe(true);
      expect(isValidWord('pasta').valid).toBe(true);
      expect(isValidWord('hamburger').valid).toBe(true);
      expect(isValidWord('banana').valid).toBe(true);
    });

    test('words with numbers (brand names)', () => {
      expect(isValidWord('7up').valid).toBe(true);
      expect(isValidWord('3M').valid).toBe(true);
      expect(isValidWord('WD40').valid).toBe(true);
    });
  });

  describe('rejects gibberish', () => {
    test('random letter combinations', () => {
      expect(isValidWord('asde').valid).toBe(false);
      expect(isValidWord('kkhh').valid).toBe(false);
      expect(isValidWord('qwerty').valid).toBe(false);
      expect(isValidWord('asdfg').valid).toBe(false);
      expect(isValidWord('zxcvb').valid).toBe(false);
      expect(isValidWord('hjkl').valid).toBe(false);
    });

    test('repeated characters', () => {
      expect(isValidWord('aaaa').valid).toBe(false);
      expect(isValidWord('xxxxx').valid).toBe(false);
      expect(isValidWord('zzzzz').valid).toBe(false);
    });

    test('random strings', () => {
      expect(isValidWord('xyzabc').valid).toBe(false);
      expect(isValidWord('fghijk').valid).toBe(false);
      expect(isValidWord('mnopqr').valid).toBe(false);
    });

    test('too short (min 3 chars) except allowed list', () => {
      expect(isValidWord('a').valid).toBe(false);
      expect(isValidWord('ab').valid).toBe(false);
      expect(isValidWord('ml').valid).toBe(false);
      expect(isValidWord('mo').valid).toBe(false);
      expect(isValidWord('').valid).toBe(false);
      // But these 2-letter words are allowed
      expect(isValidWord('tv').valid).toBe(true);
      expect(isValidWord('ok').valid).toBe(true);
      expect(isValidWord('hi').valid).toBe(true);
      expect(isValidWord('pc').valid).toBe(true);
      expect(isValidWord('UK').valid).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('handles whitespace', () => {
      expect(isValidWord('  pizza  ').valid).toBe(true);
      expect(isValidWord('  ').valid).toBe(false);
    });

    test('handles mixed case', () => {
      expect(isValidWord('PIZZA').valid).toBe(true);
      expect(isValidWord('PiZzA').valid).toBe(true);
    });

    test('handles multi-word answers', () => {
      expect(isValidWord('New York').valid).toBe(true);
      expect(isValidWord('ice cream').valid).toBe(true);
      expect(isValidWord('hot dog').valid).toBe(true);
    });

    test('handles hyphenated words', () => {
      expect(isValidWord('well-known').valid).toBe(true);
      expect(isValidWord('self-esteem').valid).toBe(true);
    });

    test('handles apostrophes', () => {
      expect(isValidWord("don't").valid).toBe(true);
      expect(isValidWord("it's").valid).toBe(true);
    });

    test('returns reason for invalid words', () => {
      const result = isValidWord('asde');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});

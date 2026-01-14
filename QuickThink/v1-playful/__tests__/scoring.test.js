// Quick Think - Scoring Module Tests
const {
  normalizeAnswer,
  isSimilar,
  levenshteinDistance,
  getWordStem,
  hasSameStem,
  parseMultipleEntries,
  dedupePlayerEntries,
  findDuplicates,
  calculateRoundPoints,
  getDetailedResults,
  updateScores,
  getWinners,
  UnionFind
} = require('../game/scoring');

describe('UnionFind', () => {
  test('initializes with correct parent array', () => {
    const uf = new UnionFind(5);
    expect(uf.parent).toEqual([0, 1, 2, 3, 4]);
  });

  test('find returns element itself initially', () => {
    const uf = new UnionFind(5);
    expect(uf.find(0)).toBe(0);
    expect(uf.find(4)).toBe(4);
  });

  test('union merges two sets', () => {
    const uf = new UnionFind(5);
    uf.union(0, 1);
    expect(uf.find(0)).toBe(uf.find(1));
  });

  test('union handles transitive relationships', () => {
    const uf = new UnionFind(5);
    uf.union(0, 1);
    uf.union(1, 2);
    expect(uf.find(0)).toBe(uf.find(2));
  });

  test('getGroups returns correct groupings', () => {
    const uf = new UnionFind(5);
    uf.union(0, 1);
    uf.union(2, 3);
    const groups = uf.getGroups();
    expect(groups.length).toBe(3); // {0,1}, {2,3}, {4}
  });
});

describe('levenshteinDistance', () => {
  test('returns 0 for identical strings', () => {
    expect(levenshteinDistance('test', 'test')).toBe(0);
  });

  test('returns length for empty string comparison', () => {
    expect(levenshteinDistance('', 'test')).toBe(4);
    expect(levenshteinDistance('test', '')).toBe(4);
  });

  test('returns 1 for single character difference', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
    expect(levenshteinDistance('cat', 'car')).toBe(1);
  });

  test('handles insertions', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
  });

  test('handles deletions', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
  });

  test('calculates correct distance for complex cases', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('getWordStem', () => {
  test('handles empty input', () => {
    expect(getWordStem('')).toBe('');
    expect(getWordStem(null)).toBe('');
  });

  test('removes plural -s suffix', () => {
    expect(getWordStem('spoons')).toBe('spoon');
    expect(getWordStem('cats')).toBe('cat');
  });

  test('removes -ed past tense suffix', () => {
    expect(getWordStem('walked')).toBe('walk');
    expect(getWordStem('played')).toBe('play');
  });

  test('removes -ing suffix', () => {
    expect(getWordStem('walking')).toBe('walk');
    expect(getWordStem('running')).toBe('runn');
  });

  test('removes -er suffix', () => {
    expect(getWordStem('faster')).toBe('fast');
    expect(getWordStem('bigger')).toBe('bigg');
  });

  test('removes -es plural suffix', () => {
    expect(getWordStem('boxes')).toBe('box');
    expect(getWordStem('dishes')).toBe('dish');
  });

  test('preserves short words', () => {
    // Should not strip words that would become too short
    expect(getWordStem('cat')).toBe('cat');
    expect(getWordStem('is')).toBe('is');
  });
});

describe('hasSameStem', () => {
  test('returns true for singular/plural pairs', () => {
    expect(hasSameStem('spoon', 'spoons')).toBe(true);
    expect(hasSameStem('cat', 'cats')).toBe(true);
    expect(hasSameStem('box', 'boxes')).toBe(true);
  });

  test('returns true for present/past tense pairs', () => {
    expect(hasSameStem('walk', 'walked')).toBe(true);
    expect(hasSameStem('play', 'played')).toBe(true);
  });

  test('returns true for base/present participle pairs', () => {
    expect(hasSameStem('walk', 'walking')).toBe(true);
    expect(hasSameStem('run', 'running')).toBe(true);
  });

  test('returns false for different words', () => {
    expect(hasSameStem('cat', 'dog')).toBe(false);
    expect(hasSameStem('pizza', 'pasta')).toBe(false);
  });

  test('handles empty input', () => {
    expect(hasSameStem('', 'test')).toBe(false);
    expect(hasSameStem('test', '')).toBe(false);
  });
});

describe('normalizeAnswer', () => {
  test('converts to lowercase', () => {
    expect(normalizeAnswer('HELLO')).toBe('hello');
    expect(normalizeAnswer('HeLLo WoRLD')).toBe('hello world');
  });

  test('trims whitespace', () => {
    expect(normalizeAnswer('  hello  ')).toBe('hello');
  });

  test('collapses multiple spaces', () => {
    expect(normalizeAnswer('hello    world')).toBe('hello world');
  });

  test('removes leading article "the"', () => {
    expect(normalizeAnswer('The Beatles')).toBe('beatles');
  });

  test('removes leading article "a"', () => {
    expect(normalizeAnswer('A Dog')).toBe('dog');
  });

  test('removes leading article "an"', () => {
    expect(normalizeAnswer('An Apple')).toBe('apple');
  });

  test('handles empty/null input', () => {
    expect(normalizeAnswer('')).toBe('');
    expect(normalizeAnswer(null)).toBe('');
    expect(normalizeAnswer(undefined)).toBe('');
  });

  test('handles non-string input', () => {
    expect(normalizeAnswer(123)).toBe('');
  });
});

describe('isSimilar', () => {
  test('returns true for identical strings', () => {
    expect(isSimilar('pizza', 'pizza')).toBe(true);
  });

  test('returns false for empty strings', () => {
    expect(isSimilar('', 'test')).toBe(false);
    expect(isSimilar('test', '')).toBe(false);
  });

  test('allows 1 typo for short strings (3-4 chars)', () => {
    expect(isSimilar('cat', 'bat')).toBe(true);
    expect(isSimilar('dog', 'dig')).toBe(true);
  });

  test('allows 2 typos for medium strings (5-7 chars)', () => {
    expect(isSimilar('pizza', 'piza')).toBe(true);
    expect(isSimilar('banana', 'bananna')).toBe(true);
  });

  test('returns false for very different strings', () => {
    expect(isSimilar('cat', 'elephant')).toBe(false);
    expect(isSimilar('pizza', 'hamburger')).toBe(false);
  });

  test('returns false when length difference is too large', () => {
    expect(isSimilar('hi', 'helicopter')).toBe(false);
  });

  test('catches plural variations via stemming', () => {
    expect(isSimilar('spoon', 'spoons')).toBe(true);
    expect(isSimilar('cat', 'cats')).toBe(true);
    expect(isSimilar('box', 'boxes')).toBe(true);
  });

  test('catches past tense variations via stemming', () => {
    expect(isSimilar('walk', 'walked')).toBe(true);
    expect(isSimilar('play', 'played')).toBe(true);
  });

  test('catches present participle variations via stemming', () => {
    expect(isSimilar('walk', 'walking')).toBe(true);
    expect(isSimilar('run', 'running')).toBe(true);
  });
});

describe('parseMultipleEntries', () => {
  test('splits by comma', () => {
    expect(parseMultipleEntries('red, blue, green')).toEqual(['red', 'blue', 'green']);
  });

  test('splits by semicolon', () => {
    expect(parseMultipleEntries('red; blue; green')).toEqual(['red', 'blue', 'green']);
  });

  test('splits by newline', () => {
    expect(parseMultipleEntries('red\nblue\ngreen')).toEqual(['red', 'blue', 'green']);
  });

  test('trims whitespace from entries', () => {
    expect(parseMultipleEntries('  red  ,  blue  ')).toEqual(['red', 'blue']);
  });

  test('removes empty entries', () => {
    expect(parseMultipleEntries('red,,blue')).toEqual(['red', 'blue']);
  });

  test('removes exact duplicate entries (case-insensitive)', () => {
    expect(parseMultipleEntries('Red, red, RED')).toEqual(['Red']);
  });

  test('handles empty/null input', () => {
    expect(parseMultipleEntries('')).toEqual([]);
    expect(parseMultipleEntries(null)).toEqual([]);
  });
});

describe('dedupePlayerEntries', () => {
  test('returns single entry unchanged', () => {
    expect(dedupePlayerEntries(['pizza'])).toEqual(['pizza']);
  });

  test('removes fuzzy duplicates', () => {
    const result = dedupePlayerEntries(['Spain', 'Span']);
    expect(result.length).toBe(1);
  });

  test('keeps distinct entries', () => {
    const result = dedupePlayerEntries(['pizza', 'hamburger', 'sushi']);
    expect(result.length).toBe(3);
  });
});

describe('findDuplicates', () => {
  test('marks unique answers correctly', () => {
    const answers = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Pizza' },
      { playerId: 'p2', playerName: 'Bob', answer: 'Pasta' },
    ];
    const result = findDuplicates(answers);
    expect(result.every(r => r.unique === true)).toBe(true);
  });

  test('marks duplicate answers correctly', () => {
    const answers = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Pizza' },
      { playerId: 'p2', playerName: 'Bob', answer: 'pizza' },
    ];
    const result = findDuplicates(answers);
    expect(result.every(r => r.unique === false)).toBe(true);
  });

  test('handles mixed unique and duplicate answers', () => {
    const answers = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Pizza' },
      { playerId: 'p2', playerName: 'Bob', answer: 'Pasta' },
      { playerId: 'p3', playerName: 'Charlie', answer: 'pizza' },
    ];
    const result = findDuplicates(answers);

    const pizzaResults = result.filter(r => r.normalized === 'pizza');
    const pastaResults = result.filter(r => r.normalized === 'pasta');

    expect(pizzaResults.every(r => r.unique === false)).toBe(true);
    expect(pastaResults.every(r => r.unique === true)).toBe(true);
  });

  test('handles multiple entries per player', () => {
    const answers = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Red, Blue' },
      { playerId: 'p2', playerName: 'Bob', answer: 'Green, Red' },
    ];
    const result = findDuplicates(answers);

    const redResults = result.filter(r => r.normalized === 'red');
    expect(redResults.length).toBe(2);
    expect(redResults.every(r => r.unique === false)).toBe(true);
  });

  test('handles empty input', () => {
    expect(findDuplicates([])).toEqual([]);
  });

  test('handles empty answers from players', () => {
    const answers = [
      { playerId: 'p1', playerName: 'Alice', answer: '' },
      { playerId: 'p2', playerName: 'Bob', answer: 'Pizza' },
    ];
    const result = findDuplicates(answers);
    expect(result.length).toBe(1);
  });

  test('marks plural variations as duplicates across players', () => {
    const answers = [
      { playerId: 'p1', playerName: 'Alice', answer: 'spoon' },
      { playerId: 'p2', playerName: 'Bob', answer: 'spoons' },
    ];
    const result = findDuplicates(answers);
    // Both should be marked as duplicates (not unique)
    expect(result.every(r => r.unique === false)).toBe(true);
  });

  test('marks tense variations as duplicates across players', () => {
    const answers = [
      { playerId: 'p1', playerName: 'Alice', answer: 'walk' },
      { playerId: 'p2', playerName: 'Bob', answer: 'walked' },
    ];
    const result = findDuplicates(answers);
    expect(result.every(r => r.unique === false)).toBe(true);
  });
});

describe('calculateRoundPoints', () => {
  test('awards +1 for unique answers', () => {
    const marked = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Pizza', normalized: 'pizza', unique: true },
    ];
    const points = calculateRoundPoints(marked);
    expect(points['p1']).toBe(1);
  });

  test('deducts -1 for duplicate answers', () => {
    const marked = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Pizza', normalized: 'pizza', unique: false },
    ];
    const points = calculateRoundPoints(marked);
    expect(points['p1']).toBe(-1);
  });

  test('awards volume bonus for 3+ unique answers', () => {
    const marked = [
      { playerId: 'p1', playerName: 'Alice', answer: 'A', normalized: 'a', unique: true },
      { playerId: 'p1', playerName: 'Alice', answer: 'B', normalized: 'b', unique: true },
      { playerId: 'p1', playerName: 'Alice', answer: 'C', normalized: 'c', unique: true },
    ];
    const points = calculateRoundPoints(marked);
    // 3 unique = 3 points + 1 volume bonus = 4
    expect(points['p1']).toBe(4);
  });

  test('calculates correctly for multiple players', () => {
    const marked = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Pizza', normalized: 'pizza', unique: true },
      { playerId: 'p2', playerName: 'Bob', answer: 'Pasta', normalized: 'pasta', unique: false },
    ];
    const points = calculateRoundPoints(marked);
    expect(points['p1']).toBe(1);
    expect(points['p2']).toBe(-1);
  });
});

describe('getDetailedResults', () => {
  test('returns breakdown with unique points', () => {
    const marked = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Pizza', normalized: 'pizza', unique: true },
    ];
    const results = getDetailedResults(marked);
    expect(results['p1'].breakdown.uniquePoints).toBe(1);
  });

  test('returns breakdown with duplicate penalty', () => {
    const marked = [
      { playerId: 'p1', playerName: 'Alice', answer: 'Pizza', normalized: 'pizza', unique: false, duplicateWith: ['Bob'] },
    ];
    const results = getDetailedResults(marked);
    expect(results['p1'].breakdown.duplicatePenalty).toBe(-1);
  });

  test('includes volume bonus in breakdown', () => {
    const marked = [
      { playerId: 'p1', playerName: 'Alice', answer: 'A', normalized: 'a', unique: true },
      { playerId: 'p1', playerName: 'Alice', answer: 'B', normalized: 'b', unique: true },
      { playerId: 'p1', playerName: 'Alice', answer: 'C', normalized: 'c', unique: true },
    ];
    const results = getDetailedResults(marked);
    expect(results['p1'].breakdown.volumeBonus).toBe(1);
  });
});

describe('updateScores', () => {
  test('adds round points to current scores', () => {
    const current = { p1: 5, p2: 3 };
    const round = { p1: 2, p2: -1 };
    const updated = updateScores(current, round);
    expect(updated).toEqual({ p1: 7, p2: 2 });
  });

  test('handles new players', () => {
    const current = { p1: 5 };
    const round = { p1: 1, p2: 2 };
    const updated = updateScores(current, round);
    expect(updated).toEqual({ p1: 6, p2: 2 });
  });

  test('does not mutate original scores', () => {
    const current = { p1: 5 };
    const round = { p1: 2 };
    updateScores(current, round);
    expect(current).toEqual({ p1: 5 });
  });
});

describe('getWinners', () => {
  test('returns single winner', () => {
    const scores = { p1: 10, p2: 5, p3: 3 };
    expect(getWinners(scores)).toEqual(['p1']);
  });

  test('returns multiple winners on tie', () => {
    const scores = { p1: 10, p2: 10, p3: 5 };
    const winners = getWinners(scores);
    expect(winners).toContain('p1');
    expect(winners).toContain('p2');
    expect(winners.length).toBe(2);
  });

  test('handles empty scores', () => {
    expect(getWinners({})).toEqual([]);
  });

  test('handles negative scores', () => {
    const scores = { p1: -1, p2: -5 };
    expect(getWinners(scores)).toEqual(['p1']);
  });
});

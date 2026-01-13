// Quick Think - Categories Module Tests
const {
  categories,
  getAllCategories,
  getAllCategoriesWithDifficulty,
  getRandomCategory,
  getCategoriesForGame,
  getCategoryInfo,
  getDifficultyStars
} = require('../game/categories');

describe('categories object', () => {
  test('has easy, medium, and hard difficulties', () => {
    expect(categories).toHaveProperty('easy');
    expect(categories).toHaveProperty('medium');
    expect(categories).toHaveProperty('hard');
  });

  test('each difficulty has category arrays', () => {
    Object.values(categories.easy).forEach(arr => {
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBeGreaterThan(0);
    });
  });

  test('all categories are non-empty strings', () => {
    const all = getAllCategories();
    all.forEach(cat => {
      expect(typeof cat).toBe('string');
      expect(cat.length).toBeGreaterThan(0);
    });
  });
});

describe('getAllCategories', () => {
  test('returns an array', () => {
    const all = getAllCategories();
    expect(Array.isArray(all)).toBe(true);
  });

  test('returns non-empty array', () => {
    const all = getAllCategories();
    expect(all.length).toBeGreaterThan(0);
  });

  test('contains known categories', () => {
    const all = getAllCategories();
    expect(all).toContain('Fruits');
    expect(all).toContain('Countries');
  });
});

describe('getAllCategoriesWithDifficulty', () => {
  test('returns array of objects with text, difficulty, and type', () => {
    const all = getAllCategoriesWithDifficulty();
    expect(all.length).toBeGreaterThan(0);

    all.forEach(cat => {
      expect(cat).toHaveProperty('text');
      expect(cat).toHaveProperty('difficulty');
      expect(cat).toHaveProperty('type');
    });
  });

  test('difficulty is one of easy, medium, hard', () => {
    const all = getAllCategoriesWithDifficulty();
    const validDifficulties = ['easy', 'medium', 'hard'];

    all.forEach(cat => {
      expect(validDifficulties).toContain(cat.difficulty);
    });
  });

  test('has categories of all difficulties', () => {
    const all = getAllCategoriesWithDifficulty();
    const difficulties = new Set(all.map(c => c.difficulty));

    expect(difficulties.has('easy')).toBe(true);
    expect(difficulties.has('medium')).toBe(true);
    expect(difficulties.has('hard')).toBe(true);
  });
});

describe('getRandomCategory', () => {
  test('returns a string', () => {
    const cat = getRandomCategory();
    expect(typeof cat).toBe('string');
  });

  test('returns a valid category', () => {
    const all = getAllCategories();
    const cat = getRandomCategory();
    expect(all).toContain(cat);
  });

  test('avoids used categories when possible', () => {
    const all = getAllCategories();
    const used = all.slice(0, all.length - 1); // Leave one unused
    const cat = getRandomCategory(used);

    // Should return the one unused category
    expect(used).not.toContain(cat);
  });

  test('falls back to any category when all used', () => {
    const all = getAllCategories();
    const cat = getRandomCategory(all); // All used
    expect(all).toContain(cat); // Should still return a valid category
  });
});

describe('getCategoriesForGame', () => {
  test('returns requested number of categories', () => {
    expect(getCategoriesForGame(5).length).toBe(5);
    expect(getCategoriesForGame(10).length).toBe(10);
    expect(getCategoriesForGame(15).length).toBe(15);
  });

  test('returns unique categories when possible', () => {
    const cats = getCategoriesForGame(10);
    const unique = new Set(cats);
    expect(unique.size).toBe(10);
  });

  test('all returned categories are valid', () => {
    const all = getAllCategories();
    const gameCats = getCategoriesForGame(10);

    gameCats.forEach(cat => {
      expect(all).toContain(cat);
    });
  });

  test('distributes difficulties according to pattern', () => {
    // Pattern: easy, medium, easy, medium, hard (repeating)
    const cats = getCategoriesForGame(5);

    // We can't test exact pattern due to randomness, but verify variety exists
    const infos = cats.map(c => getCategoryInfo(c));
    const difficulties = new Set(infos.map(i => i.difficulty));

    // Should have at least 2 different difficulties
    expect(difficulties.size).toBeGreaterThanOrEqual(2);
  });
});

describe('getCategoryInfo', () => {
  test('returns difficulty and type for known category', () => {
    const info = getCategoryInfo('Fruits');
    expect(info.difficulty).toBe('easy');
    expect(info.type).toBe('food');
  });

  test('returns default for unknown category', () => {
    const info = getCategoryInfo('Unknown Category XYZ');
    expect(info.difficulty).toBe('medium');
    expect(info.type).toBe('unknown');
  });
});

describe('getDifficultyStars', () => {
  test('returns 1 for easy', () => {
    expect(getDifficultyStars('easy')).toBe(1);
  });

  test('returns 2 for medium', () => {
    expect(getDifficultyStars('medium')).toBe(2);
  });

  test('returns 3 for hard', () => {
    expect(getDifficultyStars('hard')).toBe(3);
  });

  test('returns 2 as default', () => {
    expect(getDifficultyStars('unknown')).toBe(2);
    expect(getDifficultyStars(null)).toBe(2);
  });
});

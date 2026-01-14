// Shared Word Utilities for QuickThink
// Client-side version - uses basic stemming for immediate feedback
// Server does full lemmatization for accurate duplicate detection

/**
 * Get a simplified stem of a word by removing common suffixes
 * This provides quick feedback on the client side
 */
function getWordStem(word) {
  if (!word) return '';
  let stem = word.toLowerCase().trim();

  // Remove common suffixes (order matters - longer first)
  const suffixes = [
    'ization', 'isation', 'fulness', 'ousness', 'iveness',
    'ically', 'lessly', 'edness',
    'ation', 'ition', 'ening', 'ingly', 'ously', 'fully',
    'able', 'ible', 'ness', 'ment', 'less', 'ings', 'tion',
    'ally', 'edly', 'erly', 'ward',
    'ing', 'est', 'ies', 'ied', 'ful', 'ous', 'ive', 'ess',
    'ers', 'ery', 'ens', 'ant', 'ent', 'ism', 'ist',
    'ity', 'ify', 'ise', 'ize', 'ure', 'ory',
    'ed', 'er', 'es', 'en', 'ly', 'al',
    's'
  ];

  for (const suffix of suffixes) {
    if (stem.length > suffix.length + 2 && stem.endsWith(suffix)) {
      stem = stem.slice(0, -suffix.length);
      break;
    }
  }

  return stem;
}

/**
 * Check if a word is too similar to any existing entry
 * Uses stemming for basic duplicate detection
 * Server-side uses full lemmatization for accurate detection
 */
function findSimilarEntry(newWord, existingEntries) {
  const newLower = newWord.toLowerCase().trim();
  const newStem = getWordStem(newWord);

  for (const entry of existingEntries) {
    const entryLower = entry.toLowerCase().trim();
    const entryStem = getWordStem(entry);

    // Exact match
    if (newLower === entryLower) return entry;

    // Stem match
    if (newStem === entryStem) return entry;

    // Prefix check
    const shorter = newStem.length < entryStem.length ? newStem : entryStem;
    const longer = newStem.length < entryStem.length ? entryStem : newStem;

    if (shorter.length >= 3 && longer.startsWith(shorter)) {
      return entry;
    }

    // Doubled consonant handling (run/running)
    if (longer.length >= 4 && longer.length === shorter.length + 1) {
      const lastChar = longer[longer.length - 1];
      const secondLastChar = longer[longer.length - 2];
      if (lastChar === secondLastChar && /[bcdfghjklmnpqrstvwxz]/.test(lastChar)) {
        if (longer.slice(0, -1) === shorter) return entry;
      }
    }
  }

  return null;
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getWordStem, findSimilarEntry };
}

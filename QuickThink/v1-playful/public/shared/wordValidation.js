// Quick Think - Word Validation (Client-side version)
// Validates that entered words are reasonable English words/phrases

// Common keyboard patterns that indicate random typing
const KEYBOARD_PATTERNS = [
  'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
  'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
  'zxcv', 'xcvb', 'cvbn', 'vbnm',
  'qazw', 'wsxe', 'edcr', 'rfvt', 'tgby', 'yhnu', 'ujmi',
];

function hasVowel(word) {
  return /[aeiouy]/i.test(word);
}

function hasRepeatedChars(word) {
  return /(.)\1{2,}/i.test(word);
}

function hasTooManyConsonants(word) {
  const noSpaces = word.replace(/\s/g, '');
  return /[bcdfghjklmnpqrstvwxz]{5,}/i.test(noSpaces);
}

function matchesKeyboardPattern(word) {
  const lower = word.toLowerCase();
  return KEYBOARD_PATTERNS.some(pattern => lower.includes(pattern));
}

function isGibberish(word) {
  if (!word || typeof word !== 'string') return true;

  const cleaned = word.trim().toLowerCase();
  if (cleaned.length < 2) return true;

  if (matchesKeyboardPattern(cleaned)) return true;
  if (cleaned.length > 2 && !hasVowel(cleaned)) return true;
  if (hasRepeatedChars(cleaned)) return true;
  if (hasTooManyConsonants(cleaned)) return true;
  if (/^(.)\1+$/.test(cleaned)) return true;

  return false;
}

function isValidWord(input) {
  if (!input || typeof input !== 'string') return false;

  const trimmed = input.trim();
  if (trimmed.length < 2) return false;

  // Allow alphanumeric brand names (like "3M", "7up", "WD40")
  if (/^[A-Za-z0-9]+$/.test(trimmed) && /[A-Za-z]/.test(trimmed) && /\d/.test(trimmed)) {
    return true;
  }

  const words = trimmed.split(/[\s-]+/).filter(w => w.length > 0);
  if (words.length === 0) return false;

  for (const word of words) {
    const cleaned = word.replace(/'/g, '');
    if (cleaned.length <= 2) continue;
    if (/^\d+$/.test(cleaned)) continue;
    if (/\d/.test(cleaned) && /[A-Za-z]/.test(cleaned)) continue;

    if (isGibberish(cleaned)) {
      return false;
    }
  }

  const hasSubstantialWord = words.some(w => w.replace(/'/g, '').length > 2);
  if (!hasSubstantialWord) {
    return hasVowel(trimmed) || /\d/.test(trimmed);
  }

  return true;
}

// Export for use in browser
window.wordValidation = {
  isValidWord,
  isGibberish
};

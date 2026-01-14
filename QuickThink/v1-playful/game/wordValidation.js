// Quick Think - Word Validation (Server-side)
// Uses dictionary-based validation for proper word checking

const fs = require('fs');
const path = require('path');

// Load dictionary into memory as a Set for O(1) lookups
let dictionary = new Set();
let isLoaded = false;

// Allowed 2-letter words (common abbreviations and short words for party games)
const ALLOWED_SHORT_WORDS = new Set([
  'tv', 'ok', 'hi', 'no', 'go', 'up', 'ax', 'ox', 'pi',
  'dj', 'pc', 'uk', 'us', 'eu', 'un', 'ai', 'vr', 'ar',
]);

// Additional valid words not in standard dictionary (proper nouns, brands, etc.)
const ADDITIONAL_VALID_WORDS = new Set([
  // Countries
  'spain', 'france', 'germany', 'italy', 'japan', 'china', 'india', 'brazil',
  'mexico', 'canada', 'australia', 'russia', 'england', 'scotland', 'ireland',
  'netherlands', 'belgium', 'switzerland', 'austria', 'sweden', 'norway',
  'denmark', 'finland', 'poland', 'greece', 'turkey', 'egypt', 'morocco',
  'kenya', 'nigeria', 'argentina', 'chile', 'peru', 'colombia', 'venezuela',
  'thailand', 'vietnam', 'indonesia', 'malaysia', 'singapore', 'korea',
  'taiwan', 'philippines', 'pakistan', 'bangladesh', 'israel', 'dubai',
  'qatar', 'kuwait', 'jordan', 'lebanon', 'iraq', 'iran', 'afghanistan',

  // Cities
  'london', 'paris', 'rome', 'tokyo', 'beijing', 'shanghai', 'mumbai',
  'delhi', 'sydney', 'melbourne', 'toronto', 'vancouver', 'montreal',
  'berlin', 'munich', 'madrid', 'barcelona', 'milan', 'venice', 'florence',
  'amsterdam', 'brussels', 'vienna', 'prague', 'budapest', 'warsaw',
  'moscow', 'dubai', 'singapore', 'bangkok', 'seoul', 'osaka', 'kyoto',
  'cairo', 'istanbul', 'athens', 'lisbon', 'dublin', 'edinburgh', 'glasgow',

  // Foods & Brands
  'pizza', 'pasta', 'sushi', 'ramen', 'tacos', 'burrito', 'quesadilla',
  'croissant', 'baguette', 'gelato', 'tiramisu', 'lasagna', 'risotto',
  'paella', 'hummus', 'falafel', 'kebab', 'gyros', 'pho', 'bibimbap',
  'kimchi', 'tofu', 'tempura', 'teriyaki', 'wasabi', 'edamame', 'mochi',
  'mcdonalds', 'starbucks', 'subway', 'dominos', 'wendys', 'chipotle',
  'pepsi', 'cocacola', 'sprite', 'fanta', 'gatorade', 'redbull',

  // Famous People (first names often used)
  'einstein', 'newton', 'darwin', 'tesla', 'edison', 'beethoven', 'mozart',
  'picasso', 'davinci', 'shakespeare', 'hemingway', 'disney', 'spielberg',
  'beyonce', 'madonna', 'eminem', 'drake', 'rihanna', 'adele', 'shakira',
  'messi', 'ronaldo', 'jordan', 'lebron', 'federer', 'nadal', 'bolt',

  // Technology
  'google', 'facebook', 'instagram', 'twitter', 'tiktok', 'snapchat',
  'youtube', 'netflix', 'spotify', 'amazon', 'apple', 'microsoft', 'tesla',
  'uber', 'airbnb', 'zoom', 'slack', 'whatsapp', 'linkedin', 'pinterest',
  'iphone', 'ipad', 'macbook', 'android', 'samsung', 'playstation', 'xbox',
  'nintendo', 'pokemon', 'minecraft', 'fortnite', 'roblox',

  // Characters & Entertainment
  'batman', 'superman', 'spiderman', 'ironman', 'hulk', 'thor', 'loki',
  'elsa', 'moana', 'simba', 'nemo', 'shrek', 'pikachu', 'mario', 'luigi',
  'zelda', 'sonic', 'pacman', 'tetris', 'yoda', 'vader', 'gandalf', 'frodo',
  'hermione', 'dumbledore', 'voldemort', 'gryffindor', 'hogwarts',
  'disney', 'pixar', 'dreamworks', 'marvel', 'starwars',

  // Common game answers
  'tv', 'dvd', 'cd', 'pc', 'wifi', 'usb', 'hdmi', 'led', 'lcd', 'hd', 'vr',
  'ok', 'hi', 'bye', 'yes', 'no', 'yo', 'hey', 'wow', 'yay', 'ugh', 'hmm',
]);

/**
 * Load the dictionary from file
 */
function loadDictionary() {
  if (isLoaded) return;

  try {
    const dictPath = path.join(__dirname, '..', 'data', 'dictionary.txt');
    const words = fs.readFileSync(dictPath, 'utf-8').split('\n');

    words.forEach(word => {
      const trimmed = word.trim().toLowerCase();
      if (trimmed.length >= 2) {
        dictionary.add(trimmed);
      }
    });

    // Add our additional words
    ADDITIONAL_VALID_WORDS.forEach(word => dictionary.add(word));

    isLoaded = true;
    console.log(`Dictionary loaded: ${dictionary.size} words`);
  } catch (err) {
    console.error('Failed to load dictionary:', err.message);
    // Fall back to just the additional words
    dictionary = new Set(ADDITIONAL_VALID_WORDS);
    isLoaded = true;
  }
}

/**
 * Check if a single word is in the dictionary
 * @param {string} word - Word to check
 * @returns {boolean}
 */
function isInDictionary(word) {
  if (!isLoaded) loadDictionary();
  return dictionary.has(word.toLowerCase().trim());
}

/**
 * Validate a word/phrase as a valid answer
 * @param {string} input - User input to validate
 * @returns {{ valid: boolean, reason?: string }}
 */
function isValidWord(input) {
  if (!isLoaded) loadDictionary();

  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'Empty input' };
  }

  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Allow short alphanumeric brand names (like "3M", "7up", "WD40")
  if (/^[A-Za-z0-9]+$/.test(trimmed) && /[A-Za-z]/.test(trimmed) && /\d/.test(trimmed)) {
    return { valid: true };
  }

  // Allow specific 2-letter words
  if (trimmed.length === 2 && ALLOWED_SHORT_WORDS.has(lower)) {
    return { valid: true };
  }

  if (trimmed.length < 3) {
    return { valid: false, reason: 'Too short (min 3 characters)' };
  }

  // Handle multi-word answers (e.g., "New York", "ice cream")
  // Split by spaces and hyphens
  const words = trimmed.toLowerCase()
    .split(/[\s\-]+/)
    .map(w => w.replace(/['']/g, '')) // Remove apostrophes
    .filter(w => w.length > 0);

  if (words.length === 0) {
    return { valid: false, reason: 'No valid words' };
  }

  // For multi-word answers, at least one substantial word must be valid
  let hasValidWord = false;
  let allWordsValid = true;

  for (const word of words) {
    // Skip very short words (articles, prepositions like "a", "of", "to")
    if (word.length <= 2) continue;

    // Skip pure numbers
    if (/^\d+$/.test(word)) continue;

    if (isInDictionary(word)) {
      hasValidWord = true;
    } else {
      allWordsValid = false;
    }
  }

  // For single word answers, it must be in dictionary
  if (words.length === 1 || words.filter(w => w.length > 2).length === 1) {
    const mainWord = words.find(w => w.length > 2) || words[0];
    if (!isInDictionary(mainWord)) {
      return { valid: false, reason: 'Word not recognized' };
    }
    return { valid: true };
  }

  // For multi-word answers, at least one word must be valid
  if (hasValidWord) {
    return { valid: true };
  }

  return { valid: false, reason: 'No recognized words' };
}

/**
 * Legacy function for backward compatibility
 */
function hasVowel(word) {
  return /[aeiouy]/i.test(word);
}

function hasRepeatedChars(word) {
  return /(.)\1{2,}/i.test(word);
}

function hasTooManyConsonants(word) {
  return /[bcdfghjklmnpqrstvwxz]{5,}/i.test(word);
}

function isGibberish(word) {
  const result = isValidWord(word);
  return !result.valid;
}

module.exports = {
  loadDictionary,
  isInDictionary,
  isValidWord,
  // Legacy exports for test compatibility
  hasVowel,
  hasRepeatedChars,
  hasTooManyConsonants,
  isGibberish
};

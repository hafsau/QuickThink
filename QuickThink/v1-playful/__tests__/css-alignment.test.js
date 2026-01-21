/**
 * CSS Alignment Tests
 * TDD approach: These tests define expected alignment behavior
 */

const fs = require('fs');
const path = require('path');

// Helper to extract CSS rules for a selector
function extractCSSRules(cssContent, selector) {
  // Escape special regex characters in selector
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, 'g');
  const matches = [];
  let match;
  while ((match = regex.exec(cssContent)) !== null) {
    matches.push(match[1].trim());
  }
  return matches.join('\n');
}

// Helper to check if a CSS property exists with expected value
function hasCSSProperty(rules, property, expectedValue = null) {
  const propRegex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
  const match = rules.match(propRegex);
  if (!match) return false;
  if (expectedValue === null) return true;
  return match[1].trim().includes(expectedValue);
}

describe('TV Settings Panel Alignment', () => {
  let tvStyles;

  beforeAll(() => {
    tvStyles = fs.readFileSync(
      path.join(__dirname, '../public/tv/styles.css'),
      'utf8'
    );
  });

  test('settings-option should use flexbox with space-between', () => {
    const rules = extractCSSRules(tvStyles, '.settings-option');
    expect(hasCSSProperty(rules, 'display', 'flex')).toBe(true);
    expect(hasCSSProperty(rules, 'justify-content', 'space-between')).toBe(true);
    expect(hasCSSProperty(rules, 'align-items', 'center')).toBe(true);
  });

  test('settings-option should have consistent width', () => {
    const rules = extractCSSRules(tvStyles, '.settings-option');
    expect(hasCSSProperty(rules, 'width', '100%')).toBe(true);
  });

  test('timer-options should not wrap and stay aligned right', () => {
    const rules = extractCSSRules(tvStyles, '.timer-options');
    expect(hasCSSProperty(rules, 'display', 'flex')).toBe(true);
    expect(hasCSSProperty(rules, 'flex-shrink', '0')).toBe(true);
  });

  test('settings-option label should not shrink', () => {
    const rules = extractCSSRules(tvStyles, '.settings-option label');
    expect(hasCSSProperty(rules, 'flex-shrink', '0')).toBe(true);
  });
});

describe('Controller Settings Panel Alignment', () => {
  let controllerStyles;

  beforeAll(() => {
    controllerStyles = fs.readFileSync(
      path.join(__dirname, '../public/controller/styles.css'),
      'utf8'
    );
  });

  test('settings-option should use flexbox with space-between', () => {
    const rules = extractCSSRules(controllerStyles, '.settings-option');
    expect(hasCSSProperty(rules, 'display', 'flex')).toBe(true);
    expect(hasCSSProperty(rules, 'justify-content', 'space-between')).toBe(true);
    expect(hasCSSProperty(rules, 'align-items', 'center')).toBe(true);
  });

  test('settings-option should have consistent width', () => {
    const rules = extractCSSRules(controllerStyles, '.settings-option');
    expect(hasCSSProperty(rules, 'width', '100%')).toBe(true);
  });

  test('timer-options should not wrap and stay aligned right', () => {
    const rules = extractCSSRules(controllerStyles, '.timer-options');
    expect(hasCSSProperty(rules, 'display', 'flex')).toBe(true);
    expect(hasCSSProperty(rules, 'flex-shrink', '0')).toBe(true);
  });

  test('settings-option label should not shrink', () => {
    const rules = extractCSSRules(controllerStyles, '.settings-option label');
    expect(hasCSSProperty(rules, 'flex-shrink', '0')).toBe(true);
  });
});

describe('General Text Alignment Consistency', () => {
  let tvStyles;
  let controllerStyles;

  beforeAll(() => {
    tvStyles = fs.readFileSync(
      path.join(__dirname, '../public/tv/styles.css'),
      'utf8'
    );
    controllerStyles = fs.readFileSync(
      path.join(__dirname, '../public/controller/styles.css'),
      'utf8'
    );
  });

  test('TV game-title should be centered', () => {
    const rules = extractCSSRules(tvStyles, '.game-title');
    expect(hasCSSProperty(rules, 'text-align', 'center')).toBe(true);
  });

  test('TV lobby-header should be centered', () => {
    const rules = extractCSSRules(tvStyles, '.lobby-header');
    expect(hasCSSProperty(rules, 'text-align', 'center')).toBe(true);
  });

  test('TV category-text should be centered', () => {
    const rules = extractCSSRules(tvStyles, '.category-text');
    expect(hasCSSProperty(rules, 'text-align', 'center')).toBe(true);
  });

  test('Controller join-content should be centered', () => {
    const rules = extractCSSRules(controllerStyles, '.join-content');
    expect(hasCSSProperty(rules, 'text-align', 'center')).toBe(true);
  });

  test('Controller waiting-content should be centered', () => {
    const rules = extractCSSRules(controllerStyles, '.waiting-content');
    expect(hasCSSProperty(rules, 'text-align', 'center')).toBe(true);
  });
});

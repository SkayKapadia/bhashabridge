import { describe, expect, it } from 'vitest';
import { looksLikeCodeLine } from '../../src/parser/codeLine';

describe('looksLikeCodeLine', () => {
  it.each([
    'const names = users.map(getName);',
    'let total = 0;',
    'if (!users) {',
    '});',
    '}',
    'x = 5',
    'items += 1',
    'console.log(names)',
    'return users.filter(isActive);',
    'import os',
    'from typing import List',
    'def get_name(user):',
    'class UserService:',
  ])('treats %j as code', line => {
    expect(looksLikeCodeLine(line)).toBe(true);
  });

  it.each([
    '',
    'The function fails because users is undefined.',
    'Add a check before calling map.',
    'Set the value to 5.',
    'Return the list when it is empty',
    'Call map(getName) on the array, then return the result.',
    'If you want, you can import the file later:',
    'For each user, check the name first.',
    'Note: this runs after render',
    'Use a function to wrap it.',
  ])('treats %j as prose', line => {
    expect(looksLikeCodeLine(line)).toBe(false);
  });
});

/**
 * regexHelper.js — Security utility to prevent ReDoS and Regex Injection
 * Escapes all regular expression metacharacters from user input strings.
 */

export const escapeRegex = (str = '') => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

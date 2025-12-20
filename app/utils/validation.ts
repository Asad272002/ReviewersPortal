/**
 * Input validation utilities to prevent formula injection and other security issues
 */

// Patterns that could indicate formula injection attempts
const FORMULA_PATTERNS = [
  /^[\s]*=/,           // Starts with equals sign
  /^[\s]*\+/,          // Starts with plus sign
  /^[\s]*-/,           // Starts with minus sign
  /^[\s]*@/,           // Starts with @ symbol
  /^[\s]*\|/,          // Starts with pipe symbol
  /^[\s]*\*/,          // Starts with asterisk
  /^[\s]*\^/,          // Starts with caret
  /^[\s]*%/,           // Starts with percent
  /^[\s]*&/,           // Starts with ampersand
  /^[\s]*\$/,          // Starts with dollar sign
  /^[\s]*#/,           // Starts with hash
  /^[\s]*!/,           // Starts with exclamation
  /^[\s]*~/,           // Starts with tilde
  /^[\s]*`/,           // Starts with backtick
];

// Common spreadsheet functions that could be dangerous
const DANGEROUS_FUNCTIONS = [
  'HYPERLINK',
  'IMPORTXML',
  'IMPORTHTML',
  'IMPORTDATA',
  'IMPORTRANGE',
  'IMPORTFEED',
  'QUERY',
  'GOOGLETRANSLATE',
  'WEBSERVICE',
  'ENCODEURL',
  'REGEXEXTRACT',
  'REGEXMATCH',
  'REGEXREPLACE',
];

/**
 * Validates input to prevent formula injection attacks
 * @param value - The input value to validate
 * @param fieldName - The name of the field being validated (for error messages)
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateInput(value: string, fieldName: string = 'Input', options: { allowFormulas?: boolean } = {}): { isValid: boolean; error?: string } {
  if (!value || typeof value !== 'string') {
    return { isValid: true }; // Empty or non-string values are safe
  }

  // Check for formula patterns (unless allowed)
  if (!options.allowFormulas) {
    for (const pattern of FORMULA_PATTERNS) {
      if (pattern.test(value)) {
        return {
          isValid: false,
          error: `${fieldName} cannot start with formula characters (=, +, -, @, etc.)`
        };
      }
    }

    // Check for dangerous functions
    // Commented out as it causes false positives for common words like "QUERY" or "HYPERLINK" in normal text.
    // The FORMULA_PATTERNS check above is sufficient to prevent formula injection.
    /*
    const upperValue = value.toUpperCase();
    for (const func of DANGEROUS_FUNCTIONS) {
      if (upperValue.includes(func)) {
        return {
          isValid: false,
          error: `${fieldName} contains potentially dangerous content`
        };
      }
    }
    */
  }

  return { isValid: true };
}

/**
 * Sanitizes input by removing or escaping potentially dangerous characters
 * @param value - The input value to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // If it starts with formula characters, prepend with single quote to make it literal
  for (const pattern of FORMULA_PATTERNS) {
    if (pattern.test(value)) {
      return `'${value}`;
    }
  }

  return value;
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return validateInput(email, 'Email');
}

/**
 * Validates URL format
 * @param url - URL to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateUrl(url: string, options: { allowFormulas?: boolean } = {}): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: true }; // URLs are often optional
  }
  
  try {
    new URL(url);
    return validateInput(url, 'URL', options);
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
}

/**
 * Validates required text fields
 * @param value - Value to validate
 * @param fieldName - Name of the field
 * @param minLength - Minimum length (default: 1)
 * @param maxLength - Maximum length (default: 1000)
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateRequiredText(
  value: string, 
  fieldName: string, 
  minLength: number = 1, 
  maxLength: number = 1000,
  options: { allowFormulas?: boolean } = {}
): { isValid: boolean; error?: string } {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (value.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters long` };
  }
  
  if (value.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be no more than ${maxLength} characters long` };
  }
  
  return validateInput(value, fieldName, options);
}

/**
 * Validates numeric input
 * @param value - Value to validate
 * @param fieldName - Name of the field
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateNumber(
  value: string | number, 
  fieldName: string, 
  min?: number, 
  max?: number
): { isValid: boolean; error?: string } {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `${fieldName} must be no more than ${max}` };
  }
  
  return { isValid: true };
}
import { useState, useCallback, useMemo } from 'react';
import { sanitizeInput, sanitizeEmail, sanitizeUrl, validators } from '../utils/sanitization';

export interface SafeInputOptions {
  type?: 'text' | 'email' | 'url' | 'search' | 'password';
  maxLength?: number;
  allowHtml?: boolean;
  trimWhitespace?: boolean;
  validate?: boolean;
  required?: boolean;
  customValidator?: (value: string) => boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export interface SafeInputState {
  value: string;
  sanitizedValue: string;
  originalValue: string;
  isValid: boolean;
  hasBeenModified: boolean;
  validationMessage: string;
}

/**
 * Custom hook for safe input handling with automatic sanitization and validation
 */
export function useSafeInput(
  initialValue: string = '',
  options: SafeInputOptions = {}
): [
  SafeInputState,
  {
    setValue: (value: string) => void;
    reset: () => void;
    validate: () => boolean;
    getSanitizedValue: () => string;
  }
] {
  const {
    type = 'text',
    maxLength,
    allowHtml = false,
    trimWhitespace = true,
    validate: enableValidation = true,
    required = false,
    customValidator,
    onValidationChange
  } = options;

  const [state, setState] = useState<SafeInputState>(() => {
    const sanitized = sanitizeValue(initialValue, type, { maxLength, allowHtml, trimWhitespace });
    const isValid = enableValidation ? validateValue(sanitized, type, { required, customValidator }) : true;
    
    return {
      value: sanitized,
      sanitizedValue: sanitized,
      originalValue: initialValue,
      isValid,
      hasBeenModified: false,
      validationMessage: isValid ? '' : getValidationMessage(sanitized, type, { required })
    };
  });

  const setValue = useCallback((newValue: string) => {
    const sanitized = sanitizeValue(newValue, type, { maxLength, allowHtml, trimWhitespace });
    const isValid = enableValidation ? validateValue(sanitized, type, { required, customValidator }) : true;
    const validationMessage = isValid ? '' : getValidationMessage(sanitized, type, { required });
    
    setState(prev => ({
      value: sanitized,
      sanitizedValue: sanitized,
      originalValue: newValue,
      isValid,
      hasBeenModified: prev.originalValue !== newValue || prev.hasBeenModified,
      validationMessage
    }));

    // Notify validation change if handler provided
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [type, maxLength, allowHtml, trimWhitespace, enableValidation, required, customValidator, onValidationChange]);

  const reset = useCallback(() => {
    const sanitized = sanitizeValue(initialValue, type, { maxLength, allowHtml, trimWhitespace });
    const isValid = enableValidation ? validateValue(sanitized, type, { required, customValidator }) : true;
    
    setState({
      value: sanitized,
      sanitizedValue: sanitized,
      originalValue: initialValue,
      isValid,
      hasBeenModified: false,
      validationMessage: isValid ? '' : getValidationMessage(sanitized, type, { required })
    });
  }, [initialValue, type, maxLength, allowHtml, trimWhitespace, enableValidation, required, customValidator]);

  const validateCurrent = useCallback(() => {
    const isValid = validateValue(state.sanitizedValue, type, { required, customValidator });
    const validationMessage = isValid ? '' : getValidationMessage(state.sanitizedValue, type, { required });
    
    setState(prev => ({
      ...prev,
      isValid,
      validationMessage
    }));

    if (onValidationChange) {
      onValidationChange(isValid);
    }

    return isValid;
  }, [state.sanitizedValue, type, required, customValidator, onValidationChange]);

  const getSanitizedValue = useCallback(() => {
    return state.sanitizedValue;
  }, [state.sanitizedValue]);

  const actions = useMemo(() => ({
    setValue,
    reset,
    validate: validateCurrent,
    getSanitizedValue
  }), [setValue, reset, validateCurrent, getSanitizedValue]);

  return [state, actions];
}

/**
 * Sanitizes input based on type
 */
function sanitizeValue(
  value: string, 
  type: SafeInputOptions['type'], 
  options: { maxLength?: number; allowHtml?: boolean; trimWhitespace?: boolean }
): string {
  switch (type) {
    case 'email':
      return sanitizeEmail(value);
    case 'url':
      return sanitizeUrl(value);
    case 'search':
      return sanitizeInput(value, { ...options, allowHtml: false });
    case 'password':
      return sanitizeInput(value, { ...options, allowHtml: false, trimWhitespace: false });
    default:
      return sanitizeInput(value, options);
  }
}

/**
 * Validates input based on type and constraints
 */
function validateValue(
  value: string,
  type: SafeInputOptions['type'],
  constraints: { required?: boolean; customValidator?: (value: string) => boolean }
): boolean {
  const { required, customValidator } = constraints;

  // Check required constraint
  if (required && (!value || value.trim().length === 0)) {
    return false;
  }

  // If empty and not required, consider valid
  if (!value || value.trim().length === 0) {
    return true;
  }

  // Type-specific validation
  switch (type) {
    case 'email':
      if (!validators.email(value)) return false;
      break;
    case 'url':
      if (!validators.url(value)) return false;
      break;
    case 'password':
      // Only validate strength if value is provided
      if (value && !validators.strongPassword(value)) return false;
      break;
  }

  // Custom validation
  if (customValidator && !customValidator(value)) {
    return false;
  }

  return true;
}

/**
 * Gets appropriate validation message
 */
function getValidationMessage(
  value: string,
  type: SafeInputOptions['type'],
  constraints: { required?: boolean }
): string {
  const { required } = constraints;

  if (required && (!value || value.trim().length === 0)) {
    return 'This field is required';
  }

  if (!value || value.trim().length === 0) {
    return '';
  }

  switch (type) {
    case 'email':
      return validators.email(value) ? '' : 'Please enter a valid email address';
    case 'url':
      return validators.url(value) ? '' : 'Please enter a valid URL';
    case 'password':
      return validators.strongPassword(value) 
        ? '' 
        : 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    default:
      return '';
  }
}
'use client';

import React, { forwardRef } from 'react';
import { useSafeInput, SafeInputOptions } from '../../hooks/useSafeInput';
import { Input } from './Input';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface SafeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helpText?: string;
  safeInputOptions?: SafeInputOptions;
  onSafeChange?: (value: string, isValid: boolean) => void;
  showValidationIcon?: boolean;
  showValidationMessage?: boolean;
  initialValue?: string;
}

const SafeInput = forwardRef<HTMLInputElement, SafeInputProps>(({
  label,
  error,
  helpText,
  safeInputOptions = {},
  onSafeChange,
  showValidationIcon = true,
  showValidationMessage = true,
  initialValue = '',
  className = '',
  ...props
}, ref) => {
  const [inputState, { setValue }] = useSafeInput(initialValue, {
    ...safeInputOptions,
    onValidationChange: (isValid) => {
      if (onSafeChange) {
        onSafeChange(inputState.sanitizedValue, isValid);
      }
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (onSafeChange) {
      // Note: validation will be called asynchronously via onValidationChange
      onSafeChange(newValue, inputState.isValid);
    }
  };

  const hasError = error || (!inputState.isValid && showValidationMessage && inputState.hasBeenModified);
  const errorMessage = error || (showValidationMessage && inputState.hasBeenModified ? inputState.validationMessage : '');

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {safeInputOptions.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <Input
          ref={ref}
          value={inputState.value}
          onChange={handleChange}
          className={`${className} ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${
            showValidationIcon && inputState.hasBeenModified ? 'pr-10' : ''
          }`}
          {...props}
        />
        
        {showValidationIcon && inputState.hasBeenModified && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {inputState.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && errorMessage && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMessage}
        </p>
      )}

      {/* Help text */}
      {!hasError && helpText && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}

      {/* Character count for inputs with maxLength */}
      {safeInputOptions.maxLength && (
        <p className="text-xs text-gray-400 text-right">
          {inputState.value.length} / {safeInputOptions.maxLength}
        </p>
      )}
    </div>
  );
});

SafeInput.displayName = 'SafeInput';

export default SafeInput;
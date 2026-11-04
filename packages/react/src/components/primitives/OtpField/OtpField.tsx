// Copyright 2024 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix, bem} from '@thunderid/browser';
import {
  ClipboardEvent,
  FC,
  KeyboardEvent,
  ChangeEvent,
  MutableRefObject,
  useRef,
  useEffect,
  useState,
  CSSProperties,
  Fragment,
  useId,
} from 'react';
import useStyles from './OtpField.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import {cx} from '../../../styles/emotion';
import FormControl from '../FormControl/FormControl';
import InputLabel from '../InputLabel/InputLabel';

export type OtpFieldType = 'text' | 'number' | 'password';

export interface OtpInputProps {
  /**
   * Auto focus the first input on mount
   */
  autoFocus?: boolean;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Error message to display below the OTP input
   */
  error?: string;
  /**
   * Helper text to display below the OTP input
   */
  helperText?: string;
  /**
   * Label text to display above the OTP input
   */
  label?: string;
  /**
   * Number of OTP input fields
   */
  length?: number;
  /**
   * Add a visual separator after this many characters without including it in the field value.
   */
  separatorAfter?: number;
  /**
   * Callback function called when OTP value changes
   */
  onChange?: (event: {target: {value: string}}) => void;
  /**
   * Callback function called when OTP input is complete
   */
  onComplete?: (value: string) => void;
  /**
   * Pattern for numeric input validation
   */
  pattern?: string;
  /**
   * Placeholder character for each input field
   */
  placeholder?: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Custom container style
   */
  style?: CSSProperties;
  /**
   * Type of input (text, number, password)
   */
  type?: OtpFieldType;
  /**
   * Upper-case entered characters before emitting them
   */
  uppercase?: boolean;
  /**
   * Current OTP value
   */
  value?: string;
}

const OtpField: FC<OtpInputProps> = ({
  label,
  error,
  className,
  required,
  disabled,
  helperText,
  length = 6,
  separatorAfter,
  value = '',
  onChange,
  onComplete,
  type = 'text',
  placeholder = '',
  style = {},
  autoFocus = false,
  pattern,
  uppercase = false,
}: OtpInputProps) => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme, !!disabled, !!error, length, separatorAfter);
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs: MutableRefObject<HTMLInputElement[]> = useRef<HTMLInputElement[]>([]);
  const fieldId: string = useId();
  const labelId = `${fieldId}-label`;
  const helperTextId: string | undefined = error || helperText ? `${fieldId}-helper-text` : undefined;

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  useEffect(() => {
    if (value) {
      const newOtp: string[] = value.split('').slice(0, length);
      while (newOtp.length < length) {
        newOtp.push('');
      }
      setOtp(newOtp);
    } else {
      setOtp(Array(length).fill(''));
    }
  }, [value, length]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>): void => {
    const newValue: string = uppercase ? event.target.value.toUpperCase() : event.target.value;

    if (newValue.length > 1) return;

    if (type === 'number' && newValue && !/^\d$/.test(newValue)) return;

    if (pattern && newValue && !new RegExp(pattern).test(newValue)) return;

    const newOtp: string[] = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);

    const otpValue: string = newOtp.join('');

    onChange?.({target: {value: otpValue}});

    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit: string) => digit !== '') && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp: string[] = [...otp];

        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
        onChange?.({target: {value: newOtp.join('')}});
      } else if (otp[index]) {
        const newOtp: string[] = [...otp];

        newOtp[index] = '';
        setOtp(newOtp);
        onChange?.({target: {value: newOtp.join('')}});
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();

      if (otp.every((digit: string) => digit !== '') && onComplete) {
        onComplete(otp.join(''));
      }
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>): void => {
    event.preventDefault();

    const rawData: string = event.clipboardData.getData('text');
    // Filter first and let the copy loop below bound the result, so surrounding text such as
    // "Your code is 123456" does not push the code itself past the cut-off.
    const normalizedData: string = separatorAfter ? rawData.replace(/[-\s]/g, '') : rawData;
    const pastedData: string = uppercase ? normalizedData.toUpperCase() : normalizedData;

    let validData = '';

    Array.from(pastedData).forEach((char: string) => {
      if (type === 'number' && !/^\d$/.test(char)) return;
      if (pattern && !new RegExp(pattern).test(char)) return;
      validData += char;
    });

    const newOtp: string[] = Array(length).fill('');

    for (let i = 0; i < Math.min(validData.length, length); i += 1) {
      newOtp[i] = validData[i];
    }

    setOtp(newOtp);
    onChange?.({target: {value: newOtp.join('')}});

    const nextEmptyIndex: number = newOtp.findIndex((digit: string) => digit === '');
    const focusIndex: number = nextEmptyIndex !== -1 ? nextEmptyIndex : length - 1;

    inputRefs.current[focusIndex]?.focus();

    if (newOtp.every((digit: string) => digit !== '') && onComplete) {
      onComplete(newOtp.join(''));
    }
  };

  return (
    <FormControl
      error={error}
      helperText={helperText}
      helperTextId={helperTextId}
      className={cx(withVendorCSSClassPrefix(bem('otp-field')), className)}
      helperTextAlign="center"
      style={style}
    >
      {label && (
        <InputLabel id={labelId} required={required} error={!!error}>
          {label}
        </InputLabel>
      )}
      <div
        role="group"
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={helperTextId}
        className={cx(withVendorCSSClassPrefix(bem('otp-field', 'input-container')), styles['inputContainer'])}
      >
        {Array.from({length}, (_: unknown, index: number) => (
          <Fragment key={index}>
            <input
              ref={(el: HTMLInputElement | null): void => {
                if (el) inputRefs.current[index] = el;
              }}
              type={type === 'password' ? 'password' : 'text'}
              inputMode={type === 'number' ? 'numeric' : 'text'}
              value={otp[index] || ''}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => handleChange(index, event)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>): void => handleKeyDown(index, event)}
              onPaste={handlePaste}
              className={cx(withVendorCSSClassPrefix(bem('otp-field', 'input')), styles['input'], {
                [withVendorCSSClassPrefix(bem('otp-field', 'input', 'error'))]: !!error,
                [styles['inputError']]: !!error,
                [withVendorCSSClassPrefix(bem('otp-field', 'input', 'disabled'))]: !!disabled,
                [styles['inputDisabled']]: !!disabled,
              })}
              maxLength={1}
              placeholder={placeholder}
              disabled={disabled}
              aria-label={`${label || 'OTP'} digit ${index + 1}`}
              aria-invalid={!!error}
              aria-required={required}
              aria-describedby={helperTextId}
              autoComplete="one-time-code"
            />
            {separatorAfter === index + 1 && (
              <span
                className={cx(withVendorCSSClassPrefix(bem('otp-field', 'separator')), styles['separator'])}
                aria-hidden="true"
              >
                -
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </FormControl>
  );
};

export default OtpField;

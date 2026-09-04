// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix, bem} from '@thunderid/browser';
import {ChangeEvent, FC, SVGProps, useState} from 'react';
import useStyles from './PasswordField.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import {cx} from '../../../styles/emotion';
import Eye from '../Icons/Eye';
import EyeOff from '../Icons/EyeOff';
import TextField, {TextFieldProps} from '../TextField/TextField';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'endIcon' | 'onEndIconClick' | 'onChange'> {
  /**
   * The browser autofill hint. Defaults to `current-password`; set `new-password` on the
   * fields of a change-password or sign-up form so password managers offer to generate and
   * store a new credential instead of filling the existing one.
   */
  autoComplete?: string;
  /**
   * Callback function when the field value changes
   */
  onChange: (value: string) => void;
}

/**
 * Password field component with show/hide toggle functionality.
 * This component extends TextField and adds password visibility toggle functionality.
 */
const PasswordField: FC<PasswordFieldProps> = ({
  autoComplete = 'current-password',
  onChange,
  className,
  disabled,
  error,
  ...textFieldProps
}: PasswordFieldProps) => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const styles: Record<string, string> = useStyles(theme, colorScheme, showPassword, !!disabled, !!error);

  const togglePasswordVisibility = (): void => {
    if (!disabled) {
      setShowPassword(!showPassword);
    }
  };

  const IconComponent: FC<SVGProps<SVGSVGElement>> = showPassword ? EyeOff : Eye;

  return (
    <TextField
      {...textFieldProps}
      className={cx(withVendorCSSClassPrefix(bem('password-field')), className)}
      type={showPassword ? 'text' : 'password'}
      onChange={(e: ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
      autoComplete={autoComplete}
      disabled={disabled}
      error={error}
      endIcon={
        <IconComponent
          width={16}
          height={16}
          className={cx(
            withVendorCSSClassPrefix(bem('password-field', 'toggle-icon')),
            styles['toggleIcon'],
            showPassword ? styles['visibleIcon'] : styles['hiddenIcon'],
          )}
        />
      }
      onEndIconClick={togglePasswordVisibility}
    />
  );
};

export default PasswordField;

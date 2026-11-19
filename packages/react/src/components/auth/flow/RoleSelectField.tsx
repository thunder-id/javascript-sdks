// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleOption, bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {ChangeEvent, FC, ReactElement} from 'react';
import useStyles from './RoleSelectField.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import {cx} from '../../../styles/emotion';
import Checkbox from '../../primitives/Checkbox/Checkbox';
import FormControl from '../../primitives/FormControl/FormControl';
import InputLabel from '../../primitives/InputLabel/InputLabel';
import Typography from '../../primitives/Typography/Typography';

/**
 * Props for {@link RoleSelectField}.
 */
export interface RoleSelectFieldProps {
  /** Accessible name of the group when the step gives it no label. */
  ariaLabel: string;
  className?: string;
  /** The element's flow identifier, set by the flow renderer. */
  'data-testid'?: string;
  /** Shown when the step offers no roles. */
  emptyText: string;
  error?: string;
  id: string;
  label?: string;
  /** The input's identifier in the step, `roles`. */
  name: string;
  onBlur?: () => void;
  /** Called with the selected role IDs, space-separated, as the step takes them. */
  onChange: (value: string) => void;
  required?: boolean;
  /** The roles the step offers. */
  roles: RoleOption[];
  /** The selected role IDs, space-separated. */
  value: string;
}

/**
 * The multiple-choice picker a `ROLE_SELECT` step draws: one checkbox per role it offers, submitted as the
 * space-separated IDs of the roles picked.
 */
const RoleSelectField: FC<RoleSelectFieldProps> = ({
  ariaLabel,
  className,
  'data-testid': testId,
  emptyText,
  error,
  id,
  label,
  name,
  onBlur,
  onChange,
  required,
  roles,
  value,
}: RoleSelectFieldProps): ReactElement => {
  const {theme} = useTheme();
  const styles: Record<string, string> = useStyles(theme);
  const selected: string[] = value.split(/\s+/).filter(Boolean);
  const legendId = `${id}-label`;

  const toggle = (roleId: string, checked: boolean): void => {
    const next: string[] = selected.filter((s: string) => s !== roleId);
    onChange((checked ? [...next, roleId] : next).join(' '));
    onBlur?.();
  };

  return (
    <FormControl error={error} className={cx(withVendorCSSClassPrefix(bem('role-select')), className)}>
      <fieldset
        id={id}
        className={styles['fieldset']}
        data-testid={testId}
        aria-labelledby={label ? legendId : undefined}
        aria-label={label ? undefined : ariaLabel}
        aria-required={required}
        aria-invalid={!!error}
      >
        {label && (
          <legend id={legendId} className={styles['legend']}>
            <InputLabel required={required} error={!!error}>
              {label}
            </InputLabel>
          </legend>
        )}
        {roles.length === 0 ? (
          <Typography variant="body2">{emptyText}</Typography>
        ) : (
          <div className={cx(withVendorCSSClassPrefix(bem('role-select', 'options')), styles['options'])}>
            {roles.map((role: RoleOption) => (
              <Checkbox
                key={role.id}
                id={`${id}-${role.id}`}
                name={`${name}-${role.id}`}
                value={role.id}
                label={role.name}
                checked={selected.includes(role.id)}
                onChange={(event: ChangeEvent<HTMLInputElement>): void => toggle(role.id, event.target.checked)}
              />
            ))}
          </div>
        )}
      </fieldset>
    </FormControl>
  );
};

export default RoleSelectField;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  FlowVariableDefinition,
  FlowVariableValue,
  SelectOption,
  bem,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {ChangeEvent, FC, ReactElement, ReactNode, useId} from 'react';
import useStyles from './FlowVariables.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import Select from '../../primitives/Select/Select';
import TextField from '../../primitives/TextField/TextField';
import Toggle from '../../primitives/Toggle/Toggle';

export interface FlowVariableFieldProps {
  /**
   * Extra content at the end of the label row, such as a control a host adds while the variable is being designed.
   */
  action?: ReactNode;
  className?: string;
  /**
   * The value the variable has until the unit sets its own, which a sharing policy may have set.
   */
  defaultValue?: FlowVariableValue;
  definition: FlowVariableDefinition;
  disabled?: boolean;
  /**
   * Whether the unit may set its own value. A variable it may not set is shown as set by its owner.
   * @default true
   */
  editable?: boolean;
  /**
   * The error to show under the field.
   */
  error?: string;
  /**
   * Extra text under the input, such as where the choices come from.
   */
  hint?: ReactNode;
  onChange: (value: FlowVariableValue) => void;
  /**
   * The choices of a `SELECT` or `CONNECTION_SELECT`, as {@link getFlowVariableOptions} returns them.
   */
  options?: SelectOption[];
  /**
   * Who set the variable, shown while it is not editable.
   */
  ownerName?: string;
  value: FlowVariableValue | undefined;
}

const INPUT_TYPES: Partial<Record<FlowVariableDefinition['type'], string>> = {
  DATE_INPUT: 'date',
  EMAIL_INPUT: 'email',
  NUMBER_INPUT: 'number',
  PHONE_INPUT: 'tel',
  TEXT_INPUT: 'text',
};

/**
 * One variable as the delegated admin sees it, in a card: its label and description, whether it is customized
 * or follows the default, the input its type calls for, and what the default is. A variable the unit may not set
 * is shown as set by its owner.
 */
const FlowVariableField: FC<FlowVariableFieldProps> = ({
  action,
  className,
  defaultValue,
  definition,
  disabled,
  editable = true,
  error,
  hint,
  onChange,
  options = [],
  ownerName,
  value,
}: FlowVariableFieldProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation();
  const id: string = useId();
  const descriptionId: string | undefined = definition.description ? `${id}-description` : undefined;
  const label: string = definition.label ?? definition.identifier;
  const isSelect: boolean = definition.type === 'SELECT' || definition.type === 'CONNECTION_SELECT';
  const isDefault: boolean = value === defaultValue;

  const display = (shown: FlowVariableValue | undefined): string => {
    if (shown === undefined) {
      return '';
    }
    if (typeof shown === 'boolean') {
      return t(shown ? 'admin.flowVariables.on' : 'admin.flowVariables.off');
    }

    return isSelect
      ? (options.find((option: SelectOption) => String(option.value) === String(shown))?.label ?? String(shown))
      : String(shown);
  };

  const renderControl = (): ReactElement => {
    switch (definition.type) {
      case 'BOOLEAN_INPUT':
        return (
          <Toggle
            id={id}
            aria-label={label}
            aria-describedby={descriptionId}
            checked={value === true}
            disabled={disabled === true || !editable}
            error={error}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => onChange(event.target.checked)}
          />
        );
      case 'SELECT':
      case 'CONNECTION_SELECT': {
        const handleSelect = (event: ChangeEvent<HTMLSelectElement>): void => {
          const chosen: FlowVariableValue | undefined = (definition.options ?? []).find(
            (option: FlowVariableValue) => String(option) === event.target.value,
          );

          // The first entry, the default, clears the choice.
          onChange(
            event.target.value === '' && defaultValue !== undefined ? defaultValue : (chosen ?? event.target.value),
          );
        };

        return (
          <Select
            id={id}
            aria-label={label}
            aria-describedby={descriptionId}
            disabled={disabled}
            emptyText={t('admin.flowVariables.no_options')}
            error={error}
            options={options}
            placeholder={
              defaultValue === undefined || defaultValue === ''
                ? t('admin.flowVariables.select_placeholder')
                : t('admin.flowVariables.use_default', {default: display(defaultValue)})
            }
            value={isDefault || value === undefined ? '' : String(value)}
            onChange={handleSelect}
          />
        );
      }
      default:
        return (
          <TextField
            id={id}
            aria-label={label}
            aria-describedby={descriptionId}
            disabled={disabled}
            error={error}
            max={definition.max}
            min={definition.min}
            placeholder={
              defaultValue === undefined || defaultValue === ''
                ? t('admin.flowVariables.enter_value')
                : display(defaultValue)
            }
            type={INPUT_TYPES[definition.type] ?? 'text'}
            value={value === undefined ? '' : String(value)}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              const raw: string = event.target.value;

              onChange(
                definition.type === 'NUMBER_INPUT' && raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : raw,
              );
            }}
          />
        );
    }
  };

  return (
    <section
      className={cx(
        withVendorCSSClassPrefix(bem('flow-variables', 'field')),
        withVendorCSSClassPrefix(bem('flow-variables', 'field', definition.type.toLowerCase())),
        styles['card'],
        !editable && styles['cardLocked'],
        className,
      )}
      data-variable={definition.identifier}
      data-editable={editable}
    >
      <div className={styles['header']}>
        <div className={styles['headerText']}>
          <label htmlFor={id} className={styles['label']}>
            {label}
          </label>
          {definition.description && (
            <p id={descriptionId} className={styles['description']}>
              {definition.description}
            </p>
          )}
        </div>
        {editable && !isDefault && (
          <span className={styles['chipCustomized']} data-testid="flow-variable-status">
            {t('admin.flowVariables.status.customized')}
          </span>
        )}
        {action}
      </div>
      {editable ? (
        <>
          {renderControl()}
          {hint && <p className={styles['hint']}>{hint}</p>}
          {!isDefault && defaultValue !== undefined && (
            <p className={styles['hint']}>{t('admin.flowVariables.default_hint', {default: display(defaultValue)})}</p>
          )}
        </>
      ) : (
        <div className={styles['lockedLine']}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
          <span>
            {t('admin.flowVariables.locked', {owner: ownerName ?? t('admin.flowVariables.owner_fallback')})}
            {' · '}
            {display(value)}
          </span>
          {definition.type === 'BOOLEAN_INPUT' && renderControl()}
        </div>
      )}
    </section>
  );
};

export default FlowVariableField;

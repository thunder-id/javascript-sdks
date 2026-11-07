// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ConnectionInstance,
  FlowVariableDefinition,
  FlowVariableOption,
  FlowVariableValidationError,
  FlowVariableValue,
  FlowVariableValues,
  Preferences,
  ResolvedFlowVariableRule,
  ResolvedOverlay,
  getFlowVariableOptions,
  resolveFlowVariableRule,
  validateFlowVariableValue,
} from '@thunderid/browser';
import {FC, Fragment, FormEvent, ReactElement, ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import FlowVariableField from './FlowVariableField';
import useStyles from './FlowVariables.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import AdminSection from '../shared/AdminSection';

/**
 * What {@link BaseFlowVariables} hands its `children` render function, so the form can be built with any UI.
 */
export interface BaseFlowVariablesRenderProps {
  error: string | null;
  /**
   * The message to show under each variable that is not valid, keyed by identifier.
   */
  errors: Record<string, string>;
  /**
   * The choices of a select variable, narrowed to what the unit may pick.
   */
  getOptions: (definition: FlowVariableDefinition) => FlowVariableOption[];
  /**
   * What the unit may do with a variable: whether it can set its own value, and the default it starts from.
   */
  getRule: (definition: FlowVariableDefinition) => ResolvedFlowVariableRule;
  /**
   * Sets the value of one variable.
   */
  handleChange: (identifier: string, value: FlowVariableValue) => void;
  /**
   * Submits the current values. Does nothing while they are not valid.
   */
  handleSubmit: () => void;
  isSubmitting: boolean;
  /**
   * Whether the values can be submitted.
   */
  isValid: boolean;
  onCancel?: () => void;
  /**
   * Returns every variable the unit may set to its default.
   */
  resetToDefaults: () => void;
  values: FlowVariableValues;
  variables: FlowVariableDefinition[];
}

export interface BaseFlowVariablesProps {
  /**
   * Renders custom UI in place of the default form. Receives the variables, their values and setters, and the
   * submit handler.
   */
  children?: (props: BaseFlowVariablesRenderProps) => ReactNode;
  className?: string;
  /**
   * The connections a `CONNECTION_SELECT` variable can take.
   */
  connections?: Pick<ConnectionInstance, 'categories' | 'id' | 'name' | 'type'>[];
  description?: string;
  error?: string | null;
  /**
   * The values the form starts with, over each variable's default. A variable left out starts at its default.
   */
  initialValues?: FlowVariableValues;
  isSubmitting?: boolean;
  onCancel?: () => void;
  /**
   * Called when the user asks to create a connection, from the hint under a connection variable. Without it, the
   * hint does not offer one.
   */
  onCreateConnection?: () => void;
  /**
   * Called with every value after one changes.
   */
  onChange?: (values: FlowVariableValues) => void;
  /**
   * Called when the form is submitted and valid, with every value and the overrides: the values of the variables
   * the unit may set that differ from their default. Without it the form has no save button, which suits a preview.
   */
  onSubmit?: (values: FlowVariableValues, overrides: FlowVariableValues) => void;
  /**
   * What the unit may do with each variable, as `getFlowOverlayRules` returns it. Without it every variable is
   * editable, which suits a preview.
   */
  overlay?: ResolvedOverlay;
  /**
   * The name of the organization unit the variables are set for, used in the notice and the connection hint.
   */
  ouName?: string;
  /**
   * The name of whoever owns the flow, shown on a variable the unit may not set.
   */
  ownerName?: string;
  preferences?: Preferences;
  /**
   * Shows the variables without letting them be changed.
   */
  readOnly?: boolean;
  /**
   * Wraps the card of each variable, so a host can add its own controls around it, such as selecting or removing the
   * variable while it is being designed. Receives the card, the variable and its position.
   */
  renderField?: (field: ReactElement, definition: FlowVariableDefinition, index: number) => ReactNode;
  /**
   * Content at the end of the label row of each variable, for a control a host adds while designing the variables.
   */
  renderFieldAction?: (definition: FlowVariableDefinition, index: number) => ReactNode;
  /**
   * Shows a notice that the settings apply to the organization unit only. Needs `ouName` to be useful.
   */
  showScopeNotice?: boolean;
  title?: string;
  /**
   * The variables to render, as the flow declares them.
   */
  variables: FlowVariableDefinition[];
}

const startingValuesOf = (
  variables: FlowVariableDefinition[],
  overlay: ResolvedOverlay | undefined,
  initialValues: FlowVariableValues | undefined,
): FlowVariableValues =>
  variables.reduce((values: FlowVariableValues, definition: FlowVariableDefinition) => {
    const {defaultValue, editable}: ResolvedFlowVariableRule = resolveFlowVariableRule(definition, overlay);
    const chosen: FlowVariableValue | undefined = editable
      ? (initialValues?.[definition.identifier] ?? defaultValue)
      : defaultValue;

    if (chosen !== undefined && chosen !== null) {
      values[definition.identifier] = chosen;
    }

    return values;
  }, {});

/**
 * A form for the variables a flow declares, each in a card with its label, its description, whether it is
 * customized or follows the default, and the input its type calls for. It is what a delegated admin sees when
 * overriding a flow, and what the flow editor previews. Holds no data of its own: pass the variables and handle
 * the submission.
 *
 * @example
 * ```tsx
 * <BaseFlowVariables variables={variables} connections={connections} overlay={overlay} onSubmit={save} />
 * ```
 */
const BaseFlowVariables: FC<BaseFlowVariablesProps> = ({
  children,
  className,
  connections = [],
  description,
  error = null,
  initialValues,
  isSubmitting = false,
  onCancel,
  onChange,
  onCreateConnection,
  onSubmit,
  ouName,
  overlay,
  ownerName,
  preferences,
  readOnly = false,
  renderField,
  renderFieldAction,
  showScopeNotice = false,
  title,
  variables,
}: BaseFlowVariablesProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation(preferences?.i18n);

  const startingValues: FlowVariableValues = useMemo(
    () => startingValuesOf(variables, overlay, initialValues),
    // The identity of the inputs can change on every render while their content does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(variables), JSON.stringify(overlay), JSON.stringify(initialValues)],
  );
  const [values, setValues] = useState<FlowVariableValues>(startingValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const appliedValues: {current: FlowVariableValues} = useRef(startingValues);

  // The form already holds the starting values on mount; only a change to them replaces what was typed.
  useEffect(() => {
    if (appliedValues.current !== startingValues) {
      appliedValues.current = startingValues;
      setValues(startingValues);
      setTouched({});
      setSubmitted(false);
    }
  }, [startingValues]);

  const getRule = (definition: FlowVariableDefinition): ResolvedFlowVariableRule =>
    resolveFlowVariableRule(definition, overlay);

  const getOptions = (definition: FlowVariableDefinition): FlowVariableOption[] => {
    const {allowedValues, editable, excludedValues}: ResolvedFlowVariableRule = getRule(definition);

    // A variable the unit cannot set shows its pinned value, which a restriction might hide from the choices.
    return getFlowVariableOptions(definition, connections, editable ? {allowedValues, excludedValues} : {});
  };

  const errors: Record<string, string> = {};
  let isValid = true;

  variables.forEach((definition: FlowVariableDefinition) => {
    if (!getRule(definition).editable) {
      return;
    }

    const problem: FlowVariableValidationError | undefined = validateFlowVariableValue(
      definition,
      values[definition.identifier],
    );

    if (problem) {
      isValid = false;

      if (submitted || touched[definition.identifier]) {
        errors[definition.identifier] = problem.message ?? t(`admin.flowVariables.errors.${problem.code}`);
      }
    }
  });

  const handleChange = (identifier: string, value: FlowVariableValue): void => {
    const next: FlowVariableValues = {...values, [identifier]: value};

    setValues(next);
    setTouched((previous: Record<string, boolean>) => ({...previous, [identifier]: true}));
    onChange?.(next);
  };

  const resetToDefaults = (): void => {
    const next: FlowVariableValues = variables.reduce(
      (accumulated: FlowVariableValues, definition: FlowVariableDefinition) => {
        const {defaultValue}: ResolvedFlowVariableRule = getRule(definition);

        if (defaultValue !== undefined) {
          accumulated[definition.identifier] = defaultValue;
        }

        return accumulated;
      },
      {},
    );

    setValues(next);
    setTouched({});
    setSubmitted(false);
    onChange?.(next);
  };

  const submit = (): void => {
    setSubmitted(true);

    if (!isValid) {
      return;
    }

    const overrides: FlowVariableValues = variables.reduce(
      (accumulated: FlowVariableValues, definition: FlowVariableDefinition) => {
        const {defaultValue, editable}: ResolvedFlowVariableRule = getRule(definition);
        const value: FlowVariableValue | undefined = values[definition.identifier];

        if (editable && value !== undefined && value !== defaultValue) {
          accumulated[definition.identifier] = value;
        }

        return accumulated;
      },
      {},
    );

    onSubmit?.(values, overrides);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit();
  };

  if (children) {
    return (
      <div className={className}>
        {children({
          error,
          errors,
          getOptions,
          getRule,
          handleChange,
          handleSubmit: submit,
          isSubmitting,
          isValid,
          onCancel,
          resetToDefaults,
          values,
          variables,
        })}
      </div>
    );
  }

  const ou: string = ouName ?? t('admin.flowVariables.ou_fallback');

  return (
    <AdminSection
      block="flow-variables"
      className={className}
      title={title}
      description={description}
      preferences={preferences}
    >
      <form className={styles['form']} onSubmit={handleSubmit} noValidate>
        {showScopeNotice && (
          <Alert variant="info">
            <Alert.Title>{t('admin.flowVariables.notice_title', {ou})}</Alert.Title>
            <Alert.Description>{t('admin.flowVariables.notice_body', {ou})}</Alert.Description>
          </Alert>
        )}
        {error && (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        )}
        {variables.length === 0 && <p className={styles['empty']}>{t('admin.flowVariables.empty')}</p>}
        {variables.map((definition: FlowVariableDefinition, index: number) => {
          const rule: ResolvedFlowVariableRule = getRule(definition);
          // An identifier can be repeated while a flow's variables are being edited, so it cannot be the key alone.
          const key = `${index}-${definition.identifier}`;

          const field: ReactElement = (
            <FlowVariableField
              action={renderFieldAction?.(definition, index)}
              definition={definition}
              defaultValue={rule.defaultValue}
              disabled={readOnly || isSubmitting}
              editable={rule.editable}
              error={errors[definition.identifier]}
              hint={
                definition.type === 'CONNECTION_SELECT' && rule.editable ? (
                  <>
                    <span>{t('admin.flowVariables.connections_hint', {ou})}</span>
                    {onCreateConnection && (
                      <button type="button" className={styles['link']} onClick={onCreateConnection}>
                        {t('admin.flowVariables.create_connection')}
                      </button>
                    )}
                  </>
                ) : undefined
              }
              options={getOptions(definition)}
              ownerName={ownerName}
              value={values[definition.identifier]}
              onChange={(value: FlowVariableValue): void => handleChange(definition.identifier, value)}
            />
          );

          return <Fragment key={key}>{renderField ? renderField(field, definition, index) : field}</Fragment>;
        })}
        {onSubmit && !readOnly && variables.length > 0 && (
          <div className={styles['actions']}>
            <Button type="button" variant="text" onClick={resetToDefaults} disabled={isSubmitting}>
              {t('admin.flowVariables.reset_defaults')}
            </Button>
            <div className={styles['actionsSpacer']} />
            {onCancel && (
              <Button type="button" variant="text" onClick={onCancel} disabled={isSubmitting}>
                {t('admin.common.actions.cancel')}
              </Button>
            )}
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              {t('admin.flowVariables.submit')}
            </Button>
          </div>
        )}
      </form>
    </AdminSection>
  );
};

export default BaseFlowVariables;

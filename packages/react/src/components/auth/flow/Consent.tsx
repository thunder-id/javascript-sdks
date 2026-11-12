// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type ConsentPurposeData, PromptElement} from '@thunderid/browser';
import {type ChangeEvent, FC, ReactNode, useEffect, useMemo} from 'react';
import ConsentAuthorizationDetail from './ConsentAuthorizationDetail';
import ConsentCheckboxList, {getConsentOptionalKey} from './ConsentCheckboxList';
import ConsentValidityPeriodField from './ConsentValidityPeriodField';
import Typography from '../../primitives/Typography/Typography';
import Toggle from '../../primitives/Toggle/Toggle';
import {Info} from '../../primitives/Icons';
import Tooltip from '../../primitives/Tooltip/Tooltip';
import {UseTranslation} from '../../../hooks/useTranslation';
import {css} from '../../../styles/emotion';
import isConsentApprovalBlocked from '../../../utils/isConsentApprovalBlocked';

/**
 * Backward-compatible consent purpose type exported by @thunderid/react.
 *
 * Some consumers import this name directly; keep it as an alias to the v2 model.
 */
export type ConsentPurpose = ConsentPurposeData;

/**
 * Render props exposed by Consent when using the render-prop pattern.
 */
export interface ConsentRenderProps {
  /** Current form values - used to read optional checkbox state. */
  formValues: Record<string, string>;
  /**
   * Whether the consent cannot be approved yet, because an authorization detail the user has not declined
   * shows a modified value that cannot be submitted. Disable the approve action while it holds; denying
   * stays possible.
   */
  isApprovalBlocked: boolean;
  /** The longest validity period in seconds the user can choose. Absent when there is no limit. */
  maxValidityPeriod?: number;
  /** Callback invoked when a user toggles an optional attribute. */
  onInputChange: (name: string, value: string) => void;
  /** The resolved list of consent purposes parsed from `consentData`. */
  purposes: ConsentPurposeData[];
  /** Whether the user can choose how long their consent lasts. */
  validityInput: boolean;
}

/**
 * Props for the Consent component.
 */
export interface ConsentProps {
  /**
   * Render-props callback. When provided, the default consent UI is replaced with
   * whatever JSX the callback returns. The parsed `purposes` list is injected so
   * consumers do not need to re-parse `consentData` themselves.
   *
   * @example
   * ```tsx
   * <Consent consentData={raw} formValues={formInputs} onInputChange={onChange} t={t}>
   *   {({ purposes, formValues, onInputChange, t }) => (
   *     <div>
   *       {purposes.map(p => <MyConsentSection key={p.purposeId} purpose={p} />)}
   *     </div>
   *   )}
   * </Consent>
   * ```
   */
  children?: (props: ConsentRenderProps) => ReactNode;
  /**
   * The raw JSON string returned by the backend in `additionalData.consentPrompt`.
   */
  consentData?: string | ConsentPurposeData[] | {purposes: ConsentPurposeData[]};
  /**
   * Current form values - used to read optional checkbox state.
   */
  formValues: Record<string, string>;
  /**
   * The longest validity period in seconds the user can choose. Absent when there is no limit.
   */
  maxValidityPeriod?: number;
  /**
   * Callback invoked when a user toggles an optional attribute.
   */
  onInputChange: (name: string, value: string) => void;

  /**
   * translation data
   */
  t?: UseTranslation['t'];
  /**
   * Whether the user can choose how long their consent lasts. The default UI then shows a validity period field.
   */
  validityInput?: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Keep only well-formed prompt elements (non-null objects with a string `name`).
 * @param value Raw `essential`/`optional` value from the consent payload
 */
const toPromptElements = (value: unknown): PromptElement[] =>
  Array.isArray(value)
    ? (value.filter(
        (element: unknown) => isObject(element) && typeof element['name'] === 'string',
      ) as unknown as PromptElement[])
    : [];

/**
 * Consent component renders the list of purposes and their associated attributes (essential and optional)
 * based on the data provided by the backend. It allows users to toggle optional attributes while essential
 * attributes are displayed as read-only.
 */
const Consent: FC<ConsentProps> = ({
  consentData = undefined,
  formValues,
  maxValidityPeriod = undefined,
  onInputChange,
  children = undefined,
  t = undefined,
  validityInput = false,
}: ConsentProps) => {
  // Computed per render (not at module scope): a CSP nonce configured on <ThunderIDProvider>
  // isn't known until the provider renders, and Emotion needs it applied before any style
  // insertion happens. These are static, so Emotion's own cache dedupes the repeat calls to a
  // no-op after the first render — this isn't a real per-render cost.
  const purposesContainerClass: string = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '0.25rem',
  });
  const purposeItemClass: string = css({paddingBottom: '1rem'});
  const sectionClass: string = css({marginTop: '0.5rem'});
  const sectionHeaderClass: string = css({alignItems: 'center', display: 'flex', gap: '4px', marginBottom: '10px'});
  const optionalSectionHeaderClass: string = css({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    paddingRight: '4px',
  });
  const optionalSectionLabelClass: string = css({alignItems: 'center', display: 'flex', gap: '4px'});

  /**
   * Resolve an i18n key, falling back to the given value when no translation is found.
   * `t` returns the key itself for missing translations, so that case is treated as "not found".
   * @param key Translation key
   * @param fallback Value to use when the key cannot be resolved
   */
  const resolve = (key: string, fallback = ''): string => {
    const translated: string | undefined = t?.(key);
    return translated && translated !== key ? translated : fallback;
  };

  const essentialInfo = resolve('consent.essential_claims.info');
  const optionalInfo = resolve('consent.optional_claims.info');
  const essentialPermissionInfo = resolve('consent.essential_scope.info');
  const optionalPermissionInfo = resolve('consent.optional_scope.info');
  const essentialLabel = resolve('consent.essential_claims', 'Essential Attributes');
  const optionalLabel = resolve('consent.optional_claims', 'Optional Attributes');
  const essentialPermissionLabel = resolve('consent.essential_scope', 'Essential Permissions');
  const optionalPermissionLabel = resolve('consent.optional_scope', 'Optional Permissions');
  const toggleAllAttributesLabel = resolve('consent.optional_claims.toggle_all', 'Toggle all optional attributes');
  const toggleAllPermissionsLabel = resolve('consent.optional_scope.toggle_all', 'Toggle all optional permissions');

  /**
   * Method to check whether master toggle button is checked or not
   * @param purpose Purpose object
   * @param checked boolean variable to check, whether toggle is checked or unchecked
   */
  const handleChange = (purpose: ConsentPurposeData, checked: boolean): void => {
    const checkValue = checked ? 'true' : 'false';
    purpose.optional.forEach((opt: PromptElement) => {
      const key: string = getConsentOptionalKey(purpose.purposeId, opt.name);
      onInputChange(key, checkValue);
    });
  };

  /**
   * Check all optional claims are selected or not
   * @param purpose Purpose object
   * @returns boolean value to denote all optional claims are selected
   */
  const checkOptValue = (purpose: ConsentPurposeData): boolean => {
    return purpose.optional.every((opt: PromptElement) => {
      const key: string = getConsentOptionalKey(purpose.purposeId, opt.name);
      return formValues[key] === 'true';
    });
  };

  /**
   * Renders a section title with an optional info tooltip.
   * @param label Section title
   * @param info Tooltip text; the tooltip is omitted when empty
   */
  const renderSectionTitle = (label: string, info: string): ReactNode => (
    <>
      <Typography variant="subtitle2" fontWeight="bold">
        {label}
      </Typography>
      {info && (
        <Tooltip helperText={info}>
          <Info width="1rem" height="1rem" />
        </Tooltip>
      )}
    </>
  );

  // Parse, validate and order the purposes once per `consentData` change rather than on every render
  // (e.g. each `formValues` update). Must run before any early return to respect the rules of hooks.
  const purposes: ConsentPurposeData[] = useMemo((): ConsentPurposeData[] => {
    if (!consentData) return [];

    let parsed: unknown;

    try {
      parsed = typeof consentData === 'string' ? JSON.parse(consentData) : consentData;
    } catch (e) {
      // Failed to parse consent prompt data
      return [];
    }

    const rawPurposes: unknown = Array.isArray(parsed) ? parsed : (parsed as {purposes?: unknown})?.purposes;

    if (!Array.isArray(rawPurposes)) return [];

    // `JSON.parse` doesn't validate the shape, so drop malformed purposes and elements here
    // instead of letting the sort or the render read properties off `null`. Purposes without a
    // `purposeId` are omitted too, since it keys the optional-element form values and they would collide.
    const normalized: ConsentPurposeData[] = rawPurposes
      .filter(
        (purpose: unknown): purpose is Record<string, unknown> =>
          isObject(purpose) && typeof purpose['purposeId'] === 'string',
      )
      .map(
        (purpose: Record<string, unknown>): ConsentPurposeData => ({
          ...(purpose as unknown as ConsentPurposeData),
          essential: toPromptElements(purpose['essential']),
          optional: toPromptElements(purpose['optional']),
        }),
      );

    // Order purposes so that permissions come first and attributes come last.
    // `normalized` is already a copy, so sorting doesn't mutate the caller's data; Array.prototype.sort
    // is stable, so purposes of the same type keep their original order.
    return normalized.sort(
      (a: ConsentPurposeData, b: ConsentPurposeData) =>
        Number(b.type === 'permissions') - Number(a.type === 'permissions'),
    );
  }, [consentData]);

  // An authorization detail is the transaction the user is asked to allow, so it starts approved. The value
  // is seeded into the form so the submitted decision matches the screen.
  useEffect(() => {
    purposes
      .filter((purpose: ConsentPurposeData) => purpose.type === 'authorization_details')
      .forEach((purpose: ConsentPurposeData) => {
        purpose.optional.forEach((element: PromptElement) => {
          const key: string = getConsentOptionalKey(purpose.purposeId, element.name);
          if (formValues[key] === undefined) {
            onInputChange(key, 'true');
          }
        });
      });
  }, [purposes, formValues, onInputChange]);

  if (purposes.length === 0) return null;

  if (children) {
    return (
      <>
        {children({
          formValues,
          isApprovalBlocked: isConsentApprovalBlocked(purposes, formValues),
          maxValidityPeriod,
          onInputChange,
          purposes,
          validityInput,
        })}
      </>
    );
  }

  return (
    <div className={purposesContainerClass}>
      {purposes.map((purpose: ConsentPurposeData, purposeIndex: number) => {
        // Pick section labels/tooltips according to the purpose type (permissions vs attributes)
        const isPermission: boolean = purpose.type === 'permissions';

        return (
          <div key={purpose.purposeId || purposeIndex} className={purposeItemClass}>
            {/* TODO: Uncomment when the backend supports multiple purposes for a application */}
            {/* <Typography variant="h6" fontWeight={600} gutterBottom color="inherit">
            {purpose.purposeName}
          </Typography>
          <Typography variant="body2" color="inherit" style={{marginBottom: '1rem', opacity: 0.85}}>
            {purpose.description}
          </Typography> */}

            {purpose.type === 'authorization_details' &&
              purpose.optional.map((element: PromptElement) => (
                <ConsentAuthorizationDetail
                  key={element.name}
                  purposeId={purpose.purposeId}
                  element={element}
                  formValues={formValues}
                  onInputChange={onInputChange}
                  t={t}
                />
              ))}

            {purpose.type !== 'authorization_details' && purpose.essential?.length > 0 && (
              <div className={sectionClass}>
                <div className={sectionHeaderClass}>
                  {renderSectionTitle(
                    isPermission ? essentialPermissionLabel : essentialLabel,
                    isPermission ? essentialPermissionInfo : essentialInfo,
                  )}
                </div>
                <ConsentCheckboxList
                  variant="ESSENTIAL"
                  purpose={purpose}
                  formValues={formValues}
                  onInputChange={onInputChange}
                  t={t}
                />
              </div>
            )}

            {purpose.type !== 'authorization_details' && purpose.optional?.length > 0 && (
              <div className={sectionClass}>
                <div className={optionalSectionHeaderClass}>
                  <div className={optionalSectionLabelClass}>
                    {renderSectionTitle(
                      isPermission ? optionalPermissionLabel : optionalLabel,
                      isPermission ? optionalPermissionInfo : optionalInfo,
                    )}
                  </div>
                  <Toggle
                    id={`consent_opt_${purpose.purposeId}_all`}
                    checked={checkOptValue(purpose)}
                    aria-label={isPermission ? toggleAllPermissionsLabel : toggleAllAttributesLabel}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void => handleChange(purpose, e.target.checked)}
                  />
                </div>
                <ConsentCheckboxList
                  variant="OPTIONAL"
                  purpose={purpose}
                  formValues={formValues}
                  onInputChange={onInputChange}
                  t={t}
                />
              </div>
            )}
          </div>
        );
      })}
      {validityInput && (
        <ConsentValidityPeriodField
          formValues={formValues}
          maxValidityPeriod={maxValidityPeriod}
          onInputChange={onInputChange}
          t={t}
        />
      )}
    </div>
  );
};

export default Consent;

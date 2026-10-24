// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {bem, type ConsentDetailRow, type PromptElement, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type ChangeEvent, FC, ReactNode} from 'react';
import useStyles from './ConsentAuthorizationDetail.styles';
import {getConsentOptionalKey} from './ConsentCheckboxList';
import ConsentDetailField from './ConsentDetailField';
import ConsentDetailText from './ConsentDetailText';
import resolveConsentText from './resolveConsentText';
import useTheme from '../../contexts/Theme/useTheme';
import {UseTranslation} from '../../hooks/useTranslation';
import {cx} from '../../styles/emotion';
import getConsentDetailLayout, {CONSENT_DETAIL_DISPLAY_LIMITS} from '../../utils/getConsentDetailLayout';
import Toggle from '../primitives/Toggle/Toggle';
import Typography from '../primitives/Typography/Typography';

/**
 * Render props exposed by ConsentAuthorizationDetail when using the render-prop pattern.
 */
export interface ConsentAuthorizationDetailRenderProps {
  /** RFC 9396 authorization details type of the detail. */
  detailType?: string;
  /** The detail's consent element. */
  element: PromptElement;
  /** Call this when the user approves or declines the detail as a whole. */
  handleChange: (checked: boolean) => void;
  /**
   * Whether the detail is approved. A detail is the transaction the user is asked to allow, so it counts as
   * approved until the user declines it.
   */
  isApproved: boolean;
  /** Fields of the detail; render each with `ConsentDetailField` or `useConsentDetailField`. */
  rows: ConsentDetailRow[];
  /** Server-rendered sentence describing the detail, or its type or identifier when it has none. */
  summary: string;
}

/**
 * Props for the ConsentAuthorizationDetail component.
 */
export interface ConsentAuthorizationDetailProps {
  /**
   * Render-props callback. When provided, the default detail UI is replaced with whatever JSX the
   * callback returns.
   *
   * @example
   * ```tsx
   * <ConsentAuthorizationDetail purposeId={purpose.purposeId} element={element} formValues={formValues} onInputChange={onChange}>
   *   {({summary, rows, isApproved, handleChange}) => (
   *     <section>
   *       <h3>{summary}</h3>
   *       {rows.map(row => (
   *         <ConsentDetailField key={row.path} purposeId={purpose.purposeId} detailId={element.name} row={row} formValues={formValues} onInputChange={onChange} />
   *       ))}
   *       <Switch checked={isApproved} onChange={e => handleChange(e.target.checked)} />
   *     </section>
   *   )}
   * </ConsentAuthorizationDetail>
   * ```
   */
  children?: (props: ConsentAuthorizationDetailRenderProps) => ReactNode;
  /** The authorization detail element of the consent purpose. */
  element: PromptElement;
  /** Current form values, holding the approval of the detail and the values the user modified. */
  formValues: Record<string, string>;
  /** Callback invoked with a consent form key and its new value. */
  onInputChange: (name: string, value: string) => void;
  /** The identifier of the authorization details purpose the detail belongs to. */
  purposeId: string;
  /** translation data */
  t?: UseTranslation['t'];
}

/**
 * Renders one RFC 9396 authorization detail element: the server-rendered summary, the detail's fields,
 * which are read-only unless the user may modify them, and a single toggle that approves or declines the
 * detail as a whole. The summary and labels come from the server and are not translated again.
 * Authorization details reach the consent step only on a sign-in started from an authorization request, so
 * this renders in an authorization server UI (hosted login); an app-native sign-in flow cannot carry them.
 */
const ConsentAuthorizationDetail: FC<ConsentAuthorizationDetailProps> = ({
  children = undefined,
  element,
  formValues,
  onInputChange,
  purposeId,
  t = undefined,
}: ConsentAuthorizationDetailProps) => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);

  const key: string = getConsentOptionalKey(purposeId, element.name);
  const isApproved: boolean = formValues[key] !== 'false';
  const rows: ConsentDetailRow[] = element.rows ?? [];
  const summary: string = element.summary ?? element.detailType ?? element.name;

  const handleChange = (checked: boolean): void => {
    onInputChange(key, checked ? 'true' : 'false');
  };

  if (children) {
    return <>{children({detailType: element.detailType, element, handleChange, isApproved, rows, summary})}</>;
  }

  return (
    <div className={cx(withVendorCSSClassPrefix(bem('consent-authorization-detail')), styles['card'])}>
      <ConsentDetailText
        id={`consent_authz_detail_${purposeId}_${element.name}_summary`}
        className={withVendorCSSClassPrefix(bem('consent-authorization-detail', 'summary'))}
        variant="subtitle2"
        fontWeight="bold"
        maxChars={CONSENT_DETAIL_DISPLAY_LIMITS.summaryChars}
        maxLines={CONSENT_DETAIL_DISPLAY_LIMITS.summaryLines}
        t={t}
        text={summary}
      />
      {rows.length > 0 && (
        <div className={cx(withVendorCSSClassPrefix(bem('consent-authorization-detail', 'rows')), styles['rows'])}>
          {rows.map((row: ConsentDetailRow) => {
            const stacked: boolean = getConsentDetailLayout(row) === 'stacked';
            return (
              <div
                key={row.path}
                className={cx(
                  withVendorCSSClassPrefix(bem('consent-authorization-detail', 'row')),
                  stacked && withVendorCSSClassPrefix(bem('consent-authorization-detail', 'row', 'stacked')),
                  stacked ? styles['stackedRow'] : styles['row'],
                )}
              >
                <Typography
                  variant="body2"
                  className={cx(
                    withVendorCSSClassPrefix(bem('consent-authorization-detail', 'label')),
                    styles['label'],
                  )}
                >
                  {row.label || row.path}
                </Typography>
                <div
                  className={cx(
                    withVendorCSSClassPrefix(bem('consent-authorization-detail', 'value')),
                    stacked ? styles['stackedValue'] : styles['value'],
                  )}
                >
                  <ConsentDetailField
                    align={stacked ? 'start' : 'end'}
                    detailId={element.name}
                    purposeId={purposeId}
                    row={row}
                    formValues={formValues}
                    onInputChange={onInputChange}
                    t={t}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Toggle
        id={`consent_opt_${purposeId}_${element.name}`}
        className={withVendorCSSClassPrefix(bem('consent-authorization-detail', 'approve'))}
        label={resolveConsentText(t, 'consent.authorization_details.approve')}
        checked={isApproved}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => handleChange(e.target.checked)}
      />
    </div>
  );
};

export default ConsentAuthorizationDetail;

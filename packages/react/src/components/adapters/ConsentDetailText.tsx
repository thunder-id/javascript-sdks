// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import useStyles, {useToggleStyles} from './ConsentDetailText.styles';
import resolveConsentText from './resolveConsentText';
import useTheme from '../../contexts/Theme/useTheme';
import {UseTranslation} from '../../hooks/useTranslation';
import {cx} from '../../styles/emotion';
import isConsentDetailTextClamped from '../../utils/isConsentDetailTextClamped';
import Typography from '../primitives/Typography/Typography';

/**
 * Props for the ConsentDetailToggle component.
 */
export interface ConsentDetailToggleProps {
  /** Id of the element the toggle shows more or less of. */
  controls?: string;
  /** Whether everything is shown. */
  expanded: boolean;
  /** Number of items hidden while collapsed. When given, the collapsed label counts them. */
  hiddenCount?: number;
  /** Callback invoked with the next expanded state. */
  onToggle: (expanded: boolean) => void;
  /** translation data */
  t?: UseTranslation['t'];
}

/**
 * Button that expands or collapses long authorization detail content.
 */
export const ConsentDetailToggle: FC<ConsentDetailToggleProps> = ({
  controls = undefined,
  expanded,
  hiddenCount = undefined,
  onToggle,
  t = undefined,
}: ConsentDetailToggleProps): ReactElement => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useToggleStyles(theme, colorScheme);

  let label: string = resolveConsentText(t, 'consent.authorization_details.show_less');
  if (!expanded) {
    label =
      hiddenCount === undefined
        ? resolveConsentText(t, 'consent.authorization_details.show_more')
        : resolveConsentText(t, 'consent.authorization_details.more_items', {count: hiddenCount});
  }

  return (
    <button
      type="button"
      className={cx(withVendorCSSClassPrefix(bem('consent-detail-text', 'toggle')), styles['toggle'])}
      aria-controls={controls}
      aria-expanded={expanded}
      onClick={(): void => onToggle(!expanded)}
    >
      {label}
    </button>
  );
};

/**
 * Props for the ConsentDetailText component.
 */
export interface ConsentDetailTextProps {
  /** Alignment of the text. */
  align?: 'left' | 'right';
  /** Class name applied to the text. */
  className?: string;
  /** Weight of the text. */
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Id of the text element. */
  id?: string;
  /** Number of characters above which the text is clamped. */
  maxChars: number;
  /** Number of lines the text is clamped to. */
  maxLines: number;
  /** Shows the text as a preformatted monospace block, for structured JSON. */
  monospace?: boolean;
  /** translation data */
  t?: UseTranslation['t'];
  /** Text to show. */
  text: string;
  /** Typography variant of the text. */
  variant?: 'body2' | 'subtitle2';
}

/**
 * Shows authorization detail text that wraps anywhere, so a long unbroken token such as an IBAN or a
 * URL never overflows. Text longer than its limit is clamped behind a toggle.
 */
const ConsentDetailText: FC<ConsentDetailTextProps> = ({
  align = 'left',
  className = undefined,
  fontWeight = undefined,
  id = undefined,
  maxChars,
  maxLines,
  monospace = false,
  t = undefined,
  text,
  variant = 'body2',
}: ConsentDetailTextProps): ReactElement => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme, align, monospace, maxLines);
  const long: boolean = isConsentDetailTextClamped(text, maxChars, maxLines);

  return (
    <div className={cx(withVendorCSSClassPrefix(bem('consent-detail-text')), styles['container'])}>
      <Typography
        id={id}
        variant={variant}
        fontWeight={fontWeight}
        className={cx(
          withVendorCSSClassPrefix(bem('consent-detail-text', 'text')),
          styles['text'],
          monospace && withVendorCSSClassPrefix(bem('consent-detail-text', 'text', 'monospace')),
          monospace && styles['monospace'],
          long && !expanded && styles['clamp'],
          className,
        )}
      >
        {text}
      </Typography>
      {long && <ConsentDetailToggle controls={id} expanded={expanded} onToggle={setExpanded} t={t} />}
    </div>
  );
};

export default ConsentDetailText;

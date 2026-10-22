// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import useStyles from './Attribution.styles';
import ThunderIDWordmark from './ThunderIDWordmark';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';

export interface AttributionProps {
  /**
   * How the credit is shown: a line of text, or a ribbon that hangs off the right edge of a card such
   * as a sign-in box. The card the ribbon sits on must be `position: relative`.
   * @default 'inline'
   */
  appearance?: 'inline' | 'ribbon';
  className?: string;
  /**
   * Makes the attribution a link, for example to a page about how the app keeps accounts safe. It
   * opens in a new tab.
   */
  href?: string;
  preferences?: Preferences;
  /**
   * The words before the wordmark.
   * @default 'secured'
   */
  variant?: 'powered' | 'secured';
}

/**
 * A small "Secured by ThunderID" credit: a line of text for the footer of an app, or a ribbon on the
 * edge of a sign-in card. The inline credit follows the theme's text colors, so it reads on light and
 * dark surfaces.
 *
 * @example
 * ```tsx
 * <Attribution />
 * <Attribution variant="powered" />
 * <Attribution appearance="ribbon" variant="powered" />
 * ```
 */
const Attribution: FC<AttributionProps> = ({
  appearance = 'inline',
  className,
  href,
  preferences,
  variant = 'secured',
}: AttributionProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const label: string = t(variant === 'powered' ? 'attribution.powered_by' : 'attribution.secured_by');
  const isRibbon: boolean = appearance === 'ribbon';
  const rootClassName: string = cx(
    withVendorCSSClassPrefix(bem('attribution')),
    isRibbon ? withVendorCSSClassPrefix(bem('attribution', null, 'ribbon')) : undefined,
    isRibbon ? styles['ribbon'] : styles['root'],
    className,
  );
  const content: ReactElement = isRibbon ? (
    <span className={styles['ribbonContent']}>
      <span className={styles['ribbonLabel']}>{label}</span>
      <ThunderIDWordmark className={styles['ribbonWordmark']} role="img" aria-label="ThunderID" />
    </span>
  ) : (
    <>
      <span className={styles['label']}>{label}</span>
      <ThunderIDWordmark className={styles['wordmark']} role="img" aria-label="ThunderID" />
    </>
  );

  if (href) {
    return (
      <a
        className={cx(rootClassName, isRibbon ? undefined : styles['link'])}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return <span className={rootClassName}>{content}</span>;
};

export default Attribution;

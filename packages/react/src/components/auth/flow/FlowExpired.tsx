// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getVendorPrefix, withVendorCSSClassPrefix} from '@thunderid/browser';
import {FC, ReactElement, RefObject, useEffect, useRef} from 'react';
import useStyles from './FlowExpired.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import type {FlowExpiryRedirect} from '../../../hooks/auth/useFlowExpiryRedirect';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import Button from '../../primitives/Button/Button';
import Timer from '../../primitives/Icons/Timer';
import Typography from '../../primitives/Typography/Typography';

// Stands in for the application name in the link text, to find where the name goes.
const APPLICATION_MARKER = '\u0000';

export interface FlowExpiredProps {
  /**
   * Starts the flow again. Offered when there is no redirect.
   */
  onRestart?: () => void;
  /**
   * The countdown that sends the user back to the application. Takes the place of starting again.
   */
  redirect?: FlowExpiryRedirect | null;
}

/**
 * Shown in place of a sign-in, sign-up or recovery flow whose execution expired. The flow cannot continue,
 * so it counts down to the application, offers to start again, or tells the user to go back to the
 * application.
 */
const FlowExpired: FC<FlowExpiredProps> = ({
  onRestart = undefined,
  redirect = null,
}: FlowExpiredProps): ReactElement => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const {meta, vendor} = useThunderID();
  const {t} = useTranslation();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const rootRef: RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);
  const name: string | undefined = meta?.application?.name;
  const application: string = name !== undefined && name !== '' ? name : t('flow.expired.application');

  // The expired state replaces the flow in place, so move focus to it for a screen reader to read it.
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const renderAction = (): ReactElement | null => {
    if (redirect) {
      // Splits the text around the name, so a long name shortens and the rest of the text stays.
      const [before = '', after = ''] = t(
        redirect.isCountingDown ? 'flow.expired.redirect.now' : 'flow.expired.redirect.link',
        {application: APPLICATION_MARKER},
      ).split(APPLICATION_MARKER);

      return (
        <a className={styles['link']} href={redirect.url}>
          {before}
          <span className={styles['name']}>{application}</span>
          {after}
        </a>
      );
    }
    if (onRestart) {
      return (
        <Button className={styles['action']} variant="outline" onClick={onRestart}>
          {t('flow.expired.restart')}
        </Button>
      );
    }

    return null;
  };

  const description = (): string => {
    // The countdown shows only while it runs, not while it waits for the user.
    if (redirect?.isCountingDown) {
      return t('flow.expired.redirecting', {application, seconds: redirect.secondsLeft});
    }
    if (!redirect && onRestart) {
      return t('flow.expired.restart.description');
    }

    return t('flow.expired.return.description', {application});
  };

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={cx(withVendorCSSClassPrefix('flow-expired'), styles['root'])}
      data-testid={`${getVendorPrefix(vendor)}-flow-expired`}
    >
      <span className={styles['icon']} aria-hidden>
        <Timer width={44} height={44} strokeWidth={1.6} />
      </span>
      <Typography variant="h5" component="h1">
        {t('flow.expired.heading')}
      </Typography>
      <Typography variant="body1">{description()}</Typography>
      {renderAction()}
    </div>
  );
};

export default FlowExpired;

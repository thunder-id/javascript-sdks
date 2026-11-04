// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import useAdminPartStyles from './useAdminPartStyles';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import CopyableText from '../../primitives/CopyableText/CopyableText';

export interface ClientSecretNoticeProps {
  /**
   * Called once the secret has been copied, after which it cannot be read again.
   */
  onDismiss?: () => void;
  preferences?: Preferences;
  secret: string;
}

/**
 * Shows a client secret the one time it can be read, masked until revealed, with a copy button.
 */
const ClientSecretNotice: FC<ClientSecretNoticeProps> = ({
  onDismiss,
  preferences,
  secret,
}: ClientSecretNoticeProps): ReactElement => {
  const styles: Record<string, string> = useAdminPartStyles();
  const {t} = useTranslation(preferences?.i18n);

  return (
    <div className={styles['row']} style={{alignItems: 'stretch', flexDirection: 'column'}}>
      <Alert variant="warning" role="status">
        {t('admin.applications.secret.notice')}
      </Alert>
      <CopyableText label={t('admin.applications.secret.title')} value={secret} masked />
      {onDismiss && (
        <div className={styles['row']} style={{justifyContent: 'flex-end'}}>
          <Button onClick={onDismiss}>{t('admin.applications.secret.done')}</Button>
        </div>
      )}
    </div>
  );
};

export default ClientSecretNotice;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccessStatusValue, AccountLifecycleAction} from '@thunderid/browser';
import {ChangeEvent, FC, ReactElement, useState} from 'react';
import useAdminPartStyles from './useAdminPartStyles';
import useTranslation from '../../../hooks/useTranslation';
import Button from '../../primitives/Button/Button';
import TextField from '../../primitives/TextField/TextField';

/**
 * Matches the server's limit on an operator note.
 */
const OPERATOR_NOTE_MAX_LENGTH = 100;

export interface AccessStatusBadgeProps {
  status?: AccessStatusValue;
}

/**
 * The translated access status of an identity, or its raw value when the status is one this SDK does
 * not know. Renders nothing when the server reports no status.
 */
export const AccessStatusBadge: FC<AccessStatusBadgeProps> = ({
  status,
}: AccessStatusBadgeProps): ReactElement | null => {
  const styles: Record<string, string> = useAdminPartStyles();
  const {t} = useTranslation();

  if (!status) {
    return null;
  }

  const labels: Record<AccessStatusValue, string> = {
    ACTIVE: t('admin.common.status.active'),
    LOCKED: t('admin.common.status.locked'),
    SUSPENDED: t('admin.common.status.suspended'),
  };

  return <span className={styles['chip']}>{labels[status] ?? status}</span>;
};

export interface AccountLifecycleButtonsProps {
  /**
   * The actions to offer, most expected first.
   */
  actions: AccountLifecycleAction[];
  /**
   * Whether a suspension asks for an optional operator note. The note is recorded by the flow.
   */
  collectsOperatorNote?: boolean;
  isRunning?: boolean;
  /**
   * Name of the identity, already resolved, used in the confirmation question.
   */
  name: string;
  onAction: (action: AccountLifecycleAction, operatorNote?: string) => void;
}

/**
 * One button per account lifecycle action. Suspending and unsuspending ask for confirmation inline;
 * unlocking is remedial and runs straight away.
 */
export const AccountLifecycleButtons: FC<AccountLifecycleButtonsProps> = ({
  actions,
  collectsOperatorNote = false,
  isRunning = false,
  name,
  onAction,
}: AccountLifecycleButtonsProps): ReactElement | null => {
  const styles: Record<string, string> = useAdminPartStyles();
  const {t} = useTranslation();
  const [confirming, setConfirming] = useState<AccountLifecycleAction | null>(null);
  const [operatorNote, setOperatorNote] = useState<string>('');

  if (actions.length === 0) {
    return null;
  }

  const labels: Record<AccountLifecycleAction, string> = {
    suspend: t('admin.common.lifecycle.suspend'),
    unlock: t('admin.common.lifecycle.unlock'),
    unsuspend: t('admin.common.lifecycle.unsuspend'),
  };

  if (confirming && actions.includes(confirming)) {
    const question: string =
      confirming === 'suspend'
        ? t('admin.common.lifecycle.suspend_confirm', {name})
        : t('admin.common.lifecycle.unsuspend_confirm', {name});
    const withNote: boolean = collectsOperatorNote && confirming === 'suspend';
    const close = (): void => {
      setConfirming(null);
      setOperatorNote('');
    };

    return (
      <span className={styles['confirm']} role="group" aria-label={question}>
        <span>{question}</span>
        {withNote && (
          <TextField
            name="operatorNote"
            label={t('admin.common.lifecycle.operator_note')}
            aria-label={t('admin.common.lifecycle.operator_note')}
            value={operatorNote}
            maxLength={OPERATOR_NOTE_MAX_LENGTH}
            disabled={isRunning}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => setOperatorNote(event.target.value)}
          />
        )}
        <Button variant="text" size="small" disabled={isRunning} onClick={close}>
          {t('admin.common.actions.cancel')}
        </Button>
        <Button
          color={confirming === 'suspend' ? 'error' : 'primary'}
          size="small"
          loading={isRunning}
          disabled={isRunning}
          onClick={(): void => {
            onAction(confirming, withNote ? operatorNote.trim() || undefined : undefined);
            close();
          }}
        >
          {labels[confirming]}
        </Button>
      </span>
    );
  }

  return (
    <>
      {actions.map((action: AccountLifecycleAction) => (
        <Button
          key={action}
          variant="outline"
          color={action === 'suspend' ? 'error' : 'primary'}
          disabled={isRunning}
          loading={isRunning && action === 'unlock'}
          onClick={(): void => (action === 'unlock' ? onAction(action) : setConfirming(action))}
        >
          {labels[action]}
        </Button>
      ))}
    </>
  );
};

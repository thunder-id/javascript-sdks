// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FC, ReactElement, ReactNode, useState} from 'react';
import useAdminPartStyles from './useAdminPartStyles';
import useTranslation from '../../../../hooks/useTranslation';
import Button from '../../../primitives/Button/Button';

/**
 * One label and value pair of a {@link DetailList}.
 */
export interface DetailListItem {
  label: string;
  value: ReactNode;
}

export interface DetailListProps {
  items: DetailListItem[];
}

/**
 * Renders label and value pairs as a description list.
 */
export const DetailList: FC<DetailListProps> = ({items}: DetailListProps): ReactElement => {
  const styles: Record<string, string> = useAdminPartStyles();

  return (
    <dl className={styles['detail']}>
      {items.map((item: DetailListItem) => (
        <div key={item.label} style={{display: 'contents'}}>
          <dt className={styles['detailLabel']}>{item.label}</dt>
          <dd className={styles['detailValue']}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export interface PanelProps {
  actions?: ReactNode;
  children?: ReactNode;
  title: string;
}

/**
 * A bordered block with a heading, used to group parts of a details view.
 */
export const Panel: FC<PanelProps> = ({actions, children, title}: PanelProps): ReactElement => {
  const styles: Record<string, string> = useAdminPartStyles();

  return (
    <section className={styles['panel']}>
      <div className={styles['row']} style={{justifyContent: 'space-between'}}>
        <h3 className={styles['panelTitle']}>{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
};

export interface ChipListProps {
  /**
   * Accessible name of the list, already translated.
   */
  label: string;
  /**
   * Message shown when there are no items, already translated.
   */
  emptyText: string;
  items: {id: string; label: string; onRemove?: () => void; removeLabel?: string}[];
}

/**
 * Renders a list of named items, each optionally removable.
 */
export const ChipList: FC<ChipListProps> = ({emptyText, items, label}: ChipListProps): ReactElement => {
  const styles: Record<string, string> = useAdminPartStyles();

  if (items.length === 0) {
    return <span className={styles['muted']}>{emptyText}</span>;
  }

  return (
    <ul className={styles['chipList']} aria-label={label}>
      {items.map((item: ChipListProps['items'][number]) => (
        <li key={item.id} className={styles['chip']}>
          {item.label}
          {item.onRemove && (
            <Button variant="icon" size="small" aria-label={item.removeLabel} onClick={item.onRemove}>
              <span aria-hidden="true">×</span>
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
};

export interface ConfirmButtonProps {
  /**
   * Label of the button that starts the action, already translated.
   */
  children: ReactNode;
  /**
   * Question asked before the action runs, already translated.
   */
  confirmText: string;
  disabled?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
}

/**
 * A destructive action that asks for confirmation inline before it runs.
 */
export const ConfirmButton: FC<ConfirmButtonProps> = ({
  children,
  confirmText,
  disabled = false,
  isLoading = false,
  onConfirm,
}: ConfirmButtonProps): ReactElement => {
  const styles: Record<string, string> = useAdminPartStyles();
  const {t} = useTranslation();
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  if (!isConfirming) {
    return (
      <Button variant="outline" color="error" disabled={disabled} onClick={(): void => setIsConfirming(true)}>
        {children}
      </Button>
    );
  }

  return (
    <span className={styles['confirm']} role="group" aria-label={confirmText}>
      <span>{confirmText}</span>
      <Button variant="text" size="small" disabled={isLoading} onClick={(): void => setIsConfirming(false)}>
        {t('admin.common.actions.cancel')}
      </Button>
      <Button color="error" size="small" loading={isLoading} disabled={isLoading} onClick={onConfirm}>
        {t('admin.common.actions.confirm')}
      </Button>
    </span>
  );
};

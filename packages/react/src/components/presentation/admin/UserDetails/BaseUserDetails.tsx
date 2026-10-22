// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveManagedIdentityName, ManagedUser, MembershipGroup, Preferences} from '@thunderid/browser';
import {ChangeEvent, FC, ReactElement, ReactNode, useState} from 'react';
import useTranslation from '../../../../hooks/useTranslation';
import Alert from '../../../primitives/Alert/Alert';
import {Avatar} from '../../../primitives/Avatar/Avatar';
import Button from '../../../primitives/Button/Button';
import Spinner from '../../../primitives/Spinner/Spinner';
import TextField from '../../../primitives/TextField/TextField';
import {ChipList, ConfirmButton, DetailList, Panel} from '../shared/AdminParts';
import AdminSection from '../shared/AdminSection';
import useAdminPartStyles from '../shared/useAdminPartStyles';

/**
 * What {@link BaseUserDetails} hands its `children` render function, so the user can be shown with any UI.
 */
export interface BaseUserDetailsRenderProps {
  /**
   * The user's attributes, without the hidden ones.
   */
  attributes: Record<string, unknown>;
  /**
   * The user's display name, or an empty string while there is no user.
   */
  displayName: string;
  error: string | null;
  groups: MembershipGroup[];
  isDeleting: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  /**
   * Deletes the user. Undefined when deletion is not allowed, including for read-only users.
   */
  onDelete?: () => void;
  /**
   * Saves the given attributes. Undefined when editing is not allowed, including for read-only users.
   */
  onUpdate?: (attributes: Record<string, unknown>) => void;
  user?: ManagedUser;
}

export interface BaseUserDetailsProps {
  /**
   * Controls rendered next to the user's name.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default view. Receives the user, their visible attributes and
   * groups, the loading and error state, and the delete and update handlers.
   */
  children?: (props: BaseUserDetailsRenderProps) => ReactNode;
  className?: string;
  error?: string | null;
  /**
   * The groups the user belongs to.
   */
  groups?: MembershipGroup[];
  /**
   * Attribute names that are never shown, such as credentials.
   * @default ['password']
   */
  hiddenAttributes?: string[];
  isDeleting?: boolean;
  isLoading?: boolean;
  isUpdating?: boolean;
  /**
   * Deletes the user. The delete action is hidden when omitted.
   */
  onDelete?: () => void;
  /**
   * Saves edited attributes. Text attributes become editable only when set. Receives every
   * attribute, edited or not.
   */
  onUpdate?: (attributes: Record<string, unknown>) => void;
  preferences?: Preferences;
  user?: ManagedUser;
}

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean);
};

/**
 * Shows a user's attributes, type, organization unit and groups. Holds no data of its own: pass the
 * user and handle deletion.
 */
const BaseUserDetails: FC<BaseUserDetailsProps> = ({
  actions,
  children,
  className,
  error = null,
  groups = [],
  hiddenAttributes = ['password'],
  isDeleting = false,
  isLoading = false,
  isUpdating = false,
  onDelete,
  onUpdate,
  preferences,
  user,
}: BaseUserDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  if (children) {
    const isWritable: boolean = Boolean(user) && !user?.isReadOnly;

    return (
      <div className={className}>
        {children({
          attributes: Object.fromEntries(
            Object.entries(user?.attributes ?? {}).filter(
              ([name]: [string, unknown]) => !hiddenAttributes.includes(name),
            ),
          ),
          displayName: user ? resolveManagedIdentityName(user) : '',
          error,
          groups,
          isDeleting,
          isLoading,
          isUpdating,
          onDelete: isWritable ? onDelete : undefined,
          onUpdate: isWritable ? onUpdate : undefined,
          user,
        })}
      </div>
    );
  }

  if (isLoading && !user) {
    return (
      <AdminSection block="user-details" className={className} preferences={preferences}>
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      </AdminSection>
    );
  }

  if (!user) {
    return (
      <AdminSection block="user-details" className={className} preferences={preferences}>
        <Alert variant="error" role="alert">
          {error ?? t('admin.common.errors.not_found')}
        </Alert>
      </AdminSection>
    );
  }

  const displayName: string = resolveManagedIdentityName(user);
  const attributes: [string, unknown][] = Object.entries(user.attributes ?? {}).filter(
    ([name]: [string, unknown]) => !hiddenAttributes.includes(name),
  );
  const editableAttributes: [string, string][] = attributes.filter(
    (entry: [string, unknown]): entry is [string, string] => typeof entry[1] === 'string',
  );

  return (
    <AdminSection
      block="user-details"
      className={className}
      title={displayName}
      description={t('admin.users.details.subtitle', {type: user.type})}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onDelete && !user.isReadOnly && (
            <ConfirmButton
              confirmText={t('admin.users.details.delete.confirm', {name: displayName})}
              isLoading={isDeleting}
              onConfirm={onDelete}
            >
              {t('admin.users.details.delete.action')}
            </ConfirmButton>
          )}
        </>
      }
    >
      {error && (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      )}
      <div className={styles['row']}>
        <Avatar name={displayName} size={48} />
        <span className={styles['muted']}>{user.ouHandle ?? user.ouId}</span>
      </div>
      <Panel
        title={t('admin.users.details.attributes')}
        actions={
          onUpdate && !user.isReadOnly && !draft && editableAttributes.length > 0 ? (
            <Button
              variant="outline"
              size="small"
              onClick={(): void => setDraft(Object.fromEntries(editableAttributes))}
            >
              {t('admin.users.details.edit.action')}
            </Button>
          ) : undefined
        }
      >
        {draft ? (
          <form
            className={styles['row']}
            style={{alignItems: 'stretch', flexDirection: 'column'}}
            onSubmit={(event): void => {
              event.preventDefault();
              onUpdate?.({...(user.attributes ?? {}), ...draft});
              setDraft(null);
            }}
          >
            {Object.keys(draft).map((name: string) => (
              <TextField
                key={name}
                name={name}
                label={name}
                aria-label={name}
                value={draft[name]}
                onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                  setDraft((previous: Record<string, string> | null) => ({...previous, [name]: event.target.value}))
                }
              />
            ))}
            <div className={styles['row']} style={{justifyContent: 'flex-end'}}>
              <Button type="button" variant="text" disabled={isUpdating} onClick={(): void => setDraft(null)}>
                {t('admin.common.actions.cancel')}
              </Button>
              <Button type="submit" loading={isUpdating} disabled={isUpdating}>
                {t('admin.users.details.edit.save')}
              </Button>
            </div>
          </form>
        ) : attributes.length > 0 ? (
          <DetailList
            items={attributes.map(([name, value]: [string, unknown]) => ({label: name, value: stringify(value)}))}
          />
        ) : (
          <span className={styles['muted']}>{t('admin.users.details.no_attributes')}</span>
        )}
      </Panel>
      <Panel title={t('admin.users.details.groups')}>
        <ChipList
          label={t('admin.users.details.groups')}
          emptyText={t('admin.users.details.no_groups')}
          items={groups.map((group: MembershipGroup) => ({id: group.id, label: group.name}))}
        />
      </Panel>
    </AdminSection>
  );
};

export default BaseUserDetails;

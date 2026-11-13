// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AccountLifecycleAction,
  EntityTypeSchema,
  hasAdminVerificationStatus,
  isAdminVerifiableAttribute,
  resolveManagedIdentityName,
  ManagedUser,
  MembershipGroup,
  Preferences,
  SendUserAttributeVerificationResult,
  VerifiedAttribute,
} from '@thunderid/browser';
import {ChangeEvent, FC, ReactElement, ReactNode, useState} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import {Avatar} from '../../primitives/Avatar/Avatar';
import Button from '../../primitives/Button/Button';
import {CircleAlert, CircleCheck, Send} from '../../primitives/Icons';
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';
import {AccessStatusBadge, AccountLifecycleButtons} from '../shared/AccountLifecycleParts';
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
  isRunningLifecycleAction: boolean;
  isSendingVerification: boolean;
  isUpdating: boolean;
  /**
   * The account lifecycle actions offered for the user. Empty when none is allowed.
   */
  lifecycleActions: AccountLifecycleAction[];
  /**
   * Deletes the user. Undefined when deletion is not allowed, including for read-only users.
   */
  onDelete?: () => void;
  /**
   * Runs an account lifecycle action, with the operator's note on a suspension. Undefined when none is
   * allowed.
   */
  onLifecycleAction?: (action: AccountLifecycleAction, operatorNote?: string) => void;
  /**
   * Sends the user a link to verify the given attribute. Undefined when sending is not allowed, including
   * for read-only users.
   */
  onSendVerification?: (attribute: string) => void;
  /**
   * Saves the given attributes. Undefined when editing is not allowed, including for read-only users.
   */
  onUpdate?: (attributes: Record<string, unknown>) => void;
  /**
   * What the last sent verification link reported, such as its masked destination.
   */
  sentVerification: SendUserAttributeVerificationResult | null;
  /**
   * The attributes whose verification status is known and for which a link can be sent, verified or not.
   */
  verifiableAttributes: string[];
  /** Visible contact attributes with a known verification status, including mobile numbers. */
  verificationStatusAttributes: string[];
  /**
   * The user's verified attributes, keyed by attribute. Undefined when the server does not report them.
   */
  verifiedAttributes?: Record<string, VerifiedAttribute>;
  user?: ManagedUser;
}

export interface BaseUserDetailsProps {
  /**
   * Controls rendered next to the user's name.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default view. Receives the user, their visible attributes and
   * groups, their verification status, the loading and error state, and the allowed actions.
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
  isRunningLifecycleAction?: boolean;
  isSendingVerification?: boolean;
  isUpdating?: boolean;
  /**
   * The account lifecycle actions to offer (suspend, unsuspend, unlock), shown only with
   * `onLifecycleAction`. They change only runtime state, so they apply to read-only users too.
   */
  lifecycleActions?: AccountLifecycleAction[];
  /**
   * Deletes the user. The delete action is hidden when omitted.
   */
  onDelete?: () => void;
  /**
   * Runs an account lifecycle action. Suspending and unsuspending ask for confirmation first, and a
   * suspension takes an optional operator note.
   */
  onLifecycleAction?: (action: AccountLifecycleAction, operatorNote?: string) => void;
  /**
   * Sends the user a link to verify an attribute. The send action is shown, for an unverified email of a
   * user that is not read-only, only when this is given.
   */
  onSendVerification?: (attribute: string) => void;
  /**
   * Saves edited attributes. Text attributes become editable only when set. Receives every
   * attribute, edited or not.
   */
  onUpdate?: (attributes: Record<string, unknown>) => void;
  preferences?: Preferences;
  /**
   * What the last sent verification link reported. Its masked destination is shown in a success message.
   */
  sentVerification?: SendUserAttributeVerificationResult | null;
  /** The user type schema for identifying contact fields. */
  userSchema?: EntityTypeSchema;
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
  isRunningLifecycleAction = false,
  isSendingVerification = false,
  isUpdating = false,
  lifecycleActions = [],
  onDelete,
  onLifecycleAction,
  onSendVerification,
  onUpdate,
  preferences,
  sentVerification = null,
  user,
  userSchema,
}: BaseUserDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [sendingAttribute, setSendingAttribute] = useState<string | null>(null);
  const visibleAttributeNames: string[] = Object.keys(user?.attributes ?? {}).filter(
    (name: string) => !hiddenAttributes.includes(name),
  );
  const verifiableAttributes: string[] = visibleAttributeNames.filter((name: string) =>
    isAdminVerifiableAttribute(user, name, userSchema),
  );
  const verificationStatusAttributes: string[] = visibleAttributeNames.filter((name: string) =>
    hasAdminVerificationStatus(user, name, userSchema),
  );

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
          isRunningLifecycleAction,
          isSendingVerification,
          isUpdating,
          lifecycleActions: onLifecycleAction && user ? lifecycleActions : [],
          onDelete: isWritable ? onDelete : undefined,
          onLifecycleAction: user ? onLifecycleAction : undefined,
          onSendVerification:
            isWritable && !isUpdating && onSendVerification
              ? (name: string): void => {
                  if (verifiableAttributes.includes(name) && !user?.verifiedAttributes?.[name]) {
                    onSendVerification(name);
                  }
                }
              : undefined,
          onUpdate: isWritable ? onUpdate : undefined,
          sentVerification,
          user,
          verifiableAttributes,
          verificationStatusAttributes,
          verifiedAttributes: user?.verifiedAttributes,
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
          {onLifecycleAction && (
            <AccountLifecycleButtons
              actions={lifecycleActions}
              collectsOperatorNote
              isRunning={isRunningLifecycleAction}
              name={displayName}
              onAction={onLifecycleAction}
            />
          )}
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
      {sentVerification && !error && (
        <Alert
          variant={sentVerification.emailSent === false ? 'error' : 'success'}
          role={sentVerification.emailSent === false ? 'alert' : 'status'}
        >
          {sentVerification.emailSent === false
            ? t('admin.users.details.verification.error')
            : sentVerification.maskedDestination
              ? t('admin.users.details.verification.sent', {destination: sentVerification.maskedDestination})
              : t('admin.users.details.verification.sent_generic')}
        </Alert>
      )}
      <div className={styles['row']}>
        <Avatar name={displayName} size={48} />
        <span className={styles['muted']}>{user.ouHandle ?? user.ouId}</span>
        <AccessStatusBadge status={user.status?.value} />
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
            items={attributes.map(([name, value]: [string, unknown]) => {
              if (!verificationStatusAttributes.includes(name)) {
                return {label: name, value: stringify(value)};
              }

              const verified: boolean = Boolean(user.verifiedAttributes?.[name]);
              return {
                label: name,
                value: (
                  <span className={styles['verificationRow']}>
                    <span className={styles['verificationValue']}>
                      <span>{stringify(value)}</span>
                      <span
                        className={`${styles['statusChip']} ${
                          verified ? styles['statusChipSuccess'] : styles['statusChipWarning']
                        }`}
                      >
                        {verified ? (
                          <CircleCheck width={12} height={12} aria-hidden="true" />
                        ) : (
                          <CircleAlert width={12} height={12} aria-hidden="true" />
                        )}
                        {verified
                          ? t('admin.users.details.verification.status.verified')
                          : t('admin.users.details.verification.status.unverified')}
                      </span>
                    </span>
                    {onSendVerification && !user.isReadOnly && verifiableAttributes.includes(name) && !verified && (
                      <Button
                        variant="text"
                        size="small"
                        aria-label={`${t('admin.users.details.verification.verify')} ${name}`}
                        startIcon={<Send width={14} height={14} aria-hidden="true" />}
                        loading={isSendingVerification && sendingAttribute === name}
                        disabled={isSendingVerification || isUpdating}
                        onClick={(): void => {
                          setSendingAttribute(name);
                          onSendVerification(name);
                        }}
                      >
                        {t('admin.users.details.verification.verify')}
                      </Button>
                    )}
                  </span>
                ),
              };
            })}
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

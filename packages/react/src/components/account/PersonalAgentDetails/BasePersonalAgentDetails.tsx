// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Agent,
  OAuth2Config,
  PERSONAL_AGENT_GRANT_TYPE_LABEL_KEYS,
  PERSONAL_AGENT_GRANT_TYPES,
  Preferences,
  SuspensionAppliedBy,
  UpdateMeAgentRequest,
  PersonalAgentFormValues,
  getAgentName,
  getMeAgentSuspensionAction,
  getPersonalAgentOAuthConfig,
  isPersonalAgentFormValid,
  toPersonalAgentFormValues,
  toUpdateMeAgentRequest,
} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import {AccessStatusBadge} from '../../management/shared/AccountLifecycleParts';
import {ConfirmButton, DetailList, DetailListItem, Panel} from '../../management/shared/AdminParts';
import AdminSection from '../../management/shared/AdminSection';
import useAdminPartStyles from '../../management/shared/useAdminPartStyles';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Checkbox from '../../primitives/Checkbox/Checkbox';
import CopyableText from '../../primitives/CopyableText/CopyableText';
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';

/**
 * What {@link BasePersonalAgentDetails} hands its `children` render function, so the agent can be shown with
 * any UI. An action is undefined when the app has not turned it on, or when it does not apply to the agent.
 */
export interface BasePersonalAgentDetailsRenderProps {
  agent?: Agent;
  error: string | null;
  isChangingSuspension: boolean;
  isDeleting: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  /**
   * The agent's OAuth configuration. Undefined when it has no OAuth client.
   */
  oauth?: OAuth2Config;
  /**
   * Deletes the agent. The built-in UI asks for confirmation first, and a custom render must too.
   */
  onDelete?: () => void;
  /**
   * Places the owner's suspension on the agent. Offered unless the owner already holds it suspended.
   */
  onSuspend?: () => void;
  /**
   * Lifts the owner's suspension of the agent. Offered only while the owner holds it suspended.
   */
  onUnsuspend?: () => void;
  /**
   * Replaces the editable part of the agent. Returns a promise that resolves to `false` when the update fails.
   */
  onUpdate?: (changes: UpdateMeAgentRequest) => void | Promise<boolean>;
}

export interface BasePersonalAgentDetailsProps {
  /**
   * Controls rendered next to the agent's name.
   */
  actions?: ReactNode;
  agent?: Agent;
  /**
   * Renders custom UI in place of the default view. Receives the agent, its OAuth configuration, the loading
   * and error state, and the actions the app has turned on that apply to the agent.
   */
  children?: (props: BasePersonalAgentDetailsRenderProps) => ReactNode;
  className?: string;
  error?: string | null;
  isChangingSuspension?: boolean;
  isDeleting?: boolean;
  isLoading?: boolean;
  isUpdating?: boolean;
  /**
   * Deletes the agent. The delete action is hidden when omitted, and for a declarative agent.
   */
  onDelete?: () => void;
  /**
   * Places the owner's suspension on the agent. The suspend action is hidden when omitted.
   */
  onSuspend?: () => void;
  /**
   * Lifts the owner's suspension of the agent. Shown only while the owner holds the agent suspended.
   */
  onUnsuspend?: () => void;
  /**
   * Replaces the editable part of the agent. The edit action is hidden when omitted, and for a declarative
   * agent. When it returns a promise, the form stays open until the promise settles, and stays open with the
   * changes if it resolves to `false` or rejects.
   */
  onUpdate?: (changes: UpdateMeAgentRequest) => void | Promise<boolean>;
  preferences?: Preferences;
}

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean);
};

/**
 * Shows one of the signed-in user's personal agents with the actions its owner can take. Holds no data of its
 * own: pass the agent and handle editing, deletion and the owner's suspension, each offered only when its
 * handler is set.
 */
const BasePersonalAgentDetails: FC<BasePersonalAgentDetailsProps> = ({
  actions,
  agent,
  children,
  className,
  error = null,
  isChangingSuspension = false,
  isDeleting = false,
  isLoading = false,
  isUpdating = false,
  onDelete,
  onSuspend,
  onUnsuspend,
  onUpdate,
  preferences,
}: BasePersonalAgentDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();
  // The draft remembers which agent it was opened for, so switching the agent closes the form instead of
  // saving one agent's values onto another.
  const [editing, setEditing] = useState<{agentId: string; values: PersonalAgentFormValues} | null>(null);
  // Switching to another agent discards the draft, so coming back to this one starts from what the server holds.
  const [shownAgentId, setShownAgentId] = useState<string | undefined>(agent?.id);
  if (shownAgentId !== agent?.id) {
    setShownAgentId(agent?.id);
    setEditing(null);
  }
  const draft: PersonalAgentFormValues | null = editing && editing.agentId === agent?.id ? editing.values : null;
  const setDraft = (update: (previous: PersonalAgentFormValues) => PersonalAgentFormValues): void =>
    setEditing(
      (previous: {agentId: string; values: PersonalAgentFormValues} | null) =>
        previous && {...previous, values: update(previous.values)},
    );

  const isWritable: boolean = Boolean(agent) && !agent?.isReadOnly;
  const suspensionAction: 'suspend' | 'unsuspend' = getMeAgentSuspensionAction(agent?.status);
  const canSuspend: boolean = Boolean(agent) && suspensionAction === 'suspend';
  const canUnsuspend: boolean = Boolean(agent) && suspensionAction === 'unsuspend';

  if (children) {
    return (
      <div className={className}>
        {children({
          agent,
          error,
          isChangingSuspension,
          isDeleting,
          isLoading,
          isUpdating,
          oauth: agent ? getPersonalAgentOAuthConfig(agent) : undefined,
          onDelete: isWritable ? onDelete : undefined,
          onSuspend: canSuspend ? onSuspend : undefined,
          onUnsuspend: canUnsuspend ? onUnsuspend : undefined,
          onUpdate: isWritable ? onUpdate : undefined,
        })}
      </div>
    );
  }

  if (isLoading && !agent) {
    return (
      <AdminSection block="personal-agent-details" className={className} preferences={preferences}>
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      </AdminSection>
    );
  }

  if (!agent) {
    return (
      <AdminSection block="personal-agent-details" className={className} preferences={preferences}>
        <Alert variant="error" role="alert">
          {error ?? t('admin.common.errors.not_found')}
        </Alert>
      </AdminSection>
    );
  }

  const name: string = getAgentName(agent);
  const oauth: OAuth2Config | undefined = getPersonalAgentOAuthConfig(agent);
  const grantTypeLabel = (grantType: string): string =>
    PERSONAL_AGENT_GRANT_TYPE_LABEL_KEYS[grantType] ? t(PERSONAL_AGENT_GRANT_TYPE_LABEL_KEYS[grantType]) : grantType;
  const appliedBy: SuspensionAppliedBy[] =
    agent.status?.value === 'SUSPENDED' ? (agent.status.details?.appliedBy ?? []) : [];

  const none: ReactNode = <span className={styles['muted']}>{t('user.agents.details.none')}</span>;
  const overview: DetailListItem[] = [
    {
      label: t('user.agents.list.columns.status'),
      value: <AccessStatusBadge status={agent.status?.value} />,
    },
    {
      label: t('user.agents.details.client_id'),
      value: agent.clientId ? <CopyableText value={agent.clientId} /> : none,
    },
    {
      label: t('user.agents.details.grant_types'),
      value: oauth?.grantTypes?.length ? oauth.grantTypes.map(grantTypeLabel).join(', ') : none,
    },
    {
      label: t('user.agents.details.redirect_uris'),
      value: oauth?.redirectUris?.length ? oauth.redirectUris.map((uri: string) => <div key={uri}>{uri}</div>) : none,
    },
  ];
  const attributes: [string, unknown][] = Object.entries(agent.attributes ?? {});

  const handleSave = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!draft || !isPersonalAgentFormValid(draft)) {
      return;
    }

    const savedId: string = agent.id;
    const closeForm = (): void =>
      setEditing((previous: {agentId: string; values: PersonalAgentFormValues} | null) =>
        previous?.agentId === savedId ? null : previous,
      );
    const result: void | Promise<boolean> = onUpdate?.(toUpdateMeAgentRequest(agent, draft));

    if (!result) {
      closeForm();
      return;
    }

    // Keeps the changes until the update succeeds, so a failed save can be corrected and retried.
    result.then(
      (saved: boolean): void => {
        if (saved !== false) {
          closeForm();
        }
      },
      (): void => undefined,
    );
  };

  const setField = (field: keyof Omit<PersonalAgentFormValues, 'attributes' | 'grantTypes'>, value: string): void =>
    setDraft((previous: PersonalAgentFormValues) => ({...previous, [field]: value}));

  return (
    <AdminSection
      block="personal-agent-details"
      className={className}
      title={name}
      description={agent.description}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onUnsuspend && canUnsuspend && (
            <Button
              variant="outline"
              loading={isChangingSuspension}
              disabled={isChangingSuspension}
              onClick={onUnsuspend}
            >
              {t('user.agents.unsuspend.action')}
            </Button>
          )}
          {onSuspend && canSuspend && (
            <ConfirmButton
              confirmText={t('user.agents.suspend.confirm', {name})}
              isLoading={isChangingSuspension}
              onConfirm={onSuspend}
            >
              {t('user.agents.suspend.action')}
            </ConfirmButton>
          )}
          {onDelete && isWritable && (
            <ConfirmButton
              confirmText={t('user.agents.delete.confirm', {name})}
              isLoading={isDeleting}
              onConfirm={onDelete}
            >
              {t('user.agents.delete.action')}
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
      {appliedBy.map((party: SuspensionAppliedBy) => (
        <Alert key={party} variant={party === 'owner' ? 'info' : 'warning'} role="status">
          {t(`user.agents.suspension.${party}`)}
        </Alert>
      ))}
      {draft ? (
        <Panel title={t('user.agents.edit.title')}>
          <form
            className={styles['row']}
            style={{alignItems: 'stretch', flexDirection: 'column'}}
            onSubmit={handleSave}
            noValidate
          >
            <TextField
              name="name"
              label={t('user.agents.fields.name')}
              value={draft.name}
              required
              autoComplete="off"
              onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('name', event.target.value)}
            />
            {Object.keys(draft.attributes).map((attribute: string) => (
              <TextField
                key={attribute}
                name={`attribute-${attribute}`}
                label={attribute}
                value={draft.attributes[attribute]}
                autoComplete="off"
                onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                  setDraft((previous: PersonalAgentFormValues) => ({
                    ...previous,
                    attributes: {...previous.attributes, [attribute]: event.target.value},
                  }))
                }
              />
            ))}
            <TextField
              name="description"
              label={t('user.agents.fields.description')}
              value={draft.description}
              autoComplete="off"
              onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('description', event.target.value)}
            />
            <TextField
              name="redirectUris"
              label={t('user.agents.details.redirect_uris')}
              helperText={t('user.agents.fields.redirect_uris_hint')}
              value={draft.redirectUris}
              autoComplete="off"
              onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('redirectUris', event.target.value)}
            />
            <fieldset className={styles['row']} style={{border: 0, flexWrap: 'wrap', margin: 0, padding: 0}}>
              <legend className={styles['muted']}>{t('user.agents.details.grant_types')}</legend>
              {PERSONAL_AGENT_GRANT_TYPES.map((grantType: string) => (
                <Checkbox
                  key={grantType}
                  name={`grantType-${grantType}`}
                  label={grantTypeLabel(grantType)}
                  checked={draft.grantTypes.includes(grantType)}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                    setDraft((previous: PersonalAgentFormValues) => ({
                      ...previous,
                      grantTypes: event.target.checked
                        ? [...previous.grantTypes, grantType]
                        : previous.grantTypes.filter((value: string) => value !== grantType),
                    }))
                  }
                />
              ))}
            </fieldset>
            <div className={styles['row']} style={{justifyContent: 'flex-end'}}>
              <Button type="button" variant="text" disabled={isUpdating} onClick={(): void => setEditing(null)}>
                {t('admin.common.actions.cancel')}
              </Button>
              <Button type="submit" loading={isUpdating} disabled={isUpdating || !isPersonalAgentFormValid(draft)}>
                {t('user.agents.edit.save')}
              </Button>
            </div>
          </form>
        </Panel>
      ) : (
        <>
          <Panel
            title={t('user.agents.details.overview')}
            actions={
              onUpdate && isWritable ? (
                <Button
                  variant="outline"
                  size="small"
                  onClick={(): void => setEditing({agentId: agent.id, values: toPersonalAgentFormValues(agent)})}
                >
                  {t('user.agents.edit.action')}
                </Button>
              ) : undefined
            }
          >
            <DetailList items={overview} />
          </Panel>
          <Panel title={t('user.agents.details.attributes')}>
            {attributes.length > 0 ? (
              <DetailList
                items={attributes.map(([name, value]: [string, unknown]) => ({label: name, value: stringify(value)}))}
              />
            ) : (
              none
            )}
          </Panel>
        </>
      )}
    </AdminSection>
  );
};

export default BasePersonalAgentDetails;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  OrganizationUnit,
  OrganizationUnitBasic,
  OrganizationUnitGroup,
  OrganizationUnitRole,
  OrganizationUnitUser,
  Preferences,
} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';
import {ChipList, ConfirmButton, DetailList, Panel} from '../shared/AdminParts';
import AdminSection from '../shared/AdminSection';
import useAdminPartStyles from '../shared/useAdminPartStyles';

/**
 * The changes {@link BaseOrganizationUnitDetails} submits.
 */
export interface OrganizationUnitUpdateSubmission {
  description?: string;
  handle: string;
  name: string;
}

/**
 * What an organization unit holds, as {@link BaseOrganizationUnitDetails} shows it: the first page of each list
 * and, when known, how many there are in all.
 */
export interface OrganizationUnitContents {
  childUnits: OrganizationUnitBasic[];
  groups: OrganizationUnitGroup[];
  roles: OrganizationUnitRole[];
  /**
   * How many of each the unit holds in all, when the server said.
   */
  totals?: Partial<Record<'childUnits' | 'groups' | 'roles' | 'users', number>>;
  users: OrganizationUnitUser[];
}

/**
 * What {@link BaseOrganizationUnitDetails} hands its `children` render function, so the unit can be shown with any
 * UI.
 */
export interface BaseOrganizationUnitDetailsRenderProps {
  /**
   * The unit's child units, users, groups and roles. Read only.
   */
  contents: OrganizationUnitContents;
  /**
   * A translated message when the contents could not be loaded, or `null`.
   */
  contentsError: string | null;
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isLoadingContents: boolean;
  isUpdating: boolean;
  /**
   * Deletes the unit. Undefined when deletion is not allowed.
   */
  onDelete?: () => void;
  /**
   * Chooses a child unit. Undefined when child units are not selectable.
   */
  onSelectChild?: (organizationUnit: OrganizationUnitBasic) => void;
  /**
   * Saves a new name, handle and description. Undefined when editing is not allowed.
   */
  onUpdate?: (changes: OrganizationUnitUpdateSubmission) => void;
  organizationUnit?: OrganizationUnit;
  /**
   * The parent unit, when it is known.
   */
  parent?: OrganizationUnit | OrganizationUnitBasic;
}

export interface BaseOrganizationUnitDetailsProps {
  /**
   * Controls rendered next to the unit's name.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default view. Receives the unit, what it holds, the loading and
   * error state, and the update and delete handlers.
   */
  children?: (props: BaseOrganizationUnitDetailsRenderProps) => ReactNode;
  className?: string;
  contents?: Partial<OrganizationUnitContents>;
  contentsError?: string | null;
  error?: string | null;
  isDeleting?: boolean;
  isLoading?: boolean;
  isLoadingContents?: boolean;
  isUpdating?: boolean;
  /**
   * Deletes the unit. The delete action is hidden when omitted.
   */
  onDelete?: () => void;
  /**
   * Called when a child unit is chosen. Child units are selectable only when set.
   */
  onSelectChild?: (organizationUnit: OrganizationUnitBasic) => void;
  /**
   * Saves a new name, handle and description. The edit action is hidden when omitted.
   */
  onUpdate?: (changes: OrganizationUnitUpdateSubmission) => void;
  organizationUnit?: OrganizationUnit;
  /**
   * The parent unit, shown by name when given.
   */
  parent?: OrganizationUnit | OrganizationUnitBasic;
  preferences?: Preferences;
}

/**
 * Shows an organization unit's name, handle, description and parent, with its child units and the
 * users, groups and roles in it, and lets the caller edit and delete it. Holds no data of its own:
 * pass the unit and what it holds, and handle the changes.
 */
const BaseOrganizationUnitDetails: FC<BaseOrganizationUnitDetailsProps> = ({
  actions,
  children,
  className,
  contents,
  contentsError = null,
  error = null,
  isDeleting = false,
  isLoading = false,
  isLoadingContents = false,
  isUpdating = false,
  onDelete,
  onSelectChild,
  onUpdate,
  organizationUnit,
  parent,
  preferences,
}: BaseOrganizationUnitDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();
  const [draft, setDraft] = useState<{description: string; handle: string; name: string} | null>(null);

  const resolvedContents: OrganizationUnitContents = {
    childUnits: contents?.childUnits ?? [],
    groups: contents?.groups ?? [],
    roles: contents?.roles ?? [],
    totals: contents?.totals ?? {},
    users: contents?.users ?? [],
  };

  if (children) {
    return (
      <div className={className}>
        {children({
          contents: resolvedContents,
          contentsError,
          error,
          isDeleting,
          isLoading,
          isLoadingContents,
          isUpdating,
          onDelete: organizationUnit ? onDelete : undefined,
          onSelectChild,
          onUpdate: organizationUnit ? onUpdate : undefined,
          organizationUnit,
          parent,
        })}
      </div>
    );
  }

  if (isLoading && !organizationUnit) {
    return (
      <AdminSection block="organization-unit-details" className={className} preferences={preferences}>
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      </AdminSection>
    );
  }

  if (!organizationUnit) {
    return (
      <AdminSection block="organization-unit-details" className={className} preferences={preferences}>
        <Alert variant="error" role="alert">
          {error ?? t('admin.common.errors.not_found')}
        </Alert>
      </AdminSection>
    );
  }

  const notSet: string = t('admin.organization_units.details.not_set');
  const isDraftValid = Boolean(draft?.name.trim() && draft?.handle.trim());

  const handleSave = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (draft && isDraftValid) {
      onUpdate?.({
        description: draft.description.trim() || undefined,
        handle: draft.handle.trim(),
        name: draft.name.trim(),
      });
      setDraft(null);
    }
  };

  const titled = (key: string, items: unknown[], total?: number): string => `${t(key)} (${total ?? items.length})`;

  const renderContents = (): ReactNode => {
    if (isLoadingContents) {
      return (
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      );
    }

    if (contentsError) {
      return (
        <Alert variant="error" role="alert">
          {contentsError}
        </Alert>
      );
    }

    const {childUnits, groups, roles, totals, users} = resolvedContents;

    return (
      <>
        <Panel title={titled('admin.organization_units.details.children', childUnits, totals?.childUnits)}>
          {onSelectChild && childUnits.length > 0 ? (
            <ul className={styles['chipList']} aria-label={t('admin.organization_units.details.children')}>
              {childUnits.map((unit: OrganizationUnitBasic) => (
                <li key={unit.id}>
                  <Button variant="outline" size="small" onClick={(): void => onSelectChild(unit)}>
                    {unit.name}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <ChipList
              label={t('admin.organization_units.details.children')}
              emptyText={t('admin.organization_units.details.children_empty')}
              items={childUnits.map((unit: OrganizationUnitBasic) => ({id: unit.id, label: unit.name}))}
            />
          )}
        </Panel>
        <Panel title={titled('admin.organization_units.details.users', users, totals?.users)}>
          <ChipList
            label={t('admin.organization_units.details.users')}
            emptyText={t('admin.organization_units.details.users_empty')}
            items={users.map((user: OrganizationUnitUser) => ({id: user.id, label: user.display ?? user.id}))}
          />
        </Panel>
        <Panel title={titled('admin.organization_units.details.groups', groups, totals?.groups)}>
          <ChipList
            label={t('admin.organization_units.details.groups')}
            emptyText={t('admin.organization_units.details.groups_empty')}
            items={groups.map((group: OrganizationUnitGroup) => ({id: group.id, label: group.name}))}
          />
        </Panel>
        <Panel title={titled('admin.organization_units.details.roles', roles, totals?.roles)}>
          <ChipList
            label={t('admin.organization_units.details.roles')}
            emptyText={t('admin.organization_units.details.roles_empty')}
            items={roles.map((role: OrganizationUnitRole) => ({id: role.id, label: role.name}))}
          />
        </Panel>
      </>
    );
  };

  let parentLabel: string = t('admin.organization_units.fields.parent_none');

  if (organizationUnit.parent) {
    parentLabel = parent?.name ?? organizationUnit.parent;
  }

  return (
    <AdminSection
      block="organization-unit-details"
      className={className}
      title={organizationUnit.name}
      description={organizationUnit.description}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onDelete && (
            <ConfirmButton
              confirmText={t('admin.organization_units.details.delete.confirm', {name: organizationUnit.name})}
              isLoading={isDeleting}
              onConfirm={onDelete}
            >
              {t('admin.organization_units.details.delete.action')}
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
      {draft ? (
        <Panel title={t('admin.organization_units.details.edit.action')}>
          <form
            className={styles['row']}
            style={{alignItems: 'stretch', flexDirection: 'column'}}
            onSubmit={handleSave}
            noValidate
          >
            <TextField
              name="name"
              label={t('admin.organization_units.fields.name')}
              required
              value={draft.name}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => setDraft({...draft, name: event.target.value})}
            />
            <TextField
              name="handle"
              label={t('admin.organization_units.fields.handle')}
              required
              value={draft.handle}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                setDraft({...draft, handle: event.target.value})
              }
            />
            <TextField
              name="description"
              label={t('admin.organization_units.fields.description')}
              value={draft.description}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                setDraft({...draft, description: event.target.value})
              }
            />
            <div className={styles['row']} style={{justifyContent: 'flex-end'}}>
              <Button type="button" variant="text" disabled={isUpdating} onClick={(): void => setDraft(null)}>
                {t('admin.common.actions.cancel')}
              </Button>
              <Button type="submit" loading={isUpdating} disabled={isUpdating || !isDraftValid}>
                {t('admin.organization_units.details.edit.save')}
              </Button>
            </div>
          </form>
        </Panel>
      ) : (
        <Panel
          title={t('admin.organization_units.details.overview')}
          actions={
            onUpdate ? (
              <Button
                variant="outline"
                size="small"
                onClick={(): void =>
                  setDraft({
                    description: organizationUnit.description ?? '',
                    handle: organizationUnit.handle,
                    name: organizationUnit.name,
                  })
                }
              >
                {t('admin.organization_units.details.edit.action')}
              </Button>
            ) : undefined
          }
        >
          <DetailList
            items={[
              {label: t('admin.organization_units.fields.name'), value: organizationUnit.name},
              {label: t('admin.organization_units.fields.handle'), value: organizationUnit.handle},
              {
                label: t('admin.organization_units.fields.description'),
                value: organizationUnit.description?.length ? organizationUnit.description : notSet,
              },
              {label: t('admin.organization_units.fields.parent'), value: parentLabel},
            ]}
          />
        </Panel>
      )}
      {renderContents()}
    </AdminSection>
  );
};

export default BaseOrganizationUnitDetails;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  OverlayRule,
  Preferences,
  ResolvedOverlay,
  SharingPolicy,
  SharingPolicyFormValues,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
  describeSharingPolicyScope,
  isSharingPolicyFormValid,
  toSharingPolicyFormValues,
  toSharingPolicyRequest,
  toSharingPolicyUpdateRequest,
} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import DataTable, {DataTableColumn} from '../../primitives/DataTable/DataTable';
import Select from '../../primitives/Select/Select';
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';
import {ConfirmButton, DetailList, DetailListItem, Panel} from '../shared/AdminParts';
import AdminSection from '../shared/AdminSection';
import useAdminPartStyles from '../shared/useAdminPartStyles';

/**
 * What {@link BaseSharingPolicies} hands its `children` render function, so the policies can be shown with any UI.
 */
export interface BaseSharingPoliciesRenderProps {
  /**
   * The columns the default table shows, with translated headers and cell renderers.
   */
  columns: DataTableColumn<SharingPolicy>[];
  /**
   * Describes, in translated words, which organization units a policy reaches: one line per section.
   */
  describeScope: (policy: SharingPolicy) => string[];
  /**
   * A translated message when the policies could not be loaded, or `null`.
   */
  error: string | null;
  isLoading: boolean;
  isLoadingOverlay: boolean;
  isSubmitting: boolean;
  limit: number;
  /**
   * A translated message when a create, update or delete failed, or `null`.
   */
  mutationError: string | null;
  offset: number;
  /**
   * Creates a policy. Undefined unless editing is allowed.
   */
  onCreate?: (request: SharingPolicyRequest) => void;
  /**
   * Deletes a policy; ask for confirmation first. Undefined unless editing is allowed. Does nothing for a
   * read-only policy.
   */
  onDelete?: (policy: SharingPolicy) => void;
  /**
   * Shows the page that starts at `offset`. Undefined when the list is not paginated.
   */
  onPageChange?: (offset: number) => void;
  /**
   * Replaces a policy's sections. Undefined unless editing is allowed. Does nothing for a read-only policy.
   */
  onUpdate?: (policy: SharingPolicy, request: SharingPolicyUpdateRequest) => void;
  /**
   * The overlay rules that apply in `overlayOuId`, when one was given.
   */
  overlay?: ResolvedOverlay;
  overlayError: string | null;
  overlayOuId?: string;
  policies: SharingPolicy[];
  totalResults: number;
}

export interface BaseSharingPoliciesProps {
  /**
   * Controls rendered next to the title.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default view. Receives the policies, the paging, the loading and
   * error state, the overlay rules, and the create, update and delete handlers when editing is allowed.
   */
  children?: (props: BaseSharingPoliciesRenderProps) => ReactNode;
  className?: string;
  description?: string;
  /**
   * A translated message when the policies could not be loaded, or `null`.
   */
  error?: string | null;
  isLoading?: boolean;
  isLoadingOverlay?: boolean;
  isSubmitting?: boolean;
  /**
   * Page size.
   * @default 20
   */
  limit?: number;
  /**
   * A translated message when a create, update or delete failed, or `null`.
   */
  mutationError?: string | null;
  offset?: number;
  /**
   * Creates a policy. The add action is hidden when omitted.
   */
  onCreate?: (request: SharingPolicyRequest) => void;
  /**
   * Deletes a policy, after the user confirms. The delete action is hidden when omitted.
   */
  onDelete?: (policy: SharingPolicy) => void;
  /**
   * Called with the offset of the page to show. Pagination is hidden when omitted.
   */
  onPageChange?: (offset: number) => void;
  /**
   * Replaces a policy's sections. The edit action is hidden when omitted.
   */
  onUpdate?: (policy: SharingPolicy, request: SharingPolicyUpdateRequest) => void;
  /**
   * The overlay rules that apply in `overlayOuId`.
   */
  overlay?: ResolvedOverlay;
  overlayError?: string | null;
  /**
   * The organization unit whose overlay rules are shown, read only.
   */
  overlayOuId?: string;
  policies: SharingPolicy[];
  preferences?: Preferences;
  /**
   * Heading of the view. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
}

interface Draft {
  policy?: SharingPolicy;
  values: SharingPolicyFormValues;
}

const isOwned = (overlay: ResolvedOverlay): boolean => Boolean(overlay.isOwned ?? overlay.isOwnedByOU ?? overlay.owned);

/**
 * Lists the sharing policies of one resource (a user, an application, a role or a flow) with the
 * organization units each reaches, lets the caller add, edit and delete them, and shows the overlay
 * rules that apply in one unit. Holds no data of its own: pass the policies and handle the changes.
 */
const BaseSharingPolicies: FC<BaseSharingPoliciesProps> = ({
  actions,
  children,
  className,
  description,
  error = null,
  isLoading = false,
  isLoadingOverlay = false,
  isSubmitting = false,
  limit = 20,
  mutationError = null,
  offset = 0,
  onCreate,
  onDelete,
  onPageChange,
  onUpdate,
  overlay,
  overlayError = null,
  overlayOuId,
  policies,
  preferences,
  title,
  totalResults,
}: BaseSharingPoliciesProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();
  const [draft, setDraft] = useState<Draft | null>(null);

  const describeScope = (policy: SharingPolicy): string[] => describeSharingPolicyScope(t, policy);
  const canChange = (policy: SharingPolicy): boolean => !policy.isReadOnly;

  const columns: DataTableColumn<SharingPolicy>[] = [
    {
      header: t('admin.sharing.columns.scope'),
      id: 'scope',
      render: (policy: SharingPolicy): ReactNode => (
        <span style={{display: 'flex', flexDirection: 'column'}}>
          {describeScope(policy).map((line: string) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      ),
    },
    {
      header: t('admin.sharing.columns.stage'),
      id: 'stage',
      render: (policy: SharingPolicy): ReactNode =>
        policy.stage === 'reshare' ? t('admin.sharing.stage.reshare') : t('admin.sharing.stage.share'),
    },
    {
      header: t('admin.sharing.columns.version'),
      id: 'version',
      render: (policy: SharingPolicy): ReactNode => policy.version ?? '',
    },
  ];

  if (onUpdate || onDelete) {
    columns.push({
      header: t('admin.common.columns.actions'),
      id: 'actions',
      render: (policy: SharingPolicy): ReactNode =>
        canChange(policy) ? (
          <span className={styles['row']}>
            {onUpdate && (
              <Button
                variant="outline"
                size="small"
                disabled={isSubmitting}
                onClick={(): void => setDraft({policy, values: toSharingPolicyFormValues(policy)})}
              >
                {t('admin.sharing.actions.edit')}
              </Button>
            )}
            {onDelete && (
              <ConfirmButton
                confirmText={t('admin.sharing.delete.confirm')}
                isLoading={isSubmitting}
                onConfirm={(): void => onDelete(policy)}
              >
                {t('admin.sharing.actions.delete')}
              </ConfirmButton>
            )}
          </span>
        ) : (
          <span className={styles['muted']}>{t('admin.sharing.read_only')}</span>
        ),
    });
  }

  if (children) {
    return (
      <div className={className}>
        {children({
          columns,
          describeScope,
          error,
          isLoading,
          isLoadingOverlay,
          isSubmitting,
          limit,
          mutationError,
          offset,
          onCreate,
          onDelete: onDelete
            ? (policy: SharingPolicy): void => {
                if (canChange(policy)) onDelete(policy);
              }
            : undefined,
          onPageChange,
          onUpdate: onUpdate
            ? (policy: SharingPolicy, request: SharingPolicyUpdateRequest): void => {
                if (canChange(policy)) onUpdate(policy, request);
              }
            : undefined,
          overlay,
          overlayError,
          overlayOuId,
          policies,
          totalResults: totalResults ?? policies.length,
        })}
      </div>
    );
  }

  const setValue = <K extends keyof SharingPolicyFormValues>(field: K, value: SharingPolicyFormValues[K]): void =>
    setDraft((previous: Draft | null) => previous && {...previous, values: {...previous.values, [field]: value}});

  const handleSave = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!draft || !isSharingPolicyFormValid(draft.values, draft.policy)) {
      return;
    }

    if (draft.policy) {
      onUpdate?.(draft.policy, toSharingPolicyUpdateRequest(draft.values, draft.policy));
    } else {
      onCreate?.(toSharingPolicyRequest(draft.values));
    }

    setDraft(null);
  };

  const renderForm = (current: Draft): ReactElement => {
    const {values} = current;
    const keepsSections: boolean = Boolean(current.policy?.allUnits) || current.policy?.otherTreeRoots?.mode === 'all';

    return (
      <Panel title={current.policy ? t('admin.sharing.form.edit_title') : t('admin.sharing.form.create_title')}>
        <form
          className={styles['row']}
          style={{alignItems: 'stretch', flexDirection: 'column'}}
          onSubmit={handleSave}
          noValidate
        >
          {keepsSections && <span className={styles['muted']}>{t('admin.sharing.form.kept_sections')}</span>}
          <Select
            name="childUnitsMode"
            label={t('admin.sharing.form.child_units')}
            options={[
              {label: t('admin.sharing.form.child_units_none'), value: 'none'},
              {label: t('admin.sharing.form.child_units_all'), value: 'all'},
              {label: t('admin.sharing.form.child_units_selected'), value: 'selected'},
            ]}
            value={values.childUnitsMode}
            onChange={(event: ChangeEvent<HTMLSelectElement>): void =>
              setValue('childUnitsMode', event.target.value as SharingPolicyFormValues['childUnitsMode'])
            }
          />
          {values.childUnitsMode === 'all' && (
            <TextField
              name="excludedOuIds"
              label={t('admin.sharing.form.excluded_units')}
              helperText={t('admin.sharing.form.ids_hint')}
              value={values.excludedOuIds}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => setValue('excludedOuIds', event.target.value)}
            />
          )}
          {values.childUnitsMode === 'selected' && (
            <>
              <TextField
                name="selectedOuIds"
                label={t('admin.sharing.form.selected_units')}
                helperText={t('admin.sharing.form.ids_hint')}
                required
                value={values.selectedOuIds}
                onChange={(event: ChangeEvent<HTMLInputElement>): void => setValue('selectedOuIds', event.target.value)}
              />
              <Select
                name="reach"
                label={t('admin.sharing.form.reach')}
                options={[
                  {label: t('admin.sharing.form.reach_subtree'), value: 'subtree'},
                  {label: t('admin.sharing.form.reach_unit'), value: 'unit'},
                ]}
                value={values.reach}
                onChange={(event: ChangeEvent<HTMLSelectElement>): void =>
                  setValue('reach', event.target.value as SharingPolicyFormValues['reach'])
                }
              />
            </>
          )}
          {current.policy?.otherTreeRoots?.mode !== 'all' && (
            <TextField
              name="otherTreeRootOuIds"
              label={t('admin.sharing.form.other_tree_roots')}
              helperText={t('admin.sharing.form.ids_hint')}
              value={values.otherTreeRootOuIds}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                setValue('otherTreeRootOuIds', event.target.value)
              }
            />
          )}
          <div className={styles['row']} style={{justifyContent: 'flex-end'}}>
            <Button type="button" variant="text" disabled={isSubmitting} onClick={(): void => setDraft(null)}>
              {t('admin.common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || !isSharingPolicyFormValid(values, current.policy)}
            >
              {t('admin.sharing.actions.save')}
            </Button>
          </div>
        </form>
      </Panel>
    );
  };

  const renderOverlay = (): ReactNode => {
    if (!overlayOuId) {
      return null;
    }

    let body: ReactNode;

    if (isLoadingOverlay) {
      body = (
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      );
    } else if (overlayError) {
      body = (
        <Alert variant="error" role="alert">
          {overlayError}
        </Alert>
      );
    } else if (overlay) {
      let access: string = t('admin.sharing.overlay.not_shared');

      if (isOwned(overlay)) {
        access = t('admin.sharing.overlay.owned');
      } else if (overlay.visible !== false && (overlay.policyIds?.length ?? 0) > 0) {
        access = t('admin.sharing.overlay.shared');
      }

      const rules: [string, OverlayRule][] = Object.entries(overlay.rules ?? {});
      const items: DetailListItem[] = [{label: t('admin.sharing.columns.scope'), value: access}];

      if (overlay.policyIds?.length) {
        items.push({label: t('admin.sharing.overlay.policies'), value: overlay.policyIds.join(', ')});
      }

      rules.forEach(([field, rule]: [string, OverlayRule]) => {
        const parts: string[] = [
          rule.value?.length ? t('admin.sharing.overlay.value', {values: rule.value.join(', ')}) : '',
          rule.allowedValues?.length ? t('admin.sharing.overlay.allowed', {values: rule.allowedValues.join(', ')}) : '',
          rule.excludedValues?.length
            ? t('admin.sharing.overlay.excluded', {values: rule.excludedValues.join(', ')})
            : '',
          rule.editable ? t('admin.sharing.overlay.editable') : '',
        ].filter(Boolean);

        items.push({label: field, value: parts.join(' · ') || t('admin.sharing.overlay.no_rules')});
      });

      body = (
        <>
          <DetailList items={items} />
          {rules.length === 0 && <span className={styles['muted']}>{t('admin.sharing.overlay.no_rules')}</span>}
        </>
      );
    }

    return <Panel title={t('admin.sharing.overlay.title', {unit: overlayOuId})}>{body}</Panel>;
  };

  return (
    <AdminSection
      block="sharing-policies"
      className={className}
      title={title ?? t('admin.sharing.title')}
      description={description}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onCreate && !draft && (
            <Button
              variant="outline"
              size="small"
              disabled={isSubmitting}
              onClick={(): void => setDraft({values: toSharingPolicyFormValues()})}
            >
              {t('admin.sharing.actions.create')}
            </Button>
          )}
        </>
      }
    >
      {mutationError && (
        <Alert variant="error" role="alert">
          {mutationError}
        </Alert>
      )}
      {draft && renderForm(draft)}
      <DataTable
        caption={title?.length ? title : t('admin.sharing.title')}
        columns={columns}
        rows={policies}
        getRowId={(policy: SharingPolicy): string => policy.id ?? describeScope(policy).join('|')}
        isLoading={isLoading}
        error={error}
        emptyText={t('admin.sharing.empty')}
        pagination={
          onPageChange ? {limit, offset, onChange: onPageChange, total: totalResults ?? policies.length} : undefined
        }
      />
      {renderOverlay()}
    </AdminSection>
  );
};

export default BaseSharingPolicies;

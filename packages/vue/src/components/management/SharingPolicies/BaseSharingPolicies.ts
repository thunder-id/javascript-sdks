// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  describeSharingPolicyScope,
  isSharingPolicyFormValid,
  toSharingPolicyFormValues,
  toSharingPolicyRequest,
  toSharingPolicyUpdateRequest,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import type {
  OverlayRule,
  Preferences,
  ResolvedOverlay,
  SharingPolicy,
  SharingPolicyFormValues,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  type VNodeChild,
  defineComponent,
  h,
  ref,
  useId,
} from 'vue';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import DataTable, {type DataTableColumn} from '../../primitives/DataTable/DataTable';
import Select from '../../primitives/Select/Select';
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';
import AdminSection from '../shared/AdminSection';
import ConfirmButton from '../shared/ConfirmButton';
import DetailList, {type DetailListItem} from '../shared/DetailList';
import Panel from '../shared/Panel';
import renderEditPanel from '../shared/renderEditPanel';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * What `BaseSharingPolicies` hands its default scoped slot, so the policies can be shown with any UI.
 */
export interface BaseSharingPoliciesRenderProps {
  /** The columns the default table shows, with translated headers and cell renderers. */
  columns: DataTableColumn<SharingPolicy>[];
  /** Describes, in translated words, which organization units a policy reaches: one line per section. */
  describeScope: (policy: SharingPolicy) => string[];
  /** A translated message when the policies could not be loaded, or `null`. */
  error: string | null;
  isLoading: boolean;
  isLoadingOverlay: boolean;
  isSubmitting: boolean;
  limit: number;
  /** A translated message when a create, update or delete failed, or `null`. */
  mutationError: string | null;
  offset: number;
  /** Creates a policy. Undefined unless editing is allowed. */
  onCreate?: (request: SharingPolicyRequest) => void;
  /** Deletes a policy; ask for confirmation first. Undefined unless editing is allowed. Does nothing for a read-only policy. */
  onDelete?: (policy: SharingPolicy) => void;
  /** Shows the page that starts at `offset`. Undefined when the list is not paginated. */
  onPageChange?: (offset: number) => void;
  /** Replaces a policy's sections. Undefined unless editing is allowed. Does nothing for a read-only policy. */
  onUpdate?: (policy: SharingPolicy, request: SharingPolicyUpdateRequest) => void;
  /** The overlay rules that apply in `overlayOuId`, when one was given. */
  overlay?: ResolvedOverlay;
  overlayError: string | null;
  overlayOuId?: string;
  policies: SharingPolicy[];
  totalResults: number;
}

type BaseSharingPoliciesProps = Readonly<{
  className: string;
  description: string | undefined;
  error: string | null;
  isLoading: boolean;
  isLoadingOverlay: boolean;
  isSubmitting: boolean;
  limit: number;
  mutationError: string | null;
  offset: number;
  onCreate: ((request: SharingPolicyRequest) => void) | undefined;
  onDelete: ((policy: SharingPolicy) => void) | undefined;
  onPageChange: ((offset: number) => void) | undefined;
  onUpdate: ((policy: SharingPolicy, request: SharingPolicyUpdateRequest) => void) | undefined;
  overlay: ResolvedOverlay | undefined;
  overlayError: string | null;
  overlayOuId: string | undefined;
  policies: SharingPolicy[];
  preferences: Preferences | undefined;
  title: string | undefined;
  totalResults: number | undefined;
}>;

interface Draft {
  policy?: SharingPolicy;
  values: SharingPolicyFormValues;
}

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

const isOwned = (overlay: ResolvedOverlay): boolean => Boolean(overlay.isOwnedByOU);

/**
 * Props of `BaseSharingPolicies`, shared with `SharingPolicies` where they apply.
 */
export const baseSharingPoliciesProps = {
  /** Extra CSS class added to the root element. */
  className: {default: '', type: String},
  /** Text shown under the title. */
  description: {default: undefined, type: String},
  /** A message when the policies could not be loaded, already translated. */
  error: {default: null, type: String as PropType<string | null>},
  isLoading: {default: false, type: Boolean},
  isLoadingOverlay: {default: false, type: Boolean},
  isSubmitting: {default: false, type: Boolean},
  /** Page size. */
  limit: {default: 20, type: Number},
  /** A message when a create, update or delete failed, already translated. */
  mutationError: {default: null, type: String as PropType<string | null>},
  offset: {default: 0, type: Number},
  /** Creates a policy. The add action is hidden when omitted. Also available as `@create`. */
  onCreate: {default: undefined, type: Function as PropType<(request: SharingPolicyRequest) => void>},
  /** Deletes a policy, after the user confirms. The delete action is hidden when omitted. Also available as `@delete`. */
  onDelete: {default: undefined, type: Function as PropType<(policy: SharingPolicy) => void>},
  /** Called with the offset of the page to show. Pagination is hidden when omitted. */
  onPageChange: {default: undefined, type: Function as PropType<(offset: number) => void>},
  /** Replaces a policy's sections. The edit action is hidden when omitted. Also available as `@update`. */
  onUpdate: {
    default: undefined,
    type: Function as PropType<(policy: SharingPolicy, request: SharingPolicyUpdateRequest) => void>,
  },
  /** The overlay rules that apply in `overlayOuId`. */
  overlay: {default: undefined, type: Object as PropType<ResolvedOverlay>},
  overlayError: {default: null, type: String as PropType<string | null>},
  /** The organization unit whose overlay rules are shown, read only. */
  overlayOuId: {default: undefined, type: String},
  policies: {required: true, type: Array as PropType<SharingPolicy[]>},
  /** Component-level preferences, for example `i18n.bundles` overrides. */
  preferences: {default: undefined, type: Object as PropType<Preferences>},
  /** Heading of the view. Pass an empty string to hide it. */
  title: {default: undefined, type: String},
  totalResults: {default: undefined, type: Number},
} as const;

/**
 * Lists the sharing policies of one resource (a user, an application, a role or a flow) with the
 * organization units each reaches, lets the caller add, edit and delete them, and shows the overlay
 * rules that apply in one unit. Holds no data of its own: pass the policies and handle the changes.
 *
 * Slots: `actions`, rendered next to the title; `default`, a scoped slot that replaces the view with custom UI and
 * receives {@link BaseSharingPoliciesRenderProps}.
 */
const BaseSharingPolicies: Component = defineComponent({
  name: 'BaseSharingPolicies',
  props: baseSharingPoliciesProps,
  setup(props: BaseSharingPoliciesProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const draft: Ref<Draft | null> = ref(null);

    const describeScope = (policy: SharingPolicy): string[] => describeSharingPolicyScope(t, policy);
    const canChange = (policy: SharingPolicy): boolean => !policy.isReadOnly;

    const setValue = <K extends keyof SharingPolicyFormValues>(field: K, value: SharingPolicyFormValues[K]): void => {
      if (draft.value) {
        draft.value = {...draft.value, values: {...draft.value.values, [field]: value}};
      }
    };

    const renderForm = (current: Draft): VNode => {
      const {values} = current;
      const keepsSections: boolean =
        Boolean(current.policy?.allUnits) || current.policy?.otherTreeRoots?.mode === 'all';
      const text = (name: 'excludedOuIds' | 'otherTreeRootOuIds' | 'selectedOuIds', label: string): VNode =>
        h(TextField, {
          helperText: t('admin.sharing.form.ids_hint'),
          label,
          modelValue: values[name],
          name: `${uid}-${name}`,
          'onUpdate:modelValue': (value: string): void => setValue(name, value),
          required: name === 'selectedOuIds',
        });

      return renderEditPanel({
        canSave: isSharingPolicyFormValid(values, current.policy),
        fields: [
          keepsSections ? h('span', {class: cls('muted')}, t('admin.sharing.form.kept_sections')) : null,
          h(Select, {
            label: t('admin.sharing.form.child_units'),
            modelValue: values.childUnitsMode,
            name: `${uid}-childUnitsMode`,
            'onUpdate:modelValue': (value: string): void =>
              setValue('childUnitsMode', value as SharingPolicyFormValues['childUnitsMode']),
            options: [
              {label: t('admin.sharing.form.child_units_none'), value: 'none'},
              {label: t('admin.sharing.form.child_units_all'), value: 'all'},
              {label: t('admin.sharing.form.child_units_selected'), value: 'selected'},
            ],
            required: true,
          }),
          values.childUnitsMode === 'all' ? text('excludedOuIds', t('admin.sharing.form.excluded_units')) : null,
          values.childUnitsMode === 'selected' ? text('selectedOuIds', t('admin.sharing.form.selected_units')) : null,
          values.childUnitsMode === 'selected'
            ? h(Select, {
                label: t('admin.sharing.form.reach'),
                modelValue: values.reach,
                name: `${uid}-reach`,
                'onUpdate:modelValue': (value: string): void =>
                  setValue('reach', value as SharingPolicyFormValues['reach']),
                options: [
                  {label: t('admin.sharing.form.reach_subtree'), value: 'subtree'},
                  {label: t('admin.sharing.form.reach_unit'), value: 'unit'},
                ],
                required: true,
              })
            : null,
          current.policy?.otherTreeRoots?.mode !== 'all'
            ? text('otherTreeRootOuIds', t('admin.sharing.form.other_tree_roots'))
            : null,
        ],
        isSaving: props.isSubmitting,
        onCancel: (): void => {
          draft.value = null;
        },
        onSave: (): void => {
          if (current.policy) {
            props.onUpdate?.(current.policy, toSharingPolicyUpdateRequest(values, current.policy));
          } else {
            props.onCreate?.(toSharingPolicyRequest(values));
          }

          draft.value = null;
        },
        saveLabel: t('admin.sharing.actions.save'),
        t,
        title: current.policy ? t('admin.sharing.form.edit_title') : t('admin.sharing.form.create_title'),
      });
    };

    const renderOverlay = (): VNode | null => {
      if (!props.overlayOuId) {
        return null;
      }

      const body = (): VNodeChild[] => {
        if (props.isLoadingOverlay) {
          return [
            h('span', {class: cls('muted'), role: 'status'}, [
              h(Spinner, {'aria-hidden': 'true', size: 'small'}),
              t('admin.common.loading'),
            ]),
          ];
        }

        if (props.overlayError) {
          return [h(Alert, {severity: 'error'}, {default: (): string[] => [props.overlayError!]})];
        }

        const {overlay} = props;

        if (!overlay) {
          return [];
        }

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
            rule.allowedValues?.length
              ? t('admin.sharing.overlay.allowed', {values: rule.allowedValues.join(', ')})
              : '',
            rule.excludedValues?.length
              ? t('admin.sharing.overlay.excluded', {values: rule.excludedValues.join(', ')})
              : '',
            rule.editable ? t('admin.sharing.overlay.editable') : '',
          ].filter(Boolean);

          items.push({label: field, value: parts.join(' · ') || t('admin.sharing.overlay.no_rules')});
        });

        return [
          h(DetailList, {items}),
          rules.length === 0 ? h('span', {class: cls('muted')}, t('admin.sharing.overlay.no_rules')) : null,
        ];
      };

      return h(Panel, {title: t('admin.sharing.overlay.title', {unit: props.overlayOuId})}, {default: body});
    };

    return (): VNode => {
      const columns: DataTableColumn<SharingPolicy>[] = [
        {
          header: t('admin.sharing.columns.scope'),
          id: 'scope',
          render: (policy: SharingPolicy): VNodeChild =>
            h(
              'span',
              {style: {display: 'flex', flexDirection: 'column'}},
              describeScope(policy).map((line: string) => h('span', {key: line}, line)),
            ),
        },
        {
          header: t('admin.sharing.columns.stage'),
          id: 'stage',
          render: (policy: SharingPolicy): VNodeChild =>
            policy.stage === 'reshare' ? t('admin.sharing.stage.reshare') : t('admin.sharing.stage.share'),
        },
        {
          header: t('admin.sharing.columns.version'),
          id: 'version',
          render: (policy: SharingPolicy): VNodeChild => policy.version ?? '',
        },
      ];

      if (props.onUpdate || props.onDelete) {
        columns.push({
          header: t('admin.common.columns.actions'),
          id: 'actions',
          render: (policy: SharingPolicy): VNodeChild =>
            canChange(policy)
              ? h('span', {class: cls('row')}, [
                  props.onUpdate
                    ? h(
                        Button,
                        {
                          disabled: props.isSubmitting,
                          onClick: (): void => {
                            draft.value = {policy, values: toSharingPolicyFormValues(policy)};
                          },
                          size: 'small',
                          variant: 'outline',
                        },
                        {default: (): string => t('admin.sharing.actions.edit')},
                      )
                    : null,
                  props.onDelete
                    ? h(
                        ConfirmButton,
                        {
                          confirmText: t('admin.sharing.delete.confirm'),
                          isLoading: props.isSubmitting,
                          onConfirm: (): void => props.onDelete?.(policy),
                          t,
                        },
                        {default: (): string => t('admin.sharing.actions.delete')},
                      )
                    : null,
                ])
              : h('span', {class: cls('muted')}, t('admin.sharing.read_only')),
        });
      }

      if (slots['default']) {
        const {onDelete, onUpdate} = props;
        const renderProps: BaseSharingPoliciesRenderProps = {
          columns,
          describeScope,
          error: props.error,
          isLoading: props.isLoading,
          isLoadingOverlay: props.isLoadingOverlay,
          isSubmitting: props.isSubmitting,
          limit: props.limit,
          mutationError: props.mutationError,
          offset: props.offset,
          onCreate: props.onCreate,
          onDelete: onDelete
            ? (policy: SharingPolicy): void => {
                if (canChange(policy)) onDelete(policy);
              }
            : undefined,
          onPageChange: props.onPageChange,
          onUpdate: onUpdate
            ? (policy: SharingPolicy, request: SharingPolicyUpdateRequest): void => {
                if (canChange(policy)) onUpdate(policy, request);
              }
            : undefined,
          overlay: props.overlay,
          overlayError: props.overlayError,
          overlayOuId: props.overlayOuId,
          policies: props.policies,
          totalResults: props.totalResults ?? props.policies.length,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      const caption: string = props.title?.length ? props.title : t('admin.sharing.title');

      return h(
        AdminSection,
        {
          block: 'sharing-policies',
          className: props.className,
          description: props.description,
          title: props.title ?? t('admin.sharing.title'),
        },
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onCreate && !draft.value
              ? h(
                  Button,
                  {
                    disabled: props.isSubmitting,
                    onClick: (): void => {
                      draft.value = {values: toSharingPolicyFormValues()};
                    },
                    size: 'small',
                    variant: 'outline',
                  },
                  {default: (): string => t('admin.sharing.actions.create')},
                )
              : null,
          ],
          default: (): (VNode | null)[] => [
            props.mutationError
              ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.mutationError!]})
              : null,
            draft.value ? renderForm(draft.value) : null,
            h(DataTable, {
              caption,
              columns,
              emptyText: t('admin.sharing.empty'),
              error: props.error,
              getRowId: (policy: SharingPolicy): string => policy.id ?? describeScope(policy).join('|'),
              isLoading: props.isLoading,
              pagination: props.onPageChange
                ? {
                    limit: props.limit,
                    offset: props.offset,
                    onChange: props.onPageChange,
                    total: props.totalResults ?? props.policies.length,
                  }
                : undefined,
              rows: props.policies,
              t,
            }),
            renderOverlay(),
          ],
        },
      );
    };
  },
});

export default BaseSharingPolicies;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import type {
  OrganizationUnit,
  OrganizationUnitBasic,
  OrganizationUnitGroup,
  OrganizationUnitRole,
  OrganizationUnitUser,
  Preferences,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  ref,
  useId,
} from 'vue';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';
import AdminSection from '../shared/AdminSection';
import ChipList from '../shared/ChipList';
import ConfirmButton from '../shared/ConfirmButton';
import DetailList from '../shared/DetailList';
import Panel from '../shared/Panel';
import renderEditPanel from '../shared/renderEditPanel';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The changes `BaseOrganizationUnitDetails` submits.
 */
export interface OrganizationUnitUpdateSubmission {
  description?: string;
  handle: string;
  name: string;
}

/**
 * What an organization unit holds, as `BaseOrganizationUnitDetails` shows it: the first page of each list and, when
 * known, how many there are in all.
 */
export interface OrganizationUnitContents {
  childUnits: OrganizationUnitBasic[];
  groups: OrganizationUnitGroup[];
  roles: OrganizationUnitRole[];
  /** How many of each the unit holds in all, when the server said. */
  totals?: Partial<Record<'childUnits' | 'groups' | 'roles' | 'users', number>>;
  users: OrganizationUnitUser[];
}

/**
 * What `BaseOrganizationUnitDetails` hands its default scoped slot, so the unit can be shown with any UI.
 */
export interface BaseOrganizationUnitDetailsRenderProps {
  /** The unit's child units, users, groups and roles. Read only. */
  contents: OrganizationUnitContents;
  /** A translated message when the contents could not be loaded, or `null`. */
  contentsError: string | null;
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isLoadingContents: boolean;
  isUpdating: boolean;
  /** Deletes the unit. Undefined when deletion is not allowed. */
  onDelete?: () => void;
  /** Chooses a child unit. Undefined when child units are not selectable. */
  onSelectChild?: (organizationUnit: OrganizationUnitBasic) => void;
  /** Saves a new name, handle and description. Undefined when editing is not allowed. */
  onUpdate?: (changes: OrganizationUnitUpdateSubmission) => void;
  organizationUnit?: OrganizationUnit;
  /** The parent unit, when it is known. */
  parent?: OrganizationUnit | OrganizationUnitBasic;
}

type BaseOrganizationUnitDetailsProps = Readonly<{
  className: string;
  contents: Partial<OrganizationUnitContents> | undefined;
  contentsError: string | null;
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isLoadingContents: boolean;
  isUpdating: boolean;
  onDelete: (() => void) | undefined;
  onSelectChild: ((organizationUnit: OrganizationUnitBasic) => void) | undefined;
  onUpdate: ((changes: OrganizationUnitUpdateSubmission) => void) | undefined;
  organizationUnit: OrganizationUnit | undefined;
  parent: OrganizationUnit | OrganizationUnitBasic | undefined;
  preferences: Preferences | undefined;
}>;

interface Draft {
  description: string;
  handle: string;
  name: string;
}

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * Shows an organization unit's name, handle, description and parent, with its child units and the
 * users, groups and roles in it, and lets the caller edit and delete it. Holds no data of its own: pass
 * the unit and what it holds, and handle the changes.
 *
 * Slots: `actions`, rendered next to the unit's name; `default`, a scoped slot that replaces the view with custom
 * UI and receives {@link BaseOrganizationUnitDetailsRenderProps}.
 */
const BaseOrganizationUnitDetails: Component = defineComponent({
  name: 'BaseOrganizationUnitDetails',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** The unit's child units, users, groups and roles. */
    contents: {default: undefined, type: Object as PropType<Partial<OrganizationUnitContents>>},
    /** A message when the contents could not be loaded, already translated. */
    contentsError: {default: null, type: String as PropType<string | null>},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isDeleting: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    isLoadingContents: {default: false, type: Boolean},
    isUpdating: {default: false, type: Boolean},
    /** Deletes the unit. The delete action is hidden when omitted. Also available as `@delete`. */
    onDelete: {default: undefined, type: Function as PropType<() => void>},
    /** Called when a child unit is chosen. Child units are selectable only when set. Also available as `@select-child`. */
    onSelectChild: {default: undefined, type: Function as PropType<(organizationUnit: OrganizationUnitBasic) => void>},
    /** Saves a new name, handle and description. The edit action is hidden when omitted. Also available as `@update`. */
    onUpdate: {default: undefined, type: Function as PropType<(changes: OrganizationUnitUpdateSubmission) => void>},
    /** The unit to show. */
    organizationUnit: {default: undefined, type: Object as PropType<OrganizationUnit>},
    /** The parent unit, shown by name when given. */
    parent: {default: undefined, type: Object as PropType<OrganizationUnit | OrganizationUnitBasic>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  setup(props: BaseOrganizationUnitDetailsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const draft: Ref<Draft | null> = ref(null);

    const loadingStatus = (): VNode =>
      h('span', {class: cls('muted'), role: 'status'}, [
        h(Spinner, {'aria-hidden': 'true', size: 'small'}),
        t('admin.common.loading'),
      ]);

    return (): VNode => {
      const unit: OrganizationUnit | undefined = props.organizationUnit;
      const contents: OrganizationUnitContents = {
        childUnits: props.contents?.childUnits ?? [],
        groups: props.contents?.groups ?? [],
        roles: props.contents?.roles ?? [],
        totals: props.contents?.totals ?? {},
        users: props.contents?.users ?? [],
      };

      if (slots['default']) {
        const renderProps: BaseOrganizationUnitDetailsRenderProps = {
          contents,
          contentsError: props.contentsError,
          error: props.error,
          isDeleting: props.isDeleting,
          isLoading: props.isLoading,
          isLoadingContents: props.isLoadingContents,
          isUpdating: props.isUpdating,
          onDelete: unit ? props.onDelete : undefined,
          onSelectChild: props.onSelectChild,
          onUpdate: unit ? props.onUpdate : undefined,
          organizationUnit: unit,
          parent: props.parent,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      if (props.isLoading && !unit) {
        return h(
          AdminSection,
          {block: 'organization-unit-details', className: props.className},
          {default: loadingStatus},
        );
      }

      if (!unit) {
        return h(
          AdminSection,
          {block: 'organization-unit-details', className: props.className},
          {
            default: (): VNode =>
              h(
                Alert,
                {severity: 'error'},
                {default: (): string[] => [props.error ?? t('admin.common.errors.not_found')]},
              ),
          },
        );
      }

      const notSet: string = t('admin.organization_units.details.not_set');
      const titled = (key: string, count: number, total?: number): string => `${t(key)} (${total ?? count})`;

      const renderEdit = (current: Draft): VNode => {
        const text = (name: keyof Draft, label: string, required = false): VNode =>
          h(TextField, {
            label,
            modelValue: current[name],
            name: `${uid}-${name}`,
            'onUpdate:modelValue': (value: string): void => {
              draft.value = {...current, [name]: value};
            },
            required,
          });

        return renderEditPanel({
          canSave: Boolean(current.name.trim() && current.handle.trim()),
          fields: [
            text('name', t('admin.organization_units.fields.name'), true),
            text('handle', t('admin.organization_units.fields.handle'), true),
            text('description', t('admin.organization_units.fields.description')),
          ],
          isSaving: props.isUpdating,
          onCancel: (): void => {
            draft.value = null;
          },
          onSave: (): void => {
            props.onUpdate?.({
              description: current.description.trim() || undefined,
              handle: current.handle.trim(),
              name: current.name.trim(),
            });
            draft.value = null;
          },
          saveLabel: t('admin.organization_units.details.edit.save'),
          t,
          title: t('admin.organization_units.details.edit.action'),
        });
      };

      const chipPanel = (
        key: string,
        emptyKey: string,
        items: {id: string; label: string}[],
        total: number | undefined,
      ): VNode =>
        h(
          Panel,
          {title: titled(key, items.length, total)},
          {default: (): VNode => h(ChipList, {emptyText: t(emptyKey), items, label: t(key)})},
        );

      const renderContents = (): (VNode | null)[] => {
        if (props.isLoadingContents) {
          return [loadingStatus()];
        }

        if (props.contentsError) {
          return [h(Alert, {severity: 'error'}, {default: (): string[] => [props.contentsError!]})];
        }

        const {childUnits, groups, roles, totals, users} = contents;
        const onSelectChild: ((child: OrganizationUnitBasic) => void) | undefined = props.onSelectChild;

        return [
          onSelectChild && childUnits.length > 0
            ? h(
                Panel,
                {title: titled('admin.organization_units.details.children', childUnits.length, totals?.childUnits)},
                {
                  default: (): VNode =>
                    h(
                      'ul',
                      {'aria-label': t('admin.organization_units.details.children'), class: cls('chip-list')},
                      childUnits.map((child: OrganizationUnitBasic) =>
                        h('li', {key: child.id}, [
                          h(
                            Button,
                            {onClick: (): void => onSelectChild(child), size: 'small', variant: 'outline'},
                            {default: (): string => child.name},
                          ),
                        ]),
                      ),
                    ),
                },
              )
            : chipPanel(
                'admin.organization_units.details.children',
                'admin.organization_units.details.children_empty',
                childUnits.map((child: OrganizationUnitBasic) => ({id: child.id, label: child.name})),
                totals?.childUnits,
              ),
          chipPanel(
            'admin.organization_units.details.users',
            'admin.organization_units.details.users_empty',
            users.map((user: OrganizationUnitUser) => ({id: user.id, label: user.display ?? user.id})),
            totals?.users,
          ),
          chipPanel(
            'admin.organization_units.details.groups',
            'admin.organization_units.details.groups_empty',
            groups.map((group: OrganizationUnitGroup) => ({id: group.id, label: group.name})),
            totals?.groups,
          ),
          chipPanel(
            'admin.organization_units.details.roles',
            'admin.organization_units.details.roles_empty',
            roles.map((role: OrganizationUnitRole) => ({id: role.id, label: role.name})),
            totals?.roles,
          ),
        ];
      };

      const parentLabel: string = unit.parent
        ? (props.parent?.name ?? unit.parent)
        : t('admin.organization_units.fields.parent_none');

      return h(
        AdminSection,
        {
          block: 'organization-unit-details',
          className: props.className,
          description: unit.description,
          title: unit.name,
        },
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onDelete
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('admin.organization_units.details.delete.confirm', {name: unit.name}),
                    isLoading: props.isDeleting,
                    onConfirm: props.onDelete,
                    t,
                  },
                  {default: (): string => t('admin.organization_units.details.delete.action')},
                )
              : null,
          ],
          default: (): (VNode | null)[] => [
            props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
            draft.value
              ? renderEdit(draft.value)
              : h(
                  Panel,
                  {title: t('admin.organization_units.details.overview')},
                  {
                    actions: (): VNode | null =>
                      props.onUpdate
                        ? h(
                            Button,
                            {
                              onClick: (): void => {
                                draft.value = {
                                  description: unit.description ?? '',
                                  handle: unit.handle,
                                  name: unit.name,
                                };
                              },
                              size: 'small',
                              variant: 'outline',
                            },
                            {default: (): string => t('admin.organization_units.details.edit.action')},
                          )
                        : null,
                    default: (): VNode =>
                      h(DetailList, {
                        items: [
                          {label: t('admin.organization_units.fields.name'), value: unit.name},
                          {label: t('admin.organization_units.fields.handle'), value: unit.handle},
                          {
                            label: t('admin.organization_units.fields.description'),
                            value: unit.description ? unit.description : notSet,
                          },
                          {label: t('admin.organization_units.fields.parent'), value: parentLabel},
                        ],
                      }),
                  },
                ),
            ...renderContents(),
          ],
        },
      );
    };
  },
});

export default BaseOrganizationUnitDetails;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type Preferences,
  type ResourceServerPermission,
  type RoleResourcePermissions,
  type SelectOption,
  withVendorCSSClassPrefix,
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
import Select from '../../primitives/Select/Select';
import Spinner from '../../primitives/Spinner/Spinner';
import AdminSection from '../shared/AdminSection';
import ChipList from '../shared/ChipList';
import Panel from '../shared/Panel';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * A resource server a permission can be granted on.
 */
export interface RolePermissionResourceServer {
  id: string;
  name: string;
}

/**
 * One permission on one resource server, as added to or removed from a role.
 */
export interface RolePermissionChange {
  permission: string;
  resourceServerId: string;
}

type BaseRolePermissionsProps = Readonly<{
  availablePermissions: Record<string, ResourceServerPermission[]> | undefined;
  className: string;
  description: string | undefined;
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  onAdd: ((change: RolePermissionChange) => void) | undefined;
  onRemove: ((change: RolePermissionChange) => void) | undefined;
  onResourceServerSelect: ((resourceServerId: string) => void) | undefined;
  permissions: RoleResourcePermissions[];
  preferences: Preferences | undefined;
  resourceServerNames: Record<string, string> | undefined;
  resourceServers: RolePermissionResourceServer[] | undefined;
  title: string | undefined;
}>;

/**
 * What `BaseRolePermissions` hands its default scoped slot, so the permissions can be shown with any UI.
 */
export interface BaseRolePermissionsRenderProps {
  /**
   * The permissions that can be granted, keyed by resource server identifier, for the resource servers
   * loaded so far. Undefined when adding is not allowed.
   */
  availablePermissions?: Record<string, ResourceServerPermission[]>;
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  /** Grants a permission. Undefined when the permissions cannot be edited. */
  onAdd?: (change: RolePermissionChange) => void;
  /** Revokes a permission. Undefined when the permissions cannot be edited. Ask the user to confirm first. */
  onRemove?: (change: RolePermissionChange) => void;
  /**
   * Asks for the permissions of a resource server, which then appear in `availablePermissions`.
   * Undefined when adding is not allowed.
   */
  onResourceServerSelect?: (resourceServerId: string) => void;
  /** The resource servers the role grants at least one permission on, with those permissions. */
  permissions: RoleResourcePermissions[];
  /** Returns a resource server's display name, or its identifier when the name is missing. */
  resolveResourceServerName: (resourceServerId: string) => string;
  /** The resource servers permissions can be granted on. Undefined when adding is not allowed. */
  resourceServers?: RolePermissionResourceServer[];
}

/**
 * Shows the permissions a role grants, grouped by resource server, and lets the caller add and remove
 * them. Holds no data of its own: pass the permissions, and the handlers to edit them.
 *
 * Slots: `default`, a scoped slot that replaces the view with custom UI and receives
 * {@link BaseRolePermissionsRenderProps}.
 */
const BaseRolePermissions: Component = defineComponent({
  name: 'BaseRolePermissions',
  props: {
    /**
     * The permissions that can be granted, keyed by resource server identifier. A resource server missing
     * here is still loading, and `onResourceServerSelect` is called to load it.
     */
    availablePermissions: {
      default: undefined,
      type: Object as PropType<Record<string, ResourceServerPermission[]>>,
    },
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isLoading: {default: false, type: Boolean},
    isMutating: {default: false, type: Boolean},
    /** Grants a permission. Adding is hidden when omitted, or when `resourceServers` is omitted. */
    onAdd: {default: undefined, type: Function as PropType<(change: RolePermissionChange) => void>},
    /** Revokes a permission, after the user confirms. Removing is hidden when omitted. */
    onRemove: {default: undefined, type: Function as PropType<(change: RolePermissionChange) => void>},
    /** Called when a resource server is picked to add a permission on, so its permissions can be loaded. */
    onResourceServerSelect: {default: undefined, type: Function as PropType<(resourceServerId: string) => void>},
    /** The permissions the role grants, per resource server. */
    permissions: {required: true, type: Array as PropType<RoleResourcePermissions[]>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Display names of resource servers, keyed by identifier. The identifier is shown otherwise. */
    resourceServerNames: {default: undefined, type: Object as PropType<Record<string, string>>},
    /** The resource servers a permission can be added on. */
    resourceServers: {default: undefined, type: Array as PropType<RolePermissionResourceServer[]>},
    /** Heading of the section. Pass an empty string to hide it. */
    title: {default: undefined, type: String},
  },
  setup(props: BaseRolePermissionsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const resourceServerId: Ref<string> = ref('');
    const permission: Ref<string> = ref('');
    const pendingRemoval: Ref<RolePermissionChange | null> = ref(null);
    const resolveResourceServerName = (id: string): string =>
      props.resourceServerNames?.[id] ??
      props.resourceServers?.find((server: RolePermissionResourceServer) => server.id === id)?.name ??
      id;
    const granted = (): RoleResourcePermissions[] =>
      props.permissions.filter((entry: RoleResourcePermissions) => entry.permissions.length > 0);
    const canAdd = (): boolean => Boolean(props.onAdd && props.resourceServers);

    const handleSubmit = (event: Event): void => {
      event.preventDefault();

      if (props.onAdd && resourceServerId.value && permission.value) {
        props.onAdd({permission: permission.value, resourceServerId: resourceServerId.value});
        permission.value = '';
      }
    };

    const renderAdd = (): VNode | null => {
      if (!canAdd()) {
        return null;
      }

      const grantedOn: string[] =
        granted().find((entry: RoleResourcePermissions) => entry.resourceServerId === resourceServerId.value)
          ?.permissions ?? [];
      const candidates: ResourceServerPermission[] | undefined = resourceServerId.value
        ? props.availablePermissions?.[resourceServerId.value]
        : undefined;
      const permissionOptions: SelectOption[] = (candidates ?? [])
        .filter((candidate: ResourceServerPermission) => !grantedOn.includes(candidate.permission))
        .map((candidate: ResourceServerPermission) => ({
          label: `${candidate.resourceName ? `${candidate.resourceName} / ` : ''}${candidate.name} (${candidate.permission})`,
          value: candidate.permission,
        }));

      return h('form', {class: withVendorCSSClassPrefix('admin__picker'), onSubmit: handleSubmit}, [
        h(Select, {
          label: t('admin.roles.permissions.fields.resource_server'),
          modelValue: resourceServerId.value,
          name: `${uid}-resource-server`,
          'onUpdate:modelValue': (value: string): void => {
            resourceServerId.value = value;
            permission.value = '';
            if (value) {
              props.onResourceServerSelect?.(value);
            }
          },
          options: (props.resourceServers ?? []).map((server: RolePermissionResourceServer) => ({
            label: server.name,
            value: server.id,
          })),
          placeholder: t('admin.roles.permissions.fields.resource_server_placeholder'),
        }),
        h(Select, {
          disabled: !resourceServerId.value,
          emptyText: t('admin.roles.permissions.fields.permission_empty'),
          label: t('admin.roles.permissions.fields.permission'),
          loading: Boolean(resourceServerId.value) && candidates === undefined,
          modelValue: permission.value,
          name: `${uid}-permission`,
          'onUpdate:modelValue': (value: string): void => {
            permission.value = value;
          },
          options: permissionOptions,
          placeholder: t('admin.roles.permissions.fields.permission_placeholder'),
        }),
        h(
          Button,
          {
            disabled: !resourceServerId.value || !permission.value || props.isMutating,
            loading: props.isMutating,
            type: 'submit',
          },
          {default: (): string => t('admin.roles.permissions.add')},
        ),
      ]);
    };

    const renderConfirm = (): VNode | null => {
      const pending: RolePermissionChange | null = pendingRemoval.value;

      if (!pending || !props.onRemove) {
        return null;
      }

      const question: string = t('admin.roles.permissions.remove_confirm', {permission: pending.permission});

      return h('span', {'aria-label': question, class: withVendorCSSClassPrefix('admin__confirm'), role: 'group'}, [
        h('span', {}, question),
        h(
          Button,
          {
            disabled: props.isMutating,
            onClick: (): void => {
              pendingRemoval.value = null;
            },
            size: 'small',
            variant: 'text',
          },
          {default: (): string => t('admin.common.actions.cancel')},
        ),
        h(
          Button,
          {
            color: 'danger',
            disabled: props.isMutating,
            loading: props.isMutating,
            onClick: (): void => {
              props.onRemove?.(pending);
              pendingRemoval.value = null;
            },
            size: 'small',
          },
          {default: (): string => t('admin.common.actions.confirm')},
        ),
      ]);
    };

    const renderContent = (): (VNode | null)[] | VNode => {
      if (props.isLoading) {
        return h('span', {class: withVendorCSSClassPrefix('admin__muted'), role: 'status'}, [
          h(Spinner, {'aria-hidden': 'true', size: 'small'}),
          t('admin.common.loading'),
        ]);
      }

      const entries: RoleResourcePermissions[] = granted();

      return [
        props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
        renderAdd(),
        renderConfirm(),
        entries.length === 0 && !props.error
          ? h('span', {class: withVendorCSSClassPrefix('admin__muted')}, t('admin.roles.permissions.empty'))
          : null,
        ...entries.map((entry: RoleResourcePermissions) => {
          const name: string = resolveResourceServerName(entry.resourceServerId);

          return h(
            Panel,
            {key: entry.resourceServerId, title: name},
            {
              default: (): VNode =>
                h(ChipList, {
                  emptyText: t('admin.roles.permissions.empty'),
                  items: entry.permissions.map((grantedPermission: string) => ({
                    id: grantedPermission,
                    label: grantedPermission,
                    ...(props.onRemove
                      ? {
                          onRemove: (): void => {
                            pendingRemoval.value = {
                              permission: grantedPermission,
                              resourceServerId: entry.resourceServerId,
                            };
                          },
                          removeLabel: t('admin.roles.permissions.remove_label', {
                            permission: grantedPermission,
                            resourceServer: name,
                          }),
                        }
                      : {}),
                  })),
                  label: name,
                }),
            },
          );
        }),
      ];
    };

    return (): VNode => {
      if (slots['default']) {
        const editable: boolean = canAdd();
        const renderProps: BaseRolePermissionsRenderProps = {
          availablePermissions: editable ? (props.availablePermissions ?? {}) : undefined,
          error: props.error,
          isLoading: props.isLoading,
          isMutating: props.isMutating,
          onAdd: editable ? props.onAdd : undefined,
          onRemove: props.onRemove,
          onResourceServerSelect: editable ? props.onResourceServerSelect : undefined,
          permissions: granted(),
          resolveResourceServerName,
          resourceServers: editable ? props.resourceServers : undefined,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      return h(
        AdminSection,
        {
          block: 'role-permissions',
          className: props.className,
          description: props.description,
          headingLevel: 3,
          title: props.title ?? t('admin.roles.permissions.title'),
        },
        {default: renderContent},
      );
    };
  },
});

export default BaseRolePermissions;

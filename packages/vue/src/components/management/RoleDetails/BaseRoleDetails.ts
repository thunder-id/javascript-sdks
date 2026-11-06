// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Preferences, type RoleSummary, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import Alert from '../../primitives/Alert/Alert';
import Spinner from '../../primitives/Spinner/Spinner';
import AdminSection from '../shared/AdminSection';
import ConfirmButton from '../shared/ConfirmButton';
import DetailList from '../shared/DetailList';
import Panel from '../shared/Panel';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type BaseRoleDetailsProps = Readonly<{
  className: string;
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  onDelete: (() => void) | undefined;
  preferences: Preferences | undefined;
  role: RoleSummary | undefined;
}>;

/**
 * What `BaseRoleDetails` hands its default scoped slot, so the role can be shown with any UI.
 */
export interface BaseRoleDetailsRenderProps {
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  /** Deletes the role. Undefined when deletion is not allowed, including for read-only roles. */
  onDelete?: () => void;
  role?: RoleSummary;
}

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * Shows a role's name, description and organization unit, with what it grants and who holds it under them. Holds no
 * data of its own: pass the role and handle deletion. Read-only roles are never offered for deletion.
 *
 * Slots: `actions`, rendered next to the role's name; `permissions` and `assignments`, rendered under the overview,
 * such as a `RolePermissions` and a `RoleAssignments`; `default`, a scoped slot that replaces the view with custom UI
 * and receives {@link BaseRoleDetailsRenderProps}.
 */
const BaseRoleDetails: Component = defineComponent({
  name: 'BaseRoleDetails',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isDeleting: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    /** Deletes the role. The delete action is hidden when omitted, and for read-only roles. Also available as `@delete`. */
    onDelete: {default: undefined, type: Function as PropType<() => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** The role to show. */
    role: {default: undefined, type: Object as PropType<RoleSummary>},
  },
  setup(props: BaseRoleDetailsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);

    return (): VNode => {
      const {role} = props;

      if (slots['default']) {
        const renderProps: BaseRoleDetailsRenderProps = {
          error: props.error,
          isDeleting: props.isDeleting,
          isLoading: props.isLoading,
          onDelete: role && !role.isReadOnly ? props.onDelete : undefined,
          role,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      if (props.isLoading && !role) {
        return h(
          AdminSection,
          {block: 'role-details', className: props.className},
          {
            default: (): VNode =>
              h('span', {class: cls('muted'), role: 'status'}, [
                h(Spinner, {'aria-hidden': 'true', size: 'small'}),
                t('admin.common.loading'),
              ]),
          },
        );
      }

      if (!role) {
        return h(
          AdminSection,
          {block: 'role-details', className: props.className},
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

      return h(
        AdminSection,
        {
          block: 'role-details',
          className: props.className,
          description: role.description,
          title: role.name,
        },
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onDelete && !role.isReadOnly
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('admin.roles.details.delete.confirm', {name: role.name}),
                    isLoading: props.isDeleting,
                    onConfirm: props.onDelete,
                    t,
                  },
                  {default: (): string => t('admin.roles.details.delete.action')},
                )
              : null,
          ],
          default: (): (VNode | VNode[] | null | undefined)[] => [
            props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
            h(
              Panel,
              {title: t('admin.roles.details.overview')},
              {
                default: (): VNode =>
                  h(DetailList, {
                    items: [{label: t('admin.common.columns.organization_unit'), value: role.ouHandle ?? role.ouId}],
                  }),
              },
            ),
            slots['permissions']?.(),
            slots['assignments']?.(),
          ],
        },
      );
    };
  },
});

export default BaseRoleDetails;

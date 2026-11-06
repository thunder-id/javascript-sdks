// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Group, type Preferences, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import Alert from '../../primitives/Alert/Alert';
import Spinner from '../../primitives/Spinner/Spinner';
import AdminSection from '../shared/AdminSection';
import ConfirmButton from '../shared/ConfirmButton';
import DetailList from '../shared/DetailList';
import Panel from '../shared/Panel';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type BaseGroupDetailsProps = Readonly<{
  className: string;
  error: string | null;
  group: Group | undefined;
  isDeleting: boolean;
  isLoading: boolean;
  onDelete: (() => void) | undefined;
  preferences: Preferences | undefined;
}>;

/**
 * What `BaseGroupDetails` hands its default scoped slot, so the group can be shown with any UI.
 */
export interface BaseGroupDetailsRenderProps {
  error: string | null;
  group?: Group;
  isDeleting: boolean;
  isLoading: boolean;
  /** Deletes the group. Undefined when deletion is not allowed. */
  onDelete?: () => void;
}

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * Shows a group's name, description and organization unit, with its members under them. Holds no data of its own:
 * pass the group and handle deletion.
 *
 * Slots: `actions`, rendered next to the group's name; `members`, rendered under the overview, such as a
 * `GroupMembers`; `default`, a scoped slot that replaces the view with custom UI and receives
 * {@link BaseGroupDetailsRenderProps}.
 */
const BaseGroupDetails: Component = defineComponent({
  name: 'BaseGroupDetails',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    /** The group to show. */
    group: {default: undefined, type: Object as PropType<Group>},
    isDeleting: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    /** Deletes the group. The delete action is hidden when omitted. Also available as `@delete`. */
    onDelete: {default: undefined, type: Function as PropType<() => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  setup(props: BaseGroupDetailsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);

    return (): VNode => {
      const {group} = props;

      if (slots['default']) {
        const renderProps: BaseGroupDetailsRenderProps = {
          error: props.error,
          group,
          isDeleting: props.isDeleting,
          isLoading: props.isLoading,
          onDelete: group ? props.onDelete : undefined,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      if (props.isLoading && !group) {
        return h(
          AdminSection,
          {block: 'group-details', className: props.className},
          {
            default: (): VNode =>
              h('span', {class: cls('muted'), role: 'status'}, [
                h(Spinner, {'aria-hidden': 'true', size: 'small'}),
                t('admin.common.loading'),
              ]),
          },
        );
      }

      if (!group) {
        return h(
          AdminSection,
          {block: 'group-details', className: props.className},
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
          block: 'group-details',
          className: props.className,
          description: group.description,
          title: group.name,
        },
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onDelete
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('admin.groups.details.delete.confirm', {name: group.name}),
                    isLoading: props.isDeleting,
                    onConfirm: props.onDelete,
                    t,
                  },
                  {default: (): string => t('admin.groups.details.delete.action')},
                )
              : null,
          ],
          default: (): (VNode | VNode[] | null | undefined)[] => [
            props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
            h(
              Panel,
              {title: t('admin.groups.details.overview')},
              {
                default: (): VNode =>
                  h(DetailList, {
                    items: [{label: t('admin.common.columns.organization_unit'), value: group.ouHandle ?? group.ouId}],
                  }),
              },
            ),
            slots['members']?.(),
          ],
        },
      );
    };
  },
});

export default BaseGroupDetails;

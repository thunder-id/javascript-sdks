// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Preferences, type Project, withVendorCSSClassPrefix} from '@thunderid/browser';
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
import ConfirmButton from '../shared/ConfirmButton';
import DetailList from '../shared/DetailList';
import formatTimestamp from '../shared/formatTimestamp';
import Panel from '../shared/Panel';
import renderEditPanel from '../shared/renderEditPanel';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The changes `BaseProjectDetails` submits. The handle cannot change.
 */
export interface ProjectUpdateSubmission {
  description?: string;
  displayName: string;
}

/**
 * What `BaseProjectDetails` hands its default scoped slot, so the project can be shown with any UI.
 */
export interface BaseProjectDetailsRenderProps {
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  /** Deletes the project. Undefined when deletion is not allowed. */
  onDelete?: () => void;
  /** Saves a new display name and description. Undefined when editing is not allowed. */
  onUpdate?: (changes: ProjectUpdateSubmission) => void;
  project?: Project;
}

type BaseProjectDetailsProps = Readonly<{
  className: string;
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  onDelete: (() => void) | undefined;
  onUpdate: ((changes: ProjectUpdateSubmission) => void) | undefined;
  preferences: Preferences | undefined;
  project: Project | undefined;
}>;

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * Shows a project's handle, display name, description and creation time, and lets the caller edit and
 * delete it. Holds no data of its own: pass the project and handle the changes.
 *
 * Slots: `actions`, rendered next to the project's name; `default`, a scoped slot that replaces the view with
 * custom UI and receives {@link BaseProjectDetailsRenderProps}.
 */
const BaseProjectDetails: Component = defineComponent({
  name: 'BaseProjectDetails',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isDeleting: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    isUpdating: {default: false, type: Boolean},
    /** Deletes the project. The delete action is hidden when omitted. Also available as `@delete`. */
    onDelete: {default: undefined, type: Function as PropType<() => void>},
    /** Saves a new display name and description. The edit action is hidden when omitted. Also available as `@update`. */
    onUpdate: {default: undefined, type: Function as PropType<(changes: ProjectUpdateSubmission) => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** The project to show. */
    project: {default: undefined, type: Object as PropType<Project>},
  },
  setup(props: BaseProjectDetailsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const draft: Ref<{description: string; displayName: string} | null> = ref(null);

    return (): VNode => {
      const {project} = props;

      if (slots['default']) {
        const renderProps: BaseProjectDetailsRenderProps = {
          error: props.error,
          isDeleting: props.isDeleting,
          isLoading: props.isLoading,
          isUpdating: props.isUpdating,
          onDelete: project ? props.onDelete : undefined,
          onUpdate: project ? props.onUpdate : undefined,
          project,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      if (props.isLoading && !project) {
        return h(
          AdminSection,
          {block: 'project-details', className: props.className},
          {
            default: (): VNode =>
              h('span', {class: cls('muted'), role: 'status'}, [
                h(Spinner, {'aria-hidden': 'true', size: 'small'}),
                t('admin.common.loading'),
              ]),
          },
        );
      }

      if (!project) {
        return h(
          AdminSection,
          {block: 'project-details', className: props.className},
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

      const notSet: string = t('admin.projects.details.not_set');

      const renderEdit = (current: {description: string; displayName: string}): VNode =>
        renderEditPanel({
          canSave: Boolean(current.displayName.trim()),
          fields: [
            h(TextField, {
              label: t('admin.projects.fields.display_name'),
              modelValue: current.displayName,
              name: `${uid}-displayName`,
              'onUpdate:modelValue': (value: string): void => {
                draft.value = {...current, displayName: value};
              },
              required: true,
            }),
            h(TextField, {
              label: t('admin.projects.fields.description'),
              modelValue: current.description,
              name: `${uid}-description`,
              'onUpdate:modelValue': (value: string): void => {
                draft.value = {...current, description: value};
              },
            }),
          ],
          isSaving: props.isUpdating,
          onCancel: (): void => {
            draft.value = null;
          },
          onSave: (): void => {
            props.onUpdate?.({
              description: current.description.trim() || undefined,
              displayName: current.displayName.trim(),
            });
            draft.value = null;
          },
          saveLabel: t('admin.projects.details.edit.save'),
          t,
          title: t('admin.projects.details.edit.action'),
        });

      return h(
        AdminSection,
        {
          block: 'project-details',
          className: props.className,
          description: project.description,
          title: project.displayName,
        },
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onDelete
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('admin.projects.details.delete.confirm', {name: project.displayName}),
                    isLoading: props.isDeleting,
                    onConfirm: props.onDelete,
                    t,
                  },
                  {default: (): string => t('admin.projects.details.delete.action')},
                )
              : null,
          ],
          default: (): (VNode | null)[] => [
            props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
            draft.value
              ? renderEdit(draft.value)
              : h(
                  Panel,
                  {title: t('admin.projects.details.overview')},
                  {
                    actions: (): VNode | null =>
                      props.onUpdate
                        ? h(
                            Button,
                            {
                              onClick: (): void => {
                                draft.value = {
                                  description: project.description ?? '',
                                  displayName: project.displayName,
                                };
                              },
                              size: 'small',
                              variant: 'outline',
                            },
                            {default: (): string => t('admin.projects.details.edit.action')},
                          )
                        : null,
                    default: (): VNode =>
                      h(DetailList, {
                        items: [
                          {label: t('admin.projects.fields.handle'), value: project.handle},
                          {label: t('admin.projects.fields.display_name'), value: project.displayName},
                          {
                            label: t('admin.projects.fields.description'),
                            value: project.description?.length ? project.description : notSet,
                          },
                          {
                            label: t('admin.projects.fields.created'),
                            value: formatTimestamp(project.createdAt) ?? notSet,
                          },
                        ],
                      }),
                  },
                ),
          ],
        },
      );
    };
  },
});

export default BaseProjectDetails;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Component, type Ref, type SetupContext, type VNode, defineComponent, h, ref, useId} from 'vue';
import TextField from '../../primitives/TextField/TextField';
import {type AdminFormProps, type AdminFormRenderProps, adminFormProps} from '../shared/adminFormProps';
import renderAdminForm from '../shared/renderAdminForm';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The project `BaseProjectCreate` emits on `submit`.
 */
export interface ProjectCreateSubmission {
  description?: string;
  displayName: string;
  /** Immutable identifier: lowercase letters, numbers, hyphens and underscores. */
  handle: string;
}

/**
 * The fields of `BaseProjectCreate`.
 */
export type ProjectCreateField = 'description' | 'displayName' | 'handle';

/**
 * What `BaseProjectCreate` hands its default scoped slot, so the form can be built with any UI.
 */
export interface BaseProjectCreateRenderProps extends AdminFormRenderProps {
  /** Sets one field of the form. */
  handleInputChange: (field: ProjectCreateField, value: string) => void;
  values: Record<ProjectCreateField, string>;
}

/**
 * A form that collects a new project's handle, display name and description. Holds no data of its
 * own: handle the `submit` event, which carries a {@link ProjectCreateSubmission}. Slots: `default`, a
 * scoped slot that replaces the form with custom UI and receives {@link BaseProjectCreateRenderProps}.
 */
const BaseProjectCreate: Component = defineComponent({
  name: 'BaseProjectCreate',
  props: {
    ...adminFormProps,
  },
  emits: ['submit'],
  setup(props: AdminFormProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const values: Ref<Record<ProjectCreateField, string>> = ref({description: '', displayName: '', handle: ''});

    const setField = (field: ProjectCreateField, value: string): void => {
      values.value = {...values.value, [field]: value};
    };

    const field = (name: ProjectCreateField, label: string, extra: Record<string, unknown> = {}): VNode =>
      h(TextField, {
        label,
        modelValue: values.value[name],
        name: `${uid}-${name}`,
        'onUpdate:modelValue': (value: string): void => setField(name, value),
        ...extra,
      });

    return (): VNode =>
      renderAdminForm({
        block: 'project-create',
        canSubmit: Boolean(values.value.handle.trim() && values.value.displayName.trim()),
        fields: [
          field('handle', t('admin.projects.fields.handle'), {
            helperText: t('admin.projects.fields.handle_hint'),
            required: true,
          }),
          field('displayName', t('admin.projects.fields.display_name'), {required: true}),
          field('description', t('admin.projects.fields.description')),
        ],
        onSubmit: (): void => {
          emit('submit', {
            description: values.value.description.trim() || undefined,
            displayName: values.value.displayName.trim(),
            handle: values.value.handle.trim(),
          } satisfies ProjectCreateSubmission);
        },
        props,
        renderProps: {
          handleInputChange: setField,
          values: {...values.value},
        } satisfies Omit<BaseProjectCreateRenderProps, keyof AdminFormRenderProps>,
        slot: slots['default'],
        submitLabel: t('admin.projects.create.submit'),
        t,
        title: t('admin.projects.create.title'),
      });
  },
});

export default BaseProjectCreate;

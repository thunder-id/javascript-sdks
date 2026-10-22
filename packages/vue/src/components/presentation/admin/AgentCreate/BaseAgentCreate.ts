// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {SelectOption} from '@thunderid/browser';
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
import Select from '../../../primitives/Select/Select';
import TextField from '../../../primitives/TextField/TextField';
import {type AdminFormProps, type AdminFormRenderProps, adminFormProps} from '../shared/adminFormProps';
import renderAdminForm from '../shared/renderAdminForm';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The agent `BaseAgentCreate` emits on `submit`. The organization unit is added by the caller.
 */
export interface AgentCreateSubmission {
  description?: string;
  name: string;
  type: string;
}

type BaseAgentCreateProps = AdminFormProps & Readonly<{agentTypes: SelectOption[]}>;

/**
 * What `BaseAgentCreate` hands its default scoped slot, so the form can be built with any UI.
 */
export interface BaseAgentCreateRenderProps extends AdminFormRenderProps {
  agentTypes: SelectOption[];
  /** Sets one field of the form. */
  handleInputChange: (field: 'description' | 'name' | 'type', value: string) => void;
  values: {description: string; name: string; type: string};
}

/**
 * A form that collects a new agent's name, type and description. Holds no data of its own: handle the
 * `submit` event, which carries a {@link AgentCreateSubmission}. Slots: `default`, a scoped slot that
 * replaces the form with custom UI and receives {@link BaseAgentCreateRenderProps}.
 */
const BaseAgentCreate: Component = defineComponent({
  name: 'BaseAgentCreate',
  props: {
    ...adminFormProps,
    /** The agent types to choose from. The first one is selected by default. */
    agentTypes: {required: true, type: Array as PropType<SelectOption[]>},
  },
  emits: ['submit'],
  setup(props: BaseAgentCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const name: Ref<string> = ref('');
    const description: Ref<string> = ref('');
    const chosenType: Ref<string> = ref('');

    return (): VNode => {
      const type: string = chosenType.value || (props.agentTypes[0]?.value ?? '');

      return renderAdminForm({
        block: 'agent-create',
        canSubmit: Boolean(name.value.trim()) && Boolean(type),
        fields: [
          h(TextField, {
            label: t('admin.agents.create.fields.name'),
            modelValue: name.value,
            name: `${uid}-name`,
            'onUpdate:modelValue': (value: string): void => {
              name.value = value;
            },
            required: true,
          }),
          h(Select, {
            label: t('admin.agents.create.fields.type'),
            modelValue: type,
            name: `${uid}-type`,
            'onUpdate:modelValue': (value: string): void => {
              chosenType.value = value;
            },
            options: props.agentTypes,
            required: true,
          }),
          h(TextField, {
            label: t('admin.agents.create.fields.description'),
            modelValue: description.value,
            name: `${uid}-description`,
            'onUpdate:modelValue': (value: string): void => {
              description.value = value;
            },
          }),
        ],
        onSubmit: (): void => {
          emit('submit', {
            description: description.value.trim() || undefined,
            name: name.value.trim(),
            type,
          } satisfies AgentCreateSubmission);
        },
        props,
        renderProps: {
          agentTypes: props.agentTypes,
          handleInputChange: (field: 'description' | 'name' | 'type', value: string): void => {
            ({description, name, type: chosenType})[field].value = value;
          },
          values: {description: description.value, name: name.value, type},
        } satisfies Omit<BaseAgentCreateRenderProps, keyof AdminFormRenderProps>,
        slot: slots['default'],
        submitLabel: t('admin.agents.create.submit'),
        t,
        title: t('admin.agents.create.title'),
      });
    };
  },
});

export default BaseAgentCreate;

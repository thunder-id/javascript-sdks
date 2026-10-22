// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type SelectOption, withVendorCSSClassPrefix} from '@thunderid/browser';
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
import type {AdminTranslate} from './useAdminTranslation';
import Button from '../../../primitives/Button/Button';
import Select from '../../../primitives/Select/Select';

/**
 * An identity that can be picked, such as a user, agent or group.
 */
export interface IdentityCandidate {
  id: string;
  label: string;
}

type IdentityPickerProps = Readonly<{
  addLabel: string;
  candidates: Partial<Record<string, IdentityCandidate[]>>;
  excludedIds: string[];
  isSubmitting: boolean;
  t: AdminTranslate;
  types: {label: string; value: string}[];
}>;

/**
 * Picks one identity of a chosen type and emits `add` with it, for example to add a group member or a
 * role assignee.
 */
const IdentityPicker: Component = defineComponent({
  name: 'AdminIdentityPicker',
  props: {
    /** Label of the add button, already translated. */
    addLabel: {required: true, type: String},
    /** The identities to choose from, keyed by identity type. */
    candidates: {required: true, type: Object as PropType<Partial<Record<string, IdentityCandidate[]>>>},
    /** Identifiers to leave out, such as current members. */
    excludedIds: {default: () => [], type: Array as PropType<string[]>},
    isSubmitting: {default: false, type: Boolean},
    t: {required: true, type: Function as PropType<AdminTranslate>},
    /** The identity types to choose from, with translated labels. */
    types: {required: true, type: Array as PropType<{label: string; value: string}[]>},
  },
  emits: ['add'],
  setup(props: IdentityPickerProps, {emit}: SetupContext): () => VNode {
    const uid: string = useId();
    const chosenType: Ref<string> = ref('');
    const identityId: Ref<string> = ref('');

    const handleSubmit = (event: Event, type: string): void => {
      event.preventDefault();

      if (identityId.value) {
        emit('add', {id: identityId.value, type});
        identityId.value = '';
      }
    };

    return (): VNode => {
      const type: string = chosenType.value || (props.types[0]?.value ?? '');
      const options: SelectOption[] = (props.candidates[type] ?? [])
        .filter((candidate: IdentityCandidate) => !props.excludedIds.includes(candidate.id))
        .map((candidate: IdentityCandidate) => ({label: candidate.label, value: candidate.id}));

      return h(
        'form',
        {class: withVendorCSSClassPrefix('admin__picker'), onSubmit: (event: Event): void => handleSubmit(event, type)},
        [
          h(Select, {
            label: props.t('admin.common.fields.identity_type'),
            modelValue: type,
            name: `${uid}-identity-type`,
            'onUpdate:modelValue': (value: string): void => {
              chosenType.value = value;
              identityId.value = '';
            },
            options: props.types,
          }),
          h(Select, {
            emptyText: props.t('admin.common.fields.identity_empty'),
            label: props.t('admin.common.fields.identity'),
            modelValue: identityId.value,
            name: `${uid}-identity`,
            'onUpdate:modelValue': (value: string): void => {
              identityId.value = value;
            },
            options,
            placeholder: props.t('admin.common.fields.identity_placeholder'),
          }),
          h(
            Button,
            {disabled: !identityId.value || props.isSubmitting, loading: props.isSubmitting, type: 'submit'},
            {default: (): string => props.addLabel},
          ),
        ],
      );
    };
  },
});

export default IdentityPicker;

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
import Select from '../../primitives/Select/Select';
import TextField from '../../primitives/TextField/TextField';
import {type AdminFormProps, type AdminFormRenderProps, adminFormProps} from '../shared/adminFormProps';
import renderAdminForm from '../shared/renderAdminForm';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The organization unit `BaseOrganizationUnitCreate` emits on `submit`.
 */
export interface OrganizationUnitCreateSubmission {
  description?: string;
  handle: string;
  name: string;
  /** Identifier of the parent organization unit, or `null` for a unit at the top level. */
  parentId: string | null;
}

/**
 * The fields of `BaseOrganizationUnitCreate`. `parentId` is the parent's identifier, or an empty string for the top
 * level.
 */
export type OrganizationUnitCreateField = 'description' | 'handle' | 'name' | 'parentId';

/**
 * What `BaseOrganizationUnitCreate` hands its default scoped slot, so the form can be built with any UI.
 */
export interface BaseOrganizationUnitCreateRenderProps extends AdminFormRenderProps {
  /** Sets one field of the form. */
  handleInputChange: (field: OrganizationUnitCreateField, value: string) => void;
  isLoadingParents: boolean;
  /** Loads more parent options. Undefined when every option is loaded or the parent is fixed. */
  onLoadMoreParents?: () => void;
  /** The parents to choose from. Empty when the parent is fixed by `parentId`. */
  parentOptions: SelectOption[];
  values: Record<OrganizationUnitCreateField, string>;
}

type BaseOrganizationUnitCreateProps = AdminFormProps &
  Readonly<{
    defaultParentId: string | undefined;
    isLoadingParents: boolean;
    onLoadMoreParents: (() => void) | undefined;
    parentId: string | undefined;
    parentOptions: SelectOption[] | undefined;
  }>;

type TextFieldName = 'description' | 'handle' | 'name';

/**
 * A form that collects a new organization unit's name, handle, description and parent. Holds no data
 * of its own: pass the parent or the parents to choose from, and handle the `submit` event, which carries an
 * {@link OrganizationUnitCreateSubmission}. Slots: `default`, a scoped slot that replaces the form with custom UI
 * and receives {@link BaseOrganizationUnitCreateRenderProps}.
 */
const BaseOrganizationUnitCreate: Component = defineComponent({
  name: 'BaseOrganizationUnitCreate',
  props: {
    ...adminFormProps,
    /** The parent preselected in the picker. */
    defaultParentId: {default: undefined, type: String},
    isLoadingParents: {default: false, type: Boolean},
    /** Loads more parent options. */
    onLoadMoreParents: {default: undefined, type: Function as PropType<() => void>},
    /** The parent of the new unit. When set, the parent picker is hidden. */
    parentId: {default: undefined, type: String},
    /** The parents the picker offers. The picker shows when `parentId` is not set and this is. */
    parentOptions: {default: undefined, type: Array as PropType<SelectOption[]>},
  },
  emits: ['submit'],
  setup(props: BaseOrganizationUnitCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const fields: Ref<Record<TextFieldName, string>> = ref({description: '', handle: '', name: ''});
    // Undefined until the user picks, so a default that arrives later still applies.
    const chosenParentId: Ref<string | undefined> = ref(undefined);

    const setField = (field: OrganizationUnitCreateField, value: string): void => {
      if (field === 'parentId') {
        chosenParentId.value = value;
      } else {
        fields.value = {...fields.value, [field]: value};
      }
    };

    const text = (name: TextFieldName, label: string, required = false): VNode =>
      h(TextField, {
        label,
        modelValue: fields.value[name],
        name: `${uid}-${name}`,
        'onUpdate:modelValue': (value: string): void => setField(name, value),
        required,
      });

    return (): VNode => {
      const parentId: string = props.parentId ?? chosenParentId.value ?? props.defaultParentId ?? '';
      const showsPicker: boolean = props.parentId === undefined && props.parentOptions !== undefined;

      return renderAdminForm({
        block: 'organization-unit-create',
        canSubmit: Boolean(fields.value.name.trim() && fields.value.handle.trim()),
        fields: [
          text('name', t('admin.organization_units.fields.name'), true),
          text('handle', t('admin.organization_units.fields.handle'), true),
          text('description', t('admin.organization_units.fields.description')),
          showsPicker
            ? h(Select, {
                label: t('admin.organization_units.fields.parent'),
                loading: props.isLoadingParents,
                modelValue: parentId,
                name: `${uid}-parentId`,
                onLoadMore: props.onLoadMoreParents,
                'onUpdate:modelValue': (value: string): void => setField('parentId', value),
                options: props.parentOptions,
                placeholder: t('admin.organization_units.fields.parent_none'),
              })
            : null,
        ],
        onSubmit: (): void => {
          emit('submit', {
            description: fields.value.description.trim() || undefined,
            handle: fields.value.handle.trim(),
            name: fields.value.name.trim(),
            parentId: parentId || null,
          } satisfies OrganizationUnitCreateSubmission);
        },
        props,
        renderProps: {
          handleInputChange: setField,
          isLoadingParents: props.isLoadingParents,
          onLoadMoreParents: showsPicker ? props.onLoadMoreParents : undefined,
          parentOptions: props.parentId === undefined ? (props.parentOptions ?? []) : [],
          values: {...fields.value, parentId},
        } satisfies Omit<BaseOrganizationUnitCreateRenderProps, keyof AdminFormRenderProps>,
        slot: slots['default'],
        submitLabel: t('admin.organization_units.create.submit'),
        t,
        title: t('admin.organization_units.create.title'),
      });
    };
  },
});

export default BaseOrganizationUnitCreate;

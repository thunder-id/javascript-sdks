// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ManagedUser, MembershipGroup} from '@thunderid/browser';
import {
  type AdminListRenderProps,
  type BaseGroupCreateRenderProps,
  type BaseUserDetailsRenderProps,
  type DataTableColumn,
  useTheme,
} from '@thunderid/vue';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Chip from 'primevue/chip';
import Column from 'primevue/column';
import DataTable, {type DataTablePageEvent, type DataTableRowSelectEvent} from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import {Component, defineComponent, h, onBeforeUnmount, VNode, VNodeChild, watchEffect} from 'vue';

/**
 * Follows the playground's light or dark preview with PrimeVue's palette. PrimeVue resolves its
 * component tokens on the root element, so the dark mode class goes on `<html>`.
 */
export const PrimeTheme: Component = defineComponent({
  name: 'PrimeTheme',
  setup(_props: Record<string, never>, {slots}: {slots: {default?: () => VNodeChild}}): () => VNode {
    const {colorScheme} = useTheme();

    watchEffect(() => document.documentElement.classList.toggle('pg-prime-dark', colorScheme.value === 'dark'));
    onBeforeUnmount(() => document.documentElement.classList.remove('pg-prime-dark'));

    return (): VNode => h('div', {class: 'pg-prime-root'}, slots.default?.() as VNode[]);
  },
});

/**
 * The user list's default scoped slot drawn as a PrimeVue DataTable: the SDK's columns become table
 * columns, and the table's lazy paging maps onto the SDK's offset-based paging.
 */
export const userTable = (state: AdminListRenderProps<ManagedUser>): VNode =>
  h('div', {class: 'pg-prime-stack'}, [
    state.error ? h(Message, {severity: 'error'}, {default: () => state.error}) : null,
    h(
      DataTable,
      {
        dataKey: 'id',
        first: state.offset,
        lazy: true,
        loading: state.isLoading,
        onPage: (event: DataTablePageEvent) => state.onPageChange?.(event.first),
        onRowSelect: (event: DataTableRowSelectEvent) => state.onSelect?.(event.data as ManagedUser),
        paginator: Boolean(state.onPageChange),
        rows: state.limit,
        selection: state.rows.find((row: ManagedUser) => row.id === state.selectedRowId),
        selectionMode: state.onSelect ? 'single' : undefined,
        size: 'small',
        totalRecords: state.totalResults,
        value: state.rows,
      },
      {
        default: () =>
          state.columns.map((column: DataTableColumn<ManagedUser>) =>
            h(
              Column,
              {field: column.id, header: column.header, key: column.id},
              {
                body: ({data}: {data: ManagedUser}) => column.render(data),
              },
            ),
          ),
      },
    ),
  ]);

/** The group form's default scoped slot drawn with PrimeVue inputs. */
export const groupForm = (state: BaseGroupCreateRenderProps): VNode =>
  h(
    Card,
    {},
    {
      content: () =>
        h('div', {class: 'pg-prime-stack'}, [
          state.error ? h(Message, {severity: 'error'}, {default: () => state.error}) : null,
          h('label', {class: 'pg-prime-field'}, [
            h('span', 'Name *'),
            h(InputText, {
              modelValue: state.values.name,
              'onUpdate:modelValue': (value: string | undefined) => state.handleInputChange('name', value ?? ''),
            }),
          ]),
          h('label', {class: 'pg-prime-field'}, [
            h('span', 'Description'),
            h(Textarea, {
              autoResize: true,
              modelValue: state.values.description,
              'onUpdate:modelValue': (value: string) => state.handleInputChange('description', value),
              rows: 2,
            }),
          ]),
        ]),
      footer: () =>
        h('div', {class: 'pg-prime-actions'}, [
          state.onCancel
            ? h(Button, {label: 'Cancel', onClick: state.onCancel, severity: 'secondary', text: true})
            : null,
          h(Button, {
            disabled: !state.isValid || state.isSubmitting,
            label: 'Create group',
            loading: state.isSubmitting,
            onClick: state.handleSubmit,
          }),
        ]),
      subtitle: () => "Rendered with PrimeVue from the SDK's default scoped slot",
      title: () => 'New group',
    },
  );

/** The user details' default scoped slot drawn as a PrimeVue card. */
export const userCard = (state: BaseUserDetailsRenderProps): VNode =>
  h(
    Card,
    {},
    {
      content: () =>
        h('div', {class: 'pg-prime-stack'}, [
          state.error ? h(Message, {severity: 'error'}, {default: () => state.error}) : null,
          h(
            'div',
            {class: 'pg-prime-chips'},
            Object.entries(state.attributes).map(([name, value]: [string, unknown]) =>
              h(Chip, {key: name, label: `${name}: ${String(value)}`}),
            ),
          ),
          h(
            'div',
            {class: 'pg-prime-chips'},
            state.groups.map((group: MembershipGroup) =>
              h(Chip, {class: 'pg-prime-group', key: group.id, label: group.name}),
            ),
          ),
        ]),
      footer: () =>
        state.onDelete
          ? h('div', {class: 'pg-prime-actions'}, [
              h(Button, {
                label: 'Delete',
                loading: state.isDeleting,
                onClick: state.onDelete,
                severity: 'danger',
                text: true,
              }),
            ])
          : null,
      subtitle: () => (state.user ? `${state.user.type} · ${state.user.ouHandle ?? state.user.ouId}` : ''),
      title: () =>
        h('div', {class: 'pg-prime-title'}, [
          h(Avatar, {label: state.displayName.slice(0, 1), shape: 'circle'}),
          state.isLoading && !state.user ? 'Loading…' : state.displayName,
        ]),
    },
  );

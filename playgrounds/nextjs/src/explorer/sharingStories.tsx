// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import type {SharingResourceType} from '@thunderid/browser';
import {SharingPolicies} from '@thunderid/nextjs';
import {bool, jsx, str} from './helpers';
import {AREA_SOURCE, source} from './managementAreaStoryKit';
import {SharingSample} from './ManagementAreaWidgets';
import Narrow from './Narrow';
import type {Action, Args, ComponentDef} from './types';

export const SHARING_STORIES: ComponentDef[] = [
  {
    code: (args: Args) => {
      const target = `resourceType="${str(args, 'resourceType')}" resourceId={${str(args, 'resourceType')}Id}`;

      if (source(args) === 'custom') {
        return {
          imports: ['SharingPolicies'],
          jsx: `<SharingPolicies ${target} editable>
  {({policies, describeScope, onCreate, onDelete, isSubmitting}) => (
    <List dense>
      {policies.map((policy) => (
        <ListItem
          key={policy.id}
          secondaryAction={
            onDelete && !policy.isReadOnly && (
              // Ask before deleting: the custom render owns the confirmation.
              <Button color="error" onClick={() => confirm('Delete this policy?') && onDelete(policy)}>Delete</Button>
            )
          }
        >
          <ListItemText primary={describeScope(policy).join(' · ')} secondary={\`version \${policy.version}\`} />
        </ListItem>
      ))}
      {onCreate && (
        <Button loading={isSubmitting} onClick={() => onCreate({childUnits: {mode: 'all'}})}>Share with every child unit</Button>
      )}
    </List>
  )}
</SharingPolicies>`,
          otherImports: ["import {Button, List, ListItem, ListItemText} from '@mui/material';"],
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['SharingPolicies'],
            jsx: jsx(
              'SharingPolicies',
              {editable: bool(args, 'editable'), ouId: str(args, 'ouId')},
              {
                extra: [target],
              },
            ),
          }
        : {
            imports: ['BaseSharingPolicies'],
            jsx: jsx(
              'BaseSharingPolicies',
              {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
              {
                extra: [
                  'policies={policies}',
                  ...(bool(args, 'editable') ? ['onCreate={create}', 'onUpdate={update}', 'onDelete={remove}'] : []),
                  ...(str(args, 'ouId') ? [`overlayOuId="${str(args, 'ouId')}"`, 'overlay={overlay}'] : []),
                ],
              },
            ),
          };
    },
    controls: [
      AREA_SOURCE,
      {
        control: ['user', 'application', 'role', 'flow'],
        description: 'The kind of resource whose sharing policies are shown (live).',
        name: 'resourceType',
        type: "'user' | 'application' | 'role' | 'flow'",
      },
      {control: 'text', description: 'Live only: the resource to load.', name: 'resourceId', type: 'string'},
      {
        control: 'text',
        description: 'Shows the overlay rules that apply in this organization unit, read only.',
        name: 'ouId',
        type: 'string',
      },
      {
        control: 'bool',
        description: 'Allows adding, editing and deleting policies (onCreate, onUpdate, onDelete).',
        name: 'editable',
        type: 'boolean',
      },
      {control: 'bool', description: 'Base only: shows the loading row.', name: 'isLoading', type: 'boolean'},
      {control: 'text', description: 'Base only: error shown in the table.', name: 'error', type: 'string | null'},
    ],
    defaults: {
      editable: true,
      error: '',
      isLoading: false,
      ouId: '',
      resourceId: '',
      resourceType: 'role',
      source: 'base',
    },
    group: 'Admin: sharing',
    id: 'sharingpolicies',
    live: true,
    name: 'SharingPolicies',
    render: (args: Args, action: Action) => {
      if (source(args) === 'live') {
        if (!str(args, 'resourceId')) {
          return (
            <Narrow width={420}>Set the resourceId control to a {str(args, 'resourceType')} from your server.</Narrow>
          );
        }

        return (
          <Narrow width={720}>
            <SharingPolicies
              resourceType={str(args, 'resourceType') as SharingResourceType}
              resourceId={str(args, 'resourceId')}
              ouId={str(args, 'ouId') || undefined}
              editable={bool(args, 'editable')}
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={720}>
          <SharingSample action={action} args={args} custom={source(args) === 'custom'} />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Sample policies'},
      {args: {editable: false}, id: 'readonly', name: 'Read only'},
      {args: {ouId: 'ou_sales'}, id: 'overlay', name: 'With overlay rules'},
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs resourceId)'},
    ],
  },
];

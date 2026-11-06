// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type AccessibleOrganizationUnit, OrganizationUnitSwitcher} from '@thunderid/react';
import {SampleSwitcher} from './OrganizationUnitStoryWidgets';
import {jsx, num, omit, str} from './storyHelpers';
import {Narrow} from './StoryWidgets';
import type {Action, Args, ComponentDef} from './types';

export const ORGANIZATION_UNIT_SWITCHER_STORY: ComponentDef = {
  code: (args: Args) => {
    if (str(args, 'source') === 'custom') {
      return {
        imports: ['OrganizationUnitSwitcher'],
        jsx: `<OrganizationUnitSwitcher limit={${num(args, 'limit') || 2}}>
  {({organizationUnits, current, switchingId, error, onSwitch}) => (
    <List dense>
      {error && <Alert severity="error">{error}</Alert>}
      {organizationUnits.map((unit) => (
        <ListItem
          key={unit.id}
          secondaryAction={
            unit.id === current ? (
              <Chip color="primary" size="small" label="Current" />
            ) : (
              <Button size="small" loading={switchingId === unit.id} onClick={() => onSwitch(unit)}>Switch</Button>
            )
          }
        >
          <ListItemText primary={unit.name} secondary={unit.handle} />
        </ListItem>
      ))}
    </List>
  )}
</OrganizationUnitSwitcher>`,
        otherImports: ["import {Alert, Button, Chip, List, ListItem, ListItemText} from '@mui/material';"],
      };
    }

    return str(args, 'source') === 'live'
      ? {imports: ['OrganizationUnitSwitcher'], jsx: jsx('OrganizationUnitSwitcher', omit(args, 'source'), {})}
      : {
          imports: ['BaseOrganizationUnitSwitcher'],
          jsx: jsx('BaseOrganizationUnitSwitcher', omit(args, 'source', 'scope'), {
            extra: ['organizationUnits={units}', 'current={currentId}', 'onSwitch={handleSwitch}'],
          }),
        };
  },
  controls: [
    {
      control: ['base', 'live', 'custom'],
      description:
        "base renders the Base component with sample units; live lists the signed-in user's units and switches the session; custom draws the sample units with MUI through the children render function.",
      name: 'source',
      type: "'base' | 'live' | 'custom' (playground only)",
    },
    {control: ['', 'siblings'], description: 'Narrows the list (live only).', name: 'scope', type: "'siblings'"},
    {control: 'number', description: 'Page size.', name: 'limit', type: 'number'},
    {control: 'text', description: 'Label above the current unit.', name: 'title', type: 'string'},
  ],
  defaults: {limit: 2, scope: '', source: 'base', title: ''},
  group: 'User',
  id: 'organizationunitswitcher',
  live: true,
  name: 'OrganizationUnitSwitcher',
  render: (args: Args, action: Action) =>
    str(args, 'source') === 'live' ? (
      <Narrow width={480}>
        <OrganizationUnitSwitcher
          limit={num(args, 'limit') || 10}
          scope={str(args, 'scope') === 'siblings' ? 'siblings' : undefined}
          title={str(args, 'title') || undefined}
          onError={(error: unknown) => action('onError', error instanceof Error ? error.message : String(error))}
          onSwitch={(unit: AccessibleOrganizationUnit) => action('onSwitch', unit.handle)}
        />
      </Narrow>
    ) : (
      <Narrow width={480}>
        <SampleSwitcher args={args} action={action} />
      </Narrow>
    ),
  stories: [
    {id: 'base', name: 'Sample units'},
    {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
    {args: {source: 'live'}, id: 'live', name: 'Signed-in user'},
  ],
};

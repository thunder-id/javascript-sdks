// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import MuiAlert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import {
  type AccessibleOrganizationUnit,
  BaseOrganizationUnitSwitcher,
  type OrganizationUnitSwitcherRenderProps,
} from '@thunderid/react';
import {ReactElement, useState} from 'react';
import {Mui} from './CustomRenderWidgets';
import {num, str} from './storyHelpers';
import type {Action, Args} from './types';

const SAMPLE_UNITS: AccessibleOrganizationUnit[] = [
  {handle: 'acme', id: 'ou-acme', name: 'Acme'},
  {handle: 'acme-eu', id: 'ou-acme-eu', name: 'Acme Europe'},
  {handle: 'acme-us', id: 'ou-acme-us', name: 'Acme Americas'},
  {handle: 'globex', id: 'ou-globex', name: 'Globex'},
];

/**
 * The switcher drawn with MUI through the children render function.
 */
export const MuiSwitcher = ({
  current,
  error,
  organizationUnits,
  onSwitch,
  switchingId,
}: OrganizationUnitSwitcherRenderProps): ReactElement => (
  <Mui>
    {error && <MuiAlert severity="error">{error}</MuiAlert>}
    <List dense>
      {organizationUnits.map((unit: AccessibleOrganizationUnit) => (
        <ListItem
          key={unit.id}
          secondaryAction={
            unit.id === current ? (
              <Chip color="primary" size="small" label="Current" />
            ) : (
              <Button size="small" loading={switchingId === unit.id} onClick={(): void => onSwitch(unit)}>
                Switch
              </Button>
            )
          }
        >
          <ListItemText primary={unit.name} secondary={unit.handle} />
        </ListItem>
      ))}
    </List>
  </Mui>
);

/**
 * The Base component with sample data, paged and switching locally.
 */
export const SampleSwitcher = ({args, action}: {action: Action; args: Args}): ReactElement => {
  const limit: number = num(args, 'limit') || 2;
  const [offset, setOffset] = useState<number>(0);
  const [current, setCurrent] = useState<string>('ou-acme');
  const custom: boolean = str(args, 'source') === 'custom';

  return (
    <BaseOrganizationUnitSwitcher
      current={current}
      limit={limit}
      offset={offset}
      organizationUnits={SAMPLE_UNITS.slice(offset, offset + limit)}
      title={str(args, 'title') || undefined}
      totalResults={SAMPLE_UNITS.length}
      onPageChange={(next: number): void => {
        action('onPageChange', String(next));
        setOffset(next);
      }}
      onSwitch={(unit: AccessibleOrganizationUnit): void => {
        action('onSwitch', unit.handle);
        setCurrent(unit.id);
      }}
    >
      {custom ? (props: OrganizationUnitSwitcherRenderProps): ReactElement => <MuiSwitcher {...props} /> : undefined}
    </BaseOrganizationUnitSwitcher>
  );
};

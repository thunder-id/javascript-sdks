// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {createTheme, EmbeddedFlowComponent, EmbeddedFlowComponentType} from '@thunderid/browser';
import {type ReactElement, useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ThemeContext from '../../../../contexts/Theme/ThemeContext';
import {renderInviteUserComponents} from '../AuthOptionFactory';

const roles: EmbeddedFlowComponent = {
  id: 'roles_input_new',
  label: 'Roles',
  ref: 'roles',
  required: true,
  type: EmbeddedFlowComponentType.RoleSelect,
};
const roleOptions = '[{"id":"r-dev","name":"Developer"},{"id":"r-view","name":"Viewer"}]';
const t = (key: string): string => `t:${key}`;

// The flow's form, as an invite component keeps it, around the factory's rendering.
const Step = ({
  component = roles,
  initial = '',
  onChange,
  options = roleOptions,
}: {
  component?: EmbeddedFlowComponent;
  initial?: string;
  onChange?: (value: string) => void;
  options?: string;
}): ReactElement => {
  const [values, setValues] = useState<Record<string, string>>({roles: initial});
  const elements = renderInviteUserComponents(
    [component],
    values,
    {roles: true},
    {},
    false,
    true,
    () => undefined,
    (name: string, value: string) => {
      setValues({...values, [name]: value});
      onChange?.(value);
    },
    {additionalData: {roleOptions: options}, t},
  );

  return (
    <ThemeContext.Provider value={{colorScheme: 'light', direction: 'ltr', theme: createTheme(), toggleTheme: vi.fn()}}>
      <div>{elements}</div>
    </ThemeContext.Provider>
  );
};

describe('ROLE_SELECT', () => {
  afterEach(cleanup);

  it('offers a checkbox for each role the step sends, named for the role', () => {
    render(<Step />);

    // A required field's label carries the asterisk, as the SDK's other fields do.
    expect(screen.getByRole('group', {name: /^Roles/})).toBeTruthy();
    expect(screen.getByRole('checkbox', {name: 'Developer'})).toBeTruthy();
    expect(screen.getByRole('checkbox', {name: 'Viewer'})).toBeTruthy();
  });

  it('takes the picked roles as their IDs, space-separated', () => {
    const onChange = vi.fn();
    render(<Step onChange={onChange} />);

    fireEvent.click(screen.getByRole('checkbox', {name: 'Developer'}));
    fireEvent.click(screen.getByRole('checkbox', {name: 'Viewer'}));
    expect(onChange).toHaveBeenLastCalledWith('r-dev r-view');

    fireEvent.click(screen.getByRole('checkbox', {name: 'Developer'}));
    expect(onChange).toHaveBeenLastCalledWith('r-view');
  });

  it('shows the roles already picked as checked', () => {
    render(<Step initial="r-view" />);

    expect((screen.getByRole('checkbox', {name: 'Viewer'}) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', {name: 'Developer'}) as HTMLInputElement).checked).toBe(false);
  });

  it('says so when the step offers no roles', () => {
    render(<Step options="[]" />);

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByText('t:elements.fields.role_select.empty')).toBeTruthy();
  });

  it('names the group from the bundle when the step gives it no label', () => {
    render(<Step component={{...roles, label: undefined}} />);

    expect(screen.getByRole('group', {name: 't:elements.fields.role_select.aria_label'})).toBeTruthy();
  });
});

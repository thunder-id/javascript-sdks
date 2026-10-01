// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen, cleanup, fireEvent, waitFor} from '@testing-library/react';
import {createTheme} from '@thunderid/browser';
import type {FetchUsers, PagedSelectRequest} from '@thunderid/browser';
import {ReactElement} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeContext, {ThemeContextValue} from '../../../../contexts/Theme/ThemeContext';
import BaseUserSelect from '../BaseUserSelect';

const themeContextValue: ThemeContextValue = {
  colorScheme: 'light',
  direction: 'ltr',
  theme: createTheme(),
  toggleTheme: vi.fn(),
};

const withProviders = (ui: ReactElement): ReactElement => (
  <I18nProvider>
    <ThemeContext.Provider value={themeContextValue}>{ui}</ThemeContext.Provider>
  </I18nProvider>
);

const users = [
  {attributes: {email: 'alice@example.com', username: 'alice'}, display: 'u1', id: 'u1'},
  {attributes: {email: 'bob@example.com'}, id: 'u2'},
  {id: 'u3'},
];

describe('BaseUserSelect', () => {
  afterEach(() => {
    cleanup();
  });

  it('submits the user ID and labels users from display, username, email, then the ID', async () => {
    const fetchUsers: FetchUsers = vi.fn().mockResolvedValue({items: users, nextOffset: null});
    const onChange = vi.fn();
    render(withProviders(<BaseUserSelect fetchUsers={fetchUsers} label="Owner" onChange={onChange} />));

    fireEvent.click(screen.getByRole('combobox', {name: 'Owner'}));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'alice',
      'bob@example.com',
      'u3',
    ]);

    fireEvent.click(screen.getByRole('option', {name: 'alice'}));
    expect(onChange).toHaveBeenCalledWith({target: {value: 'u1'}});
  });

  it('honours a mapping over the user defaults', async () => {
    const fetchUsers: FetchUsers = vi.fn().mockResolvedValue({items: users.slice(0, 2), nextOffset: null});
    const onChange = vi.fn();
    render(
      withProviders(
        <BaseUserSelect
          fetchUsers={fetchUsers}
          label="Owner"
          mapping={{labelAttributes: ['email'], valueAttribute: 'email'}}
          onChange={onChange}
        />,
      ),
    );

    fireEvent.click(screen.getByRole('combobox', {name: 'Owner'}));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    fireEvent.click(screen.getByRole('option', {name: 'bob@example.com'}));

    expect(onChange).toHaveBeenCalledWith({target: {value: 'bob@example.com'}});
  });

  it('identifies itself as a USER_SELECT field to the loader', async () => {
    let request: PagedSelectRequest | undefined;
    const fetchUsers: FetchUsers = vi.fn().mockImplementation((received: PagedSelectRequest) => {
      request = received;
      return Promise.resolve({items: [], nextOffset: null});
    });
    render(withProviders(<BaseUserSelect fetchUsers={fetchUsers} id="owner" label="Owner" />));

    fireEvent.click(screen.getByRole('combobox', {name: 'Owner'}));
    await waitFor(() => expect(request).toBeDefined());

    expect(request?.component).toMatchObject({id: 'owner', type: 'USER_SELECT'});
  });

  it('uses user wording for empty and unlabelled states', async () => {
    const fetchUsers: FetchUsers = vi.fn().mockResolvedValue({items: [], nextOffset: null});
    render(withProviders(<BaseUserSelect fetchUsers={fetchUsers} />));

    fireEvent.click(screen.getByRole('combobox', {name: 'Select a user'}));

    expect(await screen.findByText('No users found.')).toBeInTheDocument();
  });
});

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen, cleanup, fireEvent, waitFor, within} from '@testing-library/react';
import {
  createTheme,
  FetchPagedOptions,
  PagedSelectPage,
  PagedSelectRequest,
  ThunderIDAPIError,
} from '@thunderid/browser';
import {ReactElement} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeContext, {ThemeContextValue} from '../../../../contexts/Theme/ThemeContext';
import PagedSelect from '../PagedSelect';

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

const page = (start: number, count: number, totalResults: number): PagedSelectPage => ({
  nextOffset: start + count < totalResults ? start + count : null,
  options: Array.from({length: count}, (_, index) => ({
    label: `User ${start + index + 1}`,
    value: `user-${start + index + 1}`,
  })),
  totalResults,
});

describe('PagedSelect', () => {
  afterEach(() => {
    cleanup();
  });

  it('makes no request while closed', () => {
    const fetchOptions: FetchPagedOptions = vi.fn();
    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));

    expect(fetchOptions).not.toHaveBeenCalled();
  });

  it('requests exactly one page of the default size on first open', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue(page(0, 30, 75));
    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));

    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(30));
    expect(fetchOptions).toHaveBeenCalledTimes(1);
    expect(fetchOptions).toHaveBeenCalledWith(expect.objectContaining({filter: undefined, limit: 30, offset: 0}));
  });

  it('does not refetch on reopening within the same session', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue(page(0, 30, 30));
    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));

    const trigger = screen.getByRole('combobox', {name: /assignee/i});
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(30));

    fireEvent.click(trigger); // close
    fireEvent.click(trigger); // reopen
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(30));

    expect(fetchOptions).toHaveBeenCalledTimes(1);
  });

  it('loads the next page when the listbox scrolls near the bottom', async () => {
    const fetchOptions: FetchPagedOptions = vi
      .fn()
      .mockResolvedValueOnce(page(0, 30, 75))
      .mockResolvedValueOnce(page(30, 30, 75));

    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));
    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(30));

    const listbox: HTMLElement = screen.getByRole('listbox');
    Object.defineProperty(listbox, 'scrollHeight', {configurable: true, value: 1000});
    Object.defineProperty(listbox, 'clientHeight', {configurable: true, value: 300});
    Object.defineProperty(listbox, 'scrollTop', {configurable: true, value: 1000 - 300});

    fireEvent.scroll(listbox);

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(60));
    expect(fetchOptions).toHaveBeenCalledTimes(2);
    expect(fetchOptions).toHaveBeenNthCalledWith(2, expect.objectContaining({limit: 30, offset: 30}));
  });

  it('stops paging once nextOffset is null', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue(page(0, 10, 10));
    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));

    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(10));

    expect(screen.queryByRole('button', {name: /load more/i})).not.toBeInTheDocument();
  });

  it('submits the option value, not its label, on selection', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue(page(0, 3, 3));
    const onChange = vi.fn();
    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" onChange={onChange} />));

    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

    fireEvent.click(screen.getByRole('option', {name: 'User 2'}));

    expect(onChange).toHaveBeenCalledWith({target: {value: 'user-2'}});
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows a retry control when the first page fails, and recovers on retry', async () => {
    const fetchOptions: FetchPagedOptions = vi
      .fn()
      .mockRejectedValueOnce(new ThunderIDAPIError('Upstream exploded', 'test-code', 'test-origin', 500))
      .mockResolvedValueOnce(page(0, 5, 5));

    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));
    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));

    expect(await within(screen.getByRole('listbox')).findByText('Upstream exploded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: /retry/i}));

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(5));
    expect(fetchOptions).toHaveBeenCalledTimes(2);
  });

  it('shows the generic translated message instead of a raw exception', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockRejectedValueOnce(new Error('a raw exception message'));

    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));
    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));

    expect(await within(screen.getByRole('listbox')).findByText('Failed to load options.')).toBeInTheDocument();
    expect(screen.queryByText('a raw exception message')).not.toBeInTheDocument();
  });

  it('renders no request-driving UI when fetchOptions is not provided but still shows the trigger', () => {
    render(withProviders(<PagedSelect label="Assignee" />));

    expect(screen.getByRole('combobox', {name: /assignee/i})).toBeInTheDocument();
  });

  it('preserves a previously selected ID even when its page is not loaded', () => {
    render(withProviders(<PagedSelect label="Assignee" value="user-99" />));

    expect(within(screen.getByRole('combobox', {name: /assignee/i})).getByText('user-99')).toBeInTheDocument();
  });

  it('forwards the request payload passed to fetchOptions, including the AbortSignal', async () => {
    let received: PagedSelectRequest | undefined;
    const fetchOptions: FetchPagedOptions = vi.fn().mockImplementation((request: PagedSelectRequest) => {
      received = request;
      return Promise.resolve(page(0, 1, 1));
    });

    render(
      withProviders(<PagedSelect fetchOptions={fetchOptions} filter='department eq "Engineering"' label="Assignee" />),
    );
    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.filter).toBe('department eq "Engineering"');
    expect(received?.signal).toBeInstanceOf(AbortSignal);
  });

  it('shows the configured label field and submits the configured value field for raw objects', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue({
      items: [
        {email: 'alice@example.com', fullName: 'Alice Example', id: 'u1'},
        {email: 'bob@example.com', fullName: 'Bob Example', id: 'u2'},
      ],
      nextOffset: null,
    });
    const onChange = vi.fn();
    render(
      withProviders(
        <PagedSelect
          fetchOptions={fetchOptions}
          label="Assignee"
          mapping={{labelAttributes: ['fullName'], valueAttribute: 'email'}}
          onChange={onChange}
        />,
      ),
    );

    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    fireEvent.click(screen.getByRole('option', {name: 'Bob Example'}));

    expect(onChange).toHaveBeenCalledWith({target: {value: 'bob@example.com'}});
  });

  it('lists a plain array of strings with the text as both label and value', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue({items: ['alice@example.com'], nextOffset: null});
    const onChange = vi.fn();
    render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" onChange={onChange} />));

    fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    fireEvent.click(screen.getByRole('option', {name: 'alice@example.com'}));

    expect(onChange).toHaveBeenCalledWith({target: {value: 'alice@example.com'}});
  });

  describe('keyboard', () => {
    it('opens with ArrowDown on the trigger and moves focus between options with the arrow keys', async () => {
      const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue(page(0, 3, 3));
      render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));

      const trigger: HTMLElement = screen.getByRole('combobox', {name: /assignee/i});
      trigger.focus();
      fireEvent.keyDown(trigger, {key: 'ArrowDown'});
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

      await waitFor(() => expect(screen.getByRole('option', {name: 'User 1'})).toHaveFocus());
      fireEvent.keyDown(screen.getByRole('option', {name: 'User 1'}), {key: 'ArrowDown'});
      await waitFor(() => expect(screen.getByRole('option', {name: 'User 2'})).toHaveFocus());
      fireEvent.keyDown(screen.getByRole('option', {name: 'User 2'}), {key: 'ArrowUp'});
      await waitFor(() => expect(screen.getByRole('option', {name: 'User 1'})).toHaveFocus());
    });

    it('skips a disabled option and selects the focused one with Enter', async () => {
      const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue({
        nextOffset: null,
        options: [
          {label: 'User 1', value: 'user-1'},
          {disabled: true, label: 'Suspended', value: 'user-2'},
          {label: 'User 3', value: 'user-3'},
        ],
      });
      const onChange = vi.fn();
      render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" onChange={onChange} />));

      const trigger: HTMLElement = screen.getByRole('combobox', {name: /assignee/i});
      trigger.focus();
      fireEvent.keyDown(trigger, {key: 'ArrowDown'});
      await waitFor(() => expect(screen.getByRole('option', {name: 'User 1'})).toHaveFocus());

      fireEvent.keyDown(screen.getByRole('option', {name: 'User 1'}), {key: 'ArrowDown'});
      await waitFor(() => expect(screen.getByRole('option', {name: 'User 3'})).toHaveFocus());
      expect(screen.getByRole('option', {name: 'Suspended'})).not.toHaveFocus();

      fireEvent.click(screen.getByRole('option', {name: 'User 3'}));
      expect(onChange).toHaveBeenCalledWith({target: {value: 'user-3'}});
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue(page(0, 3, 3));
      render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));

      const trigger: HTMLElement = screen.getByRole('combobox', {name: /assignee/i});
      trigger.focus();
      fireEvent.keyDown(trigger, {key: 'ArrowDown'});
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

      fireEvent.keyDown(screen.getByRole('listbox'), {key: 'Escape'});

      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
      expect(trigger).toHaveFocus();
    });
  });

  describe('a page that maps to no options while more pages remain', () => {
    it('still offers Load more, and does not claim the list is empty', async () => {
      const fetchOptions: FetchPagedOptions = vi
        .fn()
        .mockResolvedValueOnce({nextOffset: 30, options: []})
        .mockResolvedValueOnce(page(30, 2, 32));
      render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));

      fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));

      const loadMore: HTMLElement = await screen.findByRole('button', {name: /load more/i});
      expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument();

      fireEvent.click(loadMore);
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
      expect(fetchOptions).toHaveBeenNthCalledWith(2, expect.objectContaining({offset: 30}));
    });

    it('shows the empty message only once the list is genuinely exhausted', async () => {
      const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue({nextOffset: null, options: []});
      render(withProviders(<PagedSelect fetchOptions={fetchOptions} label="Assignee" />));

      fireEvent.click(screen.getByRole('combobox', {name: /assignee/i}));

      expect(await screen.findByText(/no results found/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', {name: /load more/i})).not.toBeInTheDocument();
    });
  });
});

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {
  AccessibleOrganizationUnit,
  AccessibleOrganizationUnitList,
  OrganizationUnitSwitchErrorCodes,
  ThunderIDAPIError,
} from '@thunderid/browser';
import {ReactElement} from 'react';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import BaseOrganizationUnitSwitcher, {OrganizationUnitSwitcherRenderProps} from '../BaseOrganizationUnitSwitcher';
import OrganizationUnitSwitcher from '../OrganizationUnitSwitcher';

const mockGetAccessibleOrganizationUnits = vi.fn() as Mock;

vi.mock('../../../../api/account/getAccessibleOrganizationUnits', () => ({
  default: (...args: unknown[]): unknown => mockGetAccessibleOrganizationUnits(...args) as unknown,
}));

const acme: AccessibleOrganizationUnit = {handle: 'acme', id: 'ou-acme', name: 'Acme'};
const globex: AccessibleOrganizationUnit = {handle: 'globex', id: 'ou-globex', name: 'Globex'};

const page = (overrides: Partial<AccessibleOrganizationUnitList> = {}): AccessibleOrganizationUnitList => ({
  count: 2,
  current: 'ou-acme',
  organizationUnits: [acme, globex],
  startIndex: 1,
  totalResults: 2,
  ...overrides,
});

const buildContext = (overrides: Partial<ThunderIDContextProps> = {}): ThunderIDContextProps =>
  ({
    baseUrl: 'https://localhost:8090',
    currentOrganizationUnit: null,
    instanceId: 0,
    isInitialized: true,
    isLoading: false,
    isSignedIn: true,
    switchOrganizationUnit: vi.fn().mockResolvedValue({sub: 'alice'}),
    vendor: 'thunderid',
    ...overrides,
  }) as unknown as ThunderIDContextProps;

const providers = (node: ReactElement, context: ThunderIDContextProps): ReactElement => (
  <ThunderIDContext.Provider value={context}>
    <I18nProvider>
      <ThemeProvider>{node}</ThemeProvider>
    </I18nProvider>
  </ThunderIDContext.Provider>
);

const wrap = (node: ReactElement, context: ThunderIDContextProps = buildContext()): ReturnType<typeof render> =>
  render(providers(node, context));

/** The field that shows the current unit and opens the menu. */
const field = (): HTMLElement => screen.getByRole('button', {name: /^Organization/});

const openMenu = async (): Promise<void> => {
  fireEvent.click(field());
  await screen.findByRole('listbox');
};

const option = (name: string): HTMLElement => screen.getByRole('option', {name: new RegExp(name)});

describe('OrganizationUnitSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessibleOrganizationUnits.mockResolvedValue(page());
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the current unit under a small label and lists the units in a menu', async () => {
    wrap(<OrganizationUnitSwitcher />);

    await waitFor(() => expect(field().textContent).toBe('OrganizationAcme'));
    expect(field().getAttribute('aria-haspopup')).toBe('listbox');
    expect(field().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('listbox')).toBeNull();

    await openMenu();

    expect(field().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(option('Acme').getAttribute('aria-selected')).toBe('true');
    expect(option('Globex').getAttribute('aria-selected')).toBe('false');
    expect(option('Globex').textContent).toContain('globex');
  });

  it('requests the scope and page it is given', async () => {
    wrap(<OrganizationUnitSwitcher limit={5} scope="siblings" />);

    await waitFor(() => expect(mockGetAccessibleOrganizationUnits).toHaveBeenCalled());
    expect(mockGetAccessibleOrganizationUnits.mock.calls[0][0]).toMatchObject({
      baseUrl: 'https://localhost:8090',
      limit: 5,
      offset: 0,
      scope: 'siblings',
    });
  });

  it('switches to the picked unit, closes the menu and reloads the list', async () => {
    const context: ThunderIDContextProps = buildContext();
    const onSwitch = vi.fn();
    wrap(<OrganizationUnitSwitcher onSwitch={onSwitch} />, context);
    await screen.findByText('Acme');

    await openMenu();
    fireEvent.click(option('Globex'));

    expect(screen.queryByRole('listbox')).toBeNull();
    await waitFor(() => expect(context.switchOrganizationUnit).toHaveBeenCalledWith('ou-globex', undefined));
    await waitFor(() => expect(onSwitch).toHaveBeenCalledWith(globex, {sub: 'alice'}));
    await waitFor(() => expect(mockGetAccessibleOrganizationUnits).toHaveBeenCalledTimes(2));
  });

  it('hands the pick to onSelect instead of switching', async () => {
    const context: ThunderIDContextProps = buildContext();
    const onSelect = vi.fn();
    wrap(<OrganizationUnitSwitcher onSelect={onSelect} />, context);
    await screen.findByText('Acme');

    await openMenu();
    fireEvent.click(option('Globex'));

    expect(onSelect).toHaveBeenCalledWith(globex);
    expect(context.switchOrganizationUnit).not.toHaveBeenCalled();
  });

  it('shows a translated message under the field when the application cannot be used from the unit', async () => {
    const onError = vi.fn();
    const failure: ThunderIDAPIError = new ThunderIDAPIError(
      'unauthorized_client',
      OrganizationUnitSwitchErrorCodes.UnauthorizedClient,
      'browser',
      400,
    );
    const context: ThunderIDContextProps = buildContext({
      switchOrganizationUnit: vi.fn().mockRejectedValue(failure),
    });
    wrap(<OrganizationUnitSwitcher onError={onError} />, context);
    await screen.findByText('Acme');

    await openMenu();
    fireEvent.click(option('Globex'));

    expect((await screen.findByRole('alert')).textContent).toBe('This application cannot be used from Globex.');
    expect(onError).toHaveBeenCalledWith(failure);
    // The previous unit stays current.
    expect(field().textContent).toBe('OrganizationAcme');
  });

  it('asks the user to sign in again when the switch needs interaction', async () => {
    const context: ThunderIDContextProps = buildContext({
      switchOrganizationUnit: vi
        .fn()
        .mockRejectedValue(new ThunderIDAPIError('x', OrganizationUnitSwitchErrorCodes.InteractionRequired, 'browser')),
    });
    wrap(<OrganizationUnitSwitcher />, context);
    await screen.findByText('Acme');

    await openMenu();
    fireEvent.click(option('Globex'));

    expect(await screen.findByText('Sign in again to switch to Globex.')).toBeTruthy();
  });

  it('shows a translated message when the units cannot be loaded', async () => {
    mockGetAccessibleOrganizationUnits.mockRejectedValue(
      new ThunderIDAPIError('nope', 'getAccessibleOrganizationUnits-ForbiddenError-001', 'javascript', 403),
    );
    wrap(<OrganizationUnitSwitcher />);

    expect((await screen.findByRole('alert')).textContent).toBe('The organization units could not be loaded.');
  });

  it('moves between pages from inside the menu', async () => {
    mockGetAccessibleOrganizationUnits.mockResolvedValue(page({count: 2, totalResults: 3}));
    wrap(<OrganizationUnitSwitcher limit={2} />);
    await screen.findByText('Acme');

    await openMenu();
    fireEvent.click(screen.getByRole('button', {name: 'Next'}));

    await waitFor(() =>
      expect(mockGetAccessibleOrganizationUnits.mock.calls.at(-1)?.[0]).toMatchObject({limit: 2, offset: 2}),
    );
    expect(screen.getByRole('button', {name: 'Previous'})).toBeTruthy();
  });

  it('shows the current unit from the session when the list does not include it', async () => {
    mockGetAccessibleOrganizationUnits.mockResolvedValue(page({current: 'ou-initech'}));
    wrap(
      <OrganizationUnitSwitcher />,
      buildContext({currentOrganizationUnit: {handle: 'initech', id: 'ou-initech', name: 'Initech'}}),
    );

    await waitFor(() => expect(field().textContent).toBe('OrganizationInitech'));
  });

  it('does not load while signed out', () => {
    wrap(<OrganizationUnitSwitcher />, buildContext({isSignedIn: false}));

    expect(mockGetAccessibleOrganizationUnits).not.toHaveBeenCalled();
  });

  it('passes the data and actions to a custom render', async () => {
    const context: ThunderIDContextProps = buildContext({
      currentOrganizationUnit: {handle: 'acme', id: 'ou-acme', name: 'Acme'},
    });
    const renderer = vi.fn((props: OrganizationUnitSwitcherRenderProps) => (
      <div>
        <span data-testid="current">{props.current}</span>
        {props.organizationUnits.map((unit: AccessibleOrganizationUnit) => (
          <button key={unit.id} type="button" onClick={(): void => props.onSwitch(unit)}>
            go {unit.handle}
          </button>
        ))}
      </div>
    ));
    wrap(<OrganizationUnitSwitcher>{renderer}</OrganizationUnitSwitcher>, context);

    fireEvent.click(await screen.findByRole('button', {name: 'go globex'}));

    expect(screen.getByTestId('current').textContent).toBe('ou-acme');
    expect(screen.queryByRole('button', {name: /^Organization/})).toBeNull();
    await waitFor(() => expect(context.switchOrganizationUnit).toHaveBeenCalledWith('ou-globex', undefined));
    expect(renderer.mock.calls.at(-1)?.[0]).toMatchObject({currentName: 'Acme', limit: 10, offset: 0, totalResults: 2});
  });
});

describe('BaseOrganizationUnitSwitcher', () => {
  afterEach(() => {
    cleanup();
  });

  it('reports a pick of another unit and closes the menu', async () => {
    const onSwitch = vi.fn();
    wrap(<BaseOrganizationUnitSwitcher current="ou-globex" organizationUnits={[acme, globex]} onSwitch={onSwitch} />);

    expect(field().textContent).toBe('OrganizationGlobex');
    await openMenu();
    fireEvent.click(option('Acme'));

    expect(onSwitch).toHaveBeenCalledWith(acme);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes without a switch when the current unit is picked', async () => {
    const onSwitch = vi.fn();
    wrap(<BaseOrganizationUnitSwitcher current="ou-acme" organizationUnits={[acme, globex]} onSwitch={onSwitch} />);

    await openMenu();
    fireEvent.click(option('Acme'));

    expect(onSwitch).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('picks a unit with the keyboard and closes on Escape', async () => {
    const onSwitch = vi.fn();
    wrap(<BaseOrganizationUnitSwitcher current="ou-acme" organizationUnits={[acme, globex]} onSwitch={onSwitch} />);

    await openMenu();
    // The menu opens on the current unit, so the first arrow moves past it, and the list wraps.
    fireEvent.keyDown(field(), {key: 'ArrowDown'});
    await waitFor(() => expect(document.activeElement).toBe(option('Globex')));
    fireEvent.keyDown(option('Globex'), {key: 'ArrowDown'});
    await waitFor(() => expect(document.activeElement).toBe(option('Acme')));
    fireEvent.keyDown(option('Acme'), {key: 'Escape'});

    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('shows the unit being switched to and disables the field', () => {
    wrap(<BaseOrganizationUnitSwitcher current="ou-acme" organizationUnits={[acme, globex]} switchingId="ou-globex" />);

    expect(field().textContent).toBe('OrganizationSwitching to Globex…');
    expect((field() as HTMLButtonElement).disabled).toBe(true);
  });

  it('uses the given label, or none', () => {
    const {rerender} = wrap(
      <BaseOrganizationUnitSwitcher current="ou-acme" organizationUnits={[acme]} title="Workspace" />,
    );

    expect(screen.getByRole('button', {name: 'Workspace Acme'})).toBeTruthy();

    rerender(
      providers(<BaseOrganizationUnitSwitcher current="ou-acme" organizationUnits={[acme]} title="" />, buildContext()),
    );

    expect(screen.getByRole('button', {name: 'Acme'})).toBeTruthy();
  });

  it('shows a placeholder, then the loading and empty states in the menu', async () => {
    const {rerender} = wrap(<BaseOrganizationUnitSwitcher organizationUnits={[]} />);

    expect(field().textContent).toBe('OrganizationSelect an organization');
    fireEvent.click(field());
    expect(await screen.findByText('No organization units are available.')).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();

    rerender(providers(<BaseOrganizationUnitSwitcher isLoading organizationUnits={[]} />, buildContext()));

    expect(screen.getAllByText('Loading organization units…').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('hands everything to a custom render', () => {
    const onPageChange = vi.fn();
    wrap(
      <BaseOrganizationUnitSwitcher
        current="ou-acme"
        limit={1}
        offset={0}
        organizationUnits={[acme]}
        totalResults={2}
        onPageChange={onPageChange}
      >
        {({organizationUnits, totalResults, onPageChange: change}: OrganizationUnitSwitcherRenderProps) => (
          <button type="button" onClick={(): void => change(1)}>
            {organizationUnits.length} of {totalResults}
          </button>
        )}
      </BaseOrganizationUnitSwitcher>,
    );

    fireEvent.click(screen.getByRole('button', {name: '1 of 2'}));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});

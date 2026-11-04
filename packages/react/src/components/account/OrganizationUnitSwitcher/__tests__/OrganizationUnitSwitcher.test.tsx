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

const wrap = (node: ReactElement, context: ThunderIDContextProps = buildContext()): ReturnType<typeof render> =>
  render(
    <ThunderIDContext.Provider value={context}>
      <I18nProvider>
        <ThemeProvider>{node}</ThemeProvider>
      </I18nProvider>
    </ThunderIDContext.Provider>,
  );

describe('OrganizationUnitSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccessibleOrganizationUnits.mockResolvedValue(page());
  });

  afterEach(() => {
    cleanup();
  });

  it('lists the accessible units and marks the current one', async () => {
    wrap(<OrganizationUnitSwitcher />);

    expect(await screen.findByText('Globex')).toBeTruthy();
    const current: HTMLElement = screen.getByText('Acme').closest('li')!;

    expect(current.getAttribute('aria-current')).toBe('true');
    expect(current.textContent).toContain('Current');
    expect(screen.getByRole('button', {name: /switch globex/i})).toBeTruthy();
    expect(screen.queryByRole('button', {name: /switch acme/i})).toBeNull();
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

  it('switches to the picked unit and reloads the list', async () => {
    const context: ThunderIDContextProps = buildContext();
    const onSwitch = vi.fn();
    wrap(<OrganizationUnitSwitcher onSwitch={onSwitch} />, context);

    fireEvent.click(await screen.findByRole('button', {name: /switch globex/i}));

    await waitFor(() => expect(context.switchOrganizationUnit).toHaveBeenCalledWith('ou-globex', undefined));
    await waitFor(() => expect(onSwitch).toHaveBeenCalledWith(globex, {sub: 'alice'}));
    await waitFor(() => expect(mockGetAccessibleOrganizationUnits).toHaveBeenCalledTimes(2));
  });

  it('hands the pick to onSelect instead of switching', async () => {
    const context: ThunderIDContextProps = buildContext();
    const onSelect = vi.fn();
    wrap(<OrganizationUnitSwitcher onSelect={onSelect} />, context);

    fireEvent.click(await screen.findByRole('button', {name: /switch globex/i}));

    expect(onSelect).toHaveBeenCalledWith(globex);
    expect(context.switchOrganizationUnit).not.toHaveBeenCalled();
  });

  it('shows a translated message when the application cannot be used from the unit', async () => {
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

    fireEvent.click(await screen.findByRole('button', {name: /switch globex/i}));

    expect(await screen.findByText('This application cannot be used from Globex.')).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(failure);
    // The previous unit stays current.
    expect(screen.getByText('Acme').closest('li')!.getAttribute('aria-current')).toBe('true');
  });

  it('asks the user to sign in again when the switch needs interaction', async () => {
    const context: ThunderIDContextProps = buildContext({
      switchOrganizationUnit: vi
        .fn()
        .mockRejectedValue(new ThunderIDAPIError('x', OrganizationUnitSwitchErrorCodes.InteractionRequired, 'browser')),
    });
    wrap(<OrganizationUnitSwitcher />, context);

    fireEvent.click(await screen.findByRole('button', {name: /switch globex/i}));

    expect(await screen.findByText('Sign in again to switch to Globex.')).toBeTruthy();
  });

  it('shows a translated message when the units cannot be loaded', async () => {
    mockGetAccessibleOrganizationUnits.mockRejectedValue(
      new ThunderIDAPIError('nope', 'getAccessibleOrganizationUnits-ForbiddenError-001', 'javascript', 403),
    );
    wrap(<OrganizationUnitSwitcher />);

    expect(await screen.findByText('The organization units could not be loaded.')).toBeTruthy();
  });

  it('moves between pages', async () => {
    mockGetAccessibleOrganizationUnits.mockResolvedValue(page({count: 2, totalResults: 3}));
    wrap(<OrganizationUnitSwitcher limit={2} />);

    fireEvent.click(await screen.findByRole('button', {name: 'Next'}));

    await waitFor(() =>
      expect(mockGetAccessibleOrganizationUnits.mock.calls.at(-1)?.[0]).toMatchObject({limit: 2, offset: 2}),
    );
  });

  it('does not load while signed out', () => {
    wrap(<OrganizationUnitSwitcher />, buildContext({isSignedIn: false}));

    expect(mockGetAccessibleOrganizationUnits).not.toHaveBeenCalled();
  });

  it('passes the data and actions to a custom render', async () => {
    const context: ThunderIDContextProps = buildContext();
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
    expect(screen.queryByText('Switch organization unit')).toBeNull();
    await waitFor(() => expect(context.switchOrganizationUnit).toHaveBeenCalledWith('ou-globex', undefined));
    expect(renderer.mock.calls.at(-1)?.[0]).toMatchObject({limit: 10, offset: 0, totalResults: 2});
  });
});

describe('BaseOrganizationUnitSwitcher', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the units it is given and reports a switch', () => {
    const onSwitch = vi.fn();
    wrap(<BaseOrganizationUnitSwitcher current="ou-globex" organizationUnits={[acme, globex]} onSwitch={onSwitch} />);

    expect(screen.getByText('Globex').closest('li')!.getAttribute('aria-current')).toBe('true');
    fireEvent.click(screen.getByRole('button', {name: /switch acme/i}));

    expect(onSwitch).toHaveBeenCalledWith(acme);
  });

  it('shows the empty and loading states', () => {
    const {rerender} = wrap(<BaseOrganizationUnitSwitcher organizationUnits={[]} />);

    expect(screen.getByText('No organization units are available.')).toBeTruthy();

    rerender(
      <ThunderIDContext.Provider value={buildContext()}>
        <I18nProvider>
          <ThemeProvider>
            <BaseOrganizationUnitSwitcher isLoading />
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );

    expect(screen.getByText('Loading organization units…')).toBeTruthy();
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

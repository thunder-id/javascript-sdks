// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {ApiFetcher, Project, SharingPolicy, createResourceInvalidator} from '@thunderid/browser';
import {ReactElement, ReactNode, useState} from 'react';
import {Mock, afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../contexts/ThunderID/ThunderIDContext';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import UserContext, {UserContextProps} from '../../../contexts/User/UserContext';
import AgentCreate from '../AgentCreate/AgentCreate';
import AgentList from '../AgentList/AgentList';
import ApplicationCreate from '../ApplicationCreate/ApplicationCreate';
import ApplicationList from '../ApplicationList/ApplicationList';
import GroupCreate from '../GroupCreate/GroupCreate';
import BaseOrganizationUnitCreate, {
  BaseOrganizationUnitCreateRenderProps,
} from '../OrganizationUnitCreate/BaseOrganizationUnitCreate';
import OrganizationUnitCreate from '../OrganizationUnitCreate/OrganizationUnitCreate';
import BaseOrganizationUnitDetails, {
  BaseOrganizationUnitDetailsRenderProps,
} from '../OrganizationUnitDetails/BaseOrganizationUnitDetails';
import OrganizationUnitDetails from '../OrganizationUnitDetails/OrganizationUnitDetails';
import BaseOrganizationUnitList, {
  BaseOrganizationUnitListRenderProps,
} from '../OrganizationUnitList/BaseOrganizationUnitList';
import OrganizationUnitList from '../OrganizationUnitList/OrganizationUnitList';
import BaseProjectCreate, {BaseProjectCreateRenderProps} from '../ProjectCreate/BaseProjectCreate';
import ProjectCreate from '../ProjectCreate/ProjectCreate';
import BaseProjectDetails, {BaseProjectDetailsRenderProps} from '../ProjectDetails/BaseProjectDetails';
import ProjectDetails from '../ProjectDetails/ProjectDetails';
import BaseProjectList, {BaseProjectListRenderProps} from '../ProjectList/BaseProjectList';
import ProjectList from '../ProjectList/ProjectList';
import BaseProjectSwitcher, {BaseProjectSwitcherRenderProps} from '../ProjectSwitcher/BaseProjectSwitcher';
import ProjectSwitcher from '../ProjectSwitcher/ProjectSwitcher';
import BaseSharingPolicies, {BaseSharingPoliciesRenderProps} from '../SharingPolicies/BaseSharingPolicies';
import SharingPolicies from '../SharingPolicies/SharingPolicies';

type FetcherMock = Mock<ApiFetcher>;

const baseUrl = 'https://localhost:8090';

const projects: Project[] = [
  {
    createdAt: '2026-01-02T03:04:05Z',
    description: 'The default project',
    displayName: 'Default',
    handle: 'default',
    id: 'p-1',
  },
  {createdAt: '2026-02-02T03:04:05Z', displayName: 'Shop', handle: 'shop', id: 'p-2'},
];

const unit = {
  description: 'Builds things',
  handle: 'engineering',
  id: 'ou-1',
  name: 'Engineering',
  parent: 'p-1',
  themeId: 'theme-1',
};

const policies: SharingPolicy[] = [
  {childUnits: {mode: 'all'}, id: 'sp-1', stage: 'share', version: 3},
  {
    childUnits: {mode: 'selected', units: [{ouId: 'ou-2', reach: 'subtree'}]},
    id: 'sp-2',
    otherTreeRoots: {mode: 'selected', units: [{ouId: 'ou-9'}]},
    version: 1,
  },
  {allUnits: {}, id: 'sp-3', isReadOnly: true, version: 1},
];

const respond = (body: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 400 ? 'Error' : 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

/**
 * Answers the requests the components send, by method and path.
 */
const createFetcher = (overrides: Record<string, () => Response> = {}): FetcherMock =>
  vi.fn<ApiFetcher>((url: string, init: RequestInit) => {
    const {pathname} = new URL(url);
    const method: string = init.method ?? 'GET';
    const override: (() => Response) | undefined = overrides[`${method} ${pathname}`];

    if (override) return Promise.resolve(override());
    if (method === 'GET' && pathname === '/projects') {
      return Promise.resolve(respond({count: 2, projects, startIndex: 1, totalResults: 2}));
    }
    if (method === 'GET' && pathname.startsWith('/projects/')) return Promise.resolve(respond(projects[0]));
    if (method === 'POST' && pathname === '/projects') {
      return Promise.resolve(respond({...JSON.parse(init.body as string), createdAt: 'now', id: 'p-9'}, 201));
    }
    if (method === 'PUT' && pathname.startsWith('/projects/')) {
      return Promise.resolve(respond({...projects[0], ...JSON.parse(init.body as string)}));
    }
    if (method === 'GET' && pathname === '/organization-units') {
      return Promise.resolve(
        respond({
          organizationUnits: projects.map((p: Project) => ({handle: p.handle, id: p.id, name: p.displayName})),
          totalResults: 2,
        }),
      );
    }
    if (method === 'GET' && pathname === '/organization-units/ou-1') return Promise.resolve(respond(unit));
    if (method === 'GET' && pathname === '/organization-units/p-1') {
      return Promise.resolve(respond({handle: 'default', id: 'p-1', name: 'Default', parent: null}));
    }
    if (method === 'GET' && pathname.endsWith('/ous')) {
      return Promise.resolve(
        respond({organizationUnits: [{handle: 'platform', id: 'ou-2', name: 'Platform'}], totalResults: 1}),
      );
    }
    if (method === 'GET' && pathname.endsWith('/users')) {
      return Promise.resolve(respond({totalResults: 1, users: [{display: 'Aiko Tanaka', id: 'u-1'}]}));
    }
    if (method === 'GET' && pathname.endsWith('/groups') && pathname.startsWith('/organization-units')) {
      return Promise.resolve(respond({groups: [{id: 'g-1', name: 'Support'}], totalResults: 1}));
    }
    if (method === 'GET' && pathname.endsWith('/roles') && pathname.startsWith('/organization-units')) {
      return Promise.resolve(respond({roles: [{id: 'r-1', name: 'Viewer'}], totalResults: 1}));
    }
    if (method === 'POST' && pathname === '/organization-units') {
      return Promise.resolve(respond({...JSON.parse(init.body as string), id: 'ou-9'}, 201));
    }
    if (method === 'PUT' && pathname === '/organization-units/ou-1') {
      return Promise.resolve(respond({...unit, ...JSON.parse(init.body as string)}));
    }
    if (method === 'GET' && pathname.endsWith('/sharing-policies')) {
      return Promise.resolve(respond({policies, totalResults: 3}));
    }
    if (method === 'GET' && pathname.endsWith('/overlay-rules')) {
      return Promise.resolve(
        respond({
          isOwnedByOU: false,
          ouId: 'ou-2',
          policyIds: ['sp-1'],
          rules: {roles: {allowedValues: ['viewer']}},
          visible: true,
        }),
      );
    }
    if (method === 'POST' && pathname.endsWith('/sharing-policies')) {
      return Promise.resolve(respond({id: 'sp-9', ...JSON.parse(init.body as string)}, 201));
    }
    if (method === 'PUT' && pathname.includes('/sharing-policies/')) {
      return Promise.resolve(respond({id: 'sp-1', ...JSON.parse(init.body as string)}));
    }
    if (method === 'DELETE') return Promise.resolve(respond(null, 204));
    if (method === 'POST' && pathname === '/groups') {
      return Promise.resolve(respond({id: 'g-9', ...JSON.parse(init.body as string)}, 201));
    }

    return Promise.resolve(respond({}, 404));
  });

const serverRefusal =
  (code: string, status = 400) =>
  (): Response =>
    respond({code, message: {defaultValue: code}}, status);

const requests = (fetcher: FetcherMock, method: string): [string, RequestInit][] =>
  fetcher.mock.calls.filter(([, init]: [string, RequestInit]) => (init.method ?? 'GET') === method);

function Providers({
  children,
  fetcher,
  initialProject = null,
  ouId,
}: {
  children: ReactNode;
  fetcher?: ApiFetcher;
  initialProject?: Project | null;
  ouId?: string;
}): ReactElement {
  const [currentProject, setCurrentProject] = useState<Project | null>(initialProject);
  const [invalidator] = useState(() => createResourceInvalidator());
  const thunderID = {
    baseUrl,
    currentProject,
    http: {fetcher},
    instanceId: 0,
    invalidator,
    isInitialized: true,
    isLoading: false,
    setCurrentProject,
    vendor: 'thunderid',
  } as unknown as ThunderIDContextProps;
  const user = {flattenedProfile: ouId ? {ouId} : null, profile: null} as unknown as UserContextProps;

  return (
    <ThunderIDContext.Provider value={thunderID}>
      <UserContext.Provider value={user}>
        <I18nProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </I18nProvider>
      </UserContext.Provider>
    </ThunderIDContext.Provider>
  );
}

const renderWithProviders = (
  ui: ReactElement,
  options: {fetcher?: ApiFetcher; initialProject?: Project | null; ouId?: string} = {},
): ReturnType<typeof render> =>
  render(ui, {wrapper: ({children}: {children: ReactNode}) => <Providers {...options}>{children}</Providers>});

function CurrentProjectName(): ReactElement {
  const {currentProject} = useThunderID();

  return <output aria-label="current project">{currentProject?.displayName ?? 'none'}</output>;
}

const confirm = (name: string): void => {
  fireEvent.click(within(screen.getByRole('group', {name})).getByRole('button', {name: 'Confirm'}));
};

afterEach(() => {
  cleanup();
});

describe('projects', () => {
  it('lists projects and hands the rows to a custom render', async () => {
    const onSelect: Mock = vi.fn();

    renderWithProviders(<BaseProjectList projects={projects} onSelect={onSelect} />);
    expect(screen.getByRole('heading', {level: 2, name: 'Projects'})).toBeTruthy();
    fireEvent.click(screen.getByText('Shop'));
    expect(onSelect).toHaveBeenCalledWith(projects[1]);

    cleanup();
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(
      <ProjectList>
        {({projects: rows, totalResults}: BaseProjectListRenderProps) => (
          <p>
            {rows.map((project: Project) => project.handle).join(',')} of {totalResults}
          </p>
        )}
      </ProjectList>,
      {fetcher},
    );
    expect(await screen.findByText('default,shop of 2')).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/projects?limit=20&offset=0`, expect.anything());
  });

  it('creates a project and maps a conflict to a translated message', async () => {
    const onCreated: Mock = vi.fn();
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<ProjectCreate onCreated={onCreated} />, {fetcher});
    const submit: HTMLElement = screen.getByRole('button', {name: 'Create project'});

    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(document.querySelector('input[name="handle"]')!, {target: {value: 'shop'}});
    fireEvent.change(document.querySelector('input[name="displayName"]')!, {target: {value: 'Shop'}});
    fireEvent.click(submit);

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({id: 'p-9'}), expect.anything()),
    );
    expect(JSON.parse(requests(fetcher, 'POST')[0][1].body as string)).toEqual({displayName: 'Shop', handle: 'shop'});

    cleanup();
    renderWithProviders(<ProjectCreate />, {
      fetcher: createFetcher({'POST /projects': serverRefusal('PRJ-1006', 409)}),
    });
    fireEvent.change(document.querySelector('input[name="handle"]')!, {target: {value: 'shop'}});
    fireEvent.change(document.querySelector('input[name="displayName"]')!, {target: {value: 'Shop'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create project'}));
    expect(await screen.findByText('Another project already uses this handle or identifier.')).toBeTruthy();
  });

  it('hands the form state to a custom render', () => {
    const onSubmit: Mock = vi.fn();
    let props: BaseProjectCreateRenderProps | undefined;

    renderWithProviders(
      <BaseProjectCreate onSubmit={onSubmit}>
        {(renderProps: BaseProjectCreateRenderProps) => {
          props = renderProps;

          return <p>{renderProps.isValid ? 'valid' : 'invalid'}</p>;
        }}
      </BaseProjectCreate>,
    );
    expect(screen.getByText('invalid')).toBeTruthy();
    act(() => {
      props?.handleInputChange('handle', 'shop');
      props?.handleInputChange('displayName', 'Shop');
    });
    expect(screen.getByText('valid')).toBeTruthy();
    act(() => props?.handleSubmit());
    expect(onSubmit).toHaveBeenCalledWith({description: undefined, displayName: 'Shop', handle: 'shop'});
  });

  it('shows a project, edits it, and deletes it only after confirmation', () => {
    const onUpdate: Mock = vi.fn();
    const onDelete: Mock = vi.fn();

    renderWithProviders(<BaseProjectDetails project={projects[0]} onUpdate={onUpdate} onDelete={onDelete} />);
    expect(screen.getByRole('heading', {level: 2, name: 'Default'})).toBeTruthy();
    expect(screen.getByText('default')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    fireEvent.change(document.querySelector('input[name="displayName"]')!, {target: {value: 'Main'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));
    expect(onUpdate).toHaveBeenCalledWith({description: 'The default project', displayName: 'Main'});

    fireEvent.click(screen.getByRole('button', {name: 'Delete project'}));
    expect(onDelete).not.toHaveBeenCalled();
    confirm('Delete Default? This cannot be undone.');
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('keeps editing and deletion off unless enabled', () => {
    let props: BaseProjectDetailsRenderProps | undefined;
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<ProjectDetails projectId="p-1" />, {fetcher});
    expect(screen.queryByRole('button', {name: 'Delete project'})).toBeNull();

    cleanup();
    renderWithProviders(
      <BaseProjectDetails project={projects[0]}>
        {(renderProps: BaseProjectDetailsRenderProps) => {
          props = renderProps;

          return null;
        }}
      </BaseProjectDetails>,
    );
    expect(props?.project?.handle).toBe('default');
    expect(props?.onDelete).toBeUndefined();
    expect(props?.onUpdate).toBeUndefined();
  });

  it('explains why the server refused an edit', async () => {
    const fetcher: FetcherMock = createFetcher({'PUT /projects/p-1': serverRefusal('PRJ-1007')});

    renderWithProviders(<ProjectDetails projectId="p-1" editable />, {fetcher});
    fireEvent.click(await screen.findByRole('button', {name: 'Edit'}));
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    expect(await screen.findByText('The project handle cannot be changed.')).toBeTruthy();
  });

  it('clears the current project when it is deleted', async () => {
    const onDeleted: Mock = vi.fn();

    renderWithProviders(
      <>
        <ProjectDetails projectId="p-1" deletable onDeleted={onDeleted}>
          {({onDelete}: BaseProjectDetailsRenderProps) => (
            <button type="button" onClick={onDelete}>
              Remove
            </button>
          )}
        </ProjectDetails>
        <CurrentProjectName />
      </>,
      {fetcher: createFetcher(), initialProject: projects[0]},
    );
    expect(screen.getByLabelText('current project').textContent).toBe('Default');
    fireEvent.click(await screen.findByRole('button', {name: 'Remove'}));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('current project').textContent).toBe('none');
  });
});

describe('ProjectSwitcher', () => {
  it('sets the current project and calls onSelect', async () => {
    const onSelect: Mock = vi.fn();

    renderWithProviders(
      <>
        <ProjectSwitcher onSelect={onSelect} />
        <CurrentProjectName />
      </>,
      {fetcher: createFetcher()},
    );
    const select: HTMLSelectElement = await screen.findByRole('combobox', {name: 'Project'});

    await waitFor(() => expect(within(select).getByRole('option', {name: 'Shop'})).toBeTruthy());
    fireEvent.change(select, {target: {value: 'p-2'}});
    expect(onSelect).toHaveBeenCalledWith(projects[1]);
    expect(screen.getByLabelText('current project').textContent).toBe('Shop');

    fireEvent.change(select, {target: {value: ''}});
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(screen.getByLabelText('current project').textContent).toBe('none');
  });

  it('hands the projects and the current one to a custom render', () => {
    const onSelect: Mock = vi.fn();

    renderWithProviders(
      <BaseProjectSwitcher projects={projects} currentProject={projects[1]} onSelect={onSelect}>
        {({currentProject, onSelect: choose, projects: rows}: BaseProjectSwitcherRenderProps) => (
          <ul>
            {rows.map((project: Project) => (
              <li key={project.id}>
                <button type="button" onClick={(): void => choose(project)}>
                  {project.displayName}
                  {project.id === currentProject?.id ? ' (current)' : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </BaseProjectSwitcher>,
    );
    fireEvent.click(screen.getByRole('button', {name: 'Default'}));
    expect(screen.getByRole('button', {name: 'Shop (current)'})).toBeTruthy();
    expect(onSelect).toHaveBeenCalledWith(projects[0]);
  });

  it('offers no agent search while a project scopes the list, since the server cannot combine them', async () => {
    const fetcher: FetcherMock = createFetcher({'GET /agents': () => respond({agents: [], totalResults: 0})});

    renderWithProviders(<AgentList projectId="p-2" />, {fetcher});

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        `${baseUrl}/agents?include=display&limit=20&offset=0&projectId=p-2`,
        expect.anything(),
      ),
    );
    expect(screen.queryByRole('button', {name: 'Search'})).toBeNull();

    cleanup();
    renderWithProviders(<AgentList />, {fetcher});

    expect(await screen.findByRole('button', {name: 'Search'})).toBeTruthy();
  });

  it('scopes application and agent lists and creates to the current project', async () => {
    const fetcher: FetcherMock = createFetcher({
      'GET /agent-types': () => respond({totalResults: 1, types: [{displayName: 'Assistant', handle: 'assistant'}]}),
      'GET /agents': () => respond({agents: [], totalResults: 0}),
      'GET /applications': () => respond({applications: [], totalResults: 0}),
      'POST /agents': () => respond({id: 'ag-9'}, 201),
      'POST /applications': () => respond({id: 'app-9'}, 201),
    });

    renderWithProviders(
      <>
        <ApplicationList />
        <AgentList />
        <ApplicationCreate />
        <AgentCreate />
      </>,
      {fetcher, initialProject: projects[1], ouId: 'ou-own'},
    );

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        `${baseUrl}/applications?limit=20&offset=0&projectId=p-2`,
        expect.anything(),
      ),
    );
    expect(fetcher).toHaveBeenCalledWith(
      `${baseUrl}/agents?include=display&limit=20&offset=0&projectId=p-2`,
      expect.anything(),
    );

    const [appName, agentName] = Array.from(document.querySelectorAll('input[name="name"]'));

    fireEvent.change(appName, {target: {value: 'Portal'}});
    fireEvent.change(document.querySelector('input[name="redirectUris"]')!, {target: {value: 'https://p.example/cb'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create application'}));
    await screen.findByRole('option', {name: 'Assistant'});
    fireEvent.change(agentName, {target: {value: 'Concierge'}});
    fireEvent.click(screen.getByRole('button', {name: 'Register agent'}));

    await waitFor(() => expect(requests(fetcher, 'POST')).toHaveLength(2));
    const bodies: Record<string, unknown>[] = requests(fetcher, 'POST').map(
      ([, init]: [string, RequestInit]) => JSON.parse(init.body as string) as Record<string, unknown>,
    );

    // A project's identifier is not an organization unit's: it is sent as projectId, with no ouId.
    bodies.forEach((body: Record<string, unknown>) => {
      expect(body['projectId']).toBe('p-2');
      expect(body['ouId']).toBeUndefined();
    });
  });

  it('keeps the organization unit of other creates and an explicit one', async () => {
    const fetcher: FetcherMock = createFetcher({
      'GET /agent-types': () => respond({totalResults: 1, types: [{displayName: 'Assistant', handle: 'assistant'}]}),
      'POST /agents': () => respond({id: 'ag-9'}, 201),
    });

    renderWithProviders(
      <>
        <GroupCreate />
        <AgentCreate ouId="ou-explicit" />
      </>,
      {fetcher, initialProject: projects[1], ouId: 'ou-own'},
    );
    const [groupName, agentName] = Array.from(document.querySelectorAll('input[name="name"]'));

    fireEvent.change(groupName, {target: {value: 'Support'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create group'}));
    await screen.findByRole('option', {name: 'Assistant'});
    fireEvent.change(agentName, {target: {value: 'Concierge'}});
    fireEvent.click(screen.getByRole('button', {name: 'Register agent'}));

    await waitFor(() => expect(requests(fetcher, 'POST')).toHaveLength(2));
    const bodies: Record<string, unknown>[] = requests(fetcher, 'POST').map(
      ([, init]: [string, RequestInit]) => JSON.parse(init.body as string) as Record<string, unknown>,
    );

    expect(bodies).toContainEqual({name: 'Support', ouId: 'ou-own'});
    expect(bodies).toContainEqual(expect.objectContaining({ouId: 'ou-explicit'}));
    bodies.forEach((body: Record<string, unknown>) => expect(body['projectId']).toBeUndefined());
  });
});

describe('organization units', () => {
  it('lists root units or the children of a parent, with a custom render', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<OrganizationUnitList parentId="ou-1" />, {fetcher});
    expect(await screen.findByText('Platform')).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/organization-units/ou-1/ous?limit=20&offset=0`, expect.anything());

    cleanup();
    renderWithProviders(
      <BaseOrganizationUnitList organizationUnits={[{handle: 'eng', id: 'ou-1', name: 'Engineering'}]}>
        {({organizationUnits, columns}: BaseOrganizationUnitListRenderProps) => (
          <p>
            {organizationUnits[0].name} / {columns.length} columns
          </p>
        )}
      </BaseOrganizationUnitList>,
    );
    expect(screen.getByText('Engineering / 3 columns')).toBeTruthy();
  });

  it('creates a unit under the parent picked from the root units, not the current project', async () => {
    const fetcher: FetcherMock = createFetcher();
    const onCreated: Mock = vi.fn();

    renderWithProviders(<OrganizationUnitCreate onCreated={onCreated} />, {fetcher, initialProject: projects[0]});
    const parent: HTMLSelectElement = await screen.findByRole('combobox', {name: 'Parent'});

    await waitFor(() => expect(within(parent).getByRole('option', {name: 'Shop'})).toBeTruthy());
    expect(parent.value).toBe('');
    fireEvent.change(parent, {target: {value: 'p-2'}});
    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'Sales'}});
    fireEvent.change(document.querySelector('input[name="handle"]')!, {target: {value: 'sales'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create organization unit'}));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(JSON.parse(requests(fetcher, 'POST')[0][1].body as string)).toEqual({
      handle: 'sales',
      name: 'Sales',
      parent: 'p-2',
    });
  });

  it('hides the picker for a fixed parent and hands the form to a custom render', () => {
    const onSubmit: Mock = vi.fn();
    let props: BaseOrganizationUnitCreateRenderProps | undefined;

    renderWithProviders(
      <BaseOrganizationUnitCreate
        parentId="ou-1"
        parentOptions={[{label: 'Default', value: 'p-1'}]}
        onSubmit={onSubmit}
      >
        {(renderProps: BaseOrganizationUnitCreateRenderProps) => {
          props = renderProps;

          return null;
        }}
      </BaseOrganizationUnitCreate>,
    );
    expect(props?.parentOptions).toEqual([]);
    act(() => {
      props?.handleInputChange('name', 'Sales');
      props?.handleInputChange('handle', 'sales');
    });
    act(() => props?.handleSubmit());
    expect(onSubmit).toHaveBeenCalledWith({description: undefined, handle: 'sales', name: 'Sales', parentId: 'ou-1'});
  });

  it('shows a unit with its parent and what it holds, and edits it keeping its other settings', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<OrganizationUnitDetails organizationUnitId="ou-1" editable />, {fetcher});
    expect(await screen.findByRole('heading', {level: 2, name: 'Engineering'})).toBeTruthy();
    expect(await screen.findByText('Aiko Tanaka')).toBeTruthy();
    expect(screen.getByText('Platform')).toBeTruthy();
    expect(screen.getByText('Support')).toBeTruthy();
    expect(screen.getByText('Viewer')).toBeTruthy();
    expect(await screen.findByText('Default')).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Delete organization unit'})).toBeNull();

    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'R&D'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    await waitFor(() => expect(requests(fetcher, 'PUT')).toHaveLength(1));
    expect(JSON.parse(requests(fetcher, 'PUT')[0][1].body as string)).toEqual({
      description: 'Builds things',
      handle: 'engineering',
      name: 'R&D',
      parent: 'p-1',
      themeId: 'theme-1',
    });
  });

  it('asks before deleting a unit and explains a refusal', async () => {
    const fetcher: FetcherMock = createFetcher({'DELETE /organization-units/ou-1': serverRefusal('OU-1006')});

    renderWithProviders(<OrganizationUnitDetails organizationUnitId="ou-1" deletable />, {fetcher});
    fireEvent.click(await screen.findByRole('button', {name: 'Delete organization unit'}));
    expect(requests(fetcher, 'DELETE')).toHaveLength(0);
    confirm('Delete Engineering? This cannot be undone.');

    expect(await screen.findByText(/This unit still holds child units/)).toBeTruthy();
  });

  it('hands the unit and what it holds to a custom render', () => {
    let props: BaseOrganizationUnitDetailsRenderProps | undefined;

    renderWithProviders(
      <BaseOrganizationUnitDetails
        organizationUnit={unit}
        contents={{users: [{display: 'Aiko', id: 'u-1'}]}}
        onDelete={vi.fn()}
      >
        {(renderProps: BaseOrganizationUnitDetailsRenderProps) => {
          props = renderProps;

          return null;
        }}
      </BaseOrganizationUnitDetails>,
    );
    expect(props?.organizationUnit?.handle).toBe('engineering');
    expect(props?.contents.users).toHaveLength(1);
    expect(props?.contents.childUnits).toEqual([]);
    expect(props?.onDelete).toBeDefined();
    expect(props?.onUpdate).toBeUndefined();
  });
});

describe('SharingPolicies', () => {
  it('lists the policies with their scope, read only unless editable', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<SharingPolicies resourceType="role" resourceId="r-1" />, {fetcher});
    expect(await screen.findByText('Every unit beneath the owner')).toBeTruthy();
    expect(screen.getByText('Units beneath the owner: ou-2 and below')).toBeTruthy();
    expect(screen.getByText('Other trees: ou-9')).toBeTruthy();
    expect(screen.getByText('Every organization unit')).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/roles/r-1/sharing-policies?limit=20&offset=0`, expect.anything());
    expect(screen.queryByRole('button', {name: 'Add policy'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Delete'})).toBeNull();
  });

  it('creates, edits and deletes policies when editable, asking before a delete', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<SharingPolicies resourceType="user" resourceId="u-1" editable />, {fetcher});
    await screen.findByText('Every unit beneath the owner');

    fireEvent.click(screen.getByRole('button', {name: 'Add policy'}));
    fireEvent.change(document.querySelector('select[name="childUnitsMode"]')!, {target: {value: 'selected'}});
    fireEvent.change(document.querySelector('input[name="selectedOuIds"]')!, {target: {value: 'ou-2, ou-3'}});
    fireEvent.change(document.querySelector('select[name="reach"]')!, {target: {value: 'unit'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save policy'}));

    await waitFor(() => expect(requests(fetcher, 'POST')).toHaveLength(1));
    expect(requests(fetcher, 'POST')[0][0]).toBe(`${baseUrl}/users/u-1/sharing-policies`);
    expect(JSON.parse(requests(fetcher, 'POST')[0][1].body as string)).toEqual({
      childUnits: {
        mode: 'selected',
        units: [
          {ouId: 'ou-2', reach: 'unit'},
          {ouId: 'ou-3', reach: 'unit'},
        ],
      },
    });

    // The read-only policy offers no actions.
    expect(screen.getAllByRole('button', {name: 'Edit'})).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', {name: 'Edit'})[0]);
    fireEvent.change(document.querySelector('input[name="excludedOuIds"]')!, {target: {value: 'ou-5'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save policy'}));
    await waitFor(() => expect(requests(fetcher, 'PUT')).toHaveLength(1));
    expect(requests(fetcher, 'PUT')[0][0]).toBe(`${baseUrl}/users/u-1/sharing-policies/sp-1`);
    expect(JSON.parse(requests(fetcher, 'PUT')[0][1].body as string)).toEqual({
      childUnits: {excludedOuIds: ['ou-5'], mode: 'all'},
      version: 3,
    });

    fireEvent.click(screen.getAllByRole('button', {name: 'Delete'})[0]);
    expect(requests(fetcher, 'DELETE')).toHaveLength(0);
    confirm('Delete this sharing policy? The organization units it reaches lose the item.');
    await waitFor(() => expect(requests(fetcher, 'DELETE')).toHaveLength(1));
    expect(requests(fetcher, 'DELETE')[0][0]).toBe(`${baseUrl}/users/u-1/sharing-policies/sp-1`);
  });

  it('explains a version conflict', async () => {
    const fetcher: FetcherMock = createFetcher({
      'PUT /flows/f-1/sharing-policies/sp-1': () => respond({code: 'FLM-1099'}, 409),
    });

    renderWithProviders(<SharingPolicies resourceType="flow" resourceId="f-1" editable />, {fetcher});
    await screen.findByText('Every unit beneath the owner');
    fireEvent.click(screen.getAllByRole('button', {name: 'Edit'})[0]);
    fireEvent.click(screen.getByRole('button', {name: 'Save policy'}));

    expect(await screen.findByText('This policy changed since it was loaded. Reload it and try again.')).toBeTruthy();
  });

  it('shows the overlay rules for a unit', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<SharingPolicies resourceType="application" resourceId="a-1" ouId="ou-2" />, {fetcher});
    expect(await screen.findByText('Rules in ou-2')).toBeTruthy();
    expect(await screen.findByText('Shared with this unit')).toBeTruthy();
    expect(screen.getByText('Allowed: viewer')).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/applications/a-1/overlay-rules?ouId=ou-2`, expect.anything());
  });

  it('hands the policies to a custom render, with changes only when editable', () => {
    const onDelete: Mock = vi.fn();
    let props: BaseSharingPoliciesRenderProps | undefined;

    renderWithProviders(
      <BaseSharingPolicies policies={policies} onDelete={onDelete}>
        {(renderProps: BaseSharingPoliciesRenderProps) => {
          props = renderProps;

          return <p>{renderProps.describeScope(renderProps.policies[1]).join(' + ')}</p>;
        }}
      </BaseSharingPolicies>,
    );
    expect(screen.getByText('Units beneath the owner: ou-2 and below + Other trees: ou-9')).toBeTruthy();
    expect(props?.onCreate).toBeUndefined();
    expect(props?.onUpdate).toBeUndefined();
    act(() => props?.onDelete?.(policies[2]));
    expect(onDelete).not.toHaveBeenCalled();
    act(() => props?.onDelete?.(policies[0]));
    expect(onDelete).toHaveBeenCalledWith(policies[0]);
  });
});

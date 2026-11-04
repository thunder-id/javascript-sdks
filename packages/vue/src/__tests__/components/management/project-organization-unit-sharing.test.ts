// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {OrganizationUnitQueryKeys, ProjectQueryKeys} from '@thunderid/browser';
import type {OrganizationUnit, Project, SharingPolicy} from '@thunderid/browser';
import {mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {type Ref, h, nextTick, ref} from 'vue';
import AgentCreate from '../../../components/management/AgentCreate/AgentCreate';
import AgentList from '../../../components/management/AgentList/AgentList';
import ApplicationList from '../../../components/management/ApplicationList/ApplicationList';
import GroupCreate from '../../../components/management/GroupCreate/GroupCreate';
import BaseOrganizationUnitCreate from '../../../components/management/OrganizationUnitCreate/BaseOrganizationUnitCreate';
import type {BaseOrganizationUnitCreateRenderProps} from '../../../components/management/OrganizationUnitCreate/BaseOrganizationUnitCreate';
import OrganizationUnitCreate from '../../../components/management/OrganizationUnitCreate/OrganizationUnitCreate';
import BaseOrganizationUnitDetails from '../../../components/management/OrganizationUnitDetails/BaseOrganizationUnitDetails';
import type {BaseOrganizationUnitDetailsRenderProps} from '../../../components/management/OrganizationUnitDetails/BaseOrganizationUnitDetails';
import OrganizationUnitDetails from '../../../components/management/OrganizationUnitDetails/OrganizationUnitDetails';
import BaseOrganizationUnitList from '../../../components/management/OrganizationUnitList/BaseOrganizationUnitList';
import OrganizationUnitList from '../../../components/management/OrganizationUnitList/OrganizationUnitList';
import BaseProjectCreate from '../../../components/management/ProjectCreate/BaseProjectCreate';
import type {BaseProjectCreateRenderProps} from '../../../components/management/ProjectCreate/BaseProjectCreate';
import ProjectCreate from '../../../components/management/ProjectCreate/ProjectCreate';
import BaseProjectDetails from '../../../components/management/ProjectDetails/BaseProjectDetails';
import type {BaseProjectDetailsRenderProps} from '../../../components/management/ProjectDetails/BaseProjectDetails';
import ProjectDetails from '../../../components/management/ProjectDetails/ProjectDetails';
import BaseProjectList from '../../../components/management/ProjectList/BaseProjectList';
import ProjectList from '../../../components/management/ProjectList/ProjectList';
import BaseProjectSwitcher from '../../../components/management/ProjectSwitcher/BaseProjectSwitcher';
import type {BaseProjectSwitcherRenderProps} from '../../../components/management/ProjectSwitcher/BaseProjectSwitcher';
import ProjectSwitcher from '../../../components/management/ProjectSwitcher/ProjectSwitcher';
import type {AdminListRenderProps} from '../../../components/management/shared/createAdminList';
import BaseSharingPolicies from '../../../components/management/SharingPolicies/BaseSharingPolicies';
import type {BaseSharingPoliciesRenderProps} from '../../../components/management/SharingPolicies/BaseSharingPolicies';
import SharingPolicies from '../../../components/management/SharingPolicies/SharingPolicies';
import {
  type ManagementTestContext,
  createManagementContext,
  jsonResponse,
  translate,
} from '../../helpers/managementContext';
import {chooseOption} from '../../helpers/selectControl';

const mounted: {unmount: () => void}[] = [];

type ProjectContext = ManagementTestContext & {currentProject: Ref<Project | null>};

/** A management context that also provides the current project, as `ThunderIDProvider` does. */
const createProjectContext = (current: Project | null = null): ProjectContext => {
  const context = createManagementContext();
  const currentProject: Ref<Project | null> = ref(current);
  Object.assign(context.thunderID, {
    currentProject,
    setCurrentProject: vi.fn((project: Project | null) => {
      currentProject.value = project;
    }),
  });

  return Object.assign(context, {currentProject});
};

const mountWith = (
  component: unknown,
  props: Record<string, unknown> = {},
  context: ManagementTestContext = createProjectContext(),
  slots = {},
) => {
  const wrapper = mount(component as never, {
    attachTo: document.body,
    global: {provide: context.provide},
    props,
    slots,
  });
  mounted.push(wrapper);

  return {context, wrapper};
};

const page = {count: 0, startIndex: 1, totalResults: 0};

/** Answers each request with an empty page of every list shape, or the given body (`null` for 204). */
const respondWith =
  (resolve: (url: URL, init: RequestInit) => unknown = () => undefined) =>
  (url: string, init: RequestInit): Promise<Response> => {
    const body: unknown = resolve(new URL(url), init);

    if (body === null) return Promise.resolve(jsonResponse(null, 204));
    if (body instanceof Response || (body && typeof body === 'object' && 'ok' in body)) {
      return Promise.resolve(body as Response);
    }

    return Promise.resolve(
      jsonResponse(
        body ?? {...page, groups: [], organizationUnits: [], policies: [], projects: [], roles: [], users: []},
      ),
    );
  };

const requests = (context: ManagementTestContext): string[] =>
  context.fetcher.mock.calls.map((call) => {
    const url = new URL(call[0]);

    return `${call[1].method ?? 'GET'} ${url.pathname}${url.search}`;
  });

const buttonNamed = (wrapper: {findAll: (selector: string) => {text: () => string}[]}, name: string) =>
  wrapper.findAll('button').find((button) => button.text() === name) as unknown as {
    trigger: (e: string) => Promise<void>;
  };

const projects: Project[] = [
  {createdAt: '2026-01-01T00:00:00Z', displayName: 'Default', handle: 'default', id: 'p-1'},
  {createdAt: '2026-02-01T00:00:00Z', description: 'Online shop', displayName: 'Shop', handle: 'shop', id: 'p-2'},
];

const unit: OrganizationUnit = {
  description: 'Platform team',
  handle: 'platform',
  id: 'ou-2',
  name: 'Platform',
  parent: 'ou-1',
  themeId: 'theme-1',
};

describe('project, organization unit and sharing components (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
    window.localStorage.clear();
  });

  describe('projects', () => {
    it('BaseProjectList renders a row per project and hands a custom render the rows', () => {
      const {wrapper} = mountWith(BaseProjectList, {projects});

      expect(wrapper.find('h2').text()).toBe(translate('admin.projects.list.title'));
      expect(wrapper.findAll('tbody tr')).toHaveLength(2);
      expect(wrapper.text()).toContain('Online shop');

      let renderProps: (AdminListRenderProps<Project> & {projects: Project[]}) | undefined;
      mountWith(BaseProjectList, {projects}, undefined, {
        default: (props: AdminListRenderProps<Project> & {projects: Project[]}) => {
          renderProps = props;

          return h('span', 'custom');
        },
      });
      expect(renderProps?.projects).toEqual(projects);
      expect(renderProps?.columns.map((column) => column.header)).toEqual([
        translate('admin.projects.fields.display_name'),
        translate('admin.projects.fields.handle'),
        translate('admin.projects.fields.description'),
      ]);
    });

    it('ProjectList fetches a page of projects', async () => {
      const context = createProjectContext();
      context.fetcher.mockImplementation(respondWith(() => ({...page, projects, totalResults: 2})));
      const {wrapper} = mountWith(ProjectList, {}, context);

      await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(2));
      expect(requests(context)).toEqual(['GET /projects?limit=20&offset=0']);
    });

    it('BaseProjectCreate gates submit on a handle and display name and hands a custom render the form', async () => {
      const {wrapper} = mountWith(BaseProjectCreate);
      const submit = wrapper.find('button[type="submit"]');

      expect(submit.attributes('disabled')).toBeDefined();
      const inputs = wrapper.findAll('input');
      await inputs[0].setValue('shop');
      await inputs[1].setValue(' Shop ');
      await wrapper.find('form').trigger('submit');
      expect(wrapper.emitted('submit')).toEqual([[{description: undefined, displayName: 'Shop', handle: 'shop'}]]);

      let renderProps: BaseProjectCreateRenderProps | undefined;
      const custom = mountWith(BaseProjectCreate, {}, undefined, {
        default: (props: BaseProjectCreateRenderProps) => {
          renderProps = props;

          return h('span', props.values.handle);
        },
      });
      expect(renderProps?.isValid).toBe(false);
      renderProps!.handleInputChange('handle', 'hr');
      renderProps!.handleInputChange('displayName', 'HR');
      await vi.waitFor(() => expect(renderProps?.isValid).toBe(true));
      renderProps!.handleSubmit();
      expect(custom.wrapper.emitted('submit')?.[0]).toEqual([
        {description: undefined, displayName: 'HR', handle: 'hr'},
      ]);
    });

    it('ProjectCreate creates the project and shows a conflict as a translated message', async () => {
      const context = createProjectContext();
      context.fetcher.mockResolvedValueOnce(
        jsonResponse({code: 'PRJ-1006', message: {defaultValue: 'Server text'}}, 409),
      );
      context.fetcher.mockResolvedValueOnce(jsonResponse(projects[1], 201));
      const {wrapper} = mountWith(ProjectCreate, {}, context);

      const inputs = wrapper.findAll('input');
      await inputs[0].setValue('shop');
      await inputs[1].setValue('Shop');
      await wrapper.find('form').trigger('submit');
      await vi.waitFor(() => expect(wrapper.text()).toContain(translate('admin.projects.errors.conflict')));
      expect(wrapper.text()).not.toContain('Server text');

      await wrapper.find('form').trigger('submit');
      await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));
      expect(requests(context)).toEqual(['POST /projects', 'POST /projects']);
      expect(JSON.parse(context.fetcher.mock.calls[1][1].body as string)).toEqual({
        displayName: 'Shop',
        handle: 'shop',
      });
    });

    it('ProjectDetails shows the overview, edits it, and asks before deleting', async () => {
      const context = createProjectContext(projects[1]);
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        respondWith((url, init) => {
          if (init.method === 'DELETE') return null;
          if (init.method === 'PUT') return {...projects[1], displayName: 'Storefront'};

          return projects[1];
        }),
      );
      const {wrapper} = mountWith(ProjectDetails, {deletable: true, editable: true, projectId: 'p-2'}, context);

      await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('Shop'));
      expect(wrapper.text()).toContain('shop');

      await buttonNamed(wrapper, translate('admin.projects.details.edit.action')).trigger('click');
      await wrapper.find('input[name$="-displayName"]').setValue('Storefront');
      await wrapper.find('form').trigger('submit');
      await vi.waitFor(() => expect(wrapper.emitted('updated')).toHaveLength(1));
      expect(
        JSON.parse(context.fetcher.mock.calls.find((call) => call[1].method === 'PUT')![1].body as string),
      ).toEqual({description: 'Online shop', displayName: 'Storefront', handle: 'shop'});
      // Editing the current project keeps the stored copy in step.
      expect(context.currentProject.value?.displayName).toBe('Storefront');

      await buttonNamed(wrapper, translate('admin.projects.details.delete.action')).trigger('click');
      expect(requests(context)).not.toContain('DELETE /projects/p-2');
      await buttonNamed(wrapper, translate('admin.common.actions.confirm')).trigger('click');

      await vi.waitFor(() => expect(wrapper.emitted('deleted')).toHaveLength(1));
      expect(requests(context)).toContain('DELETE /projects/p-2');
      expect(context.currentProject.value).toBeNull();
      expect(invalidate.mock.calls.map((call) => call[0])).toEqual(
        expect.arrayContaining([[ProjectQueryKeys.PROJECTS], [OrganizationUnitQueryKeys.ORGANIZATION_UNITS]]),
      );
    });

    it('ProjectDetails translates a refusal to change the handle', async () => {
      const context = createProjectContext();
      context.fetcher.mockImplementation(
        respondWith((_url, init) =>
          init.method === 'PUT'
            ? jsonResponse({code: 'PRJ-1007', message: {defaultValue: 'Server text'}}, 400)
            : projects[1],
        ),
      );
      const {wrapper} = mountWith(ProjectDetails, {editable: true, projectId: 'p-2'}, context);

      await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('Shop'));
      await buttonNamed(wrapper, translate('admin.projects.details.edit.action')).trigger('click');
      await wrapper.find('form').trigger('submit');

      await vi.waitFor(() => expect(wrapper.text()).toContain(translate('admin.projects.errors.handle_immutable')));
      expect(wrapper.text()).not.toContain('Server text');
    });

    it('ProjectDetails hands a custom render no actions unless they are allowed', async () => {
      const context = createProjectContext();
      context.fetcher.mockImplementation(respondWith(() => projects[1]));
      let renderProps: BaseProjectDetailsRenderProps | undefined;
      mountWith(ProjectDetails, {projectId: 'p-2'}, context, {
        default: (props: BaseProjectDetailsRenderProps) => {
          renderProps = props;

          return h('span', props.project?.displayName);
        },
      });

      await vi.waitFor(() => expect(renderProps?.project?.handle).toBe('shop'));
      expect(renderProps?.onDelete).toBeUndefined();
      expect(renderProps?.onUpdate).toBeUndefined();
    });

    it('BaseProjectDetails shows the not set placeholder for a missing description', () => {
      const {wrapper} = mountWith(BaseProjectDetails, {project: projects[0]});

      expect(wrapper.text()).toContain(translate('admin.projects.details.not_set'));
    });

    it('ProjectSwitcher lists the projects and sets the current project', async () => {
      const context = createProjectContext();
      context.fetcher.mockImplementation(respondWith(() => ({...page, projects, totalResults: 2})));
      const {wrapper} = mountWith(ProjectSwitcher, {}, context);

      await vi.waitFor(() => expect(wrapper.findAll('option').map((option) => option.text())).toContain('Shop'));
      await chooseOption(wrapper.find('select'), 'Shop');

      expect(context.currentProject.value?.id).toBe('p-2');
      expect(wrapper.emitted('select')).toEqual([[projects[1]]]);
      expect(requests(context)).toEqual(['GET /projects?limit=100&offset=0']);
    });

    it('BaseProjectSwitcher hands a custom render the projects and the current one', () => {
      let renderProps: BaseProjectSwitcherRenderProps | undefined;
      const {wrapper} = mountWith(BaseProjectSwitcher, {currentProject: projects[0], projects}, undefined, {
        default: (props: BaseProjectSwitcherRenderProps) => {
          renderProps = props;

          return h('span', props.currentProject?.displayName);
        },
      });

      expect(wrapper.text()).toBe('Default');
      expect(renderProps?.totalResults).toBe(2);
      renderProps!.onSelect(null);
      expect(wrapper.emitted('select')).toEqual([[null]]);
    });

    it('places a new agent in the current project, and keeps an explicit organization unit', async () => {
      const respond = respondWith((_url, init) =>
        init.method === 'POST'
          ? {attributes: {name: 'Bot'}, id: 'a1', type: 'assistant'}
          : {...page, types: [{displayName: 'Assistant', handle: 'assistant'}]},
      );
      const create = async (props: Record<string, unknown>): Promise<unknown> => {
        const context = createProjectContext(projects[1]);
        context.fetcher.mockImplementation(respond);
        let form: {handleInputChange: (field: string, value: string) => void; handleSubmit: () => void} | undefined;
        const {wrapper} = mountWith(AgentCreate, props, context, {
          default: (renderProps: typeof form) => {
            form = renderProps;

            return h('span');
          },
        });

        await vi.waitFor(() => expect(form).toBeDefined());
        form!.handleInputChange('name', 'Bot');
        form!.handleInputChange('type', 'assistant');
        await nextTick();
        form!.handleSubmit();
        await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));

        return JSON.parse(context.fetcher.mock.calls.find((call) => call[1].method === 'POST')![1].body as string);
      };

      expect(await create({})).toEqual({attributes: {name: 'Bot'}, projectId: 'p-2', type: 'assistant'});
      expect(await create({ouId: 'ou-7'})).toEqual({attributes: {name: 'Bot'}, ouId: 'ou-7', type: 'assistant'});
    });

    it('lists the applications of the current project, and keeps other creates in the user organization unit', async () => {
      const context = createProjectContext(projects[1]);
      context.fetcher.mockImplementation(respondWith(() => ({...page, applications: []})));
      mountWith(ApplicationList, {}, context);
      await vi.waitFor(() => expect(requests(context)).toEqual(['GET /applications?limit=20&offset=0&projectId=p-2']));

      const groups = createProjectContext(projects[1]);
      groups.fetcher.mockResolvedValue(jsonResponse({id: 'g1', name: 'Ops', ouId: 'ou-1'}, 201));
      const {wrapper} = mountWith(GroupCreate, {}, groups);

      await wrapper.findAll('input')[0].setValue('Ops');
      await wrapper.find('form').trigger('submit');

      await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));
      expect(JSON.parse(groups.fetcher.mock.calls[0][1].body as string)).toEqual({name: 'Ops', ouId: 'ou-1'});
    });

    it('AgentList offers no search while a project scopes it, since the server cannot combine them', async () => {
      const scoped = createProjectContext(projects[1]);
      scoped.fetcher.mockResolvedValue(jsonResponse({...page, agents: []}));
      const {wrapper} = mountWith(AgentList, {}, scoped);

      await vi.waitFor(() =>
        expect(requests(scoped)).toEqual(['GET /agents?include=display&limit=20&offset=0&projectId=p-2']),
      );
      expect(wrapper.findAll('button').some((button) => button.text() === 'Search')).toBe(false);

      const unscoped = createProjectContext();
      unscoped.fetcher.mockResolvedValue(jsonResponse({...page, agents: []}));
      const other = mountWith(AgentList, {}, unscoped);

      await vi.waitFor(() =>
        expect(other.wrapper.findAll('button').some((button) => button.text() === 'Search')).toBe(true),
      );
    });
  });

  describe('organization units', () => {
    it('BaseOrganizationUnitList renders the units', () => {
      const {wrapper} = mountWith(BaseOrganizationUnitList, {organizationUnits: [unit]});

      expect(wrapper.find('h2').text()).toBe(translate('admin.organization_units.list.title'));
      expect(wrapper.find('tbody tr').text()).toContain('Platform');
    });

    it('OrganizationUnitList lists the root units, or the children of parentId', async () => {
      const roots = createProjectContext();
      roots.fetcher.mockImplementation(respondWith(() => ({...page, organizationUnits: [unit], totalResults: 1})));
      const {wrapper} = mountWith(OrganizationUnitList, {}, roots);
      await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(1));
      expect(requests(roots)).toEqual(['GET /organization-units?limit=20&offset=0']);

      const children = createProjectContext();
      children.fetcher.mockImplementation(respondWith());
      mountWith(OrganizationUnitList, {parentId: 'ou-1'}, children);
      await vi.waitFor(() =>
        expect(requests(children)).toEqual(['GET /organization-units/ou-1/ous?limit=20&offset=0']),
      );
    });

    it('OrganizationUnitCreate offers the root units as parents and creates the unit', async () => {
      const context = createProjectContext(projects[1]);
      context.fetcher.mockImplementation(
        respondWith((url, init) =>
          init.method === 'POST'
            ? {handle: 'eng', id: 'ou-9', name: 'Engineering', parent: 'p-2'}
            : {
                ...page,
                organizationUnits: [
                  {handle: 'default', id: 'p-1', name: 'Default'},
                  {handle: 'shop', id: 'p-2', name: 'Shop'},
                ],
                totalResults: 2,
              },
        ),
      );
      const {wrapper} = mountWith(OrganizationUnitCreate, {}, context);

      await vi.waitFor(() => expect(wrapper.findAll('option').map((option) => option.text())).toContain('Shop'));
      // A project's identifier is not an organization unit's, so nothing is preselected.
      expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('');
      await chooseOption(wrapper.find('select'), 'Shop');
      const inputs = wrapper.findAll('input');
      await inputs[0].setValue('Engineering');
      await inputs[1].setValue('eng');
      await wrapper.find('form').trigger('submit');

      await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));
      const post = context.fetcher.mock.calls.find((call) => call[1].method === 'POST')!;
      expect(JSON.parse(post[1].body as string)).toEqual({handle: 'eng', name: 'Engineering', parent: 'p-2'});
    });

    it('BaseOrganizationUnitCreate hides the picker for a fixed parent and hands a custom render the form', async () => {
      const {wrapper} = mountWith(BaseOrganizationUnitCreate, {parentId: 'ou-1'});
      expect(wrapper.find('select').exists()).toBe(false);

      let renderProps: BaseOrganizationUnitCreateRenderProps | undefined;
      const custom = mountWith(BaseOrganizationUnitCreate, {parentId: 'ou-1'}, undefined, {
        default: (props: BaseOrganizationUnitCreateRenderProps) => {
          renderProps = props;

          return h('span', 'custom');
        },
      });
      renderProps!.handleInputChange('name', 'Eng');
      renderProps!.handleInputChange('handle', 'eng');
      await vi.waitFor(() => expect(renderProps?.isValid).toBe(true));
      renderProps!.handleSubmit();
      expect(custom.wrapper.emitted('submit')?.[0]).toEqual([
        {description: undefined, handle: 'eng', name: 'Eng', parentId: 'ou-1'},
      ]);
    });

    it('OrganizationUnitDetails shows the unit, its parent and contents, edits it, and translates a refused delete', async () => {
      const context = createProjectContext();
      context.fetcher.mockImplementation(
        respondWith((url, init) => {
          if (init.method === 'DELETE') return jsonResponse({code: 'OU-1006'}, 400);
          if (init.method === 'PUT') return {...unit, name: 'Platform team'};
          if (url.pathname === '/organization-units/ou-2') return unit;
          if (url.pathname === '/organization-units/ou-1') return {handle: 'shop', id: 'ou-1', name: 'Shop'};
          if (url.pathname.endsWith('/users')) return {...page, totalResults: 1, users: [{display: 'Aiko', id: 'u1'}]};
          if (url.pathname.endsWith('/groups')) return {...page, groups: [{id: 'g1', name: 'Ops'}], totalResults: 1};

          return undefined;
        }),
      );
      const {wrapper} = mountWith(
        OrganizationUnitDetails,
        {deletable: true, editable: true, organizationUnitId: 'ou-2'},
        context,
      );

      await vi.waitFor(() => {
        expect(wrapper.find('h2').text()).toBe('Platform');
        expect(wrapper.text()).toContain('Shop');
        expect(wrapper.text()).toContain('Aiko');
        expect(wrapper.text()).toContain('Ops');
        expect(wrapper.text()).toContain(translate('admin.organization_units.details.roles_empty'));
      });

      await buttonNamed(wrapper, translate('admin.organization_units.details.edit.action')).trigger('click');
      await wrapper.find('input[name$="-name"]').setValue('Platform team');
      await wrapper.find('form').trigger('submit');
      await vi.waitFor(() => expect(wrapper.emitted('updated')).toHaveLength(1));
      // The update sends back the settings the view does not edit.
      expect(
        JSON.parse(context.fetcher.mock.calls.find((call) => call[1].method === 'PUT')![1].body as string),
      ).toEqual({
        description: 'Platform team',
        handle: 'platform',
        name: 'Platform team',
        parent: 'ou-1',
        themeId: 'theme-1',
      });

      await buttonNamed(wrapper, translate('admin.organization_units.details.delete.action')).trigger('click');
      await buttonNamed(wrapper, translate('admin.common.actions.confirm')).trigger('click');
      await vi.waitFor(() =>
        expect(wrapper.text()).toContain(translate('admin.organization_units.errors.has_children')),
      );
    });

    it('BaseOrganizationUnitDetails hands a custom render the unit and its contents', () => {
      let renderProps: BaseOrganizationUnitDetailsRenderProps | undefined;
      mountWith(BaseOrganizationUnitDetails, {contents: {users: [{id: 'u1'}]}, organizationUnit: unit}, undefined, {
        default: (props: BaseOrganizationUnitDetailsRenderProps) => {
          renderProps = props;

          return h('span', props.organizationUnit?.name);
        },
      });

      expect(renderProps?.contents.users).toEqual([{id: 'u1'}]);
      expect(renderProps?.contents.childUnits).toEqual([]);
      expect(renderProps?.onDelete).toBeUndefined();
    });
  });

  describe('sharing policies', () => {
    const policies: SharingPolicy[] = [
      {childUnits: {mode: 'all'}, id: 'sp-1', stage: 'share', version: 2},
      {
        childUnits: {mode: 'selected', units: [{ouId: 'ou-5', reach: 'subtree'}]},
        id: 'sp-2',
        isReadOnly: true,
        version: 1,
      },
    ];

    it('BaseSharingPolicies describes each policy scope and hides changes on a read-only one', () => {
      const {wrapper} = mountWith(BaseSharingPolicies, {onDelete: vi.fn(), onUpdate: vi.fn(), policies});

      const rows = wrapper.findAll('tbody tr');
      expect(rows[0].text()).toContain(translate('admin.sharing.scope.child_units_all'));
      expect(rows[0].text()).toContain(translate('admin.sharing.actions.edit'));
      expect(rows[1].text()).toContain(translate('admin.sharing.scope.unit_subtree', {unit: 'ou-5'}));
      expect(rows[1].text()).toContain(translate('admin.sharing.read_only'));
    });

    it('SharingPolicies lists a role policies with no changes unless editable', async () => {
      const context = createProjectContext();
      context.fetcher.mockImplementation(respondWith(() => ({...page, policies, totalResults: 2})));
      let renderProps: BaseSharingPoliciesRenderProps | undefined;
      mountWith(SharingPolicies, {resourceId: 'r1', resourceType: 'role'}, context, {
        default: (props: BaseSharingPoliciesRenderProps) => {
          renderProps = props;

          return h('span', String(props.policies.length));
        },
      });

      await vi.waitFor(() => expect(renderProps?.policies).toHaveLength(2));
      expect(requests(context)).toEqual(['GET /roles/r1/sharing-policies?limit=20&offset=0']);
      expect(renderProps?.onCreate).toBeUndefined();
      expect(renderProps?.onDelete).toBeUndefined();
      expect(renderProps?.describeScope(policies[0])).toEqual([translate('admin.sharing.scope.child_units_all')]);
    });

    it('SharingPolicies creates a policy, asks before deleting, and shows the overlay rules for ouId', async () => {
      const context = createProjectContext();
      context.fetcher.mockImplementation(
        respondWith((url, init) => {
          if (init.method === 'DELETE') return null;
          if (init.method === 'POST') return {id: 'sp-3', version: 1};
          if (url.pathname.endsWith('/overlay-rules')) {
            return {isOwned: false, policyIds: ['sp-1'], rules: {roles: {allowedValues: ['admin']}}, visible: true};
          }

          return {...page, policies: [policies[0]], totalResults: 1};
        }),
      );
      const {wrapper} = mountWith(
        SharingPolicies,
        {editable: true, ouId: 'ou-7', resourceId: 'u1', resourceType: 'user'},
        context,
      );

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain(translate('admin.sharing.actions.delete'));
        expect(wrapper.text()).toContain(translate('admin.sharing.overlay.shared'));
        expect(wrapper.text()).toContain(translate('admin.sharing.overlay.allowed', {values: 'admin'}));
      });

      await buttonNamed(wrapper, translate('admin.sharing.actions.create')).trigger('click');
      await chooseOption(wrapper.find('select'), translate('admin.sharing.form.child_units_selected'));
      await wrapper.find('input[name$="-selectedOuIds"]').setValue('ou-5, ou-6');
      await wrapper.find('form').trigger('submit');
      await vi.waitFor(() => expect(requests(context)).toContain('POST /users/u1/sharing-policies'));
      expect(
        JSON.parse(context.fetcher.mock.calls.find((call) => call[1].method === 'POST')![1].body as string),
      ).toEqual({
        childUnits: {
          mode: 'selected',
          units: [
            {ouId: 'ou-5', reach: 'subtree'},
            {ouId: 'ou-6', reach: 'subtree'},
          ],
        },
      });

      // The create refetches the list; wait for it to settle before acting on a row.
      await vi.waitFor(() => {
        expect(
          requests(context).filter((request) => request.startsWith('GET /users/u1/sharing-policies')),
        ).toHaveLength(2);
        expect(wrapper.text()).toContain(translate('admin.sharing.actions.delete'));
      });
      await buttonNamed(wrapper, translate('admin.sharing.actions.delete')).trigger('click');
      expect(requests(context)).not.toContain('DELETE /users/u1/sharing-policies/sp-1');
      await buttonNamed(wrapper, translate('admin.common.actions.confirm')).trigger('click');
      await vi.waitFor(() => expect(requests(context)).toContain('DELETE /users/u1/sharing-policies/sp-1'));
    });

    it('SharingPolicies translates a version conflict on an edit', async () => {
      const context = createProjectContext();
      context.fetcher.mockImplementation(
        respondWith((_url, init) =>
          init.method === 'PUT'
            ? jsonResponse({code: 'SP-1009', message: {defaultValue: 'Server text'}}, 409)
            : {...page, policies: [policies[0]], totalResults: 1},
        ),
      );
      const {wrapper} = mountWith(SharingPolicies, {editable: true, resourceId: 'f1', resourceType: 'flow'}, context);

      await vi.waitFor(() => expect(wrapper.text()).toContain(translate('admin.sharing.actions.edit')));
      await buttonNamed(wrapper, translate('admin.sharing.actions.edit')).trigger('click');
      await wrapper.find('form').trigger('submit');

      await vi.waitFor(() => expect(wrapper.text()).toContain(translate('admin.sharing.errors.version_conflict')));
      expect(requests(context)).toContain('PUT /flows/f1/sharing-policies/sp-1');
      expect(
        JSON.parse(context.fetcher.mock.calls.find((call) => call[1].method === 'PUT')![1].body as string),
      ).toEqual({childUnits: {mode: 'all'}, version: 2});
    });
  });
});

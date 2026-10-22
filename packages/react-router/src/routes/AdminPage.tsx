// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AgentCreate,
  AgentDetails,
  AgentList,
  Button,
  GroupCreate,
  GroupList,
  GroupMembers,
  RoleAssignments,
  RoleCreate,
  RoleList,
  RolePermissions,
  UserCreate,
  UserDetails,
  UserList,
  useTranslation,
} from '@thunderid/react';
import {FC, ReactElement, ReactNode} from 'react';
import {useNavigate, useParams} from 'react-router';
import type {AdminRoutesOptions, AdminSection} from './createAdminRoutes';

export type AdminPageKind = 'create' | 'details' | 'list';

/**
 * Navigation between the pages of one section, relative to the page the user is on, so the routes
 * work wherever the application mounts them.
 */
interface AdminNavigation {
  createAction: ReactNode;
  toDetails: (id: string) => void;
  toList: () => void;
}

interface AdminPageContext extends AdminNavigation {
  id: string;
  options: AdminRoutesOptions;
}

type AdminPageRenderer = (context: AdminPageContext) => ReactElement;

const SECTION_PAGES: Record<AdminSection, Record<AdminPageKind, AdminPageRenderer>> = {
  agents: {
    create: ({options, toDetails}: AdminPageContext) => (
      <AgentCreate preferences={options.preferences} onCreated={(agent: {id: string}) => toDetails(agent.id)} />
    ),
    details: ({id, options, toList}: AdminPageContext) => (
      <AgentDetails agentId={id} deletable={options.deletable} preferences={options.preferences} onDeleted={toList} />
    ),
    list: ({createAction, options, toDetails}: AdminPageContext) => (
      <AgentList
        actions={createAction}
        preferences={options.preferences}
        onSelect={(agent: {id: string}) => toDetails(agent.id)}
      />
    ),
  },
  groups: {
    create: ({options, toDetails}: AdminPageContext) => (
      <GroupCreate preferences={options.preferences} onCreated={(group: {id: string}) => toDetails(group.id)} />
    ),
    details: ({id, options}: AdminPageContext) => (
      <GroupMembers groupId={id} editable={options.editable} preferences={options.preferences} />
    ),
    list: ({createAction, options, toDetails}: AdminPageContext) => (
      <GroupList
        actions={createAction}
        preferences={options.preferences}
        onSelect={(group: {id: string}) => toDetails(group.id)}
      />
    ),
  },
  roles: {
    create: ({options, toDetails}: AdminPageContext) => (
      <RoleCreate preferences={options.preferences} onCreated={(role: {id: string}) => toDetails(role.id)} />
    ),
    details: ({id, options}: AdminPageContext) => (
      <>
        <RolePermissions roleId={id} preferences={options.preferences} />
        <RoleAssignments roleId={id} editable={options.editable} preferences={options.preferences} />
      </>
    ),
    list: ({createAction, options, toDetails}: AdminPageContext) => (
      <RoleList
        actions={createAction}
        preferences={options.preferences}
        onSelect={(role: {id: string}) => toDetails(role.id)}
      />
    ),
  },
  users: {
    create: ({options, toDetails}: AdminPageContext) => (
      <UserCreate preferences={options.preferences} onCreated={(user: {id: string}) => toDetails(user.id)} />
    ),
    details: ({id, options, toList}: AdminPageContext) => (
      <UserDetails
        userId={id}
        deletable={options.deletable}
        editable={options.editable}
        preferences={options.preferences}
        onDeleted={toList}
      />
    ),
    list: ({createAction, options, toDetails}: AdminPageContext) => (
      <UserList
        actions={createAction}
        preferences={options.preferences}
        onSelect={(user: {id: string}) => toDetails(user.id)}
      />
    ),
  },
};

interface AdminPageProps {
  kind: AdminPageKind;
  options: AdminRoutesOptions;
  section: AdminSection;
}

/**
 * Renders one admin page and wires its callbacks to route-relative navigation.
 */
const AdminPage: FC<AdminPageProps> = ({kind, options, section}: AdminPageProps): ReactElement => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const {id = ''} = useParams<{id: string}>();
  const {t} = useTranslation(options.preferences?.i18n);

  // Route-relative: the list is the section's index route, so `..` from `new` or `:id` returns to it.
  const toList = (): void => {
    void navigate(kind === 'list' ? '.' : '..');
  };
  const toDetails = (resourceId: string): void => {
    const target: string = encodeURIComponent(resourceId);

    void navigate(kind === 'list' ? target : `../${target}`);
  };

  const createAction: ReactNode =
    kind === 'list' ? (
      <Button onClick={(): void => void navigate('new')}>{t(`admin.${section}.create.title`)}</Button>
    ) : null;

  return SECTION_PAGES[section][kind]({createAction, id, options, toDetails, toList});
};

export default AdminPage;

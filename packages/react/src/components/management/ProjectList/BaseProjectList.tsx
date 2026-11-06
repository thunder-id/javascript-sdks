// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, Project} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import DataTable, {DataTableColumn} from '../../primitives/DataTable/DataTable';
import {AdminListRenderProps} from '../shared/AdminListRenderProps';
import AdminSection from '../shared/AdminSection';

/**
 * What {@link BaseProjectList} hands its `children` render function. `projects` and `rows` are the same array.
 */
export type BaseProjectListRenderProps = AdminListRenderProps<Project> & {projects: Project[]};

export interface BaseProjectListProps {
  /**
   * Controls rendered next to the title, such as a button that opens `ProjectCreate`.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default table. Receives the projects, the default columns, the
   * loading and error state, and the pagination and selection handlers.
   */
  children?: (props: BaseProjectListRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  /**
   * Page size.
   * @default 20
   */
  limit?: number;
  offset?: number;
  /**
   * Called with the offset of the page to show. Pagination is hidden when omitted.
   */
  onPageChange?: (offset: number) => void;
  /**
   * Called when a project is chosen. Rows are selectable only when set.
   */
  onSelect?: (project: Project) => void;
  preferences?: Preferences;
  projects: Project[];
  selectedProjectId?: string;
  /**
   * Heading of the list. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
}

/**
 * Lists projects with their handle and description. Holds no data of its own: pass the page of
 * projects and handle selection and pagination.
 */
const BaseProjectList: FC<BaseProjectListProps> = ({
  actions,
  children,
  className,
  description,
  error = null,
  isLoading = false,
  limit = 20,
  offset = 0,
  onPageChange,
  onSelect,
  preferences,
  projects,
  selectedProjectId,
  title,
  totalResults,
}: BaseProjectListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<Project>[] = [
    {
      header: t('admin.projects.fields.display_name'),
      id: 'displayName',
      render: (project: Project): ReactNode => project.displayName,
    },
    {header: t('admin.projects.fields.handle'), id: 'handle', render: (project: Project): ReactNode => project.handle},
    {
      header: t('admin.projects.fields.description'),
      id: 'description',
      render: (project: Project): ReactNode => project.description ?? '',
    },
  ];

  if (children) {
    return (
      <div className={className}>
        {children({
          columns,
          error,
          isLoading,
          limit,
          offset,
          onPageChange,
          onSelect,
          projects,
          rows: projects,
          selectedRowId: selectedProjectId,
          totalResults: totalResults ?? projects.length,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="project-list"
      className={className}
      title={title ?? t('admin.projects.list.title')}
      description={description}
      actions={actions}
      preferences={preferences}
    >
      <DataTable
        caption={title?.length ? title : t('admin.projects.list.title')}
        columns={columns}
        rows={projects}
        getRowId={(project: Project): string => project.id}
        isLoading={isLoading}
        error={error}
        emptyText={t('admin.projects.list.empty')}
        onRowClick={onSelect}
        selectedRowId={selectedProjectId}
        pagination={
          onPageChange ? {limit, offset, onChange: onPageChange, total: totalResults ?? projects.length} : undefined
        }
      />
    </AdminSection>
  );
};

export default BaseProjectList;

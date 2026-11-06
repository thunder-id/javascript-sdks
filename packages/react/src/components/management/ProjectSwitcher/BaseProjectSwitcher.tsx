// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, Project, bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {ChangeEvent, FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Select from '../../primitives/Select/Select';

/**
 * What {@link BaseProjectSwitcher} hands its `children` render function, so the switcher can be drawn
 * with any UI.
 */
export interface BaseProjectSwitcherRenderProps {
  /**
   * The current project, or `null` when none is chosen.
   */
  currentProject: Project | null;
  /**
   * A translated message for a failed load, or `null`.
   */
  error: string | null;
  isLoading: boolean;
  /**
   * Loads the next page of projects. Undefined when every project is loaded.
   */
  onLoadMore?: () => void;
  /**
   * Chooses a project as the current one, or clears it with `null`.
   */
  onSelect: (project: Project | null) => void;
  /**
   * The projects loaded so far.
   */
  projects: Project[];
  /**
   * Number of projects on the server, or the number loaded when unknown.
   */
  totalResults: number;
}

export interface BaseProjectSwitcherProps {
  /**
   * Renders custom UI in place of the default select. Receives the projects, the current one, the
   * loading and error state, the next page loader and `onSelect`.
   */
  children?: (props: BaseProjectSwitcherRenderProps) => ReactNode;
  className?: string;
  /**
   * The current project, or `null` when none is chosen. Shown even before its page is loaded.
   */
  currentProject?: Project | null;
  error?: string | null;
  isLoading?: boolean;
  /**
   * Label of the select. Pass an empty string to hide it.
   */
  label?: string;
  /**
   * Loads the next page of projects. The select offers to load more only when set.
   */
  onLoadMore?: () => void;
  /**
   * Called with the chosen project, or with `null` when the choice is cleared.
   */
  onSelect?: (project: Project | null) => void;
  preferences?: Preferences;
  projects: Project[];
  totalResults?: number;
}

/**
 * A select of projects that marks the current one. Holds no data of its own: pass the projects and the
 * current one, and handle the choice.
 */
const BaseProjectSwitcher: FC<BaseProjectSwitcherProps> = ({
  children,
  className,
  currentProject = null,
  error = null,
  isLoading = false,
  label,
  onLoadMore,
  onSelect,
  preferences,
  projects,
  totalResults,
}: BaseProjectSwitcherProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const select = (project: Project | null): void => onSelect?.(project);

  if (children) {
    return (
      <div className={className}>
        {children({
          currentProject,
          error,
          isLoading,
          onLoadMore,
          onSelect: select,
          projects,
          totalResults: totalResults ?? projects.length,
        })}
      </div>
    );
  }

  const resolvedLabel: string = label ?? t('admin.projects.switcher.label');

  return (
    <div className={[withVendorCSSClassPrefix(bem('project-switcher')), className].filter(Boolean).join(' ')}>
      <Select
        name="project"
        label={resolvedLabel || undefined}
        aria-label={resolvedLabel ? undefined : t('admin.projects.switcher.label')}
        placeholder={t('admin.projects.switcher.placeholder')}
        emptyText={t('admin.projects.list.empty')}
        error={error ?? undefined}
        loading={isLoading}
        onLoadMore={onLoadMore}
        options={projects.map((project: Project) => ({label: project.displayName, value: project.id}))}
        selectedOption={currentProject ? {label: currentProject.displayName, value: currentProject.id} : undefined}
        value={currentProject?.id ?? ''}
        onChange={(event: ChangeEvent<HTMLSelectElement>): void =>
          select(projects.find((project: Project) => project.id === event.target.value) ?? null)
        }
      />
    </div>
  );
};

export default BaseProjectSwitcher;

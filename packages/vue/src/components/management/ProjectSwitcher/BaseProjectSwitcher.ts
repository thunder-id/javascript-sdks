// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Preferences, type Project, bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import Select from '../../primitives/Select/Select';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * What `BaseProjectSwitcher` hands its default scoped slot, so the switcher can be drawn with any UI.
 */
export interface BaseProjectSwitcherRenderProps {
  /** The current project, or `null` when none is chosen. */
  currentProject: Project | null;
  /** A translated message for a failed load, or `null`. */
  error: string | null;
  isLoading: boolean;
  /** Loads the next page of projects. Undefined when every project is loaded. */
  onLoadMore?: () => void;
  /** Chooses a project as the current one, or clears it with `null`. */
  onSelect: (project: Project | null) => void;
  /** The projects loaded so far. */
  projects: Project[];
  /** Number of projects on the server, or the number loaded when unknown. */
  totalResults: number;
}

type BaseProjectSwitcherProps = Readonly<{
  className: string;
  currentProject: Project | null;
  error: string | null;
  isLoading: boolean;
  label: string | undefined;
  onLoadMore: (() => void) | undefined;
  preferences: Preferences | undefined;
  projects: Project[];
  totalResults: number | undefined;
}>;

/**
 * A select of projects that marks the current one. Holds no data of its own: pass the projects and the
 * current one, and handle the `select` event, which carries the chosen project or `null` when the
 * choice is cleared.
 *
 * Slots: `default`, a scoped slot that replaces the select with custom UI and receives
 * {@link BaseProjectSwitcherRenderProps}.
 */
const BaseProjectSwitcher: Component = defineComponent({
  name: 'BaseProjectSwitcher',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** The current project, or `null` when none is chosen. Shown even before its page is loaded. */
    currentProject: {default: null, type: Object as PropType<Project | null>},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isLoading: {default: false, type: Boolean},
    /** Label of the select. Pass an empty string to hide it. */
    label: {default: undefined, type: String},
    /** Loads the next page of projects. The select offers to load more only when set. */
    onLoadMore: {default: undefined, type: Function as PropType<() => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    projects: {required: true, type: Array as PropType<Project[]>},
    totalResults: {default: undefined, type: Number},
  },
  emits: ['select'],
  setup(props: BaseProjectSwitcherProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const select = (project: Project | null): void => emit('select', project);

    return (): VNode => {
      if (slots['default']) {
        const renderProps: BaseProjectSwitcherRenderProps = {
          currentProject: props.currentProject,
          error: props.error,
          isLoading: props.isLoading,
          onLoadMore: props.onLoadMore,
          onSelect: select,
          projects: props.projects,
          totalResults: props.totalResults ?? props.projects.length,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      const label: string = props.label ?? t('admin.projects.switcher.label');
      const current: Project | null = props.currentProject;

      return h(
        'div',
        {class: [withVendorCSSClassPrefix(bem('project-switcher')), props.className].filter(Boolean).join(' ')},
        [
          h(Select, {
            ariaLabel: label ? undefined : t('admin.projects.switcher.label'),
            emptyText: t('admin.projects.list.empty'),
            error: props.error ?? undefined,
            label: label || undefined,
            loading: props.isLoading,
            modelValue: current?.id ?? '',
            name: 'project',
            onLoadMore: props.onLoadMore,
            'onUpdate:modelValue': (value: string): void =>
              select(props.projects.find((project: Project) => project.id === value) ?? null),
            options: props.projects.map((project: Project) => ({label: project.displayName, value: project.id})),
            placeholder: t('admin.projects.switcher.placeholder'),
            selectedOption: current ? {label: current.displayName, value: current.id} : undefined,
          }),
        ],
      );
    };
  },
});

export default BaseProjectSwitcher;

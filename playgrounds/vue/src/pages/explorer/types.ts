// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {VNode} from 'vue';

export type Viewport = 'desktop' | 'tablet' | 'mobile';
export type PreviewTheme = 'dark' | 'light';
export type PanelTab = 'controls' | 'code' | 'actions' | 'a11y';

export type ArgValue = string | number | boolean;
export type Args = Record<string, ArgValue>;
export type Action = (name: string, detail?: string) => void;

export type ControlKind = 'text' | 'bool' | 'number' | readonly string[];

export interface PropControl {
  control: ControlKind;
  description: string;
  name: string;
  type: string;
}

export interface StoryDef {
  args?: Args;
  id: string;
  name: string;
}

/** The parts of a Vue single-file component example generated from the current props. */
export interface Snippet {
  /** Named imports from @thunderid/vue. */
  imports: string[];
  /** Lines for the body of `<script setup>`, after the imports. */
  script?: string[];
  /** The markup inside `<template>`. */
  template: string;
  /** Named imports from vue, such as `ref`. */
  vueImports?: string[];
  /** Import lines for other packages, such as a third-party UI library. */
  otherImports?: string[];
}

export interface ComponentDef {
  code: (args: Args) => Snippet;
  controls: PropControl[];
  defaults: Args;
  group: string;
  id: string;
  /** True when the story drives the live SDK and needs a reachable server or a session. */
  live?: boolean;
  name: string;
  render: (args: Args, action: Action) => VNode;
  stories: StoryDef[];
}

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {VNode} from 'vue';

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

/** A Vue single-file component, generated from the current props. */
export interface Snippet {
  /** Names imported from `@thunderid/vue`. Components of `@thunderid/nuxt` are auto-imported. */
  imports: string[];
  /** Lines of `<script setup>` after the imports. */
  script?: string[];
  template: string;
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

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ReactNode} from 'react';

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

export interface Snippet {
  imports: string[];
  jsx: string;
  /** Import lines for other packages, such as a third-party UI library, shown above the SDK import. */
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
  render: (args: Args, action: Action) => ReactNode;
  stories: StoryDef[];
}

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Args, ComponentDef, Snippet} from './types';

const indent = (text: string, spaces: number): string =>
  text
    .split('\n')
    .map((line: string) => `${' '.repeat(spaces)}${line}`)
    .join('\n');

/**
 * Builds a Vue single-file component that renders the component with the current props.
 */
export const buildCode = (component: ComponentDef, args: Args): string => {
  const snippet: Snippet = component.code(args);
  const imports: string[] = Array.from(new Set(snippet.imports)).sort();
  const lines: string[] = [];

  if (snippet.vueImports?.length) lines.push(`import {${snippet.vueImports.join(', ')}} from 'vue';`);
  if (snippet.otherImports?.length) lines.push(...snippet.otherImports);
  lines.push(`import {${imports.join(', ')}} from '@thunderid/vue';`);
  if (snippet.script?.length) lines.push('', ...snippet.script);

  return `<script setup lang="ts">\n${lines.join('\n')}\n</script>\n\n<template>\n${indent(snippet.template, 2)}\n</template>`;
};

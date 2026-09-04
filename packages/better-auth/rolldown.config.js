// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync} from 'fs';
import {join} from 'path';
import {defineConfig} from 'rolldown';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const external = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {}), /^better-auth\//];

const commonOptions = {
  input: [join('src', 'index.ts')],
  preserveModules: true,
  external,
  platform: 'neutral',
  target: 'es2020',
  sourcemap: true,
};

export default defineConfig([
  // ESM build
  {
    ...commonOptions,
    output: {
      dir: 'dist',
      format: 'esm',
      preserveModulesRoot: 'src',
    },
  },
  // CommonJS build
  {
    ...commonOptions,
    output: {
      dir: join('dist', 'cjs'),
      entryFileNames: '[name].cjs',
      format: 'cjs',
      preserveModulesRoot: 'src',
    },
  },
]);

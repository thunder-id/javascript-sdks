#!/usr/bin/env node
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @thunderid/copyright-header */

// Works out which SDKs a release publishes. The person releasing picks the SDKs they changed; this
// adds every SDK that depends on them, directly or transitively, read from the packages'
// package.json files, so nobody has to remember the dependency graph. Selected SDKs take the
// requested bump and the added dependents take a patch. The plan is ordered so every SDK comes
// after the SDKs it depends on, which is the order they are bumped, built and published in.
//
// Usage: node scripts/release-plan.js --bump <patch|minor|major> <sdk-dir> [<sdk-dir> ...]
//   e.g. node scripts/release-plan.js --bump minor browser
// Prints the plan as JSON. In GitHub Actions it also writes it to the `plan` step output and a
// table to the job summary.

import {appendFileSync, readdirSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');

const BUMPS = ['patch', 'minor', 'major'];
const DEP_FIELDS = ['dependencies', 'peerDependencies', 'devDependencies', 'optionalDependencies'];

// Titles used for the GitHub releases.
const TITLES = {
  'better-auth': 'ThunderID Better Auth SDK',
  browser: 'ThunderID Browser SDK',
  express: 'ThunderID Express SDK',
  javascript: 'ThunderID JavaScript SDK',
  nextjs: 'ThunderID Next.js SDK',
  node: 'ThunderID Node SDK',
  nuxt: 'ThunderID Nuxt SDK',
  react: 'ThunderID React SDK',
  'react-router': 'ThunderID React Router SDK',
  'tanstack-router': 'ThunderID TanStack Router SDK',
  vue: 'ThunderID Vue SDK',
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const selected = [];
  let bump;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--bump') {
      bump = argv[i + 1];
      i += 1;
    } else {
      selected.push(...argv[i].split(/[\s,]+/).filter(Boolean));
    }
  }
  return {bump, selected};
}

function loadPackages() {
  const packages = new Map();
  for (const dir of readdirSync(packagesDir, {withFileTypes: true})) {
    if (!dir.isDirectory()) continue;
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(join(packagesDir, dir.name, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    if (pkg.private) continue;
    packages.set(dir.name, pkg);
  }

  const dirByName = new Map([...packages].map(([dir, pkg]) => [pkg.name, dir]));
  const graph = new Map();
  for (const [dir, pkg] of packages) {
    const deps = new Set();
    for (const field of DEP_FIELDS) {
      for (const name of Object.keys(pkg[field] ?? {})) {
        if (dirByName.has(name) && name !== pkg.name) deps.add(dirByName.get(name));
      }
    }
    graph.set(dir, {deps, name: pkg.name, version: pkg.version});
  }
  return graph;
}

function plan(graph, selected, bump) {
  const dependents = new Map([...graph.keys()].map((dir) => [dir, new Set()]));
  for (const [dir, {deps}] of graph) for (const dep of deps) dependents.get(dep).add(dir);

  // Every SDK released, with the released SDKs it depends on that pulled it in.
  const released = new Map(selected.map((dir) => [dir, new Set()]));
  const queue = [...selected];
  while (queue.length > 0) {
    const dir = queue.shift();
    for (const dependent of dependents.get(dir)) {
      if (!released.has(dependent)) {
        released.set(dependent, new Set());
        queue.push(dependent);
      }
      released.get(dependent).add(dir);
    }
  }

  // Order dependencies first, so each SDK is bumped, built and published after what it depends on.
  const ordered = [];
  const visiting = new Set();
  const done = new Set();
  const visit = (dir, path) => {
    if (done.has(dir)) return;
    if (visiting.has(dir)) fail(`Dependency cycle between SDKs: ${[...path, dir].join(' → ')}`);
    visiting.add(dir);
    for (const dep of [...graph.get(dir).deps].sort()) visit(dep, [...path, dir]);
    visiting.delete(dir);
    done.add(dir);
    if (released.has(dir)) ordered.push(dir);
  };
  for (const dir of [...released.keys()].sort()) visit(dir, []);

  return ordered.map((dir) => {
    const {name, version} = graph.get(dir);
    const isSelected = selected.includes(dir);
    const via = [...released.get(dir)].map((dep) => graph.get(dep).name).sort();
    return {
      bump: isSelected ? bump : 'patch',
      currentVersion: version,
      dir,
      name,
      reason: isSelected ? 'selected' : `depends on ${via.join(', ')}`,
      selected: isSelected,
      title: TITLES[dir] ?? `ThunderID ${name}`,
      via,
    };
  });
}

const {bump, selected} = parseArgs(process.argv.slice(2));
if (!BUMPS.includes(bump)) fail(`--bump must be one of ${BUMPS.join(', ')}, got "${bump ?? ''}".`);
if (selected.length === 0) fail('Select at least one SDK to release.');

const graph = loadPackages();
const unknown = selected.filter((dir) => !graph.has(dir));
if (unknown.length > 0) {
  fail(`Unknown SDK(s): ${unknown.join(', ')}. Known SDKs: ${[...graph.keys()].sort().join(', ')}.`);
}

const result = plan(graph, [...new Set(selected)], bump);
console.log(JSON.stringify(result, null, 2));

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `plan=${JSON.stringify(result)}\n`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = result.map(
    (entry) => `| \`${entry.name}\` | ${entry.currentVersion} | ${entry.bump} | ${entry.reason} |`,
  );
  const added = result.filter((entry) => !entry.selected).length;
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '## 📋 Release plan',
      '',
      `${result.length} SDK(s) in publish order: ${selected.length} selected` +
        `${added > 0 ? `, ${added} added because they depend on a released SDK` : ''}.`,
      '',
      '| SDK | Current | Bump | Why |',
      '|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
  );
}

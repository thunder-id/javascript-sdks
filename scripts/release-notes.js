#!/usr/bin/env node
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @thunderid/copyright-header */

// Writes the release notes and the CHANGELOG entry for each SDK in a release. GitHub generates the
// notes, grouping the pull requests by their `Type/*` label as configured in .github/release.yml (the
// same format as the thunder-id/thunderid releases), but it knows nothing about SDKs: it lists every
// pull request merged since the previous tag, whatever package it changed. So this asks GitHub for
// the notes since the SDK's previous tag (`sdk/<dir>/v*`), keeps only the pull requests that changed
// files under the SDK's `packages/<dir>`, and drops the sections that end up empty. An SDK the plan
// added as a dependent also gets a line saying which released SDK pulled it in.
//
// Usage: node scripts/release-notes.js <release.json> <out-dir>
//   <release.json> is the plan with versions, as written by the release workflow's bump step.
// Runs before the SDKs are tagged, against the branch being released (GITHUB_REF_NAME). Writes the
// GitHub release body to <out-dir>/<dir>.md and adds the same notes, under a `## <version>`
// heading, to the top of packages/<dir>/CHANGELOG.md. Needs `gh`, authenticated through GH_TOKEN,
// and the SDKs' tags in the local clone.

import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const [releaseFile, outDir] = process.argv.slice(2);
if (!releaseFile || !outDir) {
  console.error('Usage: node scripts/release-notes.js <release.json> <out-dir>');
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
const target = process.env.GITHUB_REF_NAME;
const PR_LINK = /\/pull\/(\d+)\s*$/;

function gh(...args) {
  return execFileSync('gh', args, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
}

function git(...args) {
  return execFileSync('git', args, {encoding: 'utf8'}).trim();
}

// The SDK's newest tag other than the one being released, or none for its first release.
function previousTag(dir, tag) {
  return git('tag', '--list', `sdk/${dir}/v*`, '--sort=-v:refname')
    .split('\n')
    .find((t) => t && t !== tag);
}

// Pull requests are looked up once, as the same pull request usually appears in several SDKs' notes.
const changedFiles = new Map();
function filesOf(pr) {
  if (!changedFiles.has(pr)) {
    const files = gh('api', '--paginate', `repos/${repo}/pulls/${pr}/files`, '--jq', '.[].filename');
    changedFiles.set(pr, files.split('\n').filter(Boolean));
  }
  return changedFiles.get(pr);
}

function touches(pr, dir) {
  return filesOf(pr).some((file) => file.startsWith(`packages/${dir}/`));
}

// Keeps the lines that link a pull request changing the SDK, and the headings that still have
// lines under them. Other lines, such as the "Full Changelog" link, are kept as they are.
function filterNotes(body, dir) {
  const kept = body.split('\n').filter((line) => {
    const pr = line.startsWith('* ') && line.match(PR_LINK);
    return !pr || touches(pr[1], dir);
  });

  const out = [];
  for (let i = 0; i < kept.length; i += 1) {
    const line = kept[i];
    if (/^#{2,3} /.test(line)) {
      // A heading stays only if a list item follows it before the next heading of the same or a
      // higher level.
      const level = line.match(/^#+/)[0].length;
      let hasItems = false;
      for (let j = i + 1; j < kept.length; j += 1) {
        const next = kept[j].match(/^(#+) /);
        if (next && next[1].length <= level) break;
        if (kept[j].startsWith('* ')) {
          hasItems = true;
          break;
        }
      }
      if (!hasItems) continue;
    }
    out.push(line);
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// The CHANGELOG entry is the release notes under the version's heading, without the top-level
// "What's Changed" heading and the "New Contributors" section.
function changelogEntry(version, notes) {
  const lines = [];
  let skip = false;
  for (const line of notes.split('\n')) {
    if (/^## What.s Changed/.test(line)) continue;
    if (/^## New Contributors/.test(line)) {
      skip = true;
      continue;
    }
    if (line.startsWith('**Full Changelog**')) skip = false;
    if (!skip) lines.push(line);
  }
  return `## ${version}\n\n${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

function prependChangelog(dir, entry) {
  const file = join('packages', dir, 'CHANGELOG.md');
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  writeFileSync(file, existing ? `${entry}\n${existing}` : entry);
}

const release = JSON.parse(readFileSync(releaseFile, 'utf8'));
mkdirSync(outDir, {recursive: true});

for (const entry of release) {
  const tag = `sdk/${entry.dir}/v${entry.version}`;
  const previous = previousTag(entry.dir, tag);
  const args = ['api', `repos/${repo}/releases/generate-notes`, '-f', `tag_name=${tag}`, '--jq', '.body'];
  if (target) args.push('-f', `target_commitish=${target}`);
  if (previous) args.push('-f', `previous_tag_name=${previous}`);

  // The generator comment GitHub puts at the top is dropped.
  let notes = filterNotes(
    gh(...args)
      .split('\n')
      .filter((line) => !line.startsWith('<!--'))
      .join('\n'),
    entry.dir,
  );
  // On a first release GitHub compares against some other SDK's tag, so that link is dropped.
  if (!previous) notes = notes.replace(/^\*\*Full Changelog\*\*.*$/m, '').trim();
  if (!notes.includes('* ')) {
    const since = previous ? ` since ${previous}` : '';
    notes = `No changes to this SDK${since}.\n\n${notes}`.trim();
  }
  if (!entry.selected) {
    notes = `Released because it depends on ${entry.via.join(', ')}, which this release also updates.\n\n${notes}`;
  }

  writeFileSync(join(outDir, `${entry.dir}.md`), `${notes}\n`);
  prependChangelog(entry.dir, changelogEntry(entry.version, notes));
  console.log(`${tag} (since ${previous ?? 'the first release'}):\n${notes}\n`);
}

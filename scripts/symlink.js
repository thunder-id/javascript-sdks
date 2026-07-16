#!/usr/bin/env node
/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* eslint-disable @thunderid/copyright-header */

// Builds SDK packages, then prints link: paths and catalog version entries for use in package.json.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const packagesDir = join(root, "packages");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
};

const args = process.argv.slice(2);
const allPackages =
  args.length > 0
    ? args
    : readdirSync(packagesDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

const run = (cmd, cwd) =>
  execSync(cmd, { cwd, stdio: "inherit" });

// Minimal parser for the top-level `catalog:` block in this repo's pnpm-workspace.yaml.
const parseCatalog = (workspaceYamlPath) => {
  const catalog = new Map();
  let inCatalog = false;
  for (const line of readFileSync(workspaceYamlPath, "utf8").split("\n")) {
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true;
      continue;
    }
    if (!inCatalog) continue;
    if (/^\S/.test(line)) break;
    const match = line.match(/^\s*(['"]?)([^'":]+)\1:\s*(.+?)\s*$/);
    if (!match) continue;
    const value = match[3].replace(/^(['"])(.*)\1$/, "$2");
    catalog.set(match[2], value);
  }
  return catalog;
};

// Collect valid packages first
const packageInfos = [];
for (const pkg of allPackages) {
  const pkgDir = join(packagesDir, pkg);
  if (!existsSync(join(pkgDir, "package.json"))) {
    console.error(`${c.yellow}⚠  Skipping '${pkg}': no package.json found${c.reset}`);
    continue;
  }
  const { name, version } = require(join(pkgDir, "package.json"));
  packageInfos.push({ pkg, pkgDir, name, version });
}

// Build all in one pnpm -r command so it respects workspace dependency order
const filterArgs = packageInfos.map(({ name }) => `--filter ${name}`).join(" ");
console.error(`${c.dim}▶ building ${packageInfos.map((i) => i.name).join(", ")}...${c.reset}`);
run(`pnpm -r ${filterArgs} build`, root);

for (const { name, pkgDir } of packageInfos) {
  console.error(`  ${c.green}✓${c.reset} ${c.gray}${pkgDir}${c.reset}`);
}

// Built package.jsons still carry literal "catalog:" specifiers (e.g. "@emotion/css": "catalog:"),
// which only resolve against this repo's own pnpm-workspace.yaml. Since file:/workspace: links
// point straight at these package.json files, resolve catalog: to exact versions in place before
// symlinking so a consumer's pnpm install doesn't need matching catalog entries of its own.
const rootCatalog = parseCatalog(join(root, "pnpm-workspace.yaml"));
const depFields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
for (const { pkgDir, name } of packageInfos) {
  const pkgJsonPath = join(pkgDir, "package.json");
  const pkg = require(pkgJsonPath);
  let text = readFileSync(pkgJsonPath, "utf8");
  for (const field of depFields) {
    for (const [dep, spec] of Object.entries(pkg[field] ?? {})) {
      if (spec !== "catalog:") continue;
      const version = rootCatalog.get(dep);
      if (!version) {
        console.error(`${c.yellow}⚠  ${name}: '${dep}' uses catalog: but has no entry in pnpm-workspace.yaml — left as-is${c.reset}`);
        continue;
      }
      const escaped = dep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      text = text.replace(new RegExp(`("${escaped}":\\s*)"catalog:"`), `$1"${version}"`);
    }
  }
  writeFileSync(pkgJsonPath, text);
}

console.error("");
console.error(`${c.bold}${c.cyan}────────────────────────────────────────────${c.reset}`);
console.error(`${c.bold}${c.cyan}  file: entries — paste into package.json:${c.reset}`);
console.error(`${c.bold}${c.cyan}────────────────────────────────────────────${c.reset}`);
for (const { name, pkgDir } of packageInfos) {
  process.stdout.write(`  ${c.bold}"${name}"${c.reset}: ${c.green}"file:${pkgDir}"${c.reset}\n`);
}

console.error("");
console.error(`${c.bold}${c.cyan}────────────────────────────────────────────${c.reset}`);
console.error(`${c.bold}${c.cyan}  overrides — paste into pnpm-workspace.yaml:${c.reset}`);
console.error(`${c.bold}${c.cyan}────────────────────────────────────────────${c.reset}`);
process.stdout.write(`${c.bold}overrides:${c.reset}\n`);
for (const { name, pkgDir } of packageInfos) {
  process.stdout.write(`  ${c.bold}"${name}"${c.reset}: ${c.green}"file:${pkgDir}"${c.reset}\n`);
}

console.error("");
console.error(`${c.bold}${c.cyan}────────────────────────────────────────────${c.reset}`);
console.error(`${c.bold}${c.cyan}  catalog — paste into pnpm-workspace.yaml:${c.reset}`);
console.error(`${c.bold}${c.cyan}────────────────────────────────────────────${c.reset}`);
process.stdout.write(`${c.bold}catalog:${c.reset}\n`);
for (const { name, version } of packageInfos) {
  process.stdout.write(`  ${c.bold}"${name}"${c.reset}: ${c.green}${version}${c.reset}\n`);
}

console.error("");
console.error(`${c.bold}${c.cyan}────────────────────────────────────────────${c.reset}`);
console.error(`${c.bold}${c.cyan}  workspace: entries — paste into package.json (same workspace):${c.reset}`);
console.error(`${c.bold}${c.cyan}────────────────────────────────────────────${c.reset}`);
for (const { name } of packageInfos) {
  process.stdout.write(`  ${c.bold}"${name}"${c.reset}: ${c.green}"workspace:*"${c.reset}\n`);
}

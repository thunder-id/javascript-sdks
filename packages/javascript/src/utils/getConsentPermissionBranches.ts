// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ConsentPurposeData, PromptElement} from '../models/embedded-flow';

/**
 * A permission shown read-only beneath a branch, at its depth below the branch root (1 for a direct child).
 */
export interface ConsentPermissionBranchItem {
  depth: number;
  name: string;
}

/**
 * One branch of a hierarchical permission purpose: a single decision covering a permission and everything
 * beneath it.
 */
export interface ConsentPermissionBranch {
  /** The `optional` elements the branch's switch decides: the root, then the prompted permissions beneath it. */
  decisions: string[];
  /** The permissions beneath the root, in tree order, for display only. */
  descendants: ConsentPermissionBranchItem[];
  /** The permission the branch's switch decides. */
  name: string;
}

const covers = (held: string, required: string, delimiter: string): boolean =>
  held === required || required.startsWith(`${held}${delimiter}`);

/**
 * Groups a hierarchical permission purpose into one branch per top-level `optional` permission. Returns an
 * empty list for a purpose without `permissionDelimiter`.
 *
 * @param purpose - A consent purpose from the consent prompt.
 * @returns The purpose's branches, in the order of their roots in `optional`.
 */
const getConsentPermissionBranches = (purpose: ConsentPurposeData): ConsentPermissionBranch[] => {
  const delimiter: string | undefined = purpose.permissionDelimiter;

  if (purpose.type !== 'permissions' || !delimiter) {
    return [];
  }

  const prompted: string[] = (purpose.optional ?? []).map((element: PromptElement) => element.name);
  const displayed: string[] = Array.from(
    new Set([...prompted, ...(purpose.displayElements ?? []).map((element: PromptElement) => element.name)]),
  );

  const childrenOf = new Map<string, string[]>();
  displayed.forEach((name: string) => {
    const parent: string | undefined = displayed
      .filter((other: string) => other !== name && covers(other, name, delimiter))
      .sort((a: string, b: string) => b.length - a.length)[0];

    if (parent) {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), name]);
    }
  });

  const collect = (name: string, depth: number): ConsentPermissionBranchItem[] =>
    [...(childrenOf.get(name) ?? [])]
      .sort()
      .flatMap((child: string) => [{depth, name: child}, ...collect(child, depth + 1)]);

  return prompted
    .filter((name: string) => !prompted.some((other: string) => other !== name && covers(other, name, delimiter)))
    .map((root: string) => ({
      decisions: [root, ...prompted.filter((name: string) => name !== root && covers(root, name, delimiter))],
      descendants: collect(root, 1),
      name: root,
    }));
};

export default getConsentPermissionBranches;

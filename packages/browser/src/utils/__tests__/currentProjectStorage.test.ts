// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it} from 'vitest';
import {getCurrentProjectStorageKey, readCurrentProject, writeCurrentProject} from '../currentProjectStorage';

describe('currentProjectStorage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('keeps the current project per vendor and forgets it with null', () => {
    const project = {createdAt: '2026-01-01T00:00:00Z', displayName: 'Shop', handle: 'shop', id: 'p-1'};

    writeCurrentProject('acme', project);

    expect(getCurrentProjectStorageKey('acme')).toBe('acme-current-project');
    expect(readCurrentProject('acme')).toEqual(project);
    expect(readCurrentProject('other')).toBeNull();

    writeCurrentProject('acme', null);
    expect(readCurrentProject('acme')).toBeNull();
  });

  it('ignores a stored value that is not a project', () => {
    window.localStorage.setItem(getCurrentProjectStorageKey('acme'), '{"name":"x"}');
    expect(readCurrentProject('acme')).toBeNull();

    window.localStorage.setItem(getCurrentProjectStorageKey('acme'), 'not json');
    expect(readCurrentProject('acme')).toBeNull();
  });
});

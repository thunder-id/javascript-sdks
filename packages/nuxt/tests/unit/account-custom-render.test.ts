// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */

import {describe, expect, it, vi} from 'vitest';
import {effectScope, ref} from 'vue';

const BaseVerifyAttribute = {name: 'BaseVerifyAttribute'};
const BaseUserProfile = {name: 'BaseUserProfile'};
const revalidateProfile = vi.fn().mockResolvedValue(undefined);
const updateProfile = vi.fn();

vi.mock('@thunderid/vue', () => ({
  BaseUserProfile,
  BaseVerifyAttribute,
  useI18n: () => ({t: (key: string) => key}),
}));

vi.mock('#imports', () => ({
  useUser: () => ({
    flattenedProfile: ref(null),
    profile: ref(null),
    revalidateProfile,
    updateProfile,
    userSchema: ref({email: {type: 'email'}}),
  }),
}));

const {default: VerifyAttribute} = await import('../../src/runtime/components/account/VerifyAttribute');
const {default: UserProfile} = await import('../../src/runtime/components/account/UserProfile');

const renderSetup = (component: any, props: Record<string, unknown>, slots: Record<string, unknown>) => {
  const scope = effectScope();
  const render = scope.run(() => component.setup(props, {attrs: {}, emit: vi.fn(), slots} as any));
  return {node: render(), render, scope};
};

describe('VerifyAttribute custom render', () => {
  it('hands its default slot to BaseVerifyAttribute and keeps the profile re-read on completion', async () => {
    const custom = vi.fn();
    const onComplete = vi.fn();
    const {node, scope} = renderSetup(
      VerifyAttribute,
      {attribute: 'email', className: '', flowHandle: 'default', onComplete, showSubtitle: true, showTitle: true},
      {default: custom},
    );

    expect(node.type).toBe(BaseVerifyAttribute);
    expect(node.children.default).toBe(custom);

    node.props.onComplete({executionId: 'exec-1', flowStatus: 'COMPLETE'});
    await Promise.resolve();

    expect(revalidateProfile).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({executionId: 'exec-1', flowStatus: 'COMPLETE'});
    scope.stop();
  });
});

describe('VerifyAttribute server render', () => {
  it('starts no verification before it is mounted on the client', () => {
    const {node, scope} = renderSetup(
      VerifyAttribute,
      {attribute: 'email', className: '', flowHandle: 'default', showSubtitle: true, showTitle: true},
      {},
    );

    expect(node.props.isInitialized).toBe(false);
    scope.stop();
  });
});

describe('UserProfile custom render', () => {
  it('hands its default slot to BaseUserProfile with the verification slot that runs VerifyAttribute', () => {
    const custom = vi.fn();
    const {node, scope} = renderSetup(
      UserProfile,
      {
        cardLayout: true,
        className: '',
        editable: true,
        hideFields: [],
        showFields: [],
        title: 'Profile',
        verificationFlowHandle: 'email-link-verification',
      },
      {default: custom},
    );

    expect(node.type).toBe(BaseUserProfile);
    expect(node.children.default).toBe(custom);

    const panel = node.children.verification({attribute: 'email', attributeDisplayName: 'Email', onCancel: vi.fn()});

    expect(panel.type).toBe(VerifyAttribute);
    expect(panel.props).toEqual(expect.objectContaining({attribute: 'email', flowHandle: 'email-link-verification'}));
    scope.stop();
  });
});

describe('UserProfile save failure', () => {
  it('shows the generic message, never the route or server text', async () => {
    updateProfile.mockResolvedValueOnce({
      error: 'FetchError: [PATCH] "/api/auth/user/profile": 500 db down',
      success: false,
    });
    const {node, render, scope} = renderSetup(
      UserProfile,
      {
        cardLayout: true,
        className: '',
        editable: true,
        hideFields: [],
        showFields: [],
        title: 'Profile',
        verificationFlowHandle: 'default',
      },
      {},
    );

    await node.props.onUpdate({email: 'new@example.com'});

    expect(render().props.error).toBe('user.profile.update.generic.error');
    scope.stop();
  });
});

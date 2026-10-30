// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import parseSelfServiceFlowRequest from '../parseSelfServiceFlowRequest';

describe('parseSelfServiceFlowRequest', () => {
  it('keeps a request that starts a self-service flow by handle', () => {
    expect(
      parseSelfServiceFlowRequest({
        flowType: 'SELF_SERVICE',
        handle: 'default-self-attribute-verification-flow',
        inputs: {attribute: 'email'},
      }),
    ).toEqual({
      request: {
        flowType: 'SELF_SERVICE',
        handle: 'default-self-attribute-verification-flow',
        inputs: {attribute: 'email'},
      },
    });
  });

  it('keeps a continuation step', () => {
    expect(
      parseSelfServiceFlowRequest({
        action: 'action_email_verify',
        challengeToken: 'ct-1',
        executionId: 'exec-1',
        inputs: {otp: '123456'},
      }),
    ).toEqual({
      request: {action: 'action_email_verify', challengeToken: 'ct-1', executionId: 'exec-1', inputs: {otp: '123456'}},
    });
  });

  it('drops fields a step does not have, such as a user or application identifier', () => {
    expect(
      parseSelfServiceFlowRequest({
        applicationId: 'app-1',
        flowType: 'SELF_SERVICE',
        handle: 'h',
        sessionId: 'someone-elses-session',
        userId: 'someone-else',
        verbose: false,
      }),
    ).toEqual({request: {flowType: 'SELF_SERVICE', handle: 'h'}});

    expect(parseSelfServiceFlowRequest({executionId: 'exec-1', flowType: 'AUTHENTICATION', userId: 'u'})).toEqual({
      request: {executionId: 'exec-1'},
    });
  });

  it.each([
    ['a flow of another type', {flowType: 'AUTHENTICATION', handle: 'h'}, 'flowType'],
    ['no flow type', {handle: 'h'}, 'flowType'],
    ['no handle', {flowType: 'SELF_SERVICE'}, 'handle'],
    ['an empty handle', {flowType: 'SELF_SERVICE', handle: ''}, 'handle'],
    ['a handle that is not a string', {flowType: 'SELF_SERVICE', handle: ['h']}, 'handle'],
    ['an empty execution ID', {executionId: ''}, 'executionId'],
    ['an execution ID that is not a string', {executionId: 1}, 'executionId'],
    ['an action that is not a string', {action: {}, executionId: 'e'}, 'action'],
    ['a challenge token that is not a string', {challengeToken: 1, executionId: 'e'}, 'challengeToken'],
    ['inputs that are not strings', {executionId: 'e', inputs: {otp: 123456}}, 'inputs'],
    ['inputs that are a list', {executionId: 'e', inputs: ['123456']}, 'inputs'],
    ['a body that is not an object', 'executionId=e', 'body'],
    ['no body', null, 'body'],
  ])('refuses %s', (_label: string, raw: unknown, invalid: string) => {
    expect(parseSelfServiceFlowRequest(raw)).toEqual({invalid});
  });
});

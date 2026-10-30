// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type EmbeddedSelfServiceFlowRequest,
  type EmbeddedSelfServiceFlowResponse,
  EmbeddedSelfServiceFlowStatus,
  type ManagedUser,
  type MembershipGroup,
} from '@thunderid/react';

// Sample data for the Base components. Nothing here reaches a server.

const OU = 'ou_9d1e07';

export const SAMPLE_USERS: ManagedUser[] = [
  ['usr_8f2c41', 'Liam Chen', 'liam.chen'],
  ['usr_31b7e0', 'Ana Silva', 'ana.silva'],
  ['usr_5c90aa', 'Kofi Mensah', 'kofi.mensah'],
  ['usr_77de12', 'Mei Lin', 'mei.lin'],
  ['usr_a0b3f9', 'Omar Haddad', 'omar.haddad'],
].map(([id, display, username]: string[]) => ({
  attributes: {email: `${username}@acme.io`, username},
  display,
  id,
  ouHandle: 'engineering',
  ouId: OU,
  type: 'employee',
}));

export const SAMPLE_MEMBERSHIPS: MembershipGroup[] = [
  {id: 'grp_admins', name: 'Administrators', ouId: OU},
  {id: 'grp_support', name: 'Support', ouId: OU},
];

// A self attribute verification flow that accepts the code 123456, for the Base verification stories.
export const SAMPLE_VERIFICATION_STEP: EmbeddedSelfServiceFlowResponse = {
  challengeToken: 'sample',
  data: {
    additionalData: {maskedDestination: 'l•••@acme.io'},
    components: [
      {id: 'heading', label: 'Verify your email address', type: 'TEXT', variant: 'HEADING_1'},
      {
        id: 'message',
        label: 'Enter the verification code sent to your email address.',
        type: 'TEXT',
        variant: 'HEADING_6',
      },
      {
        components: [
          {id: 'input_otp', label: 'Verification code', ref: 'otp', required: true, type: 'OTP_INPUT'},
          {eventType: 'SUBMIT', id: 'action_verify', label: 'Verify', type: 'ACTION', variant: 'PRIMARY'},
          {eventType: 'SUBMIT', id: 'action_resend', label: 'Resend code', type: 'RESEND'},
        ],
        id: 'block_otp',
        type: 'BLOCK',
      },
    ],
  },
  executionId: 'sample',
  flowStatus: EmbeddedSelfServiceFlowStatus.Incomplete,
} as unknown as EmbeddedSelfServiceFlowResponse;

export const submitSampleVerification = (
  payload: EmbeddedSelfServiceFlowRequest,
): Promise<EmbeddedSelfServiceFlowResponse> => {
  if (payload.action === 'action_resend' || payload.inputs?.['otp'] === '123456') {
    return Promise.resolve(
      payload.action === 'action_resend'
        ? SAMPLE_VERIFICATION_STEP
        : {executionId: 'sample', flowStatus: EmbeddedSelfServiceFlowStatus.Complete},
    );
  }

  return Promise.resolve({
    ...SAMPLE_VERIFICATION_STEP,
    data: {components: SAMPLE_VERIFICATION_STEP.data?.components},
    error: {message: {defaultValue: 'The code is incorrect.', key: 'otp.invalid'}},
  } as unknown as EmbeddedSelfServiceFlowResponse);
};

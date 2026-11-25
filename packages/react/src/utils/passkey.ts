// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDRuntimeError, arrayBufferToBase64url, base64urlToArrayBuffer} from '@thunderid/browser';

/**
 * Handles WebAuthn/Passkey registration flow for browser environments.
 *
 * @param challengeData - JSON stringified challenge data containing WebAuthn creation options.
 * @returns Promise that resolves to a JSON string containing the WebAuthn registration response.
 */
export const handlePasskeyRegistration = async (challengeData: string): Promise<string> => {
  if (!window.navigator.credentials?.create) {
    throw new ThunderIDRuntimeError(
      'WebAuthn is not supported in this browser.',
      'browser-webauthn-not-supported',
      'browser',
      'WebAuthn/Passkey registration requires a browser that supports the Web Authentication API.',
    );
  }

  try {
    const creationOptions: any = JSON.parse(challengeData);

    // Decode challenge and user ID from base64url to BufferSource
    const publicKey: any = {
      ...creationOptions,
      challenge: base64urlToArrayBuffer(creationOptions.challenge),
      user: {
        ...creationOptions.user,
        id: base64urlToArrayBuffer(creationOptions.user.id),
      },
      ...(creationOptions.excludeCredentials && {
        excludeCredentials: creationOptions.excludeCredentials.map((cred: any) => ({
          ...cred,
          id: base64urlToArrayBuffer(cred.id),
        })),
      }),
    };

    const credential: PublicKeyCredential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new ThunderIDRuntimeError(
        'No credential returned from WebAuthn registration.',
        'browser-webauthn-no-credential',
        'browser',
        'The WebAuthn registration ceremony completed but did not return a valid credential.',
      );
    }

    const response: AuthenticatorAttestationResponse = credential.response as AuthenticatorAttestationResponse;

    // Encode response fields back to base64url
    const registrationResponse: any = {
      id: credential.id,
      rawId: arrayBufferToBase64url(credential.rawId),
      response: {
        attestationObject: arrayBufferToBase64url(response.attestationObject),
        clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
        ...(response.getTransports && {
          transports: response.getTransports(),
        }),
      },
      type: credential.type,
      ...(credential.authenticatorAttachment && {
        authenticatorAttachment: credential.authenticatorAttachment,
      }),
    };

    return JSON.stringify(registrationResponse);
  } catch (error) {
    if (error instanceof ThunderIDRuntimeError) {
      throw error;
    }

    if (error instanceof Error) {
      // Map specific WebAuthn errors to ThunderIDRuntimeError/friendly messages as needed
      throw new ThunderIDRuntimeError(
        'Passkey registration failed. Please try again.',
        'browser-webauthn-registration-error',
        'browser',
        `WebAuthn registration failed with error: ${error.name}: ${error.message}`,
      );
    }

    throw new ThunderIDRuntimeError(
      'Passkey registration failed due to an unexpected error.',
      'browser-webauthn-unexpected-error',
      'browser',
      'An unexpected error occurred during WebAuthn registration.',
    );
  }
};

/**
 * Handles WebAuthn/Passkey authentication flow for browser environments.
 *
 * @param challengeData - JSON stringified challenge data containing WebAuthn request options.
 * @returns Promise that resolves to a JSON string containing the WebAuthn authentication response.
 */
export const handlePasskeyAuthentication = async (challengeData: string): Promise<string> => {
  if (!window.navigator.credentials?.get) {
    throw new ThunderIDRuntimeError(
      'WebAuthn is not supported in this browser.',
      'browser-webauthn-not-supported',
      'browser',
      'WebAuthn/Passkey authentication requires a browser that supports the Web Authentication API.',
    );
  }

  try {
    const requestOptions: any = JSON.parse(challengeData);

    // Decode challenge and allowed credentials from base64url to BufferSource
    const publicKey: any = {
      ...requestOptions,
      challenge: base64urlToArrayBuffer(requestOptions.challenge),
      ...(requestOptions.allowCredentials && {
        allowCredentials: requestOptions.allowCredentials.map((cred: any) => ({
          ...cred,
          id: base64urlToArrayBuffer(cred.id),
        })),
      }),
    };

    const credential: PublicKeyCredential = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new ThunderIDRuntimeError(
        'No credential returned from WebAuthn authentication.',
        'browser-webauthn-no-credential',
        'browser',
        'The WebAuthn authentication ceremony completed but did not return a valid credential.',
      );
    }

    const response: AuthenticatorAssertionResponse = credential.response as AuthenticatorAssertionResponse;

    // Encode response fields back to base64url
    const authenticationResponse: any = {
      id: credential.id,
      rawId: arrayBufferToBase64url(credential.rawId),
      response: {
        authenticatorData: arrayBufferToBase64url(response.authenticatorData),
        clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
        signature: arrayBufferToBase64url(response.signature),
        ...(response.userHandle && {
          userHandle: arrayBufferToBase64url(response.userHandle),
        }),
      },
      type: credential.type,
      ...(credential.authenticatorAttachment && {
        authenticatorAttachment: credential.authenticatorAttachment,
      }),
    };

    return JSON.stringify(authenticationResponse);
  } catch (error) {
    if (error instanceof ThunderIDRuntimeError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ThunderIDRuntimeError(
        'Passkey authentication failed. Please try again.',
        'browser-webauthn-authentication-error',
        'browser',
        `WebAuthn authentication failed with error: ${error.name}: ${error.message}`,
      );
    }

    throw new ThunderIDRuntimeError(
      'Passkey authentication failed due to an unexpected error.',
      'browser-webauthn-unexpected-error',
      'browser',
      'An unexpected error occurred during WebAuthn authentication.',
    );
  }
};

/**
 * Builds the flow inputs that report a failed passkey prompt, as when the person cancels it or the device holds no
 * matching passkey. The flow can then take the person back to try again.
 *
 * @param error - The error the passkey ceremony failed with.
 * @returns The flow inputs to submit in place of the passkey response.
 */
export const passkeyFailureInputs = (error: unknown): Record<string, string> => ({
  passkeyError: error instanceof ThunderIDRuntimeError ? error.code : 'browser-webauthn-unexpected-error',
});

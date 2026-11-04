// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {
  baseUrl,
  createFetcher,
  FetcherMock,
  itMapsForbiddenAndNotFound,
  itSendsRequests,
  requests,
} from './helpers/managementRequests';
import ThunderIDAPIError from '../../../errors/ThunderIDAPIError';
import deleteClientRegistration from '../client-registrations/deleteClientRegistration';
import getClientRegistration from '../client-registrations/getClientRegistration';
import registerClient from '../client-registrations/registerClient';
import updateClientRegistration from '../client-registrations/updateClientRegistration';
import createCredentialConfiguration from '../credential-configurations/createCredentialConfiguration';
import deleteCredentialConfiguration from '../credential-configurations/deleteCredentialConfiguration';
import getCredentialConfiguration from '../credential-configurations/getCredentialConfiguration';
import getCredentialConfigurations from '../credential-configurations/getCredentialConfigurations';
import updateCredentialConfiguration from '../credential-configurations/updateCredentialConfiguration';
import createPresentationDefinition from '../presentation-definitions/createPresentationDefinition';
import deletePresentationDefinition from '../presentation-definitions/deletePresentationDefinition';
import getPresentationDefinition from '../presentation-definitions/getPresentationDefinition';
import getPresentationDefinitions from '../presentation-definitions/getPresentationDefinitions';
import updatePresentationDefinition from '../presentation-definitions/updatePresentationDefinition';

const credential = {
  claims: [{displayName: 'Given name', name: 'given_name'}],
  handle: 'example-pid',
  ouId: 'ou-1',
  vct: 'urn:example:pid:1',
};

const definition = {
  claimValues: {country: ['LK']},
  handle: 'example-pid',
  mandatoryClaims: ['given_name'],
  ouId: 'ou-1',
  vct: 'urn:example:pid:1',
};

describe('credential configurations API', () => {
  itSendsRequests([
    [
      'getCredentialConfigurations',
      (fetcher) => getCredentialConfigurations({baseUrl, fetcher}),
      'GET',
      '/openid4vci/credential-configurations',
    ],
    [
      'getCredentialConfiguration',
      (fetcher) => getCredentialConfiguration({baseUrl, configurationId: 'vc 1', fetcher}),
      'GET',
      '/openid4vci/credential-configurations/vc%201',
    ],
    [
      'createCredentialConfiguration',
      (fetcher) => createCredentialConfiguration({baseUrl, fetcher, payload: credential}),
      'POST',
      '/openid4vci/credential-configurations',
      credential,
    ],
    [
      'updateCredentialConfiguration',
      (fetcher) => updateCredentialConfiguration({baseUrl, configurationId: 'vc-1', fetcher, payload: credential}),
      'PUT',
      '/openid4vci/credential-configurations/vc-1',
      credential,
    ],
    [
      'deleteCredentialConfiguration',
      (fetcher) => deleteCredentialConfiguration({baseUrl, configurationId: 'vc-1', fetcher}),
      'DELETE',
      '/openid4vci/credential-configurations/vc-1',
    ],
  ]);

  itMapsForbiddenAndNotFound('getCredentialConfiguration', (fetcher) =>
    getCredentialConfiguration({baseUrl, configurationId: 'vc-1', fetcher}),
  );

  it('returns the configurations as the server sent them', async () => {
    const list = [{format: 'dc+sd-jwt', handle: 'example-pid', id: 'vc-1', ouHandle: 'root', ouId: 'ou-1', vct: 'urn'}];

    await expect(getCredentialConfigurations({baseUrl, fetcher: createFetcher(list)})).resolves.toEqual(list);
  });

  it('uses the credentialConfigurations endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher();

    await getCredentialConfiguration({
      baseUrl,
      configurationId: 'vc-1',
      fetcher,
      url: 'https://rs.example.com/vci/configs',
    });

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/vci/configs/vc-1');
  });
});

describe('presentation definitions API', () => {
  itSendsRequests([
    [
      'getPresentationDefinitions',
      (fetcher) => getPresentationDefinitions({baseUrl, fetcher}),
      'GET',
      '/openid4vp/presentation-definitions',
    ],
    [
      'getPresentationDefinition',
      (fetcher) => getPresentationDefinition({baseUrl, definitionId: 'vp-1', fetcher}),
      'GET',
      '/openid4vp/presentation-definitions/vp-1',
    ],
    [
      'createPresentationDefinition',
      (fetcher) => createPresentationDefinition({baseUrl, fetcher, payload: definition}),
      'POST',
      '/openid4vp/presentation-definitions',
      definition,
    ],
    [
      'updatePresentationDefinition',
      (fetcher) => updatePresentationDefinition({baseUrl, definitionId: 'vp-1', fetcher, payload: definition}),
      'PUT',
      '/openid4vp/presentation-definitions/vp-1',
      definition,
    ],
    [
      'deletePresentationDefinition',
      (fetcher) => deletePresentationDefinition({baseUrl, definitionId: 'vp-1', fetcher}),
      'DELETE',
      '/openid4vp/presentation-definitions/vp-1',
    ],
  ]);

  itMapsForbiddenAndNotFound('getPresentationDefinition', (fetcher) =>
    getPresentationDefinition({baseUrl, definitionId: 'vp-1', fetcher}),
  );

  it('uses the presentationDefinitions endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher();

    await deletePresentationDefinition({
      baseUrl,
      definitionId: 'vp-1',
      fetcher,
      url: 'https://rs.example.com/vp/definitions/',
    });

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/vp/definitions/vp-1');
  });
});

describe('client registrations API', () => {
  const secret = 'ZJYCqe3GGRvdrudKyZS0XhGv_Z45DuKhCUk0gBR1vZk';

  const wireRegistration = {
    app_id: 'app-1',
    client_id: 's6BhdRkqt3',
    client_name: 'My App',
    client_name_unknown_extension: 'dropped',
    client_secret: secret,
    client_secret_expires_at: 0,
    grant_types: ['authorization_code', 'refresh_token'],
    jwks: {keys: [{kid: 'k1', use: 'sig'}]},
    redirect_uris: ['https://myapp.example.com/callback'],
    require_pushed_authorization_requests: true,
    token_endpoint_auth_method: 'client_secret_basic',
  };

  itSendsRequests([
    [
      'registerClient',
      (fetcher) =>
        registerClient({
          baseUrl,
          fetcher,
          payload: {
            clientName: 'My App',
            grantTypes: ['authorization_code'],
            idTokenSignedResponseAlg: 'RS256',
            ouId: 'ou-1',
            redirectUris: ['https://myapp.example.com/callback'],
            tokenEndpointAuthMethod: 'client_secret_basic',
          },
        }),
      'POST',
      '/oauth2/dcr/register',
      {
        client_name: 'My App',
        grant_types: ['authorization_code'],
        id_token_signed_response_alg: 'RS256',
        ou_id: 'ou-1',
        redirect_uris: ['https://myapp.example.com/callback'],
        token_endpoint_auth_method: 'client_secret_basic',
      },
    ],
    [
      'getClientRegistration',
      (fetcher) => getClientRegistration({baseUrl, clientId: 'client 1', fetcher}),
      'GET',
      '/oauth2/dcr/register/client%201',
    ],
    [
      'updateClientRegistration',
      (fetcher) =>
        updateClientRegistration({
          baseUrl,
          clientId: 's6BhdRkqt3',
          fetcher,
          payload: {clientName: 'Renamed', postLogoutRedirectUris: ['https://a/out'], redirectUris: ['https://a/cb']},
        }),
      'PUT',
      '/oauth2/dcr/register/s6BhdRkqt3',
      {
        client_id: 's6BhdRkqt3',
        client_name: 'Renamed',
        post_logout_redirect_uris: ['https://a/out'],
        redirect_uris: ['https://a/cb'],
      },
    ],
    [
      'deleteClientRegistration',
      (fetcher) => deleteClientRegistration({baseUrl, clientId: 's6BhdRkqt3', fetcher}),
      'DELETE',
      '/oauth2/dcr/register/s6BhdRkqt3',
    ],
  ]);

  itMapsForbiddenAndNotFound('getClientRegistration', (fetcher) =>
    getClientRegistration({baseUrl, clientId: 'c-1', fetcher}),
  );

  it('maps the registration, including its one-time client secret, to camelCase', async () => {
    const registration = await registerClient({
      baseUrl,
      fetcher: createFetcher(wireRegistration, 201),
      payload: {redirectUris: ['https://myapp.example.com/callback']},
    });

    expect(registration).toEqual({
      appId: 'app-1',
      clientId: 's6BhdRkqt3',
      clientName: 'My App',
      clientSecret: secret,
      clientSecretExpiresAt: 0,
      grantTypes: ['authorization_code', 'refresh_token'],
      jwks: {keys: [{kid: 'k1', use: 'sig'}]},
      redirectUris: ['https://myapp.example.com/callback'],
      requirePushedAuthorizationRequests: true,
      tokenEndpointAuthMethod: 'client_secret_basic',
    });
  });

  it('sets client_id from the argument, over any value in the payload', async () => {
    const fetcher: FetcherMock = createFetcher(wireRegistration);

    await updateClientRegistration({
      baseUrl,
      clientId: 's6BhdRkqt3',
      fetcher,
      payload: {clientId: 'other', redirectUris: ['https://a/cb']} as never,
    });

    expect(requests(fetcher)[0].body).toEqual({client_id: 's6BhdRkqt3', redirect_uris: ['https://a/cb']});
  });

  it('carries an OAuth error as the server error, keeping the HTTP status', async () => {
    const error: unknown = await registerClient({
      baseUrl,
      fetcher: createFetcher({error: 'invalid_redirect_uri', error_description: 'The redirect URI is invalid.'}, 400),
      payload: {redirectUris: ['not-a-uri']},
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ThunderIDAPIError);
    expect(error).toMatchObject({
      code: 'registerClient-ResponseError-001',
      message: 'Failed to register client: The redirect URI is invalid.',
      serverError: {code: 'invalid_redirect_uri', message: {defaultValue: 'The redirect URI is invalid.'}},
      statusCode: 400,
    });
  });

  it.each<[number, string]>([
    [401, 'ResponseError'],
    [403, 'ForbiddenError'],
    [404, 'NotFoundError'],
  ])('maps an OAuth error with HTTP %i to %s', async (status: number, kind: string) => {
    const error: unknown = await deleteClientRegistration({
      baseUrl,
      clientId: 'c-1',
      fetcher: createFetcher({error: 'invalid_client'}, status),
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: `deleteClientRegistration-${kind}-001`,
      message: 'Failed to delete client registration: invalid_client',
      serverError: {code: 'invalid_client'},
      statusCode: status,
    });
  });

  it('keeps the client secret out of the URL and out of a failed update error', async () => {
    const fetcher: FetcherMock = createFetcher({error: 'invalid_client_metadata'}, 400);

    const error: unknown = await updateClientRegistration({
      baseUrl,
      clientId: 's6BhdRkqt3',
      fetcher,
      payload: {clientSecret: secret, redirectUris: ['https://a/cb']},
    }).catch((caught: unknown) => caught);

    // The current secret goes in the body for the server to check, and nowhere else.
    expect(requests(fetcher)[0].body).toEqual(
      expect.objectContaining({client_id: 's6BhdRkqt3', client_secret: secret}),
    );
    expect(requests(fetcher)[0].url).not.toContain(secret);
    expect(String(error)).not.toContain(secret);
    expect(JSON.stringify(error)).not.toContain(secret);
  });

  it('uses the clientRegistrations endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher(wireRegistration);

    await getClientRegistration({
      baseUrl,
      clientId: 's6BhdRkqt3',
      fetcher,
      url: 'https://as.example.com/oauth2/dcr/register',
    });

    expect(requests(fetcher)[0].url).toBe('https://as.example.com/oauth2/dcr/register/s6BhdRkqt3');
  });
});

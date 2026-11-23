// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent} from '../../models/agent-resource';
import {
  PersonalAgentFormValues,
  getPersonalAgentOAuthConfig,
  isPersonalAgentFormValid,
  toPersonalAgentFormValues,
  toUpdateMeAgentRequest,
} from '../personalAgentForm';

const agent: Agent = {
  attributes: {name: 'Spending assistant', software: 'assistant-x', tags: ['finance']},
  description: 'Answers questions about my spending',
  id: 'a-1',
  inboundAuthConfig: [
    {
      config: {
        grantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: ['https://a.example.com/cb', 'https://b.example.com/cb'],
        responseTypes: ['code'],
      },
      type: 'oauth2',
    },
  ],
  kind: 'personal-assistant',
  ouId: 'ou-1',
  type: 'default',
};

const values: PersonalAgentFormValues = {
  attributes: {software: 'assistant-x'},
  description: 'Answers questions about my spending',
  grantTypes: ['authorization_code'],
  name: 'Spending assistant',
  redirectUris: 'https://a.example.com/cb',
};

describe('getPersonalAgentOAuthConfig', () => {
  it('should return the OAuth settings of an agent with an OAuth client', () => {
    expect(getPersonalAgentOAuthConfig(agent)?.grantTypes).toEqual(['authorization_code', 'refresh_token']);
  });

  it('should return undefined for an agent with no OAuth client', () => {
    expect(getPersonalAgentOAuthConfig({...agent, inboundAuthConfig: undefined})).toBeUndefined();
  });
});

describe('toPersonalAgentFormValues', () => {
  it('should start from what the server holds, editing only text attributes other than the name', () => {
    expect(toPersonalAgentFormValues(agent)).toEqual({
      attributes: {software: 'assistant-x'},
      description: 'Answers questions about my spending',
      grantTypes: ['authorization_code', 'refresh_token'],
      name: 'Spending assistant',
      redirectUris: 'https://a.example.com/cb https://b.example.com/cb',
    });
  });

  it('should start empty for an agent with no attributes, description or OAuth client', () => {
    expect(
      toPersonalAgentFormValues({
        ...agent,
        attributes: undefined,
        description: undefined,
        inboundAuthConfig: undefined,
      }),
    ).toEqual({attributes: {}, description: '', grantTypes: [], name: '', redirectUris: ''});
  });
});

describe('toUpdateMeAgentRequest', () => {
  it('should send back the attributes the form does not edit, and trim the text', () => {
    expect(
      toUpdateMeAgentRequest(agent, {
        ...values,
        attributes: {software: 'assistant-y'},
        description: ' Budgets ',
        name: ' Budget assistant ',
        redirectUris: ' https://a.example.com/cb\nhttps://c.example.com/cb ',
      }),
    ).toEqual({
      attributes: {name: 'Budget assistant', software: 'assistant-y', tags: ['finance']},
      description: 'Budgets',
      grantTypes: ['authorization_code'],
      redirectUris: ['https://a.example.com/cb', 'https://c.example.com/cb'],
    });
  });

  it('should keep a redirect URI that holds a comma through the form', () => {
    const withComma: Agent = {
      ...agent,
      inboundAuthConfig: [
        {
          config: {
            grantTypes: ['authorization_code'],
            redirectUris: ['https://a.example.com/cb?pair=a,b', 'https://b.example.com/cb'],
          },
          type: 'oauth2',
        },
      ],
    };

    expect(toUpdateMeAgentRequest(withComma, toPersonalAgentFormValues(withComma)).redirectUris).toEqual([
      'https://a.example.com/cb?pair=a,b',
      'https://b.example.com/cb',
    ]);
  });
});

describe('isPersonalAgentFormValid', () => {
  it('should accept a name with the authorization code grant and a redirect URI', () => {
    expect(isPersonalAgentFormValid(values)).toBe(true);
  });

  it('should refuse a blank name', () => {
    expect(isPersonalAgentFormValid({...values, name: '  '})).toBe(false);
  });

  it('should refuse the authorization code grant without a redirect URI', () => {
    expect(isPersonalAgentFormValid({...values, redirectUris: ''})).toBe(false);
  });

  it('should accept no redirect URI without the authorization code grant', () => {
    expect(isPersonalAgentFormValid({...values, grantTypes: ['ciba'], redirectUris: ''})).toBe(true);
  });
});

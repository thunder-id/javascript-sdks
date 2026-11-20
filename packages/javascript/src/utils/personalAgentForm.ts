// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent, UpdateMeAgentRequest} from '../models/agent-resource';
import {OAuth2Config, OAuth2GrantTypes} from '../models/application';

const splitRedirectUris = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/**
 * The values of the personal agent edit form. `redirectUris` is the text of the field, URIs separated by
 * whitespace. A URI may hold a comma but never unencoded whitespace, so whitespace is the only separator.
 */
export interface PersonalAgentFormValues {
  /**
   * The agent's text attributes other than `name`, keyed by attribute name. Attributes that hold another kind
   * of value are not edited, and are sent back unchanged.
   */
  attributes: Record<string, string>;
  description: string;
  grantTypes: string[];
  name: string;
  redirectUris: string;
}

/**
 * The OAuth settings of an agent, if it has an OAuth client.
 *
 * @param agent - The agent.
 * @returns Its OAuth settings.
 */
export const getPersonalAgentOAuthConfig = (agent: Agent): OAuth2Config | undefined =>
  agent.inboundAuthConfig?.find((config: {type: string}) => config.type === 'oauth2')?.config;

/**
 * The form values that edit an agent, starting from what the server holds.
 *
 * @param agent - The agent to edit.
 * @returns The initial form values.
 */
export const toPersonalAgentFormValues = (agent: Agent): PersonalAgentFormValues => {
  const oauth: OAuth2Config | undefined = getPersonalAgentOAuthConfig(agent);
  const name: unknown = agent.attributes?.['name'];

  return {
    attributes: Object.fromEntries(
      Object.entries(agent.attributes ?? {}).filter(
        (entry: [string, unknown]): entry is [string, string] => entry[0] !== 'name' && typeof entry[1] === 'string',
      ),
    ),
    description: agent.description ?? '',
    grantTypes: oauth?.grantTypes ?? [],
    name: typeof name === 'string' ? name : '',
    redirectUris: (oauth?.redirectUris ?? []).join(' '),
  };
};

/**
 * The update request for an agent's edit form. Attributes the form does not edit are sent back unchanged,
 * since an update replaces them all.
 *
 * @param agent - The agent being edited.
 * @param values - The edited form values.
 * @returns The request for `updateMeAgent`.
 */
export const toUpdateMeAgentRequest = (agent: Agent, values: PersonalAgentFormValues): UpdateMeAgentRequest => ({
  attributes: {...agent.attributes, ...values.attributes, name: values.name.trim()},
  description: values.description.trim(),
  grantTypes: values.grantTypes,
  redirectUris: splitRedirectUris(values.redirectUris),
});

/**
 * Whether the edit form can be saved: a name is required, and the authorization code grant needs a
 * redirect URI.
 *
 * @param values - The edited form values.
 * @returns Whether the values are valid.
 */
export const isPersonalAgentFormValid = (values: PersonalAgentFormValues): boolean =>
  values.name.trim().length > 0 &&
  (!values.grantTypes.includes(OAuth2GrantTypes.AUTHORIZATION_CODE) ||
    splitRedirectUris(values.redirectUris).length > 0);

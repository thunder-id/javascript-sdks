// Copyright 2020 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export type AuthorizeRequestUrlParams = Omit<ExtendedAuthorizeRequestUrlParams, 'forceInit'>;

export interface KnownExtendedAuthorizeRequestUrlParams {
  /**
   * RFC 9396 authorization details to request for this sign-in, sent as the JSON-encoded
   * `authorization_details` parameter. Takes precedence over the `authorizationDetails` configuration.
   * @see {@link AuthorizationDetail}
   */
  authorizationDetails?: AuthorizationDetail[];
  fidp?: string;
  forceInit?: boolean;
}

/**
 * An RFC 9396 authorization details object: one fine-grained authorization requirement that a client
 * requests, or that the server reports as granted in a token response. `type` names a type the server
 * knows, and that type defines every other member.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9396}
 *
 * @example
 * {type: 'payment_initiation', actions: ['initiate'], instructedAmount: {currency: 'EUR', amount: '123.50'}}
 */
export interface AuthorizationDetail {
  /**
   * Kinds of actions to take at the resource.
   */
  actions?: string[];

  /**
   * Kinds of data being requested from the resource.
   */
  datatypes?: string[];

  /**
   * Specific resource available at the API.
   */
  identifier?: string;

  /**
   * Locations of the resources or resource servers the details apply to.
   */
  locations?: string[];

  /**
   * Privilege levels at the resource.
   */
  privileges?: string[];

  /**
   * The authorization details type, which determines how the server reads the other members.
   */
  type: string;

  /**
   * Members defined by the authorization details type.
   */
  [member: string]: unknown;
}

/**
 * Value of an extra authorize request parameter. An object or array value, such as RFC 9396
 * `authorization_details`, is sent JSON-encoded.
 */
export type AuthorizeRequestParamValue = string | number | boolean | object;

export type ExtendedAuthorizeRequestUrlParams = KnownExtendedAuthorizeRequestUrlParams &
  Record<string, AuthorizeRequestParamValue>;

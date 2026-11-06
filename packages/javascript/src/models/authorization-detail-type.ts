// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiPaginationLink} from './api';

/**
 * How the server authenticates itself to an authorization details processor: `none`, `bearer`, `basic`
 * or `api_key`, with that method's fields. Stored credential values are returned masked.
 */
export interface AuthorizationDetailProcessorAuthentication {
  properties?: Record<string, string>;
  type: string;
}

/**
 * The endpoint that authorizes and enriches the details of a type.
 */
export interface AuthorizationDetailProcessor {
  authentication?: AuthorizationDetailProcessorAuthentication;
  /**
   * Absolute HTTPS URL of the processor.
   */
  endpoint: string;
}

/**
 * A registered RFC 9396 authorization details type, as the management API returns it.
 */
export interface AuthorizationDetailType {
  consentTemplate?: string;
  description?: string;
  /**
   * Identifier used in management API paths.
   */
  id: string;
  /**
   * Whether the type is declared in configuration, so it cannot be updated or deleted through the API.
   */
  isReadOnly: boolean;
  name: string;
  processor?: AuthorizationDetailProcessor;
  /**
   * Whether an earlier approval may stand in for the consent prompt.
   */
  reuse: boolean;
  /**
   * The JSON Schema 2020-12 every requested detail of the type must conform to.
   */
  schema: Record<string, unknown>;
  /**
   * The RFC 9396 `type` value clients send in `authorization_details`.
   */
  type: string;
  version: number;
}

/**
 * A page of authorization details types.
 */
export interface AuthorizationDetailTypeListResponse {
  count: number;
  links?: ApiPaginationLink[];
  startIndex: number;
  totalResults: number;
  types: AuthorizationDetailType[];
}

/**
 * The payload used to create or update an authorization details type. `type` cannot change after
 * creation.
 */
export interface AuthorizationDetailTypeRequest {
  consentTemplate?: string;
  description?: string;
  name: string;
  processor?: AuthorizationDetailProcessor;
  reuse?: boolean;
  schema: Record<string, unknown>;
  type: string;
}

/**
 * A change a client may make to a granted detail at the token endpoint.
 */
export interface SupportedAuthorizationDetailsTypeModification {
  /**
   * The dot-separated path of the field.
   */
  field: string;
  modification: 'decrease' | 'increase' | 'removeItems' | 'addItems';
}

/**
 * The public request view of an authorization details type: the fields a client may send and the
 * changes it may make to a granted detail. Processor, consent and reuse settings are never included.
 */
export interface SupportedAuthorizationDetailsType {
  description?: string;
  modifications: SupportedAuthorizationDetailsTypeModification[];
  name: string;
  schema: Record<string, unknown>;
  type: string;
  version: number;
}

/**
 * Every authorization details type a client may request.
 */
export interface SupportedAuthorizationDetailsTypesResponse {
  types: SupportedAuthorizationDetailsType[];
}

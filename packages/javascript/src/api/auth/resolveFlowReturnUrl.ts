// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowMetadataResponse, FlowMetaType} from '../../models/flow-meta';
import logger from '../../utils/logger';

/**
 * Where a sign-in page sends the user when its flow can't continue.
 *
 * @experimental This API may change in future versions
 */
export interface FlowReturnTarget {
  /** Name of the application the user came from, when known. */
  applicationName?: string;
  /** The application URL, else the server's default return URL. Undefined when there is neither. */
  url?: string;
}

/**
 * Configuration for {@link resolveFlowReturnUrl}.
 *
 * @experimental This API may change in future versions
 */
export interface ResolveFlowReturnUrlConfig {
  /** URL of the sign-in page, so a return URL pointing back to it is dropped. */
  currentUrl: string;
  /** Fetches flow metadata for a query. Resolves to `null` when there is none. */
  fetchMeta: (query: {id?: string; type?: FlowMetaType}) => Promise<FlowMetadataResponse | null>;
  /** Flow metadata already loaded for the page, if any. */
  meta?: FlowMetadataResponse | null;
  /** The `ref` query parameter of the sign-in page URL, if any. */
  ref?: string | null;
}

/**
 * Keeps a candidate return URL when it is an `http` or `https` URL that does not point back to the sign-in page
 * itself, which would redirect in a loop.
 */
const toReturnUrl = (candidate: string | undefined, currentUrl: string): string | undefined => {
  if (!candidate) {
    return undefined;
  }
  try {
    const target: URL = new URL(candidate, currentUrl);
    const current: URL = new URL(currentUrl);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return undefined;
    }
    return target.origin === current.origin && target.pathname === current.pathname ? undefined : candidate;
  } catch {
    return undefined;
  }
};

/**
 * Resolves where a sign-in page sends the user when its flow can't continue, such as a bookmarked or shared URL
 * opened later. The application URL comes first, from the loaded metadata or from the `ref` URL parameter, then
 * the server's default return URL. A lookup that fails counts as no answer, so this never rejects.
 *
 * @param config - The page URL, a metadata fetcher, the metadata already loaded and the `ref` parameter.
 * @returns The return target, with `url` undefined when there is nowhere to go.
 *
 * @experimental This API may change in future versions
 */
const resolveFlowReturnUrl = async ({
  currentUrl,
  fetchMeta,
  meta = null,
  ref = null,
}: ResolveFlowReturnUrlConfig): Promise<FlowReturnTarget> => {
  const load = async (query: {id?: string; type?: FlowMetaType}): Promise<FlowMetadataResponse | null> => {
    try {
      return await fetchMeta(query);
    } catch (error) {
      logger.warn('Could not load flow metadata to find where to send the user back to.', error);
      return null;
    }
  };

  let application: FlowMetadataResponse['application'] = meta?.application;
  let defaultReturnUrl: string | undefined = meta?.defaultReturnUrl;

  if (!application?.url && ref) {
    const refMeta: FlowMetadataResponse | null = await load({id: ref, type: FlowMetaType.Ref});
    application = refMeta?.application ?? application;
    defaultReturnUrl = defaultReturnUrl ?? refMeta?.defaultReturnUrl;
  }

  // Loaded metadata carries the default return URL whenever the server sets one, so only fetch it when none was given.
  if (!application?.url && !defaultReturnUrl && !meta) {
    defaultReturnUrl = (await load({}))?.defaultReturnUrl;
  }

  return {
    applicationName: application?.name,
    url: toReturnUrl(application?.url, currentUrl) ?? toReturnUrl(defaultReturnUrl, currentUrl),
  };
};

export default resolveFlowReturnUrl;

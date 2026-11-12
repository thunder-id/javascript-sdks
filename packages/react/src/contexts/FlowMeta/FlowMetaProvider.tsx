// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  FlowMetadataResponse,
  FlowMetaType,
  getFlowMeta,
  I18nBundle,
  isFlowMetaUnavailableError,
  resolveResourceEndpoint,
  TranslationBundleConstants,
} from '@thunderid/browser';
import {FC, PropsWithChildren, ReactElement, RefObject, useCallback, useEffect, useRef, useState} from 'react';
import FlowMetaContext from './FlowMetaContext';
import {I18nContextValue} from '../I18n/I18nContext';
import useI18n from '../I18n/useI18n';
import useThunderID from '../ThunderID/useThunderID';

export interface FlowMetaProviderProps {
  /**
   * When false the provider skips fetching and provides null meta.
   * @default true
   */
  enabled?: boolean;

  /**
   * Overrides how flow metadata is fetched, routing the request through a caller-supplied
   * function (e.g. a Next.js Server Action) instead of the provider's default direct
   * browser-to-`baseUrl` `fetch()`. Use this when the ThunderID server's `baseUrl` is a
   * different origin than the app and CORS isn't (or can't be) configured for it — the
   * override runs server-side, so the browser never talks to `baseUrl` directly.
   *
   * Called for both the initial fetch and `switchLanguage()`. Resolve to `null` when the server has
   * no flow metadata, so the provider falls back to the defaults without reporting an error.
   */
  fetchMeta?: (params: {applicationId?: string; language?: string}) => Promise<FlowMetadataResponse | null>;

  /**
   * Flow metadata resolved ahead of time (e.g. fetched server-side during SSR) and used to seed
   * the provider's state. When present, the provider skips its own initial client-side fetch —
   * avoiding a redundant request and the flash of untranslated i18n keys while that fetch is in
   * flight — but still fetches normally on subsequent changes (e.g. an explicit language switch).
   */
  initialMeta?: FlowMetadataResponse | null;

  /** Sent as the flow-meta request's `namespace`, e.g. to scope namespace-keyed i18n data. */
  namespace?: string;
}

/**
 * FlowMetaProvider fetches flow metadata from the `GET /flow/meta` endpoint
 * (v2 API) and makes it available to child components through `FlowMetaContext`.
 *
 * It is designed to be used in v2 embedded-flow scenarios and integrates with
 * `ThemeProvider` so that theme settings (colors, direction, typography, …)
 * from the server-side design configuration are applied automatically.
 *
 * @example
 * ```tsx
 * <FlowMetaProvider
 *   config={{
 *     baseUrl: 'https://localhost:8090',
 *     type: FlowMetaType.App,
 *     id: 'your-app-id',
 *   }}
 * >
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 * </FlowMetaProvider>
 * ```
 */
const FlowMetaProvider: FC<PropsWithChildren<FlowMetaProviderProps>> = ({
  children,
  enabled = true,
  fetchMeta,
  initialMeta = null,
  namespace,
}: PropsWithChildren<FlowMetaProviderProps>): ReactElement => {
  const {baseUrl, endpoints, applicationId, isInitialized} = useThunderID();
  const i18nContext: I18nContextValue = useI18n();

  const [meta, setMeta] = useState<FlowMetadataResponse | null>(initialMeta);
  const [isLoading, setIsLoading] = useState<boolean>(!initialMeta);
  const [error, setError] = useState<Error | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

  // Loads the metadata for a language. A server without a flow metadata endpoint, such as an OpenID
  // Connect provider other than ThunderID, yields `null` rather than an error, so the components
  // fall back to their defaults. Any other failure still rejects and is reported through `error`.
  const loadMeta: (language?: string) => Promise<FlowMetadataResponse | null> = useCallback(
    async (language?: string): Promise<FlowMetadataResponse | null> => {
      try {
        if (fetchMeta) {
          return (await fetchMeta({applicationId, language})) ?? null;
        }

        return await getFlowMeta({
          baseUrl,
          url: resolveResourceEndpoint('flowMeta', {endpoints}),
          ...(applicationId ? {id: applicationId, type: FlowMetaType.App} : {}),
          ...(namespace ? {namespace} : {}),
          language,
        });
      } catch (err: unknown) {
        if (isFlowMetaUnavailableError(err)) {
          return null;
        }

        throw err;
      }
    },
    [baseUrl, endpoints, applicationId, fetchMeta, namespace],
  );

  // The last request the initial-fetch effect dispatched, as a key of everything that shapes it.
  // `fetchFlowMeta` is recreated whenever a dependency changes identity, and several do while
  // ThunderID initializes (`isInitialized` flips, `endpoints` is replaced with the resolved
  // configuration) without changing the request. Keying on the request skips those repeats, and
  // the StrictMode re-mount, so only a real change (e.g. a language switch) fetches again.
  const lastRequestKeyRef: RefObject<string | null> = useRef<string | null>(null);
  const initialMetaConsumedRef: RefObject<boolean> = useRef(false);
  const fetchFlowMeta: () => Promise<void> = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setMeta(null);
      setIsLoading(false);
      return;
    }

    // Defer until ThunderID finishes initializing (e.g. loading applicationId
    // from storage on refresh). Once initialized, proceed even if applicationId
    // is absent — some flows (e.g. AcceptInvite) have no applicationId by design.
    if (!isInitialized && !applicationId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result: FlowMetadataResponse | null = await loadMeta(i18nContext?.currentLanguage);
      setMeta(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, applicationId, isInitialized, i18nContext?.currentLanguage, loadMeta]);

  const fetchMetaRef: RefObject<FlowMetaProviderProps['fetchMeta'] | null> = useRef(fetchMeta);
  const fetchMetaVersionRef: RefObject<number> = useRef(0);
  if (fetchMetaRef.current !== fetchMeta) {
    fetchMetaRef.current = fetchMeta;
    fetchMetaVersionRef.current += 1;
  }

  // Null while the fetch would be skipped, so the request that follows initialization still runs.
  const requestKey: string | null =
    enabled && !isInitialized && !applicationId
      ? null
      : JSON.stringify([
          enabled,
          enabled && !fetchMeta ? baseUrl : null,
          enabled && !fetchMeta ? resolveResourceEndpoint('flowMeta', {endpoints}) : null,
          applicationId ?? null,
          namespace ?? null,
          i18nContext?.currentLanguage ?? null,
          fetchMetaVersionRef.current,
        ]);

  const switchLanguage: (language: string) => Promise<void> = useCallback(
    async (language: string): Promise<void> => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        const result: FlowMetadataResponse | null = await loadMeta(language);

        // Inject translations for the new language before switching
        if (result?.i18n?.translations && i18nContext?.injectBundles) {
          const flatTranslations: Record<string, string> = {};
          Object.entries(result.i18n.translations).forEach(([namespace, keys]: [string, Record<string, string>]) => {
            Object.entries(keys).forEach(([key, value]: [string, string]) => {
              flatTranslations[`${namespace}.${key}`] = value;
            });
          });
          const bundle: I18nBundle = {translations: flatTranslations} as unknown as I18nBundle;
          i18nContext.injectBundles({[language]: bundle});
        }

        // Defer setLanguage to the next effect cycle so injectBundles state
        // is committed before I18nProvider's setLanguage checks mergedBundles.
        setPendingLanguage(language);
        setMeta(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, i18nContext, loadMeta],
  );

  // After injectBundles + setPendingLanguage are batched and committed, this
  // effect fires with the updated i18nContext (mergedBundles now includes the
  // new language), so setLanguage succeeds on the first switch.
  useEffect(() => {
    if (pendingLanguage && i18nContext?.setLanguage) {
      i18nContext.setLanguage(pendingLanguage);
      setPendingLanguage(null);
    }
  }, [pendingLanguage, i18nContext?.setLanguage]);

  useEffect(() => {
    if (requestKey === null) {
      return;
    }

    if (!initialMetaConsumedRef.current) {
      initialMetaConsumedRef.current = true;

      if (initialMeta) {
        // Seeded from SSR (or another caller) — skip the redundant first client-side fetch.
        // Later changes to the request (e.g. an explicit language switch) still fetch normally.
        lastRequestKeyRef.current = requestKey;
        return;
      }
    }

    if (lastRequestKeyRef.current === requestKey) {
      return;
    }

    lastRequestKeyRef.current = requestKey;
    fetchFlowMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // When meta loads with i18n translations, inject them into the i18n system.
  // Meta translations act as the base layer — prop-provided bundles still take precedence.
  useEffect(() => {
    if (!meta?.i18n?.translations || !i18nContext?.injectBundles) {
      return;
    }

    const metaLanguage: string = meta.i18n.language || TranslationBundleConstants.FALLBACK_LOCALE;

    // Flatten namespace-keyed translations to dot-path keys:
    // { "signin": { "heading": "Sign In" } } → { "signin.heading": "Sign In" }
    const flatTranslations: Record<string, string> = {};
    Object.entries(meta.i18n.translations).forEach(([namespace, keys]: [string, Record<string, string>]) => {
      Object.entries(keys).forEach(([key, value]: [string, string]) => {
        flatTranslations[`${namespace}.${key}`] = value;
      });
    });

    const bundle: I18nBundle = {translations: flatTranslations} as unknown as I18nBundle;

    // Inject under the meta language code and the i18n current language so
    // lookups succeed regardless of whether the system uses "en" or "en-US".
    const bundlesToInject: Record<string, I18nBundle> = {[metaLanguage]: bundle};
    if (i18nContext.currentLanguage && i18nContext.currentLanguage !== metaLanguage) {
      bundlesToInject[i18nContext.currentLanguage] = bundle;
    }
    if (i18nContext.fallbackLanguage && i18nContext.fallbackLanguage !== metaLanguage) {
      bundlesToInject[i18nContext.fallbackLanguage] = bundle;
    }

    i18nContext.injectBundles(bundlesToInject);
  }, [meta?.i18n?.translations, i18nContext?.injectBundles]);

  const value: any = {
    error,
    fetchFlowMeta,
    isLoading,
    meta,
    switchLanguage,
  };

  return <FlowMetaContext.Provider value={value}>{children}</FlowMetaContext.Provider>;
};

export default FlowMetaProvider;

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
import {
  defineComponent,
  h,
  inject,
  onMounted,
  provide,
  readonly,
  shallowReadonly,
  ref,
  watch,
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
} from 'vue';
import {THUNDERID_KEY, FLOW_META_KEY, I18N_KEY} from '../keys';
import type {ThunderIDContext, FlowMetaContextValue, I18nContextValue} from '../models/contexts';

/**
 * FlowMetaProvider fetches flow metadata from the `GET /flow/meta` endpoint
 * (v2 API) and makes it available via `useFlowMeta()`.
 *
 * It also integrates with `I18nProvider` so that server-side translations
 * from the metadata are automatically injected into the i18n system.
 *
 * @internal — This provider is mounted automatically by `<ThunderIDProvider>`.
 */
interface FlowMetaProviderProps {
  enabled: boolean;
  fetchMeta?: (params: {applicationId?: string; language?: string}) => Promise<FlowMetadataResponse | null>;
  initialMeta?: FlowMetadataResponse | null;
}

const FlowMetaProvider: Component = defineComponent({
  name: 'FlowMetaProvider',
  props: {
    /**
     * When false the provider skips fetching and provides null meta.
     * @default true
     */
    enabled: {default: true, type: Boolean},
    /**
     * Overrides how flow metadata is fetched, routing the request through a caller-supplied
     * function (e.g. a Nuxt server route called via `$fetch`) instead of this provider's default
     * direct browser-to-`baseUrl` `fetch()`. Use this when the ThunderID server's `baseUrl` is a
     * different origin than the app and CORS isn't (or can't be) configured for it — the override
     * runs server-side, so the browser never talks to `baseUrl` directly.
     *
     * Called for both the initial fetch and `switchLanguage()`. Resolve to `null` when the server has
     * no flow metadata, so the provider falls back to the defaults without reporting an error.
     */
    fetchMeta: {default: undefined, type: Function as PropType<FlowMetaProviderProps['fetchMeta']>},
    /**
     * Flow metadata resolved ahead of time (e.g. fetched server-side during SSR) and used to seed
     * this provider's state. When present, the provider skips its own initial client-side fetch —
     * avoiding a redundant request and the flash of untranslated i18n keys while that fetch is in
     * flight — but still fetches normally on subsequent changes (e.g. an explicit language switch).
     */
    initialMeta: {default: null, type: Object as PropType<FlowMetadataResponse | null>},
  },
  setup(props: FlowMetaProviderProps, {slots}: SetupContext): () => VNode {
    const thunderIDContext: ThunderIDContext | undefined = inject(THUNDERID_KEY);
    const i18nContext: I18nContextValue | null = inject(I18N_KEY, null);

    const meta: Ref<FlowMetadataResponse | null> = ref(props.initialMeta ?? null);
    const isLoading: Ref<boolean> = ref(false);
    const error: Ref<Error | null> = ref(null);
    const pendingLanguage: Ref<string | null> = ref(null);

    const baseUrl: string | undefined = thunderIDContext?.baseUrl;
    const applicationId: string | undefined = thunderIDContext?.applicationId;
    const flowMetaUrl: string | undefined = resolveResourceEndpoint('flowMeta', {
      endpoints: thunderIDContext?.endpoints,
    });

    // Loads the metadata for a language. A server without a flow metadata endpoint, such as an OpenID
    // Connect provider other than ThunderID, yields `null` rather than an error, so the components
    // fall back to their defaults. Any other failure still rejects and is reported through `error`.
    const loadMeta = async (language?: string): Promise<FlowMetadataResponse | null> => {
      try {
        if (props.fetchMeta) {
          return (await props.fetchMeta({applicationId, ...(language ? {language} : {})})) ?? null;
        }

        return await getFlowMeta({
          baseUrl,
          url: flowMetaUrl,
          ...(applicationId ? {id: applicationId, type: FlowMetaType.App} : {}),
          ...(language ? {language} : {}),
        });
      } catch (err: unknown) {
        if (isFlowMetaUnavailableError(err)) {
          return null;
        }

        throw err;
      }
    };

    const fetchFlowMeta = async (): Promise<void> => {
      if (!props.enabled) {
        meta.value = null;
        return;
      }

      isLoading.value = true;
      error.value = null;

      try {
        meta.value = await loadMeta();
      } catch (err: unknown) {
        error.value = err instanceof Error ? err : new Error(String(err));
      } finally {
        isLoading.value = false;
      }
    };

    const switchLanguage = async (language: string): Promise<void> => {
      if (!props.enabled) return;

      isLoading.value = true;
      error.value = null;

      try {
        const result: FlowMetadataResponse | null = await loadMeta(language);

        // Inject translations before switching language so the i18n state is updated
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

        // Defer setLanguage so that injectBundles' state is committed first
        pendingLanguage.value = language;
        meta.value = result;
      } catch (err: unknown) {
        error.value = err instanceof Error ? err : new Error(String(err));
      } finally {
        isLoading.value = false;
      }
    };

    // After injectBundles + pendingLanguage are committed, call setLanguage
    watch(pendingLanguage, (lang: string | null) => {
      if (lang && i18nContext?.setLanguage) {
        i18nContext.setLanguage(lang);
        pendingLanguage.value = null;
      }
    });

    // When meta loads with i18n translations, inject them into the i18n system
    watch(
      () => meta.value?.i18n?.translations,
      (translations: Record<string, Record<string, string>> | undefined) => {
        if (!translations || !i18nContext?.injectBundles) return;

        const metaLanguage: string = (meta.value?.i18n as any)?.language || TranslationBundleConstants.FALLBACK_LOCALE;

        const flatTranslations: Record<string, string> = {};
        Object.entries(translations).forEach(([namespace, keys]: [string, Record<string, string>]) => {
          Object.entries(keys).forEach(([key, value]: [string, string]) => {
            flatTranslations[`${namespace}.${key}`] = value;
          });
        });

        const bundle: I18nBundle = {translations: flatTranslations} as unknown as I18nBundle;
        const bundlesToInject: Record<string, I18nBundle> = {[metaLanguage]: bundle};

        const currentLang: string = i18nContext.currentLanguage.value;
        const fallbackLang: string = i18nContext.fallbackLanguage;

        if (currentLang && currentLang !== metaLanguage) {
          bundlesToInject[currentLang] = bundle;
        }
        if (fallbackLang && fallbackLang !== metaLanguage) {
          bundlesToInject[fallbackLang] = bundle;
        }

        i18nContext.injectBundles(bundlesToInject);
      },
    );

    onMounted(() => {
      // Seeded from SSR (or another caller) — skip the redundant first client-side fetch.
      if (props.initialMeta) return;
      fetchFlowMeta();
    });

    const context: FlowMetaContextValue = {
      error: readonly(error),
      fetchFlowMeta,
      isLoading: readonly(isLoading),
      meta: shallowReadonly(meta),
      switchLanguage,
    };

    provide(FLOW_META_KEY, context);

    return () => h('div', {style: 'display:contents'}, slots['default']?.());
  },
});

export default FlowMetaProvider;

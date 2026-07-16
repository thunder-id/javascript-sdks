<script lang="ts">
  import {onMount} from 'svelte';
  import {getLogger} from '../../logger/LoggerAdapter';
  import {useThunderID} from '../../composables/useThunderID';
  import {emit, SDKEvent} from '../../events/EventBus';

  interface Props {
    callbackUrl?: string;
    afterSignInUrl?: string;
    children?: import('svelte').Snippet;
    errorComponent?: import('svelte').Snippet<[{error: string}]>;
    loadingComponent?: import('svelte').Snippet;
  }

  let {
    callbackUrl = '/api/auth/callback',
    afterSignInUrl = '/',
    children,
    errorComponent,
    loadingComponent,
  }: Props = $props();

  const tid = useThunderID();

  let status: 'loading' | 'success' | 'error' = $state('loading');
  let error: string | null = $state(null);

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');
    const logger = getLogger();

    if (errorParam) {
      status = 'error';
      error = errorParam;
      logger.error(`OAuth callback received error: ${errorParam}`);
      emit(SDKEvent.SIGN_IN_FAILED, {error: errorParam});
      return;
    }

    if (!code) {
      status = 'error';
      error = tid.t('callback.noCode');
      emit(SDKEvent.SIGN_IN_FAILED, {error});
      return;
    }

    const currentUrl = new URL(window.location.href);
    const nonce: string = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('thunderid-nonce') || '' : '';
    const nonceParam: string = nonce ? `&nonce=${encodeURIComponent(nonce)}` : '';
    const forwardUrl = `${callbackUrl}${currentUrl.search}${nonceParam}`;
    if (nonce && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('thunderid-nonce');
    }

    try {
      const res = await fetch(forwardUrl, {method: 'GET', redirect: 'manual'});

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('Location') || afterSignInUrl;
        status = 'success';

        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = location;
          }, 500);
        }
        return;
      }

      if (res.ok) {
        status = 'success';
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = afterSignInUrl;
          }, 500);
        }
        return;
      }

      const body = await res.text();
      status = 'error';
      error = body || `Server returned ${res.status}`;
      logger.error(`Callback request failed: ${res.status}`, undefined, {statusCode: res.status});
      emit(SDKEvent.SIGN_IN_FAILED, {error, statusCode: res.status});
    } catch (err: unknown) {
      status = 'error';
      error = (err as any)?.message ?? String(err);
      logger.error('Callback request threw an error', err instanceof Error ? err : new Error(String(err)));
      emit(SDKEvent.SIGN_IN_FAILED, {error: (err as any)?.message ?? String(err)});
    }
  });
</script>

{#if status === 'loading'}
  <div role="status" aria-live="polite">
    {#if loadingComponent}
      {@render loadingComponent()}
    {:else if children}
      {@render children()}
    {:else}
      {tid.t('callback.signingIn')}
    {/if}
  </div>
{:else if status === 'error'}
  <div role="alert" aria-live="assertive">
    {#if errorComponent}
      {@render errorComponent({error: error ?? ''})}
    {:else}
      {tid.t('callback.signInFailed', {error: error ?? ''})}
    {/if}
  </div>
{:else if status === 'success'}
  <div role="status" aria-live="polite">
    {#if children}
      {@render children()}
    {:else}
      {tid.t('callback.signedIn')}
    {/if}
  </div>
{/if}

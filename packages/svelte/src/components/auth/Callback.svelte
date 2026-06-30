<script lang="ts">
  import {onMount} from 'svelte';
  import {getLogger} from '../../logger/LoggerAdapter';

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
      return;
    }

    if (!code) {
      status = 'error';
      error = 'No authorization code received.';
      return;
    }

    const currentUrl = new URL(window.location.href);
    const forwardUrl = `${callbackUrl}${currentUrl.search}`;

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
    } catch (err: unknown) {
      status = 'error';
      error = (err as any)?.message ?? String(err);
      logger.error('Callback request threw an error', err instanceof Error ? err : new Error(String(err)));
    }
  });
</script>

{#if status === 'loading'}
  {#if loadingComponent}
    {@render loadingComponent()}
  {:else if children}
    {@render children()}
  {:else}
    <div>Signing you in...</div>
  {/if}
{:else if status === 'error'}
  {#if errorComponent}
    {@render errorComponent({error: error ?? ''})}
  {:else}
    <div>Sign-in failed: {error}</div>
  {/if}
{:else if status === 'success'}
  {#if children}
    {@render children()}
  {:else}
    <div>Signed in successfully! Redirecting...</div>
  {/if}
{/if}

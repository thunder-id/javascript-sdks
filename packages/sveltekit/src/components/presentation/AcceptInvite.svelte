<script lang="ts">
  import BaseAcceptInvite from './BaseAcceptInvite.svelte';
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children?: import('svelte').Snippet<[{acceptInvite: () => Promise<void>; loading: boolean; error: string | null}]>;
    inviteCode?: string;
  }

  let {children: customChildren, inviteCode = undefined}: Props = $props();

  const tid = useThunderID();
</script>

<BaseAcceptInvite {inviteCode}>
  {#snippet children({acceptInvite, loading, error})}
    {#if customChildren}
      {@render customChildren({acceptInvite, loading, error})}
    {:else}
      <div class="tid-accept-invite">
        <h2 class="tid-accept-invite__title">{tid.t('acceptInvite.title')}</h2>
        {#if error}
          <div class="tid-accept-invite__error" role="alert" aria-live="assertive">{error}</div>
        {/if}
        <button class="tid-accept-invite__button" disabled={loading} onclick={acceptInvite} aria-busy={loading || undefined}>
          {loading ? tid.t('acceptInvite.loading') : tid.t('acceptInvite.button')}
        </button>
      </div>
    {/if}
  {/snippet}
</BaseAcceptInvite>

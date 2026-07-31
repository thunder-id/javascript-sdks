<script lang="ts">
  import BaseInviteUser from './BaseInviteUser.svelte';
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children?: import('svelte').Snippet<[{inviteUser: (email: string) => Promise<void>; loading: boolean; error: string | null}]>;
  }

  let {children: customChildren}: Props = $props();

  const tid = useThunderID();

  let email = $state('');
  let errorId = 'tid-invite-error';
</script>

<BaseInviteUser>
  {#snippet children({inviteUser, loading, error})}
    {#if customChildren}
      {@render customChildren({inviteUser, loading, error})}
    {:else}
      <div class="tid-invite-user">
        <h2 class="tid-invite-user__title">{tid.t('inviteUser.title')}</h2>
        {#if error}
          <div class="tid-invite-user__error" id={errorId} role="alert" aria-live="assertive">{error}</div>
        {/if}
        <input
          class="tid-invite-user__input"
          type="email"
          placeholder={tid.t('inviteUser.emailPlaceholder')}
          bind:value={email}
          disabled={loading}
          aria-label={tid.t('inviteUser.emailPlaceholder')}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error || undefined}
        />
        <button class="tid-invite-user__button" disabled={loading || !email} onclick={() => inviteUser(email)} aria-busy={loading || undefined}>
          {loading ? tid.t('inviteUser.loading') : tid.t('inviteUser.button')}
        </button>
      </div>
    {/if}
  {/snippet}
</BaseInviteUser>

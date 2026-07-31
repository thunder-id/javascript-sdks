<script lang="ts">
  import BaseUserDropdown from './BaseUserDropdown.svelte';

  interface Props {
    children?: import('svelte').Snippet<[
      {user: any | null; isSignedIn: boolean; open: boolean; toggle: () => void; close: () => void; triggerRef: HTMLElement | null; menuRef: HTMLElement | null; triggerId: string; menuId: string; signOut: () => Promise<void>; handleTriggerKeydown: (e: KeyboardEvent) => void; handleMenuKeydown: (e: KeyboardEvent) => void}
    ]>;
  }

  let {children: customChildren}: Props = $props();

  let ddTriggerRef: HTMLElement | null = $state(null);
  let ddMenuRef: HTMLElement | null = $state(null);
  const ddTriggerId = 'tid-dd-trigger';
  const ddMenuId = 'tid-dd-menu';
</script>

<BaseUserDropdown>
  {#snippet children({user, isSignedIn, open, toggle, close, triggerRef, menuRef, triggerId, menuId, signOut, handleTriggerKeydown, handleMenuKeydown})}
    {#if customChildren}
      {@render customChildren({user, isSignedIn, open, toggle, close, triggerRef, menuRef, triggerId, menuId, signOut, handleTriggerKeydown, handleMenuKeydown})}
    {:else if isSignedIn}
      <div class="tid-user-dropdown">
        <button
          bind:this={ddTriggerRef}
          class="tid-user-dropdown__trigger"
          id={ddTriggerId}
          onclick={toggle}
          onkeydown={handleTriggerKeydown}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={ddMenuId}
        >
          {user?.['displayName'] ?? user?.['userName'] ?? 'User'}
        </button>
        {#if open}
          <div
            bind:this={ddMenuRef}
            class="tid-user-dropdown__menu"
            id={ddMenuId}
            role="menu"
            aria-label="User menu"
            tabindex="-1"
            onkeydown={handleMenuKeydown}
          >
            <button class="tid-user-dropdown__item" role="menuitem" onclick={signOut}>Sign Out</button>
          </div>
        {/if}
      </div>
    {/if}
  {/snippet}
</BaseUserDropdown>

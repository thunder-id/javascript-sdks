<script lang="ts">
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children: import('svelte').Snippet<[
      {user: any | null; isSignedIn: boolean; open: boolean; toggle: () => void; close: () => void; triggerRef: HTMLElement | null; menuRef: HTMLElement | null; triggerId: string; menuId: string; signOut: () => Promise<void>; handleTriggerKeydown: (e: KeyboardEvent) => void; handleMenuKeydown: (e: KeyboardEvent) => void}
    ]>;
  }

  let {children}: Props = $props();

  const tid = useThunderID();

  let open = $state(false);
  let triggerRef: HTMLElement | null = $state(null);
  let menuRef: HTMLElement | null = $state(null);
  const triggerId = 'tid-dd-trigger';
  const menuId = 'tid-dd-menu';

  function toggle(): void {
    open = !open;
  }

  function close(): void {
    open = false;
    triggerRef?.focus();
  }

  function handleTriggerKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
      if (!open && menuRef) {
        (menuRef.firstElementChild as HTMLElement)?.focus();
      }
    }
    if (e.key === 'Escape') {
      close();
    }
  }

  function handleMenuKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      close();
    }
  }

  let userData = $derived(tid.user ?? tid.userProfile?.flattenedProfile ?? null);
</script>

{@render children({user: userData, isSignedIn: tid.isSignedIn, open, toggle, close, triggerRef, menuRef, triggerId, menuId, signOut: tid.signOut, handleTriggerKeydown, handleMenuKeydown})}

<script lang="ts">
  interface Props {
    children: import('svelte').Snippet<[{acceptInvite: () => Promise<void>; loading: boolean; error: string | null}]>;
    inviteCode?: string;
  }

  let {children, inviteCode = undefined}: Props = $props();

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function acceptInvite(): Promise<void> {
    loading = true;
    error = null;
    try {
      throw new Error('Accept invite is not yet implemented.');
    } catch (err: unknown) {
      error = (err as any)?.message ?? String(err);
    } finally {
      loading = false;
    }
  }
</script>

{@render children({acceptInvite, loading, error})}

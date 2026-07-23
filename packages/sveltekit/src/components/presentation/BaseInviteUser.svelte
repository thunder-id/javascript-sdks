<script lang="ts">
  interface Props {
    children: import('svelte').Snippet<[{inviteUser: (email: string) => Promise<void>; loading: boolean; error: string | null}]>;
  }

  let {children}: Props = $props();

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function inviteUser(_email: string): Promise<void> {
    loading = true;
    error = null;
    try {
      throw new Error('Invite user is not yet implemented.');
    } catch (err: unknown) {
      error = (err as any)?.message ?? String(err);
    } finally {
      loading = false;
    }
  }
</script>

{@render children({inviteUser, loading, error})}

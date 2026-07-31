<script lang="ts">
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children: import('svelte').Snippet<[{signIn: () => Promise<void>; loading: boolean; error: string | null}]>;
    signInOptions?: Record<string, any>;
  }

  let {children, signInOptions = undefined}: Props = $props();

  const tid = useThunderID();

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleSignIn(): Promise<void> {
    loading = true;
    error = null;
    try {
      await tid.signIn(signInOptions);
    } catch (err: unknown) {
      error = (err as any)?.message ?? String(err);
    } finally {
      loading = false;
    }
  }
</script>

{@render children({signIn: handleSignIn, loading, error})}

<script lang="ts">
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children: import('svelte').Snippet<[{signUp: () => Promise<void>; loading: boolean; error: string | null}]>;
    signUpOptions?: Record<string, unknown>;
  }

  let {children, signUpOptions = undefined}: Props = $props();

  const tid = useThunderID();

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleSignUp(): Promise<void> {
    loading = true;
    error = null;
    try {
      await tid.signUp(signUpOptions);
    } catch (err: unknown) {
      error = (err as any)?.message ?? String(err);
    } finally {
      loading = false;
    }
  }
</script>

{@render children({signUp: handleSignUp, loading, error})}

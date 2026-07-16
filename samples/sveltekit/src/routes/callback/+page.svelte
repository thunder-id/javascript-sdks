<script lang="ts">
	import {Callback} from '@thunderid/sveltekit';
</script>

<h1>Signing you in...</h1>
<Callback callbackUrl="/api/auth/callback" afterSignInUrl="/" />

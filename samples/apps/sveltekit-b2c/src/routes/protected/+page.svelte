<script lang="ts">
	import {SignedIn, SignOutButton, UserProfile} from '@thunderid/sveltekit';

	let {data} = $props();
</script>

<h1>Protected Page</h1>

<SignedIn>
	<UserProfile />

	<p><a href="/">Back to home</a></p>
	<SignOutButton />

	<hr />

	<h3>SSR Session Data</h3>
	<pre style="max-height: 400px; overflow: auto; font-size: 0.75rem;">{JSON.stringify({
		session: {
			sub: data.session?.sub,
			scopes: data.session?.scopes,
			exp: data.session?.exp ? new Date((data.session.exp as number) * 1000).toISOString() : null,
			iat: data.session?.iat ? new Date((data.session.iat as number) * 1000).toISOString() : null,
			sessionId: data.session?.sessionId,
			accessToken: (data.session?.accessToken as string)?.slice(0, 30) + '...',
		},
		user: data.user,
	}, null, 2)}</pre>
</SignedIn>

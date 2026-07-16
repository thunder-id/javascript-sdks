<script lang="ts">
	import {useThunderID, SignedIn, SignedOut, SignInButton, SignOutButton, SignUpButton, Loading, User, UserProfile} from '@thunderid/sveltekit';

	const tid = useThunderID();

	let accessToken: string | null = $state(null);
	let idToken: string | null = $state(null);
	let userInfo: Record<string, unknown> | null = $state(null);

	async function fetchTokens(): Promise<void> {
		accessToken = await tid.getAccessToken();
		idToken = await tid.getIdToken();
	}

	async function fetchUserInfo(): Promise<void> {
		const info = await tid.getUserInfo();
		userInfo = info;
	}

	async function updateProfile(): Promise<void> {
		const name = prompt('Enter new display name:');
		if (name) {
			const result = await tid.updateUserProfile({displayName: name} as any);
			alert(`Profile updated! User: ${JSON.stringify(result, null, 2)}`);
		}
	}

	async function revokeToken(): Promise<void> {
		if (confirm('Revoke access token? You will need to sign in again.')) {
			await tid.revokeAccessToken();
			alert('Token revoked. Sign out to continue.');
		}
	}
</script>

<h1>ThunderID SDK Test App</h1>

<Loading>
	<p>Initializing...</p>
</Loading>

<SignedIn>
	<h2>Welcome!</h2>

	<User />
	<UserProfile />

	<hr />

	<h3>Actions</h3>
	<button onclick={fetchTokens}>Get Tokens</button>
	<button onclick={fetchUserInfo}>Get UserInfo</button>
	<button onclick={updateProfile}>Update Display Name</button>
	<button onclick={revokeToken}>Revoke Access Token</button>
	<SignOutButton />

	{#if accessToken}
		<hr />
		<h3>Access Token</h3>
		<pre style="max-height: 200px; overflow: auto; font-size: 0.75rem;">{accessToken}</pre>
	{/if}

	{#if idToken}
		<hr />
		<h3>ID Token (raw)</h3>
		<pre style="max-height: 200px; overflow: auto; font-size: 0.75rem;">{idToken}</pre>
	{/if}

	{#if userInfo}
		<hr />
		<h3>UserInfo</h3>
		<pre style="max-height: 200px; overflow: auto; font-size: 0.75rem;">{JSON.stringify(userInfo, null, 2)}</pre>
	{/if}

	<hr />
	<h3>Raw user data</h3>
	<pre style="max-height: 300px; overflow: auto; font-size: 0.75rem;">{JSON.stringify(tid.user, null, 2)}</pre>

	<hr />
	<h3>Raw user profile</h3>
	<pre style="max-height: 300px; overflow: auto; font-size: 0.75rem;">{JSON.stringify(tid.userProfile, null, 2)}</pre>

	<hr />
	<h3>Configuration</h3>
	<pre style="max-height: 200px; overflow: auto; font-size: 0.75rem;">{JSON.stringify({locale: tid.locale, isInitialized: tid.isInitialized, isSignedIn: tid.isSignedIn, resolvedBaseUrl: tid.resolvedBaseUrl, clientId: tid.clientId, scopes: tid.scopes}, null, 2)}</pre>
</SignedIn>

<SignedOut>
	<p>You are not signed in.</p>
	<SignInButton />
	<SignUpButton />
</SignedOut>

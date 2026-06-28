const http = require('http');
const { URL } = require('url');
const { randomUUID } = require('crypto');
const { ThunderIDNodeClient } = require('@thunderid/node');

const PORT = 3000;
const SESSION_COOKIE = 'tid_session';

const auth = new ThunderIDNodeClient();

function getSessionId(req) {
  const cookieHeader = req.headers.cookie ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(value);
  }
  return null;
}

async function main() {
  await auth.initialize({
    clientId: process.env.THUNDERID_CLIENT_ID,
    clientSecret: process.env.THUNDERID_CLIENT_SECRET,
    baseUrl: process.env.THUNDERID_BASE_URL || 'https://localhost:8090',
    afterSignInUrl: 'http://localhost:3000/callback',
    afterSignOutUrl: 'http://localhost:3000',
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    try {
      if (url.pathname === '/') {
        const sessionId = getSessionId(req);
        const signedIn = sessionId && (await auth.isSignedIn(sessionId));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(signedIn
          ? '<a href="/profile">View profile</a> | <a href="/logout">Sign out</a>'
          : '<a href="/login">Sign in</a>'
        );

      } else if (url.pathname === '/profile') {
        const sessionId = getSessionId(req);
        if (!sessionId || !(await auth.isSignedIn(sessionId))) {
          res.writeHead(302, { Location: '/login' });
          return res.end();
        }
        const user = await auth.getUser(sessionId);
        const esc = (s) => s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const displayName = esc(user.name || [user.given_name, user.family_name].filter(Boolean).join(' ') || user.username);
        const row = (label, val) => val ? `<tr><th>${label}</th><td>${esc(val)}</td></tr>` : '';
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Profile</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:60px auto;padding:0 24px;color:#05213f}
h1{font-size:22px;font-weight:700;margin:0 0 4px}p.email{font-size:14px;color:#5a7085;margin:0 0 32px}
table{width:100%;border-collapse:collapse}th,td{padding:12px 16px;text-align:left;font-size:14px;border-bottom:1px solid #dde3ec}
th{width:140px;font-weight:600;color:#5a7085;text-transform:uppercase;font-size:11px;letter-spacing:.06em}
td{font-family:monospace;word-break:break-all}a{color:#3688ff;text-decoration:none}a:hover{text-decoration:underline}</style>
</head><body>
<h1>${displayName}</h1>
${user.email ? `<p class="email">${esc(user.email)}</p>` : ''}
<table>
${row('First name', user.given_name)}
${row('Last name', user.family_name)}
${row('Username', user.username)}
${row('Email', user.email)}
${row('User ID', user.sub || user.id)}
</table>
<p style="margin-top:32px"><a href="/">← Home</a> · <a href="/logout">Sign out</a></p>
</body></html>`);

      } else if (url.pathname === '/login') {
        let sessionId = getSessionId(req);
        const extraHeaders = {};
        if (!sessionId) {
          sessionId = randomUUID();
          extraHeaders['Set-Cookie'] =
            `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/`;
        }
        await auth.signIn((authUrl) => {
          res.writeHead(302, { ...extraHeaders, Location: authUrl });
          res.end();
        }, sessionId);

      } else if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const sessionState = url.searchParams.get('session_state');
        const sessionId = getSessionId(req);

        if (!sessionId || !code || !state) {
          res.writeHead(400);
          return res.end('Bad request');
        }

        await auth.signIn(() => {}, sessionId, code, sessionState, state);
        res.writeHead(302, { Location: '/profile' });
        res.end();

      } else if (url.pathname === '/logout') {
        const sessionId = getSessionId(req);
        if (!sessionId) {
          res.writeHead(302, { Location: '/' });
          return res.end();
        }
        const signOutUrl = await auth.signOut(sessionId);
        res.writeHead(302, {
          Location: signOutUrl,
          'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        });
        res.end();

      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    } catch {
      res.writeHead(500);
      res.end('Internal server error');
    }
  });

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main();

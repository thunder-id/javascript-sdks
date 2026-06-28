const express = require('express');
const cookieParser = require('cookie-parser');
const { thunderID, handleSignIn, handleSignOut, protect } = require('@thunderid/express');

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(express.json());

app.use(
  thunderID({
    baseUrl: process.env.THUNDERID_BASE_URL || 'https://localhost:8090',
    clientId: process.env.THUNDERID_CLIENT_ID,
    clientSecret: process.env.THUNDERID_CLIENT_SECRET,
    afterSignInUrl: 'http://localhost:3000/login',
    afterSignOutUrl: 'http://localhost:3000/logout',
  }),
);

app.get('/', (_req, res) => {
  res.send('<a href="/protected">Protected page</a> | <a href="/profile">Profile</a> | <a href="/login">Sign in</a>');
});

app.get('/login', handleSignIn());
app.get('/logout', handleSignOut());

app.get(
  '/protected',
  protect((res) => res.redirect('/login')),
  (_req, res) => {
    res.send('You are signed in. <a href="/profile">View profile</a> | <a href="/logout">Sign out</a>');
  },
);

app.get('/profile', protect((res) => res.redirect('/login')), async (req, res) => {
  const user = await req.thunderIDAuth.getUserFromRequest(req);
  const esc = (s) => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const displayName = esc(user.name || [user.given_name, user.family_name].filter(Boolean).join(' ') || user.username);
  const row = (label, val) => val ? `<tr><th>${label}</th><td>${esc(val)}</td></tr>` : '';
  res.send(`<!DOCTYPE html>
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
});

app.get('/me', protect(), async (req, res) => {
  const user = await req.thunderIDAuth.getUserFromRequest(req);
  res.json(user);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

import path from 'node:path';
import {fileURLToPath} from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import {thunderID, handleSignIn, handleSignOut, protect} from '@thunderid/express';
import {verifyBearerToken} from './lib/auth.mjs';
import {layout, esc, escAttr, COPY_ICON} from './lib/layout.mjs';
import {thunderMark} from './lib/thunderMark.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;
const baseUrl = process.env.THUNDERID_BASE_URL || 'https://localhost:8090';

const REQUIRED_ENV_VARS = ['THUNDERID_CLIENT_ID', 'THUNDERID_CLIENT_SECRET'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// The thunderID() middleware is only used here to power the `/login` and
// `/token` convenience routes, which exist so you have a fast way to obtain
// a real access token to try against the API below. The API routes
// themselves (`/api/*`) don't rely on cookies or sessions at all — see
// lib/auth.mjs.
if (missingEnvVars.length === 0) {
  app.use(
    thunderID({
      baseUrl,
      clientId: process.env.THUNDERID_CLIENT_ID,
      clientSecret: process.env.THUNDERID_CLIENT_SECRET,
      // afterSignInUrl doubles as the OAuth2 redirect_uri sent to ThunderID, so
      // it must match the redirect URI registered for this app (`/login`,
      // where handleSignIn() below actually exchanges the code). Where the
      // user lands once sign-in completes is controlled separately via
      // onSignIn.
      afterSignInUrl: 'http://localhost:3000/login',
      // Same story as afterSignInUrl: this is the post_logout_redirect_uri
      // sent to ThunderID, so it must match handleSignOut()'s mount path
      // (`/logout`) for the `?state=sign_out_success` callback below to fire.
      afterSignOutUrl: 'http://localhost:3000/logout',
      onSignIn: (res) => res.redirect('/'),
      onSignOut: (res) => res.redirect('/'),
    }),
  );
}

const requireBearer = verifyBearerToken(baseUrl);

async function getSession(req) {
  const client = req.thunderIDAuth;
  const sessionId = client && req.cookies?.[client.getSessionCookieName()];
  if (!client || !sessionId) return {signedIn: false, accessToken: null, user: null};
  const signedIn = (await client.isSignedIn(sessionId)) ?? false;
  if (!signedIn) return {signedIn: false, accessToken: null, user: null};
  const [accessToken, user] = await Promise.all([client.getAccessToken(sessionId), client.getUser(sessionId)]);
  return {signedIn, accessToken, user};
}

// ── Configuration notice ────────────────────────────────────────────────

function renderConfigNeeded() {
  return layout({
    title: 'Configuration needed',
    body: `<div class="page">
      <div class="eyebrow"><span class="eyebrow-dot" style="background:#e88b3a"></span>Setup required</div>
      <h1 class="page-title">Configuration needed</h1>
      <p class="page-subtitle">This quickstart can't reach ThunderID yet. Set the following environment
      variable(s), then restart the server.</p>
      <ul class="config-list">
        ${missingEnvVars.map((key) => `<li class="config-list-item">${esc(key)}</li>`).join('')}
      </ul>
      <p class="page-subtitle">Copy <code>.env.example</code> to <code>.env</code>, fill in the values from
      your ThunderID application, then run <code>npm start</code> again.</p>
    </div>`,
  });
}

app.use((req, res, next) => {
  if (missingEnvVars.length > 0 && req.path !== '/styles.css') {
    return res.status(503).send(renderConfigNeeded());
  }
  next();
});

// ── API documentation / landing page ────────────────────────────────────

function curlBlock(lines) {
  return `<div class="code-block"><pre>${esc(lines.join('\n'))}</pre></div>`;
}

/** Joins a multi-line, backslash-continued curl command into one pasteable line. */
function toSingleLineCommand(lines) {
  return lines
    .map((line) => line.trim().replace(/\\$/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function copyButton(text) {
  return `<button class="token-copy-btn" data-copy="${escAttr(text)}" onclick="copyCodeBlock(this)">${COPY_ICON}<span class="copy-btn-label">Copy</span></button>`;
}

function endpoint({method, path: routePath, summary, protectedRoute, curl, sample}) {
  return `
    <details class="endpoint">
      <summary class="endpoint-summary">
        <span class="method-badge">${esc(method)}</span>
        <span class="endpoint-path">${esc(routePath)}</span>
        <span class="endpoint-desc">${esc(summary)}</span>
        <span class="tag ${protectedRoute ? 'tag-protected' : 'tag-public'}">${protectedRoute ? 'Protected' : 'Public'}</span>
      </summary>
      <div class="endpoint-body">
        <div class="token-raw-label-row" style="margin-top:16px">
          <span class="endpoint-body-label" style="margin:0">Request</span>
          ${copyButton(toSingleLineCommand(curl))}
        </div>
        ${curlBlock(curl)}
        <div class="endpoint-body-label">Sample response</div>
        <div class="code-block"><pre>${esc(sample)}</pre></div>
      </div>
    </details>`;
}

function bearerLine(accessToken) {
  return accessToken ? `Bearer ${accessToken}` : 'Bearer $ACCESS_TOKEN';
}

app.get('/', async (req, res) => {
  const {signedIn, accessToken, user} = await getSession(req);

  const hero = `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-mark">${thunderMark(40)}</div>
        <div class="hero-badge"><span class="hero-badge-line"></span><span>Open source</span><span class="hero-badge-line"></span></div>
        <h1 class="hero-title">Auth for Modern Apps and Agents</h1>
        <p class="hero-subtitle">ThunderID gives you OAuth&nbsp;2.0, PKCE, MFA, and JWT out of
        the box. Clone the Quickstart and ship auth before lunch.</p>
        <hr class="hero-divider">
        <div class="hero-stats">
          <div class="hero-stat"><span class="hero-stat-value">OAuth 2.0</span><span class="hero-stat-label">Authorization standard</span></div>
          <div class="hero-stat"><span class="hero-stat-value">&lt; 5 min</span><span class="hero-stat-label">Integration time</span></div>
          <div class="hero-stat"><span class="hero-stat-value">Apache 2.0</span><span class="hero-stat-label">License</span></div>
        </div>
      </div>
    </section>`;

  const authCard = signedIn
    ? `<div class="card">
        <p>You're signed in. Here's your access token — it's already substituted into the curl
        examples below, so you can copy and run them as-is.</p>
        <div class="token-raw-label-row" style="margin-top:12px">
          <span class="token-section-label">Access token</span>
          ${copyButton(accessToken || '')}
        </div>
        <code class="token-raw">${esc(accessToken)}</code>
        <p style="margin-top:12px">See the full decoded token, expiry, and claims at <a href="/token">/token</a>.</p>
      </div>`
    : `<div class="card">
        <span class="token-section-label">Authorization header</span>
        <div style="margin-top:8px">${curlBlock(['Authorization: Bearer <access_token>'])}</div>
        <p style="margin-top:14px"><strong>Sign in</strong> above for a demo token, or obtain one via OAuth 2.0 in your own app.</p>
      </div>`;

  const body = `${hero}
    <div class="docs-shell">
    <div class="section-label">Authentication</div>
    ${authCard}

    <div class="section-label">Endpoints</div>
    ${endpoint({
      method: 'GET',
      path: '/api/public',
      summary: 'No authentication required.',
      protectedRoute: false,
      curl: ['curl http://localhost:3000/api/public'],
      sample: JSON.stringify({message: 'This endpoint is public. No token needed.'}, null, 2),
    })}
    ${endpoint({
      method: 'GET',
      path: '/api/protected',
      summary: 'Returns a sample resource for the authenticated caller.',
      protectedRoute: true,
      curl: [
        'curl http://localhost:3000/api/protected \\',
        `  -H "Authorization: ${bearerLine(accessToken)}"`,
      ],
      sample: JSON.stringify(
        {message: 'You are authenticated.', subject: '<sub claim from your token>'},
        null,
        2,
      ),
    })}
    ${endpoint({
      method: 'GET',
      path: '/api/me',
      summary: "Proxies ThunderID's userinfo claims for the token's owner.",
      protectedRoute: true,
      curl: ['curl http://localhost:3000/api/me \\', `  -H "Authorization: ${bearerLine(accessToken)}"`],
      sample: JSON.stringify({sub: '...', email: 'jane@example.com', given_name: 'Jane'}, null, 2),
    })}

    <div class="section-label">Postman</div>
    <div class="card">
      <p>Prefer a GUI? Download the collection below — it ships with requests for every
      endpoint above and a <code>{{accessToken}}</code> variable you can fill in from
      <a href="/token">/token</a>.</p>
      <div style="margin-top:14px">
        <a class="btn-primary" href="/postman-collection.json" download="ThunderID-Express-Quickstart.postman_collection.json">Download Postman collection</a>
      </div>
    </div>
    </div>
  `;
  res.send(layout({title: 'API docs', signedIn, user, body}));
});

// ── Demo token helper (browser-based, cookie session) ───────────────────

app.get('/login', handleSignIn());
app.get('/logout', handleSignOut());

app.get('/token', protect((res) => res.redirect('/login')), async (req, res) => {
  const {accessToken, user} = await getSession(req);

  const parts = accessToken ? accessToken.split('.') : [];
  const decodePart = (part) => {
    try {
      return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    } catch {
      return null;
    }
  };
  const header = parts[0] ? decodePart(parts[0]) : null;
  const payload = parts[1] ? decodePart(parts[1]) : null;
  const issuer = payload?.iss;
  const audience = Array.isArray(payload?.aud) ? payload.aud.join(', ') : payload?.aud;
  const scopes = payload?.scope;

  const body = `<div class="page">
    <div class="token-header">
      <div>
        <h1 class="token-title">Token debug</h1>
        <p class="token-subtitle">Inspect your access token and decoded claims.</p>
      </div>
      <div class="token-badge" id="token-badge"><span class="token-badge-dot"></span><span id="token-badge-text">Valid</span></div>
    </div>

    <div class="token-raw-section">
      <div class="token-raw-label-row">
        <span class="token-section-label">Access token</span>
        ${copyButton(accessToken || '')}
      </div>
      <code class="token-raw"><span class="token-part--header">${esc(parts[0])}</span><span class="token-dot">.</span><span class="token-part--payload">${esc(parts[1])}</span><span class="token-dot">.</span><span class="token-part--signature">${esc(parts[2])}</span></code>
    </div>

    <div class="token-decoded-grid">
      <div class="token-code-box">
        <div class="token-code-box-header token-code-box-header--header">JWT Header</div>
        <pre class="token-code-pre">${esc(JSON.stringify(header, null, 2))}</pre>
      </div>
      <div class="token-code-box">
        <div class="token-code-box-header token-code-box-header--payload">JWT Payload</div>
        <pre class="token-code-pre">${esc(JSON.stringify(payload, null, 2))}</pre>
      </div>
    </div>

    ${
      issuer || audience || scopes
        ? `<div class="token-meta-row">
            ${issuer ? `<div class="token-meta-item"><div class="token-meta-label">Issuer</div><div class="token-meta-value">${esc(issuer)}</div></div>` : ''}
            ${audience ? `<div class="token-meta-item"><div class="token-meta-label">Audience</div><div class="token-meta-value">${esc(audience)}</div></div>` : ''}
            ${scopes ? `<div class="token-meta-item"><div class="token-meta-label">Scopes</div><div class="token-meta-value">${esc(scopes)}</div></div>` : ''}
          </div>`
        : ''
    }

    <script>
      (function () {
        var exp = ${JSON.stringify(payload?.exp ?? null)};
        var badge = document.getElementById('token-badge');
        var badgeText = document.getElementById('token-badge-text');
        function tick() {
          if (!exp) return;
          var secsLeft = exp - Math.floor(Date.now() / 1000);
          if (secsLeft <= 0) {
            badge.classList.add('token-badge--expired');
            badgeText.textContent = 'Expired';
          } else {
            badgeText.textContent = 'Valid \\u00b7 expires in ' + Math.floor(secsLeft / 60) + ' min';
          }
        }
        tick();
        setInterval(tick, 1000);
      })();
    </script>
  </div>`;
  res.send(layout({title: 'Token debug', signedIn: true, showBack: true, user, body}));
});

// ── API routes (bearer-token protected, no cookies involved) ────────────

app.get('/api/public', (_req, res) => {
  res.json({message: 'This endpoint is public. No token needed.'});
});

app.get('/api/protected', requireBearer, (req, res) => {
  res.json({
    message: 'You are authenticated.',
    subject: req.thunderIDUserInfo.sub ?? req.thunderIDUserInfo.id,
  });
});

app.get('/api/me', requireBearer, (req, res) => {
  res.json(req.thunderIDUserInfo);
});

// ── Postman collection download ─────────────────────────────────────────

app.get('/postman-collection.json', (_req, res) => {
  res.download(path.join(__dirname, 'postman', 'ThunderID-Express-Quickstart.postman_collection.json'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

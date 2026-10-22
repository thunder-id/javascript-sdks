// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

const GROUPS = ['Authentication', 'Session', 'Tokens', 'Protected routes', 'Management'];

const ENDPOINT_GROUPS = [
  ['management', 'Management API'],
  ['selfService', 'Sign-in and self-service'],
];

const state = {
  curlCopied: false,
  identity: 'anonymous',
  meta: null,
  results: {},
  routeId: null,
  sending: false,
  showCurl: false,
  tab: 'body',
};

const $ = (id) => document.getElementById(id);

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === 'text') node.textContent = value;
    else if (key === 'onClick') node.addEventListener('click', value);
    else if (key === 'className') node.className = value;
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.forEach((child) => node.append(child));
  return node;
};

const LOCK_ICON =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>';

const currentRoute = () => state.meta?.routes.find((route) => route.id === state.routeId);

const initials = (name) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const formatSize = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

const maskCookie = (text) => text.replace(/(Cookie: [^=]+=)([0-9a-f-]{8})[0-9a-f-]+/gi, '$1$2...');

const identities = () => {
  const session = state.meta?.session ?? {present: false};
  const name = session.name ?? 'Signed in';
  const usable = session.present && session.hasTokens;
  const reason = 'Sign in first: this identity uses your playground session.';
  return [
    {color: 'rgba(255,255,255,0.4)', id: 'anonymous', label: 'Anonymous', sub: 'no session cookie'},
    {
      color: '#34d399',
      disabled: !usable,
      id: 'session',
      label: name,
      reason,
      sub: usable ? (session.signedIn ? 'your session' : 'your session, token expired') : 'sign in first',
    },
    {
      color: '#f59e0b',
      disabled: !usable,
      id: 'expired',
      label: usable ? name : 'Expired token',
      reason,
      sub: 'copy of your session, access token expired',
    },
  ];
};

const renderTopbar = () => {
  const {meta} = state;
  const appStatus = $('app-status');
  appStatus.dataset.state = 'ok';
  appStatus.lastChild.textContent = new URL(meta.app).host;

  const idpStatus = $('idp-status');
  idpStatus.dataset.state = meta.idp.reachable ? 'ok' : 'down';
  idpStatus.lastChild.textContent = `idp ${new URL(meta.idp.baseUrl).host}`;
  idpStatus.title = meta.idp.reachable ? 'ThunderID is reachable' : `ThunderID is unreachable: ${meta.idp.error}`;

  const chip = $('session-chip');
  chip.replaceChildren();
  if (meta.session.present && meta.session.hasTokens) {
    const name = meta.session.name ?? 'Signed in';
    chip.append(
      el('div', {className: 'avatar', 'aria-hidden': 'true', text: initials(name)}),
      el('span', {className: 'session-name'}, [
        el('span', {text: name}),
        el('small', {text: meta.session.signedIn ? 'signed in' : 'access token expired'}),
      ]),
      el('a', {className: 'btn-link', href: '/logout', text: 'Sign out'}),
    );
  } else {
    chip.append(el('a', {className: 'btn-primary small', href: '/login', text: 'Sign in'}));
  }

  const notices = $('notices');
  notices.replaceChildren();
  const notice = (parts, title) =>
    notices.append(el('div', {className: 'notice', role: 'status'}, [el('strong', {text: title}), ...parts]));
  if (!meta.configured) {
    notice(
      [
        el('span', {text: 'Set '}),
        el('code', {text: 'THUNDERID_CLIENT_ID'}),
        el('span', {text: ' in .env (copy .env.example) and restart.'}),
      ],
      'Not configured.',
    );
  }
  if (!meta.idp.reachable) {
    notice(
      [
        el('span', {
          text: `${meta.idp.baseUrl} did not answer: ${meta.idp.error}. See the README for local TLS setup.`,
        }),
      ],
      'ThunderID unreachable.',
    );
  }
};

const renderRoutes = () => {
  const container = $('route-groups');
  container.replaceChildren(
    ...GROUPS.map((group) => {
      const items = state.meta.routes.filter((route) => route.group === group);
      return el('div', {className: 'group'}, [
        el('div', {className: 'group-name', text: group}),
        el(
          'ul',
          {},
          items.map((route) => {
            const button = el(
              'button',
              {
                'aria-current': route.id === state.routeId ? 'true' : 'false',
                className: 'route-btn',
                onClick: () => selectRoute(route.id),
                type: 'button',
              },
              [
                el('span', {className: 'method', 'data-method': route.method, text: route.method}),
                el('span', {className: 'route-path', text: route.path}),
              ],
            );
            if (route.locked) {
              const lock = el('span', {className: 'lock', role: 'img', 'aria-label': 'Requires a session'});
              lock.innerHTML = LOCK_ICON;
              button.append(lock);
            }
            return el('li', {}, [button]);
          }),
        ),
      ]);
    }),
  );
};

const renderEndpoints = () => {
  const {endpoints} = state.meta;
  const shortUrl = (url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.host}${parsed.pathname}`;
    } catch {
      return url;
    }
  };
  const overrides = endpoints.filter((endpoint) => endpoint.source === 'override').length;
  $('endpoints-note').textContent = overrides
    ? `${overrides} endpoint${overrides === 1 ? '' : 's'} set by THUNDERID_ENDPOINT_<KEY>; the rest resolve to {baseUrl}/{path}.`
    : 'No overrides: every collection resolves to {baseUrl}/{path}. See .env.example.';
  $('endpoint-groups').replaceChildren(
    ...ENDPOINT_GROUPS.map(([group, label]) =>
      el('div', {className: 'group'}, [
        el('div', {className: 'group-name', text: label}),
        el(
          'dl',
          {className: 'endpoint-list'},
          endpoints
            .filter((endpoint) => endpoint.group === group)
            .flatMap((endpoint) => [
              el('dt', {}, [
                document.createTextNode(endpoint.key),
                endpoint.source === 'override' ? el('span', {className: 'override', text: 'override'}) : '',
              ]),
              el('dd', {text: shortUrl(endpoint.url), title: endpoint.url}),
            ]),
        ),
      ]),
    ),
  );
};

const renderRequest = () => {
  const route = currentRoute();
  $('ep-method').textContent = route.method;
  $('ep-method').dataset.method = route.method;
  $('ep-path').textContent = route.path;
  $('ep-tags').replaceChildren(
    ...route.chain.filter((c) => c !== 'handler').map((c) => el('span', {className: 'tag', text: c})),
  );
  $('ep-summary').textContent = route.summary;
  $('ep-desc').textContent = route.description;
  $('req-content-type').textContent = route.contentType ?? 'no body';
  $('handler').textContent = route.source;

  $('identities').replaceChildren(
    ...identities().map((identity) =>
      el(
        'button',
        {
          'aria-checked': state.identity === identity.id ? 'true' : 'false',
          className: 'identity',
          disabled: identity.disabled,
          onClick: () => {
            state.identity = identity.id;
            state.showCurl = false;
            renderRequest();
          },
          role: 'radio',
          title: identity.disabled ? identity.reason : undefined,
          type: 'button',
        },
        [
          el('span', {className: 'id-dot', style: `background: ${identity.color}`}),
          el('span', {className: 'id-text'}, [
            el('span', {className: 'id-label', text: identity.label}),
            el('span', {className: 'id-sub', text: identity.sub}),
          ]),
        ],
      ),
    ),
  );

  $('params-block').hidden = route.params.length === 0;
  $('params').replaceChildren(
    ...route.params.map((param) =>
      el('label', {className: 'param'}, [
        el('span', {className: 'param-name'}, [
          el('span', {}, [
            document.createTextNode(param.name),
            param.required ? el('span', {className: 'required', text: ' *'}) : '',
          ]),
          el('small', {text: `${param.where} · ${param.type}`}),
        ]),
        el('input', {'data-param': param.name, type: 'text', value: param.value}),
      ]),
    ),
  );

  $('body-block').hidden = !route.body;
  $('req-body').value = route.body ?? '';

  renderCurl();
};

const readParams = () =>
  Object.fromEntries([...document.querySelectorAll('[data-param]')].map((input) => [input.dataset.param, input.value]));

const draftCurl = () => {
  const route = currentRoute();
  const params = readParams();
  let path = route.path;
  const query = new URLSearchParams();
  route.params.forEach((param) => {
    const value = params[param.name] ?? '';
    if (param.where === 'path') path = path.replace(`:${param.name}`, encodeURIComponent(value));
    else if (value) query.set(param.name, value);
  });
  const lines = [`curl -i -X ${route.method} '${state.meta.app}${path}${query.size ? `?${query}` : ''}'`];
  if (state.identity !== 'anonymous') lines.push(`  -H 'Cookie: ${state.meta.cookieName}=<session id>'`);
  if (route.method === 'POST') {
    if (route.contentType) lines.push(`  -H 'Content-Type: ${route.contentType}'`);
    lines.push(`  --data '${$('req-body').value.replace(/\s*\n\s*/g, ' ')}'`);
  }
  return lines.join(' \\\n');
};

const curlText = () => state.results[state.routeId]?.curl ?? draftCurl();

const renderCurl = () => {
  const button = $('curl-toggle');
  button.textContent = state.curlCopied ? 'Copied' : state.showCurl ? 'Hide cURL' : 'Copy as cURL';
  $('curl').hidden = !state.showCurl;
  $('curl').textContent = state.showCurl ? maskCookie(curlText()) : '';
};

const renderResponse = () => {
  const result = state.results[state.routeId];
  $('send').classList.toggle('sending', state.sending);
  $('send').disabled = state.sending;
  $('res-empty').hidden = Boolean(result);
  $('res-content').hidden = !result;
  $('res-status').hidden = !result || result.error;
  $('res-meta').textContent = '';

  document.querySelectorAll('.tabs button').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === state.tab));
  });
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== state.tab;
  });

  if (!result) return;

  if (result.error) {
    $('res-body').textContent = result.error;
    $('res-headers').replaceChildren();
    $('res-trace').replaceChildren();
    return;
  }

  const badge = $('res-status');
  badge.textContent = `${result.status} ${result.statusText}`;
  badge.dataset.class = String(result.status).charAt(0);
  $('res-meta').textContent = `${result.ms} ms · ${formatSize(result.size)}`;
  $('res-body').textContent = result.body || '(no body)';
  $('res-headers').replaceChildren(
    ...result.headers.flatMap(([name, value]) => [el('dt', {text: name}), el('dd', {text: value})]),
  );
  $('res-trace').replaceChildren(
    ...(result.trace.length
      ? result.trace.map((step) =>
          el('li', {style: `padding-left: ${step.depth * 20}px`}, [
            el('div', {className: 'trace-rail'}, [
              el('span', {className: 'trace-dot', 'data-kind': step.kind}),
              el('span', {className: 'trace-line'}),
            ]),
            el('div', {className: 'trace-main'}, [
              el('div', {className: 'trace-row'}, [
                el('span', {className: 'trace-source', text: step.source}),
                el('span', {className: `trace-step${step.source === 'log' ? '' : ' code'}`, text: step.step}),
                el('span', {
                  className: 'trace-ms',
                  text: `+${step.at} ms${step.durationMs ? ` · ${step.durationMs} ms` : ''}`,
                }),
              ]),
              el('div', {className: 'trace-detail', text: step.detail}),
            ]),
          ]),
        )
      : [el('li', {className: 'trace-detail', text: 'No SDK steps were recorded for this request.'})]),
  );
};

const selectRoute = (id) => {
  state.routeId = id;
  state.showCurl = false;
  state.curlCopied = false;
  history.replaceState(null, '', `#${id}`);
  renderRoutes();
  renderRequest();
  renderResponse();
};

const loadMeta = async () => {
  const response = await fetch('/_playground/meta');
  state.meta = await response.json();
  const session = state.meta.session;
  if (state.identity !== 'anonymous' && !(session.present && session.hasTokens)) state.identity = 'anonymous';
  renderTopbar();
  renderEndpoints();
};

const send = async () => {
  if (state.sending) return;
  state.sending = true;
  renderResponse();
  try {
    const response = await fetch('/_playground/send', {
      body: JSON.stringify({
        body: $('req-body').value,
        identity: state.identity,
        params: readParams(),
        routeId: state.routeId,
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
    const payload = await response.json();
    state.results[state.routeId] = response.ok ? payload : {error: payload.message};
  } catch (e) {
    state.results[state.routeId] = {error: `The explorer could not reach the playground server: ${e.message}`};
  }
  state.sending = false;
  await loadMeta();
  renderRequest();
  renderResponse();
};

const copyCurl = async () => {
  if (state.showCurl) {
    state.showCurl = false;
    renderCurl();
    return;
  }
  state.showCurl = true;
  try {
    await navigator.clipboard.writeText(curlText());
    state.curlCopied = true;
    setTimeout(() => {
      state.curlCopied = false;
      renderCurl();
    }, 1500);
  } catch {
    state.curlCopied = false;
  }
  renderCurl();
};

const start = async () => {
  $('send').addEventListener('click', send);
  $('curl-toggle').addEventListener('click', copyCurl);
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id !== state.routeId && state.meta?.routes.some((route) => route.id === id)) selectRoute(id);
  });
  document.querySelectorAll('.tabs button').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.tab = tab.dataset.tab;
      renderResponse();
    });
  });

  state.identity = new URLSearchParams(location.search).get('as') ?? 'anonymous';
  await loadMeta();
  const fromHash = location.hash.slice(1);
  const ids = state.meta.routes.map((route) => route.id);
  selectRoute(ids.includes(fromHash) ? fromHash : (ids.find((id) => id === 'me') ?? ids[0]));
};

start();

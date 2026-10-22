// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

const GROUPS = [
  'Discovery',
  'Sign-in',
  'Session',
  'Tokens',
  'Sign-out',
  'Management API',
  'Management client',
  'Not available',
];

const ENDPOINT_GROUPS = [
  ['management', 'Management API'],
  ['selfService', 'Sign-in and self-service'],
];

const state = {
  codeCopied: false,
  filter: '',
  identity: 'session',
  meta: null,
  operationId: null,
  results: {},
  sending: false,
  showCode: false,
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

const currentOperation = () => state.meta?.operations.find((operation) => operation.id === state.operationId);

const kindOf = (operation) => {
  if (operation.unavailable) return 'N/A';
  return operation.network ? 'HTTP' : 'LOCAL';
};

const methodName = (operation) => operation.call.replace(/\(.*$/, '');

const initials = (name) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const formatSize = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

const pretty = (text) => {
  if (!text) return '';
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

const identities = () => {
  const session = state.meta?.session ?? {present: false};
  const hasTokens = session.present && session.hasTokens;
  let sessionSub = 'not signed in yet';
  if (hasTokens) sessionSub = session.signedIn ? 'signed in' : 'signed in, token expired';
  return [
    {
      color: '#34d399',
      id: 'session',
      label: hasTokens ? (session.name ?? 'Signed in') : 'Browser session',
      sub: `${sessionSub} · ${session.id ?? ''}`,
    },
    {color: 'rgba(255,255,255,0.4)', id: 'anonymous', label: 'New session', sub: 'a fresh session id each run'},
    {
      color: '#f59e0b',
      disabled: !hasTokens,
      id: 'expired',
      label: 'Expired token',
      reason: 'Sign in first: this identity copies your session.',
      sub: 'copy of your session, access token expired',
    },
  ];
};

const renderTopbar = () => {
  const {meta} = state;
  const appStatus = $('app-status');
  appStatus.dataset.state = 'ok';
  appStatus.lastChild.textContent = new URL(meta.app).host;
  $('sdk-label').textContent = `${meta.sdk.name} ${meta.sdk.version}`;

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

const renderOperations = () => {
  const filter = state.filter.toLowerCase();
  const container = $('route-groups');
  container.replaceChildren(
    ...GROUPS.map((group) => {
      const items = state.meta.operations.filter(
        (operation) =>
          operation.group === group &&
          (!filter || `${operation.call} ${operation.summary}`.toLowerCase().includes(filter)),
      );
      if (items.length === 0) return '';
      return el('div', {className: 'group'}, [
        el('div', {className: 'group-name', text: group}),
        el(
          'ul',
          {},
          items.map((operation) =>
            el('li', {}, [
              el(
                'button',
                {
                  'aria-current': operation.id === state.operationId ? 'true' : 'false',
                  className: 'route-btn',
                  onClick: () => selectOperation(operation.id),
                  title: operation.summary,
                  type: 'button',
                },
                [
                  el('span', {className: 'method', 'data-method': kindOf(operation), text: kindOf(operation)}),
                  el('span', {className: 'route-path', text: methodName(operation)}),
                  operation.variant ? el('span', {className: 'variant', text: operation.variant}) : '',
                ],
              ),
            ]),
          ),
        ),
      ]);
    }),
  );
};

const renderRequest = () => {
  const operation = currentOperation();
  $('ep-kind').textContent = kindOf(operation);
  $('ep-kind').dataset.method = kindOf(operation);
  $('ep-kind').title = operation.network ? 'Sends requests to ThunderID' : 'Runs locally in the SDK';
  $('ep-call').textContent = operation.call;
  $('ep-tags').replaceChildren(
    el('span', {className: 'tag', text: operation.returns}),
    ...(operation.variant ? [el('span', {className: 'tag', text: operation.variant})] : []),
    ...(operation.session ? [el('span', {className: 'tag', text: 'uses a session'})] : []),
  );
  $('ep-summary').textContent = operation.summary;
  $('ep-desc').textContent = operation.description;
  $('req-returns').textContent = operation.returns;
  $('handler').textContent = operation.source || '// Not implemented by ThunderIDNodeClient.';
  document.querySelector('.stack .card:last-child .card-head .mono').textContent = operation.sourceFile;

  $('identities-block').hidden = !operation.session;
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
            state.showCode = false;
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

  $('params-block').hidden = operation.params.length === 0;
  $('params').replaceChildren(
    ...operation.params.map((param) =>
      el('label', {className: 'param'}, [
        el('span', {className: 'param-name'}, [
          el('span', {}, [
            document.createTextNode(param.name),
            param.required ? el('span', {className: 'required', text: ' *'}) : '',
          ]),
          el('small', {text: param.type}),
        ]),
        el('input', {'data-param': param.name, type: 'text', value: param.value}),
      ]),
    ),
  );

  $('body-block').hidden = operation.args === undefined;
  $('req-body').value = operation.args ?? '';

  $('unavailable').hidden = !operation.unavailable;
  $('unavailable').textContent = operation.unavailable ?? '';
  $('send').hidden = Boolean(operation.unavailable);
  $('code-toggle').hidden = Boolean(operation.unavailable);

  renderCode();
};

const readParams = () =>
  Object.fromEntries([...document.querySelectorAll('[data-param]')].map((input) => [input.dataset.param, input.value]));

const draftCode = () => {
  const operation = currentOperation();
  const params = readParams();
  const lines = [];
  if (operation.args !== undefined) lines.push(`const args = ${$('req-body').value};`);
  operation.params.forEach((param) => {
    const value = params[param.name] ?? '';
    const isNumber = param.type === 'number' && value !== '' && !Number.isNaN(Number(value));
    lines.push(`const ${param.name} = ${isNumber ? value : JSON.stringify(value)};`);
  });
  if (operation.session) lines.push(`const sessionId = '<session id>';`);
  const call = operation.call.replace(/\((requestConfig|options|config|payload)\b/, '(args');
  lines.push('', `const result = await ${call};`);
  return lines.join('\n');
};

const codeText = () => state.results[state.operationId]?.code ?? draftCode();

const renderCode = () => {
  const button = $('code-toggle');
  button.textContent = state.codeCopied ? 'Copied' : state.showCode ? 'Hide code' : 'Copy as code';
  $('code').hidden = !state.showCode;
  $('code').textContent = state.showCode ? codeText() : '';
};

const headerList = (headers) =>
  el(
    'dl',
    {className: 'headers'},
    headers.flatMap(([name, value]) => [el('dt', {text: name}), el('dd', {text: value})]),
  );

const renderHttp = (requests) => {
  if (requests.length === 0) {
    return [el('p', {className: 'trace-detail', text: 'The SDK sent no requests to ThunderID for this call.'})];
  }
  return requests.map((exchange, index) => {
    const url = new URL(exchange.url);
    const status = exchange.status ? `${exchange.status} ${exchange.statusText}` : 'failed';
    return el('details', {className: 'exchange', open: index === requests.length - 1}, [
      el('summary', {}, [
        el('span', {className: 'method', 'data-method': exchange.method, text: exchange.method}),
        el('span', {className: 'exchange-url', text: `${url.host}${url.pathname}`}),
        el('span', {
          className: 'status-badge',
          'data-class': exchange.status ? String(exchange.status).charAt(0) : '5',
          text: status,
        }),
        el('span', {className: 'trace-ms', text: `${exchange.durationMs ?? 0} ms`}),
      ]),
      el('div', {className: 'exchange-body'}, [
        el('div', {className: 'field-label', text: 'Request'}),
        el('pre', {className: 'code-block', text: `${exchange.method} ${exchange.url}`}),
        exchange.requestHeaders.length ? headerList(exchange.requestHeaders) : '',
        exchange.requestBody ? el('pre', {className: 'code-block', text: exchange.requestBody}) : '',
        el('div', {className: 'field-label', text: 'Response'}),
        exchange.error
          ? el('pre', {className: 'code-block error-text', text: exchange.error})
          : el('div', {}, [
              headerList(exchange.responseHeaders),
              el('pre', {
                className: 'code-block',
                text: pretty(exchange.responseBody) || '(no body)',
              }),
            ]),
      ]),
    ]);
  });
};

const renderTrace = (steps) =>
  steps.length
    ? steps.map((step) =>
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
    : [el('li', {className: 'trace-detail', text: 'No SDK steps were recorded for this call.'})];

const renderResponse = () => {
  const result = state.results[state.operationId];
  $('send').classList.toggle('sending', state.sending);
  $('send').disabled = state.sending;
  $('res-empty').hidden = Boolean(result);
  $('res-content').hidden = !result;
  $('res-status').hidden = !result || Boolean(result.failure);
  $('res-meta').textContent = '';
  $('res-session').textContent = '';

  const httpTab = document.querySelector('.tabs [data-tab="http"]');
  httpTab.textContent = result?.requests ? `HTTP (${result.requests.length})` : 'HTTP';

  document.querySelectorAll('.tabs button').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === state.tab));
  });
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== state.tab;
  });

  if (!result) return;

  if (result.failure) {
    $('res-body').textContent = result.failure;
    $('res-http').replaceChildren();
    $('res-trace').replaceChildren();
    return;
  }

  const badge = $('res-status');
  badge.textContent = result.ok ? 'Resolved' : 'Rejected';
  badge.dataset.class = result.ok ? '2' : '5';
  const size = new Blob([JSON.stringify(result.ok ? result.value : result.error)]).size;
  $('res-meta').textContent = `${result.ms} ms · ${formatSize(size)}`;
  $('res-session').textContent = result.session === 'none' ? '' : `Ran as ${result.session}`;
  $('res-body').textContent = result.ok
    ? JSON.stringify(result.value, null, 2)
    : JSON.stringify({error: result.error}, null, 2);
  $('res-body').classList.toggle('rejected', !result.ok);
  $('res-http').replaceChildren(...renderHttp(result.requests));
  $('res-trace').replaceChildren(...renderTrace(result.steps));
};

const selectOperation = (id) => {
  state.operationId = id;
  state.showCode = false;
  state.codeCopied = false;
  history.replaceState(null, '', `#${id}`);
  renderOperations();
  renderRequest();
  renderResponse();
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

const loadMeta = async () => {
  const response = await fetch('/_playground/meta');
  state.meta = await response.json();
  const session = state.meta.session;
  if (state.identity === 'expired' && !(session.present && session.hasTokens)) state.identity = 'session';
  renderTopbar();
  renderEndpoints();
};

const send = async () => {
  const operation = currentOperation();
  if (state.sending || operation.unavailable) return;
  state.sending = true;
  renderResponse();
  try {
    const response = await fetch('/_playground/run', {
      body: JSON.stringify({
        args: operation.args === undefined ? undefined : $('req-body').value,
        identity: state.identity,
        operationId: state.operationId,
        params: readParams(),
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
    const payload = await response.json();
    state.results[state.operationId] = response.ok ? payload : {failure: payload.message};
  } catch (e) {
    state.results[state.operationId] = {failure: `The explorer could not reach the playground server: ${e.message}`};
  }
  state.sending = false;
  await loadMeta();
  renderRequest();
  renderResponse();
};

const copyCode = async () => {
  if (state.showCode) {
    state.showCode = false;
    renderCode();
    return;
  }
  state.showCode = true;
  try {
    await navigator.clipboard.writeText(codeText());
    state.codeCopied = true;
    setTimeout(() => {
      state.codeCopied = false;
      renderCode();
    }, 1500);
  } catch {
    state.codeCopied = false;
  }
  renderCode();
};

const start = async () => {
  $('send').addEventListener('click', send);
  $('code-toggle').addEventListener('click', copyCode);
  $('filter').addEventListener('input', (event) => {
    state.filter = event.target.value;
    renderOperations();
  });
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id !== state.operationId && state.meta?.operations.some((operation) => operation.id === id)) {
      selectOperation(id);
    }
  });
  document.querySelectorAll('.tabs button').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.tab = tab.dataset.tab;
      renderResponse();
    });
  });

  state.identity = new URLSearchParams(location.search).get('as') ?? 'session';
  await loadMeta();
  const fromHash = location.hash.slice(1);
  const ids = state.meta.operations.map((operation) => operation.id);
  selectOperation(ids.includes(fromHash) ? fromHash : (ids.find((id) => id === 'getSignInUrl') ?? ids[0]));
};

start();

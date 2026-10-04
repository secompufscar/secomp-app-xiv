const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');
const root = path.resolve(__dirname, '..');

function load(file, dependencies) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, console, require(name) {
    assert.ok(name in dependencies, `Unmocked dependency: ${name}`);
    return dependencies[name];
  } }, { filename: file });
  return module.exports;
}
const sessionErrors = load('src/utils/sessionErrors.ts', {});
function storage(access = 'old-access', refresh = 'old-refresh') {
  const state = { access, refresh, removed: 0, saved: 0, remoteLogout: 0, expired: 0 };
  return { state, methods: {
    getAuthToken: async () => state.access, getRefreshToken: async () => state.refresh,
    removeSessionTokens: async () => { state.removed++; state.access = state.refresh = null; },
    setSessionTokens: async (a, r) => { state.saved++; state.access = a; state.refresh = r; },
  } };
}
const response = (config, status, data) => ({ config, status, statusText: String(status), data, headers: {} });
function rejectStatus(config, status) {
  throw new axios.AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', config, undefined, response(config, status, {}));
}
function client(store, refreshHandler) {
  const calls = [];
  const updates = [];
  const api = load('src/services/api.ts', {
    axios: { ...axios, create(config) {
      const instance = axios.create(config);
      instance.defaults.adapter = async request => {
        calls.push({ url: request.url, auth: request.headers.Authorization });
        if (request.url === '/users/refresh') return refreshHandler(request);
        if (request.headers.Authorization !== 'Bearer new-access') rejectStatus(request, 401);
        return response(request, 200, { id: 'synthetic-user' });
      };
      return instance;
    } },
    '../utils/authHelper': { callGlobalSignOut: async () => { store.state.expired++; } },
    'expo-constants': { expoConfig: { version: '1.1.0' } },
    'react-native': { Platform: { OS: 'web' } }, './secureStorage': store.methods,
    '../utils/updateHelper': { callGlobalRequireUpdate: value => updates.push(value) },
    '../utils/sessionErrors': sessionErrors,
  }).default;
  return { api, calls, updates };
}

test('503/500/429/403 na renovação preservam tokens e propagam a falha real', async () => {
  for (const status of [503, 500, 429, 403]) {
    const store = storage();
    const { api, calls } = client(store, config => rejectStatus(config, status));
    await assert.rejects(api.get('/users/me'), error => error.response.status === status);
    assert.equal(store.state.removed, 0);
    assert.equal(store.state.expired, 0);
    assert.equal(store.state.access, 'old-access');
    assert.equal(store.state.refresh, 'old-refresh');
    assert.equal(calls.filter(c => c.url === '/users/refresh').length, 1);
  }
});

test('timeout e ausência de rede na renovação não apagam sessão nem repetem refresh', async () => {
  for (const code of ['ECONNABORTED', 'ERR_NETWORK']) {
    const store = storage();
    const { api, calls } = client(store, config => { throw new axios.AxiosError('Temporary network failure', code, config); });
    await assert.rejects(api.get('/users/me'), error => error.code === code);
    assert.equal(store.state.removed, 0);
    assert.equal(store.state.expired, 0);
    assert.equal(calls.filter(c => c.url === '/users/refresh').length, 1);
  }
});

test('426 no refresh mantém sessão e encaminha a política de atualização', async () => {
  const store = storage();
  const { api, updates } = client(store, config => {
    throw new axios.AxiosError('Update required', 'ERR_BAD_RESPONSE', config, undefined,
      response(config, 426, { code: 'APP_UPDATE_REQUIRED', updateRequired: true }));
  });
  await assert.rejects(api.get('/users/me'), error => error.response.status === 426);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].updateRequired, true);
  assert.equal(store.state.removed, 0);
});

test('401 do refresh e token legado sem refresh encerram somente a sessão local', async () => {
  for (const refresh of ['old-refresh', null]) {
    const store = storage('old-access', refresh);
    const { api, calls } = client(store, config => rejectStatus(config, 401));
    await assert.rejects(api.get('/users/me'));
    assert.equal(store.state.removed, 1);
    assert.equal(store.state.expired, 1);
    assert.equal(store.state.remoteLogout, 0);
    assert.equal(calls.filter(c => c.url === '/users/refresh').length, refresh ? 1 : 0);
  }
});

test('uma nova tentativa após 503 recupera sessão e repete a consulta com o token novo', async () => {
  const store = storage();
  let refreshCalls = 0;
  const { api } = client(store, config => {
    if (++refreshCalls === 1) rejectStatus(config, 503);
    return response(config, 200, { token: 'new-access', refreshToken: 'new-refresh' });
  });
  await assert.rejects(api.get('/users/me'), error => error.response.status === 503);
  const result = await api.get('/users/me');
  assert.equal(result.data.id, 'synthetic-user');
  assert.equal(store.state.saved, 1);
  assert.equal(store.state.access, 'new-access');
  assert.equal(store.state.refresh, 'new-refresh');
  assert.equal(store.state.removed, 0);
});

test('401 simultâneos compartilham uma única renovação e persistência', async () => {
  const store = storage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { api, calls } = client(store, async config => {
    await gate;
    return response(config, 200, { token: 'new-access', refreshToken: 'new-refresh' });
  });
  const pending = Promise.all([api.get('/users/me'), api.get('/activities')]);
  await new Promise(resolve => setImmediate(resolve));
  release();
  const result = await pending;
  assert.ok(result.every(r => r.status === 200));
  assert.equal(calls.filter(c => c.url === '/users/refresh').length, 1);
  assert.equal(store.state.saved, 1);
  assert.equal(store.state.removed, 0);
});

function provider(store, getProfile) {
  const slots = [], effects = [];
  let index = 0;
  const same = (a, b) => a && a.length === b.length && a.every((v, n) => Object.is(v, b[n]));
  const memo = (factory, deps) => {
    const n = index++;
    if (!slots[n] || !same(slots[n].deps, deps)) slots[n] = { value: factory(), deps };
    return slots[n].value;
  };
  let expire;
  const { AuthProvider } = load('src/hooks/AuthContext.tsx', {
    react: {
      createContext: () => ({ Provider() {} }), useContext() {},
      useState(value) { const n = index++; slots[n] ??= { value }; return [slots[n].value, next => { slots[n].value = next; }]; },
      useRef(value) { const n = index++; slots[n] ??= { current: value }; return slots[n]; },
      useCallback: (fn, deps) => memo(() => fn, deps), useMemo: memo,
      useEffect(fn, deps) { const n = index++; if (!slots[n] || !same(slots[n].deps, deps)) { slots[n] = { deps }; effects.push(fn); } },
    },
    'react/jsx-runtime': { jsx: (_type, props) => ({ props }) },
    '../utils/authHelper': { setGlobalSignOut: fn => { expire = fn; } },
    '../services/api': { get: getProfile }, '../services/secureStorage': store.methods,
    '../services/users': { logout: async () => { store.state.remoteLogout++; } },
    '../utils/sessionErrors': sessionErrors,
  });
  function context() { index = 0; return AuthProvider({ children: null }).props.value; }
  context(); effects.splice(0).forEach(fn => fn());
  return { context, expire: () => expire() };
}

test('perfil 503 no início preserva sessão; botão de nova tentativa restaura o usuário', async () => {
  const store = storage();
  let available = false, calls = 0;
  const h = provider(store, async (_url, options) => {
    calls++;
    assert.equal(options.timeout, 10000);
    if (!available) throw { response: { status: 503 } };
    return { data: { id: 'synthetic-user' } };
  });
  await h.context().retrySession();
  assert.equal(h.context().loading, false);
  assert.ok(h.context().sessionError);
  assert.equal(store.state.removed, 0);
  assert.equal(store.state.remoteLogout, 0);
  available = true;
  const one = h.context().retrySession();
  const two = h.context().retrySession();
  assert.equal(one, two);
  await one;
  assert.equal(h.context().user.id, 'synthetic-user');
  assert.equal(h.context().sessionError, null);
  assert.equal(calls, 2);
  assert.equal(store.state.removed, 0);
});

test('perfil com timeout/rede preserva sessão; 401 limpa localmente sem revogar no servidor', async () => {
  for (const failure of [{ code: 'ECONNABORTED' }, { code: 'ERR_NETWORK' }, { response: { status: 401 } }]) {
    const store = storage();
    const h = provider(store, async () => { throw failure; });
    await h.context().retrySession();
    const invalid = failure.response?.status === 401;
    assert.equal(store.state.removed, invalid ? 1 : 0);
    assert.equal(store.state.remoteLogout, 0);
    assert.equal(Boolean(h.context().sessionError), !invalid);
    assert.equal(h.context().loading, false);
  }
});

test('sessão com apenas refresh é consultada; ausência de credenciais abre fluxo público', async () => {
  for (const refresh of ['old-refresh', null]) {
    const store = storage(null, refresh);
    let calls = 0;
    const h = provider(store, async () => { calls++; return { data: { id: 'synthetic-user' } }; });
    await h.context().retrySession();
    assert.equal(calls, refresh ? 1 : 0);
    assert.equal(h.context().user?.id ?? null, refresh ? 'synthetic-user' : null);
    assert.equal(h.context().sessionError, null);
  }
});

test('falha de leitura no armazenamento permite recuperar a sessão em nova tentativa', async () => {
  const store = storage();
  let readable = false;
  store.methods.getAuthToken = async () => {
    if (!readable) throw new Error('Storage unavailable');
    return store.state.access;
  };
  const h = provider(store, async () => ({ data: { id: 'synthetic-user' } }));
  await h.context().retrySession();
  assert.ok(h.context().sessionError);
  assert.equal(store.state.removed, 0);
  readable = true;
  await h.context().retrySession();
  assert.equal(h.context().user.id, 'synthetic-user');
  assert.equal(h.context().sessionError, null);
});

test('logout escolhido pelo usuário continua revogando e removendo a sessão', async () => {
  const store = storage();
  const h = provider(store, async () => ({ data: { id: 'synthetic-user' } }));
  await h.context().retrySession();
  await h.context().signOut();
  assert.equal(store.state.remoteLogout, 1);
  assert.equal(store.state.removed, 1);
  assert.equal(h.context().user, null);
});

test('resposta de perfil atrasada não restaura usuário depois de encerrar a sessão', async () => {
  const store = storage();
  let release;
  const h = provider(store, () => new Promise(resolve => { release = resolve; }));
  const pending = h.context().retrySession();
  await new Promise(resolve => setImmediate(resolve));
  await h.context().signOut();
  release({ data: { id: 'synthetic-user' } });
  await pending;
  assert.equal(h.context().user, null);
  assert.equal(h.context().loading, false);
});

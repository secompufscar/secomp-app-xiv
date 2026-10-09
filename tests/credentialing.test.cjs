const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');

function load(relative, dependencies) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src', relative), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, console: { error() {} }, require(name) { assert.ok(name in dependencies, `Unmocked dependency: ${name}`); return dependencies[name]; } });
  return module.exports;
}

const category = { id: 'category-checkin', nome: 'Credenciamento', slug: 'credenciamento' };
const current = { id: 'new-id', nome: 'Recepção renomeada', categoriaId: category.id, eventId: 'current-event' };
function service({ event = { id: 'current-event', year: 2027 }, activities = [current], categories = [category], failActivities } = {}) {
  const calls = [];
  const implementation = load('services/credentialing.ts', {
    './events': { getCurrentEvent: async () => { calls.push('event'); return event; } },
    './activities': { getActivities: async () => { calls.push('activities'); if (failActivities) throw failActivities; return activities; } },
    './categories': { getCategories: async () => { calls.push('categories'); return categories; } },
  });
  return { ...implementation, calls };
}

test('atalho resolve o ID atual pela edição/categoria, mesmo com nome e ano diferentes', async () => {
  const s = service({ activities: [{ ...current, id: 'historical', eventId: 'old-event' }, { ...current, id: 'unlinked', eventId: undefined }, { ...current, id: 'wrong-category', categoriaId: 'talk' }, current] });
  assert.equal((await s.getCurrentCredentialingActivity()).id, current.id);
  assert.deepEqual(s.calls.sort(), ['activities', 'categories', 'event']);
});

test('categoria embutida ou slug de credenciamento específico identifica atividade', () => {
  const s = service();
  for (const candidate of [{ ...category, nome: 'Recepção', slug: 'credenciamento-geral' }, { ...category, nome: ' CREDENCIAMENTO ', slug: 'recepcao' }]) {
    assert.equal(s.findCredentialingActivity('current-event', [{ ...current, categoria: candidate }], []).id, current.id);
  }
});

test('sem edição ou sem credenciamento atual não abre atividade histórica', async () => {
  const noEvent = service({ event: null });
  await assert.rejects(noEvent.getCurrentCredentialingActivity(), /Nenhuma edição atual/);
  assert.deepEqual(noEvent.calls, ['event']);
  const historical = service({ activities: [{ ...current, eventId: 'old-event' }] });
  await assert.rejects(historical.getCurrentCredentialingActivity(), /Nenhuma atividade de credenciamento/);
});

test('duplicidade na edição orienta seleção pelo cronograma', async () => {
  const s = service({ activities: [current, { ...current, id: 'another' }] });
  await assert.rejects(s.getCurrentCredentialingActivity(), /mais de uma.*cronograma/);
});

test('falha temporária na consulta não reutiliza um ID anterior', async () => {
  const error = { response: { status: 503 } };
  const s = service({ failActivities: error });
  await assert.rejects(s.getCurrentCredentialingActivity(), value => value === error);
});

function screen(resolveCredentialing, canUseAdminTools = true) {
  const slots = [], cleanup = [], navigation = [];
  let cursor = 0;
  const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
  const noop = () => null;
  const deps = {
    react: {
      useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, next => { slots[index].value = next; }]; },
      useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
      useCallback(fn) { return fn; },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ...Object.fromEntries(['View', 'Text', 'Pressable', 'StatusBar', 'ScrollView', 'ActivityIndicator'].map(key => [key, key])), Platform: { OS: 'web' } },
    'react-native-safe-area-context': { SafeAreaView: 'View' },
    '@react-navigation/native': { useNavigation: () => ({ navigate: (...args) => navigation.push(args) }), useFocusEffect(fn) { if (!cleanup.length) cleanup.push(fn()); } },
    'beautiful-name': { BeautifulName: class { constructor(nome) { this.beautifulName = nome; } } },
    '@fortawesome/react-native-fontawesome': { FontAwesomeIcon: noop }, '@fortawesome/free-solid-svg-icons': {},
    '../../hooks/AuthContext': { useAuth: () => ({ user: { id: 'admin-test', nome: 'Admin', tipo: 'ADMIN' }, updateUser: async () => {}, signOut() {}, canUseAdminTools }) },
    '../../services/users': { getProfile: async () => ({ id: 'admin-test', nome: 'Admin', tipo: 'ADMIN' }) },
    '../../services/userEvents': { getRegistrationByUserIdAndEventId: async () => null },
    '../../services/events': { getCurrentEvent: async () => null },
    '../../services/credentialing': { CredentialingError: service().CredentialingError, getCurrentCredentialingActivity: resolveCredentialing },
    '../../styles/colors': { colors: { blue: { 200: '#000', 500: '#000' } } },
    '../../components/app/participantViewToggle': { __esModule: true, default: () => null },
    '../../components/button/backButton': noop, '../../components/button/editButton': noop,
    '../../components/button/profileButton': props => jsx('Menu', props),
    '../../components/overlay/confirmationOverlay': noop, '../../components/overlay/errorOverlay': props => props.visible ? jsx('Error', props) : null,
  };
  const implementation = load('screens/profile/adminProfileScreen.tsx', deps);
  function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
  function render() { cursor = 0; return nodes(implementation.default()); }
  render();
  return { navigation, button: (label = 'Credenciamento') => render().find(node => node.type === 'Menu' && (node.props.label === label || node.props.busy)), errors: () => render().filter(node => node.type === 'Error'), leave: () => cleanup[0]() };
}

test('atalho da lista usa o credenciamento atual e passa ID/nome para Participantes', async () => {
  const view = screen(async () => current);
  await view.button('Participantes do credenciamento').props.onPress();
  assert.equal(JSON.stringify(view.navigation), JSON.stringify([['ParticipantsList', { activityId: current.id, activityName: current.nome }]]));
});

test('menu de todos os participantes abre diretório sem exigir vínculo de credenciamento', () => {
  const view = screen(() => { throw new Error('Must not resolve credentialing to open directory'); });
  view.button('Todos os participantes').props.onPress();
  assert.equal(JSON.stringify(view.navigation), JSON.stringify([['ParticipantDirectory']]));
});

test('clique duplicado é bloqueado enquanto resolve e navega com o ID recebido', async () => {
  let release, calls = 0;
  const view = screen(() => { calls++; return new Promise(resolve => { release = resolve; }); });
  const onPress = view.button().props.onPress;
  const pending = onPress(); await onPress();
  assert.equal(calls, 1); assert.equal(view.button().props.disabled, true);
  release(current); await pending;
  assert.equal(JSON.stringify(view.navigation), JSON.stringify([['QRCode', { id: current.id }]]));
  assert.equal(view.button().props.disabled, false);
});

test('503 mostra aviso, não navega e permite nova tentativa', async () => {
  let fail = true;
  const view = screen(async () => { if (fail) throw { response: { status: 503 } }; return current; });
  await view.button().props.onPress();
  assert.equal(view.navigation.length, 0); assert.match(view.errors()[0].props.message, /Tente novamente/);
  fail = false; await view.button().props.onPress();
  assert.equal(view.errors().length, 0); assert.equal(view.navigation[0][1].id, current.id);
});

test('sair da tela descarta resposta atrasada e impede abertura do leitor', async () => {
  let release;
  const view = screen(() => new Promise(resolve => { release = resolve; }));
  const pending = view.button().props.onPress(); view.leave(); release(current); await pending;
  assert.equal(view.navigation.length, 0); assert.equal(view.errors().length, 0);
});

test('sem ferramentas administrativas o handler não consulta nem navega', async () => {
  let calls = 0;
  const view = screen(async () => { calls++; return current; }, false);
  await view.button().props.onPress();
  assert.equal(calls, 0); assert.equal(view.navigation.length, 0);
});

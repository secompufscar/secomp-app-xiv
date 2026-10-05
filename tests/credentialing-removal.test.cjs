const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, console: { error() {} }, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return module.exports;
}
const dialog = load('components/overlay/credentialingRemovalDialog.tsx', {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { ...Object.fromEntries(['KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name])), Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 320, height: 640 }) },
  '../../styles/colors': { colors: { blue: { 900: '#000' } } },
});
const credentialing = load('services/credentialing.ts', { './activities': {}, './categories': {}, './events': {} });
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
const settle = () => new Promise(resolve => setImmediate(resolve));

test('nome completo exige caixa e acentos, ignora somente espaços externos e aceita Unicode equivalente', () => {
  for (const value of ['', 'Ana', 'Ana Maria', 'ana María']) assert.equal(dialog.matchesParticipantName(value, 'Ana María'), false);
  assert.equal(dialog.matchesParticipantName(' Ana Mari\u0301a ', 'Ana María'), true);
  assert.equal(dialog.matchesParticipantName('', ''), false);
});

test('diálogo não confirma com nome incompleto ou durante envio, mesmo chamando handler diretamente', () => {
  let calls = 0;
  for (const [typedName, busy, expected] of [['Ana', false, 0], ['Ana María', true, 0], ['Ana María', false, 1]]) {
    const tree = dialog.default({ name: 'Ana María', typedName, busy, error: null, onChangeName() {}, onCancel() {}, onConfirm() { calls++; } });
    const button = nodes(tree).find(node => node.props?.accessibilityLabel === 'Confirmar exclusão do credenciamento');
    button.props.onPress(); assert.equal(calls, expected);
  }
});

function screen({ category = 'credenciamento', platform = 'web', admin = true, remove, failReload = false } = {}) {
  const slots = [], writes = [], cleanups = [];
  let cursor = 0, queries = 0;
  let rows = [
    { id: 'row-a', userId: 'person-a', user: { id: 'person-a', nome: 'Ana María' }, activityId: 'checkin-test', presente: true, createdAt: '2026-10-05T09:00:00Z' },
    { id: 'row-b', userId: 'person-b', user: { id: 'person-b', nome: 'Bruno Silva' }, activityId: 'checkin-test', presente: true, createdAt: '2026-10-05T09:01:00Z' },
  ];
  const deps = {
    react: {
      useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, next => { slots[index].value = typeof next === 'function' ? next(slots[index].value) : next; }]; },
      useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; }, useCallback(fn) { return fn; },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ...Object.fromEntries(['View', 'Text', 'ActivityIndicator', 'StatusBar', 'Pressable'].map(name => [name, name])), Platform: { OS: platform }, FlatList: props => jsx('View', { children: props.data.map(item => props.renderItem({ item })) }) },
    'react-native-safe-area-context': { SafeAreaView: 'View' },
    '@react-navigation/native': { useRoute: () => ({ params: { activityId: 'checkin-test', activityName: 'Recepção' } }), useFocusEffect(fn) { if (!cleanups.length) cleanups.push(fn()); } },
    '../../services/userAtActivities': {
      getParticipantsByActivity: async () => { queries++; if (failReload && queries > 1) throw new Error('reload'); return rows; },
      unsubscribeToActivity: async (userId, activityId) => { writes.push([userId, activityId]); if (remove) await remove(); rows = rows.filter(row => row.userId !== userId); },
    },
    '../../services/activities': { getActivityId: async () => ({ categoriaId: 'category-test' }) },
    '../../services/categories': { getCategories: async () => [{ id: 'category-test', nome: category, slug: category }] },
    '../../services/credentialing': credentialing,
    '../../hooks/AuthContext': { useAuth: () => ({ canUseAdminTools: admin }) },
    '../../components/overlay/credentialingRemovalDialog': { __esModule: true, ...dialog, default: props => jsx('Dialog', props) },
    '../../services/users': { getUserDetails: () => { throw new Error('Already has name'); } },
    '../../styles/colors': { colors: { blue: { 500: '#000' } } },
    '../../components/button/backButton': () => null, '@expo/vector-icons/FontAwesome6': () => null,
  };
  const implementation = load('screens/participants/participantsListScreen.tsx', deps);
  const render = () => { cursor = 0; return nodes(implementation.default()); };
  render();
  return {
    render, writes, get queries() { return queries; }, leave: () => cleanups[0](),
    buttons: () => render().filter(node => /^Excluir .+ do credenciamento$/.test(node.props?.accessibilityLabel || '')),
    dialog: () => render().find(node => node.type === 'Dialog'),
  };
}

test('exclusão precisa do nome completo, usa somente o par usuário/atividade e recarrega totais', async () => {
  const view = screen(); await settle();
  view.buttons()[0].props.onPress();
  await view.dialog().props.onConfirm(); assert.equal(view.writes.length, 0);
  view.dialog().props.onChangeName('Ana'); await view.dialog().props.onConfirm(); assert.equal(view.writes.length, 0);
  view.dialog().props.onChangeName('Ana María'); await view.dialog().props.onConfirm();
  assert.equal(JSON.stringify(view.writes), JSON.stringify([['person-a', 'checkin-test']]));
  assert.equal(view.buttons().length, 1); assert.equal(view.queries, 2); assert.equal(view.dialog(), undefined);
});

test('cancelar e selecionar outra pessoa não reaproveita confirmação', async () => {
  const view = screen(); await settle();
  view.buttons()[0].props.onPress(); view.dialog().props.onChangeName('Ana María'); view.dialog().props.onCancel();
  view.buttons()[1].props.onPress(); assert.equal(view.dialog().props.typedName, '');
  await view.dialog().props.onConfirm(); assert.equal(view.writes.length, 0);
});

test('exclusão fica oculta em outras categorias, no mobile e sem ferramentas de admin', async () => {
  for (const scenario of [{ category: 'palestra' }, { platform: 'android' }, { admin: false }]) {
    const view = screen(scenario); await settle(); assert.equal(view.buttons().length, 0); assert.equal(view.writes.length, 0);
  }
});

test('clique repetido envia uma única exclusão e erro preserva nome/vínculo para repetir', async () => {
  let reject;
  const view = screen({ remove: () => new Promise((_, fail) => { reject = fail; }) }); await settle();
  view.buttons()[0].props.onPress(); view.dialog().props.onChangeName('Ana María');
  const confirm = view.dialog().props.onConfirm, pending = confirm(); await confirm();
  assert.equal(view.writes.length, 1); reject({ response: { status: 503 } }); await pending;
  assert.equal(view.dialog().props.typedName, 'Ana María'); assert.match(view.dialog().props.error, /Tente novamente/); assert.equal(view.buttons().length, 2);
});

test('recarga que falha após sucesso oferece nova consulta sem repetir DELETE', async () => {
  const view = screen({ failReload: true }); await settle();
  view.buttons()[0].props.onPress(); view.dialog().props.onChangeName('Ana María'); await view.dialog().props.onConfirm();
  assert.ok(view.render().some(node => typeof node.props?.children === 'string' && node.props.children.includes('Exclusão concluída, mas')));
  assert.equal(view.writes.length, 1); assert.equal(view.dialog(), undefined);
});

test('resultado após sair da tela não restaura diálogo nem recarrega lista antiga', async () => {
  let release;
  const view = screen({ remove: () => new Promise(resolve => { release = resolve; }) }); await settle();
  view.buttons()[0].props.onPress(); view.dialog().props.onChangeName('Ana María'); const pending = view.dialog().props.onConfirm();
  view.leave(); release(); await pending; assert.equal(view.queries, 1); assert.equal(view.dialog(), undefined);
});

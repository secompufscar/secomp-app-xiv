const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } }); return module.exports;
}
const service = load('services/participantDirectory.ts', { './api': { __esModule: true, default: {} } });
test('horário do credenciamento usa timestamp real em São Paulo, preservando data desconhecida', () => {
  assert.match(service.formatCredentialingDate('2026-10-06T12:30:00Z'), /06\/10\/2026.*09:30/);
  for (const date of [null, 'invalid']) assert.equal(service.formatCredentialingDate(date), 'Data do credenciamento não disponível');
});
const settle = () => new Promise(resolve => setImmediate(resolve));
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
const response = page => ({ page, pageSize: 50, total: 51, credentialedCount: 20, notCredentialedCount: 31, event: { id: 'event', year: 2026 }, users: [
  { id: 'green', nome: 'Ana', email: 'ana@example.invalid', credentialed: true, credentialedAt: '2026-10-06T12:30:00Z' },
  { id: 'red', nome: 'Bruno', email: 'bruno@example.invalid', credentialed: false, credentialedAt: null },
] });
function screen(query = async page => response(page), { admin = true, platform = 'web' } = {}) {
  const slots = [], calls = [], effects = []; let cursor = 0, lastFocus;
  const implementation = load('screens/participants/participantDirectoryScreen.tsx', {
    react: {
      useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
      useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i]; },
      useCallback(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) slots[i] = { deps, fn }; return slots[i].fn; },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'View' },
    'react-native': { ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'Text', 'TextInput', 'View', 'ScrollView'].map(name => [name, name])), Platform: { OS: platform } },
    'react-native-safe-area-context': { SafeAreaView: 'View' },
    '@react-navigation/native': { useFocusEffect(fn) { if (lastFocus?.fn !== fn) { lastFocus?.cleanup?.(); lastFocus = { fn }; const target = lastFocus; effects.push(() => { target.cleanup = fn(); }); } } },
    '../../hooks/AuthContext': { useAuth: () => ({ canUseAdminTools: admin }) },
    '../../services/participantDirectory': { ...service, getParticipantDirectory: (...args) => { calls.push(args); return query(...args); } },
    '../../components/overlay/userAttendanceDialog': { __esModule: true, default: props => jsx('History', props) },
    '../../components/button/backButton': { __esModule: true, default: () => null },
    '../../styles/colors': { colors: { success: 'green', danger: 'red' } },
  });
  const render = () => { cursor = 0; const tree = nodes(implementation.default()); while (effects.length) effects.shift()(); return tree; };
  render();
  return { render, calls, button: label => render().find(node => node.props?.accessibilityLabel === label), leave: () => lastFocus.cleanup?.() };
}
const text = view => view.render().filter(node => node.type === 'Text').map(node => node.props.children).flat().join(' ').replace(/\s+/g, ' ');
test('lista geral mostra verde/vermelho e consulta histórico inclusive de quem não foi credenciado', async () => {
  const view = screen(); await settle();
  assert.equal(view.button('Ana: Credenciado').props.style.borderColor, 'green'); assert.equal(view.button('Bruno: Não credenciado').props.style.borderColor, 'red');
  assert.match(text(view), /06\/10\/2026.*09:30/);
  view.button('Ver atividades com presença de Bruno').props.onPress();
  assert.equal(view.render().find(node => node.type === 'History').props.userId, 'red');
  view.render().find(node => node.type === 'History').props.onClose(); assert.equal(view.render().some(node => node.type === 'History'), false);
});
test('busca por nome/e-mail, filtros e paginação usam a consulta selecionada', async () => {
  const view = screen(); await settle();
  view.button('Próxima página').props.onPress(); view.render(); await settle(); assert.deepEqual(view.calls.at(-1), [2, '', 'all']);
  view.button('Buscar participante por nome ou e-mail').props.onChangeText('  Ana  '); view.button('Buscar participantes').props.onPress(); view.render(); await settle(); assert.deepEqual(view.calls.at(-1), [1, 'Ana', 'all']);
  view.button('Não credenciados').props.onPress(); view.render(); await settle(); assert.deepEqual(view.calls.at(-1), [1, 'Ana', 'no']);
});
test('erro mostra retry sem exibir lista antiga ou atribuir falso vermelho; resposta após sair é descartada', async () => {
  let fail = true;
  const view = screen(async page => { if (fail) throw new Error('503'); return response(page); }); await settle();
  assert.match(text(view), /Não foi possível carregar/); assert.equal(view.button('Bruno: Não credenciado'), undefined);
  fail = false; await view.button('Tentar carregar participantes novamente').props.onPress(); await settle(); assert.ok(view.button('Bruno: Não credenciado'));
  let done; const late = screen(() => new Promise(resolve => { done = resolve; })); late.leave(); done(response(1)); await settle(); assert.equal(late.button('Ana: Credenciado'), undefined);
});
test('participante, prévia de admin e mobile não carregam a lista geral', () => {
  for (const options of [{ admin: false }, { platform: 'android' }]) { const view = screen(undefined, options); assert.deepEqual(view.calls, []); assert.deepEqual(view.render(), []); }
});

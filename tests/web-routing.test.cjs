const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const getStateFromPath = require('../node_modules/@react-navigation/core/lib/commonjs/getStateFromPath').default;
const getPathFromState = require('../node_modules/@react-navigation/core/lib/commonjs/getPathFromState').default;
function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(name) { assert.ok(name in dependencies, `Unmocked ${name}`); return dependencies[name]; } });
  return module.exports;
}
const { createWebLinking } = load('routes/webLinking.ts', { '@react-navigation/native': { getStateFromPath } });
const focus = state => { let route = state?.routes.at(-1); while (route?.state) route = route.state.routes.at(-1); return route; };
test('URLs de abas e telas autenticadas restauram a tela, em vez de iniciar no Home', () => {
  const linking = createWebLinking(true, true, false);
  for (const url of ['/App/Cronograma', '/App/Activities', '/App/AdminPerfil', '/ParticipantDirectory', '/Schedule', '/Notifications', '/MyEvents', '/Ranking', '/Sponsors', '/ActivityRaffleLists', '/ActivityAdminUpdate?id=activity-test', '/EventAdminUpdate?id=event-test', '/SponsorsAdminUpdate?id=sponsor-test', '/QRCode?id=activity-test', '/ParticipantsList?activityId=activity-test&activityName=Palestra%20teste']) {
    const state = linking.getStateFromPath(url, linking.config);
    assert.ok(state, url);
    const restored = linking.getStateFromPath(getPathFromState(state, linking.config), linking.config);
    assert.equal(focus(restored).name, focus(state).name, url);
    assert.equal(JSON.stringify(focus(restored).params), JSON.stringify(focus(state).params), url);
    assert.equal(state.routes[0].name, 'App'); // Back remains available on direct stack URLs.
  }
});
test('detalhes usam ID estável na URL, sem serializar o objeto, descrição ou nome', () => {
  const linking = createWebLinking(true, false, false);
  const url = getPathFromState({ routes: [{ name: 'ActivityDetails', params: { item: { id: 'activity-test', nome: 'Nome privado', detalhes: 'Descrição' } } }] }, linking.config);
  assert.equal(url, '/ActivityDetails?item=activity-test');
  const restored = focus(linking.getStateFromPath(url, linking.config));
  assert.equal(restored.params.item.id, 'activity-test');
  assert.equal(restored.params.item.nome, undefined);
});
test('links administrativos só são reconhecidos na sessão com ferramentas de admin', () => {
  for (const linking of [createWebLinking(false, false, false), createWebLinking(true, false, false), createWebLinking(true, false, true)]) {
    for (const url of ['/App/AdminPerfil', '/ParticipantDirectory', '/QRCode?id=test', '/ActivityAdminUpdate?id=test']) assert.equal(linking.getStateFromPath(url, linking.config), undefined);
  }
  const participant = createWebLinking(true, false, false);
  assert.equal(focus(participant.getStateFromPath('/App/Perfil', participant.config)).name, 'Perfil');
  const preview = createWebLinking(true, false, true);
  assert.equal(preview.getStateFromPath('/EditProfile', preview.config), undefined);
});
test('links públicos conservam recuperação de senha e parâmetros ao recarregar', () => {
  const linking = createWebLinking(false, false, false);
  const route = focus(linking.getStateFromPath('/SetNewPassword?token=diagnostic-invalid-token', linking.config));
  assert.equal(route.name, 'SetNewPassword'); assert.equal(route.params.token, 'diagnostic-invalid-token');
  for (const name of ['Welcome', 'SignUp', 'Login', 'PasswordReset', 'VerifyEmail', 'EmailConfirmation']) assert.equal(focus(linking.getStateFromPath('/' + name, linking.config)).name, name);
});
test('URLs antigas sem identificador recuperável e telas inválidas não abrem com dados quebrados', () => {
  const linking = createWebLinking(true, true, false);
  for (const url of ['/ActivityDetails?item=%5Bobject%20Object%5D', '/ActivityDetails', '/ParticipantsList', '/QRCode', '/ActivityAdminUpdate', '/EventAdminUpdate', '/SponsorsAdminUpdate', '/TelaInexistente']) assert.equal(linking.getStateFromPath(url, linking.config), undefined, url);
});

function activityRoute(initialItem, fetch) {
  let item = initialItem, cursor = 0;
  const slots = [], pending = [];
  const jsx = (type, props) => ({ type, props });
  const Content = () => null;
  const component = load('screens/activity-details/activityDetailsRouteScreen.tsx', {
    react: {
      useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
      useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) { slots[i]?.cleanup?.(); slots[i] = { deps }; pending.push(() => { slots[i].cleanup = fn(); }); } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@react-navigation/native': { useRoute: () => ({ params: { item } }) },
    'react-native': { View: 'View', Text: 'Text', ActivityIndicator: 'Loading' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    '../../components/button/button': { default: 'Button' }, '../../components/button/backButton': { default: 'Back' },
    '../../services/activities': { getActivityId: fetch }, './activityDetailsScreen': { default: Content },
  }).default;
  return { Content, setItem(value) { item = value; }, render() { cursor = 0; const tree = component(); pending.splice(0).forEach(fn => fn()); return tree; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
test('recarregamento busca a atividade por ID e mantém erro temporário na mesma tela com retry', async () => {
  let available = false; const calls = [];
  const view = activityRoute({ id: 'activity-test' }, async id => { calls.push(id); if (!available) throw Error('503'); return { id, nome: 'Atividade', data: '2026-10-07T17:00:00Z' }; });
  assert.ok(nodes(view.render()).some(node => node.type === 'Loading'));
  await settle(); const error = view.render();
  assert.ok(nodes(error).some(node => node.props.accessibilityRole === 'alert'));
  available = true; nodes(error).find(node => node.type === 'Button').props.onPress();
  view.render(); await settle(); const loaded = view.render();
  assert.equal(loaded.type, view.Content); assert.equal(loaded.props.activity.id, 'activity-test');
  assert.deepEqual(calls, ['activity-test', 'activity-test']);
});
test('resposta atrasada de outra atividade não substitui a rota atual', async () => {
  const responses = {};
  const view = activityRoute({ id: 'first' }, id => new Promise(resolve => { responses[id] = resolve; }));
  view.render(); view.setItem({ id: 'second' }); view.render();
  responses.second({ id: 'second', nome: 'Segunda', data: '2026-10-07T17:00:00Z' }); await settle();
  responses.first({ id: 'first', nome: 'Primeira', data: '2026-10-07T17:00:00Z' }); await settle();
  assert.equal(view.render().props.activity.id, 'second');
});
test('navegação existente com objeto completo e edição mantém dados sem fetch extra', () => {
  const view = activityRoute({ id: 'test', nome: 'Original', data: '2026-10-07T17:00:00Z' }, () => { throw Error('Unexpected fetch'); });
  assert.equal(view.render().props.activity.nome, 'Original');
  view.setItem({ id: 'test', nome: 'Atualizada', data: '2026-10-07T17:00:00Z' });
  assert.equal(view.render().props.activity.nome, 'Atualizada');
});

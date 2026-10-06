const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return module.exports;
}
function service(query) {
  return load('services/userAttendance.ts', { './userAtActivities': { getUserSubscribedActivities: query } });
}
const activity = (id, data) => ({ id, nome: `Atividade ${id}`, data, local: 'Auditório' });
const row = (id, presente, data) => ({ id: `row-${id}`, userId: 'person-a', activityId: id, presente, activity: activity(id, data) });

test('histórico consulta somente a pessoa escolhida e inclui presenças de edições anteriores, nunca inscrições/espera', async () => {
  const calls = [];
  const s = service(async id => { calls.push(id); return [row('old', true, '2024-10-01T12:00:00Z'), row('saved', false, '2026-10-01T12:00:00Z'), { ...row('waiting', false, '2026-10-02T12:00:00Z'), listaEspera: true }, row('new', true, '2026-10-03T12:00:00Z')]; });
  assert.equal(JSON.stringify((await s.getUserAttendedActivities('person-a')).map(a => a.id)), JSON.stringify(['new', 'old']));
  assert.deepEqual(calls, ['person-a']);
});

test('falha na consulta ou dados incompletos/de outra pessoa não viram histórico vazio ou incorreto', async () => {
  const failure = { response: { status: 503 } };
  await assert.rejects(service(async () => { throw failure; }).getUserAttendedActivities('person-a'), error => error === failure);
  for (const rows of [null, [{ ...row('a', true, null), userId: 'person-b' }], [{ ...row('a', true, null), activity: undefined }], [{ ...row('a', true, null), presente: 'true' }]]) {
    await assert.rejects(service(async () => rows).getUserAttendedActivities('person-a'));
  }
  assert.equal((await service(async () => [row('saved', false, null)]).getUserAttendedActivities('person-a')).length, 0);
});

test('horário acompanha os componentes usados no cronograma, sem quebrar para data ausente/inválida', () => {
  const s = service(async () => []);
  assert.match(s.formatActivityDate('2026-10-05T09:30:00Z'), /05\/10\/2026.*09:30/);
  for (const date of [null, '', 'invalid']) assert.equal(s.formatActivityDate(date), 'Horário não informado');
});

const settle = () => new Promise(resolve => setImmediate(resolve));
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
function dialog(query, { admin = true, platform = 'web' } = {}) {
  const slots = [], pending = [], calls = [];
  let cursor = 0, props = { userId: 'person-a', name: 'Ana María', onClose() {} };
  const s = service(async () => []);
  const implementation = load('components/overlay/userAttendanceDialog.tsx', {
    react: {
      useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, next => { slots[index].value = typeof next === 'function' ? next(slots[index].value) : next; }]; },
      useEffect(fn, deps) { const index = cursor++; const previous = slots[index]; if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) { previous?.cleanup?.(); const slot = { deps }; slots[index] = slot; pending.push(() => { slot.cleanup = fn(); }); } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ...Object.fromEntries(['ActivityIndicator', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map(name => [name, name])), Platform: { OS: platform }, useWindowDimensions: () => ({ width: 320, height: 640 }) },
    '../../hooks/AuthContext': { useAuth: () => ({ canUseAdminTools: admin }) },
    '../../services/userAttendance': { ...s, getUserAttendedActivities: id => { calls.push(id); return query(id); } },
    '../../styles/colors': { colors: { blue: { 900: '#000' } } },
  });
  const render = () => { cursor = 0; const tree = nodes(implementation.default(props)); while (pending.length) pending.shift()(); return tree; };
  render();
  return { render, calls, setUser(id, name) { props = { ...props, userId: id, name }; render(); }, close() { slots.forEach(slot => slot.cleanup?.()); } };
}
const text = view => view.render().filter(node => node.type === 'Text').map(node => node.props.children).flat().join(' ').replace(/\s+/g, ' ');

test('diálogo mostra carregamento, total e presenças; permite fechar durante consulta sem reabrir depois', async () => {
  let resolve;
  const view = dialog(() => new Promise(done => { resolve = done; }));
  assert.ok(view.render().some(node => node.type === 'ActivityIndicator'));
  assert.ok(view.render().some(node => node.props?.accessibilityLabel === 'Fechar atividades com presença'));
  resolve([activity('talk', null)]); await settle();
  assert.match(text(view), /1 atividade com presença registrada.*Atividade talk/);
  assert.deepEqual(view.calls, ['person-a']);
  let finish;
  const closed = dialog(() => new Promise(done => { finish = done; })); closed.close(); finish([activity('old', null)]); await settle();
  assert.ok(closed.render().some(node => node.type === 'ActivityIndicator'));
});

test('503 mostra erro com retry, sem afirmar ausência de presenças; resposta vazia confirmada tem estado próprio', async () => {
  let attempts = 0;
  const view = dialog(async () => { if (++attempts === 1) throw new Error('503'); return []; }); await settle();
  assert.match(text(view), /Não foi possível carregar/); assert.doesNotMatch(text(view), /Nenhuma presença/);
  view.render().find(node => node.props?.accessibilityLabel === 'Tentar carregar presenças novamente').props.onPress(); view.render(); await settle();
  assert.match(text(view), /Nenhuma presença registrada/); assert.deepEqual(view.calls, ['person-a', 'person-a']);
});

test('resposta tardia da pessoa anterior não substitui histórico da pessoa selecionada', async () => {
  let old;
  const view = dialog(id => id === 'person-a' ? new Promise(done => { old = done; }) : Promise.resolve([activity('bruno', null)]));
  view.setUser('person-b', 'Bruno Silva'); await settle(); old([activity('ana', null)]); await settle();
  assert.match(text(view), /Bruno Silva.*Atividade bruno/); assert.doesNotMatch(text(view), /Atividade ana/);
});

test('sem ferramentas de admin, inclusive prévia, e no mobile não consulta nem renderiza histórico', () => {
  for (const options of [{ admin: false }, { platform: 'android' }]) {
    const view = dialog(async () => { throw new Error('Forbidden'); }, options); assert.deepEqual(view.calls, []); assert.deepEqual(view.render(), []);
  }
});

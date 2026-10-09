const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Render the real screen with controlled hooks and API responses, without network.
function screen({ role = 'ADMIN', platform = 'web', enrollment = false, capacity = 50, missingCategory = false, summary, participantView = false } = {}) {
  const slots = [], effects = [], calls = [], writes = [];
  let cursor = 0;
  const category = { id: 'category-test', nome: 'Teste', slug: 'teste', requiresEnrollment: enrollment };
  const activity = { id: 'activity-test', nome: 'Atividade fictícia', data: '2026-10-04T12:00:00Z', vagas: capacity, categoriaId: category.id, categoria: missingCategory ? undefined : category };
  const user = { id: 'user-test', tipo: role };
  const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
  const noop = () => null;
  const dependencies = {
    react: {
      useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, next => { slots[index].value = next; }]; },
      useEffect(fn, deps) { const index = cursor++; if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) { slots[index] = { deps }; effects.push(fn); } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': Object.fromEntries(['View', 'Text', 'Pressable', 'ActivityIndicator', 'StatusBar', 'ScrollView', 'Image', 'ImageBackground'].map(key => [key, key])),
    'react-native-safe-area-context': { SafeAreaView: 'View' },
    '@react-navigation/native': { useRoute: () => ({ params: { item: activity } }), useNavigation: () => ({ navigate() {}, setParams() {} }) },
    '@fortawesome/react-native-fontawesome': { FontAwesomeIcon: noop }, '@fortawesome/free-solid-svg-icons': {},
    '../../hooks/AuthContext': { useAuth: () => ({ user, canUseAdminTools: role === 'ADMIN' && !participantView, isParticipantView: participantView }) },
    '../../services/userAtActivities': {
      getActivityEnrollmentSummary: async id => { calls.push(id); return summary ? summary() : { occupiedCount: 20, waitlistCount: 2, waitlistPosition: null }; },
      userSubscription: async () => ({ inscricaoPrevia: false, listaEspera: false }), subscribeToActivity: () => writes.push('subscribe'), unsubscribeToActivity: () => writes.push('unsubscribe'),
    },
    '../../services/activityImage': { getImagesByActivityId: async () => [] },
    '../../services/categories': { getCategories: async () => { throw new Error('Simulated category outage'); } },
    '../../components/app/participantViewToggle': { __esModule: true, default: () => null },
    '../../styles/colors': { colors: { border: '#000', blue: { 500: '#000' } } },
    'date-fns': { parseISO: value => value, addHours: value => value, format: () => 'Data fictícia' }, 'date-fns/locale': { ptBR: {} },
    '@expo/vector-icons/FontAwesome6': noop, '../../components/button/backButton': noop,
    '../../components/button/button': props => jsx('Text', { children: props.title }),
    '../../components/info/infoRow': props => jsx('View', { children: [jsx('Text', { children: props.mainText }), jsx('Text', { children: props.subText })] }),
    '../../components/overlay/errorOverlay': noop, '../../components/activity/activityTextEditor': noop,
  };
  dependencies['react-native'].Platform = { OS: platform };
  const source = fs.readFileSync(path.resolve(__dirname, '../src/screens/activity-details/activityDetailsScreen.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, console: { error() {} }, require(name) { assert.ok(name in dependencies, `Unmocked dependency: ${name}`); return dependencies[name]; } });
  function render() { cursor = 0; const tree = module.exports.default(); effects.splice(0).forEach(effect => effect()); return tree; }
  render(); return { render, calls, activity, writes };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const texts = tree => nodes(tree).filter(node => node.type === 'Text').map(node => node.props.children);
const settle = () => new Promise(resolve => setImmediate(resolve));

test('admin web vê e consulta vagas/fila mesmo em categoria sem inscrição', async () => {
  const view = screen(); await settle();
  for (const text of ['Vagas', '20 / 50', 'Lista de Espera', '2']) assert.ok(texts(view.render()).includes(text));
  assert.equal(view.calls.length, 1);
});
test('falha na consulta de categoria não oculta capacidade do admin web', async () => {
  const view = screen({ missingCategory: true }); await settle();
  assert.ok(texts(view.render()).includes('20 / 50')); assert.equal(view.calls.length, 1);
});
test('participante mantém comportamento de categorias com e sem inscrição', async () => {
  for (const enrollment of [false, true]) {
    const view = screen({ role: 'USER', enrollment }); await settle();
    assert.equal(texts(view.render()).includes('Vagas'), enrollment);
    assert.equal(view.calls.length, enrollment ? 1 : 0);
    assert.ok(texts(view.render()).includes(enrollment ? 'Inscrever-se' : 'Salvar atividade'));
  }
});
test('exceção administrativa fica restrita à versão web', async () => {
  const view = screen({ platform: 'android' }); await settle();
  assert.equal(texts(view.render()).includes('Vagas'), false); assert.equal(view.calls.length, 0);
});
test('erro no resumo mantém capacidade, evita zero falso e permite repetir consulta', async () => {
  let available = false;
  const view = screen({ summary: async () => { if (!available) throw { response: { status: 503 } }; return { occupiedCount: 20, waitlistCount: 2, waitlistPosition: null }; } });
  await settle(); const tree = view.render();
  assert.ok(texts(tree).includes('— / 50'));
  assert.ok(texts(tree).includes('Não foi possível carregar os totais de inscrições.'));
  assert.equal(texts(tree).includes('0 / 50'), false);
  available = true;
  nodes(tree).find(node => node.type === 'Pressable' && node.props.accessibilityRole === 'button').props.onPress();
  await settle(); assert.ok(texts(view.render()).includes('20 / 50')); assert.equal(view.calls.length, 2);
});
test('capacidade zero e indefinida permanecem visíveis ao admin web', async () => {
  for (const capacity of [0, null]) {
    const view = screen({ capacity, summary: () => ({ occupiedCount: 0, waitlistCount: 2, waitlistPosition: null }) }); await settle();
    assert.ok(texts(view.render()).includes(capacity === 0 ? '0 / 0' : 'Não definidas'));
    assert.ok(texts(view.render()).includes('Lista de Espera'));
  }
});

test('prévia de ADMIN segue exibição do participante e bloqueia escrita mesmo por chamada direta', async () => {
  for (const enrollment of [false, true]) {
    const view = screen({ participantView: true, enrollment }); await settle();
    const tree = view.render();
    assert.equal(texts(tree).includes('Vagas'), enrollment);
    assert.equal(texts(tree).includes('Editar atividade'), false);
    assert.equal(texts(tree).includes('Ler Presença'), false);
    assert.equal(texts(tree).includes('Participantes'), false);
    const action = nodes(tree).find(node => node.type === 'Pressable' && node.props.accessibilityState?.disabled);
    assert.ok(action);
    await action.props.onPress();
    assert.deepEqual(view.writes, []);
    assert.ok(texts(tree).includes(enrollment ? 'Inscrever-se' : 'Salvar atividade'));
  }
});

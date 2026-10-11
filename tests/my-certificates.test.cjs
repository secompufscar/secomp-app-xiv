const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { loadTypescript } = require('./helpers/load-typescript.cjs');
const { certificateIssuedAt } = loadTypescript(path.join(__dirname, '../src/utils/certificateIssuedAt.ts'));
const settle = () => new Promise(resolve => setImmediate(resolve));
const summary = (character, year, edition, status = 'active') => ({ code: character.repeat(32), year, edition, status,
  templateId: 'secomp-landscape-v1', issuedAt: '2026-10-10T12:00:00Z', revision: 1, totalMinutes: 60 });
const future = summary('B', 2027, 'XV'), legacy = summary('A', 2026, 'XIV');
const detail = item => ({ code: item.code, participantName: `Pessoa ${item.edition}`, totalMinutes: item.totalMinutes,
  issuedAt: item.issuedAt, event: { year: item.year, startDate: '2026-10-05', endDate: '2026-10-08' },
  presentation: { edition: item.edition, templateId: item.templateId },
  activities: [{ name: `Atividade ${item.edition}`, minutes: 60, startsAt: null }], validationUrl: `https://app.example/certificados?codigo=${item.code}` });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];

function screen(overrides = {}, options = {}) {
  const slots = [], effects = [], calls = { list: [], get: [], issue: [], downloads: [], tests: [], testDownloads: [] };
  let cursor = 0, userId = options.anonymous ? null : 'self', participantView = options.preview || false;
  const memo = (factory, deps) => {
    const index = cursor++, previous = slots[index];
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) slots[index] = { deps, value: factory() };
    return slots[index].value;
  };
  const services = {
    listMyCertificates: async signal => { calls.list.push(signal); return overrides.list ? overrides.list(signal) : [future, legacy, summary('C', 2025, 'XIII', 'revoked'), { ...summary('D', 2024, 'XII'), templateId: 'unknown' }]; },
    getMyCertificate: async (code, signal) => { calls.get.push({ code, signal }); return overrides.get ? overrides.get(code, signal) : detail(code === future.code ? future : legacy); },
    issueMyCertificate: async () => { calls.issue.push(true); return overrides.issue ? overrides.issue() : detail(legacy); },
    certificateError: error => error.response?.status === 410 ? 'Certificado revogado. Entre em contato com a organização.' : error.message,
    certificateWorkload: minutes => `${minutes} minutos`, certificateActivityDate: () => 'Horario nao informado', certificateIssuedAt,
  };
  const dependencies = {
    react: {
      useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }]; },
      useRef(initial) { const index = cursor++; slots[index] ??= { value: { current: initial } }; return slots[index].value; },
      useCallback: (fn, deps) => memo(() => fn, deps),
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'Text', 'View'].map(name => [name, name])), Platform: { OS: options.platform || 'web' }, Linking: { openURL() {} } },
    '@react-navigation/native': { useFocusEffect(fn) { const index = cursor++, previous = slots[index];
      if (!previous || previous.fn !== fn) { previous?.cleanup?.(); const slot = { fn }; slots[index] = slot; effects.push(() => { slot.cleanup = fn(); }); }
    } },
    'lucide-react-native': Object.fromEntries(['Award', 'Download', 'ExternalLink', 'RefreshCw'].map(name => [name, name])),
    '../../components/app/appLayout': { default: 'AppLayout' }, '../../components/button/backButton': { default: 'BackButton' },
    '../../hooks/AuthContext': { useAuth: () => ({ user: userId ? { id: userId } : null, isParticipantView: participantView, canUseAdminTools: !!options.admin && !participantView }) },
    '../../services/certificates': services,
    '../../services/certificateAdminPreview': { getAdminTestCertificate: async signal => { calls.tests.push(signal); return overrides.test ? overrides.test(signal) : { kind: 'admin-test' }; } },
    '../../services/certificateDownload': {
      downloadCertificate: async (data, signal) => { calls.downloads.push({ data, signal }); },
      downloadAdminTestCertificate: async (data, signal) => { calls.testDownloads.push({ data, signal }); },
    },
    '../../utils/certificatePresentation': { supportsCertificateTemplate: id => id === 'secomp-landscape-v1' },
  };
  const module = { exports: {} };
  const filename = path.join(__dirname, '../src/screens/certificates/myCertificatesScreen.tsx');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, AbortController, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  const render = () => { cursor = 0; const result = nodes(module.exports.default()); effects.splice(0).forEach(fn => fn()); return result; };
  render();
  return { calls, render, user(id) { userId = id; render(); }, preview(value) { participantView = value; render(); }, close() { slots.forEach(slot => slot.cleanup?.()); },
    choose(code) { render().find(node => node.type === 'select').props.onChange({ target: { value: code } }); },
    press(label) { const node = render().find(node => node.props?.accessibilityLabel === label || (node.type === 'Pressable' && nodes(node).some(child => child.props?.children === label))); assert.ok(node, label); return node.props.onPress(); },
  };
}
const text = view => view.render().filter(node => node.type === 'Text').flatMap(node => node.props.children).join(' ');

test('historico apresenta o instante persistido com horas, minutos, segundos e fuso', async () => {
  const view = screen(); await settle(); await settle();
  assert.ok(text(view).replace(/\s+/g, ' ').includes('Emitido em 10/10/2026 às 09:00:00 (horário de Brasília)'));
  assert.equal(view.calls.issue.length, 0);
});

test('seletor e atualizar usam vao compacto e dimensoes estaveis sem encolher o botao', async () => {
  const view = screen(); await settle();
  const tree = view.render();
  const select = tree.find(node => node.type === 'select');
  assert.equal(select.props.style.height, 48); assert.equal(select.props.style.boxSizing, 'border-box');
  const row = tree.find(node => node.type === 'View' && node.props.style?.alignItems === 'flex-end');
  assert.equal(row.props.style.gap, 8);
  const wrapper = nodes(row).find(node => node.type === 'View' && node.props.style?.maxWidth === 480);
  assert.equal(wrapper.props.style.minWidth, 0);
  const tooltip = tree.find(node => node.type === 'div' && node.props.title === 'Atualizar certificados');
  assert.equal(tooltip.props.style.flexShrink, 0);
  assert.equal(tooltip.props.style.width, 48); assert.equal(tooltip.props.style.height, 48);
  const refresh = nodes(tooltip).find(node => node.type === 'Pressable');
  assert.equal(refresh.props.style.width, 48); assert.equal(refresh.props.style.height, 48);
});

test('teste somente ADMIN, independe de certificados e nao emite nem altera selecao', async () => {
  for (const options of [{}, { admin: true, preview: true }]) {
    const view = screen({}, options); await settle();
    assert.equal(view.render().some(node => node.props?.accessibilityLabel === 'Gerar certificado de teste'), false);
  }
  const view = screen({}, { admin: true }); await settle();
  const selected = view.render().find(node => node.type === 'select').props.value;
  await view.press('Gerar certificado de teste');
  assert.equal(view.calls.tests.length, 1); assert.equal(view.calls.testDownloads.length, 1);
  assert.equal(view.calls.issue.length, 0); assert.equal(view.calls.list.length, 1);
  assert.equal(view.render().find(node => node.type === 'select').props.value, selected);
  const empty = screen({ list: async () => [] }, { admin: true }); await settle();
  await empty.press('Gerar certificado de teste'); assert.equal(empty.calls.testDownloads.length, 1);
});

test('teste bloqueia cliques repetidos; erro permite retry e nao altera historico', async () => {
  let finish, failed = true;
  const view = screen({ test: () => failed ? new Promise((_resolve, reject) => { finish = reject; }) : Promise.resolve({ kind: 'admin-test' }) }, { admin: true });
  await settle(); const pending = view.press('Gerar certificado de teste');
  await view.press('Gerar certificado de teste'); assert.equal(view.calls.tests.length, 1);
  finish(Error('Duracao oficial pendente')); await pending;
  assert.match(text(view), /Duracao oficial pendente/); failed = false;
  await view.press('Gerar certificado de teste'); assert.equal(view.calls.testDownloads.length, 1);
  assert.equal(view.calls.issue.length, 0);
});

test('sair, trocar conta ou entrar em previa cancela o download do teste', async () => {
  for (const change of [view => view.close(), view => view.user('other'), view => view.preview(true)]) {
    let finish;
    const view = screen({ test: () => new Promise(resolve => { finish = resolve; }) }, { admin: true }); await settle();
    const pending = view.press('Gerar certificado de teste'); change(view);
    assert.equal(view.calls.tests[0].aborted, true); finish({ kind: 'admin-test' }); await pending;
    assert.equal(view.calls.testDownloads.length, 0);
  }
});

test('abrir e selecionar edicoes nao emite; revogado e modelo desconhecido nao escondem outros certificados', async () => {
  const view = screen(); await settle();
  assert.match(text(view), /Pessoa XV/); assert.equal(view.calls.issue.length, 0);
  view.choose(legacy.code); await settle(); assert.match(text(view), /Pessoa XIV/);
  view.choose('C'.repeat(32)); await settle(); assert.match(text(view), /Certificado revogado/);
  assert.equal(view.render().some(node => node.props?.children === 'Baixar PDF'), false);
  view.choose('D'.repeat(32)); await settle(); assert.match(text(view), /Modelo de certificado indisponível/);
  assert.equal(view.calls.get.length, 2);
  view.choose(future.code); await settle(); assert.match(text(view), /Pessoa XV/);
  assert.equal(view.calls.issue.length, 0);
});

test('respostas de outra edicao ou apos sair sao descartadas e requisicoes canceladas', async () => {
  const responses = new Map();
  const view = screen({ get: (code, signal) => new Promise(resolve => responses.set(code, { resolve, signal })) });
  await settle(); view.choose(legacy.code); await settle();
  assert.equal(responses.get(future.code).signal.aborted, true);
  responses.get(legacy.code).resolve(detail(legacy)); await settle();
  responses.get(future.code).resolve(detail(future)); await settle();
  assert.match(text(view), /Pessoa XIV/); assert.doesNotMatch(text(view), /Pessoa XV/);
  view.choose(future.code); await settle(); view.close();
  assert.equal(responses.get(future.code).signal.aborted, true);
  responses.get(future.code).resolve(detail(future)); await settle(); assert.doesNotMatch(text(view), /Pessoa XV/);
});

test('lista vazia e falha sao distintos; retry recupera historico sem gerar', async () => {
  let failed = true;
  const view = screen({ list: async () => { if (failed) throw Error('503'); return []; } }); await settle();
  assert.match(text(view), /503/); assert.doesNotMatch(text(view), /não possui/);
  failed = false; await view.press('Tentar novamente'); await settle();
  assert.match(text(view), /Você ainda não possui certificados emitidos/); assert.equal(view.calls.issue.length, 0);
});

test('emissao explicita bloqueia clique duplicado e seleciona o certificado retornado', async () => {
  let finish;
  const view = screen({ issue: () => new Promise(resolve => { finish = resolve; }) }); await settle();
  const first = view.press('Gerar certificado da edição habilitada');
  await view.press('Gerar certificado da edição habilitada'); assert.equal(view.calls.issue.length, 1);
  finish(detail(legacy)); await first; await settle(); assert.match(text(view), /Pessoa XIV/);
  assert.equal(view.calls.list.length, 2);
});

test('download reconfirma validade, nao baixa selecao antiga e trata revogacao sem gerar novamente', async () => {
  let resolve, confirm = false;
  const view = screen({ get: code => confirm ? new Promise(done => { resolve = done; }) : Promise.resolve(detail(code === future.code ? future : legacy)) }); await settle();
  confirm = true; const pending = view.press('Baixar PDF');
  confirm = false; view.choose(legacy.code); await settle(); resolve(detail(future)); await pending;
  assert.equal(view.calls.downloads.length, 0);
  await view.press('Baixar PDF'); assert.equal(view.calls.downloads.length, 1);
  assert.equal(view.calls.downloads[0].data.code, legacy.code);
  const revoked = screen({ get: async () => { throw Object.assign(Error('gone'), { response: { status: 410 } }); } }); await settle();
  assert.match(text(revoked), /Certificado revogado/); assert.equal(revoked.calls.issue.length, 0);
});

test('atualizar apos reemissao mantem a edicao selecionada e usa seu novo codigo', async () => {
  let replaced = false;
  const revision = { ...legacy, code: 'E'.repeat(32), revision: 2 };
  const view = screen({ list: async () => [future, replaced ? revision : legacy],
    get: async code => detail(code === future.code ? future : replaced ? revision : legacy) });
  await settle(); view.choose(legacy.code); await settle(); replaced = true;
  await view.press('Atualizar certificados'); await settle();
  assert.equal(view.render().find(node => node.type === 'select').props.value, revision.code);
  assert.match(text(view), /Pessoa XIV/); assert.doesNotMatch(text(view), /Pessoa XV/);
  assert.equal(view.calls.issue.length, 0);
});

test('troca de conta descarta historico anterior; mobile e anonimo nao consultam, previa nao emite', async () => {
  const view = screen(); await settle(); view.user('another'); await settle();
  assert.equal(view.calls.list.length, 2);
  for (const platform of ['android', 'ios']) {
    const mobile = screen({}, { platform }); await settle(); assert.equal(mobile.calls.list.length, 0); assert.deepEqual(mobile.render(), []);
  }
  const anonymous = screen({}, { anonymous: true }); await settle();
  assert.deepEqual(anonymous.render(), []); assert.equal(anonymous.calls.list.length, 0);
  const preview = screen({}, { preview: true }); await settle();
  assert.equal(preview.render().some(node => node.props?.accessibilityLabel === 'Gerar certificado da edição habilitada'), false);
});

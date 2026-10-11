const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const settle = () => new Promise(resolve => setImmediate(resolve));
const code = 'A'.repeat(32);
const fixture = { code, participantName: 'Pessoa ficticia', issuedAt: '2026-10-10T12:00:00Z', totalMinutes: 60,
  presentation: { edition: 'XIV' }, activities: [] };
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];

function screen(overrides = {}) {
  const slots = [], effects = [], calls = { validate: [], download: [] };
  let cursor = 0;
  const dependencies = {
    react: {
      useState(initial) { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, value => { slots[index].value = value; }]; },
      useRef(initial) { const index = cursor++; slots[index] ??= { value: { current: initial } }; return slots[index].value; },
      useEffect(fn) { const index = cursor++; if (!slots[index]) { const slot = {}; slots[index] = slot; effects.push(() => { slot.cleanup = fn(); }); } },
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { ...Object.fromEntries(['ActivityIndicator', 'Image', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name])), Linking: { openURL() {} } },
    'lucide-react-native': { Download: 'Download', Search: 'Search' },
    '../../services/certificates': {
      validateCertificate: async (code, signal) => { calls.validate.push({ code, signal }); return overrides.validate ? overrides.validate(code, signal) : fixture; },
      certificateError: error => error.message, certificateIssuedAt: () => 'data', certificateActivityDate: () => 'data', certificateWorkload: () => '1 hora',
    },
    '../../services/certificateDownload': { downloadCertificate: async (data, signal) => { calls.download.push({ data, signal }); if (overrides.download) await overrides.download(data, signal); } },
    '../../utils/certificatePresentation': { certificatePresentation: data => data.presentation },
  };
  const module = { exports: {} };
  const filename = path.join(__dirname, '../src/screens/certificates/certificateValidationScreen.tsx');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports: module.exports, module, AbortController, URLSearchParams,
    window: { location: { search: `?codigo=${code}` }, history: { replaceState() {} } },
    require(name) { if (name.startsWith('../../../assets/')) return 1; assert.ok(name in dependencies, name); return dependencies[name]; },
  });
  const render = () => { cursor = 0; const result = nodes(module.exports.default()); effects.splice(0).forEach(fn => fn()); return result; };
  render();
  return { calls, render, close() { slots.forEach(slot => slot.cleanup?.()); },
    edit(value) { render().find(node => node.type === 'TextInput').props.onChangeText(value); },
    press(label) { const node = render().find(node => node.type === 'Pressable' && nodes(node).some(child => child.props?.children === label)); assert.ok(node, label); return node.props.onPress(); },
  };
}

test('download publico reconfirma validade; revogacao posterior remove estado valido e PDF', async () => {
  let revoked = false;
  const view = screen({ validate: async () => { if (revoked) throw Object.assign(Error('Certificado revogado'), { response: { status: 410 } }); return fixture; } });
  await settle(); await view.press('Baixar PDF');
  assert.equal(view.calls.validate.length, 2); assert.equal(view.calls.download.length, 1);
  revoked = true; await view.press('Baixar PDF');
  assert.equal(view.calls.download.length, 1);
  assert.equal(view.render().some(node => node.props?.children === 'Certificado válido'), false);
  assert.equal(view.render().some(node => node.props?.children === 'Baixar PDF'), false);
});

test('editar codigo ou sair cancela reconfirmacao e impede download atrasado', async () => {
  for (const change of [view => view.edit('B'.repeat(32)), view => view.close()]) {
    let delayed = false, finish;
    const view = screen({ validate: () => delayed ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(fixture) });
    await settle(); delayed = true;
    const pending = view.press('Baixar PDF'); await view.press('Preparando PDF...');
    assert.equal(view.calls.validate.length, 2);
    const signal = view.calls.validate.at(-1).signal;
    change(view); assert.equal(signal.aborted, true); finish(fixture); await pending;
    assert.equal(view.calls.download.length, 0);
  }
});

test('cancelamento durante assets propaga sinal; erro de rede permite retry', async () => {
  let finish;
  const view = screen({ download: () => new Promise(resolve => { finish = resolve; }) });
  await settle(); const pending = view.press('Baixar PDF'); await settle();
  view.edit('B'.repeat(32)); assert.equal(view.calls.download[0].signal.aborted, true);
  finish(); await pending;
  let failed = false;
  const retry = screen({ validate: async () => { if (failed) throw Error('Rede indisponivel'); return fixture; } });
  await settle(); failed = true; await retry.press('Baixar PDF');
  assert.equal(retry.calls.download.length, 0);
  failed = false; await retry.press('Baixar PDF'); assert.equal(retry.calls.download.length, 1);
});

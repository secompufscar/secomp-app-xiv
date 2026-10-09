const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } }); return module.exports;
}
const removal = load('components/overlay/credentialingRemovalDialog.tsx', {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 320, height: 640 }) },
  '../../styles/colors': { colors: { blue: {} } },
});
const confirmation = load('components/overlay/credentialingConfirmationDialog.tsx', {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { ...Object.fromEntries(['KeyboardAvoidingView','Modal','Pressable','ScrollView','Text','TextInput','View'].map(n=>[n,n])), Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 320, height: 640 }) },
  '../../styles/colors': { colors: { blue: { 500: 'blue' } } },
  './credentialingRemovalDialog': removal,
});
const service = load('services/participantDirectory.ts', { './api': { __esModule: true, default: {} } });
test('horário do credenciamento usa timestamp real em São Paulo, preservando data desconhecida', () => {
  assert.match(service.formatCredentialingDate('2026-10-06T12:30:00Z'), /06\/10\/2026.*09:30/);
  for (const date of [null, 'invalid']) assert.equal(service.formatCredentialingDate(date), 'Data do credenciamento não disponível');
});
const settle = () => new Promise(resolve => setImmediate(resolve));
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
const response = page => ({ page, pageSize: 50, total: 51, credentialedCount: 20, notCredentialedCount: 31, event: { id: 'event', year: 2026 }, activityId: 'credentialing', users: [
  { id: 'green', nome: 'Ana', email: 'ana@example.invalid', credentialed: true, credentialedAt: '2026-10-06T12:30:00Z' },
  { id: 'red', nome: 'Bruno', email: 'bruno@example.invalid', credentialed: false, credentialedAt: null },
] });
function screen(query = async page => response(page), { admin = true, platform = 'web', credential, activityLookup } = {}) {
  const slots = [], calls = [], effects = [], writes = []; let cursor = 0, lastFocus;
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
    '../../components/overlay/credentialingConfirmationDialog': { __esModule: true, default: props => jsx('Confirmation', props) },
    '../../components/overlay/credentialingRemovalDialog': removal,
    '../../services/checkIn': { checkIn: async (user, activity) => { writes.push([user, activity]); if (credential) await credential(); } },
    '../../services/credentialing': { CredentialingError: class extends Error {}, getCurrentCredentialingActivity: activityLookup || (async () => ({ id: 'credentialing', eventId: 'event' })) },
    '../../components/overlay/userAttendanceDialog': { __esModule: true, default: props => jsx('History', props) },
    '../../components/app/participantViewToggle': { __esModule: true, default: () => null },
    '../../components/button/backButton': { __esModule: true, default: () => null },
    '../../styles/colors': { colors: { success: 'green', danger: 'red', blue: { 500: 'blue' } } },
  });
  const render = () => { cursor = 0; const tree = nodes(implementation.default()); while (effects.length) effects.shift()(); return tree; };
  render();
  return { render, calls, writes, dialog: () => render().find(node => node.type === 'Confirmation'), button: label => render().find(node => node.props?.accessibilityLabel === label), leave: () => lastFocus.cleanup?.() };
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


test('confirmação de credenciamento exige nome completo e desabilita envio duplicado', () => {
  let calls=0;
  for (const [typedName,busy] of [['Br',false],['Bruno',true],['Bruno',false]]) {
    const tree=nodes(confirmation.default({name:'Bruno',typedName,busy,error:null,onCancel(){},onChangeName(){},onConfirm(){calls++;}}));
    tree.find(n=>n.props?.accessibilityLabel==='Confirmar credenciamento').props.onPress();
  }
  assert.equal(calls,1);
});

test('credenciar permite somente pessoa sem presença e atualiza selo, data e totais após sucesso', async () => {
  let credited=false;
  const view=screen(async page=>({...response(page),credentialedCount:credited?21:20,notCredentialedCount:credited?30:31,users:response(page).users.map(u=>u.id==='red'&&credited?{...u,credentialed:true,credentialedAt:'2026-10-09T12:00:00Z'}:u)}),{credential:async()=>{credited=true;}});
  await settle();assert.equal(view.button('Credenciar Ana'),undefined);assert.ok(view.button('Credenciar Bruno'));
  view.button('Credenciar Bruno').props.onPress();view.dialog().props.onChangeName('Br');await view.dialog().props.onConfirm();assert.equal(view.writes.length,0);
  view.dialog().props.onChangeName(' Bruno ');const first=view.dialog().props.onConfirm();const second=view.dialog().props.onConfirm();await Promise.all([first,second]);await settle();
  assert.deepEqual(view.writes,[['red','credentialing']]);assert.equal(view.dialog(),undefined);assert.equal(view.button('Credenciar Bruno'),undefined);assert.ok(view.button('Bruno: Credenciado'));assert.match(text(view),/09\/10\/2026.*09:00/);assert.match(text(view),/21 credenciados/);
});

test('cancelar e escolher outra pessoa descartam o nome digitado, sem registrar presença', async () => {
  const view=screen();await settle();view.button('Credenciar Bruno').props.onPress();view.dialog().props.onChangeName('Bruno');view.dialog().props.onCancel();assert.equal(view.dialog(),undefined);
  view.button('Credenciar Bruno').props.onPress();assert.equal(view.dialog().props.typedName,'');assert.equal(view.writes.length,0);
});

test('erro do check-in mantém confirmação; recarga após sucesso não repete a escrita', async () => {
  const failure=screen(undefined,{credential:async()=>{throw {response:{data:{message:'Usuário não está inscrito neste evento'}}};}});await settle();failure.button('Credenciar Bruno').props.onPress();failure.dialog().props.onChangeName('Bruno');await failure.dialog().props.onConfirm();assert.match(failure.dialog().props.error,/não está inscrito/);assert.equal(failure.dialog().props.typedName,'Bruno');assert.equal(failure.dialog().props.busy,false);
  let count=0;const reload=screen(async page=>{if(++count>1)throw Error('503');return response(page);});await settle();reload.button('Credenciar Bruno').props.onPress();reload.dialog().props.onChangeName('Bruno');await reload.dialog().props.onConfirm();assert.match(text(reload),/Credenciamento realizado, mas não foi possível atualizar/);assert.equal(reload.writes.length,1);await reload.button('Tentar carregar participantes novamente').props.onPress();assert.equal(reload.writes.length,1);
});

test('mudança de edição e resposta depois de sair impedem credenciamento no alvo antigo', async () => {
  const changed=screen(undefined,{activityLookup:async()=>({id:'other-credentialing',eventId:'other-event'})});await settle();changed.button('Credenciar Bruno').props.onPress();changed.dialog().props.onChangeName('Bruno');await changed.dialog().props.onConfirm();assert.equal(changed.writes.length,0);assert.match(changed.dialog().props.error,/mudou/);
  let resolve;const late=screen(undefined,{activityLookup:()=>new Promise(done=>{resolve=done;})});await settle();late.button('Credenciar Bruno').props.onPress();late.dialog().props.onChangeName('Bruno');const request=late.dialog().props.onConfirm();late.leave();resolve({id:'credentialing',eventId:'event'});await request;assert.equal(late.writes.length,0);assert.equal(late.dialog(),undefined);
});

const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { loadTypescript } = require('./helpers/load-typescript.cjs');
function load(dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/certificates.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, URL, require(name) { return ['../utils/certificatePresentation', '../utils/certificateIssuedAt'].includes(name) ? loadTypescript(path.join(__dirname, '../src', name.slice(3) + '.ts')) : dependencies[name]; } });
  return module.exports;
}
const code = 'A'.repeat(32);
const fixture = () => ({ code, participantName: 'Ana Silva', issuedAt: '2026-10-09T12:00:00Z', totalMinutes: 210,
  event: { year: 2026, startDate: '2026-10-05', endDate: '2026-10-08' },
  activities: [{ name: 'Palestra', category: 'Palestras', startsAt: null, minutes: 60 }, { name: 'Workshop', category: 'Workshop', startsAt: null, minutes: 150 }],
  validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${code}`, qrCode: 'data:image/png;base64,AAAA' });

test('modelo consulta endpoint autenticado sem emitir e aceita apenas nome/codigo reservados', async () => {
  const calls = [], controller = new AbortController(), exampleCode = '0'.repeat(31) + 'G';
  const example = { ...fixture(), code: exampleCode, participantName: 'Nome de Exemplo', validationUrl: `https://app.example/certificados?codigo=${exampleCode}` };
  let data = example;
  const service = load({ './api': { get: async (...args) => { calls.push(args); return { data }; }, post: () => assert.fail('Exemplo nao emite') }, axios: {} });
  assert.equal((await service.getCertificateExample(controller.signal)).code, exampleCode);
  assert.equal(calls[0][0], '/certificates/admin/example'); assert.equal(calls[0][1].signal, controller.signal);
  assert.equal(calls[0][1].timeout, 15000);
  assert.throws(() => service.checkedCertificate(example));
  await assert.rejects(service.getMyCertificate(exampleCode));
  await assert.rejects(service.validateCertificate(exampleCode));
  for (const patch of [{ code }, { participantName: 'Pessoa real' }, { totalMinutes: 1 }, { validationUrl: `https://app.example/certificados?codigo=${code}` }, { presentation: { templateId: 'unknown' } }]) {
    data = { ...example, ...patch }; await assert.rejects(service.getCertificateExample());
  }
});
test('emissão não envia identidade escolhida pelo cliente; validação pública não usa cliente autenticado', async () => {
  const calls = [];
  const service = load({ './api': { defaults: { baseURL: 'https://api.example' }, post: async (...args) => { calls.push(args); return { data: fixture() }; } }, axios: { get: async (...args) => { calls.push(args); return { data: fixture() }; } } });
  assert.equal((await service.issueMyCertificate()).code, code);
  assert.equal(calls[0][0], '/certificates/mine'); assert.equal(JSON.stringify(calls[0][1]), '{}');
  assert.equal((await service.validateCertificate(code)).code, code);
  assert.equal(calls[1][0], `https://api.example/certificates/validate/${code}`);
  assert.equal(calls[1][1].headers, undefined);
  await assert.rejects(service.validateCertificate('invalid')); assert.equal(calls.length, 2);
});
test('total deve coincidir com anexo e link deve apontar para o mesmo código', () => {
  const service = load({ './api': {}, axios: {} });
  for (const invalid of [{ ...fixture(), totalMinutes: 60 }, { ...fixture(), validationUrl: 'https://app.example/?codigo=BAD' }, { ...fixture(), activities: [] }, { ...fixture(), qrCode: 'https://tracking.example' }]) assert.throws(() => service.checkedCertificate(invalid));
  assert.equal(service.checkedCertificate(fixture()).totalMinutes, 210);
  assert.equal(service.certificateWorkload(150), '2 horas e 30 minutos');
  assert.match(service.certificateActivityDate('2026-10-06T13:00:00Z'), /06\/10\/2026.*13:00/);
});

test('emissao propaga cancelamento ao transporte autenticado sem enviar identidade', async () => {
  const calls = [], controller = new AbortController();
  const service = load({ './api': { post: async (...args) => { calls.push(args); return { data: fixture() }; } }, axios: {} });
  await service.issueMyCertificate(controller.signal);
  assert.equal(calls[0][2].signal, controller.signal);
  assert.equal(JSON.stringify(calls[0][1]), '{}');
  assert.equal(calls[0][2].timeout, 20000);
});

test('validacao publica rejeita resposta de outro codigo sem enviar credenciais', async () => {
  const other = 'B'.repeat(32);
  const service = load({ './api': { defaults: { baseURL: 'https://api.example' } }, axios: {
    get: async () => ({ data: { ...fixture(), code: other, validationUrl: `https://app.example/certificados?codigo=${other}` } }),
  } });
  await assert.rejects(service.validateCertificate(code), /código consultado/);
});

test('contrato rejeita atividades malformadas, datas invalidas e URLs ambiguas', () => {
  const service = load({ './api': {}, axios: {} });
  const activity = fixture().activities[0];
  for (const patch of [
    { participantName: 42 }, { participantName: ' ' },
    { activities: [null] }, { activities: [{ ...activity, name: 42 }] },
    { activities: [{ ...activity, name: ' ' }] }, { activities: [{ ...activity, category: null }] },
    { activities: [{ ...activity, startsAt: 'invalid' }] }, { activities: [{ ...activity, startsAt: 123 }] },
    { event: { ...fixture().event, startDate: 'invalid' } },
    { event: { ...fixture().event, endDate: '2026-10-04' } },
    { validationUrl: `https://user:password@app.example/certificados?codigo=${code}` },
    { validationUrl: `https://app.example/certificados?codigo=${code}&codigo=${'B'.repeat(32)}` },
    { validationUrl: `https://app.example/certificados?codigo=${code}#outro` },
  ]) assert.throws(() => service.checkedCertificate({ ...fixture(), ...patch }));
});

test('revogação pública tem mensagem própria e não revela motivo administrativo', () => {
  const service = load({ './api': {}, axios: { isAxiosError: () => true } });
  assert.equal(service.certificateError({ response: { status: 410, data: { message: 'Motivo sigiloso' } } }), 'Certificado revogado. Entre em contato com a organização.');
});

test('emissao mostra segundos e fuso de Brasilia, independentemente do horario das atividades', () => {
  const service = load({ './api': {}, axios: {} });
  assert.equal(service.certificateIssuedAt('2026-10-11T20:25:33.453Z'), '11/10/2026 às 17:25:33 (horário de Brasília)');
  assert.equal(service.certificateIssuedAt('2026-10-11T01:02:03Z'), '10/10/2026 às 22:02:03 (horário de Brasília)');
  assert.equal(service.certificateIssuedAt('2026-10-11T03:00:00Z'), '11/10/2026 às 00:00:00 (horário de Brasília)');
  assert.equal(service.certificateIssuedAt('2026-10-11T17:25:33-03:00'), '11/10/2026 às 17:25:33 (horário de Brasília)');
  assert.throws(() => service.certificateIssuedAt('invalid'), /emissão/);
  for (const issuedAt of [undefined, null, '', 'invalid']) assert.throws(() => service.checkedCertificate({ ...fixture(), issuedAt }));
  assert.match(service.certificateActivityDate('2026-10-06T13:00:00Z'), /13:00/);
});

test('nova edicao exige identidade explicita e modelo conhecido; legado XIV continua aceito', () => {
  const service = load({ './api': {}, axios: {} });
  const legacy = fixture();
  assert.equal(service.checkedCertificate(legacy).presentation.edition, 'XIV');
  assert.equal(legacy.presentation, undefined);
  const presentation = service.checkedCertificate(legacy).presentation;
  const next = { ...fixture(), event: { year: 2027, startDate: '2027-10-04', endDate: '2027-10-07' }, presentation: { ...presentation, edition: 'XV' } };
  assert.equal(service.checkedCertificate(next).presentation.edition, 'XV');
  for (const invalid of [
    { ...next, presentation: undefined }, { ...next, event: { ...next.event, year: '2027' } },
    { ...next, presentation: { ...presentation, templateId: 'unknown' } },
    { ...next, presentation: { ...presentation, edition: 'XV\nXIV' } },
    { ...next, presentation: { ...presentation, issuer: '' } },
  ]) assert.throws(() => service.checkedCertificate(invalid));
  assert.equal(service.checkedCertificate(legacy).presentation.edition, 'XIV');
});

test('historico e detalhes usam cliente autenticado, mantem modelo desconhecido na lista e rejeitam codigo diferente', async () => {
  const calls = [], controller = new AbortController();
  const summary = { code, year: 2026, edition: 'XIV', templateId: 'secomp-landscape-v1', status: 'active', revision: 2, issuedAt: '2026-10-09', totalMinutes: 210 };
  let data = { certificates: [summary, { ...summary, code: 'B'.repeat(32), year: 2027, edition: 'XV', templateId: 'future-model' }] };
  const service = load({ './api': { get: async (...args) => { calls.push(args); return { data }; } }, axios: {} });
  const items = await service.listMyCertificates(controller.signal);
  assert.equal(items[0].year, 2027); assert.equal(items[0].templateId, 'future-model');
  assert.equal(calls[0][0], '/certificates/mine'); assert.equal(calls[0][1].signal, controller.signal);
  for (const invalid of [null, { certificates: [summary, summary] }, { certificates: [{ ...summary, status: 'wrong' }] }, { certificates: [{ ...summary, year: null }] }]) {
    data = invalid; await assert.rejects(service.listMyCertificates());
  }
  data = fixture(); assert.equal((await service.getMyCertificate(code, controller.signal)).code, code);
  assert.equal(calls.at(-1)[0], `/certificates/mine/${code}`);
  await assert.rejects(service.getMyCertificate('B'.repeat(32)), /seleção/);
  const before = calls.length; await assert.rejects(service.getMyCertificate('../users')); assert.equal(calls.length, before);
});

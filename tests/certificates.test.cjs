const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function load(dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/certificates.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, URL, require(name) { return dependencies[name]; } });
  return module.exports;
}
const code = 'A'.repeat(32);
const fixture = () => ({ code, participantName: 'Ana Silva', issuedAt: '2026-10-09T12:00:00Z', totalMinutes: 210,
  event: { year: 2026, startDate: '2026-10-05', endDate: '2026-10-08' },
  activities: [{ name: 'Palestra', category: 'Palestras', startsAt: null, minutes: 60 }, { name: 'Workshop', category: 'Workshop', startsAt: null, minutes: 150 }],
  validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${code}`, qrCode: 'data:image/png;base64,AAAA' });
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

test('revogação pública tem mensagem própria e não revela motivo administrativo', () => {
  const service = load({ './api': {}, axios: { isAxiosError: () => true } });
  assert.equal(service.certificateError({ response: { status: 410, data: { message: 'Motivo sigiloso' } } }), 'Certificado revogado. Entre em contato com a organização.');
});

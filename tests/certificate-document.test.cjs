const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), Module = require('node:module');
const filename = path.join(__dirname, '../src/utils/certificateDocument.ts');
const compiled = new Module(filename, module); compiled.filename = filename; compiled.paths = module.paths;
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { createCertificatePdf } = compiled.exports;
const read = file => new Uint8Array(fs.readFileSync(path.join(__dirname, '..', file)));
const assets = { secomp: read('assets/icon.png'), dc: read('assets/certificate/logo-departamento-computacao-ufscar.png'), ufscar: read('assets/certificate/logo-ufscar-fundo-transparente.png'),
  regular: read('node_modules/@expo-google-fonts/inter/Inter_400Regular.ttf'), bold: read('node_modules/@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf') };
const fixture = { code: 'A'.repeat(32), participantName: 'Marina Alves de Souza', issuedAt: '2026-10-09T12:00:00Z', totalMinutes: 150, event: { year: 2026, startDate: '2026-10-05', endDate: '2026-10-08' }, activities: [{ name: 'A Nova Fronteira do Cyber é a Proteção Humana', category: 'Workshop', startsAt: '2026-10-06T13:00:00Z', minutes: 150 }], validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${'A'.repeat(32)}`,
  qrCode: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../assets/icon.png')).toString('base64') };
test('PDF preserva página principal e anexo, e pagina listas extensas sem perder linhas', () => {
  const short = createCertificatePdf(fixture, assets);
  assert.equal(short.getNumberOfPages(), 2);
  const longFixture = { ...fixture, participantName: 'Maria '.repeat(35), totalMinutes: 150 * 45, activities: Array.from({ length: 45 }, (_, i) => ({ ...fixture.activities[0], name: `Atividade ${i + 1}: ` + 'Desenvolvimento de Software com Spec-Driven Development e arquitetura de aplicações '.repeat(3) })) };
  const long = createCertificatePdf(longFixture, assets);
  assert.ok(long.getNumberOfPages() > 2);
  assert.ok(long.output('arraybuffer').byteLength > 10000);
});

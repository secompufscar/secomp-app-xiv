const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { loadTypescript } = require('./helpers/load-typescript.cjs');
const { adminTestCode, checkedAdminTestCertificate } = loadTypescript(path.join(__dirname, '../src/utils/certificateAdminPreview.ts'));
const { createAdminTestCertificatePdf } = loadTypescript(path.join(__dirname, '../src/utils/certificateAdminPreviewDocument.ts'));
const { createCertificatePdf } = loadTypescript(path.join(__dirname, '../src/utils/certificateDocument.ts'));
const QRCode = require('qrcode'), jsQR = require('jsqr'), { createCanvas } = require('@napi-rs/canvas');
const fixture = () => ({ kind: 'admin-test', code: adminTestCode, participantName: 'Nome de Exemplo', issuedAt: '2026-10-11T12:00:00Z',
  event: { year: 2026, startDate: '2026-10-05', endDate: '2026-10-08' }, totalMinutes: 150,
  activities: [{ name: 'Workshop de teste', category: 'Workshop', minutes: 150, startsAt: '2026-10-06T13:00:00Z' }],
  validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${adminTestCode}`, qrCode: 'data:image/png;base64,AAAA' });

test('contrato de teste nao aceita certificado real, identidade diferente ou total inconsistente', () => {
  assert.equal(checkedAdminTestCertificate(fixture()).presentation.edition, 'XIV');
  assert.equal(adminTestCode.length, 32); assert.doesNotMatch(adminTestCode, /^[A-F0-9]{32}$/);
  for (const changes of [{ kind: 'real' }, { participantName: 'Pessoa real' }, { code: 'A'.repeat(32) },
    { validationUrl: 'https://app.example/?codigo=' + 'A'.repeat(32) }, { totalMinutes: 60 }, { activities: [] },
    { qrCode: '' }, { issuedAt: 'invalid' }, { event: { ...fixture().event, endDate: '2026-01-01' } },
    { activities: [{ ...fixture().activities[0], minutes: -1 }] }, { participantName: 'Certificado Admin [ TESTE ]' },
    { code: 'TESTE-ADMIN-SEM-VALIDADE' }]) assert.throws(() => checkedAdminTestCertificate({ ...fixture(), ...changes }));
});

test('consulta administrativa usa GET autenticado cancelavel e sem enviar identidade', async () => {
  const calls = [], module = { exports: {} }, filename = path.join(__dirname, '../src/services/certificateAdminPreview.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, { exports: module.exports, require: name => name === './api'
    ? { default: { get: async (...args) => { calls.push(args); return { data: fixture() }; } } }
    : { checkedAdminTestCertificate } });
  const controller = new AbortController(); await module.exports.getAdminTestCertificate(controller.signal);
  assert.equal(calls.length, 1); assert.equal(calls[0][0], '/certificates/admin/preview');
  assert.equal(calls[0][1].signal, controller.signal); assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1].params)), { format: 'example' });
});

test('modelo ADMIN e visualmente identico ao renderizador real, sem avisos extras, com nome de exemplo e QR invalido', async () => {
  const certificate = fixture();
  certificate.activities = Array.from({ length: 24 }, (_, i) => ({ ...certificate.activities[0],
    name: `Atividade ${i + 1}: Desenvolvimento de Software com Spec-Driven Development (SDD) e arquitetura de soluções`,
    category: i === 0 ? 'Minicursos' : 'Palestras', minutes: i === 0 ? 180 : i === 1 ? 150 : i === 2 ? 90 : 60 }));
  certificate.totalMinutes = certificate.activities.reduce((sum, activity) => sum + activity.minutes, 0);
  certificate.qrCode = await QRCode.toDataURL(certificate.validationUrl, { width: 300, margin: 4 });
  const read = file => new Uint8Array(fs.readFileSync(path.join(__dirname, '../assets/certificate/v1', file)));
  const assets = { secomp: read('secomp.png'), dc: read('dc.png'), ufscar: read('ufscar.png'), regular: read('Inter-Regular.ttf'), bold: read('Poppins-SemiBold.ttf') };
  const original = JSON.stringify(certificate), doc = createAdminTestCertificatePdf(certificate, assets);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(doc.output('arraybuffer')) }).promise;
  const reference = await getDocument({ data: new Uint8Array(createCertificatePdf(certificate, assets).output('arraybuffer')) }).promise;
  const texts = [], mm = 72 / 25.4;
  try {
    assert.ok(pdf.numPages >= 3);
    assert.equal(pdf.numPages, reference.numPages);
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number), items = (await page.getTextContent()).items;
      const text = items.map(item => item.str || '').join(' '); texts.push(text);
      assert.ok(text.includes('Nome de Exemplo')); assert.ok(text.includes('Emitido em 11/10/2026 às 09:00:00 (horário de Brasília)'));
      assert.ok(text.includes(adminTestCode)); assert.doesNotMatch(text, /SEM VALIDADE|Certificado de teste|TESTE|Amostra|não comprova/);
      assert.ok(text.includes(number === 1 ? 'Certificamos que' : 'ATIVIDADE COM PRESENÇA'));
      assert.ok(text.includes(`Página ${number} de ${pdf.numPages}`));
      const viewport = page.getViewport({ scale: 2 }), canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d'); await page.render({ canvasContext: context, viewport }).promise;
      const expectedPage = await reference.getPage(number);
      const expectedCanvas = createCanvas(canvas.width, canvas.height), expectedContext = expectedCanvas.getContext('2d');
      await expectedPage.render({ canvasContext: expectedContext, viewport }).promise;
      assert.deepEqual(canvas.toBuffer('image/png'), expectedCanvas.toBuffer('image/png'), `Visual divergente na pagina ${number}`);
      assert.ok((await page.getAnnotations()).some(item => item.url === certificate.validationUrl));
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height), qr = jsQR(pixels.data, canvas.width, canvas.height);
      assert.equal(qr?.data, certificate.validationUrl); assert.doesNotMatch(new URL(qr.data).searchParams.get('codigo'), /^[A-F0-9]{32}$/);
      for (const item of items.filter(item => item.str?.startsWith('Atividade '))) {
        assert.ok(item.transform[5] > 34 * mm, 'Atividade invade rodape');
        assert.ok(item.transform[4] + item.width <= 279 * mm + 0.5, 'Texto ultrapassa pagina');
      }
      if (process.env.ADMIN_CERTIFICATE_TEST_OUTPUT) {
        fs.mkdirSync(process.env.ADMIN_CERTIFICATE_TEST_OUTPUT, { recursive: true });
        fs.writeFileSync(path.join(process.env.ADMIN_CERTIFICATE_TEST_OUTPUT, `admin-test-page-${number}.png`), canvas.toBuffer('image/png'));
      }
      page.cleanup();
    }
    const annex = texts.slice(1).join(' ').replace(/\s+/g, ' ');
    for (const activity of certificate.activities) assert.equal(annex.split(activity.name).length - 1, 1);
    assert.ok(texts[0].includes('28 horas')); assert.ok(texts.at(-1).includes('28h'));
    assert.doesNotMatch(texts[0], /Todas as atividades|Inclui atividades simultâneas/);
    assert.equal(JSON.stringify(certificate), original);
  } finally { await pdf.destroy(); await reference.destroy(); }
});

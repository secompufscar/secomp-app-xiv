const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), Module = require('node:module');
const QRCode = require('qrcode'), jsQR = require('jsqr');
const { createCanvas } = require('@napi-rs/canvas');
const filename = path.join(__dirname, '../src/utils/certificateDocument.ts');
const compiled = new Module(filename, module); compiled.filename = filename; compiled.paths = module.paths;
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { createCertificatePdf } = compiled.exports;
const read = file => new Uint8Array(fs.readFileSync(path.join(__dirname, '..', file)));
const assets = { secomp: read('assets/icon.png'), dc: read('assets/certificate/logo-departamento-computacao-ufscar.png'), ufscar: read('assets/certificate/logo-ufscar-fundo-transparente.png'),
  regular: read('node_modules/@expo-google-fonts/inter/Inter_400Regular.ttf'), bold: read('node_modules/@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf') };
const fixture = { code: 'A'.repeat(32), participantName: 'Marina Alves de Souza', issuedAt: '2026-10-09T12:00:00Z', totalMinutes: 150, event: { year: 2026, startDate: '2026-10-05', endDate: '2026-10-08' }, activities: [{ name: 'A Nova Fronteira do Cyber é a Proteção Humana', category: 'Workshop', startsAt: '2026-10-06T13:00:00Z', minutes: 150 }], validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${'A'.repeat(32)}`,
  qrCode: '' };

async function inspect(doc, expected, renderQr = false) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(doc.output('arraybuffer')), useSystemFonts: false });
  const pdf = await task.promise;
  const texts = [];
  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str || '').join(' ');
      texts.push(text);
      assert.ok(text.includes(expected.code), `Codigo ausente na pagina ${number}`);
      assert.ok(text.includes(`Página ${number} de ${pdf.numPages}`));
      const url = new URL(expected.validationUrl);
      assert.ok(text.includes(url.origin + url.pathname), 'Endereco impresso incorreto');
      assert.ok((await page.getAnnotations()).some(a => a.url === expected.validationUrl), 'Link incorreto');
      if (renderQr) {
        const viewport = page.getViewport({ scale: 2 });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(pixels.data, canvas.width, canvas.height);
        assert.equal(decoded?.data, expected.validationUrl, `QR ilegivel/incorreto na pagina ${number}`);
        if (process.env.CERTIFICATE_TEST_OUTPUT) {
          fs.mkdirSync(process.env.CERTIFICATE_TEST_OUTPUT, { recursive: true });
          fs.writeFileSync(path.join(process.env.CERTIFICATE_TEST_OUTPUT, `certificate-page-${number}.png`), canvas.toBuffer('image/png'));
        }
      }
      page.cleanup();
    }
    return texts;
  } finally { await pdf.destroy(); }
}

test('PDF preserva conteúdo, total, link customizado e QR legível em ambas as páginas', async () => {
  const custom = { ...fixture, validationUrl: `https://validacao.example.invalid/secomp/xiv/consultar?codigo=${fixture.code}` };
  custom.qrCode = await QRCode.toDataURL(custom.validationUrl, { width: 300, margin: 4, errorCorrectionLevel: 'M' });
  const doc = createCertificatePdf(custom, assets);
  assert.equal(doc.getNumberOfPages(), 2);
  const texts = await inspect(doc, custom, true);
  assert.ok(texts[0].includes(custom.participantName));
  assert.ok(texts[0].includes('2h 30min')); assert.ok(texts[1].includes('2h 30min'));
  assert.ok(texts[1].includes(custom.activities[0].name));
});

test('PDF pagina listas extensas preservando todas as atividades uma vez e o total no anexo', async () => {
  fixture.qrCode = await QRCode.toDataURL(fixture.validationUrl);
  const short = createCertificatePdf(fixture, assets);
  assert.equal(short.getNumberOfPages(), 2);
  const longFixture = { ...fixture, participantName: 'Maria '.repeat(35), totalMinutes: 150 * 45, activities: Array.from({ length: 45 }, (_, i) => ({ ...fixture.activities[0], name: `Atividade ${i + 1}: ` + 'Desenvolvimento de Software com Spec-Driven Development e arquitetura de aplicações '.repeat(3) })) };
  const long = createCertificatePdf(longFixture, assets);
  assert.ok(long.getNumberOfPages() > 2);
  assert.ok(long.output('arraybuffer').byteLength > 10000);
  const texts = await inspect(long, longFixture);
  const annex = texts.slice(1).join(' ');
  for (let i = 1; i <= 45; i++) assert.equal(annex.split(`Atividade ${i}:`).length - 1, 1, `Atividade ${i} perdida ou duplicada`);
  assert.ok(texts[0].includes('112h 30min')); assert.ok(texts.at(-1).includes('112h 30min'));
});

test('PDF apresenta Palestra e Minicurso no singular sem alterar categorias do snapshot', async () => {
  const certificate = { ...fixture, totalMinutes: 240, activities: [
    { ...fixture.activities[0], name: 'Segurança da informação e inteligência artificial: o que significa hackear o sistema?', category: 'Palestras', minutes: 60 },
    { ...fixture.activities[0], name: 'PET - Cibersegurança', category: 'Minicursos', minutes: 180 },
  ] };
  certificate.qrCode = await QRCode.toDataURL(certificate.validationUrl);
  const original = JSON.parse(JSON.stringify(certificate));
  const texts = await inspect(createCertificatePdf(certificate, assets), certificate);
  const annex = texts.slice(1).join(' ');
  assert.match(annex, /\bPalestra\b/);
  assert.match(annex, /\bMinicurso\b/);
  assert.doesNotMatch(annex, /\b(Palestras|Minicursos)\b/);
  assert.ok(annex.includes('hackear'));
  assert.ok(annex.includes('PET - Cibersegurança'));
  assert.deepEqual(certificate, original);
});

test('PDF equilibra DC e UFSCar com tamanhos calibrados sem distorcer suas proporcoes', async () => {
  const { getDocument, OPS, Util } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const certificate = { ...fixture, qrCode: await QRCode.toDataURL(fixture.validationUrl) };
  const doc = createCertificatePdf(certificate, assets);
  const pdf = await getDocument({ data: new Uint8Array(doc.output('arraybuffer')), useSystemFonts: false }).promise;
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.03, `${actual} != ${expected}`);
  const mm = 72 / 25.4;
  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      const operators = await (await pdf.getPage(number)).getOperatorList();
      let matrix = [1, 0, 0, 1, 0, 0];
      const stack = [], logos = [];
      for (let i = 0; i < operators.fnArray.length; i++) {
        const operation = operators.fnArray[i], args = operators.argsArray[i];
        if (operation === OPS.save) stack.push(matrix.slice());
        else if (operation === OPS.restore) matrix = stack.pop();
        else if (operation === OPS.transform) matrix = Util.transform(matrix, args);
        else if (operation === OPS.paintImageXObject && matrix[4] > 150 * mm && matrix[5] > 170 * mm) {
          logos.push({ matrix: matrix.slice(), width: args[1], height: args[2] });
        }
      }
      assert.equal(logos.length, 2, `Logos ausentes na pagina ${number}`);
      const [dc, ufscar] = logos;
      for (const logo of logos) {
        near(logo.matrix[0] / logo.matrix[3], logo.width / logo.height);
      }
      near(dc.matrix[0], 40 * mm);
      near(ufscar.matrix[3], 14 * mm);
      near(dc.matrix[5] + dc.matrix[3] / 2, ufscar.matrix[5] + ufscar.matrix[3] / 2);
      near(ufscar.matrix[4] - dc.matrix[4] - dc.matrix[0], 12 * mm);
      near(ufscar.matrix[4] + ufscar.matrix[0], 279 * mm);
    }
  } finally { await pdf.destroy(); }
});

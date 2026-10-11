const assert = require('node:assert/strict'), { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path');
const { loadTypescript } = require('./helpers/load-typescript.cjs');
const QRCode = require('qrcode'), jsQR = require('jsqr');
const { createCanvas } = require('@napi-rs/canvas');
const filename = path.join(__dirname, '../src/utils/certificateDocument.ts');
const { createCertificatePdf } = loadTypescript(filename);
const read = file => new Uint8Array(fs.readFileSync(path.join(__dirname, '..', file)));
const assets = { secomp: read('assets/certificate/v1/secomp.png'), dc: read('assets/certificate/v1/dc.png'), ufscar: read('assets/certificate/v1/ufscar.png'),
  regular: read('assets/certificate/v1/Inter-Regular.ttf'), bold: read('assets/certificate/v1/Poppins-SemiBold.ttf') };
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
  assert.ok(texts[0].includes('2 horas e 30 minutos')); assert.ok(texts[1].includes('2h 30min'));
  assert.ok(texts[1].includes(custom.activities[0].name));
});

test('PDF identifica a emissao com segundos no rodape de cada pagina sem repetir a cidade ou alterar o snapshot', async () => {
  const certificate = { ...fixture, issuedAt: '2026-10-11T01:02:03.456Z', qrCode: await QRCode.toDataURL(fixture.validationUrl) };
  const before = JSON.parse(JSON.stringify(certificate));
  const doc = createCertificatePdf(certificate, assets);
  const texts = await inspect(doc, certificate);
  const label = 'Emitido em 10/10/2026 às 22:02:03 (horário de Brasília)';
  for (const text of texts) {
    assert.equal(text.split(label).length - 1, 1);
    assert.ok(!text.includes('São Carlos, 10/10/2026'));
  }
  assert.ok(texts[0].includes('em São Carlos - SP.'));
  assert.deepEqual(certificate, before);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(doc.output('arraybuffer')), useSystemFonts: false }).promise;
  try {
    const mm = 72 / 25.4;
    for (let number = 1; number <= pdf.numPages; number++) {
      const items = (await (await pdf.getPage(number)).getTextContent()).items;
      const emission = items.find(item => item.str === label);
      const code = items.find(item => item.str === `Código de validação: ${certificate.code}`);
      const pagination = items.find(item => item.str === `Página ${number} de ${pdf.numPages}`);
      assert.ok(emission && code && pagination);
      assert.ok(Math.abs(emission.transform[4] - 80 * mm) < 0.01);
      assert.ok(emission.transform[4] + emission.width <= 245 * mm, 'Emissao invade a margem do QR');
      assert.ok(Math.abs(emission.transform[5] - 23 * mm) < 0.01, 'Emissao deve ficar no rodape');
      assert.ok(Math.abs(emission.transform[0] - 8) < 0.01);
      assert.ok(emission.transform[5] - emission.height > code.transform[5], 'Emissao sobrepoe validacao');
      assert.ok(Math.abs(pagination.transform[4] - 11 * mm) < 0.01);
      assert.ok(Math.abs(pagination.transform[5] - 6 * mm) < 0.01);
      assert.ok(pagination.transform[4] + pagination.width <= 55 * mm, 'Paginacao sai da faixa lateral');
      assert.ok(Math.abs(pagination.transform[0] - 7) < 0.01);
    }
  } finally { await pdf.destroy(); }
});

test('PDF pagina listas extensas preservando todas as atividades uma vez e o total no anexo', async () => {
  fixture.qrCode = await QRCode.toDataURL(fixture.validationUrl);
  const short = createCertificatePdf(fixture, assets);
  assert.equal(short.getNumberOfPages(), 2);
  const longFixture = { ...fixture, participantName: 'Maria '.repeat(35), totalMinutes: 150 * 45, activities: Array.from({ length: 45 }, (_, i) => ({ ...fixture.activities[0], name: `Atividade ${i + 1}: ` + 'Desenvolvimento de Software com Spec-Driven Development e arquitetura de aplicações '.repeat(3) })) };
  const long = createCertificatePdf(longFixture, assets);
  assert.ok(long.getNumberOfPages() > 2);
  assert.ok(long.output('arraybuffer').byteLength > 10000);
  const texts = await inspect(long, longFixture, true);
  const annex = texts.slice(1).join(' ');
  for (let i = 1; i <= 45; i++) assert.equal(annex.split(`Atividade ${i}:`).length - 1, 1, `Atividade ${i} perdida ou duplicada`);
  assert.ok(texts[0].includes('112 horas e 30 minutos')); assert.ok(texts.at(-1).includes('112h 30min'));
});

test('PDF escreve o total por extenso na capa, sem chamada para o anexo ou sobreposicao', async () => {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const [minutes, label] of [[780, '13 horas'], [60, '1 hora'], [1, '1 minuto'], [61, '1 hora e 1 minuto'], [6750, '112 horas e 30 minutos']]) {
    const certificate = { ...fixture, totalMinutes: minutes, activities: [{ ...fixture.activities[0], minutes }], qrCode: await QRCode.toDataURL(fixture.validationUrl) };
    const doc = createCertificatePdf(certificate, assets);
    const texts = await inspect(doc, certificate);
    assert.ok(texts[0].includes(label));
    assert.ok(texts[1].includes(`${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ''}`));
    assert.doesNotMatch(texts[0], /Relação.*anexo/);
    assert.ok(!texts[0].includes('Atividades com presença registrada.'));
    const pdf = await getDocument({ data: new Uint8Array(doc.output('arraybuffer')), useSystemFonts: false }).promise;
    try {
      const content = await (await pdf.getPage(1)).getTextContent();
      const total = content.items.find(item => item.str === label);
      assert.ok(total);
      assert.ok(total.transform[4] + total.width <= 273 * 72 / 25.4 + 0.1, `Total ultrapassa faixa: ${label}`);
      if (minutes === 780) assert.ok(Math.abs(total.transform[0] - 23) < 0.01, '13 horas deve manter fonte de 23 pontos');
    } finally { await pdf.destroy(); }
  }
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

test('PDF acomoda 11 atividades sinteticas em um anexo legivel separado do rodape', async () => {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const activities = Array.from({ length: 11 }, (_, i) => ({
    ...fixture.activities[0], category: i === 0 ? 'Minicursos' : 'Palestras', minutes: i === 0 ? 180 : 60,
    name: `Atividade ${i + 1}: ` + (i < 4
      ? 'Desenvolvimento de Software com Spec-Driven Development (SDD) - Usando Spec Kit e Aplicando Arquitetura com Harness na Prática'
      : 'Arquitetura e desenvolvimento de aplicações'),
  }));
  const certificate = { ...fixture, activities, totalMinutes: 780, qrCode: await QRCode.toDataURL(fixture.validationUrl) };
  const doc = createCertificatePdf(certificate, assets);
  assert.equal(doc.getNumberOfPages(), 2);
  const texts = await inspect(doc, certificate, true);
  const annex = texts[1].replace(/\s+/g, ' ');
  for (const activity of activities) assert.equal(annex.split(activity.name).length - 1, 1);
  assert.ok(annex.includes('13h'));
  const pdf = await getDocument({ data: new Uint8Array(doc.output('arraybuffer')), useSystemFonts: false }).promise;
  const mm = 72 / 25.4;
  try {
    for (let number = 1; number <= 2; number++) {
      const items = (await (await pdf.getPage(number)).getTextContent()).items;
      const emission = items.find(item => item.str.startsWith('Emitido em '));
      const code = items.find(item => item.str === `Código de validação: ${certificate.code}`);
      const address = items.find(item => item.str === new URL(certificate.validationUrl).origin + new URL(certificate.validationUrl).pathname);
      assert.ok(emission && code && address);
      assert.ok(!items.some(item => item.str === 'Validação pública por código ou QR'));
      assert.equal(emission.transform[4], code.transform[4]);
      assert.equal(address.transform[4], code.transform[4]);
      assert.ok(emission.transform[5] > code.transform[5] && code.transform[5] > address.transform[5]);
      assert.ok(Math.abs(emission.transform[5] - code.transform[5] - 7 * mm) < 0.1);
      assert.ok(Math.abs(code.transform[5] - address.transform[5] - 7 * mm) < 0.1);
      for (const item of [emission, code, address]) {
        assert.ok(item.transform[4] + item.width <= 245 * mm, 'Metadados invadem margem do QR');
      }
      assert.ok(Math.abs(code.transform[0] - 9) < 0.01);
      assert.ok(code.transform[5] - code.height > address.transform[5], 'Codigo sobrepoe endereco');
      if (number === 2) {
        const dateHeading = items.find(item => item.str === 'DATA');
        const timeHeading = items.find(item => item.str === 'HORÁRIO');
        assert.ok(dateHeading && timeHeading);
        assert.ok(Math.abs(dateHeading.transform[5] - timeHeading.transform[5]) < 0.01, 'Cabecalhos devem ficar inteiros na mesma linha');
        const dates = items.filter(item => item.str === '06/10/2026');
        const times = items.filter(item => item.str === '13:00');
        assert.equal(dates.length, 11);
        assert.equal(times.length, 11);
        for (let i = 0; i < dates.length; i++) {
          assert.ok(Math.abs(dates[i].transform[5] - times[i].transform[5]) < 0.01, 'Data e horario devem ficar na mesma linha');
          assert.ok(dates[i].transform[4] + dates[i].width < times[i].transform[4], 'Data invade horario');
          assert.ok(dates[i].transform[4] + dates[i].width < 104 * mm);
          assert.ok(times[i].transform[4] >= 104 * mm && times[i].transform[4] + times[i].width < 119 * mm);
          assert.ok(Math.abs(dates[i].transform[0] - 9) < 0.01);
          assert.ok(Math.abs(times[i].transform[0] - 9) < 0.01);
        }
        const labels = items.filter(item => ['Palestra', 'Minicurso'].includes(item.str));
        assert.equal(labels.length, 11);
        for (const label of labels) {
          assert.ok(Math.abs(label.transform[0] - 7.5) < 0.01);
          assert.ok(label.transform[5] >= 34 * mm, 'Categoria invade rodape');
        }
        const total = items.find(item => item.str === 'CARGA HORÁRIA TOTAL');
        assert.ok(total.transform[5] >= 34 * mm, 'Total invade rodape');
        const totalValue = items.find(item => item.str === '13h');
        const durationHeading = items.find(item => item.str === 'DURAÇÃO');
        const durations = items.filter(item => ['1h', '3h'].includes(item.str));
        assert.ok(totalValue && durationHeading);
        assert.equal(durations.length, 11);
        for (const item of [durationHeading, totalValue, ...durations]) {
          assert.ok(Math.abs(item.transform[4] + item.width - 276.5 * mm) < 0.5, `Coluna de duracao desalinhada: ${item.str}`);
        }
        assert.equal(total.fontName, code.fontName, 'Rotulo do total deve usar a fonte seminegrita');
        assert.equal(totalValue.fontName, code.fontName, 'Valor total deve usar a fonte seminegrita');
        assert.notEqual(totalValue.fontName, durations[0].fontName);
        for (const item of [total, totalValue]) assert.ok(Math.abs(item.transform[0] - 9) < 0.01, 'Total deve manter 9 pontos');
        assert.ok(Math.abs(durationHeading.transform[0] - 8) < 0.01);
      }
    }
  } finally { await pdf.destroy(); }
});

test('PDF preserva data ausente sem inventar um horario na nova coluna', async () => {
  const certificate = { ...fixture, activities: [{ ...fixture.activities[0], startsAt: null }], qrCode: await QRCode.toDataURL(fixture.validationUrl) };
  const texts = await inspect(createCertificatePdf(certificate, assets), certificate);
  assert.match(texts[1], /Não\s+informado/);
  assert.ok(!texts[1].includes('13:00'));
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(createCertificatePdf(certificate, assets).output('arraybuffer')), useSystemFonts: false }).promise;
  try {
    const items = (await (await pdf.getPage(2)).getTextContent()).items;
    const placeholder = items.find(item => item.str === '-');
    assert.ok(placeholder);
    assert.ok(placeholder.transform[4] >= 104 * 72 / 25.4 && placeholder.transform[4] < 119 * 72 / 25.4);
  } finally { await pdf.destroy(); }
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

test('PDF mantém o divisor do cabeçalho fino e uniforme na capa e em todas as páginas do anexo', async () => {
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const certificate = { ...fixture, totalMinutes: 60 * 35,
    activities: Array.from({ length: 35 }, (_, i) => ({ ...fixture.activities[0], name: `Atividade ${i + 1}`, minutes: 60 })),
    qrCode: await QRCode.toDataURL(fixture.validationUrl) };
  const pdf = await getDocument({ data: new Uint8Array(createCertificatePdf(certificate, assets).output('arraybuffer')) }).promise;
  const mm = 72 / 25.4, near = (actual, expected) => Math.abs(actual - expected) < 0.03;
  try {
    assert.ok(pdf.numPages > 2);
    for (let number = 1; number <= pdf.numPages; number++) {
      const operators = await (await pdf.getPage(number)).getOperatorList();
      let width = 0;
      const widths = [], stack = [];
      for (let i = 0; i < operators.fnArray.length; i++) {
        const operation = operators.fnArray[i], args = operators.argsArray[i];
        if (operation === OPS.save) stack.push(width);
        else if (operation === OPS.restore) width = stack.pop();
        else if (operation === OPS.setLineWidth) width = args[0];
        else if (operation === OPS.constructPath && args[0] === OPS.stroke) {
          const bounds = args[2];
          if (near(bounds[0], 80 * mm) && near(bounds[1], (210 - 29) * mm)
            && near(bounds[2], 279 * mm) && near(bounds[3], (210 - 29) * mm)) widths.push(width);
        }
      }
      assert.equal(widths.length, 1, `Divisor ausente ou duplicado na página ${number}`);
      assert.ok(near(widths[0], 0.2 * mm), `Divisor espesso na página ${number}: ${widths[0] / mm} mm`);
    }
  } finally { await pdf.destroy(); }
});

test('PDF de nova edicao usa o snapshot e nao troca identidade de certificados XIV antigos', async () => {
  const { certificatePresentation } = loadTypescript(path.join(__dirname, '../src/utils/certificatePresentation.ts'));
  const legacy = { ...fixture, qrCode: await QRCode.toDataURL(fixture.validationUrl) };
  const before = await inspect(createCertificatePdf(legacy, assets), legacy);
  const code = 'B'.repeat(32), validationUrl = `https://validacao.example.invalid/certificados?codigo=${code}`;
  const next = { ...legacy, code, validationUrl, qrCode: await QRCode.toDataURL(validationUrl),
    issuedAt: '2027-10-08T12:00:00Z', event: { year: 2027, startDate: '2027-10-04', endDate: '2027-10-07' },
    activities: [{ ...legacy.activities[0], startsAt: '2027-10-05T13:00:00Z' }],
    presentation: { ...certificatePresentation(legacy), edition: 'XV' } };
  const nextTexts = await inspect(createCertificatePdf(next, assets), next, true);
  for (const text of nextTexts) {
    assert.ok(text.includes('XV SECOMP'));
    assert.ok(text.includes('2027'));
    assert.ok(!text.includes('XIV'));
  }
  assert.deepEqual(await inspect(createCertificatePdf(legacy, assets), legacy), before);
  assert.equal(legacy.presentation, undefined);
  assert.throws(() => createCertificatePdf({ ...next, presentation: undefined }, assets));
  assert.throws(() => createCertificatePdf({ ...next, presentation: { ...next.presentation, templateId: 'unknown' } }, assets));
});

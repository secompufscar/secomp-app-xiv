const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const QRCode = require('qrcode');
const root = path.resolve(process.env.CERTIFICATE_WEB_ROOT || path.join(__dirname, '../dist'));
const outputDir = path.resolve(process.env.CERTIFICATE_E2E_OUTPUT || path.join(__dirname, '../test-results/certificates'));
fs.mkdirSync(outputDir, { recursive: true });
const output = path.join(outputDir, 'synthetic-certificate.pdf');
const code = 'A'.repeat(32);
const fixture = { code, participantName: 'TESTE SEM VALIDADE - Marina Alves de Souza', issuedAt: '2026-10-10T01:00:00Z', totalMinutes: 450, event: { year: 2026, startDate: '2026-10-05T04:58:38Z', endDate: '2026-10-08T04:58:38Z' },
  activities: [{ name: 'Desenvolvimento de Software com Spec-Driven Development (SDD) - Usando Spec Kit e Aplicando Arquitetura com Harness na Prática', minutes: 180, category: 'Minicursos', startsAt: '2026-10-06T13:00:00Z' }, { name: 'A Nova Fronteira do Cyber é a Proteção Humana', minutes: 150, category: 'Workshop', startsAt: '2026-10-06T13:00:00Z' }, { name: 'Empreendedorismo & Tecnologia', minutes: 60, category: 'Outros', startsAt: '2026-10-07T14:00:00Z' }, { name: 'Acessibilidade em ambientes digitais inclusivos', minutes: 60, category: 'Palestras', startsAt: '2026-10-07T15:00:00Z' }], validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${code}` };
const nextCode = 'C'.repeat(32);
const nextFixture = { ...fixture, code: nextCode, issuedAt: '2027-10-10T01:00:00Z',
  event: { year: 2027, startDate: '2027-10-05T04:58:38Z', endDate: '2027-10-08T04:58:38Z' },
  presentation: { edition: 'XV', eventName: 'Semana Acadêmica da Computação', issuer: 'UFSCar', city: 'São Carlos', location: 'São Carlos - SP', templateId: 'secomp-landscape-v1' },
  activities: fixture.activities.map(activity => ({ ...activity, startsAt: activity.startsAt.replace('2026', '2027') })),
  validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${nextCode}` };
const replacementCode = 'E'.repeat(32);
const replacementFixture = { ...fixture, code: replacementCode, validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${replacementCode}` };
const adminFixture = { ...fixture, kind: 'admin-test', code: 'TESTE-ADMIN-SEM-VALIDADE', participantName: 'Certificado Admin [ TESTE ]',
  validationUrl: 'https://secomp-app-xiv.vercel.app/certificados?codigo=TESTE-ADMIN-SEM-VALIDADE',
  activities: [fixture.activities[0], ...Array.from({ length: 23 }, (_, i) => ({ ...fixture.activities[3],
    name: `Atividade ${i + 2}: ${fixture.activities[3].name}`, minutes: i === 0 ? 150 : i === 1 ? 90 : 60 }))] };
adminFixture.totalMinutes = adminFixture.activities.reduce((sum, activity) => sum + activity.minutes, 0);
const summary = (item, overrides = {}) => ({ code: item.code, year: item.event.year, edition: item.presentation?.edition || 'XIV',
  templateId: 'secomp-landscape-v1', issuedAt: item.issuedAt, totalMinutes: item.totalMinutes, status: 'active', revision: 1, ...overrides });
const server = http.createServer((req, res) => {
  const candidate = path.resolve(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html');
  const file = candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream' }); res.end(fs.readFileSync(file));
});
(async () => {
  fixture.qrCode = await QRCode.toDataURL(fixture.validationUrl, { width: 300, margin: 4 });
  nextFixture.qrCode = await QRCode.toDataURL(nextFixture.validationUrl, { width: 300, margin: 4 });
  replacementFixture.qrCode = await QRCode.toDataURL(replacementFixture.validationUrl, { width: 300, margin: 4 });
  adminFixture.qrCode = await QRCode.toDataURL(adminFixture.validationUrl, { width: 300, margin: 4 });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ ...(process.env.CERTIFICATE_BROWSER_CHANNEL ? { channel: process.env.CERTIFICATE_BROWSER_CHANNEL } : {}), headless: true });
  try {
    for (const width of [320, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const calls = [], errors = [];
      let mode = 'success';
      let mineState = 'normal';
      let admin = false, testPending = false;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === 'https://secomp-server-xiv-production.up.railway.app') {
          calls.push({ path: url.pathname, method: route.request().method(), auth: route.request().headers().authorization });
          const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
          if (url.pathname.endsWith('/certificates/admin/preview')) return testPending ? json({ message: 'Duração oficial pendente.' }, 409) : json(adminFixture);
          if (url.pathname.includes('/certificates/validate/')) return mode === 'next' ? json(nextFixture) : mode === 'success' ? json(fixture) : json({ message: 'Failure' }, mode === 'missing' ? 404 : mode === 'revoked' ? 410 : 503);
          if (url.pathname.endsWith('/certificates/mine')) {
            if (route.request().method() === 'POST') return mode === 'success' ? json(fixture) : json({ message: 'A organização ainda precisa definir a duração oficial.' }, 409);
            if (mineState === 'outage') return json({ message: 'Unavailable' }, 503);
            return json({ certificates: mineState === 'empty' ? [] : [summary(nextFixture),
              mineState === 'replaced' ? summary(replacementFixture, { revision: 2 }) : summary(fixture),
              summary(fixture, { code: 'D'.repeat(32), year: 2025, edition: 'XIII', status: 'revoked' }),
              summary(fixture, { code: 'F'.repeat(32), year: 2024, edition: 'XII', templateId: 'unknown-model' })] });
          }
          if (url.pathname.includes('/certificates/mine/')) {
            const requested = url.pathname.split('/').at(-1);
            if (requested === code && mineState === 'replaced') return json({ message: 'Gone' }, 410);
            return requested === nextCode ? json(nextFixture) : requested === replacementCode ? json(replacementFixture) : requested === code ? json(fixture) : json({ message: 'Gone' }, 410);
          }
          if (url.pathname.endsWith('/users/me')) return json({ id: 'synthetic-user', nome: 'Pessoa fictícia', email: 'test@example.invalid', tipo: admin ? 'ADMIN' : 'USER', points: 0, registrationStatus: 0 });
          if (url.pathname.endsWith('/event/current')) return json({ id: 'synthetic-event', year: 2026, startDate: '2026-10-05', endDate: '2026-10-08' });
          if (url.pathname.includes('/userEvent/user/')) return json(null);
          if (url.pathname.endsWith('/app/version')) return json({ force: false, updateRequired: false });
          if (url.pathname.includes('/getUserRanking/')) return json({ rank: 1 });
          if (url.pathname.endsWith('/activities/count')) return json({ totalActivities: 0 });
          return json([]);
        }
        if (url.href.includes('cdn.jsdelivr.net/npm/jsqr')) return route.fulfill({ contentType: 'application/javascript', body: 'self.jsQR = () => null;' });
        return url.origin === base ? route.continue() : route.abort();
      });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/certificados?codigo=${code}`);
      await page.getByText('Certificado válido', { exact: true }).waitFor();
      assert.ok(calls.every(c => c.path.includes('/certificates/validate/') && !c.auth));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(outputDir, `individual-certificate-valid-${width}.png`), fullPage: true });
      if (width === 1280) {
        const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Baixar PDF' }).click();
        await (await download).saveAs(output);
      }
      mode = 'next';
      await page.goto(`${base}/certificados?codigo=${nextCode}`);
      await page.getByText('Certificado válido', { exact: true }).waitFor();
      await page.getByText('XV SECOMP', { exact: true }).waitFor();
      assert.equal(await page.getByText('XIV SECOMP', { exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(calls.every(c => c.path.includes('/certificates/validate/') && !c.auth));
      await page.screenshot({ path: path.join(outputDir, `next-edition-valid-${width}.png`), fullPage: true });
      if (width === 1280) {
        const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Baixar PDF' }).click();
        const result = await download;
        assert.equal(result.suggestedFilename(), `certificado-xv-secomp-${nextCode}.pdf`);
        await result.saveAs(path.join(outputDir, 'synthetic-next-edition.pdf'));
      }
      mode = 'success';
      await page.goto(`${base}/certificados?codigo=${code}`);
      await page.getByText('Certificado válido', { exact: true }).waitFor();
      await page.getByText('XIV SECOMP', { exact: true }).waitFor();
      assert.equal(await page.getByText('XV SECOMP', { exact: true }).count(), 0);
      await page.getByRole('textbox', { name: 'Código do certificado' }).fill('invalid');
      await page.getByRole('button', { name: 'Validar certificado' }).click();
      await page.getByText('Código de certificado inválido.', { exact: true }).waitFor();
      for (const current of ['missing', 'revoked', 'outage']) {
        mode = current; await page.getByRole('textbox', { name: 'Código do certificado' }).fill('B'.repeat(32));
        await page.getByRole('button', { name: 'Validar certificado' }).click();
        await page.getByText(current === 'missing' ? 'Certificado não encontrado. Confira o código informado.' : current === 'revoked' ? 'Certificado revogado. Entre em contato com a organização.' : 'Não foi possível consultar o certificado. Tente novamente.', { exact: true }).waitFor();
        assert.equal(await page.getByText('Certificado válido', { exact: true }).count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Baixar PDF' }).count(), 0);
      }
      await page.evaluate(() => { localStorage.setItem('userToken', 'synthetic-access'); localStorage.setItem('refreshToken', 'synthetic-refresh'); });
      await page.goto(base); await page.waitForURL(/\/App(?:\/Home)?\/?$/);
      await page.getByRole('button', { name: 'Meus certificados', exact: true }).click();
      await page.waitForURL(/\/MyCertificates$/);
      const editions = page.getByRole('combobox', { name: 'Edição do certificado' });
      await page.getByRole('button', { name: 'Baixar PDF', exact: true }).waitFor();
      assert.equal(await editions.inputValue(), nextCode);
      const selectorBounds = await editions.boundingBox();
      const refreshBounds = await page.getByRole('button', { name: 'Atualizar certificados', exact: true }).boundingBox();
      assert.ok(selectorBounds && refreshBounds);
      assert.ok(Math.abs(refreshBounds.x - (selectorBounds.x + selectorBounds.width) - 8) <= 0.5, 'Vao entre seletor e atualizar deve ser 8px');
      assert.equal(selectorBounds.height, 48); assert.equal(refreshBounds.height, 48); assert.equal(refreshBounds.width, 48);
      assert.ok(Math.abs(selectorBounds.y - refreshBounds.y) <= 0.5, 'Controles devem estar alinhados');
      await page.screenshot({ path: path.join(outputDir, `certificate-selector-${width}.png`), clip: {
        x: selectorBounds.x - 4, y: selectorBounds.y - 4,
        width: refreshBounds.x + refreshBounds.width - selectorBounds.x + 8, height: 56,
      } });
      await editions.selectOption(code);
      await page.getByRole('button', { name: 'Baixar PDF', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(outputDir, `my-certificates-${width}.png`), fullPage: true });
      if (width === 1280) {
        const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Baixar PDF', exact: true }).click();
        const result = await pending; assert.equal(result.suggestedFilename(), `certificado-xiv-secomp-${code}.pdf`);
        await result.saveAs(path.join(outputDir, 'authenticated-certificate.pdf'));
      }
      await editions.selectOption('D'.repeat(32)); await page.getByText('Certificado revogado', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Baixar PDF' }).count(), 0);
      await editions.selectOption('F'.repeat(32)); await page.getByText('Modelo de certificado indisponível', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Baixar PDF' }).count(), 0);
      await editions.selectOption(code); await page.getByRole('button', { name: 'Baixar PDF' }).waitFor();
      assert.equal(calls.filter(call => call.path.endsWith('/certificates/mine') && call.method === 'POST').length, 0);
      mineState = 'outage'; await page.getByRole('button', { name: 'Atualizar certificados' }).click();
      await page.getByRole('alert').filter({ hasText: 'Não foi possível consultar o certificado.' }).waitFor();
      assert.equal(await page.getByText('Você ainda não possui certificados emitidos.', { exact: true }).count(), 0);
      mineState = 'empty'; await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
      await page.getByText('Você ainda não possui certificados emitidos.', { exact: true }).waitFor();
      mineState = 'normal'; await page.getByRole('button', { name: 'Atualizar certificados' }).click();
      await page.getByRole('button', { name: 'Baixar PDF', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Gerar certificado da edição habilitada', exact: true }).click();
      await page.getByText('A organização ainda precisa definir a duração oficial.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Baixar PDF' }).count(), 1);
      mode = 'success'; await page.getByRole('button', { name: 'Gerar certificado da edição habilitada', exact: true }).click();
      await page.getByRole('button', { name: 'Baixar PDF' }).waitFor();
      await page.waitForFunction(expected => document.querySelector('select')?.value === expected, code);
      mineState = 'replaced'; await page.getByRole('button', { name: 'Atualizar certificados' }).click();
      await page.waitForFunction(expected => document.querySelector('select')?.value === expected, replacementCode);
      await page.getByRole('button', { name: 'Baixar PDF' }).waitFor();
      assert.equal(await page.getByText(code, { exact: true }).count(), 0);
      assert.ok(calls.filter(call => call.path.includes('/certificates/mine')).every(call => call.auth === 'Bearer synthetic-access'));
      await page.reload(); await page.getByRole('button', { name: 'Baixar PDF' }).waitFor();
      assert.equal(await editions.inputValue(), nextCode);
      assert.equal(await page.getByRole('button', { name: 'Gerar certificado de teste', exact: true }).count(), 0);
      admin = true; await page.reload();
      const testButton = page.getByRole('button', { name: 'Gerar certificado de teste', exact: true });
      await testButton.waitFor();
      const previousSelection = await editions.inputValue();
      const issuesBefore = calls.filter(call => call.path.endsWith('/certificates/mine') && call.method === 'POST').length;
      testPending = true; await testButton.click(); await page.getByText('Duração oficial pendente.', { exact: true }).waitFor();
      testPending = false;
      const testDownload = page.waitForEvent('download'); await testButton.click();
      const testResult = await testDownload; assert.equal(testResult.suggestedFilename(), 'certificado-admin-teste-secomp.pdf');
      await testResult.saveAs(path.join(outputDir, `synthetic-admin-test-${width}.pdf`));
      assert.equal(await editions.inputValue(), previousSelection);
      assert.equal(calls.filter(call => call.path.endsWith('/certificates/mine') && call.method === 'POST').length, issuesBefore);
      assert.ok(calls.filter(call => call.path.endsWith('/certificates/admin/preview')).every(call => call.method === 'GET' && call.auth === 'Bearer synthetic-access'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(outputDir, `admin-certificate-test-${width}.png`), fullPage: true });
      await page.goto(`${base}/certificados?codigo=${adminFixture.code}`);
      await page.getByText('Código de certificado inválido.', { exact: true }).waitFor();
      assert.equal(await page.getByText('Certificado válido', { exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Baixar PDF' }).count(), 0);
      assert.deepEqual(errors, []); await context.close();
    }
    console.log(JSON.stringify({ passed: true, widths: [320, 1280], editions: ['XIV', 'XV (synthetic)'], realApiRequests: 0, pdf: output }));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });

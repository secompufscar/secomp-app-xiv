const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const QRCode = require('qrcode');
const root = path.resolve(__dirname, '../dist');
const outputDir = path.resolve(__dirname, '../test-results/certificates');
fs.mkdirSync(outputDir, { recursive: true });
const output = path.join(outputDir, 'synthetic-certificate.pdf');
const code = 'A'.repeat(32);
const fixture = { code, participantName: 'TESTE SEM VALIDADE - Marina Alves de Souza', issuedAt: '2026-10-10T01:00:00Z', totalMinutes: 450, event: { year: 2026, startDate: '2026-10-05T04:58:38Z', endDate: '2026-10-08T04:58:38Z' },
  activities: [{ name: 'Desenvolvimento de Software com Spec-Driven Development (SDD) - Usando Spec Kit e Aplicando Arquitetura com Harness na Prática', minutes: 180, category: 'Minicursos', startsAt: '2026-10-06T13:00:00Z' }, { name: 'A Nova Fronteira do Cyber é a Proteção Humana', minutes: 150, category: 'Workshop', startsAt: '2026-10-06T13:00:00Z' }, { name: 'Empreendedorismo & Tecnologia', minutes: 60, category: 'Outros', startsAt: '2026-10-07T14:00:00Z' }, { name: 'Acessibilidade em ambientes digitais inclusivos', minutes: 60, category: 'Palestras', startsAt: '2026-10-07T15:00:00Z' }], validationUrl: `https://secomp-app-xiv.vercel.app/certificados?codigo=${code}` };
const server = http.createServer((req, res) => {
  const candidate = path.resolve(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html');
  const file = candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream' }); res.end(fs.readFileSync(file));
});
(async () => {
  fixture.qrCode = await QRCode.toDataURL(fixture.validationUrl, { width: 300, margin: 4 });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ ...(process.env.CERTIFICATE_BROWSER_CHANNEL ? { channel: process.env.CERTIFICATE_BROWSER_CHANNEL } : {}), headless: true });
  try {
    for (const width of [320, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const calls = [], errors = [];
      let mode = 'success';
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === 'https://secomp-server-xiv-production.up.railway.app') {
          calls.push({ path: url.pathname, method: route.request().method(), auth: route.request().headers().authorization });
          const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
          if (url.pathname.includes('/certificates/validate/')) return mode === 'success' ? json(fixture) : json({ message: 'Failure' }, mode === 'missing' ? 404 : mode === 'revoked' ? 410 : 503);
          if (url.pathname.endsWith('/certificates/mine')) return mode === 'success' ? json(fixture) : json({ message: 'A organização ainda precisa definir a duração oficial.' }, 409);
          if (url.pathname.endsWith('/users/me')) return json({ id: 'synthetic-user', nome: 'Pessoa fictícia', email: 'test@example.invalid', tipo: 'USER', points: 0, registrationStatus: 0 });
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
      await page.getByRole('button', { name: 'Gerar certificado', exact: true }).click();
      const dialog = page.getByRole('dialog'); await dialog.waitFor();
      await dialog.getByRole('button', { name: 'Gerar certificado', exact: true }).click();
      await page.getByText('A organização ainda precisa definir a duração oficial.', { exact: true }).waitFor();
      mode = 'success'; await dialog.getByRole('button', { name: 'Gerar certificado', exact: true }).click();
      await dialog.getByRole('button', { name: 'Baixar PDF' }).waitFor();
      await page.screenshot({ path: path.join(outputDir, `individual-certificate-home-${width}.png`) });
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      assert.deepEqual(errors, []); await context.close();
    }
    console.log(JSON.stringify({ passed: true, widths: [320, 1280], realApiRequests: 0, pdf: output }));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });

const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(process.env.ACTIVITY_WEB_ROOT || path.join(__dirname, '../dist'));
const outputDir = path.resolve(process.env.ACTIVITY_E2E_OUTPUT || path.join(__dirname, '../test-results/activity-certification'));
fs.mkdirSync(outputDir, { recursive: true });
const server = http.createServer((req, res) => {
  const candidate = path.resolve(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html');
  const file = candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ ...(process.env.ACTIVITY_BROWSER_CHANNEL ? { channel: process.env.ACTIVITY_BROWSER_CHANNEL } : {}), headless: true });
  const results = [];
  try {
    for (const width of [320, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(() => { localStorage.setItem('userToken', 'synthetic-access'); localStorage.setItem('refreshToken', 'synthetic-refresh'); });
      const category = { id: '22222222-2222-4222-8222-222222222222', nome: 'Palestras', slug: 'palestras', requiresEnrollment: false };
      const credentialCategory = { ...category, id: '33333333-3333-4333-8333-333333333333', nome: 'Credenciamento', slug: 'credenciamento' };
      const activity = { id: '11111111-1111-4111-8111-111111111111', nome: 'Atividade fictícia', data: '2026-10-05T12:00:00Z', palestranteNome: 'Pessoa fictícia', palestranteTitulo: 'APRESENTADOR', vagas: 50, detalhes: 'Teste sem dados reais', categoriaId: category.id, categoria: category, local: 'Teste', points: 0, durationMinutes: 60, durationSource: 'Programação oficial', certificateExcluded: false };
      const legacy = { ...activity, id: '44444444-4444-4444-8444-444444444444', nome: 'Legado fictício', durationMinutes: null, durationSource: null };
      const activities = [activity, legacy], calls = [], errors = [];
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.replace(/\/$/, '');
        if (url.origin === 'https://secomp-server-xiv-production.up.railway.app') {
          const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
          if (request.method() === 'OPTIONS') return json({});
          calls.push({ path: endpoint, method: request.method(), body: request.postDataJSON() });
          if (endpoint.endsWith('/users/me')) return json({ id: 'user-test', nome: 'Conta fictícia', email: 'test@example.invalid', tipo: 'ADMIN', points: 0, registrationStatus: 0 });
          if (endpoint.endsWith('/app/version')) return json({ force: false, updateRequired: false });
          if (endpoint.endsWith('/event/current')) return json(null);
          if (endpoint.endsWith('/categories')) return json([category, credentialCategory]);
          if (endpoint.endsWith('/summary')) return json({ occupiedCount: 1, waitlistCount: 0, presentCount: 1, waitlistPosition: null });
          if (endpoint.includes('/user-activity/')) return json({ inscricaoPrevia: false, listaEspera: false });
          if (endpoint.endsWith('/activities')) {
            if (request.method() === 'POST') {
              const body = request.postDataJSON();
              const created = { ...body, id: '55555555-5555-4555-8555-555555555555', palestranteTitulo: 'APRESENTADOR', categoria: category };
              activities.push(created);
              await new Promise(resolve => setTimeout(resolve, 150));
              return json(created, 201);
            }
            assert.equal(request.method(), 'GET'); return json(activities);
          }
          const item = activities.find(item => endpoint.endsWith(`/activities/${item.id}`));
          if (item) {
            if (request.method() === 'PUT') { Object.assign(item, request.postDataJSON()); return json(item); }
            if (request.method() === 'DELETE') return json({ message: 'Esta atividade possui presenças ou certificados históricos e não pode ser excluída.' }, 409);
            assert.equal(request.method(), 'GET'); return json(item);
          }
          assert.equal(request.method(), 'GET', `Unexpected synthetic write: ${endpoint}`);
          return json([]);
        }
        if (url.href === 'https://cdn.jsdelivr.net/npm/jsqr@1.2.0/dist/jsQR.min.js') return route.fulfill({ contentType: 'application/javascript', body: 'self.jsQR = function () { return null; };' });
        return url.origin === base ? route.continue() : route.abort();
      });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base); await page.waitForURL(/\/App(?:\/Home)?\/?$/, { timeout: 30000 });
        await page.goto(`${base}/ActivityAdmin`);
        await page.getByText('60 min · Certificável', { exact: true }).waitFor();
        await page.getByText('Duração não cadastrada · Certificação pendente', { exact: true }).waitFor();
        await page.getByText('Criar atividade', { exact: true }).click();
        await page.getByPlaceholder('Palestra de IA', { exact: true }).fill('Nova atividade fictícia');
        await page.getByPlaceholder('João Silva', { exact: true }).fill('Equipe fictícia');
        await page.getByPlaceholder('50', { exact: true }).fill('20');
        await page.getByPlaceholder('Detalhes da atividade', { exact: true }).fill('Descrição fictícia');
        await page.getByPlaceholder('Pontuação da atividade', { exact: true }).fill('0');
        await page.getByPlaceholder('Anfiteatro Bento Prado Júnior', { exact: true }).fill('Teste');
        await page.getByText('Criar', { exact: true }).click();
        await page.getByText('Informe a duração oficial inteira, entre 1 e 10080 minutos.', { exact: true }).waitFor();
        await page.getByText('OK', { exact: true }).click();
        await page.getByLabel('Duração oficial em minutos', { exact: true }).fill('60');
        await page.getByText('Criar', { exact: true }).click();
        await page.getByText('Informe se a atividade é certificável.', { exact: true }).waitFor();
        await page.getByText('OK', { exact: true }).click();
        await page.getByRole('radio', { name: 'Sim, certificável', exact: true }).click();
        await page.getByLabel('Fonte da duração oficial', { exact: true }).fill('Programa aprovado de teste');
        await page.screenshot({ path: path.join(outputDir, `create-${width}.png`) });
        await page.getByText('Criar', { exact: true }).evaluate(element => { element.click(); element.click(); });
        await page.getByText('Painel de Atividades', { exact: true }).waitFor();
        const creates = calls.filter(call => call.method === 'POST'); assert.equal(creates.length, 1);
        assert.equal(creates[0].body.durationMinutes, 60); assert.equal(creates[0].body.certificateExcluded, false);
        await page.getByText('Nova atividade fictícia', { exact: true }).click();
        await page.getByLabel('Duração oficial em minutos', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Duração oficial em minutos', { exact: true }).inputValue(), '60');
        await page.getByLabel('Duração oficial em minutos', { exact: true }).fill('180');
        await page.getByRole('radio', { name: 'Não certificável', exact: true }).click();
        await page.getByText('Atualizar', { exact: true }).click();
        await page.getByText('180 min · Não certificável', { exact: true }).waitFor();
        const fullUpdate = calls.filter(call => call.method === 'PUT').at(-1);
        assert.equal(fullUpdate.body.durationMinutes, 180); assert.equal(fullUpdate.body.certificateExcluded, true);
        await page.goto(`${base}/ActivityDetails?item=${activity.id}`);
        await page.getByText('60 min · Certificável', { exact: true }).waitFor();
        await page.getByText('Editar atividade', { exact: true }).click();
        await page.getByLabel('Duração oficial em minutos', { exact: true }).fill('90');
        // Wait for the native Modal fade before recording visual evidence.
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(outputDir, `editor-${width}.png`) });
        await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        await page.getByText('90 min · Certificável', { exact: true }).waitFor();
        assert.equal(calls.filter(call => call.method === 'PUT').at(-1).body.durationMinutes, 90);
        await page.goto(`${base}/ActivityDetails?item=${legacy.id}`);
        await page.getByText('Duração não cadastrada · Certificação pendente', { exact: true }).waitFor();
        await page.getByText('Editar atividade', { exact: true }).click();
        await page.getByLabel('Título da atividade', { exact: true }).fill('Legado corrigido fictício');
        await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        await page.getByText('Legado corrigido fictício', { exact: true }).waitFor();
        const legacyUpdate = calls.filter(call => call.method === 'PUT').at(-1).body;
        assert.equal('durationMinutes' in legacyUpdate, false); assert.equal('certificateExcluded' in legacyUpdate, false);
        await page.goto(`${base}/ActivityAdminCreate`);
        await page.getByPlaceholder('Palestra de IA', { exact: true }).fill('Coffee Break');
        await page.getByRole('radio', { name: 'Não certificável', exact: true }).waitFor();
        assert.equal(await page.getByRole('radio', { name: 'Não certificável', exact: true }).getAttribute('aria-checked'), 'true');
        assert.equal(await page.getByRole('radio', { name: 'Sim, certificável', exact: true }).getAttribute('aria-disabled'), 'true');
        await page.goto(`${base}/ActivityAdmin`);
        await page.getByRole('button', { name: `Excluir ${activity.nome}`, exact: true }).click();
        await page.getByText('Excluir', { exact: true }).click();
        await page.getByText('Esta atividade possui presenças ou certificados históricos e não pode ser excluída.', { exact: true }).waitFor();
        await page.getByText('OK', { exact: true }).click();
        assert.equal(calls.filter(call => call.method === 'DELETE').length, 1);
        await page.getByText(activity.nome, { exact: true }).waitFor();
        assert.deepEqual(errors, []);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(outputDir, `crud-${width}.png`) });
        results.push({ width, creates: 1, fullEdit: true, quickEdit: true, legacyPreserved: true, protectedDelete: true, realApiRequests: 0 });
      } catch (error) {
        await page.screenshot({ path: path.join(outputDir, `failure-${width}.png`) });
        console.error(JSON.stringify({ width, url: page.url(), text: (await page.locator('body').innerText()).slice(-3500), errors })); throw error;
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());

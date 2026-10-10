import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { buildWebCollection } from '../src/postman/collection.js';

// Usa Playwright do ambiente de QA; não adiciona dependência ao servidor API.
// POSTMAN_PLAYWRIGHT_PACKAGE pode apontar ao package.json do runtime de testes.
const { chromium } = createRequire(process.env.POSTMAN_PLAYWRIGHT_PACKAGE || import.meta.url)('playwright');
const collection = buildWebCollection();
let browser, scenario, release;
const oldToken = 'synthetic-used-session', newToken = 'synthetic-current-session';
const files = { '/docs/postman': 'index.html', '/docs/postman/runner.js': 'runner.js', '/docs/postman/core.js': 'core.js', '/docs/postman/style.css': 'style.css' };
const server = http.createServer((req, res) => {
  if (files[req.url]) {
    res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : req.url.endsWith('.css') ? 'text/css' : 'text/html');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'");
    return res.end(readFileSync(new URL(`../src/postman/${files[req.url]}`, import.meta.url)));
  }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/docs/postman/collection') return res.end(JSON.stringify(collection));
  if (req.url === '/auth/logout') { scenario.revoked.add(req.headers.authorization); return res.end('{}'); }
  if (req.url === '/usuario') {
    scenario.sent.push(req.headers.authorization);
    if (scenario.abort && scenario.sent.length === 1) { release = () => res.end('{}'); return; }
    return res.end(JSON.stringify({ message: `${oldToken} / ${newToken}` }));
  }
  res.statusCode = 404; res.end('{}');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const abort of [false, true]) {
    scenario = { abort, sent: [], revoked: new Set() };
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/docs/postman`);
    await page.locator('#access-token').fill('synthetic-admin-gate'); await page.locator('#connect').click();
    await page.locator('#workspace').waitFor({ state: 'visible' });
    await page.locator('#variable-joaoToken').fill(oldToken);
    await page.locator('#path').fill('/usuario'); await page.locator('#token').selectOption('joaoToken');
    const received = page.waitForRequest((request) => request.url() === `${origin}/usuario`);
    await page.locator('#send').click(); await received;
    if (abort) { await page.locator('#stop').click(); release?.(); }
    await page.waitForFunction(() => !document.getElementById('send').disabled);
    if (abort) assert.match(await page.locator('#status').innerText(), /interrompida/);
    await page.locator('#variable-joaoToken').fill(newToken);
    await page.locator('#send').click(); await page.waitForFunction(() => !document.getElementById('send').disabled);
    const response = await page.locator('#response').innerText();
    assert.ok(!response.includes(oldToken)); assert.ok(!response.includes(newToken));
    assert.equal(scenario.sent[0], `Bearer ${oldToken}`);
    await page.locator('#logout').click(); await page.waitForFunction(() => !document.getElementById('connect').disabled);
    assert.ok(scenario.revoked.has(`Bearer ${oldToken}`)); assert.ok(scenario.revoked.has(`Bearer ${newToken}`));
    assert.ok(scenario.revoked.has('Bearer synthetic-admin-gate'));
    assert.match(await page.locator('#status').innerText(), /apagados e sessões revogadas/);
    assert.equal(await page.locator('#variables input').count(), 0); assert.equal(errors.length, 0);
    console.log(`PASS: Bearer manual substituído ${abort ? 'após interrupção' : 'após resposta'}, histórico redigido e três sessões revogadas.`);
    await page.close();
  }
} finally { release?.(); await browser?.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }

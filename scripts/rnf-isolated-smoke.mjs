import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import os from 'node:os';

// Only a labelled, loopback development container is eligible. Never reads .env.
const container = 'doai-codex-preview-20261007';
const owner = '01a11813-61d5-72f3-8d00-65cc34cbf4d3';
assert.equal(execFileSync('docker', ['inspect', '--format', '{{index .Config.Labels "codex.thread"}}', container], { encoding: 'utf8', timeout: 10000 }).trim(), owner);
const ports = JSON.parse(execFileSync('docker', ['inspect', '--format', '{{json .NetworkSettings.Ports}}', container], { encoding: 'utf8', timeout: 10000 }));
assert.deepEqual(ports['5432/tcp'].map(p => [p.HostIp, p.HostPort]), [['127.0.0.1', '5434']]);
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const database = `doai_rnf_${suffix}`, role = `rnf_${suffix}`, password = randomUUID().replaceAll('-', '');
assert.match(database, /^doai_rnf_[a-f0-9]{12}$/);
const root = fileURLToPath(new URL('../', import.meta.url));
const sql = (db, text) => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'doai', '-d', db, '--set', 'ON_ERROR_STOP=1'], { input: text, stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
let prisma, server, disconnect, createdRole = false, createdDatabase = false;
const samples = [], checks = [], report = { at: new Date().toISOString(), runtime: process.version, os: `${os.platform()} ${os.release()}`, cpuCount: os.cpus().length, fixtureItems: 10000, concurrency: [1, 8], targetMs: 3000 };
try {
  sql('postgres', `CREATE ROLE ${role} LOGIN PASSWORD '${password}';`); createdRole = true;
  sql('postgres', `CREATE DATABASE ${database} OWNER ${role};`); createdDatabase = true;
  Object.assign(process.env, {
    DATABASE_URL: `postgresql://${role}:${password}@127.0.0.1:5434/${database}?schema=public`,
    NODE_ENV: 'development', DISABLED_EMAIL: 'true', LOG_ENABLED: 'false', PRISMA_QUERY_LOG: 'false',
    BETTER_AUTH_SECRET: randomUUID() + randomUUID(), BETTER_AUTH_URL: 'http://127.0.0.1',
    BETTER_AUTH_TRUSTED_ORIGINS: 'http://127.0.0.1', FRONTEND_URL: 'http://127.0.0.1', TRUST_PROXY_HOPS: '0',
  });
  // Prisma migrations only on the database created above; output may contain connection details and stays in memory.
  try { execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }); }
  catch { throw new Error('Migration of the newly created isolated RNF database failed'); }
  const config = await import('../src/config/prisma.js'); prisma = config.getPrisma(); disconnect = config.disconnectPrisma;
  const user = await prisma.usuario.create({ data: { nome: 'QA RNF isolated', email: `rnf-${suffix}@doai.local`, cpf: suffix, cidade: 'Vilhena', uf: 'RO' } });
  const category = await prisma.categoria.create({ data: { nome: `RNF ${suffix}`, descricao: 'Synthetic category for isolated load checks' } });
  for (let offset = 0; offset < report.fixtureItems; offset += 500) await prisma.itemDoacao.createMany({ data: Array.from({ length: 500 }, (_, i) => ({ titulo: `RNF item ${offset + i}`, descricao: 'Synthetic item used only by the isolated load check.', usuario_id: user.id, categoria_id: category.id, cidade: 'Vilhena', uf: 'RO', condicao_item: 'USADO_BOM', status: 'DISPONIVEL' })) });
  assert.equal(await prisma.itemDoacao.count(), report.fixtureItems);
  const { default: app } = await import('../src/app.js');
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let requests = 0;
  const req = async (path, options = {}) => { requests++; return fetch(origin + path, { ...options, signal: AbortSignal.timeout(15000), redirect: 'error' }); };
  const paths = ['/itemdoacao?limit=20&page=1', '/itemdoacao?busca=RNF&cidade=Vilhena&uf=RO&limit=20&page=1', '/itemdoacao?limit=20&page=400'];
  for (const path of paths) { const response = await req(path); assert.equal(response.status, 200); const json = await response.json(); assert.equal(json.data.totalDocs, report.fixtureItems); }
  const lag = monitorEventLoopDelay({ resolution: 20 }); lag.enable();
  const cpuStart = process.cpuUsage(), wallStart = performance.now(), memoryStart = process.memoryUsage().rss;
  for (const [concurrency, count] of [[1, 30], [8, 120]]) {
    let index = 0; const timings = []; let errors = 0;
    await Promise.all(Array.from({ length: concurrency }, async () => { while (index < count) { const current = index++; const start = performance.now(); try { const response = await req(paths[current % paths.length]); if (response.status !== 200) errors++; const body = await response.json(); assert.equal(body.data.docs.length, 20); assert.equal(body.data.totalDocs, report.fixtureItems); } catch { errors++; } timings.push(performance.now() - start); } }));
    timings.sort((a, b) => a - b);
    samples.push({ concurrency, count, errors, medianMs: timings[Math.ceil(count * .5) - 1], p95Ms: timings[Math.ceil(count * .95) - 1], maxMs: timings[count - 1] });
  }
  const cpu = process.cpuUsage(cpuStart); lag.disable();
  report.resources = { wallMs: performance.now() - wallStart, cpuUserMs: cpu.user / 1000, cpuSystemMs: cpu.system / 1000, rssStartBytes: memoryStart, rssEndBytes: process.memoryUsage().rss, eventLoopP95Ms: lag.percentile(95) / 1e6 };
  const response = await req('/itemdoacao?limit=1');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.ok(response.headers.get('content-security-policy')); assert.ok(response.headers.get('ratelimit'));
  checks.push('Helmet and rate-limit headers present on real HTTP');
  assert.equal((await req('/perfil')).status, 498); assert.equal((await req('/api/auth/sign-in/email', { method: 'POST' })).status, 404);
  checks.push('Protected profile rejects anonymous with contract498 and native auth bypass stays blocked');
  for (let i = 0; i < 11; i++) { const response = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'invalid', senha: 'invalid' }) }); assert.equal(response.status, i === 10 ? 429 : 400); await response.arrayBuffer(); }
  checks.push('Login limiter rejects the eleventh invalid attempt');
  while (requests < 300) { const response = await req('/robots.txt'); assert.equal(response.status, 200); await response.arrayBuffer(); }
  assert.equal((await req('/robots.txt')).status, 429); checks.push('General limiter rejects request301 on its own fresh instance');
  report.samples = samples; report.checks = checks; report.requests = requests;
  report.passed = samples.every(sample => sample.errors === 0 && sample.p95Ms < report.targetMs && sample.maxMs < report.targetMs);
  report.limits = ['API timing only; not full page rendering', 'Short local sample; not sustained saturation or production SLA', 'Synthetic items without photos/interests', 'Does not prove human usability, Firefox/Safari compatibility or uptime'];
  assert.equal(report.passed, true);
} catch (error) {
  report.passed = false;
  process.exitCode = 1;
  console.error('RNF isolated check failed:', error.message);
} finally {
  report.cleanup = { passed: true };
  const cleanup = [
    async () => { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } },
    async () => { if (disconnect) await disconnect(); },
    async () => { if (createdDatabase) sql('postgres', `DROP DATABASE ${database};`); },
    async () => { if (createdRole) sql('postgres', `DROP ROLE ${role};`); },
  ];
  for (const operation of cleanup) try { await operation(); } catch {
    report.cleanup.passed = false; report.passed = false; process.exitCode = 1;
    console.error('Cleanup of this run failed; preserve its isolated database/role for investigation.');
  }
  try { await writeFile(new URL('../documentacao/rnf-172-resultado.json', import.meta.url), JSON.stringify(report, null, 2)); }
  catch { process.exitCode = 1; console.error('Cannot save RNF evidence.'); }
  console.log(JSON.stringify(report));
}

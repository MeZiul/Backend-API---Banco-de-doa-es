import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const runtimeManifest = resolve(here, 'node_modules/postman-runtime/package.json');
const runtimeRequire = createRequire(runtimeManifest);
const joseManifest = resolve(here, 'node_modules/postman-runtime/node_modules/jose/package.json');
const joseVersion = JSON.parse(readFileSync(joseManifest, 'utf8')).version;
assert.equal(joseVersion, '4.15.5', 'postman-runtime must resolve the patched jose v4 release');

// Observe the actual zlib bound used by jose 4.15.5 while preserving its implementation.
const zlib = runtimeRequire('zlib');
const originalInflateRaw = zlib.inflateRaw;
let maxInflatedBytes;
zlib.inflateRaw = function (input, options, callback) {
  maxInflatedBytes = options?.maxOutputLength;
  return originalInflateRaw.call(this, input, options, callback);
};

try {
  const jose = runtimeRequire('jose');
  const key = Buffer.alloc(32, 0x4d); // Synthetic test-only key; never used outside this check.

  const jwt = await new jose.SignJWT({ purpose: 'offline-regression' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(key);
  const verifiedJwt = await jose.jwtVerify(jwt, key, { algorithms: ['HS256'] });
  assert.equal(verifiedJwt.payload.purpose, 'offline-regression');

  const normalJwe = await new jose.CompactEncrypt(Buffer.from('small compressed fixture'))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', zip: 'DEF' })
    .encrypt(key);
  const normalResult = await jose.compactDecrypt(normalJwe, key);
  assert.equal(Buffer.from(normalResult.plaintext).toString(), 'small compressed fixture');

  // This static, 1.5 KiB token was created from 1 MiB of repeated test text. The large
  // plaintext is not built or retained by the regression itself.
  const oversizedJwe = readFileSync(new URL('./fixtures/jwe-over-limit.compact', import.meta.url), 'utf8').trim();
  assert.ok(Buffer.byteLength(oversizedJwe) < 300_000, 'the synthetic input stays below 300 KB');
  await assert.rejects(
    () => jose.compactDecrypt(oversizedJwe, key),
    (error) => error.code === 'ERR_JWE_DECOMPRESSION_FAILED',
  );
  assert.equal(maxInflatedBytes, 250_000, 'decompression output must remain capped below 300 KB');
} finally {
  zlib.inflateRaw = originalInflateRaw;
}

const requests = [];
const server = createServer((request, response) => {
  requests.push({ method: request.method, path: request.url, remote: request.socket.remoteAddress });
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{"ok":true}');
    return;
  }
  response.writeHead(404);
  response.end();
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

try {
  const { port } = server.address();
  const { default: newman } = await import('newman');
  const summary = await new Promise((resolveRun, rejectRun) => {
    newman.run({
      collection: {
        info: {
          name: 'Synthetic loopback smoke',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [{
          name: 'Local health request',
          request: { method: 'GET', url: `http://127.0.0.1:${port}/health` },
        }],
      },
      reporters: [],
      timeoutRequest: 2000,
    }, (error, result) => error ? rejectRun(error) : resolveRun(result));
  });

  assert.equal(summary.run.failures.length, 0);
  assert.equal(summary.run.stats.requests.total, 1);
  assert.equal(summary.run.executions[0].response.code, 200);
  assert.deepEqual(requests, [{ method: 'GET', path: '/health', remote: '127.0.0.1' }]);
} finally {
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}

console.log('MCP security checks PASS: JWT/JWE, 250000-byte jose inflate cap, and one Newman loopback request; no account credentials used.');

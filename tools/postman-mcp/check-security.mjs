import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const runtimeManifest = resolve(
  here,
  "node_modules/postman-runtime/package.json",
);
const runtimeRequire = createRequire(runtimeManifest);
const joseManifest = resolve(
  here,
  "node_modules/postman-runtime/node_modules/jose/package.json",
);
const joseVersion = JSON.parse(readFileSync(joseManifest, "utf8")).version;
assert.equal(
  joseVersion,
  "4.15.5",
  "postman-runtime must resolve the patched jose v4 release",
);

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assertUuidV4 = (value, label) =>
  assert.match(value, UUID_V4, `${label} must be a UUID v4`);

function packageVersionFor(entry, expectedName) {
  for (let directory = dirname(entry); ; directory = dirname(directory)) {
    const relativeDirectory = relative(here, directory);
    assert.ok(
      relativeDirectory === "" ||
        (!isAbsolute(relativeDirectory) &&
          relativeDirectory !== ".." &&
          !relativeDirectory.startsWith(`..${sep}`)),
      `resolved ${expectedName} package must stay inside the MCP installation`,
    );

    const manifest = resolve(directory, "package.json");
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, "utf8"));
      if (pkg.name === expectedName) return pkg.version;
    }
    assert.notEqual(
      directory,
      here,
      `could not find ${expectedName} package metadata`,
    );
  }
}

function uuidForConsumer(label, manifestPath, expectedVersion = "11.1.1") {
  const consumerRequire = createRequire(resolve(here, manifestPath));
  const uuidEntry = consumerRequire.resolve("uuid");
  const version = packageVersionFor(uuidEntry, "uuid");
  assert.equal(
    version,
    expectedVersion,
    `${label} must resolve the expected uuid release`,
  );
  return { consumerRequire, uuid: consumerRequire("uuid") };
}

const serialisedErrorUuid = uuidForConsumer(
  "serialised-error",
  "node_modules/serialised-error/package.json",
);
const collectionUuid = uuidForConsumer(
  "postman-collection",
  "node_modules/postman-collection/package.json",
);
const postmanRequestUuid = uuidForConsumer(
  "postman-request",
  "node_modules/postman-request/package.json",
);
const runtimeUuid = uuidForConsumer(
  "postman-runtime",
  "node_modules/postman-runtime/package.json",
);
assertUuidV4(postmanRequestUuid.uuid.v4(), "postman-request UUID v4");
assertUuidV4(runtimeUuid.uuid.v4(), "postman-runtime UUID v4");
const runtimePostmanRequestEntry = runtimeRequire.resolve("postman-request");
const runtimePostmanRequestRequire = createRequire(runtimePostmanRequestEntry);
assert.equal(
  packageVersionFor(runtimePostmanRequestRequire.resolve("uuid"), "uuid"),
  "11.1.1",
  "the request client used by postman-runtime must resolve the patched uuid release",
);

const mcpRequire = createRequire(
  resolve(here, "node_modules/@postman/postman-mcp-server/package.json"),
);
assert.equal(
  packageVersionFor(mcpRequire.resolve("uuid"), "uuid"),
  "13.0.2",
  "the MCP SDK must retain its existing uuid v13 release",
);

const SerialisedError = serialisedErrorUuid.consumerRequire("serialised-error");
assertUuidV4(
  new SerialisedError(new Error("synthetic only"), true).id,
  "serialised-error id",
);

const Collection = collectionUuid.consumerRequire("postman-collection");
const collectionItem = new Collection.Item({
  name: "Synthetic request",
  request: { method: "GET", url: "http://127.0.0.1/health" },
});
assertUuidV4(collectionItem.id, "postman-collection generated item id");

const superstring = collectionUuid.consumerRequire(
  "postman-collection/lib/superstring",
);
const substitutor = new superstring.Substitutor(
  [],
  superstring.Substitutor.DEFAULT_VARS,
);
assertUuidV4(
  substitutor.parse("{{$guid}}").toString(),
  "postman-collection $guid",
);

const requestDefinition = new Collection.Request({
  method: "GET",
  url: "http://127.0.0.1/health",
});
assert.equal(requestDefinition.method, "GET");
assert.equal(requestDefinition.url.toString(), "http://127.0.0.1/health");

assert.throws(
  () =>
    serialisedErrorUuid.uuid.v5(
      "x",
      serialisedErrorUuid.uuid.v5.DNS,
      new Uint8Array(8),
      4,
    ),
  RangeError,
  "uuid v5 must reject an undersized caller-provided output buffer",
);
assert.throws(
  () => serialisedErrorUuid.uuid.v6({}, new Uint8Array(8), 4),
  RangeError,
  "uuid v6 must reject an undersized caller-provided output buffer",
);

// Observe the actual zlib bound used by jose 4.15.5 while preserving its implementation.
const zlib = runtimeRequire("zlib");
const originalInflateRaw = zlib.inflateRaw;
let maxInflatedBytes;
zlib.inflateRaw = function (input, options, callback) {
  maxInflatedBytes = options?.maxOutputLength;
  return originalInflateRaw.call(this, input, options, callback);
};

try {
  const jose = runtimeRequire("jose");
  const key = Buffer.alloc(32, 0x4d); // Synthetic test-only key; never used outside this check.

  const jwt = await new jose.SignJWT({ purpose: "offline-regression" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(key);
  const verifiedJwt = await jose.jwtVerify(jwt, key, { algorithms: ["HS256"] });
  assert.equal(verifiedJwt.payload.purpose, "offline-regression");

  const normalJwe = await new jose.CompactEncrypt(
    Buffer.from("small compressed fixture"),
  )
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", zip: "DEF" })
    .encrypt(key);
  const normalResult = await jose.compactDecrypt(normalJwe, key);
  assert.equal(
    Buffer.from(normalResult.plaintext).toString(),
    "small compressed fixture",
  );

  // This static, 1.5 KiB token was created from 1 MiB of repeated test text. The large
  // plaintext is not built or retained by the regression itself.
  const oversizedJwe = readFileSync(
    new URL("./fixtures/jwe-over-limit.compact", import.meta.url),
    "utf8",
  ).trim();
  assert.ok(
    Buffer.byteLength(oversizedJwe) < 300_000,
    "the synthetic input stays below 300 KB",
  );
  await assert.rejects(
    () => jose.compactDecrypt(oversizedJwe, key),
    (error) => error.code === "ERR_JWE_DECOMPRESSION_FAILED",
  );
  assert.equal(
    maxInflatedBytes,
    250_000,
    "decompression output must remain capped below 300 KB",
  );
} finally {
  zlib.inflateRaw = originalInflateRaw;
}

const requests = [];
const server = createServer((request, response) => {
  requests.push({
    method: request.method,
    path: request.url,
    remote: request.socket.remoteAddress,
    postmanToken: request.headers["postman-token"],
  });
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end('{"ok":true}');
    return;
  }
  response.writeHead(404);
  response.end();
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});

try {
  const { port } = server.address();
  const { default: newman } = await import("newman");
  const summary = await new Promise((resolveRun, rejectRun) => {
    newman.run(
      {
        collection: {
          info: {
            name: "Synthetic loopback smoke",
            schema:
              "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
          },
          item: [
            {
              name: "Local health request",
              request: {
                method: "GET",
                url: `http://127.0.0.1:${port}/health`,
              },
            },
          ],
        },
        reporters: [],
        timeoutRequest: 2000,
      },
      (error, result) => (error ? rejectRun(error) : resolveRun(result)),
    );
  });

  assert.equal(summary.run.failures.length, 0);
  assert.equal(summary.run.stats.requests.total, 1);
  assert.equal(summary.run.executions[0].response.code, 200);
  assert.equal(
    requests.length,
    1,
    "Newman must make exactly one loopback request",
  );
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].path, "/health");
  assert.equal(requests[0].remote, "127.0.0.1");
  assertUuidV4(requests[0].postmanToken, "postman-runtime Postman-Token");
} finally {
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
}

console.log(
  "MCP security checks PASS: UUID consumer compatibility and short-buffer guards, JWT/JWE, 250000-byte jose inflate cap, and one Newman loopback request; no account credentials used.",
);

import assert from "node:assert/strict";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

assert.equal(process.env.NODE_ENV, "test", "Execute em ambiente de testes.");

async function smtpContract() {
  const password = randomUUID();
  let messages = [], authentications = 0, rejectRecipient = false;
  const connections = new Set();
  const server = net.createServer((socket) => {
    connections.add(socket);
    socket.on("close", () => connections.delete(socket));
    let pending = "", collecting = false, body = [];
    socket.write("220 localhost Synthetic QA SMTP\r\n");
    socket.on("data", (chunk) => {
      pending += chunk.toString();
      let end;
      while ((end = pending.indexOf("\r\n")) >= 0) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (collecting) {
          if (line !== ".") { body.push(line); continue; }
          collecting = false;
          messages.push(body.join("\r\n"));
          body = [];
          socket.write("250 Synthetic message accepted\r\n");
        } else if (/^(EHLO|HELO) /i.test(line)) {
          socket.write("250-localhost\r\n250-AUTH PLAIN\r\n250 SIZE 1048576\r\n");
        } else if (/^AUTH PLAIN /i.test(line)) {
          const [, user, pass] = Buffer.from(line.slice(11), "base64").toString().split("\0");
          if (user === "qa-smtp" && pass === password) {
            authentications++;
            socket.write("235 Synthetic authenticated\r\n");
          } else socket.write("535 Authentication failed\r\n");
        } else if (/^MAIL FROM:/i.test(line)) socket.write("250 OK\r\n");
        else if (/^RCPT TO:/i.test(line)) socket.write(rejectRecipient ? "550 Synthetic recipient refused\r\n" : "250 OK\r\n");
        else if (line.toUpperCase() === "DATA") { collecting = true; socket.write("354 End with dot\r\n"); }
        else if (line.toUpperCase() === "QUIT") socket.end("221 Goodbye\r\n");
        else if (line.toUpperCase() === "RSET") socket.write("250 OK\r\n");
        else socket.write("500 Unsupported command\r\n");
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  Object.assign(process.env, {
    EMAIL_HOST: "127.0.0.1", EMAIL_PORT: String(server.address().port), EMAIL_SECURE: "false",
    EMAIL_USER: "qa-smtp", EMAIL_PASS: password, EMAIL_FROM: "noreply@doai.invalid",
    FRONTEND_URL: "http://127.0.0.1:5173", COMPANY_NAME: "DoaI QA", DISABLED_EMAIL: "true",
  });
  try {
    const { default: SendMail } = await import("../src/utils/SendMail.js");
    const { default: MailService } = await import("../src/infra/MailService.js");
    const mail = new MailService();
    const token = "synthetic-recovery-token";
    assert.deepEqual(await SendMail.enviaEmail({ to: "recipient@doai.invalid" }), { ok: true, disabled: true });
    assert.equal(messages.length, 0);
    process.env.DISABLED_EMAIL = "false";
    const result = await mail.enviarLinkRecuperacao({ email: "recipient@doai.invalid", token });
    assert.equal(result.ok, true);
    assert.deepEqual(result.info.accepted, ["recipient@doai.invalid"]);
    assert.equal(messages.length, 1);
    assert.equal(authentications, 1);
    assert.match(messages[0], /multipart\/alternative/);
    assert.match(messages[0], /text\/plain/);
    assert.match(messages[0], /text\/html/);
    assert.match(messages[0], /redefinir-senha\?token/);
    assert.match(messages[0], /synthetic-recovery-token/);
    assert.match(messages[0], /Message-ID:/i);
    rejectRecipient = true;
    await assert.rejects(mail.enviarLinkRecuperacao({ email: "refused@doai.invalid", token }), /Não foi possível enviar/);
    assert.equal(messages.length, 1);
    console.log("PASS: SMTP real local, auth sintética, recuperação text/html, e-mail desabilitado e erro do destinatário.");
  } finally {
    for (const socket of connections) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function sdkContracts() {
  const { GoogleAuth, OAuth2Client } = await import("google-auth-library");
  assert.ok(new GoogleAuth({ scopes: [] }));
  const oauth = new OAuth2Client("synthetic-client", "synthetic-secret", "http://127.0.0.1/callback");
  assert.equal(new URL(oauth.generateAuthUrl({ scope: "openid", state: "synthetic" })).searchParams.get("client_id"), "synthetic-client");
  const { initializeApp, deleteApp } = await import("firebase-admin/app");
  const app = initializeApp({ projectId: "doai-qa-synthetic", credential: {
    getAccessToken: async () => ({ access_token: "synthetic-token", expires_in: 60 }),
  } }, "qa-dependencies");
  assert.equal(app.options.projectId, "doai-qa-synthetic");
  await deleteApp(app);
  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { getNodeAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-node");
  const { resourceFromAttributes } = await import("@opentelemetry/resources");
  const { JaegerExporter } = await import("@opentelemetry/exporter-jaeger");
  assert.ok(new NodeSDK({ resource: resourceFromAttributes({ "service.name": "qa-dependencies" }) }));
  assert.ok(getNodeAutoInstrumentations().length > 0);
  const exporter = new JaegerExporter({ endpoint: "http://127.0.0.1:1/api/traces" });
  await exporter.shutdown();
  // Check the exact legacy CJS imports used by Jaeger and Google wrappers.
  for (const parent of ["jaeger-client", "google-gax", "teeny-request"]) {
    const required = createRequire(import.meta.resolve(parent));
    const uuid = required("uuid");
    assert.match(uuid.v4(), /^[0-9a-f-]{36}$/);
    assert.equal(uuid.v5("hello", uuid.v5.DNS), "9342d47a-1bab-5709-9869-c840b2eac501");
    assert.throws(() => uuid.v5("hello", uuid.v5.DNS, Buffer.alloc(1)), RangeError);
  }
  console.log("PASS: SDKs importam/inicializam e UUID CJS compatível; nenhuma chamada externa, login Google ou telemetria de produção.");
}

async function watchContract() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "doai-qa170-watch-"));
  const entry = path.join(directory, "entry.mjs");
  let child;
  try {
    await fs.writeFile(entry, "console.log('QA_WATCH_ONE'); setInterval(() => {}, 1000);\n");
    child = spawn(process.execPath, ["--watch", "--watch-preserve-output", entry], { cwd: directory, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    async function waitFor(marker) {
      const started = Date.now();
      while (!output.includes(marker)) {
        assert.equal(child.exitCode, null, "O watcher encerrou antes do reload.");
        assert.ok(Date.now() - started < 15000, "Timeout no watcher nativo.");
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    await waitFor("QA_WATCH_ONE");
    await fs.writeFile(entry, "console.log('QA_WATCH_TWO'); setInterval(() => {}, 1000);\n");
    await waitFor("QA_WATCH_TWO");
    console.log("PASS: node --watch inicia e reinicia após mudança do módulo sintético.");
  } finally {
    if (child?.pid && child.exitCode === null) {
      if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    }
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("doai-qa170-watch-"));
    await fs.rm(resolved, { recursive: true });
  }
}

try {
  await smtpContract();
  await sdkContracts();
  await watchContract();
} catch (error) {
  console.error("Dependency contracts FAIL:", error.message);
  process.exitCode = 1;
}

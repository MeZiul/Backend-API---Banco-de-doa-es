import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Credencial sintética, sem conta Postman. Nenhuma ferramenta é chamada.
const client = new Client({
  name: "doai-local-protocol-check",
  version: "1.0.0",
});
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL("./start.mjs", import.meta.url))],
  env: {
    PATH: process.env.PATH || "",
    POSTMAN_API_KEY: "local-protocol-check-not-a-real-key",
    POSTMAN_MCP_TELEMETRY: "false",
    NODE_OPTIONS: `--import=${new URL("./disable-test-network.mjs", import.meta.url).href}`,
  },
  stderr: "pipe",
});
try {
  await client.connect(transport);
  const result = await client.listTools();
  assert.ok(result.tools.length > 0);
  assert.ok(result.tools.some(({ name }) => name === "getWorkspaces"));
  const template = readFileSync(
    new URL(
      "../../documentacao/postman/codex-mcp.toml.example",
      import.meta.url,
    ),
    "utf8",
  );
  const allowed = JSON.parse(
    template.match(/^enabled_tools = (\[[^\n]+\])$/m)[1],
  );
  assert.equal(allowed.length, 7);
  assert.ok(
    allowed.every(
      (name) =>
        name.startsWith("get") &&
        result.tools.some((tool) => tool.name === name),
    ),
  );
  console.log(
    `Protocolo MCP stdio PASS: ${result.tools.length} ferramentas disponíveis; a configuração de exemplo mantém ${allowed.length} leituras permitidas; rede desativada e nenhuma conta autenticada.`,
  );
} finally {
  await client.close();
}

import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const manifest = new URL(
  "./node_modules/@postman/postman-mcp-server/package.json",
  import.meta.url,
);
if (!existsSync(manifest)) {
  console.error(
    "Instale a integração local com npm ci --prefix tools/postman-mcp --ignore-scripts.",
  );
  process.exit(1);
}
const { version, bin } = JSON.parse(readFileSync(manifest, "utf8"));
if (
  version !== "2.13.0" ||
  (typeof bin === "string" ? bin : bin["postman-mcp-server"]) !==
    "dist/src/index.js"
) {
  console.error(
    "Pacote inesperado. Revise a versão e o lockfile da integração.",
  );
  process.exit(1);
}
if (process.argv.includes("--check")) {
  console.log(
    `Postman MCP oficial ${version} instalado; transporte stdio, ferramentas mínimas.`,
  );
  process.exit(0);
}
if (!process.env.POSTMAN_API_KEY || /\s/.test(process.env.POSTMAN_API_KEY)) {
  console.error(
    "POSTMAN_API_KEY ausente ou inválida. Defina a chave em ambiente local ou no cofre do host MCP.",
  );
  process.exit(1);
}
// O servidor oficial recebe a chave só pelo ambiente; não há listener HTTP.
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL(
        "./node_modules/@postman/postman-mcp-server/dist/src/index.js",
        import.meta.url,
      ),
    ),
    "--quiet",
  ],
  { stdio: "inherit", env: process.env, windowsHide: true },
);
child.on("error", () => {
  console.error("Não foi possível iniciar o Postman MCP local.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));

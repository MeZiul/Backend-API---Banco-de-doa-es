// Aplicado somente pelo check-protocol: bloqueia fetch no processo MCP de teste.
globalThis.fetch = async () => { throw new Error('Rede desativada durante o teste local de protocolo MCP.'); };

// Compartilhado por navegador e testes; não usa DOM, rede, storage ou eval.
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const isSensitive = (key) => /token|senha|password|authorization|secret|cookie/i.test(key);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const valueAt = (object, path) => path?.split('.').reduce((value, key) => value?.[key], object);
const idOf = (value) => typeof value === 'object' && value ? value._id : value;
const documents = (json) => Array.isArray(json?.data) ? json.data : (Array.isArray(json?.data?.docs) ? json.data.docs : []);
const activeCategory = (json) => documents(json).find((item) => item.ativo !== false && UUID.test(item._id || ''));
const substitute = (text, variables, mode) => text.replace(/\{\{([^{}]+)\}\}/g, (_match, key) => {
  const value = key === '$timestamp' ? String(Math.floor(Date.now() / 1000)) : (own(variables, key) ? variables[key] : '');
  if (value === '' || value == null) throw new Error(`Preencha a variável ${key}.`);
  if (mode === 'path' && isSensitive(key)) throw new Error('Credenciais não podem aparecer na URL.');
  return mode === 'path' ? encodeURIComponent(String(value)) : JSON.stringify(String(value)).slice(1, -1);
});

export function prepareRequest(draft, variables, origin) {
  const method = String(draft.method).toUpperCase();
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Método não suportado.');
  const path = substitute(String(draft.path).trim(), variables, 'path');
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\s#]/.test(path)) throw new Error('Use somente um caminho relativo desta API.');
  let decoded = path;
  for (let i = 0; i < 3; i++) {
    try { decoded = decodeURIComponent(decoded); } catch { throw new Error('URL inválida.'); }
    if (/[\\]/.test(decoded) || /(?:^|\/)\.{1,2}(?:\/|\?|$)/.test(decoded) || decoded.startsWith('//')) throw new Error('Caminho não permitido.');
  }
  const url = new URL(path, origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) throw new Error('Destino externo bloqueado.');
  // Impede acessar endpoints nativos BetterAuth, assets e outros serviços do host.
  if (!/^\/(auth|usuario|perfil|categorias|itemdoacao|itens|interesses|avaliacoes|denuncias|notificacoes|admin)(\/|\?|$)/.test(decoded)
    && !(url.pathname === '/docs.json' && method === 'GET')) throw new Error('Caminho fora da API suportada.');
  for (const [key, value] of url.searchParams) {
    if (isSensitive(key) || Object.entries(variables).some(([name, secret]) => isSensitive(name) && secret && value.includes(secret))) {
      throw new Error('Credenciais não podem aparecer na URL.');
    }
  }
  if (Object.entries(variables).some(([key, value]) => isSensitive(key) && value && decoded.includes(String(value)))) throw new Error('Credenciais não podem aparecer na URL.');
  if ((draft.body || '').length > 65536) throw new Error('Corpo maior que 64 KiB.');
  let body;
  if (draft.body && method !== 'GET') {
    try { body = JSON.stringify(JSON.parse(substitute(draft.body, variables, 'json'))); }
    catch (error) { if (error instanceof SyntaxError) throw new Error('Corpo JSON inválido.'); throw error; }
  }
  if (body && new TextEncoder().encode(body).byteLength > 65536) throw new Error('Corpo maior que 64 KiB.');
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (draft.mode === 'multipart') {
    if (method !== 'POST' || !/^\/itemdoacao\/[0-9a-f-]{36}\/fotos$/i.test(url.pathname)) throw new Error('Fotos somente no endpoint de upload de item.');
    if (!draft.files?.length || draft.files.length > 5 || draft.files.some((file) => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) throw new Error('Selecione até cinco fotos JPEG, PNG ou WebP de até 5 MiB cada.');
    body = new FormData();
    for (const file of draft.files) body.append('fotos', file);
    delete headers['Content-Type'];
  }
  if (draft.tokenVariable) {
    const token = variables[draft.tokenVariable];
    if (!token || /\s/.test(token) || token.length > 4096) throw new Error('Preencha o token selecionado.');
    headers.Authorization = `Bearer ${token}`;
  }
  return { url: url.href, options: { method, headers, body, credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' } };
}

export function evaluateResponse(request, status, json, variables) {
  const ok = request.statuses.includes(status);
  const results = [{ label: `HTTP esperado: ${request.statuses.join(' / ')}`, passed: ok }];
  const captured = [];
  if (ok) for (const rule of request.captures) {
    const value = rule.kind === 'category' ? activeCategory(json)?._id : (valueAt(json, rule.path) ?? valueAt(json, rule.alternative));
    const valid = rule.kind === 'token' ? typeof value === 'string' && value.length > 0 && value.length <= 4096 && !/\s/.test(value) : UUID.test(String(value || ''));
    results.push({ label: `Captura ${rule.key}`, passed: valid });
    if (valid) { variables[rule.key] = value; captured.push(rule.key); }
  }
  for (const rule of request.checks) {
    let passed = false;
    if (ok) switch (rule.kind) {
      case 'equals': passed = valueAt(json, rule.path) === rule.value; break;
      case 'equalsVariable': passed = !!variables[rule.variable] && valueAt(json, rule.path) === variables[rule.variable]; break;
      case 'openapi': passed = /^3\./.test(json?.openapi || ''); break;
      case 'login': passed = !!(json?.data?.token || json?.token) && UUID.test(json?.data?.usuario?._id || json?.usuario?._id || ''); break;
      case 'category': passed = !!activeCategory(json); break;
      case 'itemSearch': passed = !!variables.itemId && documents(json).some((item) => item._id === variables.itemId && item.status === 'DISPONIVEL'); break;
      case 'interest': passed = !!variables.itemId && !!variables.interesseId && documents(json).some((item) => item._id === variables.interesseId && idOf(item.item_id) === variables.itemId); break;
      case 'denunciation': passed = !!variables.denunciaId && documents(json).some((item) => item._id === variables.denunciaId); break;
      case 'notification': passed = !!variables[rule.reference] && documents(json).some((item) => item.tipo === rule.type && (!rule.title || item.titulo === rule.title) && idOf(item.referencia_id) === variables[rule.reference]); break;
    }
    results.push({ label: rule.label, passed });
  }
  return { results, captured };
}

export function redact(value, variables = {}) {
  if (Array.isArray(value)) return value.map((entry) => redact(entry, variables));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, isSensitive(key) ? '[oculto]' : redact(entry, variables)]));
  if (typeof value === 'string') {
    for (const [key, secret] of Object.entries(variables)) if (isSensitive(key) && secret) value = value.split(String(secret)).join('[oculto]');
  }
  return value;
}

export async function readResponse(response, limit = 1024 * 1024) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > limit) throw new Error('Resposta maior que 1 MiB; consulte a API com paginação.');
      text += decoder.decode(value, { stream: true });
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

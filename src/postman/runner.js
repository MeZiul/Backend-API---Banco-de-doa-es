import { prepareRequest, evaluateResponse, redact, readResponse, isSensitive } from './core.js';

const $ = (id) => document.getElementById(id);
let collection, selected = 0, busy = false, stopped = false, controller, generation = 0;
let variables = Object.create(null);
const observedTokens = new Set();
const status = (message) => { $('status').textContent = message; };
const inputs = new Map();
const credentialValues = () => ({ ...variables, ...Object.fromEntries([...observedTokens].map((token, index) => [`historicalToken${index}`, token])) });

function busyState(value) {
  busy = value;
  for (const id of ['send', 'run', 'method', 'path', 'token', 'body', 'mode', 'files']) $(id).disabled = value;
  for (const input of inputs.values()) input.disabled = value;
  for (const button of $('requests').querySelectorAll('button')) button.disabled = value;
  $('stop').disabled = !value;
}
function syncVariables() {
  for (const [key, input] of inputs) input.value = variables[key] || '';
}
function select(index) {
  selected = index;
  const item = collection.requests[index];
  $('request-title').textContent = item.name;
  $('method').value = item.method; $('path').value = item.path;
  $('token').value = item.tokenVariable; $('body').value = item.body;
  $('mode').value = 'json'; $('files').value = ''; setMode();
  for (const [n, button] of [...$('requests').querySelectorAll('button')].entries()) {
    if (n === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  }
}
function setMode() { $('json-label').hidden = $('mode').value !== 'json'; $('file-label').hidden = $('mode').value !== 'multipart'; }
function render() {
  $('variables').replaceChildren(); $('requests').replaceChildren(); inputs.clear();
  $('token').replaceChildren(new Option('Sem Bearer', ''));
  for (const { key } of collection.variables) {
    const label = document.createElement('label'), input = document.createElement('input');
    label.textContent = key; input.id = `variable-${key}`;
    input.type = isSensitive(key) ? 'password' : 'text'; input.autocomplete = 'off'; input.maxLength = 4096;
    input.addEventListener('input', () => { variables[key] = input.value; });
    label.append(input); $('variables').append(label); inputs.set(key, input);
    if (/Token$/.test(key)) $('token').append(new Option(key, key));
  }
  for (const [index, item] of collection.requests.entries()) {
    const li = document.createElement('li'), button = document.createElement('button');
    button.type = 'button'; button.textContent = item.name;
    button.addEventListener('click', () => select(index)); li.append(button); $('requests').append(li);
  }
  $('workspace').hidden = false; $('access').hidden = true; select(0); syncVariables();
}
function history(message, passed) {
  const li = document.createElement('li'); li.textContent = message; li.className = passed ? 'pass' : 'fail';
  $('history').prepend(li); while ($('history').children.length > 100) $('history').lastChild.remove();
}
function clear() {
  generation++; stopped = true; controller?.abort(); collection = undefined; variables = Object.create(null); observedTokens.clear();
  for (const input of inputs.values()) input.value = ''; inputs.clear();
  $('access-token').value = ''; $('body').value = ''; $('path').value = ''; $('files').value = '';
  for (const id of ['variables', 'requests', 'history', 'checks']) $(id).replaceChildren();
  $('response').textContent = 'Sessão limpa.'; $('workspace').hidden = true; $('access').hidden = false; busyState(false);
}
async function boundedFetch(url, options, timeout = 20000) {
  controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try { const response = await fetch(url, { ...options, signal: controller.signal }); return { status: response.status, text: await readResponse(response) }; }
  finally { clearTimeout(timer); }
}
async function execute(request, draft = request) {
  const current = generation, started = performance.now();
  const plan = draft.method === request.method && draft.path === request.path && draft.mode !== 'multipart'
    ? request : { name: 'Requisição editada', statuses: [200, 201, 202, 204], captures: [], checks: [] };
  const prepared = prepareRequest(draft, credentialValues(), window.location.origin);
  // Registrar antes do dispatch preserva tokens manuais, mesmo com erro/abort
  // ou quando o usuário substitui posteriormente o valor da variável.
  if (prepared.options.headers.Authorization) observedTokens.add(prepared.options.headers.Authorization.slice(7));
  $('request-title').textContent = plan.name;
  status(`Executando ${plan.name}…`);
  const response = await boundedFetch(prepared.url, prepared.options);
  if (current !== generation || stopped) throw new Error('Execução interrompida; a API pode ter recebido a operação.');
  let json; try { json = JSON.parse(response.text); } catch { json = null; }
  const evaluation = evaluateResponse(plan, response.status, json, variables);
  for (const key of evaluation.captured) if (/Token$/.test(key)) observedTokens.add(variables[key]);
  syncVariables();
  $('response').textContent = `HTTP ${response.status} · ${Math.round(performance.now() - started)} ms\n${json ? JSON.stringify(redact(json, credentialValues()), null, 2) : redact(response.text, credentialValues())}`;
  $('checks').replaceChildren();
  for (const result of evaluation.results) {
    const li = document.createElement('li'); li.textContent = `${result.passed ? 'PASSOU' : 'FALHOU'} · ${result.label}`;
    li.className = result.passed ? 'pass' : 'fail'; $('checks').append(li);
  }
  const passed = evaluation.results.every((result) => result.passed);
  history(`${plan.name} · HTTP ${response.status} · ${passed ? 'PASSOU' : 'FALHOU'}${evaluation.captured.length ? ` · capturado: ${evaluation.captured.join(', ')}` : ''}`, passed);
  return passed;
}
$('connect-form').addEventListener('submit', async (event) => {
  event.preventDefault(); if (busy) return;
  const token = $('access-token').value.trim();
  if (!token || /\s/.test(token)) { status('Informe um Bearer válido sem espaços.'); return; }
  $('connect').disabled = true; busy = true; const current = generation;
  try {
    const response = await boundedFetch('/docs/postman/collection', { headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (current !== generation) return;
    if (response.status !== 200) throw new Error(`Coleção não disponível (HTTP ${response.status}). Verifique o administrador e a sessão.`);
    collection = JSON.parse(response.text); variables.adminToken = token; observedTokens.add(token); $('access-token').value = ''; stopped = false;
    render(); status('Coleção aberta. Preencha as variáveis antes de executar o fluxo.');
  } catch (error) { status(error.name === 'AbortError' ? 'Tempo limite ao abrir a coleção.' : error.message); }
  finally { busy = false; $('connect').disabled = false; }
});
$('send').addEventListener('click', async () => {
  if (busy || !collection) return;
  const current = generation; stopped = false; busyState(true);
  try {
    const draft = { method: $('method').value, path: $('path').value, body: $('mode').value === 'json' ? $('body').value : '', tokenVariable: $('token').value, mode: $('mode').value, files: [...$('files').files] };
    const passed = await execute(collection.requests[selected], draft);
    status(passed ? 'Requisição concluída e verificações aprovadas.' : 'Requisição concluída com verificações falhas.');
  } catch (error) { if (current === generation) status(error.name === 'AbortError' ? 'Requisição interrompida ou tempo limite. Confira o estado na API antes de repetir.' : error.message); }
  finally { if (current === generation) busyState(false); }
});
$('run').addEventListener('click', async () => {
  if (busy || !collection) return;
  if (!window.confirm('Executar as 27 etapas? O fluxo cria item, interesse, avaliações e denúncia nesta API e altera seus estados.')) return;
  const current = generation; stopped = false; busyState(true);
  // Evita reutilizar IDs e resultados de um fluxo anterior.
  for (const key of Object.keys(variables)) if (/Id$/.test(key) || /Token$/.test(key) && key !== 'adminToken') variables[key] = '';
  syncVariables();
  try {
    for (const request of collection.requests) {
      if (stopped) break; select(request.id);
      if (!await execute(request)) { status(`Fluxo interrompido na etapa ${request.id}: verificações falharam.`); return; }
    }
    status(stopped ? 'Fluxo interrompido.' : '27 etapas concluídas com verificações aprovadas.');
  } catch (error) { if (current === generation) status(error.name === 'AbortError' ? 'Fluxo interrompido ou tempo limite. Confira o estado na API antes de repetir.' : error.message); }
  finally { if (current === generation) busyState(false); }
});
$('stop').addEventListener('click', () => { stopped = true; controller?.abort(); });
$('mode').addEventListener('change', setMode);
$('logout').addEventListener('click', async () => {
  const pending = busy;
  const tokens = [...new Set([...observedTokens, ...Object.entries(variables).filter(([key, value]) => /Token$/.test(key) && value).map(([, value]) => value)])];
  clear(); status('Sessão da aba limpa. Revogando os tokens utilizados…'); $('connect').disabled = true;
  const results = await Promise.allSettled(tokens.map(async (token) => {
    const response = await fetch('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Sessão não revogada');
  }));
  $('connect').disabled = false;
  status(results.some((result) => result.status === 'rejected') ? 'Dados da aba apagados. Não foi possível confirmar a revogação de todas as sessões na API.' : pending ? 'Dados da aba apagados e tokens conhecidos revogados. Uma operação interrompida pode ter sido concluída pela API.' : 'Dados da aba apagados e sessões revogadas.');
});
window.addEventListener('pagehide', clear);

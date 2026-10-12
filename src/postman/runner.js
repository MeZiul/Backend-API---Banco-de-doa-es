import { prepareRequest, evaluateResponse, redact, readResponse, isSensitive } from './core.js';

const $ = (id) => document.getElementById(id);
let collection, selected = 0, busy = false, stopped = false, controller, generation = 0, activeIndex = null;
let failureIndex = null, failureWasDispatched = false, manualWriteUncertain = null, retryingUncertainIndex = null;
let batchStartedAt = null, batchElapsedMs = null;
let variables = Object.create(null);
const observedTokens = new Set();
const stepResults = new Map();
const status = (message) => { $('status').textContent = message; };
const inputs = new Map();
const credentialValues = () => ({ ...variables, ...Object.fromEntries([...observedTokens].map((token, index) => [`historicalToken${index}`, token])) });
const timeLabel = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function busyState(value) {
  busy = value;
  for (const id of ['send', 'run', 'method', 'path', 'token', 'body', 'mode', 'files']) $(id).disabled = value;
  for (const input of inputs.values()) input.disabled = value;
  for (const button of $('requests').querySelectorAll('button')) button.disabled = value;
  $('stop').disabled = !value;
  $('resume').disabled = value || failureIndex === null || failureIndex >= collection.requests.length - 1;
  $('retry').disabled = value || failureIndex === null;
}
function syncVariables() {
  for (const [key, input] of inputs) input.value = variables[key] || '';
}
function setStepState(index, state) {
  const button = $('requests').querySelectorAll('button')[index];
  if (!button) return;
  button.dataset.state = state;
  const labels = { pending: 'Pendente', running: 'Em andamento', passed: 'Verificada', failed: 'Falhou', uncertain: 'Resultado incerto' };
  button.setAttribute('aria-label', `${collection.requests[index].name} · ${labels[state] || state}`);
}
function renderAttemptOutput(attempt) {
  $('response').textContent = attempt?.response || 'Esta tentativa não tem uma resposta confiável da API.';
  $('checks').replaceChildren();
  for (const result of attempt?.checks || []) {
    const li = document.createElement('li'); li.textContent = `${result.passed ? 'PASSOU' : 'FALHOU'} · ${result.label}`;
    li.className = result.passed ? 'pass' : 'fail'; $('checks').append(li);
  }
}
function renderStepOutput(index) {
  const attempts = stepResults.get(index) || [];
  const picker = $('attempt-picker'), select = $('attempt-select');
  select.replaceChildren();
  picker.hidden = attempts.length < 2;
  attempts.forEach((attempt, n) => {
    const label = `${attempt.at} · tentativa ${n + 1} · ${attempt.httpStatus ? `HTTP ${attempt.httpStatus}` : 'sem resposta'}`;
    select.append(new Option(label, String(n)));
  });
  if (attempts.length) {
    select.value = String(attempts.length - 1);
    renderAttemptOutput(attempts.at(-1));
  } else renderAttemptOutput(null);
}
function matchesCollectionRequest(request, draft) {
  return draft.method === request.method
    && draft.path === request.path
    && draft.body === request.body
    && draft.tokenVariable === request.tokenVariable
    && draft.mode !== 'multipart';
}
function rememberAttempt(index, attempt) {
  const attempts = stepResults.get(index) || [];
  attempts.push({ at: new Date().toLocaleTimeString(), ...attempt });
  stepResults.set(index, attempts);
  if (selected === index) renderStepOutput(index);
}
function select(index) {
  selected = index;
  const item = collection.requests[index];
  $('request-title').textContent = item.name;
  $('method').value = item.method; $('path').value = item.path;
  $('token').value = item.tokenVariable; $('body').value = item.body;
  $('mode').value = 'json'; $('files').value = ''; setMode(); renderStepOutput(index);
  for (const [n, button] of [...$('requests').querySelectorAll('button')].entries()) {
    if (n === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  }
}
function setMode() { $('json-label').hidden = $('mode').value !== 'json'; $('file-label').hidden = $('mode').value !== 'multipart'; }
function applyFilter() {
  const normalize = (value) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const query = normalize($('filter').value.trim());
  const steps = [...$('requests').querySelectorAll('li')];
  let visible = 0;
  for (const li of steps) {
    li.hidden = !normalize(li.textContent).includes(query);
    if (!li.hidden) visible++;
  }
  $('step-total').textContent = query ? `${visible} / ${steps.length}` : String(steps.length);
}
function render() {
  $('variables').replaceChildren(); $('requests').replaceChildren(); inputs.clear(); stepResults.clear();
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
    button.type = 'button'; button.textContent = item.name; button.dataset.state = 'pending';
    button.addEventListener('click', () => select(index)); li.append(button); $('requests').append(li);
  }
  $('step-total').textContent = String(collection.requests.length);
  $('run-progress').max = collection.requests.length; $('run-progress').value = 0;
  $('run-count').textContent = `0 / ${collection.requests.length}`;
  $('filter').value = ''; applyFilter();
  failureIndex = null; failureWasDispatched = false; $('recovery-note').hidden = true;
  $('workspace').hidden = false; $('access').hidden = true; select(0); syncVariables(); busyState(false);
  $('run-current').textContent = 'Pronto para executar a coleção.';
  batchStartedAt = null; batchElapsedMs = null; updateElapsed();
}
function history(message, passed) {
  const li = document.createElement('li'); li.textContent = `${timeLabel()} · ${message}`; li.className = passed ? 'pass' : 'fail';
  $('history').prepend(li); while ($('history').children.length > 100) $('history').lastChild.remove();
}
function formatElapsed(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}
function updateElapsed(activeSeconds = null) {
  const elapsed = batchStartedAt === null ? batchElapsedMs : performance.now() - batchStartedAt;
  if (activeSeconds !== null) {
    const total = elapsed === null ? '' : ` · fluxo ${formatElapsed(elapsed)}`;
    $('run-time').textContent = `Aguardando resposta · ${activeSeconds}s nesta etapa${total} · limite de 20s por requisição`;
  } else $('run-time').textContent = elapsed === null ? 'Sem requisição em andamento.' : `Tempo decorrido nesta execução · ${formatElapsed(elapsed)}.`;
}
function updateProgress(completed, currentText) {
  const total = collection?.requests.length || 0;
  $('run-progress').value = Math.min(completed, total);
  $('run-count').textContent = `${Math.min(completed, total)} / ${total}`;
  $('run-current').textContent = currentText;
  updateElapsed();
}
function verifiedStepCount() {
  return [...$('requests').querySelectorAll('button')].filter((button) => button.dataset.state === 'passed').length;
}
function clear() {
  generation++; stopped = true; controller?.abort(); collection = undefined; variables = Object.create(null); observedTokens.clear(); stepResults.clear(); failureIndex = null; failureWasDispatched = false; manualWriteUncertain = null; retryingUncertainIndex = null; activeIndex = null; batchStartedAt = null; batchElapsedMs = null;
  for (const input of inputs.values()) input.value = ''; inputs.clear();
  $('access-token').value = ''; $('body').value = ''; $('path').value = ''; $('files').value = '';
  for (const id of ['variables', 'requests', 'history', 'checks']) $(id).replaceChildren();
  $('response').textContent = 'Sessão limpa.'; $('run-progress').value = 0; $('run-count').textContent = '0 / 27';
  $('run-current').textContent = 'Sessão limpa.'; updateElapsed(); $('recovery-note').hidden = true;
  $('workspace').hidden = true; $('access').hidden = false; busyState(false);
}
async function boundedFetch(url, options, timeout = 20000) {
  controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try { const response = await fetch(url, { ...options, signal: controller.signal }); return { status: response.status, text: await readResponse(response) }; }
  finally { clearTimeout(timer); }
}
function offerRecovery(index, note, dispatched = true) {
  failureIndex = index; failureWasDispatched = dispatched;
  const request = collection.requests[index];
  $('retry').textContent = `Reexecutar da etapa ${index + 1}`;
  $('resume').textContent = `Continuar após a etapa ${index + 1}`;
  $('recovery-note').textContent = note;
  $('recovery-note').hidden = false;
  if (request.method === 'GET') $('recovery-note').textContent += ' Como esta etapa é GET, repetir a consulta e continuar é somente leitura.';
  busyState(busy);
}
async function execute(request, draft = request, { batchIndex = null } = {}) {
  const current = generation, started = performance.now();
  const isCollectionRequest = matchesCollectionRequest(request, draft);
  const plan = isCollectionRequest ? request : { name: 'Requisição editada', statuses: [200, 201, 202, 204], captures: [], checks: [] };
  const prepared = prepareRequest(draft, credentialValues(), window.location.origin);
  if (prepared.options.headers.Authorization) observedTokens.add(prepared.options.headers.Authorization.slice(7));
  $('request-title').textContent = plan.name;
  const stepText = batchIndex === null ? `Requisição individual · ${plan.name}` : `Etapa ${batchIndex + 1} de ${collection.requests.length} · ${plan.name}`;
  $('run-current').textContent = stepText; $('run-time').textContent = 'Aguardando resposta · 0s · limite de 20s por requisição';
  status(batchIndex === null ? `Executando ${plan.name}…` : `Executando etapa ${batchIndex + 1} de ${collection.requests.length}: ${plan.name}…`);
  const timer = setInterval(() => {
    const seconds = Math.floor((performance.now() - started) / 1000);
    updateElapsed(seconds);
  }, 1000);
  let response;
  try { response = await boundedFetch(prepared.url, prepared.options); }
  catch (error) {
    const message = stopped
      ? 'Execução interrompida; a API pode ter recebido a operação.'
      : error.name === 'AbortError'
        ? 'Tempo limite de 20s sem resposta confiável; a API pode ter aplicado a operação.'
        : error.message;
    const failure = new Error(message || 'Falha de rede sem resposta confiável.');
    failure.name = error.name || 'Error'; failure.requestDispatched = true;
    throw failure;
  }
  finally { clearInterval(timer); if (current === generation) updateElapsed(); }
  if (current !== generation || stopped) { const error = new Error('Execução interrompida; a API pode ter recebido a operação.'); error.requestDispatched = true; throw error; }
  let json; try { json = JSON.parse(response.text); } catch { json = null; }
  const evaluation = evaluateResponse(plan, response.status, json, variables);
  for (const key of evaluation.captured) if (/Token$/.test(key)) observedTokens.add(variables[key]);
  syncVariables();
  const passed = evaluation.results.every((result) => result.passed);
  const responseText = `HTTP ${response.status} · ${Math.round(performance.now() - started)} ms\n${json ? JSON.stringify(redact(json, credentialValues()), null, 2) : redact(response.text, credentialValues())}`;
  rememberAttempt(request.id, { at: timeLabel(), httpStatus: response.status, response: responseText, checks: evaluation.results, passed, certainty: passed ? 'verified' : 'response' });
  const unresolvedWrite = request.method !== 'GET' && (
    batchIndex === null && request.id === failureIndex && failureWasDispatched
    || batchIndex !== null && request.id === retryingUncertainIndex
  );
  const state = passed ? (unresolvedWrite ? 'uncertain' : 'passed') : (request.method === 'GET' && batchIndex === null ? 'failed' : 'uncertain');
  if (isCollectionRequest) setStepState(request.id, state);
  if (batchIndex === null && !passed && draft.method.toUpperCase() !== 'GET') {
    manualWriteUncertain = { method: draft.method.toUpperCase(), path: draft.path.trim() };
    $('recovery-note').textContent = `A escrita manual (${manualWriteUncertain.method}) recebeu uma resposta que não confirmou o resultado esperado. Confira o efeito na API antes de repetir ou continuar.`;
    $('recovery-note').hidden = false;
  }
  history(`${plan.name} · HTTP ${response.status} · ${passed ? 'PASSOU' : 'FALHOU'}${evaluation.captured.length ? ` · capturado: ${evaluation.captured.join(', ')}` : ''}`, passed);
  return passed;
}
function clearBatchData() {
  // Só a confirmação explícita de uma nova execução limpa valores capturados
  // anteriormente; retomadas e tentativas preservam o contexto já confirmado.
  for (const key of Object.keys(variables)) if (/Id$/.test(key) || /Token$/.test(key) && key !== 'adminToken') variables[key] = '';
  syncVariables(); stepResults.clear();
  for (const [index] of collection.requests.entries()) setStepState(index, 'pending');
  $('checks').replaceChildren(); $('response').textContent = 'Aguardando a primeira resposta desta execução.';
}
async function runBatch(startIndex, mode) {
  if (busy || !collection) return;
  const request = collection.requests[startIndex];
  const priorFailureWasDispatched = failureWasDispatched;
  const priorFailureIndex = failureIndex;
  const pendingManualWrite = manualWriteUncertain;
  if (mode === 'new') {
    const pending = priorFailureWasDispatched && priorFailureIndex !== null && collection.requests[priorFailureIndex].method !== 'GET'
      ? ` A etapa ${priorFailureIndex + 1} foi enviada sem confirmação confiável e pode já ter sido aplicada; repetir o fluxo pode duplicar dados. Verifique o estado na API antes de continuar.` : '';
    const manual = pendingManualWrite ? ` A escrita manual ${pendingManualWrite.method} ainda não tem resultado confirmado; verifique o efeito na API antes de iniciar outro fluxo.` : '';
    if (!window.confirm(`Executar as ${collection.requests.length} etapas? O fluxo grava registros reais nesta API. Esta nova execução também apaga IDs e tokens capturados anteriormente nesta aba para evitar misturar fluxos.${pending}${manual}`)) return;
  } else if (mode === 'resume') {
    const manual = pendingManualWrite ? ` A escrita manual ${pendingManualWrite.method} também continua sem confirmação. Verifique o efeito dela antes de continuar.` : '';
    if (!window.confirm(`Continuar da etapa ${startIndex + 1}, sem repetir a etapa ${failureIndex + 1}? Verifique na API se a etapa anterior foi aplicada e preencha manualmente os IDs ou tokens que não foram capturados. As respostas já registradas serão mantidas.${manual}`)) return;
  } else {
    const warning = !priorFailureWasDispatched
      ? `A etapa anterior não foi enviada à API. Executar novamente a etapa ${startIndex + 1} e continuar?`
      : request.method === 'GET'
      ? `Repetir a consulta GET da etapa ${startIndex + 1} e continuar o fluxo? GET não altera registros.`
      : `Reexecutar da etapa ${startIndex + 1} e continuar? A etapa anterior pode ter sido gravada mesmo sem resposta confiável; repeti-la pode criar dados duplicados. Confirme o estado na API antes de prosseguir.`;
    const manual = pendingManualWrite ? ` A escrita manual ${pendingManualWrite.method} também não tem confirmação; verifique a API antes de prosseguir.` : '';
    if (!window.confirm(`${warning}${manual}`)) return;
  }
  manualWriteUncertain = null;
  retryingUncertainIndex = mode === 'retry' && priorFailureWasDispatched && request.method !== 'GET' ? startIndex : null;
  const current = generation; stopped = false; activeIndex = null;
  if (mode === 'new') clearBatchData();
  failureIndex = null; failureWasDispatched = false; $('recovery-note').hidden = true;
  batchStartedAt = performance.now(); batchElapsedMs = null;
  busyState(true); updateProgress(verifiedStepCount(), `Preparando etapa ${startIndex + 1} de ${collection.requests.length}.`);
  try {
    for (let index = startIndex; index < collection.requests.length; index++) {
      if (stopped) break;
      const step = collection.requests[index]; activeIndex = index; select(index); setStepState(index, 'running');
      try {
        const passed = await execute(step, step, { batchIndex: index });
        if (!passed) {
          setStepState(index, 'uncertain');
          updateProgress(verifiedStepCount(), `Etapa ${index + 1} de ${collection.requests.length} · verificações falharam.`);
          status(`Fluxo interrompido na etapa ${index + 1}: a resposta não passou nas verificações. A API pode ter aplicado a operação.`);
          offerRecovery(index, 'O servidor respondeu, mas o resultado esperado não foi confirmado. Verifique o registro na API antes de continuar ou repetir. Repetir uma etapa que grava dados pode criar duplicatas.');
          return;
        }
        updateProgress(verifiedStepCount(), `Etapa ${index + 1} de ${collection.requests.length} verificada · ${step.name}`);
      } catch (error) {
        if (current !== generation) return;
        const dispatched = error.requestDispatched === true;
        const details = redact(error.message || 'Falha inesperada.', credentialValues());
        const explanation = dispatched
          ? `Sem resposta confiável na etapa ${index + 1}: ${details} Confira o efeito na API antes de continuar ou repetir.`
          : `Etapa ${index + 1} não enviada. Corrija as variáveis ou o pedido antes de continuar. ${details}`;
        rememberAttempt(index, { response: explanation, checks: [], passed: false, certainty: dispatched ? 'uncertain' : 'not-sent' });
        setStepState(index, dispatched ? 'uncertain' : 'failed');
        updateProgress(verifiedStepCount(), `Etapa ${index + 1} de ${collection.requests.length} · ${dispatched ? 'resultado incerto' : 'não enviada'}.`);
        history(`${step.name} · ${dispatched ? 'SEM RESPOSTA CONFIÁVEL' : 'NÃO ENVIADA'} · ${details}`, false);
        status(explanation);
        offerRecovery(index, dispatched
          ? 'O pedido chegou à camada de rede, então a API pode ter gravado dados mesmo que a resposta não tenha chegado. Confira a API. Reexecutar exige confirmação explícita.'
          : 'Nenhuma chamada foi enviada à API. Corrija as variáveis e tente novamente; os IDs, tokens e respostas confirmados continuam na sessão.', dispatched);
        return;
      }
    }
    if (current !== generation) return;
    if (stopped) {
      const index = activeIndex ?? startIndex;
      if (failureIndex === null) {
        const message = `Fluxo interrompido na etapa ${index + 1}. O estado remoto dessa operação pode ser incerto.`;
        rememberAttempt(index, { response: message, checks: [], passed: false, certainty: 'uncertain' });
        setStepState(index, 'uncertain'); offerRecovery(index, 'O fluxo foi interrompido. Confira o efeito da etapa atual antes de continuar ou repetir.');
        status(message);
      }
    } else {
      const unverified = [...$('requests').querySelectorAll('button')].filter((button) => button.dataset.state === 'uncertain' || button.dataset.state === 'failed').length;
      const verified = [...$('requests').querySelectorAll('button')].filter((button) => button.dataset.state === 'passed').length;
      updateProgress(verifiedStepCount(), `Execução encerrada · ${verified} verificadas · ${unverified} sem confirmação.`);
      status(unverified ? `Fluxo retomado. ${verified} etapas verificadas; ${unverified} etapa(s) continuam sem confirmação.` : `${collection.requests.length} etapas concluídas com verificações aprovadas.`);
    }
  } finally {
    activeIndex = null;
    if (current === generation) {
      busyState(false);
      if (batchStartedAt !== null) { batchElapsedMs = performance.now() - batchStartedAt; batchStartedAt = null; updateElapsed(); }
      retryingUncertainIndex = null;
    }
  }
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
  const draft = { method: $('method').value, path: $('path').value, body: $('mode').value === 'json' ? $('body').value : '', tokenVariable: $('token').value, mode: $('mode').value, files: [...$('files').files] };
  const isWrite = draft.method.toUpperCase() !== 'GET';
  const priorAttempts = stepResults.get(selected) || [];
  const retryingFailure = failureIndex === selected && failureWasDispatched;
  const skippingFailure = failureIndex !== null && failureIndex !== selected;
  const failed = failureIndex === null ? null : collection.requests[failureIndex];
  const questions = [];
  if (manualWriteUncertain) {
    const sameManualWrite = draft.method.toUpperCase() === manualWriteUncertain.method && draft.path.trim() === manualWriteUncertain.path;
    questions.push(sameManualWrite
      ? `Uma escrita manual anterior (${manualWriteUncertain.method}) não teve confirmação confiável e pode ter sido aplicada. Confira o estado na API antes de repetir; a repetição pode criar duplicatas. Reexecutar?`
      : `Uma escrita manual anterior (${manualWriteUncertain.method}) continua sem confirmação. Verifique o efeito na API antes de enviar outro pedido ou continuar. Prosseguir?`);
  }
  if (failed && failed.method !== 'GET') {
    if (retryingFailure && isWrite && draft.method === failed.method && draft.path.trim() === failed.path) {
      questions.push(`A etapa ${failureIndex + 1} foi enviada, mas não teve confirmação confiável. A API pode ter aplicado a escrita; repeti-la pode criar dados duplicados. Confira o estado antes de confirmar a repetição. Reexecutar?`);
    } else if (retryingFailure) {
      questions.push(isWrite
        ? `A etapa ${failureIndex + 1} ainda não tem resultado confirmado. Esta escrita foi alterada no editor e pode misturar dados do fluxo. Confira a API antes de continuar. Enviar mesmo assim?`
        : `A etapa ${failureIndex + 1} ainda não tem resultado confirmado. Este pedido GET editado vai ignorar a escrita pendente. Confira a API antes de continuar.`);
    } else if (skippingFailure) {
      questions.push(`A etapa ${failureIndex + 1} continua sem confirmação. Enviar outra requisição agora pode ignorar dados necessários ou misturar execuções. Confira a API antes de continuar.`);
    }
  } else if (isWrite && priorAttempts.length) {
    questions.push(`Esta etapa já teve ${priorAttempts.length} tentativa(s) nesta sessão. Repetir uma escrita pode criar dados duplicados. Confira o estado na API antes de confirmar. Reexecutar?`);
  }
  if (questions.length && !window.confirm(questions.join('\n\n'))) return;
  if (manualWriteUncertain) {
    manualWriteUncertain = null;
    if (failureIndex === null) $('recovery-note').hidden = true;
  }
  const current = generation; stopped = false; batchElapsedMs = null; busyState(true);
  try {
    const passed = await execute(collection.requests[selected], draft);
    const request = collection.requests[selected];
    const verifiesCollectionStep = matchesCollectionRequest(request, draft);
    status(passed
      ? verifiesCollectionStep ? 'Requisição concluída e verificações aprovadas.' : 'Requisição manual concluída; a etapa original da coleção não foi verificada.'
      : verifiesCollectionStep ? 'Requisição concluída; confira as verificações e o efeito na API.' : 'Resposta da requisição manual não passou; confira o efeito na API.');
    if (!passed && isWrite) {
      manualWriteUncertain = { method: draft.method.toUpperCase(), path: draft.path.trim() };
      $('recovery-note').textContent = `A escrita manual (${manualWriteUncertain.method}) recebeu uma resposta que não confirmou o resultado esperado. Confira o efeito na API antes de repetir ou continuar.`;
      $('recovery-note').hidden = false;
    }
    if (failureIndex === selected && passed) $('recovery-note').textContent = failureWasDispatched
      ? 'A nova tentativa passou nas verificações, mas a tentativa anterior ainda pode ter sido aplicada. Revise os registros para descartar duplicatas antes de continuar.'
      : 'A etapa passou nas verificações individuais. Continuar inicia na etapa seguinte e preserva os resultados existentes.';
  } catch (error) {
    if (current === generation) {
      const dispatched = error.requestDispatched === true;
      const message = dispatched ? `${redact(error.message || 'Sem resposta confiável.', credentialValues())} Confira o estado da API antes de repetir.` : 'A requisição não foi enviada. Revise o caminho, as variáveis e o corpo.';
      rememberAttempt(selected, { at: timeLabel(), response: `${message}\n${redact(error.message || 'Falha inesperada.', credentialValues())}`, checks: [], passed: false, certainty: dispatched ? 'uncertain' : 'not-sent' });
      const request = collection.requests[selected];
      const isCollectionRequest = matchesCollectionRequest(request, draft);
      if (isCollectionRequest) setStepState(selected, dispatched ? 'uncertain' : 'failed');
      if (dispatched && draft.method.toUpperCase() !== 'GET') {
        manualWriteUncertain = { method: draft.method.toUpperCase(), path: draft.path.trim() };
        $('recovery-note').textContent = `A escrita manual (${manualWriteUncertain.method}) não recebeu resposta confiável e pode ter sido aplicada. Confira o efeito na API antes de repetir ou continuar.`;
        $('recovery-note').hidden = false;
      }
      status(dispatched ? message : `${message} ${redact(error.message || '', credentialValues())}`);
    }
  } finally {
    if (current === generation) {
      busyState(false);
      const completed = verifiedStepCount(), request = collection.requests[selected];
      const exactStep = matchesCollectionRequest(request, draft);
      const state = $('requests').querySelectorAll('button')[selected]?.dataset.state;
      const detail = exactStep
        ? `Etapa ${selected + 1} ${state === 'passed' ? 'verificada manualmente' : state === 'uncertain' ? 'com resultado incerto' : 'sem confirmação'} · ${completed} verificadas.`
        : `Requisição manual encerrada; etapa ${selected + 1} da coleção não verificada · ${completed} verificadas.`;
      updateProgress(completed, detail);
    }
  }
});
$('run').addEventListener('click', () => runBatch(0, 'new'));
$('resume').addEventListener('click', () => { if (failureIndex !== null) runBatch(failureIndex + 1, 'resume'); });
$('retry').addEventListener('click', () => { if (failureIndex !== null) runBatch(failureIndex, 'retry'); });
$('stop').addEventListener('click', () => { stopped = true; controller?.abort(); });
$('mode').addEventListener('change', setMode);
$('filter').addEventListener('input', applyFilter);
$('attempt-select').addEventListener('change', () => {
  const attempts = stepResults.get(selected) || [];
  renderAttemptOutput(attempts[Number($('attempt-select').value)]);
});
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

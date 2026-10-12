import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildWebCollection } from '../postman/collection.js';
import * as core from '../postman/core.js';

const collection = buildWebCollection();
const html = readFileSync(new URL('../postman/index.html', import.meta.url), 'utf8');
const runnerSource = readFileSync(new URL('../postman/runner.js', import.meta.url), 'utf8');
const runnerWithoutImport = runnerSource.replace(
  /^import \{ ([^\n]+) \} from '\.\/core\.js';/m,
  (_match, bindings) => `const { ${bindings} } = window.__postmanCore;`,
);
assert.notEqual(runnerWithoutImport, runnerSource, 'the harness must inject the real Postman core module');

class Element {
  constructor(tagName, id = '') {
    this.tagName = tagName;
    this.id = id;
    this.children = [];
    this.attributes = new Map();
    this.dataset = Object.create(null);
    this.listeners = new Map();
    this.disabled = false;
    this.hidden = false;
    this.value = '';
    this.files = [];
    this._textContent = '';
    this.parentNode = null;
  }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this._textContent = String(value); }
  get innerText() { return this.textContent; }
  get lastChild() { return this.children.at(-1) || null; }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  async dispatch(type, extra = {}) {
    const event = { target: this, preventDefault() {}, ...extra };
    return Promise.all((this.listeners.get(type) || []).map((listener) => listener(event)));
  }
  append(...nodes) {
    for (const node of nodes) {
      if (typeof node === 'string') { this._textContent += node; continue; }
      node.parentNode = this;
      this.children.push(node);
    }
  }
  prepend(...nodes) {
    for (const node of [...nodes].reverse()) {
      node.parentNode = this;
      this.children.unshift(node);
    }
  }
  replaceChildren(...nodes) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this._textContent = '';
    this.append(...nodes);
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll(selector) {
    const tag = selector.toLowerCase();
    const descendants = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.tagName.toLowerCase() === tag) descendants.push(child);
        visit(child);
      }
    };
    visit(this);
    return descendants;
  }
}

class OptionElement extends Element {
  constructor(text, value) { super('option'); this.textContent = text; this.value = value; }
}

function makeRunner(fetchImpl, confirmAnswers = []) {
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, new Element('div', id)]));
  const element = (id) => {
    const result = elements.get(id);
    assert.ok(result, `missing test DOM element #${id}`);
    return result;
  };
  const confirmations = [];
  const window = {
    location: { origin: 'https://runner.test' },
    __postmanCore: core,
    addEventListener() {},
    confirm(message) { confirmations.push(message); return confirmAnswers.shift() ?? false; },
  };
  const document = {
    getElementById: element,
    createElement(tagName) { return new Element(tagName); },
  };
  const context = {
    document,
    window,
    Option: OptionElement,
    fetch: fetchImpl,
    performance,
    AbortController,
    AbortSignal,
    Response,
    TextEncoder,
    TextDecoder,
    FormData,
    URL,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };
  vm.runInNewContext(runnerWithoutImport, context, { filename: 'src/postman/runner.js' });
  const requestButtons = () => element('requests').querySelectorAll('button');
  async function connect() {
    element('access-token').value = 'synthetic-admin-token';
    await element('connect-form').dispatch('submit');
    assert.equal(element('workspace').hidden, false, 'collection should be open');
  }
  async function setVariable(key, value) {
    const input = element('variables').querySelectorAll('input').find((candidate) => candidate.id === `variable-${key}`);
    assert.ok(input, `missing collection variable ${key}`);
    input.value = value;
    await input.dispatch('input');
  }
  return { element, requestButtons, confirmations, connect, setVariable };
}

const jsonResponse = (value, status = 200) => new Response(status === 204 ? null : JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

async function waitFor(predicate, message) {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

test('ambiguous manual POST blocks a fresh POST until explicit confirmation', async () => {
  const requests = [];
  const runner = makeRunner(async (url, options) => {
    if (url === '/docs/postman/collection') return jsonResponse(collection);
    requests.push({ url, method: options.method });
    if (url.endsWith('/write-one')) throw new TypeError('Failed to fetch');
    return jsonResponse({});
  }, [false, true]);
  await runner.connect();

  runner.element('method').value = 'POST';
  runner.element('path').value = '/usuario/write-one';
  await runner.element('send').dispatch('click');
  assert.match(runner.element('recovery-note').textContent, /escrita manual.*não recebeu resposta confiável/i);
  assert.equal(requests.length, 1);

  await runner.requestButtons()[1].dispatch('click');
  runner.element('method').value = 'POST';
  runner.element('path').value = '/usuario/write-two';
  runner.element('body').value = '';
  await runner.element('send').dispatch('click');
  assert.equal(requests.length, 1, 'dismissing the unresolved-write prompt must not dispatch a second write');
  assert.match(runner.confirmations[0], /escrita manual anterior.*sem confirmação/i);

  await runner.element('send').dispatch('click');
  assert.equal(requests.length, 2, `an explicit confirmation permits the user-selected write (${runner.element('status').textContent}; ${runner.element('path').value})`);
  assert.match(runner.confirmations[1], /escrita manual anterior.*sem confirmação/i);
});

test('an edited GET success does not verify the selected POST collection step', async () => {
  let businessCalls = 0;
  const runner = makeRunner(async (url, options) => {
    if (url === '/docs/postman/collection') return jsonResponse(collection);
    businessCalls++;
    assert.equal(options.method, 'GET');
    assert.equal(url, 'https://runner.test/docs.json');
    return jsonResponse({ openapi: '3.1.0' });
  });
  await runner.connect();

  const originalPost = collection.requests.findIndex((request) => request.method === 'POST');
  await runner.requestButtons()[originalPost].dispatch('click');
  runner.element('method').value = 'GET';
  runner.element('path').value = '/docs.json';
  await runner.element('send').dispatch('click');

  assert.equal(businessCalls, 1);
  assert.equal(runner.requestButtons()[originalPost].dataset.state, 'pending');
  assert.equal(runner.element('run-count').textContent, `0 / ${collection.requests.length}`);
  assert.match(runner.element('status').textContent, /etapa original da coleção não foi verificada/i);
});

test('an edited POST body does not verify the selected collection write', async () => {
  const runner = makeRunner(async (url, options) => {
    if (url === '/docs/postman/collection') return jsonResponse(collection);
    assert.equal(options.method, 'POST');
    assert.equal(options.body, JSON.stringify({ manuallyEdited: true }));
    return jsonResponse({ data: { accepted: true } }, 201);
  });
  await runner.connect();

  const originalPost = collection.requests.findIndex((request) => request.method === 'POST');
  await runner.requestButtons()[originalPost].dispatch('click');
  runner.element('body').value = JSON.stringify({ manuallyEdited: true });
  await runner.element('send').dispatch('click');

  assert.equal(runner.requestButtons()[originalPost].dataset.state, 'pending');
  assert.equal(runner.element('run-count').textContent, `0 / ${collection.requests.length}`);
  assert.match(runner.element('status').textContent, /etapa original da coleção não foi verificada/i);
});

test('a manually verified original collection step increments actual progress', async () => {
  const runner = makeRunner(async (url, options) => {
    if (url === '/docs/postman/collection') return jsonResponse(collection);
    assert.equal(url, 'https://runner.test/docs.json');
    assert.equal(options.method, 'GET');
    return jsonResponse({ openapi: '3.1.0' });
  });
  await runner.connect();

  await runner.requestButtons()[0].dispatch('click');
  await runner.element('send').dispatch('click');

  assert.equal(runner.requestButtons()[0].dataset.state, 'passed');
  assert.equal(runner.element('run-count').textContent, `1 / ${collection.requests.length}`);
  assert.equal(runner.element('run-progress').value, 1);
});

test('resume progress counts verified steps, while preserving captures and history around an uncertain POST', async () => {
  const calls = Array(collection.requests.length).fill(0);
  let cursor = 0;
  let markResumeStarted;
  const resumeStarted = new Promise((resolve) => { markResumeStarted = resolve; });
  const uuid = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
  const runner = makeRunner(async (url, options) => {
    if (url === '/docs/postman/collection') return jsonResponse(collection);
    const index = cursor++;
    const request = collection.requests[index];
    assert.ok(request, `unexpected request after collection step ${index}`);
    assert.equal(options.method, request.method, `method at collection step ${index + 1}`);
    calls[index]++;
    if (index === 0) return jsonResponse({ openapi: '3.1.0' });
    if (index === 1) return jsonResponse({ data: { token: 'synthetic-joao-token', usuario: { _id: uuid(2) } } });
    if (index === 2) return jsonResponse({ data: [{ _id: uuid(3), ativo: true }] });
    if (index === 3 && calls[index] === 1) return jsonResponse({ message: 'synthetic upstream timeout' }, 503);
    if (index === 4 && calls[index] === 1) {
      markResumeStarted();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return jsonResponse({ message: 'synthetic second upstream failure' }, 503);
    }
    assert.fail(`unexpected request beyond the two injected failures at step ${index + 1}`);
  }, [true, true]);
  await runner.connect();
  for (const key of ['joaoEmail', 'anaEmail', 'adminEmail']) await runner.setVariable(key, `${key}@runner.invalid`);
  for (const key of ['senhaPadrao', 'adminSenha']) await runner.setVariable(key, 'SyntheticPass123!');

  await runner.element('run').dispatch('click');
  assert.equal(runner.element('run-count').textContent, `3 / ${collection.requests.length}`);
  assert.equal(runner.requestButtons()[3].dataset.state, 'uncertain');
  const token = runner.element('variables').querySelectorAll('input').find((input) => input.id === 'variable-joaoToken').value;
  const donorId = runner.element('variables').querySelectorAll('input').find((input) => input.id === 'variable-joaoId').value;
  const categoryId = runner.element('variables').querySelectorAll('input').find((input) => input.id === 'variable-categoriaId').value;
  const history = runner.element('history').querySelectorAll('li').map((entry) => entry.textContent);
  assert.ok(token && donorId && categoryId);
  assert.equal(history.length, 4);
  assert.match(history.join('\n'), /HTTP 503/);

  await runner.setVariable('itemId', uuid(900));
  await runner.element('resume').dispatch('click');
  await resumeStarted;
  assert.equal(runner.element('run-count').textContent, `3 / ${collection.requests.length}`, 'the skipped uncertain step must not inflate the verified count');
  assert.equal(runner.element('run-progress').value, 3);
  assert.equal(runner.requestButtons()[3].dataset.state, 'uncertain');
  assert.equal(runner.requestButtons()[4].dataset.state, 'running');
  assert.equal(runner.element('history').querySelectorAll('li').length, 4, 'history stays visible while the resumed request is pending');
  assert.equal(runner.element('variables').querySelectorAll('input').find((input) => input.id === 'variable-joaoToken').value, token);
  assert.equal(runner.element('variables').querySelectorAll('input').find((input) => input.id === 'variable-joaoId').value, donorId);
  assert.equal(runner.element('variables').querySelectorAll('input').find((input) => input.id === 'variable-categoriaId').value, categoryId);

  await waitFor(
    () => runner.element('status').textContent.includes('Fluxo interrompido na etapa 5'),
    `resumed collection did not stop at the injected failure (${runner.element('status').textContent}; calls=${calls.join(',')})`,
  );
  assert.deepEqual(calls.slice(0, 5), [1, 1, 1, 1, 1], 'the uncertain POST is not retried during resume');
  assert.equal(runner.element('variables').querySelectorAll('input').find((input) => input.id === 'variable-itemId').value, uuid(900));
  assert.equal(runner.requestButtons()[3].dataset.state, 'uncertain');
  assert.equal(runner.element('history').querySelectorAll('li').length, 5);
  assert.match(runner.element('history').textContent, /HTTP 503/);
  assert.equal(runner.element('run-count').textContent, `3 / ${collection.requests.length}`);
});

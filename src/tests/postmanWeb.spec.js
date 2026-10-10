import express from 'express';
import helmet from 'helmet';
import request from 'supertest';
import postmanDocs from '../routes/postmanDocsRoutes.js';
import errorHandler from '../utils/helpers/errorHandler.js';
import { buildWebCollection } from '../postman/collection.js';
import { evaluateResponse, prepareRequest, redact, readResponse } from '../postman/core.js';

const origin = 'http://127.0.0.1:7342';
const uuid = '12345678-1234-1234-1234-123456789abc';
const draft = { method: 'GET', path: '/itemdoacao', body: '', tokenVariable: '' };
const token = (perfil) => Buffer.from(JSON.stringify({ id: uuid, perfil })).toString('base64url');
const app = express(); app.use(helmet()); app.use(postmanDocs); app.use(errorHandler);

describe('Postman web: acesso e assets locais', () => {
  test('shell público sem CDN ou scripts inline e CSP preservada', async () => {
    const response = await request(app).get('/docs/postman');
    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.text).toContain('src="/docs/postman/runner.js"');
    expect(response.text).not.toMatch(/<script[^>]*>[^<]+<\/script>|on(?:click|load)=|https?:\/\//i);
  });
  test.each(['runner.js', 'core.js', 'style.css'])('serve asset %s', async (asset) => {
    expect((await request(app).get(`/docs/postman/${asset}`)).status).toBe(200);
  });
  test('coleção exige autenticação administrativa e não aceita token por URL', async () => {
    expect((await request(app).get('/docs/postman/collection')).status).toBe(401);
    expect((await request(app).get('/docs/postman/collection?token=invalid')).status).toBe(400);
    expect((await request(app).get('/docs/postman/collection').set('Authorization', `Bearer ${token('USUARIO')}`)).status).toBe(403);
    const response = await request(app).get('/docs/postman/collection').set('Authorization', `Bearer ${token('ADMINISTRADOR')}`);
    expect(response.status).toBe(200); expect(response.body.requests).toHaveLength(27);
  });
  test('coleção carregada remove valores de credenciais e scripts', () => {
    const collection = buildWebCollection();
    expect(collection.variables.every(({ value }) => value === '')).toBe(true);
    expect(JSON.stringify(collection)).not.toMatch(/Senha@123|Admin@123|joao@email|admin@doai|pm\.response/);
    expect(collection.requests.every((item) => item.path.startsWith('/') && item.scriptsOmitted > 0)).toBe(true);
  });
});
describe('Postman web: isolamento de destino e credenciais', () => {
  test.each(['https://example.com/usuario', '//example.com/usuario', '/\\example.com/usuario', '/usuario/../api/auth/sign-in', '/usuario/%252e%252e/api/auth/sign-in', '/api/auth/sign-in/email', '/uploads/a.png', '/usuario#frag', '/usuario?token=a'])('recusa caminho perigoso %s', (path) => {
    expect(() => prepareRequest({ ...draft, path }, {}, origin)).toThrow();
  });
  test('recusa segredo interpolado ou literal na URL', () => {
    expect(() => prepareRequest({ ...draft, path: '/usuario/{{anaToken}}' }, { anaToken: 'sensitive-secret' }, origin)).toThrow();
    expect(() => prepareRequest({ ...draft, path: '/usuario/sensitive-secret' }, { anaToken: 'sensitive-secret' }, origin)).toThrow();
    expect(() => prepareRequest({ ...draft, path: '/usuario?busca=sensitive-secret' }, { anaToken: 'sensitive-secret' }, origin)).toThrow();
  });
  test('JSON substitui valores com aspas sem alterar sua estrutura e envia bearer só no cabeçalho', () => {
    const result = prepareRequest({ method: 'POST', path: '/auth/login', body: '{"senha":"{{senhaPadrao}}"}', tokenVariable: 'adminToken' }, { senhaPadrao: 'a"b\\c', adminToken: 'session-secret' }, origin);
    expect(JSON.parse(result.options.body)).toEqual({ senha: 'a"b\\c' });
    expect(result.options.headers.Authorization).toBe('Bearer session-secret');
    expect(result.options.credentials).toBe('omit'); expect(result.options.redirect).toBe('error');
  });
  test('bloqueia corpo excessivo após expansão e variável obrigatória ausente', () => {
    expect(() => prepareRequest({ ...draft, method: 'POST', body: '{"v":"{{nome}}"}' }, { nome: 'á'.repeat(40000) }, origin)).toThrow('64 KiB');
    expect(() => prepareRequest({ ...draft, path: '/usuario/{{id}}' }, {}, origin)).toThrow('Preencha');
  });
  test('multipart usa campo fotos e boundary do navegador', () => {
    const blob = new Blob(['image'], { type: 'image/png' });
    const result = prepareRequest({ method: 'POST', path: `/itemdoacao/${uuid}/fotos`, mode: 'multipart', files: [blob] }, {}, origin);
    expect(result.options.body.get('fotos').type).toBe('image/png');
    expect(result.options.headers['Content-Type']).toBeUndefined();
    expect(() => prepareRequest({ method: 'POST', path: '/auth/login', mode: 'multipart', files: [blob] }, {}, origin)).toThrow();
  });
  test('redação recursiva oculta tokens, senhas e valores refletidos', () => {
    expect(redact({ senha: 'secret', data: { token: 'private', message: 'use private' } }, { adminToken: 'private' })).toEqual({ senha: '[oculto]', data: { token: '[oculto]', message: 'use [oculto]' } });
  });
  test('limita resposta de rede e preserva UTF-8', async () => {
    expect(await readResponse(new Response('ação'))).toBe('ação');
    await expect(readResponse(new Response('abcdef'), 5)).rejects.toThrow('1 MiB');
  });
});
describe('Postman web: captura e verificação de dados do próprio fluxo', () => {
  const collection = buildWebCollection();
  test('captura login e rejeita ID inválido', () => {
    const variables = {};
    const result = evaluateResponse(collection.requests[1], 200, { data: { token: 'active-token', usuario: { _id: uuid } } }, variables);
    expect(result.results.every(({ passed }) => passed)).toBe(true);
    expect(variables).toEqual({ joaoToken: 'active-token', joaoId: uuid });
    expect(evaluateResponse(collection.requests[1], 401, {}, {}).captured).toEqual([]);
    expect(evaluateResponse(collection.requests[1], 200, { data: { token: 'a', usuario: { _id: 'invalid' } } }, {}).results.some(({ passed }) => !passed)).toBe(true);
  });
  test('não aceita interesse ou notificação de outro registro', () => {
    const variables = { interesseId: uuid, itemId: uuid };
    expect(evaluateResponse(collection.requests[8], 200, { data: [{ _id: uuid, item_id: 'other' }] }, variables).results.at(-1).passed).toBe(false);
    expect(evaluateResponse(collection.requests[9], 200, { data: [{ tipo: 'INTERESSE_RECEBIDO', referencia_id: 'other' }] }, variables).results.at(-1).passed).toBe(false);
    expect(evaluateResponse(collection.requests[9], 200, { data: [{ tipo: 'INTERESSE_RECEBIDO', referencia_id: uuid }] }, variables).results.at(-1).passed).toBe(true);
  });
});

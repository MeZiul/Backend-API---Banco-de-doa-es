import { readFileSync } from 'node:fs';

const uuidCapture = (key, path = 'data._id') => ({ key, path, kind: 'uuid' });
const objectId = (variable) => ({ label: `ID corresponde a ${variable}`, kind: 'equalsVariable', path: 'data._id', variable });
const state = (value) => ({ label: `Estado ${value}`, kind: 'equals', path: 'data.status', value });
const login = (who) => ({
  captures: [{ key: `${who}Token`, path: 'data.token', alternative: 'token', kind: 'token' }, uuidCapture(`${who}Id`, 'data.usuario._id')],
  checks: [{ label: 'Token e usuário recebidos', kind: 'login' }],
});
const notification = (type, reference, title) => ({ checks: [{ label: 'Notificação do registro deste fluxo', kind: 'notification', type, reference, title }] });
// Regras declarativas revisadas para esta coleção. Nenhum pm.*, eval ou script
// importado é executado. Não selecionamos o primeiro registro de outro usuário.
const plans = {
  0: { checks: [{ label: 'Documento OpenAPI 3', kind: 'openapi' }] },
  1: login('joao'),
  2: { captures: [{ key: 'categoriaId', kind: 'category' }], checks: [{ label: 'Categoria ativa encontrada', kind: 'category' }] },
  3: { captures: [uuidCapture('itemId')] },
  4: login('ana'),
  5: { checks: [{ label: 'Item criado aparece disponível na busca', kind: 'itemSearch' }] },
  6: { checks: [objectId('itemId'), state('DISPONIVEL')] },
  7: { captures: [uuidCapture('interesseId')] },
  8: { checks: [{ label: 'Interesse deste item encontrado', kind: 'interest' }] },
  9: notification('INTERESSE_RECEBIDO', 'interesseId'),
  10: { checks: [{ label: 'Interesse deste item encontrado', kind: 'interest' }] },
  11: { checks: [state('ACEITO')] },
  12: notification('INTERESSE_ACEITO', 'interesseId'),
  13: { checks: [state('RESERVADO')] },
  14: { checks: [state('AGUARDANDO_CONFIRMACAO')] },
  15: { checks: [state('DOADO')] },
  16: { checks: [state('DOADO')] },
  17: { captures: [uuidCapture('avaliacaoAnaId')] },
  18: { captures: [uuidCapture('avaliacaoJoaoId')] },
  19: { captures: [uuidCapture('denunciaId')] },
  20: login('admin'),
  21: notification('SISTEMA', 'denunciaId', 'Nova denúncia recebida'),
  22: { checks: [{ label: 'Denúncia deste fluxo encontrada', kind: 'denunciation' }] },
  23: { checks: [state('IMPROCEDENTE')] },
  24: notification('DENUNCIA_RESULTADO', 'denunciaId'),
  25: notification('DENUNCIA_RESULTADO', 'denunciaId'),
  26: { checks: [objectId('anaId')] },
};
export function buildWebCollection() {
  const source = JSON.parse(readFileSync(new URL('../../documentacao/postman/API-DOAI-FLUXO-PRINCIPAL.postman_collection.json', import.meta.url), 'utf8'));
  const flatten = (items) => items.flatMap((item) => item.item ? flatten(item.item) : [item]);
  const items = flatten(source.item);
  if (items.length !== 27 || items.some((item, n) => !item.name.startsWith(`${String(n).padStart(2, '0')} - `))) {
    throw new Error('Coleção alterada: revisar regras declarativas do runner.');
  }
  return {
    name: 'DoaI — fluxo principal',
    source: 'API-DOAI-FLUXO-PRINCIPAL.postman_collection.json',
    variables: source.variable.filter(({ key }) => key !== 'baseUrl').map(({ key }) => ({ key, value: '' })),
    requests: items.map((item, n) => {
      const request = item.request;
      const authorization = request.header?.find(({ key }) => key.toLowerCase() === 'authorization')?.value;
      const token = request.auth?.bearer?.find(({ key }) => key === 'token')?.value || authorization?.replace(/^Bearer\s+/i, '');
      return {
        id: n, name: item.name, method: request.method,
        path: request.url.raw.replace(/^https:\/\/api\.doai\.fs\.fslab\.dev(?=\/)/, ''),
        body: request.body?.raw || '',
        tokenVariable: token?.match(/^\{\{(\w+)\}\}$/)?.[1] || '',
        scriptsOmitted: item.event?.length || 0,
        statuses: request.method === 'POST' && !request.url.raw.endsWith('/auth/login') ? [200, 201] : [200],
        captures: plans[n].captures || [], checks: plans[n].checks || [],
      };
    }),
  };
}

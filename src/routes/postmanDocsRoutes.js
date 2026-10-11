import express from 'express';
import { fileURLToPath } from 'node:url';
import AuthMiddleware from '../middlewares/AuthMiddleware.js';
import EnsureAdminMiddleware from '../middlewares/EnsureAdminMiddleware.js';
import { buildWebCollection } from '../postman/collection.js';

const router = express.Router();
const asset = (name) => fileURLToPath(new URL(`../postman/${name}`, import.meta.url));

router.use('/docs/postman', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});
// Somente arquivos explicitamente enumerados; permite checkouts em .worktrees.
router.get('/docs/postman', (_req, res) => res.sendFile(asset('index.html'), { dotfiles: 'allow' }));
for (const file of ['runner.js', 'core.js', 'style.css']) {
  router.get(`/docs/postman/${file}`, (_req, res) => res.sendFile(asset(file), { dotfiles: 'allow' }));
}
// O shell não contém credenciais nem executa requests. A coleção requer um
// Bearer administrativo validado no banco, nunca recebido por query string.
router.get('/docs/postman/collection', (req, res, next) => {
  if (Object.keys(req.query).length) return res.status(400).json({ message: 'Use o cabeçalho Authorization, nunca a URL.' });
  if (!/^Bearer\s+\S+$/i.test(req.headers.authorization || '')) {
    return res.status(401).json({ message: 'Informe um Bearer de administrador ativo.' });
  }
  next();
}, AuthMiddleware, EnsureAdminMiddleware, (_req, res) => res.json(buildWebCollection()));

export default router;

import UsuarioService from "../services/UsuarioService.js";
import {
  usuarioRepository,
  itemDoacaoRepository,
  avaliacaoRepository,
} from "./repositories.all.container.js";
import { autenticacaoService } from "./services.autenticacao.container.js";
import prismaTransactionManager from "../infra/PrismaTransactionManager.js";

export const usuarioService = new UsuarioService({
  usuarioRepository,
  itemDoacaoRepository,
  avaliacaoRepository,
  autenticacaoService,
  transactionManager: prismaTransactionManager,
});

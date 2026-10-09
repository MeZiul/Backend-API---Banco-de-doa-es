import AvaliacaoService from "../services/AvaliacaoService.js";
import prismaTransactionManager from "../infra/PrismaTransactionManager.js";
import {
  avaliacaoRepository,
  itemDoacaoRepository,
  interesseRepository,
  usuarioRepository,
} from "./repositories.all.container.js";

export const avaliacaoService = new AvaliacaoService({
  avaliacaoRepository,
  itemDoacaoRepository,
  interesseRepository,
  usuarioRepository,
  transactionManager: prismaTransactionManager,
});

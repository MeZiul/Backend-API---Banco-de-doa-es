import PerfilRepository from "../repositories/PerfilRepository.js";
import PerfilService from "../services/PerfilService.js";
import prismaTransactionManager from "../infra/PrismaTransactionManager.js";
import { autenticacaoService } from "./services.autenticacao.container.js";

export const perfilService = new PerfilService({
    perfilRepository: PerfilRepository,
    autenticacaoService,
    transactionManager: prismaTransactionManager,
});

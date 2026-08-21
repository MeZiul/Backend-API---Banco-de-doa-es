import InteresseRepository from "../repositories/InteresseRepository.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import InteresseService from "../services/InteresseService.js";
import notificacaoService from "../services/NotificacaoService.js";
import prismaTransactionManager from "../infra/PrismaTransactionManager.js";

const interesseRepository = new InteresseRepository();
const itemDoacaoRepository = new ItemDoacaoRepository();
const usuarioRepository = new UsuarioRepository();

const interesseService = new InteresseService({
    interesseRepository,
    itemDoacaoRepository,
    usuarioRepository,
    notificacaoService,
    transactionManager: prismaTransactionManager,
});

export { interesseService };

import AdministracaoRepository from "../repositories/AdministracaoRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import DenunciaRepository from "../repositories/DenunciaRepository.js";
import InteresseRepository from "../repositories/InteresseRepository.js";
import AvaliacaoRepository from "../repositories/AvaliacaoRepository.js";
import AdministracaoService from "../services/AdministracaoService.js";
import notificacaoService from "../services/NotificacaoService.js";
import prismaTransactionManager from "../infra/PrismaTransactionManager.js";
import { autenticacaoService } from "./services.autenticacao.container.js";

const administracaoRepository = new AdministracaoRepository();
const usuarioRepository = new UsuarioRepository();
const itemDoacaoRepository = new ItemDoacaoRepository();
const denunciaRepository = new DenunciaRepository();
const interesseRepository = new InteresseRepository();
const avaliacaoRepository = new AvaliacaoRepository();

const administracaoService = new AdministracaoService({
    administracaoRepository,
    usuarioRepository,
    itemDoacaoRepository,
    denunciaRepository,
    interesseRepository,
    avaliacaoRepository,
    notificacaoService,
    autenticacaoService,
    transactionManager: prismaTransactionManager,
});

export { administracaoService };

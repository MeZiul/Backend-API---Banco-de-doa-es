import AdministracaoRepository from "../repositories/AdministracaoRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import DenunciaRepository from "../repositories/DenunciaRepository.js";
import InteresseRepository from "../repositories/InteresseRepository.js";
import AdministracaoService from "../services/AdministracaoService.js";
import notificacaoService from "../services/NotificacaoService.js";

const administracaoRepository = new AdministracaoRepository();
const usuarioRepository = new UsuarioRepository();
const itemDoacaoRepository = new ItemDoacaoRepository();
const denunciaRepository = new DenunciaRepository();
const interesseRepository = new InteresseRepository();

const administracaoService = new AdministracaoService({
    administracaoRepository,
    usuarioRepository,
    itemDoacaoRepository,
    denunciaRepository,
    interesseRepository,
    notificacaoService,
});

export { administracaoService };

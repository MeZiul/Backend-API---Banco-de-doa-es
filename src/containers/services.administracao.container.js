import AdministracaoRepository from "../repositories/AdministracaoRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import DenunciaRepository from "../repositories/DenunciaRepository.js";
import AdministracaoService from "../services/AdministracaoService.js";

const administracaoRepository = new AdministracaoRepository();
const usuarioRepository = new UsuarioRepository();
const itemDoacaoRepository = new ItemDoacaoRepository();
const denunciaRepository = new DenunciaRepository();

const administracaoService = new AdministracaoService({
    administracaoRepository,
    usuarioRepository,
    itemDoacaoRepository,
    denunciaRepository,
});

export { administracaoService };

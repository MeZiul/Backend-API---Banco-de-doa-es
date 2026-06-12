import DenunciaRepository from "../repositories/DenunciaRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import DenunciaService from "../services/DenunciaService.js";

const denunciaRepository = new DenunciaRepository();
const usuarioRepository = new UsuarioRepository();
const itemDoacaoRepository = new ItemDoacaoRepository();

const denunciaService = new DenunciaService({
    denunciaRepository,
    usuarioRepository,
    itemDoacaoRepository,
});

export { denunciaService };

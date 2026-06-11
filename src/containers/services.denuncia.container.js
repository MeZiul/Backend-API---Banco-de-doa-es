import DenunciaRepository from "../repositories/DenunciaRepository.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import DenunciaService from "../services/DenunciaService.js";

const denunciaRepository = new DenunciaRepository();
const itemDoacaoRepository = new ItemDoacaoRepository();
const usuarioRepository = new UsuarioRepository();

const denunciaService = new DenunciaService({
    denunciaRepository,
    itemDoacaoRepository,
    usuarioRepository,
});

export { denunciaService };

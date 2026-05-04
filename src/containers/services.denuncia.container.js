import DenunciaRepository from "../repositories/DenunciaRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import DenunciaService from "../services/DenunciaService.js";

const denunciaRepository = new DenunciaRepository();
const usuarioRepository = new UsuarioRepository();

const denunciaService = new DenunciaService({
    denunciaRepository,
    usuarioRepository,
});

export { denunciaService };

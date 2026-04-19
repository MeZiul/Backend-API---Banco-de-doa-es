import AdministracaoRepository from "../repositories/AdministracaoRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import AdministracaoService from "../services/AdministracaoService.js";

const administracaoRepository = new AdministracaoRepository();
const usuarioRepository = new UsuarioRepository();

const administracaoService = new AdministracaoService({
    administracaoRepository,
    usuarioRepository,
});

export { administracaoService };

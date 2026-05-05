import InteresseRepository from "../repositories/InteresseRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import InteresseService from "../services/InteresseService.js";

const interesseRepository = new InteresseRepository();
const usuarioRepository = new UsuarioRepository();

const interesseService = new InteresseService({
    interesseRepository,
    usuarioRepository,
});

export { interesseService };

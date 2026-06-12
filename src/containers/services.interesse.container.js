import InteresseRepository from "../repositories/InteresseRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import InteresseService from "../services/InteresseService.js";
import notificacaoService from "../services/NotificacaoService.js";

const interesseRepository = new InteresseRepository();
const usuarioRepository = new UsuarioRepository();

const interesseService = new InteresseService({
    interesseRepository,
    usuarioRepository,
    notificacaoService,
});

export { interesseService };

import UsuarioRepository     from "../repositories/UsuarioRepository.js";
import CategoriaRepository   from "../repositories/CategoriaRepository.js";
import ItemDoacaoRepository  from "../repositories/ItemDoacaoRepository.js";
import AvaliacaoRepository   from "../repositories/AvaliacaoRepository.js";
import InteresseRepository   from "../repositories/InteresseRepository.js";
import DenunciaRepository    from "../repositories/DenunciaRepository.js";
//import NotificacaoRepository from "../repositories/NotificacaoRepository.js";

export const usuarioRepository     = new UsuarioRepository();
export const categoriaRepository   = new CategoriaRepository();
export const itemDoacaoRepository  = new ItemDoacaoRepository();
export const avaliacaoRepository   = new AvaliacaoRepository();
export const interesseRepository   = new InteresseRepository();
export const denunciaRepository    = new DenunciaRepository();
//export const notificacaoRepository = new NotificacaoRepository();
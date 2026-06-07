import UsuarioService from "../services/UsuarioService.js";
import {
  usuarioRepository,
  itemDoacaoRepository,
  avaliacaoRepository,
} from "./repositories.all.container.js";
import AuthHelper from "../utils/AuthHelper.js";

export const usuarioService = new UsuarioService({
  usuarioRepository,
  itemDoacaoRepository,
  avaliacaoRepository,
  passwordHasher: AuthHelper,
});

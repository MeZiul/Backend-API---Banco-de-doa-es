import UsuarioService from "../services/UsuarioService.js";
import {
  usuarioRepository,
  itemDoacaoRepository,
} from "./repositories.all.container.js";
import AuthHelper from "../utils/AuthHelper.js";

export const usuarioService = new UsuarioService({
  usuarioRepository,
  itemDoacaoRepository,
  passwordHasher: AuthHelper,
});
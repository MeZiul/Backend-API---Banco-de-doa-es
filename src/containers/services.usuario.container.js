import UsuarioService from "../services/UsuarioService.js";
import {
  usuarioRepository,
  itemDoacaoRepository,
  avaliacaoRepository,
} from "./repositories.all.container.js";
import AuthHelper from "../utils/AuthHelper.js";
import MailService from "../infra/MailService.js";

export const usuarioService = new UsuarioService({
  usuarioRepository,
  itemDoacaoRepository,
  avaliacaoRepository,
  passwordHasher: AuthHelper,
  mailService: new MailService(),
});

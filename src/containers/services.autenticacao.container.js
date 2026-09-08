import { auth } from "../config/betterAuth.js";
import AutenticacaoService from "../services/AutenticacaoService.js";
import { usuarioRepository } from "./repositories.all.container.js";

export const autenticacaoService = new AutenticacaoService({
  auth,
  usuarioRepository,
});

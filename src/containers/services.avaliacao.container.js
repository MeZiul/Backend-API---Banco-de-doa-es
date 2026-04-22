import AvaliacaoService from "../services/AvaliacaoService.js";
import {
  avaliacaoRepository,
  itemDoacaoRepository,
  usuarioRepository,
} from "./repositories.all.container.js";

export const avaliacaoService = new AvaliacaoService({
  avaliacaoRepository,
  itemDoacaoRepository,
  usuarioRepository,
});
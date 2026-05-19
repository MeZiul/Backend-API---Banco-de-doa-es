
import ItemDoacaoService from "../services/ItemDoacaoService.js";
import {
  itemDoacaoRepository,
  categoriaRepository,
  interesseRepository,
  //notificacaoRepository,
} from "./repositories.all.container.js";

export const itemDoacaoService = new ItemDoacaoService(
  itemDoacaoRepository,
  categoriaRepository,
  interesseRepository,
  //notificacaoRepository,
);
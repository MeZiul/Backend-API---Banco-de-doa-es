import CategoriaService from "../services/CategoriaService.js";
import { categoriaRepository } from "./repositories.all.container.js";

export const categoriaService = new CategoriaService({
  categoriaRepository,
});
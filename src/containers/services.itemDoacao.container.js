
import ItemDoacaoService from "../services/ItemDoacaoService.js";
import prismaTransactionManager from "../infra/PrismaTransactionManager.js";
import {
  itemDoacaoRepository,
  categoriaRepository,
  interesseRepository,
  usuarioRepository,
  //notificacaoRepository,
} from "./repositories.all.container.js";

export const itemDoacaoService = new ItemDoacaoService(
  itemDoacaoRepository,
  categoriaRepository,
  interesseRepository,
  { usuarioRepository, transactionManager: prismaTransactionManager },
);

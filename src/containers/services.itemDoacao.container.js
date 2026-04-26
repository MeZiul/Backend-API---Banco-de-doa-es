import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";
import ItemDoacaoService from "../services/ItemDoacaoService.js";

const ItemDoacaoService = new ItemDoacaoService(ItemDoacaoRepository);

export { ItemDoacaoService };
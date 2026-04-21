import itemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";

const itemDoacaoRepository = new itemDoacaoRepository();

const itemDoacaoService = new itemDoacaoService( {itemDoacaoRepository} );

export { itemDoacaoService}
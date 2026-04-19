import DenunciaRepository from "../repositories/DenunciaRepository.js";
import DenunciaService from "../services/DenunciaService.js";

const denunciaRepository = new DenunciaRepository();

const denunciaService = new DenunciaService({
    denunciaRepository,
});

export { denunciaService };

import InteresseRepository from "../repositories/InteresseRepository.js";
import InteresseService from "../services/InteresseService.js";

const interesseRepository = new InteresseRepository();

const interesseService = new InteresseService({
    interesseRepository,
});

export { interesseService };

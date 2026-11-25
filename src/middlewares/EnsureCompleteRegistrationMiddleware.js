import { CustomError } from "../utils/helpers/index.js";

const EnsureCompleteRegistrationMiddleware = (req, _res, next) => {
    if (!req.user?.id) {
        return next(new CustomError({ statusCode: 401, customMessage: "Usuário autenticado não informado" }));
    }

    if (req.user.cadastro_completo !== true) {
        return next(new CustomError({ statusCode: 403, errorType: "registrationIncomplete", customMessage: "Complete seu cadastro antes de realizar esta operação" }));
    }

    return next();
};

export default EnsureCompleteRegistrationMiddleware;
import CommonResponse from "../utils/helpers/CommonResponse.js";
import { ZodError } from "zod-v3";

export const validate = (schema, source = 'body') => (req, res, next) => {
    // ... dentro do validateMiddleware.js
    try {
        const validatedData = schema.parse(req[source]);

        // Se for query, não sobrescrevemos o objeto, apenas alteramos as propriedades
        if (source === 'query') {
            // Remove o que tinha antes para não sobrar lixo não validado
            Object.keys(req.query).forEach(key => delete req.query[key]);
            // Adiciona os dados validados/convertidos pelo Zod
            Object.assign(req.query, validatedData);
        } else {
            // Para body e params, geralmente a sobrescrita direta funciona,
            // mas usar Object.assign é mais seguro globalmente:
            req[source] = validatedData;
        }

        next();
    } catch (error) {
        if (!(error instanceof ZodError)) {
            return next(error);
        }

        const validationErrors = error.issues.map(err => ({
            campo: err.path.join('.'),
            mensagem: err.message
        }));

        return CommonResponse.error(
            res,
            400,
            "validation_error",
            null,
            validationErrors,
            "Erro de validação nos dados enviados."
        );
    }
};

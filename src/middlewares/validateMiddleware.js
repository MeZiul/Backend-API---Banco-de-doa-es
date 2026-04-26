import CommonResponse from "../utils/helpers/CommonResponse.js";


export const validate = (schema, source = 'body') => (req, res, next) => {
    try {
        // Valida e substitui os dados pelos valores parseados (importante para coerção de números)
        const validatedData = schema.parse(req[source]);
        req[source] = validatedData;

        next();
    } catch (error) {
        // Formata a lista de erros do Zod para o padrão do CommonResponse
        const validationErrors = error.errors.map(err => ({
            campo: err.path.join('.'),
            mensagem: err.message
        }));

        // Utiliza o seu CommonResponse.error
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
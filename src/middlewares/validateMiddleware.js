import CommonResponse from "../utils/helpers/CommonResponse.js";


export const validate = (schema, source = 'body') => (req, res, next) => {
    // ... dentro do validateMiddleware.js
    try {
        const validatedData = schema.parse(req[source]);

        // Se for query, mudamos propriedade por propriedade para não dar erro de "only a getter"
        if (source === 'query') {
            Object.keys(req.query).forEach(key => delete req.query[key]); // limpa o antigo
            Object.assign(req.query, validatedData); // insere o validado (com números/booleans reais)
        } else {
            req[source] = validatedData;
        }

        next();
    } catch (error) {
// ... resto do código
        // 1. Criamos uma trava de segurança: se não houver 'errors', usamos um array vazio
        const errorsList = error.errors || (error.issues ? error.issues : []);

        // 2. Formatamos apenas se houver o que mapear
        const validationErrors = errorsList.map(err => ({
            campo: err.path ? err.path.join('.') : 'geral',
            mensagem: err.message
        }));

        // 3. Caso o erro seja totalmente inesperado e a lista ainda esteja vazia
        if (validationErrors.length === 0) {
            validationErrors.push({ campo: 'desconhecido', mensagem: error.message });
        }

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
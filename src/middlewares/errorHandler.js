import { mapPrismaError } from "../utils/errors/prismaErrorMapper.js";

export default function errorHandler(error, req, res, next) {
    const prismaError = mapPrismaError(error);

    const finalError = prismaError || error;

    const status = finalError.status || 500;

    if (status >= 500) {
        console.error(error);
    }

    return res.status(status).json({
        success: false,
        error: {
            code: finalError.code || "INTERNAL_SERVER_ERROR",
            message: status === 500 ? "Ocorreu um erro interno no servidor." : finalError.message
        }
    });
}

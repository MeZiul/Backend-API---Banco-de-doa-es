
const sanitizeLogValue = (value) =>
    String(value ?? "-").replace(/[\u0000-\u001F\u007F-\u009F]/g, "?");

const logRoutes = async (req, res, next) => {
    try {
        const timestamp = new Date().toISOString();
        const ip = sanitizeLogValue(req.ip);
        const method = sanitizeLogValue(req.method);
        const path = sanitizeLogValue(req.path);

        console.log(`${timestamp} ${ip} ${method} ${path}`);
    } catch {
        console.log("Erro ao fazer o log da rota");
    }
    next();
};

export default logRoutes;

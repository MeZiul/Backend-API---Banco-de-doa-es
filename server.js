import "dotenv/config";
import app from "./src/app.js";
import { verificarTodasParidades } from "./src/utils/verificarParidadeSchemas.js";

const port = process.env.APP_PORT || 7340;

verificarTodasParidades();

app.listen(port, '0.0.0.0', (err) => {
    if(err) {
        console.error("Erro ao iniciar o servidor:", err);
        process.exit(1);
    }
    console.log(`Servidor escutando em http://0.0.0.0:${port} (acessível na rede local)`)
})
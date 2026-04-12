import "dotenv/config";
import app from "./src/app.js";

const port = process.env.APP_PORT || 7340;

app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escutando em http://0.0.0.0:${port} (acessível na rede local)`)
})
import SendMail from "../utils/SendMail.js";
import logger from "../utils/logger.js";
import { disconnectPrisma, getPrisma } from "./prisma.js";

class DbConnect {
  static async conectar() {
    try {
      const prisma = getPrisma();
      await prisma.$queryRawUnsafe("SELECT 1");
      logger.info("Prisma conectado ao PostgreSQL.");
    } catch (error) {
      logger.error(`Erro na conexão com o banco de dados: ${error.message}`);
      if (process.env.NODE_ENV !== "test") {
        // O envio é aguardado para que uma falha no e-mail seja registrada,
        // sem ocultar o erro original de banco.
        await SendMail.enviaEmailErrorDbConect(error, import.meta.url, new Date())
          .catch((erroEmail) => logger.warn(`Falha ao enviar o e-mail de erro de banco: ${erroEmail.message}`));
      }
      throw error;
    }
  }

  static async desconectar() {
    try {
      await disconnectPrisma();
      logger.info("Conexão Prisma encerrada.");
    } catch (error) {
      logger.error(`Erro ao desconectar do banco de dados: ${error.message}`);
      throw error;
    }
  }
}

export default DbConnect;

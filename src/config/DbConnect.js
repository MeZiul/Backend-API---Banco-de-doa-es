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
        try {
          SendMail.enviaEmailErrorDbConect(error, import.meta.url, new Date());
        } catch {
          // O erro de e-mail não deve ocultar o erro original de banco.
        }
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

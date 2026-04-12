// src/config/DbConnect.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { URL } from 'url';
import SendMail from '../utils/SendMail.js';
import logger from '../utils/logger.js';

dotenv.config();

let mongoServer = null;

class DbConnect {
    static async conectar() {
        try {
            let mongoUri = process.env.DB_URL;

            if (process.env.USE_IN_MEMORY_DB === 'true') {
                const { MongoMemoryServer } = await import('mongodb-memory-server');
                mongoServer = await MongoMemoryServer.create();
                mongoUri = mongoServer.getUri();
                logger.info('MongoDB em memória iniciado.');
            } else {
                if (!mongoUri) {
                    throw new Error("A variável de ambiente DB_URL não foi definida.");
                }
                logger.info('DB_URL está definida.');
            }

            mongoose.set('strictQuery', process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test');
            mongoose.set('autoIndex', true);
            mongoose.set('debug', process.env.NODE_ENV === 'development');

            mongoose.connection.on('connected', () => {
                logger.info('Mongoose conectado ao MongoDB.');
            });

            mongoose.connection.on('error', (err) => {
                logger.error(`Mongoose erro: ${err}`);
                if (process.env.NODE_ENV !== 'test') {
                    // SendMail.enviaEmailErrorDbConect(err, new URL(import.meta.url).pathname, new Date());
                }
            });

            mongoose.connection.on('disconnected', () => {
                logger.info('Mongoose desconectado do MongoDB.');
            });

            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000,
                retryWrites: true,
                maxPoolSize: 10,
            });

            logger.info('Conexão com o banco estabelecida!');
        } catch (error) {
            logger.error(`Erro na conexão com o banco de dados: ${error.message}`);
            if (process.env.NODE_ENV !== 'test') {
                SendMail.enviaEmailErrorDbConect(error, new URL(import.meta.url).pathname, new Date());
            }
            throw error;
        }
    }

    static async desconectar() {
        try {
            await mongoose.disconnect();
            logger.info('Conexão com o banco encerrada!');

            if (mongoServer) {
                await mongoServer.stop();
                logger.info('MongoDB em memória finalizado.');
            }
        } catch (error) {
            logger.error(`Erro ao desconectar do banco de dados: ${error.message}`);
            if (process.env.NODE_ENV !== 'test') {
                SendMail.enviaEmailErrorDbConect(error, new URL(import.meta.url).pathname, new Date());
            }
            throw error;
        }
    }
}

export default DbConnect;

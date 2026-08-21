import BaseRepository from "./base/BaseRepository.js";
import { mapPrismaErrorToLegacy } from "./prisma/prismaUtils.js";

class NotificacaoRepository extends BaseRepository {
  constructor() {
    super("notificacao");
  }

  async criarMuitas(notificacoes) {
    if (!notificacoes.length) return [];

    try {
      return await this.withTransaction(async (tx) => {
        const created = [];
        for (const dados of notificacoes) {
          created.push(
            await tx.notificacao.create({
              data: this.normalizeData(dados),
            }),
          );
        }
        return created.map((record) => this.mapRecord(record));
      });
    } catch (error) {
      throw mapPrismaErrorToLegacy(error);
    }
  }

  listarDoUsuario(usuarioId, options = { page: 1, limit: 20 }) {
    return this.listarComPaginacao(
      { usuario_id: usuarioId },
      {
        ...options,
        sort: { data_criacao: -1 },
      },
    );
  }

  contarNaoLidas(usuarioId) {
    return this.delegate.count({
      where: {
        usuario_id: usuarioId,
        lida: false,
      },
    });
  }

  async marcarComoLida(notificacaoId, usuarioId) {
    return this.withTransaction(async (tx) => {
      const result = await tx.notificacao.updateMany({
        where: {
          id: String(notificacaoId),
          usuario_id: usuarioId,
        },
        data: { lida: true },
      });
      if (result.count === 0) return null;
      return this.mapRecord(
        await tx.notificacao.findUnique({
          where: { id: String(notificacaoId) },
        }),
      );
    });
  }

  async marcarTodasComoLidas(usuarioId) {
    const result = await this.delegate.updateMany({
      where: { usuario_id: usuarioId, lida: false },
      data: { lida: true },
    });
    return { matchedCount: result.count, modifiedCount: result.count };
  }
}

export default new NotificacaoRepository();

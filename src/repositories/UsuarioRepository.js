import BaseRepository from "./base/BaseRepository.js";
import UsuarioFilterBuilder from "./filters/UsuarioFilterBuilder.js";
import {
  mapPrismaErrorToLegacy,
  toPrismaWhere,
} from "./prisma/prismaUtils.js";

const ADMIN_LIST_SELECT = [
  "nome",
  "email",
  "cidade",
  "uf",
  "perfil",
  "situacao",
  "media_avaliacoes",
  "total_avaliacoes",
  "total_doacoes",
  "data_cadastro",
].join(" ");

const ADMIN_DETAIL_SELECT = [
  ADMIN_LIST_SELECT,
  "telefone",
  "foto_perfil",
  "bio",
  "motivo_suspensao",
  "suspensao_ate",
  "data_atualizacao",
].join(" ");

class UsuarioRepository extends BaseRepository {
  constructor() {
    super("usuario");
  }

  normalizeData(data) {
    const clean = super.normalizeData(data);
    if (typeof clean.email === "string") clean.email = clean.email.trim().toLowerCase();
    if (typeof clean.nome === "string") clean.nome = clean.nome.trim();
    if (typeof clean.uf === "string") clean.uf = clean.uf.trim().toUpperCase();
    return clean;
  }

  async buscarPorEmail(email) {
    const record = await this.delegate.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });
    return this.mapRecord(record);
  }

  async buscarPorCpf(cpf) {
    const record = await this.delegate.findUnique({ where: { cpf } });
    return this.mapRecord(record);
  }

  async buscarPorEmailComSenha(email) {
    const record = await this.delegate.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!record) return null;

    const {
      token_redefinicao: _tokenRedefinicao,
      token_redefinicao_expira: _tokenRedefinicaoExpira,
      ...recordComSenha
    } = record;

    return this.mapRecord(recordComSenha, { includeHidden: true });
  }

  async buscarPorTokenRedefinicao(token) {
    const record = await this.delegate.findFirst({
      where: { token_redefinicao: token },
    });
    return this.mapRecord(record, { includeHidden: true });
  }

  atualizarSenha(id, senha) {
    return this.atualizar(id, {
      senha,
      token_redefinicao: null,
      token_redefinicao_expira: null,
    });
  }

  async atualizarSeSituacao(
    id,
    situacaoEsperada,
    dadosAtualizacao,
    filtrosAdicionais = {},
  ) {
    const situacao = Array.isArray(situacaoEsperada)
      ? { in: situacaoEsperada }
      : situacaoEsperada;

    try {
      return await this.withTransaction(async (tx) => {
        const result = await tx.usuario.updateMany({
          where: {
            id: String(id),
            situacao,
            ...toPrismaWhere(filtrosAdicionais),
          },
          data: this.normalizeData(dadosAtualizacao),
        });

        if (result.count === 0) return null;

        const record = await tx.usuario.findUnique({ where: { id: String(id) } });
        return this.mapRecord(record);
      });
    } catch (error) {
      throw mapPrismaErrorToLegacy(error);
    }
  }

  listar({ filtros = {}, page = 1, limit = 15 }) {
    const builder = new UsuarioFilterBuilder()
      .comNome(filtros.nome)
      .comCidade(filtros.cidade)
      .comUf(filtros.uf)
      .comSituacao(filtros.situacao);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      sort: { data_cadastro: -1 },
    });
  }

  listarParaAdministracao({ filtros = {}, page = 1, limit = 15 }) {
    const builder = new UsuarioFilterBuilder()
      .comNome(filtros.nome)
      .comEmail(filtros.email)
      .comCpf(filtros.cpf)
      .comCidade(filtros.cidade)
      .comUf(filtros.uf)
      .comSituacao(filtros.situacao)
      .comPerfil(filtros.perfil)
      .comPeriodo(filtros.dataInicio, filtros.dataFim);

    return this.listarComPaginacao(builder.build(), {
      page,
      limit,
      select: ADMIN_LIST_SELECT,
      sort: { data_cadastro: -1 },
    });
  }

  buscarPorIdParaAdministracao(id) {
    return this.buscarPorId(id, { select: ADMIN_DETAIL_SELECT });
  }
}

export default UsuarioRepository;

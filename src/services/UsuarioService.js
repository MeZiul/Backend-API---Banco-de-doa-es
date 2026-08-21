import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CustomError } from "../utils/helpers/index.js";
import { validarCPF } from "../utils/verificarCPF.js";

class UsuarioService {
  constructor({
    usuarioRepository,
    itemDoacaoRepository,
    avaliacaoRepository,
  }) {
    this.repository = usuarioRepository;
    this.itemDoacaoRepository = itemDoacaoRepository;
    this.avaliacaoRepository = avaliacaoRepository;
  }

  async cadastrar(dados) {
    const emailExiste = await this.repository.buscarPorEmail(dados.email);
    if (emailExiste) {
      throw new CustomError({
        statusCode: 409,
        customMessage:
          "E-mail já cadastrado. Faça login ou recupere sua senha.",
      });
    }

    const cpfValidado = await validarCPF(dados.cpf);
    if (!cpfValidado) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "CPF inválido.",
      });
    }

    const cpfExiste = await this.repository.buscarPorCpf(dados.cpf);
    if (cpfExiste) {
      throw new CustomError({
        statusCode: 409,
        customMessage: "CPF já cadastrado. Faça login ou recupere sua senha.",
      });
    }

    const senha = await bcrypt.hash(dados.senha, 10);

    return this.repository.criar({
      ...dados,
      senha,
      perfil: "USUARIO",
      situacao: "ATIVO",
    });
  }

  async login(email, senha) {
    const usuario = await this.repository.buscarPorEmailComSenha(email);

    if (!usuario) {
      throw new CustomError({
        statusCode: 401,
        customMessage: "E-mail ou senha incorretos.",
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      throw new CustomError({
        statusCode: 401,
        customMessage: "E-mail ou senha incorretos.",
      });
    }

    if (usuario.situacao === "SUSPENSO") {
      throw new CustomError({
        statusCode: 403,
        customMessage: `Conta suspensa até ${usuario.suspensao_ate?.toLocaleDateString("pt-BR")}. Motivo: ${usuario.motivo_suspensao}`,
      });
    }

    if (usuario.situacao === "INATIVO") {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Conta inativa.",
      });
    }

    const token = jwt.sign(
      {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        situacao: usuario.situacao,
      },
      process.env.JWT_SECRET_ACCESS_TOKEN,
      { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || "15m" },
    );
    const refreshToken = jwt.sign(
      {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
      process.env.JWT_SECRET_REFRESH_TOKEN,
      { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || "7d" },
    );

    const removerSenha = usuario.toObject();
    delete removerSenha.senha;
    delete removerSenha.token_redefinicao;
    delete removerSenha.token_redefinicao_expira;

    return { token, refreshToken, usuario: removerSenha };
  }

  async esqueciSenha(email) {
    const usuario = await this.repository.buscarPorEmail(email);

    if (!usuario) {
      return {
        message: "Se o e-mail estiver cadastrado, voce recebera as instrucoes.",
      };
    }

    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + 60 * 60 * 1000);

    await this.repository.atualizar(usuario._id, {
      token_redefinicao: token,
      token_redefinicao_expira: expira,
    });

    return {
      message: "Se o e-mail estiver cadastrado, voce recebera as instrucoes.",
      token,
    };
  }

  async refreshToken({ id, nome, email, perfil }) {
    const usuario = await this.repository.buscarPorId(id);

    if (!usuario) {
      throw new CustomError({
        statusCode: 401,
        customMessage: "Usuário não encontrado.",
      });
    }

    if (usuario.situacao !== "ATIVO") {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Conta inativa ou suspensa.",
      });
    }

    const novoToken = jwt.sign(
      { id, nome, email, perfil },
      process.env.JWT_SECRET_ACCESS_TOKEN,
      { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || "24h" },
    );

    return novoToken;
  }

  async atualizar(id, dados, actor = null) {
    await this.ensureExists(id);

    if (actor && actor.perfil !== "ADMINISTRADOR" && actor.id !== id) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Você não tem permissão para atualizar este usuário.",
      });
    }

    delete dados.cpf;
    delete dados.perfil;
    delete dados.situacao;
    delete dados.senha;

    if (dados.email) {
      const emailExiste = await this.repository.buscarPorEmail(dados.email);
      if (emailExiste && emailExiste._id.toString() !== id) {
        throw new CustomError({
          statusCode: 409,
          customMessage: "Este e-mail está em uso .",
        });
      }
    }

    return this.repository.atualizar(id, dados);
  }

  async redefinirSenha(token, novaSenha) {
    const usuario = await this.repository.buscarPorTokenRedefinicao(token);

    if (!usuario) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "Token inválido ou expirado.",
      });
    }

    if (usuario.token_redefinicao_expira < new Date()) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "Token expirado",
      });
    }

    const senha = await bcrypt.hash(novaSenha, 10);
    await this.repository.atualizarSenha(usuario._id, senha);

    return { message: "Senha redefinida com sucesso." };
  }

  async excluir(id, senha, actor = null) {
    const usuarioExiste = await this.ensureExists(id);
    if (actor && actor.perfil !== "ADMINISTRADOR" && actor.id !== id) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Você não tem permissão para excluir esta conta.",
      });
    }

    const usuario = await this.repository.buscarPorEmailComSenha(
      usuarioExiste.email,
    );
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      throw new CustomError({
        statusCode: 401,
        customMessage: "Senha incorreta",
      });
    }

    const itensEmAndamento =
      await this.itemDoacaoRepository.buscarEmAndamentoPorUsuario(id);
    if (itensEmAndamento?.length > 0) {
      throw new CustomError({
        statusCode: 400,
        customMessage:
          "Você possui doações em andamento. Finalize-as antes de excluir a conta.",
      });
    }

    await this.repository.atualizar(id, {
      situacao: "INATIVO",
      nome: "Usuário Removido",
      email: `removido_${id}@exemplo.com`,
      cpf: `removido_${id}`,
      telefone: null,
      foto_perfil: null,
      bio: null,
    });

    await this.itemDoacaoRepository.cancelarItensPorUsuario(id);

    return { message: "Conta excluída com sucesso." };
  }

  async suspender(id, { motivo, suspensao_ate }) {
    const usuario = await this.ensureExists(id);

    if (usuario.situacao === "INATIVO") {
      throw new CustomError({
        statusCode: 400,
        customMessage: "Não é possível suspender uma conta inativa.",
      });
    }

    if (!motivo || !suspensao_ate) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "Motivo e data de suspensão são obrigatórios.",
      });
    }

    return this.repository.atualizar(id, {
      situacao: "SUSPENSO",
      motivo_suspensao: motivo,
      suspensao_ate: new Date(suspensao_ate),
    });
  }

  async reativar(id) {
    const usuario = await this.ensureExists(id);

    if (usuario.situacao !== "SUSPENSO") {
      throw new CustomError({
        statusCode: 400,
        customMessage: "Apenas usuários suspensos podem ser reativados.",
      });
    }

    return this.repository.atualizar(id, {
      situacao: "ATIVO",
      motivo_suspensao: null,
      suspensao_ate: null,
    });
  }

  async listar({ filtros, page, limit, actor }) {
    const resultado = await this.repository.listar({ filtros, page, limit });
    if (actor?.perfil !== "ADMINISTRADOR") {
      resultado.docs = resultado.docs.map((usuario) => ({
        id: usuario._id,
        nome: usuario.nome,
        foto: usuario.foto_perfil,
        bio: usuario.bio,
        cidade: usuario.cidade,
        uf: usuario.uf,
        situacao: usuario.situacao,
        media_avaliacoes: usuario.media_avaliacoes,
        total_avaliacoes: usuario.total_avaliacoes,
        total_doacoes: usuario.total_doacoes,
        data_cadastro: usuario.data_cadastro,
      }));
    }

    return resultado;
  }

  async buscarPorId(id, actor = null) {
    const usuario = await this.ensureExists(id);
    if (actor?.perfil === "ADMINISTRADOR" || actor?.id === id) {
      return usuario;
    }
    return {
      id: usuario._id,
      nome: usuario.nome,
      foto: usuario.foto_perfil,
      bio: usuario.bio,
      cidade: usuario.cidade,
      uf: usuario.uf,
      situacao: usuario.situacao,
      media_avaliacoes: usuario.media_avaliacoes,
      total_avaliacoes: usuario.total_avaliacoes,
      total_doacoes: usuario.total_doacoes,
      data_cadastro: usuario.data_cadastro,
    };
  }

  async listarItens(id, actor = null) {
    await this.ensureExists(id);
    return this.itemDoacaoRepository.listarPorUsuario(id);
  }

  async listarAvaliacoes(id, actor = null) {
    await this.ensureExists(id);
    return this.avaliacaoRepository.listar({
      filtros: { avaliado_id: id },
      page: 1,
      limit: 20,
    });
  }
  async ensureExists(id) {
    const usuario = await this.repository.buscarPorId(id);
    if (!usuario) {
      throw new CustomError({
        statusCode: 404,
        customMessage: "Usuário não encontrado.",
      });
    }
    return usuario;
  }
}

export default UsuarioService;

import { CustomError } from "../utils/helpers/index.js";
import { validarCPF } from "../utils/verificarCPF.js";

class UsuarioService {
  constructor({
    usuarioRepository,
    itemDoacaoRepository,
    avaliacaoRepository,
    autenticacaoService,
    transactionManager = { run: (operation) => operation() },
  }) {
    this.repository = usuarioRepository;
    this.itemDoacaoRepository = itemDoacaoRepository;
    this.avaliacaoRepository = avaliacaoRepository;
    this.autenticacaoService = autenticacaoService;
    this.transactionManager = transactionManager;
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

    const authUser = await this.autenticacaoService.cadastrar(dados);
    const usuarioCriado = await this.repository.buscarPorId(authUser.id);

    if (!usuarioCriado) {
      throw new CustomError({
        statusCode: 409,
        customMessage:
          "E-mail já cadastrado. Faça login ou recupere sua senha.",
      });
    }

    return usuarioCriado;
  }

  async atualizar(id, dados, actor = null) {
    await this.ensureExists(id);

    if (actor && actor.perfil !== "ADMINISTRADOR" && actor.id !== id) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Você não tem permissão para atualizar este usuário.",
      });
    }

    const { senha, cpf, perfil, situacao, ...dadosPermitidos } = dados;

    if (dadosPermitidos.email) {
      const emailExiste = await this.repository.buscarPorEmail(dadosPermitidos.email);
      if (emailExiste && emailExiste._id.toString() !== id) {
        throw new CustomError({
          statusCode: 409,
          customMessage: "Este e-mail está em uso .",
        });
      }
    }

    return this.transactionManager.run(async () => {
      const usuarioAtualizado = await this.repository.atualizar(
        id,
        dadosPermitidos,
      );

      if (senha) {
        await this.autenticacaoService.atualizarSenhaUsuario(id, senha);
      }

      return usuarioAtualizado;
    });
  }

  async excluir(id, senha, actor = null) {
    const usuarioExiste = await this.ensureExists(id);
    if (actor && actor.perfil !== "ADMINISTRADOR" && actor.id !== id) {
      throw new CustomError({
        statusCode: 403,
        customMessage: "Você não tem permissão para excluir esta conta.",
      });
    }

    const senhaCorreta = await this.autenticacaoService.verificarSenhaUsuario(
      id,
      senha,
    );
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

    await this.transactionManager.run(async () => {
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
      await this.autenticacaoService.revogarSessoesUsuario(id);
    });

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

    const usuarioSuspenso = await this.repository.atualizar(id, {
      situacao: "SUSPENSO",
      motivo_suspensao: motivo,
      suspensao_ate: new Date(suspensao_ate),
    });

    await this.autenticacaoService?.revogarSessoesUsuario?.(id);
    return usuarioSuspenso;
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

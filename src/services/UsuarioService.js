import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CustomError } from "../utils/helpers/index.js";

class UsuarioService {

  constructor({ usuarioRepository, itemDoacaoRepository }) {
    this.repository           = usuarioRepository;
    this.itemDoacaoRepository = itemDoacaoRepository;
  }

  async cadastrar(dados) {
    const emailExiste = await this.repository.buscarPorEmail(dados.email);
    if (emailExiste) {
      throw new CustomError({
        statusCode: 409,
        customMessage: "E-mail já cadastrado. Faça login ou recupere sua senha.",
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
      perfil:   "USUARIO",
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
        id:     usuario._id,
        nome:   usuario.nome,
        email:  usuario.email,
        perfil: usuario.perfil,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return { token, usuario };
  }

  async atualizar(id, dados) {
    await this.ensureExists(id);

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

  async excluir(id, senha) {
    const usuarioExiste = await this.ensureExists(id);

    const usuario = await this.repository.buscarPorEmailComSenha(usuarioExiste.email);
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      throw new CustomError({
        statusCode: 401,
        customMessage: "Senha incorreta",
      });
    }

    const itensEmAndamento = await this.itemDoacaoRepository.buscarEmAndamentoPorUsuario(id);
    if (itensEmAndamento?.length > 0) {
      throw new CustomError({
        statusCode: 400,
        customMessage: "Você possui doações em andamento. Finalize-as antes de excluir a conta.",
      });
    }

    await this.repository.atualizar(id, {
      situacao:    "INATIVO",
      nome:        "Usuário Removido",
      email:       `removido_${id}@exemplo.com`,
      cpf:         "000.000.000-00",
      telefone:    null,
      foto_perfil: null,
      bio:         null,
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
      situacao:         "SUSPENSO",
      motivo_suspensao: motivo,
      suspensao_ate:    new Date(suspensao_ate),
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
      situacao:         "ATIVO",
      motivo_suspensao: null,
      suspensao_ate:    null,
    });
  }

  async listar({ filtros, page, limit }) {
    return this.repository.listar({ filtros, page, limit });
  }

  async buscarPorId(id) {
    return this.ensureExists(id);
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
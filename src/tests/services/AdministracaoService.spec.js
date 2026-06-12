import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AdministracaoService from "../../services/AdministracaoService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("AdministracaoService", () => {
  let administracaoRepository;
  let usuarioRepository;
  let itemDoacaoRepository;
  let denunciaRepository;
  let service;

  beforeEach(() => {
    administracaoRepository = {
      listar: jest.fn(),
      buscarPorIdDetalhado: jest.fn(),
      listarPorAlvo: jest.fn(),
      listarPorAdministrador: jest.fn(),
      criar: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      listar: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      listarTodos: jest.fn(),
      cancelarItensPorUsuario: jest.fn(),
    };

    denunciaRepository = {
      buscarPorIdDetalhado: jest.fn(),
      atualizar: jest.fn(),
      listar: jest.fn(),
    };

    service = new AdministracaoService({
      administracaoRepository,
      usuarioRepository,
      itemDoacaoRepository,
      denunciaRepository,
    });
  });

  test("deve encaminhar listagens administrativas com paginacao normalizada", async () => {
    const adminPorPapel = createRegularUser({ papeis: ["ADMINISTRADOR"] });
    administracaoRepository.listar.mockResolvedValue({ docs: ["acoes"] });
    administracaoRepository.listarPorAlvo.mockResolvedValue({ docs: ["alvo"] });
    administracaoRepository.listarPorAdministrador.mockResolvedValue({ docs: ["admin"] });
    usuarioRepository.listar.mockResolvedValue({ docs: ["usuarios"] });
    itemDoacaoRepository.listarTodos.mockResolvedValue({ docs: ["itens"] });
    denunciaRepository.listar.mockResolvedValue({ docs: ["denuncias"] });

    await expect(service.listar({ filtros: { tipo: "ITEM" }, page: "2", limit: "5" }, adminPorPapel))
      .resolves.toEqual({ docs: ["acoes"] });
    await service.listarPorAlvo(testIds.item, { page: "3", limit: "6" }, adminPorPapel);
    await service.listarPorAdministrador(testIds.admin, { page: "4", limit: "7" }, adminPorPapel);
    await service.listarUsuarios({ filtros: { situacao: "ATIVO" }, page: "5", limit: "8" }, adminPorPapel);
    await service.listarItens({
      filtros: { status: "DISPONIVEL" },
      page: "6",
      limit: "9",
      ordenacao: "antigos",
    }, adminPorPapel);
    await service.listarDenuncias({ filtros: { status: "EM_ANALISE" }, page: "7", limit: "10" }, adminPorPapel);

    expect(administracaoRepository.listar).toHaveBeenCalledWith({
      filtros: { tipo: "ITEM" },
      page: 2,
      limit: 5,
    });
    expect(administracaoRepository.listarPorAlvo).toHaveBeenCalledWith(testIds.item, { page: 3, limit: 6 });
    expect(administracaoRepository.listarPorAdministrador).toHaveBeenCalledWith(testIds.admin, { page: 4, limit: 7 });
    expect(usuarioRepository.listar).toHaveBeenCalledWith({
      filtros: { situacao: "ATIVO" },
      page: 5,
      limit: 8,
    });
    expect(itemDoacaoRepository.listarTodos).toHaveBeenCalledWith({
      filtros: { status: "DISPONIVEL" },
      page: 6,
      limit: 9,
      ordenacao: "antigos",
    });
    expect(denunciaRepository.listar).toHaveBeenCalledWith({
      filtros: { status: "EM_ANALISE" },
      page: 7,
      limit: 10,
    });
  });

  test("deve buscar acao e usuario por id para administrador", async () => {
    const acao = { _id: testIds.administracao };
    const usuario = { _id: testIds.usuario };
    administracaoRepository.buscarPorIdDetalhado.mockResolvedValue(acao);
    usuarioRepository.buscarPorId.mockResolvedValue(usuario);

    await expect(service.buscarPorId(testIds.administracao, createAdminUser())).resolves.toEqual(acao);
    await expect(service.buscarUsuarioPorId(testIds.usuario, createAdminUser())).resolves.toEqual(usuario);
  });

  test("deve rejeitar operacoes administrativas para usuario comum", async () => {
    await expect(service.listar({}, createRegularUser())).rejects.toMatchObject({ statusCode: 403 });
    expect(administracaoRepository.listar).not.toHaveBeenCalled();
  });

  test("deve bloquear usuario e registrar a acao administrativa", async () => {
    const usuario = { _id: testIds.usuario, situacao: "ATIVO" };
    usuarioRepository.buscarPorId.mockResolvedValue(usuario);
    usuarioRepository.atualizar.mockResolvedValue({ ...usuario, situacao: "SUSPENSO" });
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    const resultado = await service.bloquearUsuario(
      testIds.usuario,
      {
        justificativa: "  Violacao das regras  ",
        suspensaoAte: "2026-07-01",
        respostaAdministrativa: "Analise concluida.",
        acaoTomada: "Suspensao temporaria.",
      },
      createAdminUser()
    );

    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(testIds.usuario, {
      situacao: "SUSPENSO",
      motivo_suspensao: "Violacao das regras",
      suspensao_ate: "2026-07-01",
    });
    expect(administracaoRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      administrador_id: testIds.admin,
      tipo_acao: "BLOQUEIO_USUARIO",
      tipo_alvo: "USUARIO",
      alvo_model: "Usuario",
      alvo_id: testIds.usuario,
      justificativa: "Violacao das regras",
      resposta_administrativa: "Analise concluida.",
      acao_tomada: "Suspensao temporaria.",
      data_acao: expect.any(Date),
    }));
    expect(resultado).toMatchObject({ situacao: "SUSPENSO" });
  });

  test("deve exigir justificativa para bloquear usuario", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario });

    await expect(service.bloquearUsuario(
      testIds.usuario,
      { justificativa: "   " },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(usuarioRepository.atualizar).not.toHaveBeenCalled();
    expect(administracaoRepository.criar).not.toHaveBeenCalled();
  });

  test("deve desbloquear somente usuario suspenso e registrar a acao", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, situacao: "SUSPENSO" });
    usuarioRepository.atualizar.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });

    await expect(service.desbloquearUsuario(
      testIds.usuario,
      { resposta_administrativa: "Revisao aceita." },
      createAdminUser()
    )).resolves.toMatchObject({ situacao: "ATIVO" });

    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(testIds.usuario, {
      situacao: "ATIVO",
      motivo_suspensao: null,
      suspensao_ate: null,
    });
    expect(administracaoRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      tipo_acao: "DESBLOQUEIO_USUARIO",
      alvo_model: "Usuario",
      resposta_administrativa: "Revisao aceita.",
    }));
  });

  test("deve rejeitar desbloqueio de usuario nao suspenso", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });

    await expect(service.desbloquearUsuario(
      testIds.usuario,
      {},
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(usuarioRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve inativar usuario, cancelar seus itens e registrar a acao", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });
    usuarioRepository.atualizar.mockResolvedValue({ _id: testIds.usuario, situacao: "INATIVO" });

    await expect(service.inativarUsuario(
      testIds.usuario,
      { acaoTomada: "Conta encerrada." },
      createAdminUser()
    )).resolves.toMatchObject({ situacao: "INATIVO" });

    expect(itemDoacaoRepository.cancelarItensPorUsuario).toHaveBeenCalledWith(testIds.usuario);
    expect(administracaoRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      tipo_acao: "INATIVACAO_USUARIO",
      acao_tomada: "Conta encerrada.",
    }));
  });

  test("deve cancelar item e registrar a acao", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({ _id: testIds.item, status: "DISPONIVEL" });
    itemDoacaoRepository.atualizar.mockResolvedValue({ _id: testIds.item, status: "CANCELADO" });

    await expect(service.cancelarItem(testIds.item, {}, createAdminUser()))
      .resolves.toMatchObject({ status: "CANCELADO" });

    expect(itemDoacaoRepository.atualizar).toHaveBeenCalledWith(testIds.item, { status: "CANCELADO" });
    expect(administracaoRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      tipo_acao: "CANCELAMENTO_ITEM",
      tipo_alvo: "ITEM",
      alvo_model: "ItemDoacao",
    }));
  });

  test("deve resolver denuncia procedente contra item e registrar auditoria", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({ _id: testIds.item });
    itemDoacaoRepository.atualizar.mockResolvedValue({ _id: testIds.item, status: "CANCELADO" });
    denunciaRepository.atualizar.mockResolvedValue({ _id: testIds.denuncia, status: "PROCEDENTE" });

    await expect(service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "PROCEDENTE", respostaAdmin: "Confirmada." },
      createAdminUser()
    )).resolves.toMatchObject({ status: "PROCEDENTE" });

    expect(itemDoacaoRepository.atualizar).toHaveBeenCalledWith(testIds.item, { status: "CANCELADO" });
    expect(denunciaRepository.atualizar).toHaveBeenCalledWith(testIds.denuncia, expect.objectContaining({
      status: "PROCEDENTE",
      admin_id: testIds.admin,
      resposta_admin: "Confirmada.",
      data_analise: expect.any(Date),
    }));
    expect(administracaoRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      tipo_acao: "RESOLUCAO_DENUNCIA",
      tipo_alvo: "DENUNCIA",
      alvo_model: "Denuncia",
      resultado_denuncia: "PROCEDENTE",
    }));
  });

  test("deve resolver denuncia procedente contra usuario e suspender o alvo", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "USUARIO",
      alvo_usuario_id: testIds.usuario,
    });
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });
    usuarioRepository.atualizar.mockResolvedValue({ _id: testIds.usuario, situacao: "SUSPENSO" });
    denunciaRepository.atualizar.mockResolvedValue({ _id: testIds.denuncia, status: "PROCEDENTE" });

    await service.resolverDenuncia(
      testIds.denuncia,
      { resultadoDenuncia: "PROCEDENTE", acaoTomada: "Suspensao confirmada.", suspensaoAte: "2026-07-01" },
      createAdminUser()
    );

    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(testIds.usuario, {
      situacao: "SUSPENSO",
      motivo_suspensao: "Suspensao confirmada.",
      suspensao_ate: "2026-07-01",
    });
  });

  test("deve resolver denuncia improcedente sem alterar o alvo", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
    });
    denunciaRepository.atualizar.mockResolvedValue({ _id: testIds.denuncia, status: "IMPROCEDENTE" });

    await expect(service.resolverDenuncia(
      testIds.denuncia,
      { status: "IMPROCEDENTE" },
      createAdminUser()
    )).resolves.toMatchObject({ status: "IMPROCEDENTE" });

    expect(itemDoacaoRepository.buscarPorId).not.toHaveBeenCalled();
    expect(itemDoacaoRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve rejeitar resolucao de denuncia fora de analise ou com resultado invalido", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({ _id: testIds.denuncia, status: "PROCEDENTE" })
      .mockResolvedValueOnce({ _id: testIds.denuncia, status: "EM_ANALISE" });

    await expect(service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "IMPROCEDENTE" },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "PENDENTE" },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(denunciaRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve retornar 404 para recursos administrativos inexistentes", async () => {
    administracaoRepository.buscarPorIdDetalhado.mockResolvedValue(null);
    usuarioRepository.buscarPorId.mockResolvedValue(null);
    itemDoacaoRepository.buscarPorId.mockResolvedValue(null);
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(null);

    await expect(service.buscarPorId(testIds.administracao, createAdminUser())).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.buscarUsuarioPorId(testIds.usuario, createAdminUser())).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.cancelarItem(testIds.item, {}, createAdminUser())).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.resolverDenuncia(testIds.denuncia, {}, createAdminUser())).rejects.toMatchObject({ statusCode: 404 });
  });

  test("deve rejeitar ator administrativo sem identificador", async () => {
    expect(() => service.getActorId(createAdminUser({ id: undefined })))
      .toThrow(expect.objectContaining({ statusCode: 401 }));
  });
});

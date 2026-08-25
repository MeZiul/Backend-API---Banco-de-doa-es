import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import DenunciaService from "../../services/DenunciaService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("DenunciaService", () => {
  let denunciaRepository;
  let itemDoacaoRepository;
  let usuarioRepository;
  let notificacaoService;
  let service;

  beforeEach(() => {
    denunciaRepository = {
      listar: jest.fn(),
      listarEmAnalise: jest.fn(),
      buscarPorIdDetalhado: jest.fn(),
      buscarEmAnalisePorItemEDenunciante: jest.fn(),
      buscarEmAnalisePorUsuarioEDenunciante: jest.fn(),
      criar: jest.fn(),
      atualizarSeStatus: jest.fn(),
      deletarSeEmAnalise: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
      listarAdministradoresAtivos: jest.fn().mockResolvedValue([]),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
    };

    notificacaoService = {
      criarNotificacoesComSeguranca: jest.fn().mockResolvedValue([]),
    };

    service = new DenunciaService({
      denunciaRepository,
      itemDoacaoRepository,
      usuarioRepository,
      notificacaoService,
    });
  });

  test("Deve restringir a listagem ao denunciante quando o usuário não for administrador", async () => {
    denunciaRepository.listar.mockResolvedValue({ docs: [] });

    await service.listar(
      {
        filtros: {
          status: "EM_ANALISE",
          denuncianteId: "deve-ser-removido",
        },
        page: 3,
        limit: 15,
      },
      createRegularUser({ id: testIds.usuario })
    );

    expect(denunciaRepository.listar).toHaveBeenCalledWith({
      filtros: {
        status: "EM_ANALISE",
        denunciante_id: testIds.usuario,
      },
      page: 3,
      limit: 15,
    });
  });

  test("Deve criar denúncia contra item usando repositories", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockResolvedValue({ _id: testIds.denuncia });
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
    });

    const resultado = await service.criar(
      {
        tipo_alvo: "ITEM",
        alvo_item_id: testIds.item,
        motivo: "FRAUDE",
        descricao: "O item é suspeito.",
      },
      createRegularUser({ id: testIds.usuario })
    );

    expect(itemDoacaoRepository.buscarPorId).toHaveBeenCalledWith(testIds.item);
    expect(denunciaRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        denunciante_id: testIds.usuario,
        tipo_alvo: "ITEM",
        alvo_item_id: testIds.item,
        motivo: "FRAUDE",
        status: "EM_ANALISE",
      })
    );
    expect(resultado).toMatchObject({ status: "EM_ANALISE" });
  });

  test("Deve notificar administradores ativos após criar a denúncia", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    usuarioRepository.listarAdministradoresAtivos.mockResolvedValue([
      { _id: testIds.admin },
    ]);
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockResolvedValue({ _id: testIds.denuncia });
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      tipo_alvo: "ITEM",
      status: "EM_ANALISE",
    });

    await service.criar(
      {
        tipo_alvo: "ITEM",
        alvo_item_id: testIds.item,
        motivo: "FRAUDE",
      },
      createRegularUser({ id: testIds.usuario }),
    );

    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.admin,
        tipo: "SISTEMA",
        referencia_tipo: "DENUNCIA",
        referencia_id: testIds.denuncia,
      }),
    ]);
  });

  test("Falha ao localizar administradores não deve invalidar a denúncia criada", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    usuarioRepository.listarAdministradoresAtivos.mockRejectedValue(
      new Error("consulta de administradores indisponível"),
    );
    itemDoacaoRepository.buscarPorId.mockResolvedValue({ _id: testIds.item });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockResolvedValue({ _id: testIds.denuncia });
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
    });

    await expect(service.criar(
      {
        tipo_alvo: "ITEM",
        alvo_item_id: testIds.item,
        motivo: "FRAUDE",
      },
      createRegularUser(),
    )).resolves.toMatchObject({ status: "EM_ANALISE" });
  });

  test("Deve converter corrida de denúncia duplicada em conflito", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({ _id: testIds.item });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockRejectedValue({ code: 11000 });

    await expect(
      service.criar(
        {
          tipo_alvo: "ITEM",
          alvo_item_id: testIds.item,
          motivo: "FRAUDE",
        },
        createRegularUser({ id: testIds.usuario })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "Já existe uma denúncia em análise para este item.",
    });
  });

  test("Deve atualizar somente denúncia ainda em análise do próprio autor", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
        motivo: "SPAM",
        descricao: null,
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        status: "EM_ANALISE",
        descricao: "Descrição corrigida",
      });
    denunciaRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
    });

    const resultado = await service.atualizar(
      testIds.denuncia,
      { descricao: "Descrição corrigida" },
      createRegularUser({ id: testIds.usuario })
    );

    expect(denunciaRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.denuncia,
      "EM_ANALISE",
      {
        motivo: "SPAM",
        descricao: "Descrição corrigida",
      },
      { denunciante_id: testIds.usuario }
    );
    expect(resultado).toMatchObject({ descricao: "Descrição corrigida" });
  });

  test("Deve rejeitar atualização que perdeu corrida para resolução administrativa", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      denunciante_id: testIds.usuario,
      status: "EM_ANALISE",
      motivo: "SPAM",
    });
    denunciaRepository.atualizarSeStatus.mockResolvedValue(null);

    await expect(
      service.atualizar(
        testIds.denuncia,
        { descricao: "Nova descrição" },
        createRegularUser({ id: testIds.usuario })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "A denúncia não está mais disponível para atualização.",
    });
  });

  test("Deve permitir limpar a descrição opcional da denúncia", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
        motivo: "SPAM",
        descricao: "Descrição anterior",
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        status: "EM_ANALISE",
        descricao: null,
      });
    denunciaRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
    });

    await service.atualizar(
      testIds.denuncia,
      { descricao: null },
      createRegularUser({ id: testIds.usuario })
    );

    expect(denunciaRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.denuncia,
      "EM_ANALISE",
      {
        motivo: "SPAM",
        descricao: null,
      },
      { denunciante_id: testIds.usuario }
    );
  });

  test("Deve remover somente denúncia ainda em análise do próprio autor", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      denunciante_id: testIds.usuario,
      status: "EM_ANALISE",
    });
    denunciaRepository.deletarSeEmAnalise.mockResolvedValue({
      _id: testIds.denuncia,
    });

    await service.deletar(
      testIds.denuncia,
      createRegularUser({ id: testIds.usuario })
    );

    expect(denunciaRepository.deletarSeEmAnalise).toHaveBeenCalledWith(
      testIds.denuncia,
      testIds.usuario
    );
  });

  test("Não deve expor resolução administrativa sem registro de auditoria", () => {
    expect(service.resolver).toBeUndefined();
  });

  test("Deve impedir que o usuário denuncie a própria conta", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce({
        _id: testIds.usuario,
        situacao: "ATIVO",
      })
      .mockResolvedValueOnce({
        _id: testIds.usuario,
        situacao: "ATIVO",
      });

    await expect(
      service.criar(
        {
          tipo_alvo: "USUARIO",
          alvo_usuario_id: testIds.usuario,
          motivo: "SPAM",
        },
        createRegularUser({ id: testIds.usuario, situacao: "ATIVO" })
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "O usuário não pode denunciar a própria conta.",
    });

    expect(denunciaRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve bloquear operação protegida de usuário inativo", async () => {
    await expect(
      service.listar(
        { filtros: {}, page: 1, limit: 15 },
        createRegularUser({ situacao: "INATIVO" })
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Somente usuários ativos podem realizar operações protegidas.",
    });

    expect(denunciaRepository.listar).not.toHaveBeenCalled();
  });

  test("Deve permitir listagens administrativas e consultas autorizadas", async () => {
    denunciaRepository.listar.mockResolvedValue({ docs: ["todas"] });
    denunciaRepository.listarEmAnalise.mockResolvedValue({ docs: ["analise"] });
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      denunciante_id: { _id: testIds.usuario },
      status: "EM_ANALISE",
    });
    const adminPorPapel = createRegularUser({ papeis: ["ADMINISTRADOR"] });

    await expect(service.listarAdmin(
      { filtros: { status: "PROCEDENTE" }, page: "2", limit: "4" },
      adminPorPapel
    )).resolves.toEqual({ docs: ["todas"] });
    await expect(service.listarEmAnalise(
      { page: "3", limit: "5" },
      adminPorPapel
    )).resolves.toEqual({ docs: ["analise"] });
    await expect(service.buscarPorId(testIds.denuncia, createRegularUser()))
      .resolves.toMatchObject({ status: "EM_ANALISE" });
    await expect(service.buscarPorId(testIds.denuncia, createAdminUser()))
      .resolves.toMatchObject({ status: "EM_ANALISE" });

    expect(denunciaRepository.listar).toHaveBeenCalledWith({
      filtros: { status: "PROCEDENTE" },
      page: 2,
      limit: 4,
    });
    expect(denunciaRepository.listarEmAnalise).toHaveBeenCalledWith({
      page: 3,
      limit: 5,
    });
  });

  test("Deve impedir listagens administrativas e consulta de terceiro", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      denunciante_id: { _id: testIds.usuario },
      status: "EM_ANALISE",
    });

    await expect(service.listarAdmin({}, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 403 });
    await expect(service.listarEmAnalise({}, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 403 });
    await expect(service.buscarPorId(
      testIds.denuncia,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  test("Deve criar denuncia contra usuario usando repositories", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.doador, situacao: "ATIVO" });
    denunciaRepository.buscarEmAnalisePorUsuarioEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockResolvedValue({ _id: testIds.denuncia });
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      tipo_alvo: "USUARIO",
      status: "EM_ANALISE",
    });

    await expect(service.criar(
      {
        tipoAlvo: "USUARIO",
        alvoUsuarioId: testIds.doador,
        motivo: "SPAM",
      },
      createRegularUser()
    )).resolves.toMatchObject({ tipo_alvo: "USUARIO" });

    expect(denunciaRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      denunciante_id: testIds.usuario,
      alvo_usuario_id: testIds.doador,
      alvo_item_id: null,
      status: "EM_ANALISE",
    }));
  });

  test("Deve rejeitar alvo invalido, denunciante inativo e recursos inexistentes", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "SUSPENSO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce(null);
    itemDoacaoRepository.buscarPorId.mockResolvedValue(null);

    await expect(service.criar(
      { tipo_alvo: "OUTRO", motivo: "SPAM" },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.criar(
      { tipo_alvo: "ITEM", alvo_item_id: testIds.item, motivo: "SPAM" },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.criar(
      { tipo_alvo: "ITEM", alvo_item_id: testIds.item, motivo: "SPAM" },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.criar(
      { tipo_alvo: "USUARIO", alvo_usuario_id: testIds.doador, motivo: "SPAM" },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 404 });
  });

  test("Deve rejeitar alteracoes sem autoria, em estado final ou perdidas por corrida", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "PROCEDENTE",
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
      });
    denunciaRepository.atualizarSeStatus.mockResolvedValue(null);
    denunciaRepository.deletarSeEmAnalise.mockResolvedValue(null);

    await expect(service.atualizar(
      testIds.denuncia,
      {},
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.atualizar(testIds.denuncia, {}, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(service.atualizar(testIds.denuncia, {}, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(service.deletar(
      testIds.denuncia,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.deletar(testIds.denuncia, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test("Deve rejeitar denuncia inexistente e usuario nao autenticado", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(null);

    await expect(service.buscarPorId(testIds.denuncia, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(service.listar({}, {}))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  test("Deve rejeitar duplicidades detectadas antes da escrita e propagar erro comum", async () => {
    usuarioRepository.buscarPorId.mockImplementation((id) => Promise.resolve({
      _id: id,
      situacao: "ATIVO",
    }));
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });
    denunciaRepository.buscarEmAnalisePorUsuarioEDenunciante.mockResolvedValue({
      _id: testIds.denuncia,
    });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante
      .mockResolvedValueOnce({ _id: testIds.denuncia })
      .mockResolvedValueOnce(null);
    const falha = new Error("banco indisponivel");
    denunciaRepository.criar.mockRejectedValue(falha);

    await expect(service.criar(
      { tipo_alvo: "USUARIO", alvo_usuario_id: testIds.doador, motivo: "SPAM" },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.criar(
      { tipo_alvo: "ITEM", alvo_item_id: testIds.item, motivo: "FRAUDE" },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.criar(
      { tipo_alvo: "ITEM", alvo_item_id: testIds.item, motivo: "FRAUDE" },
      createRegularUser()
    )).rejects.toBe(falha);
  });
});

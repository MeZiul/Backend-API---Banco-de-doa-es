import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import DenunciaService from "../../services/DenunciaService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("DenunciaService", () => {
  let denunciaRepository;
  let usuarioRepository;
  let itemModel;
  let service;

  const denunciaEmAnalise = (overrides = {}) => ({
    _id: testIds.denuncia,
    status: "EM_ANALISE",
    tipo_alvo: "ITEM",
    denunciante_id: { _id: testIds.usuario },
    alvo_item_id: { _id: testIds.item },
    motivo: "FRAUDE",
    descricao: "Descricao original.",
    ...overrides,
  });

  beforeEach(() => {
    denunciaRepository = {
      listar: jest.fn(),
      listarEmAnalise: jest.fn(),
      buscarPorIdDetalhado: jest.fn(),
      buscarEmAnalisePorItemEDenunciante: jest.fn(),
      buscarEmAnalisePorUsuarioEDenunciante: jest.fn(),
      criar: jest.fn(),
      atualizar: jest.fn(),
      deletar: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
    };

    itemModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    service = new DenunciaService({ denunciaRepository, usuarioRepository });
    service.itemModel = itemModel;
  });

  test("deve restringir a listagem do usuario comum ao proprio denunciante", async () => {
    denunciaRepository.listar.mockResolvedValue({ docs: [] });

    await service.listar({
      filtros: { status: "EM_ANALISE", denuncianteId: "remover" },
      page: "3",
      limit: "15",
    }, createRegularUser());

    expect(denunciaRepository.listar).toHaveBeenCalledWith({
      filtros: { status: "EM_ANALISE", denunciante_id: testIds.usuario },
      page: 3,
      limit: 15,
    });
  });

  test("deve permitir listagens administrativas com paginacao normalizada", async () => {
    denunciaRepository.listar.mockResolvedValue({ docs: ["todas"] });
    denunciaRepository.listarEmAnalise.mockResolvedValue({ docs: ["analise"] });
    const adminPorPapel = createRegularUser({ papeis: ["ADMINISTRADOR"] });
    const filtros = { status: "PROCEDENTE", denunciante_id: testIds.usuario };

    await expect(service.listar({ filtros }, createAdminUser())).resolves.toEqual({ docs: ["todas"] });
    await expect(service.listarAdmin({ filtros, page: "2", limit: "4" }, adminPorPapel))
      .resolves.toEqual({ docs: ["todas"] });
    await expect(service.listarEmAnalise({ page: "5", limit: "6" }, adminPorPapel))
      .resolves.toEqual({ docs: ["analise"] });

    expect(denunciaRepository.listar).toHaveBeenNthCalledWith(1, { filtros, page: 1, limit: 15 });
    expect(denunciaRepository.listar).toHaveBeenNthCalledWith(2, { filtros, page: 2, limit: 4 });
    expect(denunciaRepository.listarEmAnalise).toHaveBeenCalledWith({ page: 5, limit: 6 });
  });

  test("deve rejeitar listagem administrativa para usuario comum", async () => {
    await expect(service.listarAdmin({}, createRegularUser())).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.listarEmAnalise({}, createRegularUser())).rejects.toMatchObject({ statusCode: 403 });
    expect(denunciaRepository.listar).not.toHaveBeenCalled();
    expect(denunciaRepository.listarEmAnalise).not.toHaveBeenCalled();
  });

  test("deve permitir consulta ao autor e ao administrador", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(denunciaEmAnalise());

    await expect(service.buscarPorId(testIds.denuncia, createRegularUser()))
      .resolves.toMatchObject({ status: "EM_ANALISE" });
    await expect(service.buscarPorId(testIds.denuncia, createAdminUser()))
      .resolves.toMatchObject({ status: "EM_ANALISE" });
  });

  test("deve rejeitar consulta da denuncia para terceiro", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(denunciaEmAnalise());

    await expect(service.buscarPorId(
      testIds.denuncia,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  test("deve criar denuncia contra item sem duplicidade em analise", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });
    itemModel.findById.mockResolvedValue({ _id: testIds.item, status: "DISPONIVEL" });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockResolvedValue({ _id: testIds.denuncia });
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(denunciaEmAnalise());

    const resultado = await service.criar({
      tipoAlvo: "ITEM",
      alvoItemId: testIds.item,
      motivo: "FRAUDE",
      descricao: "Item suspeito.",
    }, createRegularUser());

    expect(denunciaRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      denunciante_id: testIds.usuario,
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
      alvo_usuario_id: null,
      motivo: "FRAUDE",
      descricao: "Item suspeito.",
      status: "EM_ANALISE",
      data_denuncia: expect.any(Date),
    }));
    expect(resultado).toMatchObject({ status: "EM_ANALISE" });
  });

  test("deve criar denuncia contra usuario sem duplicidade em analise", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.doador, situacao: "ATIVO" });
    denunciaRepository.buscarEmAnalisePorUsuarioEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockResolvedValue({ _id: testIds.denuncia });
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(denunciaEmAnalise({
      tipo_alvo: "USUARIO",
      alvo_item_id: null,
      alvo_usuario_id: { _id: testIds.doador },
    }));

    await expect(service.criar({
      tipo_alvo: "USUARIO",
      alvo_usuario_id: testIds.doador,
      motivo: "COMPORTAMENTO_INADEQUADO",
    }, createRegularUser())).resolves.toMatchObject({ tipo_alvo: "USUARIO" });

    expect(denunciaRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      denunciante_id: testIds.usuario,
      tipo_alvo: "USUARIO",
      alvo_usuario_id: testIds.doador,
      alvo_item_id: null,
      descricao: null,
    }));
  });

  test("deve rejeitar tipo de alvo invalido", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario, situacao: "ATIVO" });

    await expect(service.criar(
      { tipo_alvo: "OUTRO", motivo: "FRAUDE" },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(denunciaRepository.criar).not.toHaveBeenCalled();
  });

  test("deve rejeitar criacao por usuario inexistente ou inativo", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "SUSPENSO" });

    await expect(service.criar(
      { tipo_alvo: "ITEM", alvo_item_id: testIds.item },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.criar(
      { tipo_alvo: "ITEM", alvo_item_id: testIds.item },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  test("deve rejeitar denuncia de item ou usuario inexistente", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce(null);
    itemModel.findById.mockResolvedValue(null);

    await expect(service.criar(
      { tipo_alvo: "ITEM", alvo_item_id: testIds.item },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.criar(
      { tipo_alvo: "USUARIO", alvo_usuario_id: testIds.doador },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 404 });
  });

  test("deve rejeitar denuncias duplicadas em analise", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.doador, situacao: "ATIVO" });
    itemModel.findById.mockResolvedValue({ _id: testIds.item });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante.mockResolvedValue({ _id: testIds.denuncia });
    denunciaRepository.buscarEmAnalisePorUsuarioEDenunciante.mockResolvedValue({ _id: testIds.denuncia });

    await expect(service.criar(
      { tipo_alvo: "ITEM", alvo_item_id: testIds.item },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.criar(
      { tipo_alvo: "USUARIO", alvo_usuario_id: testIds.doador },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 409 });

    expect(denunciaRepository.criar).not.toHaveBeenCalled();
  });

  test("deve atualizar denuncia em analise pelo autor", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(denunciaEmAnalise())
      .mockResolvedValueOnce(denunciaEmAnalise({ motivo: "OUTRO", descricao: "Atualizada." }));
    denunciaRepository.atualizar.mockResolvedValue({ _id: testIds.denuncia });

    await expect(service.atualizar(
      testIds.denuncia,
      { motivo: "OUTRO", descricao: "Atualizada." },
      createRegularUser()
    )).resolves.toMatchObject({ motivo: "OUTRO", descricao: "Atualizada." });

    expect(denunciaRepository.atualizar).toHaveBeenCalledWith(testIds.denuncia, {
      motivo: "OUTRO",
      descricao: "Atualizada.",
    });
  });

  test("deve preservar campos omitidos na atualizacao", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(denunciaEmAnalise())
      .mockResolvedValueOnce(denunciaEmAnalise());
    denunciaRepository.atualizar.mockResolvedValue({ _id: testIds.denuncia });

    await service.atualizar(testIds.denuncia, {}, createRegularUser());

    expect(denunciaRepository.atualizar).toHaveBeenCalledWith(testIds.denuncia, {
      motivo: "FRAUDE",
      descricao: "Descricao original.",
    });
  });

  test("deve rejeitar atualizacao por terceiro ou fora de analise", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(denunciaEmAnalise())
      .mockResolvedValueOnce(denunciaEmAnalise({ status: "PROCEDENTE" }));

    await expect(service.atualizar(
      testIds.denuncia,
      {},
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.atualizar(
      testIds.denuncia,
      {},
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(denunciaRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve remover denuncia em analise pelo autor", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(denunciaEmAnalise());

    await expect(service.deletar(testIds.denuncia, createRegularUser())).resolves.toBeUndefined();
    expect(denunciaRepository.deletar).toHaveBeenCalledWith(testIds.denuncia);
  });

  test("deve rejeitar remocao por terceiro ou fora de analise", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(denunciaEmAnalise())
      .mockResolvedValueOnce(denunciaEmAnalise({ status: "IMPROCEDENTE" }));

    await expect(service.deletar(
      testIds.denuncia,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.deletar(testIds.denuncia, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 400 });

    expect(denunciaRepository.deletar).not.toHaveBeenCalled();
  });

  test("deve resolver denuncia improcedente sem alterar o alvo", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(denunciaEmAnalise())
      .mockResolvedValueOnce(denunciaEmAnalise({ status: "IMPROCEDENTE" }));
    denunciaRepository.atualizar.mockResolvedValue({ _id: testIds.denuncia });

    await expect(service.resolver(
      testIds.denuncia,
      { resultado: "IMPROCEDENTE", respostaAdmin: "Nao confirmada." },
      createAdminUser()
    )).resolves.toMatchObject({ status: "IMPROCEDENTE" });

    expect(itemModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(usuarioRepository.atualizar).not.toHaveBeenCalled();
    expect(denunciaRepository.atualizar).toHaveBeenCalledWith(testIds.denuncia, expect.objectContaining({
      status: "IMPROCEDENTE",
      admin_id: testIds.admin,
      resposta_admin: "Nao confirmada.",
      data_analise: expect.any(Date),
    }));
  });

  test("deve resolver denuncia procedente contra item e cancelar o alvo", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(denunciaEmAnalise())
      .mockResolvedValueOnce(denunciaEmAnalise({ status: "PROCEDENTE" }));
    itemModel.findById.mockResolvedValue({ _id: testIds.item });
    denunciaRepository.atualizar.mockResolvedValue({ _id: testIds.denuncia });

    await service.resolver(
      testIds.denuncia,
      { status: "PROCEDENTE", acao_tomada: "Item cancelado." },
      createAdminUser()
    );

    expect(itemModel.findByIdAndUpdate).toHaveBeenCalledWith(testIds.item, { status: "CANCELADO" });
  });

  test("deve resolver denuncia procedente contra usuario e suspender o alvo", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(denunciaEmAnalise({
        tipo_alvo: "USUARIO",
        alvo_item_id: null,
        alvo_usuario_id: { _id: testIds.doador },
      }))
      .mockResolvedValueOnce(denunciaEmAnalise({ status: "PROCEDENTE" }));
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.doador, situacao: "ATIVO" });
    denunciaRepository.atualizar.mockResolvedValue({ _id: testIds.denuncia });

    await service.resolver(
      testIds.denuncia,
      { status: "PROCEDENTE", acaoTomada: "Suspensao aplicada.", suspensaoAte: "2026-07-01" },
      createAdminUser()
    );

    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(testIds.doador, {
      situacao: "SUSPENSO",
      motivo_suspensao: "Suspensao aplicada.",
      suspensao_ate: "2026-07-01",
    });
  });

  test("deve rejeitar resolucao por usuario comum, fora de analise ou com resultado invalido", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(denunciaEmAnalise({ status: "PROCEDENTE" }))
      .mockResolvedValueOnce(denunciaEmAnalise());

    await expect(service.resolver(
      testIds.denuncia,
      { status: "PROCEDENTE" },
      createRegularUser()
    )).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.resolver(
      testIds.denuncia,
      { status: "PROCEDENTE" },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.resolver(
      testIds.denuncia,
      { status: "PENDENTE" },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(denunciaRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve retornar 404 para denuncia inexistente", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(null);

    await expect(service.buscarPorId(testIds.denuncia, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test("deve rejeitar operacao sem usuario autenticado", async () => {
    await expect(service.listar({}, {})).rejects.toMatchObject({ statusCode: 401 });
    expect(denunciaRepository.listar).not.toHaveBeenCalled();
  });
});

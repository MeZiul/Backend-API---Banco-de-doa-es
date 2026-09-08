import { describe, expect, jest, test } from "@jest/globals";
import AdministracaoRepository from "../../repositories/AdministracaoRepository.js";
import AvaliacaoRepository from "../../repositories/AvaliacaoRepository.js";
import DenunciaRepository from "../../repositories/DenunciaRepository.js";
import InteresseRepository from "../../repositories/InteresseRepository.js";
import ItemDoacaoRepository from "../../repositories/ItemDoacaoRepository.js";
import UsuarioRepository from "../../repositories/UsuarioRepository.js";
import ItemDoacaoFilterBuilder from "../../repositories/filters/ItemDoacaoFilterBuilder.js";
import UsuarioFilterBuilder from "../../repositories/filters/UsuarioFilterBuilder.js";
import {
  administracaoItemDoacaoQuerySchema,
  itemDoacaoQuerySchema,
} from "../../utils/validators/schemas/zod/querys/ItemDoacaoQuerySchema.js";
import {
  AdministracaoUsuarioQuerySchema,
  UsuarioQuerySchema,
} from "../../utils/validators/schemas/zod/querys/UsuarioQuerySchema.js";
import { testIds } from "../test.js";

const dataInicio = "2026-01-01";
const dataFim = "2026-01-31";


describe("Filtros e projeções de Administração, Interesse e Denúncia", () => {
  test("AvaliacaoRepository deve restringir avaliações ao usuário informado", async () => {
    const repository = new AvaliacaoRepository();
    const listarSpy = jest.spyOn(repository, "listarComPaginacao").mockResolvedValue({});

    await repository.listar({
      filtros: { item_id: testIds.item },
      usuarioId: testIds.usuario,
    });

    const [filtro] = listarSpy.mock.calls[0];
    expect(filtro).toEqual({
      item_id: testIds.item,
      $or: [
        { avaliador_id: testIds.usuario },
        { avaliado_id: testIds.usuario },
      ],
    });
  });

  test("AdministracaoRepository deve aplicar builder e projeções explícitas", async () => {
    const repository = new AdministracaoRepository();
    const listarSpy = jest.spyOn(repository, "listarComPaginacao").mockResolvedValue({});

    await repository.listar({
      filtros: {
        administradorId: testIds.admin,
        tipoAcao: "RESOLUCAO_DENUNCIA",
        tipoAlvo: "DENUNCIA",
        alvoId: testIds.denuncia,
        resultadoDenuncia: "PROCEDENTE",
        dataInicio,
        dataFim,
      },
      page: 2,
      limit: 5,
    });

    const [filtro, opcoes] = listarSpy.mock.calls[0];
    expect(filtro).toMatchObject({
      administrador_id: testIds.admin,
      tipo_acao: "RESOLUCAO_DENUNCIA",
      tipo_alvo: "DENUNCIA",
      alvo_id: testIds.denuncia,
      resultado_denuncia: "PROCEDENTE",
      data_acao: {
        $gte: new Date(dataInicio),
        $lte: expect.any(Date),
      },
    });
    expect(opcoes.populate).toEqual([
      expect.objectContaining({ path: "administrador_id", select: expect.any(String) }),
    ]);
    expect(opcoes.include).toEqual(
      expect.objectContaining({
        alvo_usuario: expect.any(Object),
        alvo_item: expect.any(Object),
        alvo_denuncia: expect.any(Object),
      }),
    );
  });

  test("DenunciaRepository deve aplicar todos os filtros e limitar os populates", async () => {
    const repository = new DenunciaRepository();
    const listarSpy = jest.spyOn(repository, "listarComPaginacao").mockResolvedValue({});

    await repository.listar({
      filtros: {
        denuncianteId: testIds.usuario,
        tipoAlvo: "ITEM",
        alvoItemId: testIds.item,
        motivo: "FRAUDE",
        status: "EM_ANALISE",
        adminId: testIds.admin,
        dataInicio,
        dataFim,
      },
    });

    const [filtro, opcoes] = listarSpy.mock.calls[0];
    expect(filtro).toMatchObject({
      denunciante_id: testIds.usuario,
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
      motivo: "FRAUDE",
      status: "EM_ANALISE",
      admin_id: testIds.admin,
      data_denuncia: {
        $gte: new Date(dataInicio),
        $lte: expect.any(Date),
      },
    });
    expect(opcoes.populate.every((populate) => Boolean(populate.select))).toBe(true);
    expect(opcoes.populate.find(({ path }) => path === "alvo_item_id").select)
      .toContain("usuario_id");
  });

  test("InteresseRepository deve projetar item e usuários nas listagens", async () => {
    const repository = new InteresseRepository();
    const listarSpy = jest.spyOn(repository, "listarComPaginacao").mockResolvedValue({});

    await repository.listar({
      filtros: {
        itemId: testIds.item,
        usuarioInteressadoId: testIds.interessado,
        status: "PENDENTE",
        dataInicio,
        dataFim,
      },
    });

    const [filtro, opcoes] = listarSpy.mock.calls[0];
    expect(filtro).toMatchObject({
      item_id: testIds.item,
      usuario_interessado_id: testIds.interessado,
      status: "PENDENTE",
      data_interesse: {
        $gte: new Date(dataInicio),
        $lte: expect.any(Date),
      },
    });
    expect(opcoes.populate.every((populate) => Boolean(populate.select))).toBe(true);
  });

  test("UsuarioRepository deve isolar filtros sensíveis na listagem administrativa", async () => {
    const repository = new UsuarioRepository();
    const listarSpy = jest.spyOn(repository, "listarComPaginacao").mockResolvedValue({});

    await repository.listarParaAdministracao({
      filtros: {
        email: "moderado@email.com",
        cpf: "12345678900",
        perfil: "USUARIO",
        situacao: "SUSPENSO",
        dataInicio,
        dataFim,
      },
    });

    const [filtro, opcoes] = listarSpy.mock.calls[0];
    expect(filtro).toMatchObject({
      email: expect.any(Object),
      cpf: expect.any(Object),
      perfil: "USUARIO",
      situacao: "SUSPENSO",
      data_cadastro: {
        $gte: new Date(dataInicio),
        $lte: expect.any(Date),
      },
    });
    expect(opcoes.select).toContain("media_avaliacoes");
    expect(opcoes.select).not.toContain("cpf");
    expect(opcoes.select).not.toContain("senha");
    expect(opcoes.select).not.toContain("token_redefinicao");

    listarSpy.mockClear();
    await repository.listar({
      filtros: { email: "moderado@email.com", cpf: "12345678900", perfil: "ADMINISTRADOR" },
    });

    expect(listarSpy.mock.calls[0][0]).not.toHaveProperty("email");
    expect(listarSpy.mock.calls[0][0]).not.toHaveProperty("cpf");
    expect(listarSpy.mock.calls[0][0]).not.toHaveProperty("perfil");
  });

  test("ItemDoacaoRepository deve aplicar período e projeção administrativa", async () => {
    const repository = new ItemDoacaoRepository();
    const listarSpy = jest.spyOn(repository, "listarComPaginacao").mockResolvedValue({});

    await repository.listarTodos({
      filtros: {
        usuarioId: testIds.doador,
        categoriaId: testIds.administracao,
        status: "CANCELADO",
        dataInicio,
        dataFim,
      },
    });

    const [filtro, opcoes] = listarSpy.mock.calls[0];
    expect(filtro).toMatchObject({
      usuario_id: testIds.doador,
      categoria_id: testIds.administracao,
      status: "CANCELADO",
      data_cadastro: {
        $gte: new Date(dataInicio),
        $lte: expect.any(Date),
      },
    });
    expect(opcoes.select).toContain("total_interesses");
    expect(opcoes.select).not.toContain("interesse_aceito_id");
  });

  test("Repositories devem limitar os históricos administrativos do usuário no Prisma", async () => {
    const attach = (repository, client) => {
      Object.defineProperty(repository, "client", { value: client, configurable: true });
    };

    const itemRepository = new ItemDoacaoRepository();
    const interesseRepository = new InteresseRepository();
    const avaliacaoRepository = new AvaliacaoRepository();
    const denunciaRepository = new DenunciaRepository();

    const itemFindMany = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const interesseFindMany = jest.fn().mockResolvedValue([]);
    const avaliacaoFindMany = jest.fn().mockResolvedValue([]);
    const denunciaFindMany = jest.fn().mockResolvedValue([]);

    attach(itemRepository, { itemDoacao: { findMany: itemFindMany } });
    attach(interesseRepository, { interesse: { findMany: interesseFindMany } });
    attach(avaliacaoRepository, { avaliacao: { findMany: avaliacaoFindMany } });
    attach(denunciaRepository, { denuncia: { findMany: denunciaFindMany } });

    await itemRepository.listarResumoPorUsuario(testIds.usuario, 10);
    await itemRepository.listarIdsPorUsuario(testIds.usuario);
    await interesseRepository.listarResumoPorUsuario(testIds.usuario, 10);
    await avaliacaoRepository.listarResumoPorUsuario(testIds.usuario, 10);
    await denunciaRepository.listarResumoPorUsuario(testIds.usuario, [testIds.item], 10);

    expect(itemFindMany.mock.calls[0][0]).toMatchObject({
      where: { usuario_id: testIds.usuario },
      take: 10,
      orderBy: { data_cadastro: "desc" },
    });
    expect(itemFindMany.mock.calls[1][0]).toEqual({
      where: { usuario_id: testIds.usuario },
      select: { id: true },
    });
    expect(interesseFindMany.mock.calls[0][0]).toMatchObject({
      where: {
        OR: [
          { usuario_interessado_id: testIds.usuario },
          { usuario_doador_id: testIds.usuario },
        ],
      },
      take: 10,
    });
    expect(avaliacaoFindMany.mock.calls[0][0]).toMatchObject({
      where: {
        OR: [
          { avaliador_id: testIds.usuario },
          { avaliado_id: testIds.usuario },
        ],
      },
      take: 10,
    });
    expect(denunciaFindMany.mock.calls[0][0]).toMatchObject({
      where: {
        OR: [
          { denunciante_id: testIds.usuario },
          { alvo_usuario_id: testIds.usuario },
          { alvo_item_id: { in: [testIds.item] } },
        ],
      },
      take: 10,
    });
  });

  test("Schemas administrativos devem validar período e IDs de entidade", () => {
    expect(AdministracaoUsuarioQuerySchema.parse({ dataInicio, dataFim })).toMatchObject({
      dataInicio,
      dataFim,
    });
    expect(administracaoItemDoacaoQuerySchema.parse({
      usuarioId: testIds.usuario,
      categoriaId: testIds.administracao,
      dataInicio,
      dataFim,
    })).toMatchObject({
      usuarioId: testIds.usuario,
      categoriaId: testIds.administracao,
      dataInicio,
      dataFim,
    });
    expect(() => itemDoacaoQuerySchema.parse({ usuarioId: "invalido" })).toThrow();
    expect(() => AdministracaoUsuarioQuerySchema.parse({ dataInicio: "invalida" })).toThrow();
    expect(UsuarioQuerySchema.parse({ dataInicio })).not.toHaveProperty("dataInicio");
    expect(itemDoacaoQuerySchema.parse({ dataInicio })).not.toHaveProperty("dataInicio");
  });

  test("Builders devem tratar busca textual como texto literal", () => {
    const filtroUsuario = new UsuarioFilterBuilder()
      .comNome("Maria [admin].*")
      .build();
    const filtroItem = new ItemDoacaoFilterBuilder()
      .comBuscaTextual("mesa [grande].*")
      .comCidade("Cuiabá (MT)")
      .build();

    expect(filtroUsuario.nome.$regex).toBe("Maria \\[admin\\]\\.\\*");
    expect(filtroItem.$or[0].titulo.source).toBe("mesa \\[grande\\]\\.\\*");
    expect(filtroItem.cidade.source).toBe("Cuiabá \\(MT\\)");
  });
});

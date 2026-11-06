import { describe, expect, jest, test } from "@jest/globals";
import InteresseRepository from "../../repositories/InteresseRepository.js";
import { testIds } from "../test.js";

function attachClient(repository, client) {
  Object.defineProperty(repository, "client", { value: client, configurable: true });
}

describe("InteresseRepository", () => {
  test("atualiza somente quando o status esperado ainda é atual", async () => {
    const repository = new InteresseRepository();
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findUnique = jest.fn().mockResolvedValue({
      id: testIds.administracao,
      status: "ACEITO",
    });
    const tx = { interesse: { updateMany, findUnique } };
    attachClient(repository, { $transaction: (callback) => callback(tx) });

    const resultado = await repository.atualizarSeStatus(
      testIds.administracao,
      "PENDENTE",
      { status: "ACEITO" },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: testIds.administracao, status: "PENDENTE" },
      data: { status: "ACEITO" },
    });
    expect(resultado).toMatchObject({ _id: testIds.administracao, status: "ACEITO" });
  });

  test("restaura somente recusas produzidas pelo aceite que falhou", async () => {
    const repository = new InteresseRepository();
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    attachClient(repository, { interesse: { updateMany } });
    const dataResposta = new Date();

    const resultado = await repository.restaurarRecusadosDoAceite(
      testIds.item,
      testIds.administracao,
      dataResposta,
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        item_id: testIds.item,
        status: "RECUSADO",
        data_resposta: dataResposta,
        id: { not: testIds.administracao },
      },
      data: { status: "PENDENTE", data_resposta: null },
    });
    expect(resultado.modifiedCount).toBe(2);
  });

  test("lista somente recusas produzidas pelo aceite concluído", async () => {
    const repository = new InteresseRepository();
    const dataResposta = new Date();
    const findMany = jest.fn().mockResolvedValue([]);
    attachClient(repository, { interesse: { findMany } });

    await repository.listarRecusadosDoAceite(
      testIds.item,
      testIds.administracao,
      dataResposta,
    );

    expect(findMany).toHaveBeenCalledWith({
      where: {
        item_id: testIds.item,
        status: "RECUSADO",
        data_resposta: dataResposta,
        id: { not: testIds.administracao },
      },
    });
  });
});

function criarContextoInteresse() {
  const repository = new InteresseRepository()

  const delegate = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn()
  }

  const client = {
    interesse: delegate,
    $transaction: jest.fn(async (callback) =>
      callback({ interesse: delegate })
    )
  }

  attachClient(repository, client)

  return { repository, delegate, client }
}

describe("InteresseRepository - cobertura complementar", () => {

  test("inicializa com delegate e relacionamentos corretos", () => {
    const { repository, delegate } = criarContextoInteresse()

    expect(repository.delegateName).toBe("interesse")
    expect(repository.delegate).toBe(delegate)
    expect(repository.relationMap).toEqual({
      item_id: "item",
      usuario_interessado_id: "usuario_interessado",
      usuario_doador_id: "usuario_doador"
    })
  })

  describe("normalizeData", () => {

    test("remove espaços dos campos textuais", () => {
      const { repository } = criarContextoInteresse()

      expect(repository.normalizeData({
        _id: "ignorar",
        mensagem_interessado: "  Tenho interesse  ",
        resposta_doador: "  Aceito  ",
        status: "PENDENTE"
      })).toEqual({
        mensagem_interessado: "Tenho interesse",
        resposta_doador: "Aceito",
        status: "PENDENTE"
      })
    })

    test("preserva valores não textuais e campos ausentes", () => {
      const { repository } = criarContextoInteresse()

      expect(repository.normalizeData({ mensagem_interessado: null, resposta_doador: 123 })
      ).toEqual({ mensagem_interessado: null, resposta_doador: 123 })

      expect(repository.normalizeData({ status: "PENDENTE" })).toEqual({ status: "PENDENTE" })
    })
  })

  describe("consultas individuais", () => {

    test("busca interesse ativo por item e interessado", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findFirst.mockResolvedValue({ id: "interesse-1", status: "PENDENTE" })

      const resultado = await repository.buscarAtivoPorItemEInteressado("item-1", "usuario-1")

      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: {
          item_id: "item-1",
          usuario_interessado_id: "usuario-1",
          status: { in: ["PENDENTE", "ACEITO"] }
        }
      })

      expect(resultado).toMatchObject({ _id: "interesse-1", status: "PENDENTE" })
    })

    test("busca interesse aceito por item", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findFirst.mockResolvedValue({ id: "interesse-1", status: "ACEITO" })

      const resultado = await repository.buscarAceitoPorItem("item-1")

      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: {
          item_id: "item-1",
          status: "ACEITO"
        }
      })

      expect(resultado).toMatchObject({ _id: "interesse-1", status: "ACEITO" })
    })

    test.each([
      "buscarAtivoPorItemEInteressado",
      "buscarAceitoPorItem"
    ])(
      "%s retorna null quando não encontra interesse", async (metodo) => {
        const { repository, delegate } = criarContextoInteresse()

        delegate.findFirst.mockResolvedValue(null)

        expect(await repository[metodo]("item-1", "usuario-1")).toBeNull()
      }
    )
  })

  describe("buscarPorIdDetalhado", () => {

    test.each([true])("configura telefone=%s nos relacionamentos",
      async (incluirTelefone) => {
        const { repository, delegate } = criarContextoInteresse()

        delegate.findUnique.mockResolvedValue({
          id: "interesse-1",
          status: "ACEITO",
          item: {
            id: "item-1",
            titulo: "Mesa"
          },
          usuario_interessado: {
            id: "usuario-1",
            nome: "Maria"
          },
          usuario_doador: {
            id: "usuario-2",
            nome: "João"
          }
        })

        const resultado = await repository.buscarPorIdDetalhado("interesse-1", { incluirTelefone })

        expect(delegate.findUnique).toHaveBeenCalledWith({
          where: { id: "interesse-1" },
          include: {
            item: {
              select: {
                id: true,
                titulo: true,
                status: true,
                cidade: true,
                uf: true,
                total_interesses: true
              }
            },
            usuario_interessado: {
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: incluirTelefone,
                cidade: true,
                uf: true
              }
            },
            usuario_doador: {
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: incluirTelefone,
                cidade: true,
                uf: true
              }
            }
          }
        })

        expect(resultado).toMatchObject({
          _id: "interesse-1",
          item_id: { _id: "item-1", titulo: "Mesa" },
          usuario_interessado_id: { _id: "usuario-1" },
          usuario_doador_id: { _id: "usuario-2" }
        })
      }
    )

    test("não seleciona telefone por padrão", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findUnique.mockResolvedValue(null)

      const resultado = await repository.buscarPorIdDetalhado("interesse-1")

      expect(resultado).toBeNull()

      const select = delegate.findUnique.mock.calls[0][0].include

      expect(select.usuario_interessado.select.telefone).toBe(false)
      expect(select.usuario_doador.select.telefone).toBe(false)
    })

    test("converte ID numérico para string", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findUnique.mockResolvedValue(null)

      await repository.buscarPorIdDetalhado(123)

      expect(delegate.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "123" } }))
    })
  })

  describe("listagens por item", () => {

    test("lista interesses com dados dos usuários", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findMany.mockResolvedValue([
        {
          id: "interesse-1",
          status: "PENDENTE",
          usuario_interessado: {
            id: "usuario-1",
            nome: "Maria"
          }
        }
      ])

      const resultado = await repository.listarPorItem("item-1")

      expect(delegate.findMany).toHaveBeenCalledWith({
        where: { item_id: "item-1" },
        include: {
          usuario_interessado: {
            select: {
              id: true,
              nome: true,
              email: true,
              cidade: true,
              uf: true
            }
          },
          usuario_doador: {
            select: {
              id: true,
              nome: true,
              email: true,
              cidade: true,
              uf: true
            }
          }
        },
        orderBy: { data_interesse: "desc" }
      })

      expect(resultado).toMatchObject([
        {
          _id: "interesse-1",
          usuario_interessado_id: {
            _id: "usuario-1",
            nome: "Maria"
          }
        }
      ])
    })

    test("lista somente interesses ativos", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findMany.mockResolvedValue([
        { id: "interesse-1", status: "ACEITO" }
      ])

      const resultado = await repository.listarAtivosPorItem("item-1")

      expect(delegate.findMany).toHaveBeenCalledWith({
        where: {
          item_id: "item-1",
          status: { in: ["PENDENTE", "ACEITO"] }
        }
      })

      expect(resultado[0]._id).toBe("interesse-1")
    })

    test("lista recusados produzidos por um aceite", async () => {
      const { repository, delegate } = criarContextoInteresse()
      const dataResposta = new Date("2026-01-10")

      delegate.findMany.mockResolvedValue([
        { id: "interesse-2", status: "RECUSADO" }
      ])

      const resultado = await repository.listarRecusadosDoAceite("item-1", 123, dataResposta)

      expect(delegate.findMany).toHaveBeenCalledWith({
        where: {
          item_id: "item-1",
          status: "RECUSADO",
          data_resposta: dataResposta,
          id: { not: "123" }
        }
      })

      expect(resultado[0]).toMatchObject({ _id: "interesse-2", status: "RECUSADO" })
    })

    test("retorna lista vazia quando não há interesses por item", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findMany.mockResolvedValue([])

      await expect(repository.listarPorItem("item-1")).resolves.toEqual([])
    })
  })

  describe("listarResumoPorUsuario", () => {

    test("retorna resumo sem registros", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findMany.mockResolvedValue([])

      const resultado = await repository.listarResumoPorUsuario("usuario-1")

      expect(delegate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { usuario_interessado_id: "usuario-1" },
            { usuario_doador_id: "usuario-1" }
          ]
        },
        include: {
          item: {
            select: {
              id: true,
              titulo: true,
              status: true
            }
          }
        },
        orderBy: { data_interesse: "desc" },
        take: 10
      })

      expect(resultado).toEqual([])
    })

    test("retorna resumo projetado com limite personalizado", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.findMany.mockResolvedValue([
        {
          id: "interesse-1",
          item_id: "item-1",
          usuario_interessado_id: "usuario-1",
          usuario_doador_id: "usuario-2",
          status: "ACEITO",
          mensagem_interessado: "Campo extra",
          item: {
            id: "item-1",
            titulo: "Mesa"
          }
        }
      ])

      const resultado = await repository.listarResumoPorUsuario("usuario-1", 5)

      expect(delegate.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }))

      expect(resultado).toHaveLength(1)
      expect(resultado[0]).toMatchObject({
        _id: "interesse-1",
        status: "ACEITO",
        item_id: {
          _id: "item-1",
          titulo: "Mesa"
        }
      })

      expect(resultado[0]).not.toHaveProperty("mensagem_interessado")
    })
  })

  describe("atualizarSeStatus", () => {

    test("aceita múltiplos status esperados", async () => {
      const { repository, delegate, client } = criarContextoInteresse()

      delegate.updateMany.mockResolvedValue({ count: 1 })
      delegate.findUnique.mockResolvedValue({
        id: "interesse-1",
        status: "ACEITO"
      })

      const resultado = await repository.atualizarSeStatus(123, ["PENDENTE", "RECUSADO"],
        {
          status: "ACEITO",
          resposta_doador: "  Aprovado  "
        }
      )

      expect(client.$transaction).toHaveBeenCalledTimes(1)

      expect(delegate.updateMany).toHaveBeenCalledWith({
        where: {
          id: "123",
          status: {
            in: ["PENDENTE", "RECUSADO"]
          }
        },
        data: {
          status: "ACEITO",
          resposta_doador: "Aprovado"
        }
      })

      expect(resultado).toMatchObject({
        _id: "interesse-1",
        status: "ACEITO"
      })
    })

    test("retorna null quando nenhuma linha é atualizada", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.updateMany.mockResolvedValue({ count: 0 })

      const resultado = await repository.atualizarSeStatus("interesse-1", "PENDENTE", { status: "ACEITO" })

      expect(resultado).toBeNull()
      expect(delegate.findUnique).not.toHaveBeenCalled()
    })

    test("converte erro de unicidade do Prisma", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.updateMany.mockRejectedValue(Object.assign(new Error("Duplicado"), {
        code: "P2002",
        meta: { target: ["id"] }
      })
      )

      await expect(repository.atualizarSeStatus("interesse-1", "PENDENTE", { status: "ACEITO" })
      ).rejects.toMatchObject({ code: 11000 })
    })

    test("propaga erros comuns da atualização", async () => {
      const { repository, delegate } = criarContextoInteresse()
      const erro = new Error("Falha de atualização")

      delegate.updateMany.mockRejectedValue(erro)

      await expect(repository.atualizarSeStatus("interesse-1", "PENDENTE", { status: "ACEITO" })
      ).rejects.toBe(erro)
    })
  })

  describe("recusarPendentesDoItem", () => {

    test("recusa outros interessados do item", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.updateMany.mockResolvedValue({ count: 3 })

      const resultado = await repository.recusarPendentesDoItem("item-1", 123,
        {
          resposta_doador: "  Não selecionado  ",
          status: "PENDENTE",
        }
      )

      expect(delegate.updateMany).toHaveBeenCalledWith({
        where: {
          item_id: "item-1",
          status: "PENDENTE",
          id: { not: "123" }
        },
        data: {
          resposta_doador: "Não selecionado",
          status: "RECUSADO"
        }
      })

      expect(resultado).toEqual({
        matchedCount: 3,
        modifiedCount: 3
      })
    })

    test("utiliza dados padrão e retorna contadores zerados", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.updateMany.mockResolvedValue({ count: 0 })

      const resultado = await repository.recusarPendentesDoItem("item-1", "interesse-1")

      expect(delegate.updateMany).toHaveBeenCalledWith({
        where: {
          item_id: "item-1",
          status: "PENDENTE",
          id: { not: "interesse-1" }
        },
        data: { status: "RECUSADO" }
      })

      expect(resultado).toEqual({
        matchedCount: 0,
        modifiedCount: 0
      })
    })
  })

  describe("restaurarRecusadosDoAceite", () => {

    test("retorna contadores zerados quando não há recusados", async () => {
      const { repository, delegate } = criarContextoInteresse()

      delegate.updateMany.mockResolvedValue({ count: 0 })

      const resultado = await repository.restaurarRecusadosDoAceite("item-1", "interesse-1", new Date("2026-01-10"))

      expect(resultado).toEqual({ matchedCount: 0, modifiedCount: 0 })
    })
  })

  describe("listar", () => {

    test("utiliza filtros e paginação padrão", () => {
      const { repository } = criarContextoInteresse()

      const listar = jest.spyOn(repository, "listarComPaginacao"
      ).mockReturnValue({ docs: [] })

      const resultado = repository.listar({})

      expect(listar).toHaveBeenCalledWith({}, {
        page: 1,
        limit: 15,
        sort: { data_interesse: -1 },
        populate: [
          {
            path: "item_id",
            select: "titulo status cidade uf total_interesses"
          },
          {
            path: "usuario_interessado_id",
            select: "nome email cidade uf"
          },
          {
            path: "usuario_doador_id",
            select: "nome email cidade uf"
          }
        ]
      })

      expect(resultado).toEqual({ docs: [] })
    })

    test("aplica filtros originais e paginação personalizada", () => {
      const { repository } = criarContextoInteresse()
      const listar = jest.spyOn(repository, "listarComPaginacao"
      ).mockReturnValue({ docs: [] })

      repository.listar({
        filtros: {
          item_id: "item-1",
          usuario_interessado_id: "usuario-1",
          usuario_doador_id: "usuario-2",
          status: "ACEITO"
        },
        page: 2,
        limit: 5
      })

      expect(listar).toHaveBeenCalledWith(
        {
          item_id: "item-1",
          usuario_interessado_id: "usuario-1",
          usuario_doador_id: "usuario-2",
          status: "ACEITO"
        },
        expect.objectContaining({ page: 2, limit: 5 })
      )
    })

    test("aceita nomes alternativos dos filtros", () => {
      const { repository } = criarContextoInteresse()
      const listar = jest.spyOn(repository, "listarComPaginacao"
      ).mockReturnValue({ docs: [] })

      repository.listar({
        filtros: {
          itemId: "item-1",
          usuarioInteressadoId: "usuario-1",
          usuarioDoadorId: "usuario-2"
        }
      })

      expect(listar).toHaveBeenCalledWith(
        {
          item_id: "item-1",
          usuario_interessado_id: "usuario-1",
          usuario_doador_id: "usuario-2"
        },
        expect.any(Object)
      )
    })

    test("aplica período de interesse", () => {
      const { repository } = criarContextoInteresse()

      const listar = jest.spyOn(repository, "listarComPaginacao"
      ).mockReturnValue({ docs: [] })

      const inicio = "2026-01-01T00:00:00"
      const fim = "2026-01-31T00:00:00"
      const fimEsperado = new Date(fim)

      fimEsperado.setHours(23, 59, 59, 999)

      repository.listar({
        filtros: {
          dataInicio: inicio,
          dataFim: fim
        }
      })

      expect(listar).toHaveBeenCalledWith(
        {
          data_interesse: {
            $gte: new Date(inicio),
            $lte: fimEsperado
          }
        },
        expect.any(Object)
      )
    })
  })
})
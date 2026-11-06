import { describe, expect, jest, test } from "@jest/globals";
import DenunciaRepository from "../../repositories/DenunciaRepository.js";
import { testIds } from "../test.js";

function attachClient(repository, client) {
  Object.defineProperty(repository, "client", { value: client, configurable: true });
}

describe("DenunciaRepository - consistência", () => {
  test("atualiza somente quando status e filtros ainda correspondem", async () => {
    const repository = new DenunciaRepository();
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findUnique = jest.fn().mockResolvedValue({
      id: testIds.denuncia,
      status: "PROCEDENTE",
    });
    const tx = { denuncia: { updateMany, findUnique } };
    attachClient(repository, { $transaction: (callback) => callback(tx) });

    const resultado = await repository.atualizarSeStatus(
      testIds.denuncia,
      "EM_ANALISE",
      { status: "PROCEDENTE" },
      { admin_id: null },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: testIds.denuncia,
        status: "EM_ANALISE",
        admin_id: null,
      },
      data: { status: "PROCEDENTE" },
    });
    expect(resultado).toMatchObject({ _id: testIds.denuncia, status: "PROCEDENTE" });
  });

  test("remove somente denúncia em análise do autor informado", async () => {
    const repository = new DenunciaRepository();
    const existing = {
      id: testIds.denuncia,
      denunciante_id: testIds.usuario,
      status: "EM_ANALISE",
    };
    const findFirst = jest.fn().mockResolvedValue(existing);
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = { denuncia: { findFirst, deleteMany } };
    attachClient(repository, { $transaction: (callback) => callback(tx) });

    const resultado = await repository.deletarSeEmAnalise(
      testIds.denuncia,
      testIds.usuario,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
      },
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
      },
    });
    expect(resultado._id).toBe(testIds.denuncia);
  });

  test("não remove denúncia resolvida entre a leitura e a exclusão condicional", async () => {
    const repository = new DenunciaRepository();
    const findFirst = jest.fn().mockResolvedValue({
      id: testIds.denuncia,
      denunciante_id: testIds.usuario,
      status: "EM_ANALISE",
    });
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const tx = { denuncia: { findFirst, deleteMany } };
    attachClient(repository, { $transaction: (callback) => callback(tx) });

    await expect(
      repository.deletarSeEmAnalise(testIds.denuncia, testIds.usuario),
    ).resolves.toBeNull();
  });
});

function criarContextoDenuncia() {
  const repository = new DenunciaRepository()

  const delegate = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn()
  }

  const client = {
    denuncia: delegate,
    $transaction: jest.fn(async (callback) =>
      callback({ denuncia: delegate })
    )
  }

  attachClient(repository, client)

  return { repository, delegate, client }
}

describe("DenunciaRepository - cobertura complementar", () => {

  test("inicializa com o delegate e relacionamentos corretos", () => {
    const { repository, delegate } = criarContextoDenuncia()

    expect(repository.delegateName).toBe("denuncia")
    expect(repository.delegate).toBe(delegate)
    expect(repository.relationMap).toEqual({
      denunciante_id: "denunciante",
      alvo_item_id: "alvo_item",
      alvo_usuario_id: "alvo_usuario",
      admin_id: "admin"
    })
  })

  describe("normalizeData", () => {

    test("remove espaços dos campos textuais", () => {
      const { repository } = criarContextoDenuncia()

      const resultado = repository.normalizeData({
        _id: "ignorar",
        descricao: "  Denúncia de teste  ",
        resposta_admin: "  Resolvida  ",
        acao_tomada: "  Bloqueio  ",
        status: "EM_ANALISE"
      })

      expect(resultado).toEqual({
        descricao: "Denúncia de teste",
        resposta_admin: "Resolvida",
        acao_tomada: "Bloqueio",
        status: "EM_ANALISE"
      })
    })

    test("preserva campos ausentes ou não textuais", () => {
      const { repository } = criarContextoDenuncia()

      const resultado = repository.normalizeData({
        descricao: null,
        resposta_admin: 123,
        status: "EM_ANALISE"
      })

      expect(resultado).toEqual({
        descricao: null,
        resposta_admin: 123,
        status: "EM_ANALISE"
      })
    })
  })

  describe("consultas de denúncias", () => {

    test("busca denúncia em análise por item e denunciante", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.findFirst.mockResolvedValue({
        id: "denuncia-1",
        status: "EM_ANALISE"
      })

      const resultado = await repository.buscarEmAnalisePorItemEDenunciante("usuario-1", "item-1")

      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: {
          denunciante_id: "usuario-1",
          alvo_item_id: "item-1",
          status: "EM_ANALISE",
        },
      })

      expect(resultado).toMatchObject({ _id: "denuncia-1", status: "EM_ANALISE" })
    })

    test("busca denúncia em análise por usuário e denunciante", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.findFirst.mockResolvedValue({ id: "denuncia-2", status: "EM_ANALISE" })

      const resultado = await repository.buscarEmAnalisePorUsuarioEDenunciante("usuario-1", "usuario-2")

      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: {
          denunciante_id: "usuario-1",
          alvo_usuario_id: "usuario-2",
          status: "EM_ANALISE"
        }
      })

      expect(resultado._id).toBe("denuncia-2")
    })

    test("retorna null quando não encontra denúncia em análise", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.findFirst.mockResolvedValue(null)

      await expect(repository.buscarEmAnalisePorItemEDenunciante("usuario-1", "item-1")
      ).resolves.toBeNull()
    })

    test("busca denúncia detalhada com relacionamentos", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.findUnique.mockResolvedValue({
        id: "denuncia-1",
        motivo: "TESTE",
        denunciante: {
          id: "usuario-1",
          nome: "Maria"
        },
        alvo_item: {
          id: "item-1",
          titulo: "Mesa"
        },
        alvo_usuario: null,
        admin: null
      })

      const resultado = await repository.buscarPorIdDetalhado("denuncia-1")

      expect(delegate.findUnique).toHaveBeenCalledWith({
        where: { id: "denuncia-1" },
        include: {
          denunciante: {
            select: {
              id: true,
              nome: true,
              email: true,
              cidade: true,
              uf: true,
              situacao: true
            }
          },
          alvo_item: {
            select: {
              id: true,
              titulo: true,
              status: true,
              cidade: true,
              uf: true,
              usuario_id: true
            }
          },
          alvo_usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              cidade: true,
              uf: true,
              situacao: true
            }
          },
          admin: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          }
        }
      })

      expect(resultado).toMatchObject({
        _id: "denuncia-1",
        motivo: "TESTE",
        denunciante_id: {
          _id: "usuario-1",
          nome: "Maria"
        },
        alvo_item_id: {
          _id: "item-1",
          titulo: "Mesa"
        }
      })
    })

  })

  describe("atualizarSeStatus", () => {

    test("aceita múltiplos status esperados", async () => {
      const { repository, delegate, client } = criarContextoDenuncia()

      delegate.updateMany.mockResolvedValue({ count: 1 })
      delegate.findUnique.mockResolvedValue({ id: "denuncia-1", status: "RESOLVIDA" })

      const resultado = await repository.atualizarSeStatus("denuncia-1",
        ["EM_ANALISE", "PENDENTE"],
        { descricao: "  Atualizada  ", status: "RESOLVIDA" },
        { _id: "denuncia-1" }
      )

      expect(client.$transaction).toHaveBeenCalledTimes(1)

      expect(delegate.updateMany).toHaveBeenCalledWith({
        where: {
          id: "denuncia-1",
          status: {
            in: ["EM_ANALISE", "PENDENTE"]
          }
        },
        data: {
          descricao: "Atualizada",
          status: "RESOLVIDA"
        }
      })

      expect(resultado).toMatchObject({
        _id: "denuncia-1",
        status: "RESOLVIDA"
      })
    })

    test("retorna null quando o status não corresponde", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.updateMany.mockResolvedValue({ count: 0 })

      const resultado = await repository.atualizarSeStatus("denuncia-1", "EM_ANALISE", { status: "RESOLVIDA" })

      expect(resultado).toBeNull()
      expect(delegate.findUnique).not.toHaveBeenCalled()
    })

    test("converte erro de unicidade do Prisma", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.updateMany.mockRejectedValue(
        Object.assign(new Error("Duplicado"), {
          code: "P2002",
          meta: { target: ["id"] }
        })
      )

      await expect(repository.atualizarSeStatus("denuncia-1", "EM_ANALISE", { status: "RESOLVIDA" })
      ).rejects.toMatchObject({ code: 11000 })
    })

    test("propaga erros comuns da atualização", async () => {
      const { repository, delegate } = criarContextoDenuncia()
      const erro = new Error("Falha na atualização")

      delegate.updateMany.mockRejectedValue(erro)

      await expect(repository.atualizarSeStatus("denuncia-1", "EM_ANALISE", { status: "RESOLVIDA" })
      ).rejects.toBe(erro)
    })
  })

  describe("deletarSeEmAnalise", () => {

    test("retorna null quando a denúncia não existe", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.findFirst.mockResolvedValue(null)

      const resultado = await repository.deletarSeEmAnalise("denuncia-1", "usuario-1")

      expect(resultado).toBeNull()
      expect(delegate.deleteMany).not.toHaveBeenCalled()
    })
  })

  describe("listarEmAnalise", () => {

    test("utiliza os valores padrão de paginação", () => {
      const { repository } = criarContextoDenuncia()
      const listar = jest.spyOn(repository, "listar").mockReturnValue({ docs: [] })
      const resultado = repository.listarEmAnalise()

      expect(listar).toHaveBeenCalledWith({
        filtros: { status: "EM_ANALISE" },
        page: 1,
        limit: 15
      })

      expect(resultado).toEqual({ docs: [] })
    })

    test("aceita paginação personalizada", () => {
      const { repository } = criarContextoDenuncia()
      const listar = jest.spyOn(repository, "listar").mockReturnValue({ docs: [] })

      repository.listarEmAnalise({ page: 3, limit: 5 })

      expect(listar).toHaveBeenCalledWith({
        filtros: { status: "EM_ANALISE" },
        page: 3,
        limit: 5
      })
    })
  })

  describe("listarResumoPorUsuario", () => {

    test("lista denúncias sem itens relacionados", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.findMany.mockResolvedValue([])

      const resultado = await repository.listarResumoPorUsuario("usuario-1")

      expect(delegate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { denunciante_id: "usuario-1" },
            { alvo_usuario_id: "usuario-1" }
          ]
        },
        include: {
          alvo_item: {
            select: {
              id: true,
              titulo: true,
              status: true
            }
          }
        },
        orderBy: { data_denuncia: "desc" },
        take: 10
      })

      expect(resultado).toEqual([])
    })

    test("inclui IDs de itens e aplica limite personalizado", async () => {
      const { repository, delegate } = criarContextoDenuncia()

      delegate.findMany.mockResolvedValue([
        {
          id: "denuncia-1",
          denunciante_id: "usuario-1",
          tipo_alvo: "ITEM",
          motivo: "TESTE",
          status: "EM_ANALISE",
          descricao: "Não deve aparecer no resumo",
          alvo_item: {
            id: "item-1",
            titulo: "Mesa",
            status: "DISPONIVEL"
          }
        }
      ])

      const resultado = await repository.listarResumoPorUsuario("usuario-1", ["item-1", "item-2"], 5)

      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { denunciante_id: "usuario-1" },
              { alvo_usuario_id: "usuario-1" },
              { alvo_item_id: { in: ["item-1", "item-2"] } }
            ]
          },
          take: 5
        })
      )

      expect(resultado).toHaveLength(1)
      expect(resultado[0]).toMatchObject({
        _id: "denuncia-1",
        motivo: "TESTE",
        status: "EM_ANALISE"
      })

      expect(resultado[0]).not.toHaveProperty("descricao")
    })
  })

  describe("listar", () => {

    test("utiliza paginação e filtros padrão", () => {
      const { repository } = criarContextoDenuncia()
      const listar = jest.spyOn(repository, "listarComPaginacao").mockReturnValue({ docs: [] })
      const resultado = repository.listar({})

      expect(listar).toHaveBeenCalledWith({}, {
        page: 1,
        limit: 15,
        sort: { data_denuncia: -1 },
        populate: [
          {
            path: "denunciante_id",
            select: "nome email cidade uf situacao"
          },
          {
            path: "alvo_item_id",
            select: "titulo status cidade uf usuario_id"
          },
          {
            path: "alvo_usuario_id",
            select: "nome email cidade uf situacao"
          },
          {
            path: "admin_id",
            select: "nome email",
          }
        ]
      })

      expect(resultado).toEqual({ docs: [] })
    })

    test("aceita filtros com nomes originais", () => {
      const { repository } = criarContextoDenuncia()
      const listar = jest.spyOn(repository, "listarComPaginacao"
      ).mockReturnValue({ docs: [] })

      repository.listar({
        filtros: {
          denunciante_id: "usuario-1",
          tipo_alvo: "ITEM",
          alvo_item_id: "item-1",
          alvo_usuario_id: "usuario-2",
          motivo: "TESTE",
          status: "EM_ANALISE",
          admin_id: "admin-1"
        },
        page: 2,
        limit: 8
      })

      expect(listar).toHaveBeenCalledWith(
        {
          denunciante_id: "usuario-1",
          tipo_alvo: "ITEM",
          alvo_item_id: "item-1",
          alvo_usuario_id: "usuario-2",
          motivo: "TESTE",
          status: "EM_ANALISE",
          admin_id: "admin-1",
        },
        expect.objectContaining({ page: 2, limit: 8 })
      )
    })

    test("aceita nomes alternativos dos filtros", () => {
      const { repository } = criarContextoDenuncia()

      const listar = jest.spyOn(repository, "listarComPaginacao"
      ).mockReturnValue({ docs: [] })

      repository.listar({
        filtros: {
          denuncianteId: "usuario-1",
          tipoAlvo: "USUARIO",
          alvoItemId: "item-1",
          alvoUsuarioId: "usuario-2",
          adminId: "admin-1"
        }
      })

      expect(listar).toHaveBeenCalledWith(
        {
          denunciante_id: "usuario-1",
          tipo_alvo: "USUARIO",
          alvo_item_id: "item-1",
          alvo_usuario_id: "usuario-2",
          admin_id: "admin-1"
        },
        expect.any(Object)
      )
    })

    test("aplica período inicial e final", () => {
      const { repository } = criarContextoDenuncia()
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
          data_denuncia: {
            $gte: new Date(inicio),
            $lte: fimEsperado
          }
        },
        expect.any(Object)
      )
    })
  })
})

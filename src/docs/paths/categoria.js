import commonResponses from "../schemas/swaggerCommonResponses.js";

const categoriasPaths = {
  "/categorias": {
    get: {
      tags: ["Categorias"],
      summary: "Listar categorias",
      description: `Lista as categorias de itens de doação.

Regras de negócio:
- Rota pública, não exige autenticação.
- Pode ser filtrada e paginada.`,
      parameters: [
        {
          name: "nome",
          in: "query",
          schema: { type: "string" },
          description: "Filtrar por nome",
        },
        {
          name: "ativo",
          in: "query",
          schema: { type: "boolean" },
          description: "Filtrar por categorias ativas/inativas",
        },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limite",
          in: "query",
          schema: { type: "integer", default: 15 },
        },
      ],
      responses: {
        200: commonResponses[200]("#/components/schemas/CategoriaPaginado"),
        500: commonResponses[500](),
      },
    },
    post: {
      tags: ["Categorias"],
      summary: "Criar categoria (admin)",
      description: `Cria uma nova categoria de itens de doação.

Regras de negócio:
- A rota exige autenticação e perfil ADMINISTRADOR.
- O nome é obrigatório e deve ser único.`,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CategoriaPost" },
          },
        },
      },
      responses: {
        201: commonResponses[201]("#/components/schemas/CategoriaResponse"),
        400: commonResponses[400](),
        403: commonResponses[403](),
        409: commonResponses[409](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  "/categorias/{id}": {
    get: {
      tags: ["Categorias"],
      summary: "Consultar categoria por ID",
      description: `Retorna uma categoria específica.

Regras de negócio:
- Rota pública, não exige autenticação.
- Caso a categoria não exista, retorna erro apropriado.`,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: commonResponses[200]("#/components/schemas/CategoriaResponse"),
        404: commonResponses[404](),
        500: commonResponses[500](),
      },
    },
    put: {
      tags: ["Categorias"],
      summary: "Atualizar categoria (admin)",
      description: `Atualiza os dados de uma categoria.

Regras de negócio:
- A rota exige autenticação e perfil ADMINISTRADOR.
- Se o nome for alterado, ele deve continuar único.
- Caso a categoria não exista, retorna erro apropriado.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CategoriaPutPatch" },
          },
        },
      },
      responses: {
        200: commonResponses[200]("#/components/schemas/CategoriaResponse"),
        400: commonResponses[400](),
        403: commonResponses[403](),
        404: commonResponses[404](),
        409: commonResponses[409](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    delete: {
      tags: ["Categorias"],
      summary: "Remover categoria (admin)",
      description: `Remove uma categoria.

Regras de negócio:
- A rota exige autenticação e perfil ADMINISTRADOR.
- Caso a categoria não exista, retorna erro apropriado.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: commonResponses[204](null, "Categoria removida com sucesso"),
        403: commonResponses[403](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
};

export default categoriasPaths;

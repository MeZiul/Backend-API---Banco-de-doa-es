const paginatedSchema = (schemaRef) => ({
  type: "object",
  properties: {
    docs: {
      type: "array",
      items: { $ref: schemaRef },
    },
    totalDocs: { type: "integer", example: 1 },
    limit: { type: "integer", example: 15 },
    totalPages: { type: "integer", example: 1 },
    page: { type: "integer", example: 1 },
    pagingCounter: { type: "integer", example: 1 },
    hasPrevPage: { type: "boolean", example: false },
    hasNextPage: { type: "boolean", example: false },
    prevPage: { type: "integer", nullable: true, example: null },
    nextPage: { type: "integer", nullable: true, example: null },
  },
});

const categoriasSchemas = {
  CategoriaResponse: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439030" },
      nome: { type: "string", example: "Móveis" },
      descricao: {
        type: "string",
        nullable: true,
        example: "Itens de mobiliário em geral.",
      },
      icone: { type: "string", nullable: true, example: "sofa" },
      ativo: { type: "boolean", example: true },
      ordem: { type: "integer", example: 0 },
      data_cadastro: { type: "string", format: "date-time" },
      data_atualizacao: { type: "string", format: "date-time" },
    },
  },
  CategoriaPost: {
    type: "object",
    required: ["nome"],
    properties: {
      nome: { type: "string", minLength: 2, example: "Móveis" },
      descricao: {
        type: "string",
        nullable: true,
        example: "Itens de mobiliário em geral.",
      },
      icone: { type: "string", nullable: true, example: "sofa" },
      ativo: { type: "boolean", default: true, example: true },
      ordem: { type: "integer", minimum: 0, default: 0, example: 0 },
    },
  },
  CategoriaPutPatch: {
    type: "object",
    description: "Todos os campos são opcionais na atualização.",
    properties: {
      nome: { type: "string", minLength: 2, example: "Eletrodomésticos" },
      descricao: {
        type: "string",
        nullable: true,
        example: "Geladeiras, fogões e similares.",
      },
      icone: { type: "string", nullable: true, example: "fridge" },
      ativo: { type: "boolean", example: true },
      ordem: { type: "integer", minimum: 0, example: 1 },
    },
  },
  CategoriaPaginado: paginatedSchema("#/components/schemas/CategoriaResponse"),
};

export default categoriasSchemas;

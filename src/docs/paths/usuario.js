import commonResponses from "../schemas/swaggerCommonResponses.js";

const usuariosPaths = {
  "/usuario": {
    post: {
      tags: ["Usuários"],
      summary: "Cadastrar novo usuário",
      description: `Cria uma nova conta de usuário na plataforma.

Regras de negócio:
- Rota pública, não exige autenticação.
- O email deve ser único.
- O CPF deve ser único.
- A senha deve conter no mínimo 8 caracteres, com 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.
- Todo usuário é criado com perfil USUARIO e situação ATIVO.
- A senha nunca é retornada na resposta.`,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UsuarioPost" },
          },
        },
      },
      responses: {
        201: commonResponses[201]("#/components/schemas/UsuarioCompleto"),
        400: commonResponses[400](),
        409: commonResponses[409](),
        500: commonResponses[500](),
      },
    },
    get: {
      tags: ["Usuários"],
      summary: "Listar usuários",
      description: `Lista os usuários cadastrados, com paginação e filtros.

Regras de negócio:
- A rota exige autenticação.
- Administradores recebem todos os campos de cada usuário.
- Usuários comuns recebem uma versão limitada sem os campos (senha, email, CPF e telefone).
- Pode ser filtrada por nome, cidade, UF e situação.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "nome",
          in: "query",
          schema: { type: "string" },
          description: "Filtrar por nome",
        },
        { name: "cidade", in: "query", schema: { type: "string" } },
        { name: "uf", in: "query", schema: { type: "string" } },
        {
          name: "situacao",
          in: "query",
          schema: { type: "string", enum: ["ATIVO", "SUSPENSO", "INATIVO"] },
        },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limite",
          in: "query",
          schema: { type: "integer", default: 15 },
        },
      ],
      responses: {
        200: commonResponses[200]("#/components/schemas/UsuarioPaginado"),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  "/usuario/{id}": {
    get: {
      tags: ["Usuários"],
      summary: "Consultar usuário por ID",
      description: `Retorna os dados de um usuário específico.

Regras de negócio:
- A rota exige autenticação.
- Administradores e o próprio usuário recebem todos os campos.
- Outros usuários recebem uma versão limitada sem os campos ( senha, email, CPF e telefone).
- Caso o usuário não exista, retorna erro apropriado.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    put: {
      tags: ["Usuários"],
      summary: "Atualizar usuário (completo)",
      description: `Atualiza os dados de um usuário.

Regras de negócio:
- A rota exige autenticação.
- Apenas o próprio usuário ou um administrador pode atualizar a conta.
- CPF, perfil e situação não podem ser alterados por esta rota.
- Se o email for alterado, ele deve continuar único.
- A senha nunca é retornada na resposta.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UsuarioPutPatch" },
          },
        },
      },
      responses: {
        200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
        400: commonResponses[400](),
        403: commonResponses[403](),
        404: commonResponses[404](),
        409: commonResponses[409](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    patch: {
      tags: ["Usuários"],
      summary: "Atualizar usuário (parcial)",
      description: `Atualiza parcialmente os dados de um usuário.

Regras de negócio:
- A rota exige autenticação.
- Apenas o próprio usuário ou um administrador pode atualizar a conta.
- CPF, perfil e situação não podem ser alterados por esta rota.
- Se o email for alterado, ele deve continuar único.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UsuarioPutPatch" },
          },
        },
      },
      responses: {
        200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
        400: commonResponses[400](),
        403: commonResponses[403](),
        404: commonResponses[404](),
        409: commonResponses[409](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
    delete: {
      tags: ["Usuários"],
      summary: "Excluir conta (exclusão lógica)",
      description: `Inativa a conta do usuário (exclusão lógica) após confirmar a senha.

Regras de negócio:
- A rota exige autenticação.
- Apenas o próprio usuário ou um administrador pode excluir a conta.
- É necessário informar a senha correta no corpo da requisição.
- O usuário não pode ter doações em andamento.
- A conta não é apagada: a situação passa para INATIVO e os dados são anonimizados.
- Os itens disponíveis do usuário são cancelados.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UsuarioExcluir" },
          },
        },
      },
      responses: {
        204: commonResponses[204](null, "Conta excluída com sucesso"),
        400: commonResponses[400](),
        401: commonResponses[401](),
        403: commonResponses[403](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  "/usuario/{id}/itens": {
    get: {
      tags: ["Usuários"],
      summary: "Listar itens de doação do usuário",
      description: `Retorna os itens de doação cadastrados por um usuário específico.

Regras de negócio:
- A rota exige autenticação.
- Caso o usuário não exista, retorna erro apropriado.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: commonResponses[200](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  "/usuario/{id}/avaliacoes": {
    get: {
      tags: ["Usuários"],
      summary: "Listar avaliações recebidas pelo usuário",
      description: `Retorna as avaliações que um usuário recebeu (onde ele é o avaliado).

Regras de negócio:
- A rota exige autenticação.
- Caso o usuário não exista, retorna erro apropriado.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: commonResponses[200](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  "/usuario/{id}/suspender": {
    patch: {
      tags: ["Usuários"],
      summary: "Suspender usuário (admin)",
      description: `Suspende a conta de um usuário.

Regras de negócio:
- A rota exige autenticação e perfil ADMINISTRADOR.
- Motivo e data de suspensão são obrigatórios.
- Não é possível suspender uma conta INATIVA.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UsuarioSuspender" },
          },
        },
      },
      responses: {
        200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
        400: commonResponses[400](),
        403: commonResponses[403](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
  "/usuario/{id}/reativar": {
    patch: {
      tags: ["Usuários"],
      summary: "Reativar usuário (admin)",
      description: `Reativa a conta de um usuário suspenso.

Regras de negócio:
- A rota exige autenticação e perfil ADMINISTRADOR.
- Apenas usuários com situação SUSPENSO podem ser reativados.`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
        400: commonResponses[400](),
        403: commonResponses[403](),
        404: commonResponses[404](),
        498: commonResponses[498](),
        500: commonResponses[500](),
      },
    },
  },
};

export default usuariosPaths;

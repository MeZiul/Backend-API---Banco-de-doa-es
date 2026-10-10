import { zodToJsonSchema } from "zod-to-json-schema";
import { UsuarioSchema, UsuarioUpdateSchema, UsuarioLoginSchema, UsuarioEsqueciSenhaSchema, UsuarioRedefinirSenhaSchema, UsuarioExcluirSchema, UsuarioSuspenderSchema, UsuarioResponseSchema } from "../../utils/validators/schemas/zod/UsuarioSchema.js";
import { itemDoacaoSchema, ItemDoacaoResponseSchema } from "../../utils/validators/schemas/zod/ItemDoacaoSchema.js";
import { CategoriaSchema, CategoriaUpdateSchema, CategoriaResponseSchema } from "../../utils/validators/schemas/zod/CategoriaSchema.js";
import { AvaliacaoSchema, AvaliacaoUpdateSchema } from "../../utils/validators/schemas/zod/AvaliacaoSchema.js";
import { InteresseSchema, InteresseRespostaSchema } from "../../utils/validators/schemas/zod/InteresseSchema.js";
import { DenunciaSchema, DenunciaUpdateSchema } from "../../utils/validators/schemas/zod/DenunciaSchema.js";
import { AdministracaoAcaoSchema, AdministracaoBloquearUsuarioSchema, AdministracaoResolverDenunciaSchema } from "../../utils/validators/schemas/zod/AdministracaoSchema.js";
import { atualizarPerfilSchema, gerenciarPerfilSchema } from "../../utils/validators/schemas/zod/GerenciarPerfilSchema.js";
import { NotificacaoResponseSchema } from "../../utils/validators/schemas/zod/NotificacaoSchema.js";
import { cancelarItemSchema } from "../../utils/validators/schemas/zod/CancelarItemSchema.js";

const input = (validator, description, strict = false, extra = {}) => ({
  ...zodToJsonSchema(validator, { target: "openApi3", $refStrategy: "none", effectStrategy: "input" }),
  // Zod strip accepts unknown keys and discards them; strict rejects them.
  additionalProperties: !strict,
  description: `${description} ${strict ? "Campos desconhecidos são rejeitados." : "Campos desconhecidos são ignorados pelo validator; não concedem novos campos editáveis."}`,
  ...extra,
});
const response = (validator) => ({
  ...zodToJsonSchema(validator, { target: "openApi3", $refStrategy: "none" }), readOnly: true,
});

export default {
  UsuarioPost: input(UsuarioSchema, "Cadastro: CPF com dígitos verificadores e unicidade são também validados pelo serviço. A senha exige maiúscula, minúscula, número e especial @$!%*?&; limite de 128 caracteres no Better Auth.", true),
  UsuarioPutPatch: input(UsuarioUpdateSchema, "Atualização pelo próprio usuário. CPF, perfil, situação e contadores não são editáveis por esta rota.", true),
  UsuarioExcluir: input(UsuarioExcluirSchema, "Senha atual do próprio usuário para confirmação da exclusão."),
  UsuarioSuspender: input(UsuarioSuspenderSchema, "Motivo e data de suspensão obrigatórios; acesso administrativo."),
  UsuarioCompleto: response(UsuarioResponseSchema),
  AuthUsuarioResumo: response(UsuarioResponseSchema),
  AuthLoginRequest: input(UsuarioLoginSchema, "E-mail e senha de conta ativa."),
  AuthEsqueciSenhaRequest: input(UsuarioEsqueciSenhaSchema, "Resposta genérica; não confirma existência da conta."),
  AuthRedefinirSenhaRequest: input(UsuarioRedefinirSenhaSchema, "Token temporário de uso único. A senha exige maiúscula, minúscula, número e especial @$!%*?&; limite de 128 caracteres no Better Auth."),
  ItemDoacaoPost: input(itemDoacaoSchema, "Doador e status são definidos pelo servidor; cidade e UF usam o cadastro quando omitidos."),
  ItemDoacaoPut: input(itemDoacaoSchema.partial(), "Edição do proprietário somente enquanto DISPONIVEL. Campos de estado, doador e reserva não são editáveis."),
  ItemDoacaoEscritaResposta: response(ItemDoacaoResponseSchema),
  ItemDoacaoCancelar: input(cancelarItemSchema, "Cancelamento pelo proprietário ou administrador; o motivo tem no mínimo 10 caracteres."),
  CategoriaPost: input(CategoriaSchema, "Categoria criada por administrador; nome único."),
  CategoriaPutPatch: input(CategoriaUpdateSchema, "Categoria alterada por administrador."),
  CategoriaResponse: response(CategoriaResponseSchema),
  AvaliacaoPost: input(AvaliacaoSchema, "Doação concluída e participante correspondente ao tipo; prazo de criação de 30 dias e uma avaliação por participante/item. Comentário não aceita null na criação.", true),
  AvaliacaoPutPatch: input(AvaliacaoUpdateSchema, "Somente autor. Envie nota ou comentário; relações e autoria não são editáveis. COUNT/AVG são recalculados atomicamente.", true, { minProperties: 1 }),
  InteressePost: input(InteresseSchema, "item_id ou alias itemId obrigatório; mensagens não podem ser vazias. Somente usuário ativo, que não é o próprio doador.", false, { anyOf: [{ required: ["item_id"] }, { required: ["itemId"] }] }),
  InteresseRespostaDoador: input(InteresseRespostaSchema, "Somente doador do item. resposta_doador, respostaDoador e mensagemResposta são aliases; mensagem não pode ser vazia."),
  DenunciaPost: input(DenunciaSchema, "tipo_alvo (ou tipoAlvo) é obrigatório. ITEM exige alvo_item_id ou alvoItemId; USUARIO exige alvo_usuario_id ou alvoUsuarioId. Não aceita alvo null."),
  DenunciaPutPatch: input(DenunciaUpdateSchema, "Somente autor, enquanto EM_ANALISE; envie motivo ou descrição."),
  AdministracaoBloqueioBody: input(AdministracaoBloquearUsuarioSchema, "justificativa não vazia obrigatória para bloqueio; até 1000 caracteres; suspensao_ate ISO 8601 com timezone.", false, { required: ["justificativa"] }),
  AdministracaoAcaoBody: input(AdministracaoAcaoSchema, "Aliases de campos administrativos são normalizados; textos informados não podem ser vazios."),
  AdministracaoResolverDenunciaBody: input(AdministracaoResolverDenunciaSchema, "Resultado PROCEDENTE ou IMPROCEDENTE obrigatório; aliases resultado_denuncia, resultadoDenuncia, resultado e status aceitos."),
  PerfilAtualizarRequisicao: input(atualizarPerfilSchema, "Somente próprio perfil; envie ao menos um campo. CPF, senha, perfil, situação e contadores não são editáveis.", true, { minProperties: 1 }),
  PerfilGerenciarRequisicao: input(gerenciarPerfilSchema, "Somente administrador ativo; envie perfil ou situação. Middleware impede autoescalada/alteração de outros administradores."),
  NotificacaoDetalhes: response(NotificacaoResponseSchema),
};

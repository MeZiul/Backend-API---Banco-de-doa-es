import InteresseService from "./InteresseService.js";
import  { CustomError, messages} from "../utils/helpers/index.js";
import ItemDoacaoRepository from "../repositories/ItemDoacaoRepository.js";

class ItemDoacaoService {
    constructor({itemDoacaoRepository}) {
        this.repository = itemDoacaoRepository;
    }

    async criar(dadosItem, usuarioAutenticado) {
        if (usuarioAutenticado.situacao !== "ATIVO") {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas usuários com situação ATIVO podem cadastrar itens.",
            });
        }

        if (!dadosItem.titulo || !dadosItem.descricao || !dadosItem.categoria_id || !dadosItem.condicao_item) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Título, descrição, categoria e condição do item são obrigatórios."
            });
        }

        const cidade = dadosItem.cidade || usuarioAutenticado.cidade;
        const uf = dadosItem.uf || usuarioAutenticado.uf;

        const novoItem = {
            ...dadosItem,
            cidade,
            uf,
            usuario_id: usuarioAutenticado.id,
            status: "DISPONIVEL",
            visualizacoes: 0,
            total_interesses: 0
        };

        return await ItemDoacaoRepository.criar(novoItem);
    }

    async atualizar(id, dadosAtualizacao, usuarioAutenticadoId) {
        const item = await ItemDoacaoRepository.buscarPorId(id);
        if (!item) throw new CustomError({
            statusCode: 404,
            customMessage: "Item não encontrado."
        });

        if (item.usuario_id.toString() !== usuarioAutenticadoId) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Você não tem permissão para editar este item."
            });
        }

        if (item.status !== "DISPONIVEL") {
            throw new CustomError({
                statusCode: 400,
                customMessage: `Edição bloqueada. O status atual do item é ${item.status}.`
        });
        }

        delete dadosAtualizacao.status;
        delete dadosAtualizacao.usuario_id;
        delete dadosAtualizacao.interesse_aceito_id;

        return await ItemDoacaoRepository.atualizar(id, dadosAtualizacao);
    }

    async excluir(id, usuarioAutenticadoId) {
        const item = await ItemDoacaoRepository.buscarPorId(id);
        if (!item) throw new CustomError({
            statusCode: 404,
            customMessage:"Item não encontrado."});

        if (item.usuario_id.toString() !== usuarioAutenticadoId) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Você não tem permissão para excluir este item."});
        }

        if (item.status === "RESERVADO" || item.status === "AGUARDANDO_CONFIRMACAO") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Não é possível excluir um item que está em processo de doação " +
                    "(Reservado ou Aguardando Confirmação)."
            });
        }

        return await ItemDoacaoRepository.atualizar(id, { status: "CANCELADO" });
    }

    async aceitarInteresse(idItem, idInteresse, usuarioAutenticadoId) {
        const item = await ItemDoacaoRepository.buscarPorId(idItem);
        if (!item) throw new CustomError({
            statusCode: 404,
            customMessage: "Item não encontrado."});

        if (item.usuario_id.toString() !== usuarioAutenticadoId) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas o doador pode aceitar um interesse."});
        }

        if (item.status !== "DISPONIVEL") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "O item não está mais disponível para reserva."});
        }

        return await ItemDoacaoRepository.atualizar(idItem, {
            status: "RESERVADO",
            interesse_aceito_id: idInteresse
        });
    }

    async cancelarReserva(idItem, usuarioAutenticadoId) {
        const item = await ItemDoacaoRepository.buscarPorId(idItem);
        if (!item) throw new Error("Item não encontrado.");

        if (item.usuario_id.toString() !== usuarioAutenticadoId) {
            throw new Error("Apenas o doador pode cancelar esta reserva.");
        }

        if (item.status !== "RESERVADO") {
            throw new Error("Apenas itens reservados podem ter a reserva cancelada.");
        }

        return await ItemDoacaoRepository.atualizar(idItem, {
            status: "DISPONIVEL",
            interesse_aceito_id: null // Limpa o interesse aceito
        });
    }

    async marcarComoEntregue(idItem, usuarioAutenticadoId) {
        const item = await ItemDoacaoRepository.buscarPorId(idItem);
        if (!item) throw new CustomError({
            statusCode: 400,
            customMessage: "Item não encontrado."
        });

        if (item.usuario_id.toString() !== usuarioAutenticadoId) {
            throw new CustomError({
                statusCode: 403,
                customMessage: "Apenas o doador pode marcar o item como entregue."
            });
        }

        if (item.status !== "RESERVADO") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "O item precisa estar reservado para ser marcado como entregue."
            });
        }

        return await ItemDoacaoRepository.atualizar(idItem, {
            status: "AGUARDANDO_CONFIRMACAO"
        });
    }

    async confirmarRecebimento(idItem, interessadoAutenticadoId) {
        const item = await ItemDoacaoRepository.buscarPorId(idItem);
        if (!item) throw new CustomError({
            statusCode: 404,
            customMessage: "Item não encontrado."
        });

        if (item.status !== "AGUARDANDO_CONFIRMACAO") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "Este item não está aguardando confirmação de recebimento."
            });
        }


        return await ItemDoacaoRepository.atualizar(idItem, {
            status: "DOADO",
            data_doacao: new Date() // Registra o momento exato do sucesso
        });
    }
}

export default new ItemDoacaoService();
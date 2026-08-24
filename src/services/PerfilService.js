import PerfilRepository from "../repositories/PerfilRepository.js";
import { CustomError } from "../utils/helpers/index.js";

class PerfilService {
    constructor(repository) {
        this.repository = repository;
    }

    alterarAcessoUsuario = async (usuarioId, dadosControle) => {
        if (!dadosControle.perfil && !dadosControle.situacao) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "É necessário informar o novo 'perfil' ou a nova 'situacao' para atualização."
            });
        }


        const usuarioAtualizado = await this.repository.atualizar(usuarioId, dadosControle);

        if (!usuarioAtualizado) {
            throw new CustomError({
                statusCode: 404,
                customMessage: "Usuário alvo não encontrado."
            });
        }

        return usuarioAtualizado;
    }

    buscarPerfil = async (usuarioId) => {
        const usuario = await this.repository.buscarPorId(usuarioId);

        if (!usuario) {
            throw new CustomError({
                statusCode: 404,
                customMessage: "Usuário não encontrado.",
            });
        }

        return usuario;
    }

    atualizarPerfil = async (usuarioId, dados) => {
        await this.buscarPerfil(usuarioId);

        if (dados.email) {
            const usuarioComEmail = await this.repository.buscarPorEmail(dados.email);
            if (usuarioComEmail && usuarioComEmail._id.toString() !== usuarioId) {
                throw new CustomError({
                    statusCode: 409,
                    customMessage: "Este e-mail já está em uso.",
                });
            }
        }

        return this.repository.atualizar(usuarioId, dados);
    }

    desativarPerfil = async (usuarioId) => {
        const usuario = await this.buscarPerfil(usuarioId);

        if (usuario.situacao === "INATIVO") {
            throw new CustomError({
                statusCode: 400,
                customMessage: "A conta já está inativa.",
            });
        }

        await this.repository.atualizar(usuarioId, { situacao: "INATIVO" });
        return { message: "Conta desativada com sucesso." };
    }

}
export default new PerfilService(PerfilRepository);

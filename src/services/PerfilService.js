import PerfilRepository from "../repositories/PerfilRepository";
import { CustomError } from "../utils/helpers/index.js";
import usuario from "../models/Usuario.js";

class PerfilService {
    constructor(repository) {
        this.repository = repository;
    }

    alterarAcessoUsuario = async (usuarioId, dadosControle) => {
        if (!dadosControle.perfil && !dadosControle.situacao) {
            throw new CustomError({
                statusCode: 400,
                customMessage: "É necessário informar o novo 'perfil' ou a nova 'situação' para atualização."
            });

        }
        const usuarioAtualizado = await this.repository.atualizarControleAcesso(usuarioId, dadosControle);

        if (!usuarioAtualizdo) {
            throw new CustomError({
                statusCode: 404,
                customMessage: "Usuário alvo não encontrado"
            });
        }
        return usuarioAtualizado;
    }

}
export default new PerfilService(PerfilRepository);
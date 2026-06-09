import PerfilRepository from "../repositories/PerfilRepository.js";
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
                customMessage: "É necessário informar o novo 'perfil' ou a nova 'situacao' para atualização."
            });
        }

        // CORREÇÃO AQUI: Mudamos de 'atualizarControleAcesso' para 'atualizar'
        // que é o método padrão herdado do seu BaseRepository
        const usuarioAtualizado = await this.repository.atualizar(usuarioId, dadosControle);

        if (!usuarioAtualizado) {
            throw new CustomError({
                statusCode: 404,
                customMessage: "Usuário alvo não encontrado."
            });
        }

        return usuarioAtualizado;
    }

}
export default new PerfilService(PerfilRepository);
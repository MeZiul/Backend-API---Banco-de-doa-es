import CustomError from "./CustomError.js";

// Verifica se o usuário possui perfil de administrador.
export function isAdmin(usuario) {
    const papeis = Array.isArray(usuario?.papeis) ? usuario.papeis : [];

    return usuario?.perfil === "ADMINISTRADOR" || papeis.includes("ADMINISTRADOR");
}

//Impede operações protegidas de usuários não ativos.
export function ensureActorAtivo(usuario) {
    if (usuario?.situacao && usuario.situacao !== "ATIVO") {
        throw new CustomError({
            statusCode: 403,
            customMessage: "Somente usuários ativos podem realizar operações protegidas.",
        });
    }
}

//Verifica se o usuário possui permissão administrativa.
export function ensureAdmin(usuario) {
    ensureActorAtivo(usuario);

    if (!isAdmin(usuario)) {
        throw new CustomError({
            statusCode: 403,
            customMessage: "Apenas administradores podem realizar esta operação.",
        });
    }
}
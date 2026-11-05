import CustomError from "./CustomError.js";

export function getEntityId(entidade) {
    const entityId = entidade?._id ?? entidade;
    return entityId?.toString?.() ?? entityId;
}

export function getActorId(usuario) {
    const actorId = usuario?.id || usuario?._id;

    if (!actorId) {
        throw new CustomError({
            statusCode: 401,
            customMessage: "Usuário autenticado não informado.",
        });
    }

    return getEntityId(actorId);
}
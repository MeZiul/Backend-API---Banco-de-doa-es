// src/constants/roles.js

export const PERFIS = Object.freeze({
    ADMINISTRADOR: 'ADMINISTRADOR',
    USUARIO: 'USUARIO',
});

// Mantem compatibilidade com middlewares no padrao do professor.
export const ROLES = Object.freeze({
    ...PERFIS,
    ADMIN_PLATAFORMA: PERFIS.ADMINISTRADOR,
    ADMIN_INSTITUICAO: PERFIS.ADMINISTRADOR,
    OPERADOR: PERFIS.ADMINISTRADOR,
    USUARIO_FINAL: PERFIS.USUARIO,
});

export const PAPEIS_ENUM = Object.freeze(Object.values(PERFIS));

export const PAPEIS_ADMIN_INSTITUICAO = Object.freeze([
    PERFIS.ADMINISTRADOR,
]);

export const PAPEIS_ADMIN_TODOS = Object.freeze([
    PERFIS.ADMINISTRADOR,
]);

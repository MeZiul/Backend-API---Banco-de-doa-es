import { z } from "zod-v3";

const LEGACY_OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export const isEntityId = (value) =>
  typeof value === "string" &&
  (LEGACY_OBJECT_ID.test(value) || UUID.test(value));

/**
 * Durante a transição MongoDB -> PostgreSQL/Prisma, a API aceita:
 * - UUIDs novos gerados pelo Prisma;
 * - ObjectIds antigos de 24 hex para não quebrar fixtures/integrações legadas.
 */
const entityIdSchema = z
  .string()
  .refine(isEntityId, { message: "ID inválido" });

export default entityIdSchema;

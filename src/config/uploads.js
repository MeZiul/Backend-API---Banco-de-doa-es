import path from "node:path";
import { fileURLToPath } from "node:url";

export const uploadsRoot = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : fileURLToPath(new URL("../../uploads/", import.meta.url));
export const itemUploadsDir = path.join(uploadsRoot, "itens");

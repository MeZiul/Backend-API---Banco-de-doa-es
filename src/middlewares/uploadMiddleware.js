import multer from "multer";
import path from "path";
import crypto from "crypto";
import { CustomError } from "../utils/helpers/index.js";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/itens/");
    },

    filename: (req, file, cb) => {
        const hash = crypto.randomBytes(16).toString("hex");
        const extensao = path.extname(file.originalname);

        cb(null, `${hash}-${Date.now()}${extensao}`);
    }
});

const fileFilter = (req, file, cb) => {
    const formatosAceitos = [
        "image/webp",
        "image/jpeg",
        "image/png"
    ];

    if (formatosAceitos.includes(file.mimetype)) {
        return cb(null, true);
    }

    return cb(
        new CustomError({
            statusCode: 400,
            customMessage:
                "Formato inválido. Apenas JPEG, PNG e WebP são aceitos."
        }),
        false
    );
};

export const uploadFotos = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5
    },
    fileFilter
});
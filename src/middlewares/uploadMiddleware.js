import multer from "multer";
import { CustomError } from "../utils/helpers/index.js";

// Keep untrusted bytes off the filesystem until authorization and decoding.
const storage = multer.memoryStorage();

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
        files: 5,
        fields: 0,
        // Busboy emits partsLimit on reaching the bound, so allow the closing boundary.
        parts: 6
    },
    fileFilter
});

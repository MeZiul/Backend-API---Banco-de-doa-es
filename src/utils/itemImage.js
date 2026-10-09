import sharp from "sharp";
import { CustomError } from "./helpers/index.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const invalidImage = () => new CustomError({ statusCode: 400,
    customMessage: "Imagem inválida. Envie JPEG, PNG ou WebP estático, de até 5MB e 4096 pixels por dimensão." });

function rasterFormat(buffer) {
    if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "jpeg";
    if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "png";
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
    throw invalidImage();
}

function hasAnimation(buffer, format) {
    if (format === "jpeg") return false;
    let offset = format === "png" ? 8 : 12;
    while (offset + 8 <= buffer.length) {
        const length = format === "png" ? buffer.readUInt32BE(offset) : buffer.readUInt32LE(offset + 4);
        const type = buffer.toString("ascii", offset + (format === "png" ? 4 : 0), offset + (format === "png" ? 8 : 4));
        if (type === "acTL" || type === "ANIM" || type === "ANMF") return true;
        offset += format === "png" ? length + 12 : length + 8 + (length % 2);
    }
    return false;
}

export async function canonicalItemImage(file) {
    try {
        if (!Buffer.isBuffer(file.buffer) || !file.buffer.length || file.buffer.length > MAX_IMAGE_BYTES) throw invalidImage();
        const format = rasterFormat(file.buffer);
        if (file.mimetype !== `image/${format}` || hasAnimation(file.buffer, format)) throw invalidImage();
        const image = sharp(file.buffer, { failOn: "warning", limitInputPixels: 4096 * 4096, animated: true });
        const metadata = await image.metadata();
        if (metadata.format !== format || !metadata.width || !metadata.height ||
            metadata.width > 4096 || metadata.height > 4096 || (metadata.pages ?? 1) !== 1) throw invalidImage();
        // Fully decode and encode fresh pixels, discarding metadata and appended payloads.
        const buffer = await image.rotate().toFormat(format).toBuffer();
        if (buffer.length > MAX_IMAGE_BYTES) throw invalidImage();
        return { buffer, extension: format === "jpeg" ? "jpg" : format, mimetype: `image/${format}`, size: buffer.length };
    } catch {
        throw invalidImage();
    }
}

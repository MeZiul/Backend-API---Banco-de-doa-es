// src/utils/AuthHelper.js
import bcrypt from "bcryptjs";

/**
 * Helper de hashing de senhas.
 * A criação e a gestão de sessões são responsabilidade do Better Auth.
 */
class AuthHelper {
    static async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }

    static async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
}

export default AuthHelper;

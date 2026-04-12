// src/utils/AuthHelper.js
import bcrypt from 'bcrypt';

/**
 * Helper de hashing de senhas.
 * NÃO deve conter lógica de JWT — isso é responsabilidade do TokenService.
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

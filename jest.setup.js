import { afterEach, jest } from "@jest/globals";

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_SECRET_ACCESS_TOKEN = process.env.JWT_SECRET_ACCESS_TOKEN || "test-access-secret";
process.env.JWT_SECRET_PASSWORD_RECOVERY = process.env.JWT_SECRET_PASSWORD_RECOVERY || "test-recovery-secret";

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

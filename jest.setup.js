import { afterEach, jest } from "@jest/globals";

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://doai:doai_local@localhost:5433/doai_test?schema=public";
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "test-better-auth-secret-with-32-characters";
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:7340";

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

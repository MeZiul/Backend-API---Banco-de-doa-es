import { runInTransaction } from "../config/prisma.js";

const prismaTransactionManager = Object.freeze({
  run(operation, options) {
    return runInTransaction(operation, options);
  },
});

export default prismaTransactionManager;

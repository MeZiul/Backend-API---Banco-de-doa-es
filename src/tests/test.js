import express from "express";
import errorHandler from "../utils/helpers/errorHandler.js";

const testIds = Object.freeze({
  admin: "507f1f77bcf86cd799439011",
  usuario: "507f1f77bcf86cd799439012",
  doador: "507f1f77bcf86cd799439013",
  interessado: "507f1f77bcf86cd799439014",
  item: "507f1f77bcf86cd799439015",
  denuncia: "507f1f77bcf86cd799439016",
  administracao: "507f1f77bcf86cd799439017",
});

const createAdminUser = (overrides = {}) => ({
  id: testIds.admin,
  perfil: "ADMINISTRADOR",
  ...overrides,
});

const createRegularUser = (overrides = {}) => ({
  id: testIds.usuario,
  perfil: "USUARIO",
  ...overrides,
});

const createControllerTestApp = ({ user = createRegularUser(), registerRoutes }) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });

  registerRoutes(app);
  app.use(errorHandler);

  return app;
};

export {
  testIds,
  createAdminUser,
  createRegularUser,
  createControllerTestApp,
};

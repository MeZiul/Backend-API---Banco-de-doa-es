import { toNodeHandler } from "better-auth/node";
import { auth } from "../config/betterAuth.js";
import {
  forgotPasswordLimiter,
  loginLimiter,
  passwordResetLimiter,
  registrationLimiter,
} from "../middlewares/rateLimiters.js";

async function validateBetterAuthOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin) return next();

  try {
    const context = await auth.$context;
    if (
      origin === "null" ||
      !context.isTrustedOrigin(origin, { allowRelativePaths: false })
    ) {
      return res.status(403).json({
        code: "INVALID_ORIGIN",
        message: "Invalid origin.",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function registerBetterAuthRoutes(app) {
  const handler = toNodeHandler(auth);
  app.post(
    "/api/auth/sign-up/email",
    registrationLimiter,
    validateBetterAuthOrigin,
    handler,
  );
  app.post("/api/auth/sign-in/email", loginLimiter, validateBetterAuthOrigin, handler);
  app.post(
    "/api/auth/request-password-reset",
    forgotPasswordLimiter,
    validateBetterAuthOrigin,
    handler,
  );
  app.post(
    "/api/auth/reset-password",
    passwordResetLimiter,
    validateBetterAuthOrigin,
    handler,
  );
  app.all("/api/auth/*splat", handler);
}

export { registerBetterAuthRoutes };

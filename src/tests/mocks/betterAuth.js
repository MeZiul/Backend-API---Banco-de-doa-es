const unsupportedInUnitTest = async () => {
  throw new Error("Better Auth runtime nao deve ser chamado neste teste unitario.");
};

export const auth = {
  api: {
    signUpEmail: unsupportedInUnitTest,
    signInEmail: unsupportedInUnitTest,
    requestPasswordReset: unsupportedInUnitTest,
    resetPassword: unsupportedInUnitTest,
    signOut: unsupportedInUnitTest,
    getSession: unsupportedInUnitTest,
  },
};

export const SESSION_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

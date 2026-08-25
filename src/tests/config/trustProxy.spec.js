import { configureTrustProxy, parseTrustProxyHops } from "../../config/trustProxy.js";

describe("Configuração de trust proxy", () => {
    test("mantém zero proxies confiáveis por padrão", () => {
        expect(parseTrustProxyHops(undefined)).toBe(0);
        expect(parseTrustProxyHops("")).toBe(0);
    });

    test("configura um proxy confiável para o gateway da implantação", () => {
        const app = { set: jest.fn() };

        expect(configureTrustProxy(app, "1")).toBe(1);
        expect(app.set).toHaveBeenCalledWith("trust proxy", 1);
    });

    test.each(["-1", "1.5", "abc"])(
        "rejeita TRUST_PROXY_HOPS inválido: %s",
        (value) => {
            expect(() => parseTrustProxyHops(value)).toThrow(
                "TRUST_PROXY_HOPS deve ser um número inteiro maior ou igual a zero."
            );
        }
    );
});

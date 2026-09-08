function parseTrustProxyHops(value = process.env.TRUST_PROXY_HOPS) {
    if (value === undefined || value === null || value === "") {
        return 0;
    }

    const normalizedValue = String(value).trim();

    if (!/^\d+$/.test(normalizedValue)) {
        throw new Error("TRUST_PROXY_HOPS deve ser um número inteiro maior ou igual a zero.");
    }

    return Number.parseInt(normalizedValue, 10);
}

function configureTrustProxy(app, value = process.env.TRUST_PROXY_HOPS) {
    const hops = parseTrustProxyHops(value);
    app.set("trust proxy", hops);
    return hops;
}

export { configureTrustProxy, parseTrustProxyHops };

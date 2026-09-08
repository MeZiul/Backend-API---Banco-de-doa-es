export function fromNodeHeaders(headers = {}) {
  if (headers instanceof Headers) return headers;

  const webHeaders = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => webHeaders.append(name, String(item)));
    } else if (value !== undefined && value !== null) {
      webHeaders.set(name, String(value));
    }
  }
  return webHeaders;
}

export const toNodeHandler = () => (_req, _res, next) => next();

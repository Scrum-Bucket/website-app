const cors = require("cors");

const defaultAllowedOrigins = [
  "https://polite-sea-008d19c10.7.azurestaticapps.net",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function normalizeCorsOrigin(origin) {
  if (!origin) return "";

  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

function firstHeaderValue(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function getRequestOrigin(req) {
  const protocol = firstHeaderValue(req.headers["x-forwarded-proto"]) || req.protocol;
  const host = firstHeaderValue(req.headers["x-forwarded-host"]) || req.headers.host;

  return host ? `${protocol}://${host}` : "";
}

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => normalizeCorsOrigin(origin.trim()))
  .filter(Boolean);

function isAllowedCorsOrigin(origin) {
  const normalizedOrigin = normalizeCorsOrigin(origin);
  const configuredOrigins = allowedOrigins.length
    ? allowedOrigins
    : defaultAllowedOrigins.map(normalizeCorsOrigin);
  const isLocalDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

  return configuredOrigins.includes(normalizedOrigin) || isLocalDevOrigin;
}

function isSameOriginRequest(origin, req) {
  return normalizeCorsOrigin(origin) === normalizeCorsOrigin(getRequestOrigin(req));
}

function createCorsMiddleware() {
  return (req, res, next) =>
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin) return callback(null, true);

        if (isAllowedCorsOrigin(origin) || isSameOriginRequest(origin, req)) {
          return callback(null, true);
        }

        console.warn("Rejected CORS origin:", {
          origin,
          requestOrigin: getRequestOrigin(req),
          allowedOrigins: allowedOrigins.length ? allowedOrigins : defaultAllowedOrigins,
        });
        return callback(new Error("Not allowed by CORS"));
      },
    })(req, res, next);
}

module.exports = {
  createCorsMiddleware,
  defaultAllowedOrigins,
  getRequestOrigin,
  isAllowedCorsOrigin,
  normalizeCorsOrigin,
};

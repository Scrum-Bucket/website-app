const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { requireEnv } = require("./env");

const AUTH_COOKIE_NAME = "backendAuthToken";
const USER_AUTH_COOKIE_NAME = "userAuthToken";
const DEFAULT_TOKEN_EXPIRES_IN = "600s";
const DEFAULT_USER_TOKEN_EXPIRES_IN = "2h";
const DEFAULT_USER_TOKEN_COOKIE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function getTokenSecret() {
  return requireEnv("TOKEN_SECRET");
}

function getSharedAccessToken() {
  return process.env.BACKEND_ACCESS_TOKEN || process.env.BACKEND_AUTH_TOKEN || "";
}

function getTokenExpiresIn() {
  return process.env.TOKEN_EXPIRES_IN || DEFAULT_TOKEN_EXPIRES_IN;
}

function getUserTokenExpiresIn() {
  return process.env.USER_TOKEN_EXPIRES_IN || DEFAULT_USER_TOKEN_EXPIRES_IN;
}

function generateAccessToken() {
  return jwt.sign({ type: "backend-access" }, getTokenSecret(), {
    expiresIn: getTokenExpiresIn(),
  });
}

function generateUserAccessToken(user) {
  return jwt.sign(
    {
      type: "frontend-user",
      userId: user._id?.toString(),
      username: user.userName,
      isAdmin: user.isAdmin === true,
    },
    getTokenSecret(),
    {
      expiresIn: getUserTokenExpiresIn(),
    }
  );
}

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, cookie) => {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) return cookies;

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();
    if (!key) return cookies;

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

function tokenMatches(actualToken, expectedToken) {
  const actual = Buffer.from(actualToken || "");
  const expected = Buffer.from(expectedToken || "");

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (!/^Bearer$/i.test(scheme) || !token) return null;

  return token;
}

function getRequestToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return getBearerToken(req) || cookies[AUTH_COOKIE_NAME] || cookies[USER_AUTH_COOKIE_NAME] || null;
}

function isPublicRequest(req) {
  return req.method === "POST" && req.path === "/users/login";
}

function wantsHtml(req) {
  return req.method === "GET" && req.accepts(["html", "json"]) === "html";
}

function redirectToSignin(req, res) {
  const next = encodeURIComponent(req.originalUrl || "/");
  return res.redirect(`/signin?next=${next}`);
}

function rejectUnauthenticated(req, res, message = "Authentication required.") {
  if (wantsHtml(req)) {
    return redirectToSignin(req, res);
  }

  return res.status(401).json({ error: message });
}

function authenticateUser(req, res, next) {
  if (req.method === "OPTIONS" || isPublicRequest(req)) {
    return next();
  }

  const token = getRequestToken(req);
  if (!token) {
    return rejectUnauthenticated(req, res);
  }

  const sharedAccessToken = getSharedAccessToken();
  if (sharedAccessToken && tokenMatches(token, sharedAccessToken)) {
    req.auth = { type: "shared-token", username: "shared-token" };
    return next();
  }

  try {
    const decoded = jwt.verify(token, getTokenSecret());
    if (decoded.type !== "backend-access" && decoded.type !== "frontend-user") {
      return rejectUnauthenticated(req, res, "Invalid access token.");
    }

    req.auth = decoded;
    return next();
  } catch (error) {
    console.log("Token authentication failed:", error.message);
    return rejectUnauthenticated(req, res, "Invalid or expired access token.");
  }
}

function requireBackendAccess(req, res, next) {
  if (req.auth?.type === "shared-token" || req.auth?.type === "backend-access") {
    return next();
  }

  return res.status(403).json({ error: "Backend access token required." });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeNextPath(next) {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function isSecureRequest(req) {
  return req.secure || req.headers["x-forwarded-proto"] === "https";
}

function getCookieSameSite(req) {
  if (process.env.AUTH_COOKIE_SAME_SITE) {
    return process.env.AUTH_COOKIE_SAME_SITE;
  }

  return isSecureRequest(req) ? "none" : "lax";
}

function getCookieOptions(req, maxAge = 10 * 60 * 1000) {
  return {
    httpOnly: true,
    sameSite: getCookieSameSite(req),
    secure: isSecureRequest(req),
    maxAge,
    path: "/",
  };
}

function getUserCookieOptions(req) {
  const maxAge = Number(process.env.USER_TOKEN_COOKIE_MAX_AGE_MS);
  return getCookieOptions(
    req,
    Number.isFinite(maxAge) && maxAge > 0 ? maxAge : DEFAULT_USER_TOKEN_COOKIE_MAX_AGE_MS
  );
}

function setUserAuthCookie(req, res, user) {
  const token = generateUserAccessToken(user);
  res.cookie(USER_AUTH_COOKIE_NAME, token, getUserCookieOptions(req));
}

function clearUserAuthCookie(req, res) {
  res.clearCookie(USER_AUTH_COOKIE_NAME, getUserCookieOptions(req));
}

function renderSigninPage(res, { error = "", next = "/" } = {}) {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Backend Sign In</title>
    <style>
      body {
        align-items: center;
        background: #f4f7fb;
        color: #1f2937;
        display: flex;
        font-family: Arial, sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
      }
      main {
        background: #ffffff;
        border: 1px solid #d8e0ea;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(31, 41, 55, 0.12);
        max-width: 420px;
        padding: 32px;
        width: calc(100% - 40px);
      }
      h1 {
        font-size: 1.5rem;
        margin: 0 0 20px;
      }
      label {
        display: block;
        font-size: 0.95rem;
        font-weight: 700;
        margin: 16px 0 8px;
      }
      input {
        border: 1px solid #b9c4d0;
        border-radius: 6px;
        box-sizing: border-box;
        font: inherit;
        padding: 12px;
        width: 100%;
      }
      button {
        background: #2563eb;
        border: 0;
        border-radius: 6px;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        margin-top: 20px;
        padding: 12px 16px;
        width: 100%;
      }
      .error {
        background: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        margin: 0 0 16px;
        padding: 10px 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Backend Sign In</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/signin">
        <input type="hidden" name="next" value="${escapeHtml(safeNextPath(next))}" />
        <label for="token">Access token</label>
        <input id="token" name="token" type="password" autocomplete="current-password" required />
        <button type="submit">Sign In</button>
      </form>
    </main>
  </body>
</html>`);
}

function wantsJson(req) {
  const acceptHeader = req.headers.accept || "";
  return (
    req.is("application/json") ||
    acceptHeader.includes("application/json") ||
    acceptHeader.includes("+json")
  );
}

function signinPage(req, res) {
  renderSigninPage(res, { next: safeNextPath(req.query.next) });
}

function signin(req, res) {
  const next = safeNextPath(req.body.next || req.query.next);
  const submittedToken = req.body.token || req.body.accessToken || req.body.password;
  const sharedAccessToken = getSharedAccessToken();

  if (!sharedAccessToken) {
    const message = "BACKEND_ACCESS_TOKEN environment variable is required.";
    if (wantsJson(req)) {
      return res.status(500).json({ error: message });
    }
    return renderSigninPage(res.status(500), { error: message, next });
  }

  if (!tokenMatches(submittedToken, sharedAccessToken)) {
    const message = "Invalid access token.";
    if (wantsJson(req)) {
      return res.status(401).json({ error: message });
    }
    return renderSigninPage(res.status(401), { error: message, next });
  }

  try {
    const token = generateAccessToken();
    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(req));

    if (wantsJson(req)) {
      return res.json({
        token,
        tokenType: "Bearer",
        expiresIn: getTokenExpiresIn(),
      });
    }

    return res.redirect(next);
  } catch (error) {
    const message = error.message;
    if (wantsJson(req)) {
      return res.status(500).json({ error: message });
    }
    return renderSigninPage(res.status(500), { error: message, next });
  }
}

function signout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, getCookieOptions(req));
  clearUserAuthCookie(req, res);
  if (wantsJson(req)) {
    return res.status(204).send();
  }
  return res.redirect("/signin");
}

module.exports = {
  authenticateUser,
  generateAccessToken,
  generateUserAccessToken,
  getUserTokenExpiresIn,
  clearUserAuthCookie,
  requireBackendAccess,
  setUserAuthCookie,
  signin,
  signinPage,
  signout,
};

const express = require("express");
const {
  authenticateUser,
  signin,
  signinPage,
  signout,
} = require("../auth");
const { createCorsMiddleware } = require("../http/cors-config.js");
const { createRateLimiter } = require("../http/rate-limit.js");
const { securityHeaders } = require("../http/security-headers.js");
const { startActivityCleanup } = require("../jobs/activity-cleanup.js");
const { registerApiRoutes } = require("../routes/index.js");

const authRateLimiter = createRateLimiter({
  maxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
});

function createApp({ startCleanup = true } = {}) {
  const app = express();

  app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: process.env.FORM_BODY_LIMIT || "100kb" }));

  app.get("/signin", signinPage);
  app.post("/signin", authRateLimiter, signin);
  app.get("/signout", signout);
  app.post("/signout", signout);

  app.get("/", (req, res) => {
    res.send("Backend running.");
  });

  if (startCleanup) {
    startActivityCleanup();
  }

  app.use(authenticateUser);
  registerApiRoutes(app);

  return app;
}

module.exports = { createApp };

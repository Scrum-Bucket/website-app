const express = require("express");
const {
  authenticateUser,
  signin,
  signinPage,
  signout,
} = require("../auth");
const { createCorsMiddleware } = require("../http/cors-config.js");
const { startActivityCleanup } = require("../jobs/activity-cleanup.js");
const { registerApiRoutes } = require("../routes/index.js");

function createApp({ startCleanup = true } = {}) {
  const app = express();

  app.set("trust proxy", 1);
  app.use(createCorsMiddleware());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get("/signin", signinPage);
  app.post("/signin", signin);
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

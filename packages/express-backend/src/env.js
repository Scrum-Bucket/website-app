const path = require("path");
const dotenv = require("dotenv");

if (process.env.SKIP_DOTENV !== "true") {
  dotenv.config({
    path: path.resolve(__dirname, "..", "..", "..", "config", "database.env"),
    quiet: true,
  });
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }

  return value;
}

module.exports = { requireEnv };

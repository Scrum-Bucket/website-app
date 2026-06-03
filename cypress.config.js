import { defineConfig } from "cypress";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REQUIRED_ACCEPTANCE_ENV = ["TOKEN_SECRET", "BACKEND_ACCESS_TOKEN"];

function requireAcceptanceEnv() {
  const missing = REQUIRED_ACCEPTANCE_ENV.filter((name) => !process.env[name]);

  if (missing.length) {
    throw new Error(
      `Cypress acceptance tests require explicit environment variables: ${missing.join(", ")}`
    );
  }
}

export default defineConfig({
  e2e: {
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    defaultCommandTimeout: 10000,
    async setupNodeEvents(on, config) {
      requireAcceptanceEnv();
      process.env.SKIP_DOTENV = "true";

      const frontendRoot = path.join(__dirname, "packages", "react-frontend");
      const viteServer = await createViteServer({
        root: frontendRoot,
        server: {
          host: "127.0.0.1",
          port: 5173,
          strictPort: false,
        },
      });
      await viteServer.listen();

      const { app } = require("./packages/express-backend/src/backend.js");
      const apiServer = await new Promise((resolve) => {
        const server = app.listen(0, "127.0.0.1", () => resolve(server));
      });

      const apiAddress = apiServer.address();
      const frontendUrl = viteServer.resolvedUrls.local[0].replace(/\/$/, "");

      config.baseUrl = frontendUrl;
      config.env.apiUrl = `http://127.0.0.1:${apiAddress.port}`;
      config.env.backendAccessToken = process.env.BACKEND_ACCESS_TOKEN;

      on("after:run", async () => {
        await viteServer.close();
        await new Promise((resolve) => apiServer.close(resolve));
      });

      return config;
    },
  },
});

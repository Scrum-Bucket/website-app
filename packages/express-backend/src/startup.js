const backend = require("./backend");
const database = require("./database");
const port = process.env.PORT || 8000;
const host = process.env.PORT ? "0.0.0.0" : "localhost";

database
  .connect()
  .then(() => {
    backend.app.listen(port, host, () => {
      const address = process.env.PORT ? `port ${port}` : `http://${host}:${port}`;
      console.log(`REST API is listening on ${address}.`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });

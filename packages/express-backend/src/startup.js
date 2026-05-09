const backend = require("./backend");
const database = require("./database");
const port = 8000;

database
  .connect()
  .then(() => {
    backend.app.listen(process.env.PORT || port, () => {
      console.log("REST API is listening.");
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });

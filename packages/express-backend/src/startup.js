const backend = require("./backend");
const database = require("./database");
const port = 8000;

database
  .connect()
  .then((conn) => app.setDatabaseConn(conn))

backend.app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
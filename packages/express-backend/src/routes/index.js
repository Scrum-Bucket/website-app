const createRoomsRouter = require("./rooms.js");
const createSongsRouter = require("./songs.js");
const createUsersRouter = require("./users.js");
const createYoutubeRouter = require("./youtube.js");

function registerApiRoutes(app) {
  app.use(createYoutubeRouter());
  app.use("/users", createUsersRouter());
  app.use("/songs", createSongsRouter());
  app.use("/rooms", createRoomsRouter());
}

module.exports = { registerApiRoutes };

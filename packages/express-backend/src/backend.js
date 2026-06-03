const express = require("express");
const {
  authenticateUser,
  signin,
  signinPage,
  signout,
} = require("./auth");
const { createCorsMiddleware } = require("./http/cors-config.js");
const { startActivityCleanup } = require("./jobs/activity-cleanup.js");
const createRoomsRouter = require("./routes/rooms.js");
const createSongsRouter = require("./routes/songs.js");
const createUsersRouter = require("./routes/users.js");
const createYoutubeRouter = require("./routes/youtube.js");
const { getSongs } = require("./youtube/youtube-services.js");

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

startActivityCleanup();

app.use(authenticateUser);
app.use(createYoutubeRouter());
app.use("/users", createUsersRouter());
app.use("/songs", createSongsRouter());
app.use("/rooms", createRoomsRouter());

module.exports = { app, getSongs };

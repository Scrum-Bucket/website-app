const { createApp } = require("./app/createApp.js");
const { getSongs } = require("./youtube/youtube-services.js");

const app = createApp();

module.exports = { app, createApp, getSongs };

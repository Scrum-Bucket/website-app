const mongoose = require("mongoose");
const { requireEnv } = require("./env");

let conn; //variable for connection

async function connect() {
  console.log("Connecting to db...");

  conn = await mongoose.connect(requireEnv("MONGODB_URI"));

  console.log("Connected to db");
  return conn;
}

async function disconnect() {
  await conn.close();
}

module.exports = { connect, disconnect };

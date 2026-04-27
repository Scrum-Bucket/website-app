const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// ensure correct absolute path
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "config", "database.env"),
});
let conn; //variable for connection

async function connect() {
  console.log("Connecting to db...");
  console.log("MONGODB_URI:", process.env.MONGODB_URI);

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI not found in database.env");
  }

  conn = await mongoose.connect(process.env.MONGODB_URI);

  console.log("Connected to db");
  return conn;
}

async function disconnect() {
  await conn.close();
}

module.exports = { connect, disconnect };

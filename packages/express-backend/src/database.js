const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "database.env"),
});

let conn; //variable for connection

async function connect(){
    conn = await mongoose.createConnection(process.env.MONGODB_URI, {});
    console.log("Connected to db");
    return conn;
}

async function disconnect(){
    await conn.close();
}

module.exports = {connect, disconnect};
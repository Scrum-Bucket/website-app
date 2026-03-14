const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "database.env"),
});

let conn; //variable for connection

async function connect(){
    conn = await mongoose.createConnection("mongodb://localhost:27017/users", {});
    console.log("Connected to db");
    return conn;
}

async function disconnect(){
    await conn.close();
}

module.exports = {connect, disconnect};
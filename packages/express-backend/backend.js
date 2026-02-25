// backend.js
import express from "express";
import cors from "cors";
import userServices from "./user-services.js";

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

app.get("/users", (req, res) => {
  const name = req.query.name;
  const job = req.query.job;

  userServices.getUsers(name, job).then((users) => res.json({ users_list: users }));
});

app.get("/users/:id", (req, res) => {
  const id = req.params["id"]; //or req.params.id

  userServices.findUserById(id).then((user) => {
    if (user === undefined) return res.status(404).send("Resource not found.");
    res.json(user);
  });
});

app.get("/", (req, res) => {
  res.send("Hello World! It's a me, Chris!");
});

app.post("/users", (req, res) => {
  userServices.addUser(req.body).then((created) => res.status(201).json(created));
});

app.delete("/users/:id", (req, res) => {
  const id = req.params["id"]; //or req.params.id

  userServices.deleteUserById(id).then((user) => {
    if (user === undefined) return res.status(404).send("Resource not found.");
    res.status(204).send("User deleted");
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

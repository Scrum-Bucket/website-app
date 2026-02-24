import userServices from "./user-services.js";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 8000;

// to run backend use " npm run dev -w express-backend "

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
  })
);

app.use(express.json());


app.get("/", (req, res) => {
  res.send("API running");
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});

app.get("/users", (req, res) => {
  const { name, job } = req.query;

  if (name !== undefined && job !== undefined) {
    userServices
      .findUserByNameAndJob(name, job)
      .then((result) => res.send({ users_list: result }))
      .catch((error) => res.status(500).send(error));
  } else if (name !== undefined) {
    userServices
      .findUserByName(name)
      .then((result) => res.send({ users_list: result }))
      .catch((error) => res.status(500).send(error));
  } else if (job !== undefined) {
    userServices
      .findUserByJob(job)
      .then((result) => res.send({ users_list: result }))
      .catch((error) => res.status(500).send(error));
  } else {
    userServices
      .getUsers()
      .then((result) => res.send({ users_list: result }))
      .catch((error) => res.status(500).send(error));
  }
});

app.get("/users/:id", (req, res) => {
  const id = req.params.id;
  userServices
    .findUserById(id)
    .then((result) => {
      if (result === undefined || result === null) return res.status(404).send("Resource not found.");
      res.send(result);
    })
    .catch((error) => res.status(500).send(error));
});

app.post("/users", (req, res) => {
  userServices
    .addUser(req.body)
    .then((savedUser) => res.status(201).send(savedUser))
    .catch((error) => res.status(500).send(error));
});

app.delete("/users/:id", (req, res) => {
  const id = req.params.id;
  userServices
    .deleteUserById(id)
    .then((result) => {
      if (!result) return res.status(404).send("404 not found.");
      res.status(204).send();
    })
    .catch((error) => res.status(500).send(error));
});
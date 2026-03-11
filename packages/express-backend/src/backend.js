import express from "express";
import cors from "cors";
import userServices from "./user-services.js";

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

app.get("/users", (req, res) => {
  const { userName } = req.query;

  userServices.getUsers(userName)
    .then((users) => res.json(users))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/users/:id", (req, res) => {
  userServices.findUserById(req.params.id)
    .then((user) => {
      if (!user) return res.status(404).send("User not found.");
      res.json(user);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.post("/users", (req, res) => {
  userServices.addUser(req.body)
    .then((created) => res.status(201).json(created))
    .catch((err) => res.status(400).json({ error: err.message }));
});

app.put("/users/:id", (req, res) => {
  userServices.updateUserById(req.params.id, req.body)
    .then((updated) => {
      if (!updated) return res.status(404).send("User not found.");
      res.json(updated);
    })
    .catch((err) => res.status(400).json({ error: err.message }));
});

app.patch("/users/:id", (req, res) => {
  userServices.patchUserById(req.params.id, req.body)
    .then((updated) => {
      if (!updated) return res.status(404).send("User not found.");
      res.json(updated);
    })
    .catch((err) => res.status(400).json({ error: err.message }));
});

app.delete("/users/:id", (req, res) => {
  userServices.deleteUserById(req.params.id)
    .then((deleted) => {
      if (!deleted) return res.status(404).send("User not found.");
      res.status(204).send();
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/", (req, res) => {
  res.send("Backend running.");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});